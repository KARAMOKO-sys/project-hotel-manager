import { PartialType, PickType } from '@nestjs/mapped-types';
import { CreateWebhookLogDto } from './create-webhook-log.dto';

/**
 * La charge utile, la signature et le statut sont immuables via la mise à
 * jour générique (utiliser les routes de traitement dédiées).
 */
export class UpdateWebhookLogDto extends PartialType(
  PickType(CreateWebhookLogDto, [
    'property_id',
    'related_entity_type',
    'related_entity_id',
    'notes',
  ] as const),
) {}
