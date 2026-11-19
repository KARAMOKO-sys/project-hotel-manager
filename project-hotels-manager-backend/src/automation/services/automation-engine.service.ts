import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { OnEvent } from '@nestjs/event-emitter';
import { Model, Types } from 'mongoose';
import { DomainEventPublisher } from '../../platform/events/domain-event.publisher';
import type { DomainEvent } from '../../platform/events/domain-events';
import { RecordsService } from '../../records/services/records.service';
import {
  ActionResult,
  AutomationRun,
  AutomationRunStatus,
} from '../schemas/automation-run.entity';
import {
  ConditionsEvaluation,
  evaluateConditions,
} from '../engine/condition-evaluator';
import {
  currentChain,
  ignoreReason,
  isRuleInChain,
  runInChain,
} from '../engine/loop-guard';
import {
  AutomationRuleService,
  LeanAutomationRule,
} from './automation-rule.service';
import {
  AutomationActionsService,
  PlannedAction,
} from './automation-actions.service';

/** Clé d'application des automatisations. */
export const AUTOMATION_APP_KEY = 'automation';

/** Issue du traitement d'une règle pour un événement. */
export type RuleOutcome =
  | 'duplicate'
  | 'loop'
  | AutomationRunStatus.SKIPPED
  | AutomationRunStatus.SUCCESS
  | AutomationRunStatus.PARTIAL
  | AutomationRunStatus.FAILED;

export interface EngineResult {
  ignored?: string;
  rules: { rule_id: string; outcome: RuleOutcome }[];
}

export interface DryRunResult {
  trigger_event: string;
  event_name: string;
  trigger_matches: boolean;
  evaluation: ConditionsEvaluation;
  would_run: boolean;
  planned_actions: PlannedAction[];
}

/** Convertit un événement en objet simple (dates ISO) pour les conditions. */
function toEnvelope(event: DomainEvent<object>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(event)) as Record<string, unknown>;
}

/**
 * Moteur d'automatisation : écoute tous les événements métier, sélectionne
 * les règles actives du déclencheur, évalue les conditions puis exécute les
 * actions séquentiellement (échecs isolés). Idempotent par (règle, événement).
 */
@Injectable()
export class AutomationEngineService {
  private readonly logger = new Logger(AutomationEngineService.name);

  constructor(
    @InjectModel(AutomationRun.name)
    private readonly runModel: Model<AutomationRun>,
    private readonly rules: AutomationRuleService,
    private readonly actions: AutomationActionsService,
    private readonly records: RecordsService,
  ) {}

  @OnEvent(DomainEventPublisher.ANY, { async: true, promisify: true })
  async onDomainEvent(event: DomainEvent<object>): Promise<void> {
    try {
      await this.process(event);
    } catch (error) {
      this.logger.error(
        `Automatisations en erreur pour ${event?.name} (${event?.id}) : ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /** Traite un événement (exposé pour les tests). */
  async process(event: DomainEvent<object>): Promise<EngineResult> {
    const chain = currentChain();
    const ignored = ignoreReason(event, chain);
    if (ignored) return { ignored, rules: [] };
    if (!event?.id || !event.name)
      return { ignored: 'événement incomplet', rules: [] };

    const organizationId = await this.records.resolveEventOrganization(event);
    if (!organizationId) return { ignored: 'organisation inconnue', rules: [] };
    if (
      !(await this.records.isAppInstalledForEvent(
        { organization_id: organizationId },
        AUTOMATION_APP_KEY,
      ))
    ) {
      return { ignored: 'application non installée', rules: [] };
    }

    const rules = await this.rules.getRulesForEvent(
      organizationId,
      event.name,
      event.property_id,
    );
    const results: EngineResult['rules'] = [];
    for (const rule of rules) {
      const ruleId = String(rule._id);
      if (isRuleInChain(ruleId, chain)) {
        results.push({ rule_id: ruleId, outcome: 'loop' });
        continue;
      }
      try {
        results.push({
          rule_id: ruleId,
          outcome: await this.runRule(rule, event, organizationId),
        });
      } catch (error) {
        this.logger.error(
          `Règle ${ruleId} en erreur : ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        results.push({ rule_id: ruleId, outcome: AutomationRunStatus.FAILED });
      }
    }
    return { rules: results };
  }

