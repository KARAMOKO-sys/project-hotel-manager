import { PartialType, PickType } from '@nestjs/mapped-types';
import { CreateNotificationLogDto } from './create-notification-log.dto';

/**
 * Le statut n'est pas modifiable par la mise à jour générique : utiliser les
 * routes de transition (sent, delivered, read, failed, retry).
 */
export class UpdateNotificationLogDto extends PartialType(
  PickType(CreateNotificationLogDto, [
    'subject',
    'body',
    'provider',
    'max_retries',
    'metadata',
  ] as const),
) {}
