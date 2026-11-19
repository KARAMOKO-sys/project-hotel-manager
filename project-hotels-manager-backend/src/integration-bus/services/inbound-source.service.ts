import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { randomBytes } from 'crypto';
import { TenantScopeService } from '../../platform/tenancy/tenant-scope.service';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { WebhookProvider } from '../../webhook-log/schemas/webhook-log.entity';
import {
  InboundSignatureScheme,
  IntegrationInboundSource,
} from '../schemas/integration-inbound-source.entity';
import {
  CreateInboundSourceDto,
  InboundSourceQueryDto,
  UpdateInboundSourceDto,
} from '../dto/inbound-source.dto';
import { RotateSecretDto } from '../dto/integration-endpoint.dto';
import {
  SecretCipherService,
  generateSigningSecret,
  secretHint,
} from './secret-cipher.service';
import { resolveOrganization, toObjectId } from './integration-scope.helper';

export type InboundSourceWithSecret = IntegrationInboundSource & {
  _id: Types.ObjectId;
};

export type InboundSourceView = Omit<
  IntegrationInboundSource,
  'secret_encrypted'
> & {
  _id: Types.ObjectId;
  has_secret: boolean;
  /** Chemin de réception (préfixe global `api` inclus). */
  inbound_path: string;
  /** URL complète si `INTEGRATION_PUBLIC_BASE_URL` est défini. */
  inbound_url?: string;
};

/** Format des clés publiques de réception (base64url, 32 caractères). */
export const INBOUND_KEY_REGEX = /^[A-Za-z0-9_-]{24,64}$/;

/** Configuration des sources de webhooks entrants. */
@Injectable()
export class InboundSourceService {
  constructor(
    @InjectModel(IntegrationInboundSource.name)
    private readonly sourceModel: Model<IntegrationInboundSource>,
    private readonly cipher: SecretCipherService,
    private readonly tenantScope: TenantScopeService,
  ) {}

  async create(
    dto: CreateInboundSourceDto,
    actorId?: string,
  ): Promise<InboundSourceView & { secret?: string }> {
    const organizationId = await resolveOrganization(
      this.tenantScope,
      dto.organization_id,
      dto.property_id,
    );
    const scheme =
      dto.signature_scheme ?? InboundSignatureScheme.PLEASANTSTAY_V1;
    this.assertSchemeConfig(scheme, dto.signature_header);
    const generated = !dto.secret;
    const secret = dto.secret ?? generateSigningSecret();
    const doc = await this.sourceModel.create({
      organization_id: new Types.ObjectId(organizationId),
      property_id: dto.property_id
        ? new Types.ObjectId(dto.property_id)
        : undefined,
      name: dto.name,
      key: randomBytes(24).toString('base64url'),
      provider: dto.provider ?? WebhookProvider.OTHER,
      secret_encrypted: this.cipher.encrypt(secret),
      secret_hint: secretHint(secret),
      signature_scheme: scheme,
      signature_header: dto.signature_header?.toLowerCase(),
      signature_prefix: dto.signature_prefix,
      tolerance_seconds: dto.tolerance_seconds,
      event_id_path: dto.event_id_path,
      event_type_path: dto.event_type_path,
      is_active: dto.is_active ?? true,
      created_by:
        actorId && Types.ObjectId.isValid(actorId)
          ? new Types.ObjectId(actorId)
          : undefined,
    });
    const view = this.toView(doc.toObject());
    return generated ? { ...view, secret } : view;
  }

