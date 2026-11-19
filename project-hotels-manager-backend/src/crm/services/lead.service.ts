import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types, UpdateQuery } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { SequenceService } from '../../platform/sequences/sequence.service';
import { DomainEventPublisher } from '../../platform/events/domain-event.publisher';
import {
  DomainEventName,
  DomainEvents,
} from '../../platform/events/domain-events';
import { Lead, LeadState, LeadType } from '../schemas/lead.entity';
import { CorporateAccount } from '../schemas/corporate-account.entity';
import { CrmStage } from '../schemas/crm-stage.entity';
import {
  ConvertLeadDto,
  CreateLeadDto,
  LeadQueryDto,
  LoseLeadDto,
  MoveLeadDto,
  PipelineQueryDto,
  UpdateLeadDto,
} from '../dto/lead.dto';
import { CrmStageService } from './crm-stage.service';
import {
  PipelineReport,
  assertStayDates,
  computePipeline,
  computeRoomNights,
  escapeRegex,
  toObjectId,
} from '../crm.utils';

/**
 * Pistes et opportunités : numérotation `PIS/AAAA/nnnnn`, nuitées calculées,
 * déplacement dans le pipeline (gagné / perdu selon l'étape), rapport.
 */
@Injectable()
export class LeadService extends BaseCrudService<
  Lead,
  CreateLeadDto,
  UpdateLeadDto
