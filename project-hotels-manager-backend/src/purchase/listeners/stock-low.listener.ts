import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DomainEvents } from '../../platform/events/domain-events';
import type { DomainEvent } from '../../platform/events/domain-events';
import { AppsService } from '../../platform/apps/apps.service';
import { TenantScopeService } from '../../platform/tenancy/tenant-scope.service';
import { InventoryService } from '../../inventory/services/inventory.service';
import { reorderQuantity } from '../../inventory/inventory.utils';
import type { StockLowPayload } from '../../inventory/services/stock-move.service';
import { PurchaseOrderService } from '../services/purchase-order.service';
import { PurchaseSettingsService } from '../services/purchase-settings.service';

/**
 * Réapprovisionnement intelligent : sur stock bas, ajoute l'article au
 * brouillon automatique de son fournisseur préféré. Idempotent : une ligne
 * existante pour l'article n'est jamais dupliquée.
 */
@Injectable()
export class StockLowListener {
  private readonly logger = new Logger(StockLowListener.name);

  constructor(
    private readonly orders: PurchaseOrderService,
    private readonly inventory: InventoryService,
    private readonly settings: PurchaseSettingsService,
    private readonly apps: AppsService,
    private readonly tenantScope: TenantScopeService,
  ) {}

  @OnEvent(DomainEvents.STOCK_LOW, { async: true, promisify: true })
  async handle(event: DomainEvent<StockLowPayload>): Promise<void> {
    try {
      const payload = event.payload;
      const propertyId = payload?.property_id ?? event.property_id;
      if (!payload?.product_id || !propertyId) return;
      if (!payload.preferred_vendor_id) return;

      const organizationId =
        event.organization_id ??
        (await this.tenantScope.getOrganizationIdForProperty(propertyId));
      if (
        !organizationId ||
        !(await this.apps.isInstalled(organizationId, 'purchase'))
      ) {
        return;
      }
      if (!(await this.settings.get(propertyId)).auto_reorder) return;

      const product = await this.inventory.findProduct(payload.product_id);
      if (!product || product.is_active === false) return;
      const quantity = reorderQuantity(
        payload.quantity_available,
        payload.reorder_min,
        payload.reorder_max,
      );
      const result = await this.orders.addReorderLine(
        { ...payload, property_id: propertyId },
        payload.preferred_vendor_id,
        quantity,
        product.cost_price ?? 0,
      );
      this.logger.log(
        `Stock bas « ${payload.product_name} » : ${result.outcome}${
          result.order ? ` (${result.order.number})` : ''
        }`,
      );
    } catch (error) {
      this.logger.error(
        `Réapprovisionnement automatique impossible : ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
