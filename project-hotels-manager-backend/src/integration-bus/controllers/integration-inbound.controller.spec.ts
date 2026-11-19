/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument -- mocks typés `any` */
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, randomBytes } from 'crypto';
import { Types } from 'mongoose';
import { IntegrationInboundController } from './integration-inbound.controller';
import { InboundWebhookService } from '../services/inbound-webhook.service';
import {
  decryptWithKey,
  encryptWithKey,
} from '../services/secret-cipher.service';
import { InboundSignatureScheme } from '../schemas/integration-inbound-source.entity';
import { WebhookProvider } from '../../webhook-log/schemas/webhook-log.entity';
import { signV1 } from '../utils/signature';
import { IS_PUBLIC_KEY } from '../../auth/auth.constants';
import { REQUIRES_APP_KEY } from '../../platform/apps/requires-app.decorator';

describe('IntegrationInboundController', () => {
  const key = randomBytes(32);
  const cipher = {
    encrypt: (t: string) => encryptWithKey(key, t),
    decrypt: (t: string) => decryptWithKey(key, t),
  };
  const SECRET = 'whsec_inbound_test_secret';
  const NOW = 1_800_000_000;
  const SOURCE_KEY = 'k'.repeat(32);

  let source: any;
  let sources: any;
  let webhookLogs: any;
  let apps: any;
  let emitter: any;
  let service: InboundWebhookService;
  let controller: IntegrationInboundController;

  const body = JSON.stringify({
    id: 'cp_123',
    type: 'payment.succeeded',
    amount: 5000,
  });

  const request = (
    headers: Record<string, string>,
    raw: Buffer | undefined = Buffer.from(body),
  ) =>
    ({
      rawBody: raw,
      body: raw ? JSON.parse(raw.toString()) : {},
      headers,
      ip: '41.66.1.2',
    }) as any;

  const v1Headers = (ts = NOW, payload = body, secret = SECRET) => ({
    'x-pleasantstay-timestamp': String(ts),
    'x-pleasantstay-signature': signV1(secret, ts, payload),
  });

  beforeEach(() => {
    source = {
      _id: new Types.ObjectId(),
      organization_id: new Types.ObjectId(),
      property_id: new Types.ObjectId(),
      name: 'CinetPay',
      key: SOURCE_KEY,
      provider: WebhookProvider.OTHER,
      secret_encrypted: cipher.encrypt(SECRET),
      signature_scheme: InboundSignatureScheme.PLEASANTSTAY_V1,
      tolerance_seconds: 300,
      is_active: true,
    };
    sources = {
      findActiveByKey: jest
        .fn()
        .mockImplementation((k: string) =>
          Promise.resolve(k === SOURCE_KEY ? source : null),
        ),
      recordReception: jest.fn().mockResolvedValue(undefined),
    };
    webhookLogs = {
      create: jest
        .fn()
        .mockResolvedValue({ _id: new Types.ObjectId(), is_duplicate: false }),
    };
    apps = { isInstalled: jest.fn().mockResolvedValue(true) };
    emitter = { emitAsync: jest.fn().mockResolvedValue([]) };
    service = new InboundWebhookService(
      sources,
      cipher as any,
      webhookLogs,
      apps,
      emitter,
    );
    service.nowSeconds = () => NOW;
    controller = new IntegrationInboundController(service);
  });

  it('est public et non soumis à @RequiresApp', () => {
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        // eslint-disable-next-line @typescript-eslint/unbound-method
        IntegrationInboundController.prototype.receive,
      ),
    ).toBe(true);
    expect(
      Reflect.getMetadata(REQUIRES_APP_KEY, IntegrationInboundController),
    ).toBeUndefined();
  });

  it('accepte une signature valide, journalise (signature_verified) et publie integration.inbound', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick'] });
    try {
      const ack = await controller.receive(
        SOURCE_KEY,
        request({ ...v1Headers(), authorization: 'Bearer x' }),
      );
      expect(ack).toMatchObject({ received: true, duplicate: false });
      const dto = webhookLogs.create.mock.calls[0][0];
      expect(dto).toMatchObject({
        provider: WebhookProvider.OTHER,
        event_type: 'payment.succeeded',
        event_id: 'cp_123',
        property_id: String(source.property_id),
        signature_verified: true,
        ip_address: '41.66.1.2',
      });
      expect(dto.headers.authorization).toBeUndefined();
      expect(sources.recordReception).toHaveBeenCalledWith(source._id, true);
      jest.runAllTimers();
      expect(emitter.emitAsync).toHaveBeenCalledWith(
        'integration.inbound',
        expect.objectContaining({
          provider: WebhookProvider.OTHER,
          event_id: 'cp_123',
          payload: { id: 'cp_123', type: 'payment.succeeded', amount: 5000 },
          source: expect.objectContaining({ id: String(source._id) }),
        }),
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('rejette un corps altéré', async () => {
    const tampered = Buffer.from(body.replace('5000', '9000'));
    await expect(
      controller.receive(SOURCE_KEY, request(v1Headers(), tampered)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(webhookLogs.create).not.toHaveBeenCalled();
    expect(sources.recordReception).toHaveBeenCalledWith(source._id, false);
  });

  it('rejette un mauvais secret, une signature absente ou un horodatage périmé (rejeu)', async () => {
    await expect(
      controller.receive(
        SOURCE_KEY,
        request(v1Headers(NOW, body, 'mauvais-secret-0000')),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      controller.receive(SOURCE_KEY, request({})),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      controller.receive(SOURCE_KEY, request(v1Headers(NOW - 301))),
    ).rejects.toThrow(/stale_timestamp/);
    expect(webhookLogs.create).not.toHaveBeenCalled();
  });

  it('échoue fermé (400) sans corps brut', async () => {
    const noRaw = { ...request(v1Headers()), rawBody: undefined };
    await expect(controller.receive(SOURCE_KEY, noRaw)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(webhookLogs.create).not.toHaveBeenCalled();
  });

  it('répond 404 pour une clé inconnue ou une application non installée', async () => {
    await expect(
      controller.receive('inconnue', request(v1Headers())),
    ).rejects.toBeInstanceOf(NotFoundException);
    apps.isInstalled.mockResolvedValue(false);
    await expect(
      controller.receive(SOURCE_KEY, request(v1Headers())),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('vérifie le schéma hmac_sha256_hex_header sur l’en-tête configuré', async () => {
    source.signature_scheme = InboundSignatureScheme.HMAC_SHA256_HEX_HEADER;
    source.signature_header = 'x-wave-signature';
    source.signature_prefix = 'sha256=';
    const hex = createHmac('sha256', SECRET).update(body).digest('hex');
    await expect(
      controller.receive(
        SOURCE_KEY,
        request({ 'x-wave-signature': `sha256=${hex}` }),
      ),
    ).resolves.toMatchObject({ received: true });
    await expect(
      controller.receive(
        SOURCE_KEY,
        request({ 'x-wave-signature': `sha256=${'0'.repeat(64)}` }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('ne republie pas un doublon (même identifiant fournisseur)', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick'] });
    try {
      webhookLogs.create.mockResolvedValue({
        _id: new Types.ObjectId(),
        is_duplicate: true,
      });
      await expect(
        controller.receive(SOURCE_KEY, request(v1Headers())),
      ).resolves.toMatchObject({ duplicate: true });
      jest.runAllTimers();
      expect(emitter.emitAsync).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });
});
