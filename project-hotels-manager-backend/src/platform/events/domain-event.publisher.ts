import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import {
  DomainEvent,
  DomainEventInput,
  DomainEventName,
} from './domain-events';

/**
 * Publie les événements métier sur le bus interne (EventEmitter2).
 *
 * - Les abonnés s'exécutent après l'émetteur : une erreur d'un abonné est
 *   journalisée mais n'annule jamais l'opération métier d'origine.
 * - L'événement est aussi émis sous le nom générique `domain.*` pour les
 *   consommateurs transverses (automatisations, ESB, fil d'activité).
 */
@Injectable()
export class DomainEventPublisher {
  /** Nom de l'événement générique reçu par les consommateurs transverses. */
  static readonly ANY = 'domain.event';

  private readonly logger = new Logger(DomainEventPublisher.name);

  constructor(private readonly emitter: EventEmitter2) {}

  /** Construit et publie un événement. Ne lève jamais d'exception. */
  async publish<T extends object>(
    name: DomainEventName,
    input: DomainEventInput<T>,
  ): Promise<DomainEvent<T>> {
    const event: DomainEvent<T> = {
      ...input,
      id: randomUUID(),
      name,
      occurred_at: new Date(),
    };
    await this.dispatch(name, event);
    await this.dispatch(DomainEventPublisher.ANY, event);
    return event;
  }

  private async dispatch(channel: string, event: DomainEvent<object>) {
    try {
      await this.emitter.emitAsync(channel, event);
    } catch (error) {
      this.logger.error(
        `Abonné en erreur pour ${event.name} (${channel}) : ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}

/**
 * Extrait des identifiants sous forme de chaîne depuis un document Mongoose
 * ou un objet `lean()`, pour alimenter `DomainEventInput`.
 */
export function refId(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const candidate = (value as { _id?: unknown })._id;
    if (candidate !== undefined && candidate !== value) return refId(candidate);
    const text = (value as { toString(): string }).toString();
    return text && text !== '[object Object]' ? text : undefined;
  }
  return String(value);
}

/** Copie JSON d'un document (ObjectId → chaîne, dates → ISO). */
export function toEventPayload(doc: unknown): Record<string, unknown> {
  if (!doc || typeof doc !== 'object') return {};
  const plain =
    typeof (doc as { toObject?: unknown }).toObject === 'function'
      ? (doc as { toObject(): unknown }).toObject()
      : doc;
  return JSON.parse(JSON.stringify(plain)) as Record<string, unknown>;
}

/**
 * Publie un événement décrivant un document métier (réservation, facture…).
 * `publisher` peut être absent (tests unitaires) : rien n'est alors publié.
 */
export async function publishRecordEvent(
  publisher: DomainEventPublisher | undefined,
  name: DomainEventName,
  model: string,
  doc: unknown,
  extra: Record<string, unknown> = {},
): Promise<void> {
  if (!publisher || !doc) return;
  const payload = { ...toEventPayload(doc), ...extra };
  const id = refId(payload._id ?? payload.id);
  await publisher.publish(name, {
    property_id: refId(payload.property_id),
    record: id ? { model, id } : undefined,
    payload,
  });
}
