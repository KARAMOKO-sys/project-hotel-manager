import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequiresApp } from '../../platform/apps/requires-app.decorator';
import { StudioService } from '../services/studio.service';
import { StudioScopeQueryDto } from '../dto/custom-field.dto';

/** Schéma des champs personnalisés d'un modèle (moteur de formulaire). */
@ApiTags('Studio')
@RequiresApp('studio')
@Controller('studio/schema')
export class StudioSchemaController {
  constructor(private readonly studio: StudioService) {}

  @Get(':model')
  get(@Param('model') model: string, @Query() scope: StudioScopeQueryDto) {
    return this.studio.getSchema(model, scope);
  }
}
