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
import { RequiresApp } from '../../platform/apps/requires-app.decorator';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { StudioService } from '../services/studio.service';
import {
  CreateCustomFieldDto,
  CustomFieldQueryDto,
  UpdateCustomFieldDto,
} from '../dto/custom-field.dto';

/** Définitions des champs personnalisés (Studio). */
@ApiTags('Studio')
@RequiresApp('studio')
@Controller('studio/fields')
export class StudioFieldsController {
  constructor(private readonly studio: StudioService) {}

  @Post()
  create(@Body() dto: CreateCustomFieldDto) {
    return this.studio.create(dto);
  }

  @Get()
  findAll(@Query() query: CustomFieldQueryDto) {
    return this.studio.findAll(query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.studio.findOne(params.id);
  }

  @Patch(':id')
  update(@Param() params: IdParamDto, @Body() dto: UpdateCustomFieldDto) {
    return this.studio.update(params.id, dto);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.studio.remove(params.id);
  }
}
