/**
 * Initialisation de la base MongoDB PleasantStay (idempotent).
 *
 *   npm run seed
 *
 * 1. Crée toutes les collections et leurs index (tous les modèles enregistrés).
 * 2. Crée ou met à jour les rôles système et leurs permissions.
 * 3. Crée le super-administrateur (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD ;
 *    sans mot de passe fourni, un mot de passe aléatoire est généré et affiché
 *    une seule fois).
 * 4. Crée une organisation et un hôtel de démonstration (types de chambre,
 *    chambres) — désactivable avec SEED_DEMO=false.
 * 5. Installe les applications ERP pour l'organisation de démonstration et
 *    lance leur paramétrage initial.
 * 6. Crée un compte de démonstration par profil (propriétaire, directeur,
 *    réception, gouvernance, comptable, client) — voir seed-users.ts.
 *
 * Relancer le script ne crée pas de doublon.
 */
import 'reflect-metadata';
import { randomBytes } from 'crypto';
import { NestFactory } from '@nestjs/core';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { AppModule } from '../app.module';
import { AppsService } from '../platform/apps/apps.service';
import { AdminsService } from '../admins/services/admins.service';
import { RoleLevel } from '../role/schemas/role.schema';
import { runErpSetup } from './seed-erp';
import { ensureDemoUsers } from './seed-users';

const log = (message: string) => console.log(`[seed] ${message}`);

/**
 * Ressources (préfixe de route) de chaque application ERP. Une permission
 * porte sur une ressource exacte : `accounting:*` ne couvre pas
 * `accounting-accounts`, d'où cette table.
 */
const APP_RESOURCES: Record<string, string[]> = {
  accounting: [
    'accounting',
    'accounting-accounts',
    'accounting-journal-entries',
    'accounting-journals',
    'accounting-reports',
    'accounting-settings',
  ],
  inventory: [
    'inventory',
    'inventory-counts',
    'products',
    'stock-locations',
    'stock-moves',
  ],
  purchase: [
    'purchase',
    'purchase-orders',
    'purchase-settings',
    'vendor-bills',
    'vendors',
  ],
  hr: [
    'hr-attendance',
    'hr-contracts',
    'hr-departments',
    'hr-leave-allocations',
    'hr-leave-types',
    'hr-leaves',
    'hr-settings',
    'hr-shifts',
  ],
  crm: ['crm', 'crm-corporate-accounts', 'crm-leads', 'crm-stages'],
  loyalty: ['loyalty-accounts', 'loyalty-programs'],
  records: ['records'],
  activity: ['activity'],
  studio: ['studio-fields', 'studio-schema', 'studio-values'],
  automation: ['automation-catalog', 'automation-rules', 'automation-runs'],
};
/** Toutes les actions sur les ressources des applications données. */
const fullAccess = (...apps: string[]) =>
  apps.flatMap((app) => APP_RESOURCES[app].map((r) => `${r}:*`));
/** Lecture seule (`ressource:read`) sur les ressources des applications. */
const readAccess = (...apps: string[]) =>
  apps.flatMap((app) => APP_RESOURCES[app].map((r) => `${r}:read`));

