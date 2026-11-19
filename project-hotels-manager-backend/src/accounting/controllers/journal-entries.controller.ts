import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequiresApp } from '../../platform/apps/requires-app.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { JournalEntryService } from '../services/journal-entry.service';
import {
  CreateJournalEntryDto,
  JournalEntryQueryDto,
  ReverseJournalEntryDto,
  UpdateJournalEntryDto,
} from '../dto/journal-entry.dto';

@ApiTags('Comptabilité – écritures')
@RequiresApp('accounting')
@Controller('accounting/journal-entries')
export class JournalEntriesController {
  constructor(private readonly entries: JournalEntryService) {}

  @Post()
  create(
    @Body() dto: CreateJournalEntryDto,
    @CurrentUser('sub') actorId?: string,
  ) {
    return this.entries.create(dto, actorId);
  }

  @Get()
  findAll(@Query() query: JournalEntryQueryDto) {
    return this.entries.list(query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.entries.findOne(params.id);
  }

  @Patch(':id')
  update(@Param() params: IdParamDto, @Body() dto: UpdateJournalEntryDto) {
    return this.entries.update(params.id, dto);
  }

  /** Valide un brouillon (équilibre, verrouillage, numérotation). */
  @Post(':id/post')
  post(@Param() params: IdParamDto, @CurrentUser('sub') actorId?: string) {
    return this.entries.post(params.id, actorId);
  }

  /** Contre-passe une écriture validée. */
  @Post(':id/reverse')
  reverse(
    @Param() params: IdParamDto,
    @Body() dto: ReverseJournalEntryDto,
    @CurrentUser('sub') actorId?: string,
  ) {
    return this.entries.reverse(params.id, {
      date: dto.date,
      reason: dto.reason,
      actorId,
    });
  }

  /** Annule un brouillon. */
  @Post(':id/cancel')
  cancel(@Param() params: IdParamDto) {
    return this.entries.cancel(params.id);
  }
}
