import { IsEnum } from 'class-validator';
import { ContactMessageStatus } from '../schemas/contact-message.entity';

/** Seul le statut de traitement d'un message est modifiable. */
export class UpdateContactMessageDto {
  @IsEnum(ContactMessageStatus)
  status!: ContactMessageStatus;
}
