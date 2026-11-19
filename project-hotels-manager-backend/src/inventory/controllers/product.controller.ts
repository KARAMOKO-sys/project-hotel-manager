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
import { ProductService } from '../services/product.service';
import { InventoryService } from '../services/inventory.service';
import {
  CreateProductDto,
  ProductQueryDto,
  UpdateProductDto,
} from '../dto/product.dto';

@ApiTags('Stock - Articles')
@RequiresApp('inventory')
@Controller('products')
export class ProductController {
  constructor(
    private readonly products: ProductService,
    private readonly inventory: InventoryService,
  ) {}

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.products.create(dto);
  }

  @Get()
  findAll(@Query() query: ProductQueryDto) {
    return this.products.findAll(query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.products.findOne(params.id);
  }

  /** Quantité disponible tous emplacements internes confondus. */
  @Get(':id/availability')
  async availability(@Param() params: IdParamDto) {
    await this.products.findOne(params.id);
    return {
      product_id: params.id,
      quantity_available: await this.inventory.getAvailableQuantity(params.id),
    };
  }

  @Patch(':id')
  update(@Param() params: IdParamDto, @Body() dto: UpdateProductDto) {
    return this.products.update(params.id, dto);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.products.remove(params.id);
  }
}
