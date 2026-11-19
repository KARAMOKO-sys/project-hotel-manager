# Bus d'intégration (ESB) — application `integration_bus`

Publie de façon fiable les événements métier vers des systèmes externes
(gestionnaires de canaux, CinetPay / Orange Money / Wave, comptabilité, BI,
RabbitMQ/Kafka…) et reçoit des webhooks entrants signés.

## Sortant : pattern outbox

1. `IntegrationEventListener` écoute `domain.event` (`DomainEventPublisher.ANY`)
   et `integration.outbound` (`{ topic, event }`, action `publish_event` des
   automatisations ; `topic` est un nom supplémentaire pour la correspondance
   des motifs et devient la clé de routage courtier).
2. `OutboxService.enqueue` résout l'organisation (`organization_id` ou
   établissement), ignore si `integration_bus` n'est pas installé, retient les
   points de terminaison actifs dont un motif correspond (`*`, `billing.*`,
   nom exact) et, si le point est restreint à un établissement, dont le
   `property_id` correspond. Insertion seule (upsert `$setOnInsert`) dans
   `integration_outbox`, unique `(event_id, endpoint_id)` → rejouer un
   événement ne crée jamais de doublon. Aucun appel réseau pendant la requête.
3. `OutboxDispatcherService` (`@Cron` toutes les 30 s +
   `POST /api/integration/outbox/dispatch`) réserve les messages dus de façon
   atomique (`pending → delivering`, bail `locked_until` de 2 min + jeton
   `lock_token`), au plus `INTEGRATION_DISPATCH_BATCH_SIZE` par passe,
   5 livraisons simultanées. Résultat :
   - 2xx → `delivered` (purgé après 30 jours, index TTL) ;
   - 410 → `failed` + désactivation du point de terminaison ;
   - URL interdite / secret indéchiffrable / point supprimé ou désactivé → `failed` ;
   - autre erreur → `pending` avec backoff `30 s × 2^(n-1)` (± 20 %, max 6 h),
     ou `dead` après `max_attempts` (8 par défaut).
   `failed` et `dead` se relancent par `POST /api/integration/outbox/:id/retry`.
   Après `INTEGRATION_AUTO_DISABLE_AFTER` (50) échecs consécutifs, le point de
   terminaison est désactivé ; le réactiver (`PATCH is_active: true`) remet le
   compteur à zéro.

### Format d'un webhook sortant

```
POST <url>
Content-Type: application/json
User-Agent: PleasantStay-ESB/1.0
X-PleasantStay-Event: billing.invoice.paid
X-PleasantStay-Delivery: <id du message outbox>   (stable entre les tentatives : clé d'idempotence côté récepteur)
X-PleasantStay-Timestamp: <secondes Unix>
X-PleasantStay-Signature: v1=<hex HMAC-SHA256(secret, "<timestamp>.<corps brut>")>

{ "id", "name", "occurred_at", "organization_id", "property_id", "record", "payload" }
```

Vérification côté récepteur : recalculer le HMAC sur le corps **brut**,
comparer en temps constant, refuser un horodatage à plus de 5 min.

### Sécurité

- Secrets chiffrés au repos (AES-256-GCM, `INTEGRATION_ENCRYPTION_KEY`),
  jamais renvoyés (seulement `secret_hint` + `has_secret`) ; restitués une
  seule fois à la création (si générés) et par `rotate-secret`.
- SSRF : https obligatoire en production, pas d'identifiants dans l'URL, IP
  littérales privées refusées à l'enregistrement, résolution DNS contrôlée à
  chaque livraison (127/8, 10/8, 172.16/12, 192.168/16, 169.254/16, 100.64/10,
  0/8, multicast, ::1, fc00::/7, fe80::/10, IPv4 mappées…), redirections non
  suivies. Limite connue : un rebinding DNS entre le contrôle et la connexion
  reste théoriquement possible (fetch ne permet pas d'épingler l'IP sans
  dépendance supplémentaire).
- En-têtes personnalisés : `Authorization`, `X-PleasantStay-*`, `Content-Type`,
  `Host`, `User-Agent`… sont refusés (les valeurs sont stockées en clair).

## Brancher RabbitMQ (amqplib)

