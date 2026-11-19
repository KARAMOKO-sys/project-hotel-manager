import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RecordsService } from '../services/records.service';

/** Modèles de fiches pris en charge par la discussion, le Studio et les automatisations. */
@ApiTags('Records')
@Controller('records')
export class RecordsController {
  constructor(private readonly records: RecordsService) {}

  @Get('models')
  models() {
    return this.records.listModels();
  }
}