/** Rôles système et permissions (`ressource:action`, jokers `*`). */
const SELF_SERVICE = [
  'auth:*',
  'sessions:*',
  'user-roles:me',
  'user-roles:read:self',
  'apps:read',
];
const ROLES: Array<{
  code: string;
  name: string;
  role_level: RoleLevel;
  permissions: string[];
  description: string;
}> = [
  {
    code: 'super_admin',
    name: 'Super administrateur',
    role_level: RoleLevel.SYSTEM,
    permissions: ['*'],
    description: 'Accès complet à la plateforme.',
  },
  {
    code: 'owner',
    name: 'Propriétaire',
    role_level: RoleLevel.ADMIN,
    permissions: ['*'],
    description:
      'Gère ses organisations et établissements, installe les applications.',
  },
  {
    code: 'manager',
    name: 'Directeur d’hôtel',
    role_level: RoleLevel.MANAGEMENT,
    permissions: [
      ...SELF_SERVICE,
      'properties:*',
      'room-types:*',
      'rooms:*',
      'reservations:*',
      'reservation-rooms:*',
      'waitlist:*',
      'blocked-dates:*',
      'guests:*',
      'guest-requests:*',
      'guest-preferences:*',
      'housekeeping:*',
      'maintenance-requests:*',
      'invoices:*',
      'invoice-items:*',
      'payments:*',
      'pos-items:*',
      'pos-transactions:*',
      'rate-plans:*',
      'daily-prices:*',
      'dynamic-pricing-rules:*',
      'tax-rates:*',
      'kpis:*',
      'reports:*',
      'staff:*',
      ...fullAccess(
        'accounting',
        'inventory',
        'purchase',
        'hr',
        'crm',
        'loyalty',
        'activity',
        'studio',
        'automation',
        'records',
      ),
    ],
    description: 'Pilote un établissement et ses applications.',
  },
  {
    code: 'receptionist',
    name: 'Réceptionniste',
    role_level: RoleLevel.STAFF,
    permissions: [
      ...SELF_SERVICE,
      'reservations:*',
      'reservation-rooms:*',
      'waitlist:*',
      'rooms:read',
      'room-types:read',
      'guests:*',
      'guest-requests:*',
      'guest-preferences:*',
      'invoices:*',
      'invoice-items:*',
      'payments:create',
      'payments:read',
      'pos-transactions:*',
      'pos-items:read',
      'properties:read',
      'room-types:read',
      ...readAccess('loyalty', 'crm', 'records'),
      ...fullAccess('activity'),
    ],
    description: 'Réservations, arrivées, départs, encaissements.',
  },
  {
    code: 'housekeeping',
    name: 'Gouvernance',
    role_level: RoleLevel.STAFF,
    permissions: [
      ...SELF_SERVICE,
      'housekeeping:*',
      'maintenance-requests:*',
      'rooms:read',
      'guest-requests:read',
      'properties:read',
      ...readAccess('inventory', 'records'),
      ...fullAccess('activity'),
    ],
    description: 'Ménage, maintenance, consommables.',
  },
  {
    code: 'accountant',
    name: 'Comptable',
    role_level: RoleLevel.STAFF,
    permissions: [
      ...SELF_SERVICE,
      'invoices:*',
      'invoice-items:*',
      'payments:*',
      'tax-rates:*',
      'vendor-bills:*',
      'reports:*',
      'kpis:read',
      'properties:read',
      ...fullAccess('accounting', 'activity'),
      ...readAccess('purchase', 'records'),
    ],
    description: 'Comptabilité, facturation, paiements, factures fournisseurs.',
  },
  {
    code: 'guest',
    name: 'Client',
    role_level: RoleLevel.EXTERNAL,
    permissions: [...SELF_SERVICE],
    description: 'Rôle attribué automatiquement aux clients inscrits.',
  },
  {
    code: 'partner',
    name: 'Partenaire',
    role_level: RoleLevel.EXTERNAL,
    permissions: [...SELF_SERVICE],
    description: 'Agences et apporteurs d’affaires.',
  },
];

async function ensureCollections(connection: Connection) {
  const existing = new Set(
    (
      await connection.db!.listCollections({}, { nameOnly: true }).toArray()
    ).map((collection) => collection.name),
  );
  let created = 0;
  for (const name of connection.modelNames()) {
    const model = connection.model(name);
    if (!existing.has(model.collection.collectionName)) {
      await model.createCollection();
      created++;
    }
    // Aligne les index de la base sur le schéma (supprime les index obsolètes).
    await model.syncIndexes();
  }
  log(
    `${connection.modelNames().length} modèles : collections et index à jour (${created} nouvelles collections)`,
  );
}

async function ensureRoles(connection: Connection) {
  const roles = connection.collection('roles');
  for (const role of ROLES) {
    await roles.updateOne(
      { code: role.code },
      {
        $set: {
          name: role.name,
          role_level: role.role_level,
          permissions: role.permissions,
          description: role.description,
          is_system: true,
          is_active: true,
          is_deleted: false,
          updated_at: new Date(),
        },
        $setOnInsert: { created_at: new Date() },
      },
      { upsert: true },
    );
  }
  log(`${ROLES.length} rôles système à jour`);
}

async function ensureSuperAdmin(connection: Connection, admins: AdminsService) {
  const email = (process.env.SEED_ADMIN_EMAIL ?? 'admin@pleasantstay.local')
    .toLowerCase()
    .trim();
  const existing = await connection
    .collection('super_admins')
    .findOne({ email });
  if (existing) {
    log(`Super-administrateur déjà présent : ${email}`);
    return;
  }
  const provided = process.env.SEED_ADMIN_PASSWORD;
  const password = provided ?? `Ps-${randomBytes(9).toString('base64url')}9a`;
  await admins.create({
    email,
    password,
    first_name: 'Super',
    last_name: 'Administrateur',
  } as never);
  log(`Super-administrateur créé : ${email}`);
  if (!provided) {
    log(
      `Mot de passe généré (à changer après la première connexion) : ${password}`,
    );
  }
}

