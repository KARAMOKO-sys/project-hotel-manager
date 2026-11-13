import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types, UpdateQuery } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import {
  OtaConnection,
  OtaConnectionDocument,
  OtaConnectionStatus,
  OtaProvider,
  OtaSyncStatus,
} from '../schemas/ota-connection.entity';
import {
  CreateOtaConnectionDto,
  OtaRoomMappingDto,
} from '../dto/create-ota-connection.dto';
import { UpdateOtaConnectionDto } from '../dto/update-ota-connection.dto';
import { RecordSyncDto } from '../dto/ota-connection-actions.dto';

/** Identifiants requis par fournisseur. */
export const OTA_REQUIRED_CREDENTIALS: Record<OtaProvider, string[]> = {
  [OtaProvider.BOOKING]: ['username', 'password'],
  [OtaProvider.EXPEDIA]: ['username', 'password'],
  [OtaProvider.AIRBNB]: ['api_key'],
  [OtaProvider.AGODA]: ['api_key'],
};

/** Nombre d'échecs consécutifs avant passage en erreur. */
export const OTA_MAX_CONSECUTIVE_FAILURES = 5;

/** Résultat d'un test de connexion. */
export interface OtaConnectionTestResult {
  ok: boolean;
  provider: OtaProvider;
  status: OtaConnectionStatus;
  missing_credentials: string[];
  message: string;
  tested_at: Date;
}

/** Synthèse de l'état d'une connexion OTA. */
export interface OtaConnectionStatusSummary {
  provider: OtaProvider;
  status: OtaConnectionStatus;
  is_enabled: boolean;
  sync_status: OtaSyncStatus;
  last_sync_at?: Date;
  last_successful_sync_at?: Date;
  last_sync_error?: string;
  consecutive_failures: number;
  mapped_room_types: number;
}

/**
 * Service de gestion des connexions OTA (Booking, Expedia, Airbnb, Agoda).
 *
 * Il ne réalise aucun appel HTTP : il conserve la configuration (identifiants,
 * correspondances de chambres), active/désactive les connexions et enregistre
 * le résultat des synchronisations effectuées par le worker d'intégration.
 */
@Injectable()
export class OtaConnectionService extends BaseCrudService<
  OtaConnection,
  CreateOtaConnectionDto,
  UpdateOtaConnectionDto
