import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InventoryModule } from '../inventory/inventory.module';
import { Vendor, VendorSchema } from './schemas/vendor.entity';
import {
  PurchaseOrder,
  PurchaseOrderSchema,
} from './schemas/purchase-order.entity';
import { VendorBill, VendorBillSchema } from './schemas/vendor-bill.entity';
import {
  PurchaseSettings,
  PurchaseSettingsSchema,
} from './schemas/purchase-settings.entity';
import { VendorService } from './services/vendor.service';
import { PurchaseSettingsService } from './services/purchase-settings.service';
import { PurchaseOrderService } from './services/purchase-order.service';
import { VendorBillService } from './services/vendor-bill.service';
import { PurchaseReportService } from './services/purchase-report.service';
import { StockLowListener } from './listeners/stock-low.listener';
import { VendorController } from './controllers/vendor.controller';
import { PurchaseOrderController } from './controllers/purchase-order.controller';
import { VendorBillController } from './controllers/vendor-bill.controller';
import { PurchaseController } from './controllers/purchase.controller';

/**
 * Application Achats (`purchase`) : fournisseurs, bons de commande avec
 * approbation, réceptions (entrées en stock), factures fournisseurs,
 * réapprovisionnement automatique sur stock bas.
 */
@Module({
  imports: [
    InventoryModule,
    MongooseModule.forFeature([
      { name: Vendor.name, schema: VendorSchema },
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
      { name: VendorBill.name, schema: VendorBillSchema },
      { name: PurchaseSettings.name, schema: PurchaseSettingsSchema },
    ]),
  ],
  controllers: [
    PurchaseController,
    VendorController,
    PurchaseOrderController,
    VendorBillController,
  ],
  providers: [
    VendorService,
    PurchaseSettingsService,
    PurchaseOrderService,
    VendorBillService,
    PurchaseReportService,
    StockLowListener,
  ],
  exports: [VendorService, PurchaseOrderService, VendorBillService],
})
export class PurchaseModule {}
