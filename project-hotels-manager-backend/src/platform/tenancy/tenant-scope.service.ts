import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';

const CACHE_TTL_MS = 60_000;

/**
 * Résout l'organisation à laquelle appartient un établissement.
 *
 * Lit directement la collection `properties` (sans dépendre de PropertyModule,
 * pour éviter les imports circulaires) et met le résultat en cache une minute.
 */
@Injectable()
export class TenantScopeService {
  private readonly cache = new Map<
    string,
    { organizationId: string | null; expiresAt: number }
  >();

  constructor(@InjectConnection() private readonly connection: Connection) {}

  async getOrganizationIdForProperty(
    propertyId: string,
  ): Promise<string | null> {
    if (!Types.ObjectId.isValid(propertyId)) return null;
    const cached = this.cache.get(propertyId);
    if (cached && cached.expiresAt > Date.now()) return cached.organizationId;

    const property = await this.connection
      .collection('properties')
      .findOne(
        { _id: new Types.ObjectId(propertyId) },
        { projection: { organization_id: 1 } },
      );
    const organizationId = property?.organization_id
      ? String(property.organization_id)
      : null;
    this.cache.set(propertyId, {
      organizationId,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return organizationId;
  }

  /**
   * Organisation visée par une requête : en-tête `x-organization-id`,
   * paramètre `organizationId`, champ `organization_id`, ou organisation de
   * l'établissement (`propertyId` / `property_id`).
   */
  async resolveFromRequest(request: {
    headers?: Record<string, unknown>;
    params?: Record<string, unknown>;
    query?: Record<string, unknown>;
    body?: unknown;
  }): Promise<string | null> {
    const body = (request.body ?? {}) as Record<string, unknown>;
    const direct = [
      request.headers?.['x-organization-id'],
      request.params?.organizationId,
      request.params?.organization_id,
      request.query?.organization_id,
      body.organization_id,
    ].find(
      (value) => typeof value === 'string' && Types.ObjectId.isValid(value),
    );
    if (typeof direct === 'string') return direct;

    const propertyId = [
      request.params?.propertyId,
      request.params?.property_id,
      request.query?.property_id,
      body.property_id,
    ].find(
      (value) => typeof value === 'string' && Types.ObjectId.isValid(value),
    );
    return typeof propertyId === 'string'
      ? this.getOrganizationIdForProperty(propertyId)
      : null;
  }
}