> {
  constructor(
    @InjectModel(OtaConnection.name)
    protected readonly otaConnectionModel: Model<OtaConnectionDocument>,
  ) {
    super(otaConnectionModel, OtaConnection.name);
  }

  /** Crée une connexion (une seule par fournisseur et établissement). */
  async create(dto: CreateOtaConnectionDto): Promise<OtaConnection> {
    const exists = await this.repository.exists({
      property_id: new Types.ObjectId(dto.property_id),
      provider: dto.provider,
      is_deleted: { $ne: true },
    } as QueryFilter<OtaConnection>);
    if (exists) {
      throw new ConflictException(
        `Une connexion ${dto.provider} existe déjà pour cet établissement`,
      );
    }
    if (dto.room_mappings) this.assertValidMappings(dto.room_mappings);

    return super.create({
      ...dto,
      status: OtaConnectionStatus.PENDING,
      is_enabled: false,
      sync_status: OtaSyncStatus.NEVER,
    } as CreateOtaConnectionDto);
  }

  /** Connexions OTA d'un établissement. */
  async findByProperty(propertyId: string): Promise<OtaConnection[]> {
    return this.repository.find(
      {
        property_id: new Types.ObjectId(propertyId),
        is_deleted: { $ne: true },
      } as QueryFilter<OtaConnection>,
      { sort: 'provider' },
    );
  }

  /** Connexion d'un établissement pour un fournisseur donné. */
  findByPropertyAndProvider(
    propertyId: string,
    provider: OtaProvider,
  ): Promise<OtaConnection> {
    return this.findOneOrFail({
      property_id: new Types.ObjectId(propertyId),
      provider,
      is_deleted: { $ne: true },
    } as QueryFilter<OtaConnection>);
  }

  /** Synthèse de l'état de connexion d'un établissement à une OTA. */
  async getConnectionStatus(
    propertyId: string,
    provider: OtaProvider,
  ): Promise<OtaConnectionStatusSummary> {
    const c = await this.findByPropertyAndProvider(propertyId, provider);
    return {
      provider: c.provider,
      status: c.status,
      is_enabled: c.is_enabled,
      sync_status: c.sync_status,
      last_sync_at: c.last_sync_at,
      last_successful_sync_at: c.last_successful_sync_at,
      last_sync_error: c.last_sync_error,
      consecutive_failures: c.consecutive_failures ?? 0,
      mapped_room_types: c.room_mappings?.length ?? 0,
    };
  }

  /** Remplace les identifiants d'API (sort l'éventuel état d'erreur). */
  async updateCredentials(
    id: string,
    credentials: Record<string, string>,
  ): Promise<OtaConnection> {
    const current = await this.findOne(id);
    const update: UpdateQuery<OtaConnection> = { credentials };
    if (current.status === OtaConnectionStatus.ERROR) {
      update.status = OtaConnectionStatus.PENDING;
      update.consecutive_failures = 0;
    }
    return super.update(id, update as UpdateOtaConnectionDto);
  }

  /** Remplace l'ensemble des correspondances de types de chambre. */
  async setRoomMappings(
    id: string,
    mappings: OtaRoomMappingDto[],
  ): Promise<OtaConnection> {
    this.assertValidMappings(mappings);
    return super.update(id, {
      room_mappings: mappings.map((m) => ({
        ...m,
        room_type_id: new Types.ObjectId(m.room_type_id),
      })),
    } as unknown as UpdateOtaConnectionDto);
  }

  /** Supprime la correspondance d'un type de chambre. */
  async removeRoomMapping(
    id: string,
    roomTypeId: string,
  ): Promise<OtaConnection> {
    const current = await this.findOne(id);
    const mappings = current.room_mappings ?? [];
    const remaining = mappings.filter(
      (m) => m.room_type_id.toString() !== roomTypeId,
    );
    if (remaining.length === mappings.length) {
      throw new NotFoundException(
        `Aucune correspondance pour le type de chambre ${roomTypeId}`,
      );
    }
    return super.update(id, {
      room_mappings: remaining,
    } as unknown as UpdateOtaConnectionDto);
  }

  /**
   * Active la connexion. Nécessite des identifiants complets et au moins une
   * correspondance de type de chambre.
   */
  async enable(id: string): Promise<OtaConnection> {
    const current = await this.findWithCredentials(id);
    const missing = this.missingCredentials(current);
    if (missing.length > 0) {
      throw new BadRequestException(
        `Identifiants manquants pour ${current.provider} : ${missing.join(', ')}`,
      );
    }
    if (!current.room_mappings?.length) {
      throw new BadRequestException(
        'Au moins une correspondance de type de chambre est requise',
      );
    }
    return super.update(id, {
      is_enabled: true,
      status: OtaConnectionStatus.ACTIVE,
      consecutive_failures: 0,
    } as unknown as UpdateOtaConnectionDto);
  }

  /** Désactive la connexion (plus aucune synchronisation). */
  async disable(id: string): Promise<OtaConnection> {
    return super.update(id, {
      is_enabled: false,
      status: OtaConnectionStatus.DISABLED,
    } as unknown as UpdateOtaConnectionDto);
  }

  /**
   * Marque le début d'une synchronisation (verrou logique : une seule
   * synchronisation à la fois par connexion).
   */
  async startSync(id: string): Promise<OtaConnection> {
    const current = await this.findOne(id);
    if (!current.is_enabled) {
      throw new BadRequestException('La connexion OTA est désactivée');
    }
    if (current.sync_status === OtaSyncStatus.IN_PROGRESS) {
      throw new BadRequestException('Une synchronisation est déjà en cours');
    }
    const updated = (await this.otaConnectionModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          is_enabled: true,
          sync_status: { $ne: OtaSyncStatus.IN_PROGRESS },
        },
        { sync_status: OtaSyncStatus.IN_PROGRESS, sync_started_at: new Date() },
        { new: true },
      )
      .exec()) as unknown as OtaConnection | null;
    if (!updated) {
      throw new BadRequestException('Une synchronisation est déjà en cours');
    }
    return updated;
  }

  /**
   * Enregistre le résultat d'une synchronisation. Après
   * `OTA_MAX_CONSECUTIVE_FAILURES` échecs consécutifs, la connexion passe
   * en erreur.
   */
  async recordSync(id: string, dto: RecordSyncDto): Promise<OtaConnection> {
    const current = await this.findOne(id);
    if (current.sync_status !== OtaSyncStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Aucune synchronisation en cours pour cette connexion',
      );
    }

    const now = new Date();
    const stats = {
      reservations_imported: dto.stats?.reservations_imported ?? 0,
      availability_updates: dto.stats?.availability_updates ?? 0,
      rate_updates: dto.stats?.rate_updates ?? 0,
      error_count: dto.stats?.error_count ?? 0,
    };
    let update: UpdateQuery<OtaConnection>;

    if (dto.success) {
      update = {
        sync_status:
          stats.error_count > 0 ? OtaSyncStatus.PARTIAL : OtaSyncStatus.SUCCESS,
        last_sync_at: now,
        last_successful_sync_at: now,
        last_sync_stats: stats,
        consecutive_failures: 0,
        $unset: { last_sync_error: 1 },
      };
      if (current.status === OtaConnectionStatus.ERROR) {
        update.status = OtaConnectionStatus.ACTIVE;
      }
    } else {
      const failures = (current.consecutive_failures ?? 0) + 1;
      update = {
        sync_status: OtaSyncStatus.FAILED,
        last_sync_at: now,
        last_sync_stats: stats,
        last_sync_error: dto.error ?? 'Erreur de synchronisation inconnue',
        consecutive_failures: failures,
      };
      if (failures >= OTA_MAX_CONSECUTIVE_FAILURES) {
        update.status = OtaConnectionStatus.ERROR;
      }
    }

    return super.update(id, update as UpdateOtaConnectionDto);
  }

  /** Connexions actives dont la dernière synchronisation est trop ancienne. */
  async findDueForSync(intervalMinutes = 15): Promise<OtaConnection[]> {
    const threshold = new Date(Date.now() - intervalMinutes * 60 * 1000);
    return this.repository.find(
      {
        is_enabled: true,
        status: OtaConnectionStatus.ACTIVE,
        sync_status: { $ne: OtaSyncStatus.IN_PROGRESS },
        is_deleted: { $ne: true },
        $or: [
          { last_sync_at: { $exists: false } },
          { last_sync_at: null },
          { last_sync_at: { $lte: threshold } },
        ],
      } as QueryFilter<OtaConnection>,
      { sort: 'last_sync_at' },
    );
  }

  /**
   * Teste la configuration de la connexion sans appel réseau : vérifie la
   * présence des identifiants requis et de l'identifiant d'établissement OTA.
   */
  async testConnection(id: string): Promise<OtaConnectionTestResult> {
    const current = await this.findWithCredentials(id);
    const missing = this.missingCredentials(current);
    const ok = missing.length === 0 && !!current.ota_property_id;
    const tested_at = new Date();

    await this.repository.update(id, { last_tested_at: tested_at });

    return {
      ok,
      provider: current.provider,
      status: current.status,
      missing_credentials: missing,
      message: ok
        ? `Configuration ${current.provider} valide`
        : `Configuration ${current.provider} incomplète`,
      tested_at,
    };
  }

  /** Charge une connexion avec ses identifiants (champ `select: false`). */
  private async findWithCredentials(id: string): Promise<OtaConnection> {
    const doc = await this.repository.findOne(
      { _id: new Types.ObjectId(id) } as QueryFilter<OtaConnection>,
      { select: '+credentials' },
    );
    if (!doc) {
      throw new NotFoundException(
        `${OtaConnection.name} introuvable (id: ${id})`,
      );
    }
    return doc;
  }

  private missingCredentials(connection: OtaConnection): string[] {
    const required = OTA_REQUIRED_CREDENTIALS[connection.provider] ?? [];
    const credentials = connection.credentials ?? {};
    return required.filter((key) => !credentials[key]?.toString().trim());
  }

  private assertValidMappings(mappings: OtaRoomMappingDto[]): void {
    const roomTypes = new Set<string>();
    const otaRoomTypes = new Set<string>();
    for (const m of mappings) {
      if (roomTypes.has(m.room_type_id)) {
        throw new BadRequestException(
          `Type de chambre ${m.room_type_id} mappé plusieurs fois`,
        );
      }
      const otaKey = `${m.ota_room_type_id}|${m.ota_rate_plan_id ?? ''}`;
      if (otaRoomTypes.has(otaKey)) {
        throw new BadRequestException(
          `Type de chambre OTA ${m.ota_room_type_id} mappé plusieurs fois`,
        );
      }
      roomTypes.add(m.room_type_id);
      otaRoomTypes.add(otaKey);
    }
  }
}
