import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DomainEventPublisher } from '../../platform/events/domain-event.publisher';
import type { DomainEvent } from '../../platform/events/domain-events';
import { INTEGRATION_OUTBOUND_CHANNEL } from '../integration-bus.constants';
import type { IntegrationOutboundMessage } from '../integration-bus.types';
import { OutboxService } from './outbox.service';

/**
 * Abonné transverse : met en file (outbox) chaque événement métier pour les
 * points de terminaison abonnés. Aucun appel réseau ici : la livraison est
 * faite par le répartiteur. Ne lève jamais d'exception.
 */
@Injectable()
export class IntegrationEventListener {
  private readonly logger = new Logger(IntegrationEventListener.name);

  constructor(private readonly outbox: OutboxService) {}

  @OnEvent(DomainEventPublisher.ANY, { async: true, promisify: true })
  async onDomainEvent(event: DomainEvent<object>): Promise<void> {
    await this.safeEnqueue(event);
  }

  /** Événements publiés par l'action `publish_event` des automatisations. */
  @OnEvent(INTEGRATION_OUTBOUND_CHANNEL, { async: true, promisify: true })
  async onOutbound(message: IntegrationOutboundMessage): Promise<void> {
    if (!message?.event) return;
    const topic =
      typeof message.topic === 'string'
        ? message.topic.trim().slice(0, 150)
        : undefined;
    await this.safeEnqueue(message.event, topic || undefined);
  }

  private async safeEnqueue(event: DomainEvent<object>, topic?: string) {
    try {
      await this.outbox.enqueue(event, topic);
    } catch (error) {
      this.logger.error(
        `Mise en file ESB impossible pour ${event?.name} (${event?.id}) : ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
