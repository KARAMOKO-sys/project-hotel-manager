import { Injectable, Logger } from '@nestjs/common';
import { OutboundEnvelope } from '../integration-bus.types';

/**
 * Adaptateur de courtier de messages (RabbitMQ, Kafka…) utilisé par les
 * points de terminaison de type `broker`.
 *
 * Fourni sous le jeton `MESSAGE_BROKER_ADAPTER` ; voir README.md pour
 * brancher un adaptateur `amqplib`.
 */
export interface MessageBrokerAdapter {
  /**
   * Publie l'enveloppe. Doit lever une erreur si le courtier n'a pas
   * confirmé la publication (le message sera alors retenté).
   */
  publish(
    routingKey: string,
    envelope: OutboundEnvelope,
    options?: { messageId?: string; destination?: string },
  ): Promise<void>;
}

/**
 * Adaptateur par défaut : journalise la publication sans l'envoyer.
 * Permet de configurer des points de terminaison `broker` avant d'avoir
 * branché un vrai courtier.
 */
@Injectable()
export class LoggingBrokerAdapter implements MessageBrokerAdapter {
  private readonly logger = new Logger('IntegrationBroker');

  publish(
    routingKey: string,
    envelope: OutboundEnvelope,
    options?: { messageId?: string; destination?: string },
  ): Promise<void> {
    this.logger.log(
      `[courtier simulé] ${options?.destination ?? 'pleasantstay.events'} ← ${routingKey} (événement ${envelope.id}, message ${options?.messageId ?? '-'})`,
    );
    return Promise.resolve();
  }
}
