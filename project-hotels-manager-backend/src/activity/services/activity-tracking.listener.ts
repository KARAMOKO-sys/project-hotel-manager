import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DomainEventPublisher } from '../../platform/events/domain-event.publisher';
import type { DomainEvent } from '../../platform/events/domain-events';
import { ActivityService } from './activity.service';

/**
 * Inscrit chaque événement métier portant une fiche du registre dans le fil
 * de discussion de cette fiche (message de suivi).
 */
@Injectable()
export class ActivityTrackingListener {
  private readonly logger = new Logger(ActivityTrackingListener.name);

  constructor(private readonly activity: ActivityService) {}

  @OnEvent(DomainEventPublisher.ANY, { async: true, promisify: true })
  async onDomainEvent(event: DomainEvent<object>): Promise<void> {
    try {
      await this.activity.trackEvent(event);
    } catch (error) {
      this.logger.error(
        `Suivi impossible pour ${event?.name} (${event?.id}) : ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