  /** Exécute une règle pour un événement (réservation idempotente d'abord). */
  private async runRule(
    rule: LeanAutomationRule,
    event: DomainEvent<object>,
    organizationId: string,
  ): Promise<RuleOutcome> {
    const started = Date.now();
    const ruleId = String(rule._id);
    let runId: Types.ObjectId;
    try {
      const run = await this.runModel.create({
        rule_id: rule._id,
        event_id: event.id,
        event_name: event.name,
        organization_id: new Types.ObjectId(organizationId),
        property_id:
          event.property_id && Types.ObjectId.isValid(event.property_id)
            ? new Types.ObjectId(event.property_id)
            : undefined,
        record: event.record
          ? { model: event.record.model, id: event.record.id }
          : undefined,
        matched: false,
        status: AutomationRunStatus.RUNNING,
      });
      runId = run._id;
    } catch (error) {
      if ((error as { code?: number }).code === 11000) return 'duplicate';
      throw error;
    }

    const envelope = toEnvelope(event);
    const evaluation = evaluateConditions(
      envelope,
      rule.conditions,
      rule.condition_logic,
    );
    if (!evaluation.matched) {
      await this.runModel
        .updateOne(
          { _id: runId },
          {
            $set: {
              status: AutomationRunStatus.SKIPPED,
              duration_ms: Date.now() - started,
            },
          },
        )
        .exec();
      return AutomationRunStatus.SKIPPED;
    }

    const results: ActionResult[] = [];
    await runInChain(ruleId, async () => {
      for (const action of rule.actions ?? []) {
        try {
          const output = await this.actions.execute(action, envelope, ruleId);
          results.push({ type: action.type, ok: true, output });
        } catch (error) {
          results.push({
            type: action.type,
            ok: false,
            error: (error instanceof Error
              ? error.message
              : String(error)
            ).slice(0, 1000),
          });
        }
      }
    });

    const failures = results.filter((result) => !result.ok).length;
    const status =
      failures === 0
        ? AutomationRunStatus.SUCCESS
        : failures === results.length
          ? AutomationRunStatus.FAILED
          : AutomationRunStatus.PARTIAL;
    await this.runModel
      .updateOne(
        { _id: runId },
        {
          $set: {
            matched: true,
            status,
            actions_results: results,
            duration_ms: Date.now() - started,
          },
        },
      )
      .exec();
    await this.rules.recordExecution(rule._id, failures > 0);
    return status;
  }

  /**
   * Essai à blanc : évalue les conditions sur un événement d'exemple et
   * décrit les actions (paramètres résolus) sans rien exécuter.
   */
  dryRun(
    rule: Pick<
      LeanAutomationRule,
      'trigger_event' | 'conditions' | 'condition_logic' | 'actions'
    >,
    sample: Record<string, unknown> = {},
  ): DryRunResult {
    const envelope: Record<string, unknown> = JSON.parse(
      JSON.stringify({
        id: 'dry-run',
        name: rule.trigger_event,
        occurred_at: new Date(),
        ...sample,
        payload: sample.payload ?? {},
      }),
    ) as Record<string, unknown>;
    const evaluation = evaluateConditions(
      envelope,
      rule.conditions,
      rule.condition_logic,
    );
    const triggerMatches = envelope.name === rule.trigger_event;
    return {
      trigger_event: rule.trigger_event,
      event_name: String(envelope.name),
      trigger_matches: triggerMatches,
      evaluation,
      would_run: triggerMatches && evaluation.matched,
      planned_actions: (rule.actions ?? []).map((action) =>
        this.actions.plan(action, envelope),
      ),
    };
  }
}
