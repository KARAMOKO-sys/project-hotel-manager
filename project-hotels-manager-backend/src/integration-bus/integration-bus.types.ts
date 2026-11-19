import { DomainEvent, RecordRef } from '../platform/events/domain-events';
import { WebhookProvider } from '../webhook-log/schemas/webhook-log.entity';

/** Enveloppe JSON envoyée aux systèmes externes. */
export interface OutboundEnvelope {
  id: string;
  name: string;
  occurred_at: string;
  organization_id?: string;
  property_id?: string;
  record?: RecordRef;
  payload: Record<string, unknown>;
}

/** Charge utile du canal interne `integration.outbound` (automatisations). */
export interface IntegrationOutboundMessage {
  topic: string;
  event: DomainEvent<object>;
}

/** Charge utile publiée sur `integration.inbound` après vérification. */
export interface InboundIntegrationEvent {
  source: {
    id: string;
    name: string;
    organization_id: string;
    property_id?: string;
  };
  provider: WebhookProvider;
  event_type: string;
  event_id?: string;
  webhook_log_id?: string;
  payload: Record<string, unknown>;
}

/** Résultat d'une tentative de livraison. */
export interface DeliveryResult {
  ok: boolean;
  status_code?: number;
  error?: string;
  latency_ms: number;
  /** Le destinataire a répondu 410 : le point de terminaison doit être désactivé. */
  gone?: boolean;
  /** Échec définitif (URL interdite, configuration invalide) : inutile de retenter. */
  permanent?: boolean;
}

/** Construit l'enveloppe sortante à partir d'un événement métier. */
export function toOutboundEnvelope(
  event: DomainEvent<object>,
): OutboundEnvelope {
  const occurred =
    event.occurred_at instanceof Date
      ? event.occurred_at.toISOString()
      : new Date(event.occurred_at ?? Date.now()).toISOString();
  const envelope: OutboundEnvelope = {
    id: event.id,
    name: event.name,
    occurred_at: occurred,
    organization_id: event.organization_id,
    property_id: event.property_id,
    record: event.record,
    payload: (event.payload ?? {}) as Record<string, unknown>,
  };
  // Copie JSON : ObjectId → chaîne, dates → ISO, suppression des undefined.
  return JSON.parse(JSON.stringify(envelope)) as OutboundEnvelope;
}