async function upsertByCode(
  connection: Connection,
  collection: string,
  filter: Record<string, unknown>,
  doc: Record<string, unknown>,
): Promise<Types.ObjectId> {
  const now = new Date();
  const result = await connection.collection(collection).findOneAndUpdate(
    filter,
    {
      $setOnInsert: {
        ...filter,
        ...doc,
        is_deleted: false,
        created_at: now,
        updated_at: now,
      },
    },
    { upsert: true, returnDocument: 'after' },
  );
  return result!._id as Types.ObjectId;
}

async function ensureDemoHotel(connection: Connection) {
  const organizationId = await upsertByCode(
    connection,
    'organizations',
    { code: 'PLEASANTSTAY-DEMO' },
    {
      name: 'PleasantStay Démo',
      type: 'independent',
      status: 'active',
      is_active: true,
      settings: {
        currency: 'XOF',
        timezone: 'Africa/Abidjan',
        locale: 'fr-CI',
      },
      members: [],
      address: { city: 'Abidjan', country: 'Côte d’Ivoire' },
      contact: { email: 'contact@pleasantstay.local' },
    },
  );
  const propertyId = await upsertByCode(
    connection,
    'properties',
    { code: 'PS-ABJ' },
    {
      organization_id: organizationId,
      name: 'Hôtel PleasantStay Abidjan',
      type: 'hotel',
      status: 'active',
      is_active: true,
      star_rating: 4,
      check_in_time: '14:00',
      check_out_time: '12:00',
      amenities: [
        'wifi',
        'piscine',
        'restaurant',
        'bar',
        'parking',
        'climatisation',
      ],
      address: {
        street: 'Boulevard Valéry Giscard d’Estaing',
        city: 'Abidjan',
        country: 'Côte d’Ivoire',
      },
      contact: {
        email: 'abidjan@pleasantstay.local',
        phone: '+225 27 00 00 00 00',
      },
      settings: {},
    },
  );

  const roomTypes = [
    {
      code: 'STD',
      name: 'Chambre Standard',
      price: 45000,
      adults: 2,
      rooms: ['101', '102', '103', '104', '105', '106'],
      floor: 1,
    },
    {
      code: 'SUP',
      name: 'Chambre Supérieure',
      price: 65000,
      adults: 2,
      rooms: ['201', '202', '203', '204'],
      floor: 2,
    },
    {
      code: 'STE',
      name: 'Suite Lagune',
      price: 120000,
      adults: 3,
      rooms: ['301', '302'],
      floor: 3,
    },
  ];
  let roomCount = 0;
  for (const type of roomTypes) {
    const roomTypeId = await upsertByCode(
      connection,
      'room_types',
      { property_id: propertyId, code: type.code },
      {
        name: type.name,
        base_price: { amount: type.price, currency: 'XOF' },
        capacity_adults: type.adults,
        capacity_children: 1,
        total_rooms: type.rooms.length,
        is_active: true,
      },
    );
    for (const number of type.rooms) {
      await upsertByCode(
        connection,
        'rooms',
        { property_id: propertyId, number },
        {
          room_type_id: roomTypeId,
          floor: type.floor,
          status: 'clean',
          max_occupancy: type.adults + 1,
          is_active: true,
        },
      );
      roomCount++;
    }
  }
  log(
    `Hôtel de démonstration prêt : 3 types de chambre, ${roomCount} chambres`,
  );
  return {
    organizationId: String(organizationId),
    propertyId: String(propertyId),
  };
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const connection = app.get<Connection>(getConnectionToken());
    log(`Base : ${connection.name} (${connection.host}:${connection.port})`);

    await ensureCollections(connection);
    await ensureRoles(connection);
    await ensureSuperAdmin(connection, app.get(AdminsService));

    if (process.env.SEED_DEMO !== 'false') {
      const demo = await ensureDemoHotel(connection);
      const apps = app.get(AppsService);
      for (const key of [
        'accounting',
        'purchase',
        'hr',
        'crm',
        'loyalty',
        'activity',
        'studio',
        'automation',
        'integration_bus',
      ]) {
        await apps.install(demo.organizationId, key, 'seed');
      }
      log(
        `Applications installées : ${[...(await apps.getInstalledKeys(demo.organizationId))].join(', ')}`,
      );
      await runErpSetup(app, demo, log);
      await ensureDemoUsers(app, demo, log);
    }
    log('Terminé.');
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error('[seed] Échec :', error);
  process.exit(1);
});

export type { Model };
