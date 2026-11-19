import { SetMetadata } from '@nestjs/common';

export const REQUIRES_APP_KEY = 'platform:requires_app';

/**
 * Réserve un contrôleur (ou une route) aux organisations qui ont installé
 * l'application `appKey`. Vérifié par `AppInstalledGuard`.
 *
 * L'organisation est déduite de la requête (en-tête `x-organization-id`,
 * `organization_id` ou établissement `property_id`). Si aucune organisation
 * n'est identifiable, la vérification est déléguée au service.
 */
export const RequiresApp = (appKey: string) =>
  SetMetadata(REQUIRES_APP_KEY, appKey);
