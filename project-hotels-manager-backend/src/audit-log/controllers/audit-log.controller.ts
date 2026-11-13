import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AuditLogService } from '../services/audit-log.service';
import { CreateAuditLogDto } from '../dto/create-audit-log.dto';
import {
  AuditDateRangeQueryDto,
  AuditLogQueryDto,
} from '../dto/audit-log-query.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';

/**
 * Journal d'audit : lecture et ajout uniquement (aucune route de
 * modification ni de suppression).
 */
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Post()
  create(@Body() createAuditLogDto: CreateAuditLogDto) {
    return this.auditLogService.create(createAuditLogDto);
  }

  @Get()
  findAll(@Query() query: AuditLogQueryDto) {
    return this.auditLogService.findAll(query);
  }

  @Get('range')
  findByDateRange(@Query() query: AuditDateRangeQueryDto) {
    return this.auditLogService.findByDateRange(query.from, query.to, query);
  }

  @Get('entity/:entityType/:entityId')
  findByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.auditLogService.findByEntity(entityType, entityId, query);
  }

  @Get('actor/:actorId')
  findByActor(
    @Param('actorId') actorId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.auditLogService.findByActor(actorId, query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.auditLogService.findOne(params.id);
  }
}
