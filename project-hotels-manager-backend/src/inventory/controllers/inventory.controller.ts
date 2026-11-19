import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequiresApp } from '../../platform/apps/requires-app.decorator';
import { InventoryService } from '../services/inventory.service';
import {
  MovesReportQueryDto,
  PropertyQueryDto,
  SetupInventoryDto,
  StockLevelQueryDto,
} from '../dto/product.dto';

/** Configuration et rapports de l'application Stock. */
@ApiTags('Stock')
@RequiresApp('inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  /** Crée les emplacements par défaut (idempotent). */
  @Post('setup')
  setup(@Body() dto: SetupInventoryDto) {
    return this.inventory.setup(dto.property_id);
  }

  @Get('reports/stock-levels')
  stockLevels(@Query() query: StockLevelQueryDto) {
    return this.inventory.getStockLevels(query);
  }

  @Get('reports/valuation')
  valuation(@Query() query: PropertyQueryDto) {
    return this.inventory.getValuation(query.property_id);
  }

  @Get('reports/moves')
  moves(@Query() query: MovesReportQueryDto) {
    return this.inventory.getMovesSummary(
      query.property_id,
      query.from,
      query.to,
      query.product_id,
    );
  }

  @Get('reports/below-reorder')
  belowReorder(@Query() query: PropertyQueryDto) {
    return this.inventory.getProductsBelowReorder(query.property_id);
  }
}