  async findAll(
    query: InboundSourceQueryDto,
  ): Promise<PaginatedResult<InboundSourceView>> {
    const filter: Record<string, unknown> = { is_deleted: { $ne: true } };
    if (query.organization_id)
      filter.organization_id = toObjectId(query.organization_id);
    if (query.property_id) filter.property_id = toObjectId(query.property_id);
    if (query.provider) filter.provider = query.provider;
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const [rows, total] = await Promise.all([
      this.sourceModel
        .find(filter as QueryFilter<IntegrationInboundSource>)
        .sort(query.sort ?? '-created_at')
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.sourceModel
        .countDocuments(filter as QueryFilter<IntegrationInboundSource>)
        .exec(),
    ]);
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    return {
      data: (rows as unknown as InboundSourceWithSecret[]).map((row) =>
        this.toView(row),
      ),
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(
    id: string,
    organizationId?: string,
  ): Promise<InboundSourceView> {
    return this.toView(await this.load(id, organizationId));
  }

  async update(
    id: string,
    dto: UpdateInboundSourceDto,
    organizationId?: string,
  ): Promise<InboundSourceView> {
    const current = await this.load(id, organizationId);
    if (dto.property_id !== undefined) {
      await resolveOrganization(
        this.tenantScope,
        String(current.organization_id),
        dto.property_id,
      );
    }
    const scheme = dto.signature_scheme ?? current.signature_scheme;
    this.assertSchemeConfig(
      scheme,
      dto.signature_header ?? current.signature_header,
    );
    const set: Record<string, unknown> = {};
    for (const field of [
      'name',
      'provider',
      'signature_scheme',
      'signature_prefix',
      'tolerance_seconds',
      'event_id_path',
      'event_type_path',
      'is_active',
    ] as const) {
      if (dto[field] !== undefined) set[field] = dto[field];
    }
    if (dto.signature_header !== undefined)
      set.signature_header = dto.signature_header.toLowerCase();
    if (dto.property_id !== undefined)
      set.property_id = new Types.ObjectId(dto.property_id);
    const updated = await this.sourceModel
      .findOneAndUpdate(
        { _id: current._id, is_deleted: { $ne: true } },
        { $set: set },
        { new: true },
      )
      .lean()
      .exec();
    if (!updated) throw new NotFoundException('Source entrante introuvable');
    return this.toView(updated);
  }

  async remove(
    id: string,
    organizationId?: string,
  ): Promise<InboundSourceView> {
    const current = await this.load(id, organizationId);
    const updated = await this.sourceModel
      .findOneAndUpdate(
        { _id: current._id },
        {
          $set: { is_deleted: true, deleted_at: new Date(), is_active: false },
        },
        { new: true },
      )
      .lean()
      .exec();
    return this.toView(updated as unknown as InboundSourceWithSecret);
  }

  async rotateSecret(
    id: string,
    dto: RotateSecretDto,
    organizationId?: string,
  ): Promise<{ id: string; secret: string; secret_hint: string }> {
    const current = await this.load(id, organizationId);
    const secret = dto.secret ?? generateSigningSecret();
    const hint = secretHint(secret);
    await this.sourceModel
      .updateOne(
        { _id: current._id },
        {
          $set: {
            secret_encrypted: this.cipher.encrypt(secret),
            secret_hint: hint,
          },
        },
      )
      .exec();
    return { id: String(current._id), secret, secret_hint: hint };
  }

  /** Source active par clé publique, secret chiffré compris (réception). */
  async findActiveByKey(key: string): Promise<InboundSourceWithSecret | null> {
    if (!INBOUND_KEY_REGEX.test(key)) return null;
    return await this.sourceModel
      .findOne({ key, is_active: true, is_deleted: { $ne: true } })
      .select('+secret_encrypted')
      .lean()
      .exec();
  }

  async recordReception(id: Types.ObjectId, accepted: boolean): Promise<void> {
    await this.sourceModel
      .updateOne(
        { _id: id },
        accepted
          ? {
              $set: { last_received_at: new Date() },
              $inc: { received_count: 1 },
            }
          : { $inc: { rejected_count: 1 } },
      )
      .exec();
  }

  toView(doc: InboundSourceWithSecret): InboundSourceView {
    const { secret_encrypted, ...rest } = doc as InboundSourceWithSecret &
      Record<string, unknown>;
    const path = `/api/integration/inbound/${doc.key}`;
    const base = process.env.INTEGRATION_PUBLIC_BASE_URL?.replace(/\/+$/, '');
    return {
      ...(rest as unknown as InboundSourceView),
      has_secret: !!(secret_encrypted ?? doc.secret_hint),
      inbound_path: path,
      ...(base ? { inbound_url: `${base}${path}` } : {}),
    };
  }

  private async load(
    id: string,
    organizationId?: string,
  ): Promise<InboundSourceWithSecret> {
    const filter: Record<string, unknown> = {
      _id: toObjectId(id),
      is_deleted: { $ne: true },
    };
    if (organizationId)
      filter.organization_id = toObjectId(organizationId, 'Organisation');
    const doc = await this.sourceModel
      .findOne(filter as QueryFilter<IntegrationInboundSource>)
      .lean()
      .exec();
    if (!doc)
      throw new NotFoundException(`Source entrante introuvable (id: ${id})`);
    return doc;
  }

  private assertSchemeConfig(scheme: InboundSignatureScheme, header?: string) {
    if (scheme === InboundSignatureScheme.HMAC_SHA256_HEX_HEADER && !header) {
      throw new BadRequestException(
        'signature_header est obligatoire pour le schéma hmac_sha256_hex_header',
      );
    }
  }
}
