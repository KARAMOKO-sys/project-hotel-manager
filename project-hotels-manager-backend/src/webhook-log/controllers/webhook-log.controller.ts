import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { WebhookLogService } from '../services/webhook-log.service';
import { CreateWebhookLogDto } from '../dto/create-webhook-log.dto';
import { UpdateWebhookLogDto } from '../dto/update-webhook-log.dto';
import {
  IgnoreWebhookDto,
  MarkWebhookFailedDto,
  MarkWebhookProcessedDto,
  VerifySignatureDto,
  WebhookLogQueryDto,
} from '../dto/webhook-log-actions.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { WebhookProvider } from '../schemas/webhook-log.entity';

@Controller('webhook-logs')
export class WebhookLogController {
  constructor(private readonly webhookLogService: WebhookLogService) {}

  @Post()
  create(@Body() createWebhookLogDto: CreateWebhookLogDto) {
    return this.webhookLogService.create(createWebhookLogDto);
  }

  @Get()
  findAll(@Query() query: WebhookLogQueryDto) {
    return this.webhookLogService.findAll(query);
  }

  @Get('stats')
  getStats(
    @Query('provider', new ParseEnumPipe(WebhookProvider, { optional: true }))
    provider?: WebhookProvider,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.webhookLogService.getStats(provider, from, to);
  }

  @Get('retryable')
  findRetryable(@Query('limit') limit?: number) {
    return this.webhookLogService.findRetryable(
      limit ? Number(limit) : undefined,
    );
  }

  @Get('provider/:provider/event/:eventId')
  findByEvent(
    @Param('provider', new ParseEnumPipe(WebhookProvider))
    provider: WebhookProvider,
    @Param('eventId') eventId: string,
  ) {
    return this.webhookLogService.findByEvent(provider, eventId);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.webhookLogService.findOne(params.id);
  }

  @Patch(':id')
  update(
    @Param() params: IdParamDto,
    @Body() updateWebhookLogDto: UpdateWebhookLogDto,
  ) {
    return this.webhookLogService.update(params.id, updateWebhookLogDto);
  }

  @Patch(':id/signature')
  setSignatureVerification(
    @Param() params: IdParamDto,
    @Body() body: VerifySignatureDto,
  ) {
    return this.webhookLogService.setSignatureVerification(
      params.id,
      body.verified,
    );
  }

  @Patch(':id/processing')
  markAsProcessing(@Param() params: IdParamDto) {
    return this.webhookLogService.markAsProcessing(params.id);
  }

  @Patch(':id/processed')
  markAsProcessed(
    @Param() params: IdParamDto,
    @Body() body: MarkWebhookProcessedDto,
  ) {
    return this.webhookLogService.markAsProcessed(params.id, body);
  }

  @Patch(':id/failed')
  markAsFailed(
    @Param() params: IdParamDto,
    @Body() body: MarkWebhookFailedDto,
  ) {
    return this.webhookLogService.markAsFailed(params.id, body.error_message);
  }

  @Patch(':id/ignore')
  markAsIgnored(@Param() params: IdParamDto, @Body() body: IgnoreWebhookDto) {
    return this.webhookLogService.markAsIgnored(params.id, body.reason);
  }

  @Patch(':id/retry')
  retry(@Param() params: IdParamDto) {
    return this.webhookLogService.retry(params.id);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.webhookLogService.remove(params.id);
  }
}
