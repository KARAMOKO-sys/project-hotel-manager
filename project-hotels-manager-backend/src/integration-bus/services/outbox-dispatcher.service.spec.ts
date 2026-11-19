/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument -- mocks Mongoose typés `any` */
import { randomBytes } from 'crypto';
import { Types } from 'mongoose';
import { OutboxDispatcherService } from './outbox-dispatcher.service';
import { EndpointDeliveryService } from './endpoint-delivery.service';
import { encryptWithKey, decryptWithKey } from './secret-cipher.service';
import { OutboxStatus } from '../schemas/outbox-message.entity';
import { IntegrationEndpointKind } from '../schemas/integration-endpoint.entity';
import { verifyV1 } from '../utils/signature';
import { LoggingBrokerAdapter } from '../brokers/message-broker.adapter';

const execOf = (value: unknown) => ({
  exec: jest.fn().mockResolvedValue(value),
});

describe('OutboxDispatcherService', () => {
  const key = randomBytes(32);
  const cipher = {
    encrypt: (text: string) => encryptWithKey(key, text),
    decrypt: (text: string) => decryptWithKey(key, text),
  };
  const SECRET = 'whsec_dispatch_test_secret';
  const NOW = new Date('2026-11-17T12:00:00Z');

  let outboxModel: any;
  let endpoints: any;
  let delivery: EndpointDeliveryService;
  let broker: { publish: jest.Mock };
  let fetchMock: jest.Mock;
  let dispatcher: OutboxDispatcherService;

  const makeEndpoint = (overrides: Record<string, unknown> = {}): any => ({
    _id: new Types.ObjectId(),
    organization_id: new Types.ObjectId(),
    kind: IntegrationEndpointKind.WEBHOOK,
    url: 'https://hooks.example.com/pleasantstay',
    secret_encrypted: cipher.encrypt(SECRET),
    headers: { 'X-Tenant': 'hotel-1' },
    timeout_ms: 5000,
    max_attempts: 8,
    is_active: true,
    is_deleted: false,
    ...overrides,
  });

  const makeMessage = (overrides: Record<string, unknown> = {}): any => ({
    _id: new Types.ObjectId(),
    event_id: 'evt-1',
    event_name: 'billing.invoice.paid',
    endpoint_id: new Types.ObjectId(),
    status: OutboxStatus.DELIVERING,
    attempts: 1,
    max_attempts: 8,
    lock_token: 'lock-1',
    envelope: {
      id: 'evt-1',
      name: 'billing.invoice.paid',
      occurred_at: NOW.toISOString(),
      payload: { total: 1000 },
    },
    ...overrides,
  });

  const lastConclusion = () => {
    const calls = outboxModel.updateOne.mock.calls;
    return calls[calls.length - 1];
  };

  beforeEach(() => {
    outboxModel = {
      findOneAndUpdate: jest.fn(),
      updateOne: jest.fn().mockReturnValue(execOf({ modifiedCount: 1 })),
    };
    endpoints = {
      findByIdWithSecret: jest.fn(),
      recordSuccess: jest.fn().mockResolvedValue(undefined),
      recordFailure: jest.fn().mockResolvedValue(undefined),
      disable: jest.fn().mockResolvedValue(undefined),
    };
    broker = { publish: jest.fn().mockResolvedValue(undefined) };
    delivery = new EndpointDeliveryService(cipher as any, broker);
    fetchMock = jest.fn();
    delivery.fetchImpl = fetchMock as any;
    delivery.lookupImpl = jest
      .fn()
      .mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
    delivery.now = () => NOW.getTime();
    dispatcher = new OutboxDispatcherService(outboxModel, endpoints, delivery);
    dispatcher.now = () => NOW;
    dispatcher.random = () => 0.5; // gigue nulle
  });

  it('livre un webhook signé puis passe le message en « delivered »', async () => {
    fetchMock.mockResolvedValue(new Response('ok', { status: 200 }));
    const endpoint = makeEndpoint();
    const message = makeMessage({ endpoint_id: endpoint._id });

    await expect(dispatcher.process(message, endpoint)).resolves.toBe(
      'delivered',
    );

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://hooks.example.com/pleasantstay');
    expect(init.method).toBe('POST');
    expect(init.redirect).toBe('manual');
    const headers = init.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['User-Agent']).toBe('PleasantStay-ESB/1.0');
    expect(headers['X-PleasantStay-Event']).toBe('billing.invoice.paid');
    expect(headers['X-PleasantStay-Delivery']).toBe(String(message._id));
    expect(headers['X-PleasantStay-Timestamp']).toBe(
      String(Math.floor(NOW.getTime() / 1000)),
    );
    expect(headers['X-Tenant']).toBe('hotel-1');
    expect(JSON.parse(init.body)).toEqual(message.envelope);
    expect(
      verifyV1({
        secret: SECRET,
        body: init.body,
        timestampHeader: headers['X-PleasantStay-Timestamp'],
        signatureHeader: headers['X-PleasantStay-Signature'],
        toleranceSeconds: 300,
        nowSeconds: Math.floor(NOW.getTime() / 1000),
      }),
    ).toEqual({ valid: true });

    const [filter, update] = lastConclusion();
    expect(filter).toEqual({
      _id: message._id,
      status: OutboxStatus.DELIVERING,
      lock_token: 'lock-1',
    });
    expect(update.$set).toMatchObject({
      status: OutboxStatus.DELIVERED,
      last_status_code: 200,
      delivered_at: NOW,
    });
    expect(update.$unset).toMatchObject({
      locked_until: 1,
      lock_token: 1,
      last_error: 1,
    });
    expect(endpoints.recordSuccess).toHaveBeenCalledWith(endpoint._id);
  });

  it('replanifie avec backoff exponentiel après une erreur 500', async () => {
    fetchMock.mockResolvedValue(new Response('boom', { status: 500 }));
    const endpoint = makeEndpoint();
    const message = makeMessage({ attempts: 3 });

    await expect(dispatcher.process(message, endpoint)).resolves.toBe(
      'retried',
    );
    const [, update] = lastConclusion();
    expect(update.$set.status).toBe(OutboxStatus.PENDING);
    expect(update.$set.last_status_code).toBe(500);
    expect(update.$set.last_error).toContain('HTTP 500');
    expect(update.$set.next_attempt_at).toEqual(
      new Date(NOW.getTime() + 120_000),
    );
    expect(endpoints.recordFailure).toHaveBeenCalledWith(
      endpoint._id,
      expect.stringContaining('HTTP 500'),
    );
  });

  it('passe en « dead » quand les tentatives sont épuisées', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 503 }));
    await expect(
      dispatcher.process(makeMessage({ attempts: 8 }), makeEndpoint()),
    ).resolves.toBe('dead');
    expect(lastConclusion()[1].$set.status).toBe(OutboxStatus.DEAD);
  });

  it('désactive le point de terminaison sur HTTP 410', async () => {
    fetchMock.mockResolvedValue(new Response('gone', { status: 410 }));
    const endpoint = makeEndpoint();
    await expect(dispatcher.process(makeMessage(), endpoint)).resolves.toBe(
      'failed',
    );
    expect(endpoints.disable).toHaveBeenCalledWith(
      endpoint._id,
      expect.stringContaining('410'),
    );
    expect(lastConclusion()[1].$set.status).toBe(OutboxStatus.FAILED);
  });

  it('traite une erreur réseau ou un délai dépassé comme réessayable', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    await expect(
      dispatcher.process(makeMessage(), makeEndpoint()),
    ).resolves.toBe('retried');
    expect(lastConclusion()[1].$set.last_error).toContain('fetch failed');
  });

  it('ne suit pas les redirections (3xx = échec)', async () => {
    fetchMock.mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { Location: 'http://169.254.169.254/' },
      }),
    );
    await expect(
      dispatcher.process(makeMessage(), makeEndpoint()),
    ).resolves.toBe('retried');
    expect(lastConclusion()[1].$set.last_error).toContain(
      'redirections refusées',
    );
  });

  it('refuse sans appel réseau une URL interne (échec définitif) ou un DNS privé (réessayable)', async () => {
    await expect(
      dispatcher.process(
        makeMessage(),
        makeEndpoint({ url: 'http://169.254.169.254/latest' }),
      ),
    ).resolves.toBe('failed');
    (delivery.lookupImpl as jest.Mock).mockResolvedValue([
      { address: '10.0.0.8', family: 4 },
    ]);
    await expect(
      dispatcher.process(makeMessage(), makeEndpoint()),
    ).resolves.toBe('retried');
    expect(lastConclusion()[1].$set.last_error).toContain('10.0.0.8');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('échoue sans livrer si le point de terminaison est désactivé ou supprimé', async () => {
    await expect(
      dispatcher.process(makeMessage(), makeEndpoint({ is_active: false })),
    ).resolves.toBe('failed');
    await expect(dispatcher.process(makeMessage(), null)).resolves.toBe(
      'failed',
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(endpoints.recordFailure).not.toHaveBeenCalled();
  });

  it('publie via l’adaptateur de courtier pour le type broker (clé = sujet ou nom)', async () => {
    const endpoint = makeEndpoint({
      kind: IntegrationEndpointKind.BROKER,
      url: undefined,
      broker_destination: 'pleasantstay.events',
    });
    await expect(
      dispatcher.process(makeMessage({ topic: 'crm.vip' }), endpoint),
    ).resolves.toBe('delivered');
    expect(broker.publish).toHaveBeenCalledWith(
      'crm.vip',
      expect.objectContaining({ id: 'evt-1' }),
      expect.objectContaining({ destination: 'pleasantstay.events' }),
    );
    broker.publish.mockRejectedValueOnce(new Error('canal fermé'));
    await expect(dispatcher.process(makeMessage(), endpoint)).resolves.toBe(
      'retried',
    );
    expect(broker.publish).toHaveBeenLastCalledWith(
      'billing.invoice.paid',
      expect.anything(),
      expect.anything(),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('réserve atomiquement (pending dû ou bail expiré) avec un jeton et incrémente les tentatives', async () => {
    const stored = makeMessage({ lock_token: undefined });
    outboxModel.findOneAndUpdate.mockReturnValue({
      lean: () => execOf(stored),
    });
    const claimed = await dispatcher.claimNext();
    const [filter, update, options] =
      outboxModel.findOneAndUpdate.mock.calls[0];
    expect(filter.$or).toEqual([
      { status: OutboxStatus.PENDING, next_attempt_at: { $lte: NOW } },
      { status: OutboxStatus.DELIVERING, locked_until: { $lt: NOW } },
    ]);
    expect(update.$set.status).toBe(OutboxStatus.DELIVERING);
    expect(update.$set.locked_until.getTime()).toBeGreaterThan(NOW.getTime());
    expect(update.$inc).toEqual({ attempts: 1 });
    expect(options).toMatchObject({ new: true, sort: { next_attempt_at: 1 } });
    expect(claimed?.lock_token).toBe(update.$set.lock_token);
  });

  it('ne lève pas si le bail a été perdu entre-temps', async () => {
    fetchMock.mockResolvedValue(new Response('ok', { status: 200 }));
    outboxModel.updateOne.mockReturnValue(execOf({ modifiedCount: 0 }));
    await expect(
      dispatcher.process(makeMessage(), makeEndpoint()),
    ).resolves.toBe('delivered');
  });

  it('traite une passe jusqu’à épuisement ou limite de lot', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(new Response('ok', { status: 200 })),
    );
    const endpoint = makeEndpoint();
    endpoints.findByIdWithSecret.mockResolvedValue(endpoint);
    let remaining = 3;
    outboxModel.findOneAndUpdate.mockImplementation(() => ({
      lean: () =>
        execOf(
          remaining-- > 0 ? makeMessage({ endpoint_id: endpoint._id }) : null,
        ),
    }));
    const summary = await dispatcher.dispatchDue();
    expect(summary).toMatchObject({ claimed: 3, delivered: 3, retried: 0 });
    expect(endpoints.findByIdWithSecret).toHaveBeenCalledTimes(1); // cache par passe

    remaining = 100;
    const limited = await dispatcher.dispatchDue({ limit: 2 });
    expect(limited.claimed).toBe(2);
  });

  it('LoggingBrokerAdapter ne lève pas', async () => {
    await expect(
      new LoggingBrokerAdapter().publish('a.b', {
        id: '1',
        name: 'a.b',
        occurred_at: '',
        payload: {},
      }),
    ).resolves.toBeUndefined();
  });
});
