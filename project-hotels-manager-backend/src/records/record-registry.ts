/**
 * Registre des modèles de fiches qui prennent en charge les fonctions
 * transverses : fil de discussion (activity), champs personnalisés (studio)
 * et automatisations.
 *
 * Le registre est volontairement déclaratif : les modules concernés ne sont
 * pas importés, les fiches sont lues directement dans leur collection MongoDB.
 */
export interface RecordModelDefinition {
  /** Nom du modèle Mongoose (identique à `DomainEvent.record.model`). */
  model: string;
  /** Collection MongoDB. */
  collection: string;
  /** Libellé français affiché dans l'interface. */
  label: string;
  /** Application propriétaire (clé du catalogue d'applications). */
  app: string;
  /** Autres noms acceptés (anciens noms, noms de collection…). */
  aliases?: string[];
  /** Faux si la fiche n'a pas de champ `property_id` (ex. clients). */
  property_scoped?: boolean;
}

export const RECORD_REGISTRY: readonly RecordModelDefinition[] = [
  // Hôtellerie
  {
    model: 'Reservation',
    collection: 'reservations',
    label: 'Réservation',
    app: 'front_desk',
  },
  {
    model: 'Guest',
    collection: 'guests',
    label: 'Client',
    app: 'guests',
    property_scoped: false,
  },
  { model: 'Room', collection: 'rooms', label: 'Chambre', app: 'front_desk' },
  {
    model: 'Invoice',
    collection: 'invoices',
    label: 'Facture',
    app: 'billing',
  },
  {
    model: 'Payment',
    collection: 'payments',
    label: 'Paiement',
    app: 'billing',
  },
  {
    model: 'PosTransaction',
    collection: 'pos_transactions',
    label: 'Transaction point de vente',
    app: 'pos',
  },
  {
    model: 'MaintenanceRequest',
    collection: 'maintenance_requests',
    label: 'Demande de maintenance',
    app: 'housekeeping',
  },
  {
    model: 'Housekeeping',
    collection: 'housekeeping_tasks',
    label: 'Tâche de ménage',
    app: 'housekeeping',
    aliases: ['HousekeepingTask'],
  },
  { model: 'Staff', collection: 'staff', label: 'Employé', app: 'staff' },

  // Applications ERP
  {
    model: 'JournalEntry',
    collection: 'journal_entries',
    label: 'Écriture comptable',
    app: 'accounting',
  },
  {
    model: 'Product',
    collection: 'products',
    label: 'Article',
    app: 'inventory',
  },
  {
    model: 'PurchaseOrder',
    collection: 'purchase_orders',
    label: 'Bon de commande',
    app: 'purchase',
  },
  {
    model: 'VendorBill',
    collection: 'vendor_bills',
    label: 'Facture fournisseur',
    app: 'purchase',
  },
  { model: 'Lead', collection: 'crm_leads', label: 'Piste', app: 'crm' },
  {
    model: 'LeaveRequest',
    collection: 'hr_leave_requests',
    label: 'Demande de congé',
    app: 'hr',
  },
  {
    model: 'LoyaltyAccount',
    collection: 'loyalty_accounts',
    label: 'Compte fidélité',
    app: 'loyalty',
  },
];

const LOOKUP = new Map<string, RecordModelDefinition>();
for (const definition of RECORD_REGISTRY) {
  for (const name of [
    definition.model,
    definition.collection,
    ...(definition.aliases ?? []),
  ]) {
    LOOKUP.set(name.toLowerCase(), definition);
  }
}

/**
 * Retrouve un modèle par nom (insensible à la casse), alias ou collection.
 * Retourne `undefined` si le modèle n'est pas dans le registre.
 */
export function findRecordModel(
  name: unknown,
): RecordModelDefinition | undefined {
  if (typeof name !== 'string' || !name.trim()) return undefined;
  return LOOKUP.get(name.trim().toLowerCase());
}

/** Vrai si le modèle est pris en charge. */
export function isRecordModel(name: unknown): boolean {
  return findRecordModel(name) !== undefined;
}

/** Noms canoniques des modèles (pour les validations `@IsIn`). */
export const RECORD_MODEL_NAMES: string[] = RECORD_REGISTRY.map(
  (definition) => definition.model,
);
