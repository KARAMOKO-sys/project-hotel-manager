import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './schemas/product.entity';
import {
  StockLocation,
  StockLocationSchema,
} from './schemas/stock-location.entity';
import { StockQuant, StockQuantSchema } from './schemas/stock-quant.entity';
import { StockMove, StockMoveSchema } from './schemas/stock-move.entity';
import {
  InventoryCount,
  InventoryCountSchema,
} from './schemas/inventory-count.entity';
import { ProductService } from './services/product.service';
import { StockLocationService } from './services/stock-location.service';
import { StockMoveService } from './services/stock-move.service';
import { InventoryCountService } from './services/inventory-count.service';
import { InventoryService } from './services/inventory.service';
import { CheckoutConsumptionListener } from './listeners/checkout-consumption.listener';
import { ProductController } from './controllers/product.controller';
import { StockLocationController } from './controllers/stock-location.controller';
import { StockMoveController } from './controllers/stock-move.controller';
import { InventoryCountController } from './controllers/inventory-count.controller';
import { InventoryController } from './controllers/inventory.controller';

/**
 * Application Stock (`inventory`) : articles, emplacements, quantités,
 * mouvements, inventaires physiques, consommation au départ des clients.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: StockLocation.name, schema: StockLocationSchema },
      { name: StockQuant.name, schema: StockQuantSchema },
      { name: StockMove.name, schema: StockMoveSchema },
      { name: InventoryCount.name, schema: InventoryCountSchema },
    ]),
  ],
  controllers: [
    InventoryController,
    ProductController,
    StockLocationController,
    StockMoveController,
    InventoryCountController,
  ],
  providers: [
    ProductService,
    StockLocationService,
    StockMoveService,
    InventoryCountService,
    InventoryService,
    CheckoutConsumptionListener,
  ],
  exports: [InventoryService, ProductService, StockMoveService],
})
export class InventoryModule {}
