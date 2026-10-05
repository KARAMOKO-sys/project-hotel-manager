import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { NotificationLogService } from '../services/notification-log.service';
import { CreateNotificationLogDto } from '../dto/create-notification-log.dto';
import { UpdateNotificationLogDto } from '../dto/update-notification-log.dto';

@Controller('notification-log')
export class NotificationLogController {
  constructor(
    private readonly notificationLogService: NotificationLogService,
  ) {}

  @Post()
  create(@Body() createNotificationLogDto: CreateNotificationLogDto) {
    return this.notificationLogService.create(createNotificationLogDto);
  }

  @Get()
  findAll() {
    return this.notificationLogService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.notificationLogService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateNotificationLogDto: UpdateNotificationLogDto,
  ) {
    return this.notificationLogService.update(+id, updateNotificationLogDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.notificationLogService.remove(+id);
  }
}
