import { INestApplicationContext } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { AccountingSettingsService } from '../accounting/services/accounting-settings.service';
import { StockLocationService } from '../inventory/services/stock-location.service';
import { ProductService } from '../inventory/services/product.service';
import { VendorService } from '../purchase/services/vendor.service';
import { CrmStageService } from '../crm/services/crm-stage.service';
import { LeaveTypeService } from '../hr/services/leave-type.service';
import { LoyaltyProgramService } from '../loyalty/services/loyalty-program.service';

/**
 * Paramétrage initial des applications ERP pour l'établissement de
 * démonstration. Chaque étape est idempotente : elle passe par les services
 * métier (validations, numérotation) et ne crée rien qui existe déjà.
 */
export async function runErpSetup(
  app: INestApplicationContext,
  demo: { organizationId: string; propertyId: string },
  log: (message: string) => void,
): Promise<void> {
  const connection = app.get<Connection>(getConnectionToken());
  const propertyId = demo.propertyId;
  const property = new Types.ObjectId(propertyId);
  const exists = async (collection: string, filter: Record<string, unknown>) =>
    (await connection
      .collection(collection)
      .countDocuments({
        property_id: property,
        is_deleted: { $ne: true },
        ...filter,
      })) > 0;

  // Comptabilité : plan comptable SYSCOHADA, journaux, paramètres.
  await app.get(AccountingSettingsService).setup(propertyId);
  log(
    `Comptabilité : ${await connection.collection('accounting_accounts').countDocuments({ property_id: property })} comptes, ` +
      `${await connection.collection('accounting_journals').countDocuments({ property_id: property })} journaux`,
  );

  // Stock : emplacements par défaut.
  const locations = await app.get(StockLocationService).setup(propertyId);
  log(`Stock : ${locations.length} emplacements`);

  // Achats : un fournisseur de démonstration.
  const vendors = app.get(VendorService);
  let vendorId: string | undefined;
  const existingVendor = await connection
    .collection('vendors')
    .findOne({ property_id: property, name: 'Distri-Hôtel Côte d’Ivoire' });
  if (existingVendor) {
    vendorId = String(existingVendor._id);
  } else {
    const vendor = await vendors.create({
      property_id: propertyId,
      name: 'Distri-Hôtel Côte d’Ivoire',
      contact: {
        email: 'commandes@distri-hotel.local',
        phone: '+225 07 00 00 00 00',
      },
      payment_term_days: 30,
    } as never);
    vendorId = String((vendor as unknown as { _id: unknown })._id);
  }

  // Stock : articles courants (kits d'accueil consommés à chaque départ).
  const products = app.get(ProductService);
  const catalogue = [
    {
      sku: 'KIT-ACC',
      name: 'Kit d’accueil (savon, shampoing, gel)',
      category: 'amenities',
      cost_price: 1500,
      consumed_per_checkout: 1,
      reorder_min: 50,
      reorder_max: 300,
    },
    {
      sku: 'EAU-150',
      name: 'Eau minérale 1,5 L',
      category: 'beverage',
      cost_price: 350,
      sale_price: 1000,
      reorder_min: 48,
      reorder_max: 240,
    },
    {
      sku: 'SERV-BLC',
      name: 'Serviette de bain blanche',
      category: 'linen',
      cost_price: 6500,
      reorder_min: 20,
      reorder_max: 80,
    },
    {
      sku: 'DET-5L',
      name: 'Détergent multi-surfaces 5 L',
      category: 'cleaning',
      cost_price: 7500,
      reorder_min: 5,
      reorder_max: 20,
    },
  ];
  let createdProducts = 0;
  for (const item of catalogue) {
    if (await exists('products', { sku: item.sku })) continue;
    await products.create({
      property_id: propertyId,
      ...item,
      product_type: 'stockable',
      uom: 'unit',
      preferred_vendor_id: vendorId,
    } as never);
    createdProducts++;
  }
  log(
    `Stock : ${createdProducts} articles créés (${catalogue.length} au catalogue)`,
  );

  // CRM : étapes du pipeline.
  await app.get(CrmStageService).setup(propertyId);
  log('CRM : étapes du pipeline prêtes');

  // RH : types de congés.
  const leaveTypes = app.get(LeaveTypeService);
  const types = [
    {
      code: 'CP',
      name: 'Congés payés',
      paid: true,
      annual_allocation_days: 26,
      requires_allocation: true,
    },
    {
      code: 'MAL',
      name: 'Congé maladie',
      paid: true,
      annual_allocation_days: 0,
      requires_allocation: false,
    },
    {
      code: 'SS',
      name: 'Congé sans solde',
      paid: false,
      annual_allocation_days: 0,
      requires_allocation: false,
    },
    {
      code: 'MAT',
      name: 'Congé de maternité',
      paid: true,
      annual_allocation_days: 0,
      requires_allocation: false,
    },
  ];
  let createdTypes = 0;
  for (const type of types) {
    if (await exists('hr_leave_types', { code: type.code })) continue;
    await leaveTypes.create({
      property_id: propertyId,
      requires_approval: true,
      ...type,
    } as never);
    createdTypes++;
  }
  log(`RH : ${createdTypes} types de congés créés`);

  // Fidélité : programme de l'établissement.
  if (!(await exists('loyalty_programs', {}))) {
    await app.get(LoyaltyProgramService).create({
      property_id: propertyId,
      name: 'PleasantStay Rewards',
      currency: 'XOF',
      earn_unit_amount: 1000,
      points_per_unit: 1,
      point_value: 10,
      min_redeem_points: 500,
      points_expiry_months: 24,
      earn_on_reservation: true,
      earn_on_pos: true,
    } as never);
    log('Fidélité : programme « PleasantStay Rewards » créé');
  }
}
