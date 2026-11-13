import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PosItemService } from '../services/pos-item.service';
import { CreatePosItemDto } from '../dto/create-pos-item.dto';
import { UpdatePosItemDto } from '../dto/update-pos-item.dto';
import { AdjustStockDto, SetStockDto } from '../dto/adjust-stock.dto';
import { PosItemQueryDto } from '../dto/pos-item-query.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { PosCategory } from '../schemas/pos-item.entity';

@Controller('pos-items')
export class PosItemController {
  constructor(private readonly posItemService: PosItemService) {}

  @Post()
  create(@Body() createPosItemDto: CreatePosItemDto) {
    return this.posItemService.create(createPosItemDto);
  }

  @Get()
  findAll(@Query() query: PosItemQueryDto) {
    return this.posItemService.findAll(query);
  }

  @Get('property/:propertyId/catalog')
  getCatalog(
    @Param('propertyId') propertyId: string,
    @Query('category', new ParseEnumPipe(PosCategory, { optional: true }))
    category?: PosCategory,
  ) {
    return this.posItemService.getCatalog(propertyId, category);
  }

  @Get('property/:propertyId/inventory')
  getInventory(@Param('propertyId') propertyId: string) {
    return this.posItemService.getInventory(propertyId);
  }

  @Get('property/:propertyId/low-stock')
  getLowStockItems(@Param('propertyId') propertyId: string) {
    return this.posItemService.getLowStockItems(propertyId);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.posItemService.findOne(params.id);
  }

  @Patch(':id')
  update(
    @Param() params: IdParamDto,
    @Body() updatePosItemDto: UpdatePosItemDto,
  ) {
    return this.posItemService.update(params.id, updatePosItemDto);
  }

  @Patch(':id/stock/adjust')
  adjustStock(@Param() params: IdParamDto, @Body() body: AdjustStockDto) {
    return this.posItemService.adjustStock(params.id, body.delta);
  }

  @Patch(':id/stock')
  setStock(@Param() params: IdParamDto, @Body() body: SetStockDto) {
    return this.posItemService.setStock(params.id, body.quantity);
  }

  @Patch(':id/activate')
  activate(@Param() params: IdParamDto) {
    return this.posItemService.activate(params.id);
  }

  @Patch(':id/deactivate')
  deactivate(@Param() params: IdParamDto) {
    return this.posItemService.deactivate(params.id);
  }

  @Patch(':id/restore')
  restore(@Param() params: IdParamDto) {
    return this.posItemService.restore(params.id);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.posItemService.remove(params.id);
  }
}
