/** Clé de l'application dans le magasin d'applications. */
export const INTEGRATION_BUS_APP_KEY = 'integration_bus';

/**
 * Canal interne émis par l'action `publish_event` des automatisations :
 * charge utile `{ topic: string, event: DomainEvent }`.
 */
export const INTEGRATION_OUTBOUND_CHANNEL = 'integration.outbound';

/**
 * Canal interne publié après réception d'un webhook entrant vérifié :
 * charge utile `InboundIntegrationEvent`.
 */
export const INTEGRATION_INBOUND_CHANNEL = 'integration.inbound';

/** Nom de l'événement de test envoyé par `POST integration/endpoints/:id/test`. */
export const PING_EVENT_NAME = 'platform.ping';

/** En-têtes HTTP posés sur chaque livraison sortante. */
export const ESB_HEADERS = {
  EVENT: 'X-PleasantStay-Event',
  DELIVERY: 'X-PleasantStay-Delivery',
  TIMESTAMP: 'X-PleasantStay-Timestamp',
  SIGNATURE: 'X-PleasantStay-Signature',
} as const;

export const ESB_USER_AGENT = 'PleasantStay-ESB/1.0';

/** Valeurs par défaut des points de terminaison. */
export const DEFAULT_TIMEOUT_MS = 10_000;
export const MIN_TIMEOUT_MS = 1_000;
export const MAX_TIMEOUT_MS = 30_000;
export const DEFAULT_MAX_ATTEMPTS = 8;

/**
 * Nombre d'échecs consécutifs après lequel un point de terminaison est
 * désactivé automatiquement (surchargeable par `INTEGRATION_AUTO_DISABLE_AFTER`).
 */
export const DEFAULT_AUTO_DISABLE_AFTER = 50;

/** Nombre maximal de messages traités par passe du répartiteur. */
export const DEFAULT_DISPATCH_BATCH_SIZE = 50;

/** Nombre de livraisons simultanées dans une passe. */
export const DISPATCH_CONCURRENCY = 5;

/**
 * Durée du bail posé sur un message en cours de livraison : passé ce délai
 * (instance arrêtée en pleine livraison), le message peut être repris.
 */
export const DELIVERY_LEASE_MS = 2 * 60_000;

/** Durée de conservation des messages livrés (index TTL). */
export const DELIVERED_TTL_SECONDS = 30 * 24 * 3600;

/** Tolérance par défaut (secondes) entre l'horodatage signé et l'heure serveur. */
export const DEFAULT_SIGNATURE_TOLERANCE_SECONDS = 300;

/** Taille maximale conservée d'une réponse d'erreur distante. */
export const MAX_ERROR_LENGTH = 1_000;

/** Fournisseur d'adaptateur de courtier de messages (RabbitMQ, Kafka…). */
export const MESSAGE_BROKER_ADAPTER = Symbol('MESSAGE_BROKER_ADAPTER');

/** Indique si l'environnement courant est la production. */
export function isProductionEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV === 'production';
}

/** Autorise les URL privées/locales (développement local uniquement). */
export function allowPrivateUrls(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.INTEGRATION_ALLOW_PRIVATE_URLS === 'true';
}

/** Lit un entier positif depuis l'environnement. */
export function positiveIntFromEnv(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}
