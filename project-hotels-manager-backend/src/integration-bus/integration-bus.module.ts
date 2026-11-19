import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WebhookLogModule } from '../webhook-log/webhook-log.module';
import { MESSAGE_BROKER_ADAPTER } from './integration-bus.constants';
import { LoggingBrokerAdapter } from './brokers/message-broker.adapter';
import {
  IntegrationEndpoint,
  IntegrationEndpointSchema,
} from './schemas/integration-endpoint.entity';
import {
  OutboxMessage,
  OutboxMessageSchema,
} from './schemas/outbox-message.entity';
import {
  IntegrationInboundSource,
  IntegrationInboundSourceSchema,
} from './schemas/integration-inbound-source.entity';
import { SecretCipherService } from './services/secret-cipher.service';
import { EndpointDeliveryService } from './services/endpoint-delivery.service';
import { IntegrationEndpointService } from './services/integration-endpoint.service';
import { OutboxService } from './services/outbox.service';
import { OutboxDispatcherService } from './services/outbox-dispatcher.service';
import { IntegrationEventListener } from './services/integration-event.listener';
import { InboundSourceService } from './services/inbound-source.service';
import { InboundWebhookService } from './services/inbound-webhook.service';
import { IntegrationEndpointController } from './controllers/integration-endpoint.controller';
import { IntegrationOutboxController } from './controllers/integration-outbox.controller';
import { IntegrationInboundSourceController } from './controllers/integration-inbound-source.controller';
import { IntegrationStatsController } from './controllers/integration-stats.controller';
import { IntegrationInboundController } from './controllers/integration-inbound.controller';

/**
 * Bus d'intégration (ESB) — application `integration_bus`.
 *
 * Sortant : outbox idempotente alimentée par `domain.event` et
 * `integration.outbound`, livrée par un répartiteur (webhooks signés HMAC ou
 * courtier). Entrant : webhooks signés vers `webhook_logs` puis
 * `integration.inbound`. Voir README.md.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: IntegrationEndpoint.name, schema: IntegrationEndpointSchema },
      { name: OutboxMessage.name, schema: OutboxMessageSchema },
      {
        name: IntegrationInboundSource.name,
        schema: IntegrationInboundSourceSchema,
      },
    ]),
    WebhookLogModule,
  ],
  controllers: [
    IntegrationEndpointController,
    IntegrationOutboxController,
    IntegrationInboundSourceController,
    IntegrationStatsController,
    IntegrationInboundController,
  ],
  providers: [
    { provide: MESSAGE_BROKER_ADAPTER, useClass: LoggingBrokerAdapter },
    SecretCipherService,
    EndpointDeliveryService,
    IntegrationEndpointService,
    OutboxService,
    OutboxDispatcherService,
    IntegrationEventListener,
    InboundSourceService,
    InboundWebhookService,
  ],
  exports: [OutboxService, IntegrationEndpointService, MESSAGE_BROKER_ADAPTER],
})
export class IntegrationBusModule {}
