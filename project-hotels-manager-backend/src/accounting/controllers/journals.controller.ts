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
import { JournalService } from '../services/journal.service';
import {
  CreateJournalDto,
  JournalQueryDto,
  UpdateJournalDto,
} from '../dto/journal.dto';

@ApiTags('Comptabilité – journaux')
@RequiresApp('accounting')
@Controller('accounting/journals')
export class JournalsController {
  constructor(private readonly journals: JournalService) {}

  @Post()
  create(@Body() dto: CreateJournalDto) {
    return this.journals.create(dto);
  }

  @Get()
  findAll(@Query() query: JournalQueryDto) {
    return this.journals.list(query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.journals.findOne(params.id);
  }

  @Patch(':id')
  update(@Param() params: IdParamDto, @Body() dto: UpdateJournalDto) {
    return this.journals.update(params.id, dto);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.journals.remove(params.id);
  }
}
