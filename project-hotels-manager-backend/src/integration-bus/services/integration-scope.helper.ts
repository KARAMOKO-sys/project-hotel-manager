import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { TenantScopeService } from '../../platform/tenancy/tenant-scope.service';

/** Convertit un identifiant validé en ObjectId (400 sinon). */
export function toObjectId(id: string, label = 'Identifiant'): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) {
    throw new BadRequestException(`${label} invalide`);
  }
  return new Types.ObjectId(id);
}

/**
 * Détermine l'organisation d'une configuration : `organization_id` fourni,
 * sinon celle de l'établissement. Vérifie la cohérence des deux.
 */
export async function resolveOrganization(
  tenantScope: TenantScopeService,
  organizationId: string | undefined,
  propertyId: string | undefined,
): Promise<string> {
  const fromProperty = propertyId
    ? await tenantScope.getOrganizationIdForProperty(propertyId)
    : null;
  if (propertyId && !fromProperty) {
    throw new NotFoundException(
      'Établissement introuvable ou sans organisation',
    );
  }
  if (organizationId && fromProperty && organizationId !== fromProperty) {
    throw new BadRequestException(
      "L'établissement n'appartient pas à cette organisation",
    );
  }
  const resolved = organizationId ?? fromProperty;
  if (!resolved) {
    throw new BadRequestException('organization_id ou property_id est requis');
  }
  return resolved;
}

/** Échappe une chaîne pour un `$regex`. */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
