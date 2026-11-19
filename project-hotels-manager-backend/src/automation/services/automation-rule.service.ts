import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { RecordsService } from '../../records/services/records.service';
import { AutomationRule } from '../schemas/automation-rule.entity';
import {
  AutomationRuleQueryDto,
  CreateAutomationRuleDto,
  UpdateAutomationRuleDto,
} from '../dto/automation-rule.dto';
import { validateRuleDefinition } from '../engine/rule-validator';
import type { RuleCondition } from '../engine/condition-evaluator';
import type { RuleAction } from '../engine/rule-validator';

/** Durée de vie du cache des règles actives par organisation. */
const RULE_CACHE_TTL_MS = 30_000;

/** Règle telle que lue par le moteur (objet `lean`). */
export type LeanAutomationRule = AutomationRule & { _id: Types.ObjectId };

/** Règles d'automatisation : CRUD et cache des règles actives. */
@Injectable()
export class AutomationRuleService extends BaseCrudService<
  AutomationRule,
  CreateAutomationRuleDto,
  UpdateAutomationRuleDto
> {
  private readonly cache = new Map<
    string,
    { rules: LeanAutomationRule[]; expiresAt: number }
  >();

  constructor(
    @InjectModel(AutomationRule.name)
    private readonly ruleModel: Model<AutomationRule>,
    private readonly records: RecordsService,
  ) {
    super(ruleModel, 'Règle d’automatisation');
  }

  async create(
    dto: CreateAutomationRuleDto,
    userId?: string,
  ): Promise<AutomationRule> {
    if (!!dto.organization_id === !!dto.property_id) {
      throw new BadRequestException(
        'Indiquer soit organization_id, soit property_id (exactement un)',
      );
    }
    this.assertDefinition(dto.conditions, dto.actions);
    const rule = await super.create({
      ...dto,
      conditions: dto.conditions ?? [],
      organization_id: dto.organization_id
        ? new Types.ObjectId(dto.organization_id)
        : undefined,
      property_id: dto.property_id
        ? new Types.ObjectId(dto.property_id)
        : undefined,
      created_by:
        userId && Types.ObjectId.isValid(userId)
          ? new Types.ObjectId(userId)
          : undefined,
      run_count: 0,
      error_count: 0,
    } as unknown as CreateAutomationRuleDto);
    this.invalidateCache();
    return rule;
  }

  async findAll(
    query: AutomationRuleQueryDto,
    filter: QueryFilter<AutomationRule> = {},
  ): Promise<PaginatedResult<AutomationRule>> {
    const criteria: Record<string, unknown> = { ...filter };
    if (query.organization_id) {
      criteria.organization_id = new Types.ObjectId(query.organization_id);
    }
    if (query.property_id) {
      criteria.property_id = new Types.ObjectId(query.property_id);
    }
    if (query.trigger_event) criteria.trigger_event = query.trigger_event;
    if (typeof query.is_active === 'boolean')
      criteria.is_active = query.is_active;
    return super.findAll(query, criteria);
  }

  async update(
    id: string,
    dto: UpdateAutomationRuleDto,
  ): Promise<AutomationRule> {
    if (dto.conditions !== undefined || dto.actions !== undefined) {
      const current = await this.findOne(id);
      this.assertDefinition(
        dto.conditions ?? current.conditions,
        dto.actions ?? current.actions,
      );
    }
    const rule = await super.update(id, dto);
    this.invalidateCache();
    return rule;
  }

  async remove(id: string): Promise<AutomationRule> {
    const rule = await super.remove(id);
    this.invalidateCache();
    return rule;
  }

  /** Active / désactive une règle (bascule atomique). */
  async toggle(id: string): Promise<AutomationRule> {
    const current = await this.findOne(id);
    const updated = await this.ruleModel
      .findOneAndUpdate(
        { _id: current._id, is_active: current.is_active },
        { $set: { is_active: !current.is_active } },
        { new: true },
      )
      .exec();
    this.invalidateCache();
    return updated ?? this.findOne(id);
  }

  /**
   * Règles actives d'une organisation (portée organisation et portée de ses
   * établissements), en cache ~30 s.
   */
  async getActiveRulesForOrganization(
    organizationId: string,
  ): Promise<LeanAutomationRule[]> {
    const cached = this.cache.get(organizationId);
    if (cached && cached.expiresAt > Date.now()) return cached.rules;
    const propertyIds =
      await this.records.getPropertyIdsOfOrganization(organizationId);
    const scopes: Record<string, unknown>[] = [
      { organization_id: new Types.ObjectId(organizationId) },
    ];
    if (propertyIds.length) scopes.push({ property_id: { $in: propertyIds } });
    const rules = await this.ruleModel
      .find({ is_active: true, is_deleted: { $ne: true }, $or: scopes })
      .sort({ created_at: 1 })
      .lean<LeanAutomationRule[]>()
      .exec();
    this.cache.set(organizationId, {
      rules,
      expiresAt: Date.now() + RULE_CACHE_TTL_MS,
    });
    return rules;
  }

  /** Règles applicables à un événement (déclencheur + établissement). */
  async getRulesForEvent(
    organizationId: string,
    eventName: string,
    propertyId?: string,
  ): Promise<LeanAutomationRule[]> {
    const rules = await this.getActiveRulesForOrganization(organizationId);
    return rules.filter(
      (rule) =>
        rule.trigger_event === eventName &&
        (!rule.property_id || String(rule.property_id) === propertyId),
    );
  }

  /** Statistiques mises à jour après une exécution. */
  async recordExecution(
    ruleId: Types.ObjectId,
    failed: boolean,
  ): Promise<void> {
    await this.ruleModel
      .updateOne(
        { _id: ruleId },
        {
          $set: { last_run_at: new Date() },
          $inc: { run_count: 1, error_count: failed ? 1 : 0 },
        },
      )
      .exec();
  }

  invalidateCache(): void {
    this.cache.clear();
  }

  private assertDefinition(
    conditions: RuleCondition[] | undefined,
    actions: RuleAction[] | undefined,
  ): void {
    const errors = validateRuleDefinition(conditions ?? [], actions ?? []);
    if (errors.length) {
      throw new BadRequestException({
        message: 'Règle invalide',
        errors,
      });
    }
  }
}
