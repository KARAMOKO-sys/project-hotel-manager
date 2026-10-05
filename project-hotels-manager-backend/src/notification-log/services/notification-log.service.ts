import { Injectable } from '@nestjs/common';
import { CreateNotificationLogDto } from '../dto/create-notification-log.dto';
import { UpdateNotificationLogDto } from '../dto/update-notification-log.dto';

@Injectable()
export class NotificationLogService {
  create(createNotificationLogDto: CreateNotificationLogDto) {
    return 'This action adds a new notificationLog';
  }

  findAll() {
    return `This action returns all notificationLog`;
  }

  findOne(id: number) {
    return `This action returns a #${id} notificationLog`;
  }

  update(id: number, updateNotificationLogDto: UpdateNotificationLogDto) {
    return `This action updates a #${id} notificationLog`;
  }

  remove(id: number) {
    return `This action removes a #${id} notificationLog`;
  }
}
