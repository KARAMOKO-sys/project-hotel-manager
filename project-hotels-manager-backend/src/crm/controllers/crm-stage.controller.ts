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
import { RequiresApp } from '../../platform/apps/requires-app.decorator';
import { CrmStageService } from '../services/crm-stage.service';
import {
  CreateCrmStageDto,
  CrmStageQueryDto,
  UpdateCrmStageDto,
} from '../dto/crm-stage.dto';

@ApiTags('CRM - Étapes')
@RequiresApp('crm')
@Controller('crm/stages')
export class CrmStageController {
  constructor(private readonly service: CrmStageService) {}

  @Post()
  create(@Body() dto: CreateCrmStageDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query() query: CrmStageQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.service.findOne(params.id);
  }

  @Patch(':id')
  update(@Param() params: IdParamDto, @Body() dto: UpdateCrmStageDto) {
    return this.service.update(params.id, dto);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.service.remove(params.id);
  }
}
