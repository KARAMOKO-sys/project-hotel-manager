import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { NotificationLogService } from '../services/notification-log.service';
import { CreateNotificationLogDto } from '../dto/create-notification-log.dto';
import { UpdateNotificationLogDto } from '../dto/update-notification-log.dto';
import {
  MarkAsFailedDto,
  MarkAsSentDto,
  NotificationLogQueryDto,
  NotificationStatsQueryDto,
} from '../dto/notification-log-actions.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';

@Controller('notification-logs')
export class NotificationLogController {
  constructor(
    private readonly notificationLogService: NotificationLogService,
  ) {}

  @Post()
  create(@Body() createNotificationLogDto: CreateNotificationLogDto) {
    return this.notificationLogService.create(createNotificationLogDto);
  }

  @Get()
  findAll(@Query() query: NotificationLogQueryDto) {
    return this.notificationLogService.findAll(query);
  }

  @Get('stats')
  getStats(@Query() query: NotificationStatsQueryDto) {
    return this.notificationLogService.getStats(query);
  }

  @Get('pending-retries')
  findPendingRetries(@Query('limit') limit?: number) {
    return this.notificationLogService.findPendingRetries(
      limit ? Number(limit) : undefined,
    );
  }

  @Get('recipient/:recipientId/unread')
  findUnread(@Param('recipientId') recipientId: string) {
    return this.notificationLogService.findUnread(recipientId);
  }

  @Get('recipient/:recipientId')
  findByRecipient(
    @Param('recipientId') recipientId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.notificationLogService.findByRecipient(recipientId, query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.notificationLogService.findOne(params.id);
  }

  @Patch(':id')
  update(
    @Param() params: IdParamDto,
    @Body() updateNotificationLogDto: UpdateNotificationLogDto,
  ) {
    return this.notificationLogService.update(
      params.id,
      updateNotificationLogDto,
    );
  }

  @Patch(':id/sent')
  markAsSent(@Param() params: IdParamDto, @Body() body: MarkAsSentDto) {
    return this.notificationLogService.markAsSent(params.id, body);
  }

  @Patch(':id/delivered')
  markAsDelivered(@Param() params: IdParamDto) {
    return this.notificationLogService.markAsDelivered(params.id);
  }

  @Patch(':id/read')
  markAsRead(@Param() params: IdParamDto) {
    return this.notificationLogService.markAsRead(params.id);
  }

  @Patch(':id/failed')
  markAsFailed(@Param() params: IdParamDto, @Body() body: MarkAsFailedDto) {
    return this.notificationLogService.markAsFailed(
      params.id,
      body.error_message,
    );
  }

  @Patch(':id/retry')
  retry(@Param() params: IdParamDto) {
    return this.notificationLogService.retry(params.id);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.notificationLogService.remove(params.id);
  }
}
