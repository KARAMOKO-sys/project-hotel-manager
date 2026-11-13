import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import {
  ContactMessage,
  ContactMessageDocument,
} from '../schemas/contact-message.entity';
import { CreateContactMessageDto } from '../dto/create-contact-message.dto';
import { UpdateContactMessageDto } from '../dto/update-contact-message.dto';

/** Service des messages reçus via le formulaire de contact public. */
@Injectable()
export class ContactMessageService extends BaseCrudService<
  ContactMessage,
  CreateContactMessageDto,
  UpdateContactMessageDto
> {
  constructor(
    @InjectModel(ContactMessage.name)
    model: Model<ContactMessageDocument>,
  ) {
    super(model, ContactMessage.name);
  }
}
