import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InventoryService } from '../../inventory/services/inventory.service';
import { reorderQuantity } from '../../inventory/inventory.utils';
import { PurchaseOrder } from '../schemas/purchase-order.entity';
import { VendorBill } from '../schemas/vendor-bill.entity';
import {
  PurchaseOrderState,
  roundMoney,
  VendorBillState,
} from '../purchase.utils';
import { VendorService } from './vendor.service';
import { PurchaseOrderService } from './purchase-order.service';

const ENGAGED_STATES = [
  PurchaseOrderState.CONFIRMED,
  PurchaseOrderState.PARTIALLY_RECEIVED,
  PurchaseOrderState.RECEIVED,
];

const DAY_MS = 86_400_000;

/** Rapports d'achats et suggestions de réapprovisionnement. */
@Injectable()
export class PurchaseReportService {
  constructor(
    @InjectModel(PurchaseOrder.name)
    private readonly orderModel: Model<PurchaseOrder>,
    @InjectModel(VendorBill.name) private readonly billModel: Model<VendorBill>,
    private readonly vendors: VendorService,
    private readonly orders: PurchaseOrderService,
    private readonly inventory: InventoryService,
  ) {}

  /**
   * Articles sous le seuil minimum avec la quantité à commander, déduction
   * faite des quantités déjà en commande.
   */
  async reorderSuggestions(propertyId: string) {
    const [below, incoming] = await Promise.all([
      this.inventory.getProductsBelowReorder(propertyId),
      this.orders.incomingByProduct(propertyId),
    ]);
    const names = await this.vendors.namesById(
      below.map((r) => r.preferred_vendor_id).filter((v): v is string => !!v),
    );
    return below.map((row) => {
      const onOrder = incoming.get(row.product_id) ?? 0;
      const qty = reorderQuantity(
        row.quantity_available,
        row.reorder_min,
        row.reorder_max,
        onOrder,
      );
      return {
        ...row,
        quantity_on_order: onOrder,
        suggested_qty: qty,
        estimated_amount: roundMoney(qty * row.cost_price),
        vendor_name: row.preferred_vendor_id
          ? (names.get(row.preferred_vendor_id) ?? null)
          : null,
      };
    });
  }

  /** Achats confirmés par fournisseur sur une période. */
  async purchasesByVendor(propertyId: string, from?: Date, to?: Date) {
    const match: Record<string, unknown> = {
      property_id: new Types.ObjectId(propertyId),
      state: { $in: ENGAGED_STATES },
      is_deleted: { $ne: true },
    };
    if (from || to) {
      const range: Record<string, Date> = {};
      if (from) range.$gte = from;
      if (to) range.$lte = to;
      match.order_date = range;
    }
    const rows = (await this.orderModel
      .aggregate([
        { $match: match },
        {
          $group: {
            _id: { vendor_id: '$vendor_id', currency: '$currency' },
            orders: { $sum: 1 },
            amount_untaxed: { $sum: '$amount_untaxed' },
            amount_tax: { $sum: '$amount_tax' },
            amount_total: { $sum: '$amount_total' },
          },
        },
        { $sort: { amount_total: -1 } },
      ])
      .exec()) as Array<{
      _id: { vendor_id: Types.ObjectId; currency: string };
      orders: number;
      amount_untaxed: number;
      amount_tax: number;
      amount_total: number;
    }>;
    const names = await this.vendors.namesById(
      rows.map((r) => r._id.vendor_id),
    );
    return rows.map((row) => ({
      vendor_id: String(row._id.vendor_id),
      vendor_name: names.get(String(row._id.vendor_id)) ?? '',
      currency: row._id.currency,
      orders: row.orders,
      amount_untaxed: roundMoney(row.amount_untaxed),
      amount_tax: roundMoney(row.amount_tax),
      amount_total: roundMoney(row.amount_total),
    }));
  }

  /** Commandes en cours (envoyées, à approuver, confirmées, partiellement reçues). */
  async openOrders(propertyId: string) {
    const orders = (await this.orderModel
      .find({
        property_id: new Types.ObjectId(propertyId),
        state: {
          $in: [
            PurchaseOrderState.SENT,
            PurchaseOrderState.TO_APPROVE,
            PurchaseOrderState.CONFIRMED,
            PurchaseOrderState.PARTIALLY_RECEIVED,
          ],
        },
        is_deleted: { $ne: true },
      })
      .sort({ expected_date: 1, order_date: 1 })
      .lean()
      .exec()) as unknown as PurchaseOrder[];
    const names = await this.vendors.namesById(orders.map((o) => o.vendor_id));
    const now = Date.now();
    return orders.map((order) => {
      const remaining = order.lines.reduce((sum, line) => {
        const left = Math.max(0, line.quantity - (line.received_qty ?? 0));
        return (
          sum +
          (line.quantity > 0 ? (line.amount_total * left) / line.quantity : 0)
        );
      }, 0);
      return {
        _id: String(order._id),
        number: order.number,
        vendor_id: String(order.vendor_id),
        vendor_name: names.get(String(order.vendor_id)) ?? '',
        state: order.state,
        billing_status: order.billing_status,
        order_date: order.order_date,
        expected_date: order.expected_date ?? null,
        is_late:
          !!order.expected_date &&
          new Date(order.expected_date).getTime() < now,
        currency: order.currency,
        amount_total: order.amount_total,
        amount_to_receive: roundMoney(remaining),
      };
    });
  }

  /** Factures comptabilisées non payées, par échéance. */
  async billsDue(propertyId: string, until?: Date) {
    const match: Record<string, unknown> = {
      property_id: new Types.ObjectId(propertyId),
      state: VendorBillState.POSTED,
      is_deleted: { $ne: true },
    };
    if (until) match.due_date = { $lte: until };
    const bills = (await this.billModel
      .find(match)
      .sort({ due_date: 1 })
      .lean()
      .exec()) as unknown as VendorBill[];
    const names = await this.vendors.namesById(bills.map((b) => b.vendor_id));
    const today = Date.now();
    const rows = bills.map((bill) => {
      const due = new Date(bill.due_date).getTime();
      return {
        _id: String(bill._id),
        number: bill.number,
        vendor_reference: bill.vendor_reference ?? null,
        vendor_id: String(bill.vendor_id),
        vendor_name: names.get(String(bill.vendor_id)) ?? '',
        bill_date: bill.bill_date,
        due_date: bill.due_date,
        days_overdue: due < today ? Math.floor((today - due) / DAY_MS) : 0,
        currency: bill.currency,
        amount_total: bill.amount_total,
      };
    });
    return {
      total_due: roundMoney(rows.reduce((s, r) => s + r.amount_total, 0)),
      total_overdue: roundMoney(
        rows
          .filter((r) => r.days_overdue > 0)
          .reduce((s, r) => s + r.amount_total, 0),
      ),
      bills: rows,
    };
  }
}
