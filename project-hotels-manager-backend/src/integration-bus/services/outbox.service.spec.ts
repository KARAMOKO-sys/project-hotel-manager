/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument -- mocks Mongoose typés `any` */
import { Types } from 'mongoose';
import { OutboxService } from './outbox.service';
import { OutboxStatus } from '../schemas/outbox-message.entity';
import { IntegrationEndpointKind } from '../schemas/integration-endpoint.entity';
import { DomainEvent } from '../../platform/events/domain-events';

describe('OutboxService.enqueue', () => {
  const orgId = new Types.ObjectId().toString();
  const propertyId = new Types.ObjectId().toString();
  const otherProperty = new Types.ObjectId().toString();

  let store: Map<string, any>;
  let outboxModel: any;
  let endpointsService: any;
  let apps: any;
  let tenantScope: any;
  let service: OutboxService;

  const endpoint = (overrides: Record<string, unknown> = {}) => ({
    _id: new Types.ObjectId(),
    organization_id: new Types.ObjectId(orgId),
    kind: IntegrationEndpointKind.WEBHOOK,
    url: 'https://example.com/hook',
    event_patterns: ['billing.*'],
    is_active: true,
    max_attempts: 8,
    ...overrides,
  });

  const event = (
    overrides: Partial<DomainEvent<object>> = {},
  ): DomainEvent<object> => ({
    id: 'evt-1',
    name: 'billing.invoice.paid',
    occurred_at: new Date('2026-11-17T10:00:00Z'),
    property_id: propertyId,
    record: { model: 'Invoice', id: 'inv-1' },
    payload: { total: 1000 },
    ...overrides,
  });

  beforeEach(() => {
    store = new Map();
    // bulkWrite simulant upsert + $setOnInsert sur l'index unique (event_id, endpoint_id).
    outboxModel = {
      bulkWrite: jest.fn((ops: any[]) => {
        let upsertedCount = 0;
        for (const op of ops) {
          const { filter, update } = op.updateOne;
          const key = `${filter.event_id}|${String(filter.endpoint_id)}`;
          if (!store.has(key)) {
            store.set(key, update.$setOnInsert);
            upsertedCount++;
          }
        }
        return Promise.resolve({ upsertedCount });
      }),
    };
    endpointsService = { findActiveForOrganization: jest.fn() };
    apps = { isInstalled: jest.fn().mockResolvedValue(true) };
    tenantScope = {
      getOrganizationIdForProperty: jest.fn().mockResolvedValue(orgId),
    };
    service = new OutboxService(
      outboxModel,
      {} as any,
      endpointsService,
      apps,
      tenantScope,
    );
  });

  it('met en file une seule fois par (événement, destinataire) — rejeu idempotent', async () => {
    const a = endpoint();
    const b = endpoint({ event_patterns: ['*'] });
    endpointsService.findActiveForOrganization.mockResolvedValue([a, b]);

    const first = await service.enqueue(event());
    const replay = await service.enqueue(event());

    expect(first).toMatchObject({
      organization_id: orgId,
      matched: 2,
      inserted: 2,
    });
    expect(replay).toMatchObject({ matched: 2, inserted: 0 });
    expect(store.size).toBe(2);
    const row = store.get(`evt-1|${String(a._id)}`);
    expect(row).toMatchObject({
      event_id: 'evt-1',
      event_name: 'billing.invoice.paid',
      status: OutboxStatus.PENDING,
      attempts: 0,
      max_attempts: 8,
    });
    expect(row.envelope).toEqual({
      id: 'evt-1',
      name: 'billing.invoice.paid',
      occurred_at: '2026-11-17T10:00:00.000Z',
      organization_id: orgId,
      property_id: propertyId,
      record: { model: 'Invoice', id: 'inv-1' },
      payload: { total: 1000 },
    });
  });

  it('ne retient que les points de terminaison dont le motif et l’établissement correspondent', async () => {
    const match = endpoint({ event_patterns: ['billing.invoice.paid'] });
    const wrongPattern = endpoint({ event_patterns: ['hotel.*'] });
    const wrongProperty = endpoint({
      property_id: new Types.ObjectId(otherProperty),
    });
    const sameProperty = endpoint({
      property_id: new Types.ObjectId(propertyId),
    });
    endpointsService.findActiveForOrganization.mockResolvedValue([
      match,
      wrongPattern,
      wrongProperty,
      sameProperty,
    ]);

    const result = await service.enqueue(event());
    expect(result.inserted).toBe(2);
    const ids = [...store.values()].map((row) => String(row.endpoint_id));
    expect(ids.sort()).toEqual(
      [String(match._id), String(sameProperty._id)].sort(),
    );
  });

  it('utilise le sujet de l’automatisation comme nom supplémentaire', async () => {
    const ep = endpoint({ event_patterns: ['crm.vip_checkin'] });
    endpointsService.findActiveForOrganization.mockResolvedValue([ep]);
    const result = await service.enqueue(
      event({ name: 'hotel.reservation.checked_in' as never }),
      'crm.vip_checkin',
    );
    expect(result.inserted).toBe(1);
    expect([...store.values()][0].topic).toBe('crm.vip_checkin');
  });

  it('ignore les organisations sans l’application et les événements sans organisation', async () => {
    apps.isInstalled.mockResolvedValue(false);
    expect(await service.enqueue(event())).toMatchObject({
      skipped: 'app_not_installed',
      inserted: 0,
    });
    tenantScope.getOrganizationIdForProperty.mockResolvedValue(null);
    expect(await service.enqueue(event())).toMatchObject({
      skipped: 'no_organization',
    });
    expect(
      await service.enqueue(event({ property_id: undefined })),
    ).toMatchObject({ skipped: 'no_organization' });
    expect(outboxModel.bulkWrite).not.toHaveBeenCalled();
  });

  it('préfère organization_id de l’événement à la résolution par établissement', async () => {
    const other = new Types.ObjectId().toString();
    endpointsService.findActiveForOrganization.mockResolvedValue([]);
    await service.enqueue(event({ organization_id: other }));
    expect(tenantScope.getOrganizationIdForProperty).not.toHaveBeenCalled();
    expect(apps.isInstalled).toHaveBeenCalledWith(other, 'integration_bus');
  });

  it('tolère une erreur de clé dupliquée due à une insertion concurrente', async () => {
    endpointsService.findActiveForOrganization.mockResolvedValue([endpoint()]);
    outboxModel.bulkWrite.mockRejectedValue(
      Object.assign(new Error('E11000'), {
        code: 11000,
        result: { upsertedCount: 0 },
      }),
    );
    await expect(service.enqueue(event())).resolves.toMatchObject({
      inserted: 0,
    });
  });
});