Les points de terminaison `kind: "broker"` publient via le fournisseur
`MESSAGE_BROKER_ADAPTER` (par défaut `LoggingBrokerAdapter`, qui ne fait que
journaliser). Pour RabbitMQ :

1. `npm i amqplib @types/amqplib`
2. Créer `brokers/amqp-broker.adapter.ts` :

```ts
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';
import { MessageBrokerAdapter } from './message-broker.adapter';
import { OutboundEnvelope } from '../integration-bus.types';

const EXCHANGE = 'pleasantstay.events';

@Injectable()
export class AmqpBrokerAdapter implements MessageBrokerAdapter, OnModuleInit, OnModuleDestroy {
  private connection?: amqp.ChannelModel;
  private channel?: amqp.ConfirmChannel;

  async onModuleInit() {
    this.connection = await amqp.connect(process.env.AMQP_URL!);
    this.channel = await this.connection.createConfirmChannel();
    await this.channel.assertExchange(EXCHANGE, 'topic', { durable: true });
  }

  async publish(routingKey: string, envelope: OutboundEnvelope, options?: { messageId?: string; destination?: string }) {
    const channel = this.channel!;
    channel.publish(
      options?.destination || EXCHANGE,
      routingKey, // nom de l'événement (ex. billing.invoice.paid) ou sujet d'automatisation
      Buffer.from(JSON.stringify(envelope)),
      { persistent: true, contentType: 'application/json', messageId: options?.messageId, type: envelope.name },
    );
    await channel.waitForConfirms(); // lève si le courtier refuse → message retenté
  }

  async onModuleDestroy() {
    await this.channel?.close();
    await this.connection?.close();
  }
}
```

3. Dans `integration-bus.module.ts`, remplacer
   `{ provide: MESSAGE_BROKER_ADAPTER, useClass: LoggingBrokerAdapter }` par
   `useClass: AmqpBrokerAdapter`. Les consommateurs lient leurs files à
   l'échange `pleasantstay.events` (topic) avec des clés comme `billing.#`.

Kafka : même principe (topic = `broker_destination` ou `pleasantstay.events`,
clé de message = nom de l'événement, `await producer.send(...)`).

## Entrant : webhooks signés

`POST /api/integration/inbound/:endpointKey` (public, réponse 202).

**Prérequis dans `main.ts`** : `NestFactory.create(AppModule, { rawBody: true })`
afin que `req.rawBody` contienne le corps brut. Sans cela, la route répond
400 (échec fermé).

1. Source active trouvée par sa clé aléatoire et application installée, sinon 404.
2. Signature vérifiée sur le corps brut, en temps constant :
   - `pleasantstay_v1` : même format que nos envois, horodatage dans
     `tolerance_seconds` (300 par défaut) → anti-rejeu ;
   - `hmac_sha256_hex_header` : HMAC hexadécimal du corps dans l'en-tête
     `signature_header` (préfixe optionnel `signature_prefix`, ex. `sha256=`).
   Échec → 401.
3. Journalisation via `WebhookLogService.create` (`signature_verified: true`,
   doublon détecté par `provider + event_id` ; l'identifiant est lu à
   `event_id_path` ou `id`/`event_id`/`transaction_id`/`cpm_trans_id`).
4. Hors doublon, publication différée sur `integration.inbound` :
   `{ source, provider, event_type, event_id, webhook_log_id, payload }`.

## Variables d'environnement

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `INTEGRATION_ENCRYPTION_KEY` | — (obligatoire en production) | Clé AES-256 (32 octets base64 ou hex). Hors production : dérivée de `JWT_SECRET` avec avertissement. Ex. `openssl rand -base64 32` |
| `INTEGRATION_ALLOW_PRIVATE_URLS` | `false` | `true` autorise localhost/IP privées (développement local uniquement) |
| `INTEGRATION_DISPATCH_BATCH_SIZE` | `50` | Messages max par passe |
| `INTEGRATION_AUTO_DISABLE_AFTER` | `50` | Échecs consécutifs avant désactivation automatique |
| `INTEGRATION_DISPATCHER_ENABLED` | `true` | `false` désactive le cron sur cette instance |
| `INTEGRATION_PUBLIC_BASE_URL` | — | Préfixe pour renvoyer `inbound_url` complet (ex. `https://api.pleasantstay.com`) |
