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
import { ApiTags } from '@nestjs/swagger';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RequiresApp } from '../../platform/apps/requires-app.decorator';
import { LeadService } from '../services/lead.service';
import {
  ConvertLeadDto,
  CreateLeadDto,
  LeadQueryDto,
  LoseLeadDto,
  MoveLeadDto,
  PipelineQueryDto,
  UpdateLeadDto,
} from '../dto/lead.dto';

@ApiTags('CRM - Pistes')
@RequiresApp('crm')
@Controller('crm/leads')
export class LeadController {
  constructor(private readonly service: LeadService) {}

  @Post()
  create(@Body() dto: CreateLeadDto, @CurrentUser('sub') actorId?: string) {
    return this.service.create(dto, actorId);
  }

  @Get()
  findAll(@Query() query: LeadQueryDto) {
    return this.service.findAll(query);
  }

  /** Pipeline : par étape, revenu pondéré, taux de transformation, prévision. */
  @Get('pipeline')
  pipeline(@Query() query: PipelineQueryDto) {
    return this.service.pipeline(query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.service.findOne(params.id);
  }

  @Patch(':id')
  update(@Param() params: IdParamDto, @Body() dto: UpdateLeadDto) {
    return this.service.update(params.id, dto);
  }

  @Post(':id/convert')
  convert(@Param() params: IdParamDto, @Body() dto: ConvertLeadDto) {
    return this.service.convert(params.id, dto);
  }

  @Post(':id/move')
  move(
    @Param() params: IdParamDto,
    @Body() dto: MoveLeadDto,
    @CurrentUser('sub') actorId?: string,
  ) {
    return this.service.move(params.id, dto, actorId);
  }

  @Post(':id/win')
  win(@Param() params: IdParamDto, @CurrentUser('sub') actorId?: string) {
    return this.service.win(params.id, actorId);
  }

  @Post(':id/lose')
  lose(
    @Param() params: IdParamDto,
    @Body() dto: LoseLeadDto,
    @CurrentUser('sub') actorId?: string,
  ) {
    return this.service.lose(params.id, dto, actorId);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.service.remove(params.id);
  }
}