> {
  constructor(
    @InjectModel(Lead.name) protected readonly leadModel: Model<Lead>,
    @InjectModel(CorporateAccount.name)
    private readonly accountModel: Model<CorporateAccount>,
    private readonly stages: CrmStageService,
    private readonly sequences: SequenceService,
    private readonly events: DomainEventPublisher,
  ) {
    super(leadModel, Lead.name);
  }

  async create(dto: CreateLeadDto, actorId?: string): Promise<Lead> {
    const propertyId = toObjectId(dto.property_id, 'property_id');
    assertStayDates(dto.arrival_date, dto.departure_date);
    if (dto.corporate_account_id)
      await this.assertAccount(dto.corporate_account_id, propertyId);
    const stage = dto.stage_id
      ? await this.stages.getForProperty(dto.stage_id, propertyId)
      : await this.stages.getDefaultStage(propertyId);
    if (stage.is_won || stage.is_lost) {
      throw new BadRequestException(
        'Une nouvelle piste doit démarrer dans une étape ouverte',
      );
    }
    const reference = await this.sequences.next('crm.lead', {
      prefix: 'PIS',
      scopeId: String(propertyId),
    });
    const lead = await super.create({
      ...dto,
      reference,
      stage_id: stage._id,
      probability: dto.probability ?? stage.probability,
      room_nights: computeRoomNights(
        dto.rooms,
        dto.arrival_date,
        dto.departure_date,
      ),
      state: LeadState.OPEN,
      ...(dto.salesperson_id || !actorId || !Types.ObjectId.isValid(actorId)
        ? {}
        : { salesperson_id: actorId }),
    } as never);
    await this.publish(DomainEvents.LEAD_CREATED, lead, actorId);
    return lead;
  }

  async update(id: string, dto: UpdateLeadDto): Promise<Lead> {
    const current = await this.findOne(id);
    const arrival = dto.arrival_date ?? current.arrival_date;
    const departure = dto.departure_date ?? current.departure_date;
    assertStayDates(arrival, departure);
    if (dto.corporate_account_id)
      await this.assertAccount(dto.corporate_account_id, current.property_id);
    return super.update(id, {
      ...dto,
      room_nights: computeRoomNights(
        dto.rooms ?? current.rooms,
        arrival,
        departure,
      ),
    } as never);
  }

  async findAll(query: LeadQueryDto): Promise<PaginatedResult<Lead>> {
    const filter: QueryFilter<Lead> = {};
    if (query.property_id)
      filter.property_id = toObjectId(query.property_id, 'property_id');
    if (query.stage_id)
      filter.stage_id = toObjectId(query.stage_id, 'stage_id');
    if (query.salesperson_id)
      filter.salesperson_id = toObjectId(
        query.salesperson_id,
        'salesperson_id',
      );
    if (query.corporate_account_id) {
      filter.corporate_account_id = toObjectId(
        query.corporate_account_id,
        'corporate_account_id',
      );
    }
    if (query.state) filter.state = query.state;
    if (query.lead_type) filter.lead_type = query.lead_type;
    if (query.segment) filter.segment = query.segment;
    if (query.tag) filter.tags = query.tag;
    if (query.search) {
      const regex = new RegExp(escapeRegex(query.search), 'i');
      filter.$or = [
        { title: regex },
        { reference: regex },
        { contact_name: regex },
        { contact_email: regex },
        { contact_phone: regex },
      ];
    }
    return super.findAll(query, filter);
  }

  /** Piste → opportunité. */
  async convert(id: string, dto: ConvertLeadDto): Promise<Lead> {
    const current = await this.findOne(id);
    if (dto.corporate_account_id)
      await this.assertAccount(dto.corporate_account_id, current.property_id);
    const updated = await this.leadModel
      .findOneAndUpdate(
        { _id: current._id, lead_type: LeadType.LEAD, state: LeadState.OPEN },
        {
          $set: {
            lead_type: LeadType.OPPORTUNITY,
            converted_at: new Date(),
            ...(dto.corporate_account_id
              ? {
                  corporate_account_id: toObjectId(
                    dto.corporate_account_id,
                    'corporate_account_id',
                  ),
                }
              : {}),
            ...(dto.expected_revenue !== undefined
              ? { expected_revenue: dto.expected_revenue }
              : {}),
          },
        },
        { returnDocument: 'after' },
      )
      .exec();
    if (!updated) {
      throw new BadRequestException(
        'Seule une piste ouverte peut être convertie en opportunité',
      );
    }
    return updated;
  }

  /**
   * Déplace la piste vers une étape. Une étape « gagnée » ou « perdue »
   * clôture la piste ; une étape ouverte la (ré)ouvre. La probabilité
   * reprend celle de l'étape.
   */
  async move(id: string, dto: MoveLeadDto, actorId?: string): Promise<Lead> {
    const current = await this.findOne(id);
    const target = await this.stages.getForProperty(
      dto.stage_id,
      current.property_id,
    );
    if (String(target._id) === String(current.stage_id)) return current;
    if (target.is_won)
      return this.close(current, target, 'won', undefined, actorId);
    if (target.is_lost) {
      return this.close(
        current,
        target,
        'lost',
        dto.lost_reason ?? 'Non précisée',
        actorId,
      );
    }
    const updated = await this.atomicUpdate(current, {
      $set: {
        stage_id: target._id,
        probability: target.probability,
        state: LeadState.OPEN,
      },
      $unset: { won_at: 1, lost_at: 1, lost_reason: 1 },
    });
    await this.publishStageChange(current, updated, actorId);
    return updated;
  }

  async win(id: string, actorId?: string): Promise<Lead> {
    const current = await this.findOne(id);
    if (current.state === LeadState.WON) {
      throw new BadRequestException('Cette piste est déjà gagnée');
    }
    const stage = await this.stages.findClosingStage(
      current.property_id,
      'won',
    );
    return this.close(current, stage, 'won', undefined, actorId);
  }

  async lose(id: string, dto: LoseLeadDto, actorId?: string): Promise<Lead> {
    const current = await this.findOne(id);
    if (current.state === LeadState.LOST) {
      throw new BadRequestException('Cette piste est déjà perdue');
    }
    const stage = await this.stages.findClosingStage(
      current.property_id,
      'lost',
    );
    return this.close(current, stage, 'lost', dto.reason, actorId);
  }

  /** Rapport de pipeline d'un établissement. */
  async pipeline(
    query: PipelineQueryDto,
  ): Promise<PipelineReport & { property_id: string }> {
    const propertyId = toObjectId(query.property_id, 'property_id');
    const filter: QueryFilter<Lead> = {
      property_id: propertyId,
      is_deleted: { $ne: true },
    };
    if (query.salesperson_id)
      filter.salesperson_id = toObjectId(
        query.salesperson_id,
        'salesperson_id',
      );
    if (query.segment) filter.segment = query.segment;
    if (query.from || query.to) {
      filter.arrival_date = {
        ...(query.from ? { $gte: new Date(query.from) } : {}),
        ...(query.to ? { $lte: new Date(query.to) } : {}),
      };
    }
    const [stages, leads] = await Promise.all([
      this.stages.listForProperty(propertyId),
      this.leadModel
        .find(filter)
        .select('stage_id state expected_revenue probability arrival_date')
        .lean()
        .exec(),
    ]);
    return {
      property_id: String(propertyId),
      ...computePipeline(stages, leads),
    };
  }

  private async close(
    current: Lead,
    stage: CrmStage | null,
    outcome: 'won' | 'lost',
    reason: string | undefined,
    actorId?: string,
  ): Promise<Lead> {
    const now = new Date();
    const update: UpdateQuery<Lead> =
      outcome === 'won'
        ? {
            $set: {
              state: LeadState.WON,
              won_at: now,
              probability: 100,
              ...(stage ? { stage_id: stage._id } : {}),
            },
            $unset: { lost_at: 1, lost_reason: 1 },
          }
        : {
            $set: {
              state: LeadState.LOST,
              lost_at: now,
              lost_reason: reason,
              probability: 0,
              ...(stage ? { stage_id: stage._id } : {}),
            },
            $unset: { won_at: 1 },
          };
    const updated = await this.atomicUpdate(current, update);
    if (String(updated.stage_id) !== String(current.stage_id)) {
      await this.publishStageChange(current, updated, actorId);
    }
    await this.publish(
      outcome === 'won' ? DomainEvents.LEAD_WON : DomainEvents.LEAD_LOST,
      updated,
      actorId,
      outcome === 'lost' ? { lost_reason: reason } : {},
    );
    return updated;
  }

  /** Mise à jour conditionnée à l'étape et à l'état lus (concurrence optimiste). */
  private async atomicUpdate(
    current: Lead,
    update: UpdateQuery<Lead>,
  ): Promise<Lead> {
    const updated = await this.leadModel
      .findOneAndUpdate(
        {
          _id: current._id,
          stage_id: current.stage_id,
          state: current.state,
          is_deleted: { $ne: true },
        },
        update,
        { returnDocument: 'after' },
      )
      .exec();
    if (!updated) {
      throw new ConflictException(
        'La piste a été modifiée entre-temps ; réessayez',
      );
    }
    return updated;
  }

  private async assertAccount(accountId: string, propertyId: Types.ObjectId) {
    const exists = await this.accountModel
      .exists({
        _id: toObjectId(accountId, 'corporate_account_id'),
        property_id: propertyId,
        is_deleted: { $ne: true },
      })
      .exec();
    if (!exists)
      throw new BadRequestException(
        'Compte entreprise introuvable pour cet établissement',
      );
  }

  private async publishStageChange(
    before: Lead,
    after: Lead,
    actorId?: string,
  ) {
    await this.publish(DomainEvents.LEAD_STAGE_CHANGED, after, actorId, {
      from_stage_id: String(before.stage_id),
      to_stage_id: String(after.stage_id),
    });
  }

  private async publish(
    name: DomainEventName,
    lead: Lead,
    actorId?: string,
    extra: Record<string, unknown> = {},
  ) {
    await this.events.publish(name, {
      property_id: String(lead.property_id),
      actor_id: actorId,
      record: { model: Lead.name, id: String(lead._id) },
      payload: {
        reference: lead.reference,
        title: lead.title,
        lead_type: lead.lead_type,
        state: lead.state,
        stage_id: String(lead.stage_id),
        segment: lead.segment,
        expected_revenue: lead.expected_revenue,
        probability: lead.probability,
        currency: lead.currency,
        corporate_account_id: lead.corporate_account_id
          ? String(lead.corporate_account_id)
          : undefined,
        guest_id: lead.guest_id ? String(lead.guest_id) : undefined,
        ...extra,
      },
    });
  }
}
