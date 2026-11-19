import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequiresApp } from '../../platform/apps/requires-app.decorator';
import { buildAutomationCatalog } from '../automation-catalog';

/** Catalogue (événements, opérateurs, actions) pour l'éditeur de règles. */
@ApiTags('Automation')
@RequiresApp('automation')
@Controller('automation/catalog')
export class AutomationCatalogController {
  @Get()
  catalog() {
    return buildAutomationCatalog();
  }
}
