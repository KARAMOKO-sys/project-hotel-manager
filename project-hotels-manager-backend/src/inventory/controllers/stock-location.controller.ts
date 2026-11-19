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
import { StockLocationService } from '../services/stock-location.service';
import {
  CreateStockLocationDto,
  StockLocationQueryDto,
  UpdateStockLocationDto,
} from '../dto/stock-location.dto';

@ApiTags('Stock - Emplacements')
@RequiresApp('inventory')
@Controller('stock-locations')
export class StockLocationController {
  constructor(private readonly locations: StockLocationService) {}

  @Post()
  create(@Body() dto: CreateStockLocationDto) {
    return this.locations.create(dto);
  }

  @Get()
  findAll(@Query() query: StockLocationQueryDto) {
    return this.locations.findAll(query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.locations.findOne(params.id);
  }

  @Patch(':id')
  update(@Param() params: IdParamDto, @Body() dto: UpdateStockLocationDto) {
    return this.locations.update(params.id, dto);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.locations.remove(params.id);
  }
}
