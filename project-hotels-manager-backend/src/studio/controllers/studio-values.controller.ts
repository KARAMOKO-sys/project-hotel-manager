import { Body, Controller, Get, Param, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequiresApp } from '../../platform/apps/requires-app.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RecordParamsDto } from '../../records/dto/record-params.dto';
import { StudioService } from '../services/studio.service';
import {
  PutCustomValuesDto,
  StudioScopeQueryDto,
} from '../dto/custom-field.dto';

/** Valeurs des champs personnalisés d'une fiche. */
@ApiTags('Studio')
@RequiresApp('studio')
@Controller('studio/values')
export class StudioValuesController {
  constructor(private readonly studio: StudioService) {}

  @Get(':model/:id')
  get(@Param() params: RecordParamsDto, @Query() scope: StudioScopeQueryDto) {
    return this.studio.getValues(params.model, params.id, scope);
  }

  @Put(':model/:id')
  put(
    @Param() params: RecordParamsDto,
    @Body() dto: PutCustomValuesDto,
    @CurrentUser('sub') userId: string | undefined,
  ) {
    return this.studio.putValues(params.model, params.id, dto, userId);
  }
}
