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
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { StockMoveService } from '../services/stock-move.service';
import {
  CreateStockMoveDto,
  StockMoveQueryDto,
  UpdateStockMoveDto,
} from '../dto/stock-move.dto';

@ApiTags('Stock - Mouvements')
@RequiresApp('inventory')
@Controller('stock-moves')
export class StockMoveController {
  constructor(private readonly moves: StockMoveService) {}

  @Post()
  create(@Body() dto: CreateStockMoveDto, @CurrentUser('sub') actorId: string) {
    return this.moves.create(dto, actorId);
  }

  /** Historique des mouvements (filtres article, emplacement, état, période). */
  @Get()
  findAll(@Query() query: StockMoveQueryDto) {
    return this.moves.findAll(query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.moves.findOne(params.id);
  }

  @Patch(':id')
  update(@Param() params: IdParamDto, @Body() dto: UpdateStockMoveDto) {
    return this.moves.update(params.id, dto);
  }

  @Post(':id/validate')
  validate(@Param() params: IdParamDto, @CurrentUser('sub') actorId: string) {
    return this.moves.validate(params.id, actorId);
  }

  @Post(':id/cancel')
  cancel(@Param() params: IdParamDto) {
    return this.moves.cancel(params.id);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.moves.remove(params.id);
  }
}
