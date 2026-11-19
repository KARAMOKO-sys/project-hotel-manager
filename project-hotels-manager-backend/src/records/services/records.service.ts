import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import {
  findRecordModel,
  RECORD_REGISTRY,
  RecordModelDefinition,
} from '../record-registry';
import { AppsService } from '../../platform/apps/apps.service';
import { TenantScopeService } from '../../platform/tenancy/tenant-scope.service';
import { APP_BY_KEY } from '../../platform/apps/app-catalog';

/** Fiche minimale lue dans sa collection. */
export interface RecordReference {
  definition: RecordModelDefinition;
  id: Types.ObjectId;
  /** Établissement de la fiche (`null` si la fiche n'en a pas). */
  property_id: string | null;
}

/**
 * Accès générique aux fiches du registre, sans dépendre des modules métier :
 * la collection est lue directement via la connexion Mongoose.
 */
@Injectable()
export class RecordsService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly apps: AppsService,
    private readonly tenantScope: TenantScopeService,
  ) {}

  /** Modèles pris en charge (pour les écrans de configuration). */
  listModels(): RecordModelDefinition[] {
    return RECORD_REGISTRY.map((definition) => ({
      ...definition,
      property_scoped: definition.property_scoped !== false,
    }));
  }

  /** Valide le modèle contre le registre (400 sinon). */
  resolveModel(model: string): RecordModelDefinition {
    const definition = findRecordModel(model);
    if (!definition) {
      throw new BadRequestException(
        `Modèle de fiche non pris en charge : ${String(model)}`,
      );
    }
    return definition;
  }

  /** Valide un identifiant de fiche (400 sinon). */
  toObjectId(id: string, label = 'Identifiant de fiche'): Types.ObjectId {
    if (typeof id !== 'string' || !Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`${label} invalide : ${String(id)}`);
    }
    return new Types.ObjectId(id);
  }

  /**
   * Vérifie que la fiche existe (et n'est pas supprimée) ; lève 400 si le
   * modèle ou l'identifiant est invalide, 404 si la fiche est introuvable.
   */
  async assertRecordExists(
    model: string,
    id: string,
  ): Promise<RecordReference> {
    const definition = this.resolveModel(model);
    const objectId = this.toObjectId(id);
    const doc = await this.connection
      .collection(definition.collection)
      .findOne(
        { _id: objectId, is_deleted: { $ne: true } },
        { projection: { property_id: 1 } },
      );
    if (!doc) {
      throw new NotFoundException(
        `${definition.label} introuvable (id : ${id})`,
      );
    }
    return {
      definition,
      id: objectId,
      property_id: doc.property_id ? String(doc.property_id) : null,
    };
  }

  /** Établissement d'une fiche (`null` si la fiche n'en a pas). */
  async getRecordPropertyId(model: string, id: string): Promise<string | null> {
    return (await this.assertRecordExists(model, id)).property_id;
  }

  /** Organisation d'un établissement (`null` si inconnue). */
  async getOrganizationId(
    propertyId: string | null | undefined,
  ): Promise<string | null> {
    if (!propertyId) return null;
    return this.tenantScope.getOrganizationIdForProperty(propertyId);
  }

  /**
   * Refuse (403) si l'application n'est pas installée pour l'organisation de
   * l'établissement. Sans organisation identifiable, la vérification est
   * ignorée (même comportement que `AppInstalledGuard`).
   */
  async assertAppInstalled(
    propertyId: string | null | undefined,
    appKey: string,
  ): Promise<void> {
    const organizationId = await this.getOrganizationId(propertyId);
    if (!organizationId) return;
    if (!(await this.apps.isInstalled(organizationId, appKey))) {
      const name = APP_BY_KEY.get(appKey)?.name ?? appKey;
      throw new ForbiddenException(
        `L'application « ${name} » n'est pas installée pour cette organisation`,
      );
    }
  }

  /**
   * Organisation visée par un événement : `organization_id` de l'enveloppe,
   * sinon organisation de l'établissement `property_id`.
   */
  async resolveEventOrganization(event: {
    organization_id?: string;
    property_id?: string;
  }): Promise<string | null> {
    if (
      event.organization_id &&
      Types.ObjectId.isValid(event.organization_id)
    ) {
      return event.organization_id;
    }
    return this.getOrganizationId(event.property_id);
  }

  /**
   * Vrai si l'application est installée pour l'organisation de l'événement.
   * Faux si aucune organisation n'est identifiable (prudence côté abonnés).
   */
  async isAppInstalledForEvent(
    event: { organization_id?: string; property_id?: string },
    appKey: string,
  ): Promise<boolean> {
    const organizationId = await this.resolveEventOrganization(event);
    if (!organizationId) return false;
    return this.apps.isInstalled(organizationId, appKey);
  }

  /** Établissements d'une organisation (identifiants). */
  async getPropertyIdsOfOrganization(
    organizationId: string,
  ): Promise<Types.ObjectId[]> {
    if (!Types.ObjectId.isValid(organizationId)) return [];
    const rows = await this.connection
      .collection('properties')
      .find(
        { organization_id: new Types.ObjectId(organizationId) },
        { projection: { _id: 1 } },
      )
      .toArray();
    return rows.map((row) => row._id);
  }

  /**
   * Noms des champs du schéma Mongoose d'un modèle, s'il est enregistré sur
   * la connexion (premier segment des chemins). Liste vide sinon.
   */
  getCoreFieldNames(model: string): string[] {
    const definition = findRecordModel(model);
    if (!definition) return [];
    const registered = this.connection.models[definition.model];
    if (!registered) return [];
    const names = new Set<string>();
    for (const path of Object.keys(registered.schema.paths)) {
      names.add(path.split('.')[0]);
    }
    return [...names];
  }
}
