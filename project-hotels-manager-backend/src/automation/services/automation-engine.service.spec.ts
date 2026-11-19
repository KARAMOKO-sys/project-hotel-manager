/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument -- mocks typés `any` */
import { Types } from 'mongoose';
import { AutomationEngineService } from './automation-engine.service';
import { AutomationRunStatus } from '../schemas/automation-run.entity';
import {
  ConditionLogic,
  ConditionOperator,
} from '../engine/condition-evaluator';
import { AutomationActionType } from '../engine/rule-validator';
import { runInChain } from '../engine/loop-guard';

const orgId = new Types.ObjectId().toString();
const propertyId = new Types.ObjectId().toString();

const makeEvent = (overrides: Record<string, unknown> = {}): any => ({
  id: 'evt-1',
  name: 'billing.invoice.paid',
  occurred_at: new Date('2026-11-17T10:00:00Z'),
  property_id: propertyId,
  record: { model: 'Invoice', id: new Types.ObjectId().toString() },
  payload: { total_amount: 200000, status: 'paid' },
  ...overrides,
});

describe('AutomationEngineService', () => {
  let engine: AutomationEngineService;
  let runModel: any;
  let rules: any;
  let actions: any;
  let records: any;
  let rule: any;
  let claimed: Set<string>;

  beforeEach(() => {
    claimed = new Set();
    rule = {
      _id: new Types.ObjectId(),
      trigger_event: 'billing.invoice.paid',
      conditions: [
        {
          path: 'payload.total_amount',
          operator: ConditionOperator.GT,
          value: 100000,
        },
      ],
      condition_logic: ConditionLogic.ALL,
      actions: [
        {
          type: AutomationActionType.POST_NOTE,
          params: { body: 'Grosse facture' },
        },
        { type: AutomationActionType.PUBLISH_EVENT, params: { topic: 'x' } },
      ],
    };
    runModel = {
      create: jest.fn().mockImplementation((doc: any) => {
        const key = `${String(doc.rule_id)}:${doc.event_id}`;
        if (claimed.has(key)) {
          throw Object.assign(new Error('E11000 duplicate key'), {
            code: 11000,
          });
        }
        claimed.add(key);
        return { _id: new Types.ObjectId(), ...doc };
      }),
      updateOne: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
    };
    rules = {
      getRulesForEvent: jest.fn().mockResolvedValue([rule]),
      recordExecution: jest.fn().mockResolvedValue(undefined),
    };
    actions = {
      execute: jest.fn().mockResolvedValue({ ok: true }),
      plan: jest.fn().mockImplementation((action: any) => ({
        type: action.type,
        params: action.params,
        warnings: [],
      })),
    };
    records = {
      resolveEventOrganization: jest.fn().mockResolvedValue(orgId),
      isAppInstalledForEvent: jest.fn().mockResolvedValue(true),
    };
    engine = new AutomationEngineService(runModel, rules, actions, records);
  });

  it('exécute les actions quand les conditions correspondent', async () => {
    const result = await engine.process(makeEvent());
    expect(result.rules).toEqual([
      { rule_id: String(rule._id), outcome: AutomationRunStatus.SUCCESS },
    ]);
    expect(actions.execute).toHaveBeenCalledTimes(2);
    expect(rules.recordExecution).toHaveBeenCalledWith(rule._id, false);
  });

  it('est idempotent par (règle, événement)', async () => {
    await engine.process(makeEvent());
    const replay = await engine.process(makeEvent());
    expect(replay.rules[0].outcome).toBe('duplicate');
    expect(actions.execute).toHaveBeenCalledTimes(2);
  });

  it('journalise « skipped » si les conditions ne correspondent pas', async () => {
    const result = await engine.process(
      makeEvent({ payload: { total_amount: 10 } }),
    );
    expect(result.rules[0].outcome).toBe(AutomationRunStatus.SKIPPED);
    expect(actions.execute).not.toHaveBeenCalled();
  });

  it('isole les échecs d’action (statut partiel)', async () => {
    actions.execute
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({});
    const result = await engine.process(makeEvent());
    expect(result.rules[0].outcome).toBe(AutomationRunStatus.PARTIAL);
    expect(actions.execute).toHaveBeenCalledTimes(2);
    const update = runModel.updateOne.mock.calls.at(-1)[1].$set;
    expect(update.actions_results[0]).toMatchObject({
      ok: false,
      error: 'boom',
    });
    expect(rules.recordExecution).toHaveBeenCalledWith(rule._id, true);
  });

  it("ignore l'application non installée", async () => {
    records.isAppInstalledForEvent.mockResolvedValue(false);
    const result = await engine.process(makeEvent());
    expect(result.ignored).toBeDefined();
    expect(rules.getRulesForEvent).not.toHaveBeenCalled();
  });

  describe('protection contre les boucles', () => {
    it('ignore les événements produits par une automatisation', async () => {
      const result = await engine.process(
        makeEvent({ actor_id: `automation:${String(rule._id)}` }),
      );
      expect(result.ignored).toMatch(/automatisation/);
      expect(runModel.create).not.toHaveBeenCalled();
    });

    it('ne relance pas une règle déjà dans la chaîne', async () => {
      const result = await runInChain(String(rule._id), () =>
        engine.process(makeEvent({ id: 'evt-nested' })),
      );
      expect(result.rules[0].outcome).toBe('loop');
      expect(actions.execute).not.toHaveBeenCalled();
    });

    it('stoppe au-delà de la profondeur maximale', async () => {
      const result = await runInChain('a', () =>
        runInChain('b', () =>
          runInChain('c', () => engine.process(makeEvent({ id: 'evt-deep' }))),
        ),
      );
      expect(result.ignored).toMatch(/profondeur/);
    });

    it('détecte une récursion déclenchée par une action', async () => {
      // L'action republie le même type d'événement (simulation d'une boucle).
      actions.execute.mockImplementation(() =>
        engine.process(makeEvent({ id: `evt-${Math.random()}` })),
      );
      rule.actions = [rule.actions[0]];
      const result = await engine.process(makeEvent({ id: 'evt-root' }));
      expect(result.rules[0].outcome).toBe(AutomationRunStatus.SUCCESS);
      expect(actions.execute).toHaveBeenCalledTimes(1);
    });
  });

  it("l'essai à blanc n'exécute rien", () => {
    const dry = engine.dryRun(rule, { payload: { total_amount: 150000 } });
    expect(dry.would_run).toBe(true);
    expect(dry.evaluation.details[0].result).toBe(true);
    expect(dry.planned_actions).toHaveLength(2);
    expect(actions.execute).not.toHaveBeenCalled();
    expect(runModel.create).not.toHaveBeenCalled();
  });
});
