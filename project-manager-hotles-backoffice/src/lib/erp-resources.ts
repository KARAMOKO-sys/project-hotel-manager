// src/lib/erp-resources.ts
// Ressources des applications ERP (comptabilité, stock, achats, RH, CRM,
// fidélité, studio, automatisations, intégrations). Les noms de champs et les
// valeurs d'énumération suivent les DTO du backend (src/<app>/dto).

import type { Entity } from "./types";
import type {
  BadgeTone,
  ResourceColumn,
  ResourceConfig,
  ResourceField,
  ResourceRowAction,
} from "./resources";

/* ------------------------------------------------------------------ */
/* Sections du menu                                                    */
/* ------------------------------------------------------------------ */

export interface MenuGroupDefinition {
  label: string;
  icon: string;
  /** Application ERP correspondante (clé du catalogue backend). */
  app?: string;
}

/** Ordre et icônes des sections du menu latéral. */
export const MENU_GROUPS: MenuGroupDefinition[] = [
  { label: "Hôtellerie", icon: "pi pi-building" },
  { label: "Comptabilité", icon: "pi pi-calculator", app: "accounting" },
  { label: "Stock", icon: "pi pi-box", app: "inventory" },
  { label: "Achats", icon: "pi pi-shopping-bag", app: "purchase" },
  { label: "Ressources humaines", icon: "pi pi-id-card", app: "hr" },
  { label: "CRM", icon: "pi pi-briefcase", app: "crm" },
  { label: "Fidélité", icon: "pi pi-star", app: "loyalty" },
  { label: "Studio", icon: "pi pi-palette", app: "studio" },
  { label: "Automatisations", icon: "pi pi-bolt", app: "automation" },
  { label: "Intégrations", icon: "pi pi-sitemap", app: "integration_bus" },
];

/** Pages dédiées (hors CRUD générique) rattachées à une section. */
export interface ExtraPage {
  key: string;
  title: string;
  icon: string;
  group: string;
  app?: string;
}

export const EXTRA_PAGES: ExtraPage[] = [
  {
    key: "accounting-reports",
    title: "États comptables",
    icon: "pi pi-chart-bar",
    group: "Comptabilité",
    app: "accounting",
  },
  {
    key: "crm-pipeline",
    title: "Pipeline",
    icon: "pi pi-th-large",
    group: "CRM",
    app: "crm",
  },
];

/* ------------------------------------------------------------------ */
/* Aides                                                               */
/* ------------------------------------------------------------------ */

const opts = (labels: Record<string, string>) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

const CURRENCIES: Record<string, string> = {
  XOF: "XOF (franc CFA)",
  EUR: "EUR",
  USD: "USD",
  GBP: "GBP",
  CAD: "CAD",
  CHF: "CHF",
};

const currencyField: ResourceField = {
  key: "currency",
  label: "Devise",
  type: "select",
  options: opts(CURRENCIES),
};

const activeField: ResourceField = {
  key: "is_active",
  label: "Actif",
  type: "boolean",
  defaultValue: true,
};

const activeColumn: ResourceColumn = {
  key: "is_active",
  label: "Actif",
  format: "boolean",
};

function relation(
  key: string,
  label: string,
  endpoint: string,
  optionLabel: string,
  extra: Partial<ResourceField> = {},
): ResourceField {
  return {
    key,
    label,
    type: "relation",
    optionsEndpoint: endpoint,
    optionLabel,
    ...extra,
  };
}

function relationColumn(
  key: string,
  label: string,
  endpoint: string,
  labelKey: string,
): ResourceColumn {
  return {
    key,
    label,
    format: "relation",
    relationEndpoint: endpoint,
    relationLabel: labelKey,
  };
}

function stateColumn(
  labels: Record<string, string>,
  badgeMap: Record<string, BadgeTone>,
  key = "state",
  label = "État",
): ResourceColumn {
  return { key, label, format: "badge", labels, badgeMap };
}

function action(
  label: string,
  icon: string,
  endpoint: string,
  states: string[] | null,
  extra: Partial<ResourceRowAction> = {},
  stateKey = "state",
): ResourceRowAction {
  return {
    label,
    icon,
    endpoint,
    ...(states ? { visibleWhen: { key: stateKey, in: states } } : {}),
    ...extra,
  };
}

const STAFF_LABEL = "employee_code|position";
const staffField = (extra: Partial<ResourceField> = {}) =>
  relation("staff_id", "Employé", "/staff", STAFF_LABEL, {
    required: true,
    createOnly: true,
    ...extra,
  });
const staffColumn = relationColumn("staff_id", "Employé", "/staff", STAFF_LABEL);

/** Champs d'une ligne d'achat (bons de commande et factures fournisseurs). */
const PURCHASE_LINE_FIELDS: ResourceField[] = [
  relation("product_id", "Article", "/products", "name"),
  { key: "description", label: "Description", type: "text" },
  { key: "quantity", label: "Quantité", type: "number", required: true, min: 0, step: 0.001 },
  { key: "unit_price", label: "Prix unitaire", type: "number", required: true, min: 0, step: 0.01 },
  { key: "tax_rate", label: "TVA %", type: "number", min: 0, max: 100, step: 0.01 },
];

/** Réception de toutes les quantités restantes d'un bon de commande. */
function receiveAllRemaining(row: Entity): Record<string, unknown> | string {
  const lines = Array.isArray(row.lines) ? row.lines : [];
  const toReceive = lines
    .map((line, index) => {
      const item = (line ?? {}) as Record<string, unknown>;
      const remaining =
        Number(item.quantity ?? 0) - Number(item.received_qty ?? 0);
      return { line_index: index, quantity: Math.round(remaining * 1000) / 1000 };
    })
    .filter((line) => line.quantity > 0);
  if (toReceive.length === 0) {
    return "Toutes les lignes de ce bon de commande sont déjà réceptionnées.";
  }
  return { lines: toReceive };
}

/* ------------------------------------------------------------------ */
/* Libellés d'énumérations                                             */
/* ------------------------------------------------------------------ */

const ACCOUNT_TYPES = {
  asset: "Actif",
  liability: "Passif",
  equity: "Capitaux propres",
  income: "Produit",
  expense: "Charge",
  off_balance: "Hors bilan",
};
const JOURNAL_TYPES = {
  sale: "Ventes",
  purchase: "Achats",
  cash: "Caisse",
  bank: "Banque",
  mobile_money: "Mobile money",
  general: "Opérations diverses",
};
const ENTRY_STATES = { draft: "Brouillon", posted: "Comptabilisée", cancelled: "Annulée" };
const PRODUCT_CATEGORIES = {
  minibar: "Minibar",
  food: "Alimentation",
  beverage: "Boissons",
  amenities: "Produits d’accueil",
  cleaning: "Entretien",
  linen: "Linge",
  maintenance: "Maintenance",
  office: "Bureau",
  other: "Autre",
};
const UOMS = {
  unit: "Unité",
  kg: "kg",
  g: "g",
  l: "L",
  cl: "cL",
  box: "Boîte",
  pack: "Pack",
  carton: "Carton",
  bottle: "Bouteille",
  roll: "Rouleau",
  pair: "Paire",
  set: "Lot",
};
const PRODUCT_TYPES = {
  stockable: "Stockable",
  consumable: "Consommable",
  service: "Service",
};
const LOCATION_TYPES = {
  internal: "Interne",
  vendor: "Fournisseur",
  customer: "Client",
  inventory_loss: "Pertes d’inventaire",
  consumption: "Consommation",
};
const MOVE_STATES = { draft: "Brouillon", done: "Validé", cancelled: "Annulé" };
const COUNT_STATES = { draft: "Brouillon", applied: "Appliqué", cancelled: "Annulé" };
const PO_STATES = {
  draft: "Brouillon",
  sent: "Envoyé",
  to_approve: "À approuver",
  confirmed: "Confirmé",
  partially_received: "Réception partielle",
  received: "Réceptionné",
  cancelled: "Annulé",
};
const BILLING_STATUSES = { none: "Non facturé", partial: "Partiel", billed: "Facturé" };
const BILL_STATES = {
  draft: "Brouillon",
  posted: "Comptabilisée",
  paid: "Payée",
  cancelled: "Annulée",
};
const CONTRACT_TYPES = {
  cdi: "CDI",
  cdd: "CDD",
  interim: "Intérim",
  internship: "Stage",
  daily_worker: "Journalier",
};
const WAGE_PERIODS = { monthly: "Mensuel", hourly: "Horaire", daily: "Journalier" };
const CONTRACT_STATES = {
  draft: "Brouillon",
  running: "En cours",
  expired: "Expiré",
  terminated: "Résilié",
};
const LEAVE_STATES = {
  draft: "Brouillon",
  submitted: "Soumise",
  approved: "Approuvée",
  refused: "Refusée",
  cancelled: "Annulée",
};
const SHIFT_STATES = { planned: "Planifié", confirmed: "Confirmé", cancelled: "Annulé" };
const ATTENDANCE_SOURCES = { manual: "Manuel", kiosk: "Borne", mobile: "Mobile" };
const LEAD_TYPES = { lead: "Piste", opportunity: "Opportunité" };
const LEAD_SOURCES = {
  website: "Site web",
  phone: "Téléphone",
  email: "E-mail",
  walk_in: "Sur place",
  partner: "Partenaire",
  ota: "OTA",
  social: "Réseaux sociaux",
  referral: "Recommandation",
};
const LEAD_SEGMENTS = {
  group: "Groupe",
  seminar: "Séminaire",
  wedding: "Mariage",
  corporate_contract: "Contrat entreprise",
  long_stay: "Long séjour",
  individual: "Individuel",
};
const LEAD_STATES = { open: "Ouverte", won: "Gagnée", lost: "Perdue" };
const LOYALTY_TIERS = {
  bronze: "Bronze",
  silver: "Argent",
  gold: "Or",
  platinum: "Platine",
  diamond: "Diamant",
};
const CUSTOM_FIELD_TYPES = {
  text: "Texte",
  long_text: "Texte long",
  integer: "Entier",
  decimal: "Décimal",
  boolean: "Case à cocher",
  date: "Date",
  selection: "Sélection",
  multi_selection: "Sélection multiple",
  monetary: "Montant",
  email: "E-mail",
  phone: "Téléphone",
  url: "URL",
};
const RECORD_MODELS = {
  Reservation: "Réservation",
  Guest: "Client",
  Room: "Chambre",
  Invoice: "Facture",
  Payment: "Paiement",
  PosTransaction: "Transaction point de vente",
  MaintenanceRequest: "Demande de maintenance",
  Housekeeping: "Tâche de ménage",
  Staff: "Employé",
  JournalEntry: "Écriture comptable",
  Product: "Article",
  PurchaseOrder: "Bon de commande",
  VendorBill: "Facture fournisseur",
  Lead: "Piste",
  LeaveRequest: "Demande de congé",
  LoyaltyAccount: "Compte fidélité",
};
const RUN_STATUSES = {
  running: "En cours",
  success: "Succès",
  partial: "Partiel",
  failed: "Échec",
  skipped: "Ignorée",
};
const ENDPOINT_KINDS = { webhook: "Webhook HTTP", broker: "Courtier de messages" };
const OUTBOX_STATUSES = {
  pending: "En attente",
  delivering: "En cours",
  delivered: "Livré",
  failed: "Échec",
  dead: "Abandonné",
};
const WEBHOOK_PROVIDERS = {
  stripe: "Stripe",
  orange_money: "Orange Money",
  mtn_momo: "MTN MoMo",
  moov_money: "Moov Money",
  wave: "Wave",
  booking: "Booking.com",
  expedia: "Expedia",
  airbnb: "Airbnb",
  agoda: "Agoda",
  other: "Autre",
};
const SIGNATURE_SCHEMES = {
  pleasantstay_v1: "PleasantStay v1",
  hmac_sha256_hex_header: "HMAC SHA-256 (en-tête hexadécimal)",
};

/* ------------------------------------------------------------------ */
/* Ressources                                                          */
/* ------------------------------------------------------------------ */

const ACCOUNTING: ResourceConfig[] = [
  {
    key: "accounting-accounts",
    endpoint: "/accounting/accounts",
    title: "Plan comptable",
    singular: "compte",
    icon: "pi pi-book",
    app: "accounting",
    group: "Comptabilité",
    propertyScoped: true,
    searchPlaceholder: "Rechercher un compte…",
    description: "Plan comptable SYSCOHADA de la propriété courante.",
    headerActions: [
      {
        label: "Initialiser le plan comptable",
        icon: "pi pi-bolt",
        endpoint: "/accounting/setup",
        includeProperty: true,
        confirm:
          "Créer le plan comptable SYSCOHADA, les journaux et les paramètres par défaut pour cette propriété ? (opération sans effet si déjà fait)",
        successMessage: "Comptabilité initialisée.",
      },
    ],
    columns: [
      { key: "code", label: "Code" },
      { key: "name", label: "Intitulé" },
      {
        key: "account_type",
        label: "Nature",
        format: "badge",
        labels: ACCOUNT_TYPES,
        badgeMap: {
          asset: "info",
          liability: "warning",
          equity: "muted",
          income: "success",
          expense: "danger",
        },
      },
      { key: "syscohada_class", label: "Classe", format: "count" },
      { key: "reconcilable", label: "Lettrable", format: "boolean" },
      activeColumn,
    ],
    fields: [
      {
        key: "code",
        label: "Code",
        type: "text",
        required: true,
        help: "2 à 12 chiffres, le premier (1–9) donne la classe SYSCOHADA.",
      },
      { key: "name", label: "Intitulé", type: "text", required: true },
      {
        key: "account_type",
        label: "Nature",
        type: "select",
        options: opts(ACCOUNT_TYPES),
        help: "Déduite du code si non renseignée.",
      },
      { key: "reconcilable", label: "Lettrable", type: "boolean" },
      activeField,
      { key: "description", label: "Description", type: "textarea", fullWidth: true },
    ],
  },
  {
    key: "accounting-journals",
    endpoint: "/accounting/journals",
    title: "Journaux",
    singular: "journal",
    icon: "pi pi-bookmark",
    app: "accounting",
    group: "Comptabilité",
    propertyScoped: true,
    columns: [
      { key: "code", label: "Code" },
      { key: "name", label: "Nom" },
      { key: "type", label: "Type", format: "badge", labels: JOURNAL_TYPES, badgeDefault: "info" },
      relationColumn("default_account_id", "Compte par défaut", "/accounting/accounts", "code+name"),
      activeColumn,
    ],
    fields: [
      { key: "code", label: "Code", type: "text", required: true, help: "1 à 10 lettres ou chiffres (préfixe de numérotation)." },
      { key: "name", label: "Nom", type: "text", required: true },
      { key: "type", label: "Type", type: "select", required: true, options: opts(JOURNAL_TYPES) },
      relation("default_account_id", "Compte par défaut", "/accounting/accounts", "code+name"),
      activeField,
    ],
  },
  {
    key: "accounting-entries",
    endpoint: "/accounting/journal-entries",
    title: "Écritures comptables",
    singular: "écriture",
    icon: "pi pi-list",
    app: "accounting",
    group: "Comptabilité",
    propertyScoped: true,
    deleteEnabled: false,
    editableWhen: { key: "state", in: ["draft"] },
    description:
      "Saisie en brouillon puis comptabilisation. Une écriture comptabilisée ne se modifie plus : on l’extourne.",
    columns: [
      { key: "number", label: "N°" },
      { key: "date", label: "Date", format: "date" },
      { key: "journal_code", label: "Journal" },
      { key: "reference", label: "Référence" },
      { key: "total_debit", label: "Montant", format: "money" },
      stateColumn(ENTRY_STATES, { draft: "muted", posted: "success", cancelled: "danger" }),
    ],
    fields: [
      relation("journal_id", "Journal", "/accounting/journals", "code+name", { required: true }),
      { key: "date", label: "Date", type: "date", required: true },
      { key: "reference", label: "Référence", type: "text" },
      currencyField,
      { key: "narration", label: "Libellé", type: "textarea", fullWidth: true },
      {
        key: "lines",
        label: "Lignes",
        type: "lines",
        required: true,
        fullWidth: true,
        help: "Chaque ligne porte un débit OU un crédit ; le total des débits doit égaler celui des crédits pour comptabiliser.",
        lineFields: [
          relation("account_id", "Compte", "/accounting/accounts", "code+name", { required: true }),
          { key: "label", label: "Libellé", type: "text" },
          { key: "debit", label: "Débit", type: "number", min: 0, step: 0.01 },
          { key: "credit", label: "Crédit", type: "number", min: 0, step: 0.01 },
        ],
      },
    ],
    rowActions: [
      action("Comptabiliser", "pi pi-check-circle", "post", ["draft"], {
        confirm: "Comptabiliser cette écriture ? Elle ne pourra plus être modifiée.",
        tone: "success",
        successMessage: "Écriture comptabilisée.",
      }),
      action("Extourner", "pi pi-replay", "reverse", ["posted"], {
        fields: [
          { key: "date", label: "Date de l’extourne", type: "date", help: "Aujourd’hui par défaut." },
          { key: "reason", label: "Motif", type: "text" },
        ],
        successMessage: "Écriture extournée.",
      }),
      action("Annuler", "pi pi-ban", "cancel", ["draft"], {
        confirm: "Annuler ce brouillon d’écriture ?",
        tone: "danger",
        successMessage: "Écriture annulée.",
      }),
    ],
  },
];

const INVENTORY: ResourceConfig[] = [
  {
    key: "products",
    endpoint: "/products",
    title: "Articles",
    singular: "article",
    icon: "pi pi-tag",
    app: "inventory",
    group: "Stock",
    propertyScoped: true,
    searchPlaceholder: "Rechercher un article…",
    headerActions: [
      {
        label: "Créer les emplacements",
        icon: "pi pi-bolt",
        endpoint: "/inventory/setup",
        includeProperty: true,
        confirm:
          "Créer les emplacements de stock par défaut (stock principal, bar, économat…) pour cette propriété ?",
        successMessage: "Emplacements de stock initialisés.",
      },
    ],
    columns: [
      { key: "name", label: "Nom" },
      { key: "sku", label: "Référence" },
      { key: "category", label: "Catégorie", format: "badge", labels: PRODUCT_CATEGORIES, badgeDefault: "info" },
      { key: "product_type", label: "Type", format: "badge", labels: PRODUCT_TYPES, badgeDefault: "muted" },
      { key: "cost_price", label: "Coût moyen", format: "money" },
      { key: "sale_price", label: "Prix de vente", format: "money" },
      activeColumn,
    ],
    fields: [
      { key: "name", label: "Nom", type: "text", required: true },
      { key: "sku", label: "Référence interne", type: "text" },
      { key: "category", label: "Catégorie", type: "select", options: opts(PRODUCT_CATEGORIES) },
      { key: "uom", label: "Unité", type: "select", options: opts(UOMS) },
      { key: "product_type", label: "Type", type: "select", options: opts(PRODUCT_TYPES) },
      {
        key: "cost_price",
        label: "Coût initial",
        type: "number",
        min: 0,
        step: 0.01,
        createOnly: true,
        help: "Recalculé ensuite (coût moyen pondéré) à chaque réception.",
      },
      { key: "sale_price", label: "Prix de vente", type: "number", min: 0, step: 0.01 },
      currencyField,
      { key: "reorder_min", label: "Stock minimum", type: "number", min: 0 },
      { key: "reorder_max", label: "Stock maximum", type: "number", min: 0 },
      relation("preferred_vendor_id", "Fournisseur préféré", "/vendors", "name"),
      {
        key: "consumed_per_checkout",
        label: "Consommé par départ",
        type: "number",
        min: 0,
        step: 0.001,
        help: "Quantité consommée automatiquement à chaque départ client.",
      },
      activeField,
      { key: "description", label: "Description", type: "textarea", fullWidth: true },
    ],
  },
  {
    key: "stock-locations",
    endpoint: "/stock-locations",
    title: "Emplacements",
    singular: "emplacement",
    icon: "pi pi-map-marker",
    app: "inventory",
    group: "Stock",
    propertyScoped: true,
    columns: [
      { key: "name", label: "Nom" },
      { key: "code", label: "Code" },
      { key: "location_type", label: "Type", format: "badge", labels: LOCATION_TYPES, badgeDefault: "info" },
      { key: "is_default", label: "Par défaut", format: "boolean" },
      activeColumn,
    ],
    fields: [
      { key: "name", label: "Nom", type: "text", required: true },
      { key: "code", label: "Code", type: "text", required: true, help: "Lettres, chiffres, - et _ (30 caractères max.)." },
      {
        key: "location_type",
        label: "Type",
        type: "select",
        required: true,
        createOnly: true,
        options: opts(LOCATION_TYPES),
        help: "Seuls les emplacements internes portent du stock.",
      },
      relation("parent_id", "Emplacement parent", "/stock-locations", "name"),
      { key: "is_default", label: "Par défaut", type: "boolean" },
      activeField,
    ],
  },
  {
    key: "stock-moves",
    endpoint: "/stock-moves",
    title: "Mouvements de stock",
    singular: "mouvement",
    icon: "pi pi-arrows-h",
    app: "inventory",
    group: "Stock",
    propertyScoped: true,
    editableWhen: { key: "state", in: ["draft"] },
    deletableWhen: { key: "state", in: ["draft"] },
    columns: [
      { key: "reference", label: "Référence" },
      relationColumn("product_id", "Article", "/products", "name"),
      { key: "quantity", label: "Quantité", format: "count" },
      relationColumn("source_location_id", "Origine", "/stock-locations", "name"),
      relationColumn("dest_location_id", "Destination", "/stock-locations", "name"),
      stateColumn(MOVE_STATES, { draft: "muted", done: "success", cancelled: "danger" }),
    ],
    fields: [
      relation("product_id", "Article", "/products", "name", { required: true }),
      { key: "quantity", label: "Quantité", type: "number", required: true, min: 0, step: 0.001 },
      relation("source_location_id", "Emplacement d’origine", "/stock-locations", "name", { required: true }),
      relation("dest_location_id", "Emplacement de destination", "/stock-locations", "name", { required: true }),
      { key: "unit_cost", label: "Coût unitaire", type: "number", min: 0, step: 0.01, help: "Par défaut : coût moyen de l’article." },
      { key: "notes", label: "Notes", type: "textarea", fullWidth: true },
    ],
    rowActions: [
      action("Valider", "pi pi-check-circle", "validate", ["draft"], {
        confirm: "Valider ce mouvement ? Les quantités en stock seront mises à jour.",
        tone: "success",
        successMessage: "Mouvement validé.",
      }),
      action("Annuler", "pi pi-ban", "cancel", ["draft"], {
        confirm: "Annuler ce mouvement ?",
        tone: "danger",
        successMessage: "Mouvement annulé.",
      }),
    ],
  },
  {
    key: "inventory-counts",
    endpoint: "/inventory-counts",
    title: "Inventaires",
    singular: "inventaire",
    icon: "pi pi-check-square",
    app: "inventory",
    group: "Stock",
    propertyScoped: true,
    editableWhen: { key: "state", in: ["draft"] },
    deletableWhen: { key: "state", in: ["draft"] },
    columns: [
      { key: "name", label: "Nom" },
      { key: "count_date", label: "Date", format: "date" },
      { key: "lines", label: "Lignes", format: "count" },
      stateColumn(COUNT_STATES, { draft: "muted", applied: "success", cancelled: "danger" }),
    ],
    fields: [
      { key: "name", label: "Nom", type: "text", required: true },
      { key: "count_date", label: "Date", type: "date", createOnly: true },
      relation("location_id", "Pré-remplir depuis l’emplacement", "/stock-locations", "name", {
        createOnly: true,
        help: "Ajoute une ligne pour chaque article stocké dans cet emplacement interne.",
      }),
      {
        key: "lines",
        label: "Lignes comptées",
        type: "lines",
        fullWidth: true,
        help: "Saisissez la quantité réellement comptée ; l’écart est calculé à l’application.",
        lineFields: [
          relation("product_id", "Article", "/products", "name", { required: true }),
          relation("location_id", "Emplacement", "/stock-locations", "name", { required: true }),
          { key: "counted_qty", label: "Quantité comptée", type: "number", min: 0, step: 0.001 },
        ],
      },
      { key: "notes", label: "Notes", type: "textarea", fullWidth: true },
    ],
    rowActions: [
      action("Appliquer", "pi pi-check-circle", "apply", ["draft"], {
        confirm: "Appliquer cet inventaire ? Les écarts généreront des mouvements de stock.",
        tone: "success",
        successMessage: "Inventaire appliqué.",
      }),
      action("Annuler", "pi pi-ban", "cancel", ["draft"], {
        confirm: "Annuler cet inventaire ?",
        tone: "danger",
        successMessage: "Inventaire annulé.",
      }),
    ],
  },
];

const PURCHASE: ResourceConfig[] = [
  {
    key: "vendors",
    endpoint: "/vendors",
    title: "Fournisseurs",
    singular: "fournisseur",
    icon: "pi pi-truck",
    app: "purchase",
    group: "Achats",
    propertyScoped: true,
    searchPlaceholder: "Rechercher un fournisseur…",
    columns: [
      { key: "name", label: "Nom" },
      { key: "code", label: "Code" },
      { key: "contact.email", label: "E-mail" },
      { key: "contact.phone", label: "Téléphone" },
      { key: "payment_term_days", label: "Délai (j)", format: "count" },
      activeColumn,
    ],
    fields: [
      { key: "name", label: "Nom", type: "text", required: true },
      { key: "code", label: "Code", type: "text" },
      { key: "contact.name", label: "Contact", type: "text" },
      { key: "contact.email", label: "E-mail", type: "email" },
      { key: "contact.phone", label: "Téléphone", type: "text" },
      { key: "tax_id", label: "N° contribuable", type: "text" },
      { key: "payment_term_days", label: "Délai de paiement (jours)", type: "number", min: 0 },
      currencyField,
      activeField,
      { key: "address", label: "Adresse", type: "textarea", fullWidth: true },
    ],
  },
  {
    key: "purchase-orders",
    endpoint: "/purchase-orders",
    title: "Bons de commande",
    singular: "bon de commande",
    icon: "pi pi-shopping-cart",
    app: "purchase",
    group: "Achats",
    propertyScoped: true,
    editableWhen: { key: "state", in: ["draft", "sent"] },
    deletableWhen: { key: "state", in: ["draft", "cancelled"] },
    columns: [
      { key: "number", label: "N°" },
      relationColumn("vendor_id", "Fournisseur", "/vendors", "name"),
      { key: "order_date", label: "Date", format: "date" },
      { key: "amount_total", label: "Total TTC", format: "money" },
      stateColumn(PO_STATES, {
        draft: "muted",
        sent: "info",
        to_approve: "warning",
        confirmed: "info",
        partially_received: "warning",
        received: "success",
        cancelled: "danger",
      }),
      stateColumn(
        BILLING_STATUSES,
        { none: "muted", partial: "warning", billed: "success" },
        "billing_status",
        "Facturation",
      ),
    ],
    fields: [
      relation("vendor_id", "Fournisseur", "/vendors", "name", { required: true }),
      { key: "order_date", label: "Date de commande", type: "date" },
      { key: "expected_date", label: "Livraison prévue", type: "date" },
      currencyField,
      {
        key: "lines",
        label: "Lignes",
        type: "lines",
        required: true,
        fullWidth: true,
        lineFields: PURCHASE_LINE_FIELDS,
      },
      { key: "notes", label: "Notes", type: "textarea", fullWidth: true },
    ],
    rowActions: [
      action("Envoyer", "pi pi-send", "send", ["draft"], {
        successMessage: "Bon de commande marqué comme envoyé.",
      }),
      action("Confirmer", "pi pi-check", "confirm", ["draft", "sent"], {
        confirm: "Confirmer ce bon de commande ?",
        tone: "success",
        successMessage: "Bon de commande traité.",
      }),
      action("Approuver", "pi pi-verified", "approve", ["to_approve"], {
        confirm: "Approuver ce bon de commande ?",
        tone: "success",
        successMessage: "Bon de commande approuvé.",
      }),
      action("Réceptionner", "pi pi-inbox", "receive", ["confirmed", "partially_received"], {
        confirm: "Réceptionner toutes les quantités restantes de ce bon de commande ?",
        buildBody: receiveAllRemaining,
        successMessage: "Réception enregistrée.",
      }),
      action("Créer la facture", "pi pi-file-edit", "bill", ["confirmed", "partially_received", "received"], {
        confirm: "Créer la facture fournisseur pour les quantités reçues non encore facturées ?",
        fields: [
          { key: "vendor_reference", label: "Référence fournisseur", type: "text" },
          { key: "bill_date", label: "Date de facture", type: "date" },
        ],
        successMessage: "Facture fournisseur créée.",
      }),
      action("Annuler", "pi pi-ban", "cancel", ["draft", "sent", "to_approve", "confirmed"], {
        tone: "danger",
        fields: [{ key: "reason", label: "Motif d’annulation", type: "text" }],
        successMessage: "Bon de commande annulé.",
      }),
    ],
  },
  {
    key: "vendor-bills",
    endpoint: "/vendor-bills",
    title: "Factures fournisseurs",
    singular: "facture fournisseur",
    icon: "pi pi-file-import",
    app: "purchase",
    group: "Achats",
    propertyScoped: true,
    editableWhen: { key: "state", in: ["draft"] },
    deletableWhen: { key: "state", in: ["draft"] },
    columns: [
      { key: "number", label: "N°" },
      relationColumn("vendor_id", "Fournisseur", "/vendors", "name"),
      { key: "vendor_reference", label: "Réf. fournisseur" },
      { key: "bill_date", label: "Date", format: "date" },
      { key: "due_date", label: "Échéance", format: "date" },
      { key: "amount_total", label: "Total TTC", format: "money" },
      stateColumn(BILL_STATES, { draft: "muted", posted: "info", paid: "success", cancelled: "danger" }),
    ],
    fields: [
      relation("vendor_id", "Fournisseur", "/vendors", "name", { required: true, createOnly: true }),
      { key: "vendor_reference", label: "Référence fournisseur", type: "text" },
      { key: "bill_date", label: "Date de facture", type: "date" },
      { key: "due_date", label: "Échéance", type: "date", help: "Par défaut : date + délai de paiement du fournisseur." },
      currencyField,
      {
        key: "lines",
        label: "Lignes",
        type: "lines",
        required: true,
        fullWidth: true,
        help: "Les lignes d’une facture issue d’un bon de commande ne sont pas modifiables.",
        lineFields: PURCHASE_LINE_FIELDS,
      },
      { key: "notes", label: "Notes", type: "textarea", fullWidth: true },
    ],
    rowActions: [
      action("Comptabiliser", "pi pi-check-circle", "post", ["draft"], {
        confirm: "Comptabiliser cette facture fournisseur ?",
        tone: "success",
        successMessage: "Facture comptabilisée.",
      }),
      action("Marquer payée", "pi pi-wallet", "mark-paid", ["posted"], {
        fields: [
          { key: "payment_reference", label: "Référence du paiement", type: "text" },
          { key: "paid_at", label: "Date de paiement", type: "date" },
        ],
        tone: "success",
        successMessage: "Facture marquée comme payée.",
      }),
      action("Annuler", "pi pi-ban", "cancel", ["draft", "posted"], {
        confirm: "Annuler cette facture fournisseur ?",
        tone: "danger",
        successMessage: "Facture annulée.",
      }),
    ],
  },
];

const HR: ResourceConfig[] = [
  {
    key: "hr-departments",
    endpoint: "/hr/departments",
    title: "Départements",
    singular: "département",
    icon: "pi pi-sitemap",
    app: "hr",
    group: "Ressources humaines",
    propertyScoped: true,
    columns: [
      { key: "name", label: "Nom" },
      { key: "code", label: "Code" },
      relationColumn("manager_staff_id", "Responsable", "/staff", STAFF_LABEL),
      relationColumn("parent_id", "Parent", "/hr/departments", "name"),
      activeColumn,
    ],
    fields: [
      { key: "name", label: "Nom", type: "text", required: true },
      { key: "code", label: "Code", type: "text", required: true },
      relation("manager_staff_id", "Responsable", "/staff", STAFF_LABEL),
      relation("parent_id", "Département parent", "/hr/departments", "name"),
      activeField,
    ],
  },
  {
    key: "hr-contracts",
    endpoint: "/hr/contracts",
    title: "Contrats",
    singular: "contrat",
    icon: "pi pi-file",
    app: "hr",
    group: "Ressources humaines",
    propertyScoped: true,
    editableWhen: { key: "state", in: ["draft"] },
    deletableWhen: { key: "state", in: ["draft"] },
    columns: [
      { key: "reference", label: "Référence" },
      staffColumn,
      { key: "contract_type", label: "Type", format: "badge", labels: CONTRACT_TYPES, badgeDefault: "info" },
      { key: "start_date", label: "Début", format: "date" },
      { key: "end_date", label: "Fin", format: "date" },
      { key: "wage", label: "Salaire", format: "money" },
      stateColumn(CONTRACT_STATES, { draft: "muted", running: "success", expired: "warning", terminated: "danger" }),
    ],
    fields: [
      staffField(),
      { key: "contract_type", label: "Type de contrat", type: "select", required: true, options: opts(CONTRACT_TYPES) },
      { key: "job_title", label: "Intitulé du poste", type: "text" },
      { key: "start_date", label: "Date de début", type: "date", required: true },
      { key: "end_date", label: "Date de fin", type: "date", help: "Obligatoire pour un CDD ou un stage." },
      { key: "wage", label: "Salaire", type: "number", required: true, min: 0, step: 0.01 },
      { key: "wage_period", label: "Période", type: "select", options: opts(WAGE_PERIODS) },
      currencyField,
      { key: "weekly_hours", label: "Heures hebdomadaires", type: "number", min: 0, step: 0.5 },
      { key: "notes", label: "Notes", type: "textarea", fullWidth: true },
    ],
    rowActions: [
      action("Démarrer", "pi pi-play", "start", ["draft"], {
        confirm: "Démarrer ce contrat ?",
        tone: "success",
        successMessage: "Contrat démarré.",
      }),
      action("Résilier", "pi pi-times-circle", "terminate", ["running"], {
        tone: "danger",
        fields: [
          { key: "reason", label: "Motif de résiliation", type: "text", required: true },
          { key: "end_date", label: "Date de fin", type: "date", help: "Aujourd’hui par défaut." },
        ],
        successMessage: "Contrat résilié.",
      }),
    ],
  },
  {
    key: "hr-leave-types",
    endpoint: "/hr/leave-types",
    title: "Types de congé",
    singular: "type de congé",
    icon: "pi pi-tags",
    app: "hr",
    group: "Ressources humaines",
    propertyScoped: true,
    columns: [
      { key: "name", label: "Nom" },
      { key: "code", label: "Code" },
      { key: "paid", label: "Payé", format: "boolean" },
      { key: "requires_approval", label: "Approbation", format: "boolean" },
      { key: "requires_allocation", label: "Allocation", format: "boolean" },
      { key: "annual_allocation_days", label: "Jours / an", format: "count" },
      activeColumn,
    ],
    fields: [
      { key: "name", label: "Nom", type: "text", required: true },
      { key: "code", label: "Code", type: "text", required: true },
      { key: "annual_allocation_days", label: "Jours alloués par an", type: "number", min: 0, step: 0.5 },
      { key: "paid", label: "Congé payé", type: "boolean", defaultValue: true },
      { key: "requires_approval", label: "Soumis à approbation", type: "boolean", defaultValue: true },
      { key: "requires_allocation", label: "Nécessite une allocation", type: "boolean" },
      activeField,
    ],
  },
  {
    key: "hr-leave-allocations",
    endpoint: "/hr/leave-allocations",
    title: "Allocations de congés",
    singular: "allocation",
    icon: "pi pi-calendar-plus",
    app: "hr",
    group: "Ressources humaines",
    propertyScoped: true,
    headerActions: [
      {
        label: "Générer l’année",
        icon: "pi pi-bolt",
        endpoint: "/hr/leave-allocations/generate",
        includeProperty: true,
        fields: [{ key: "year", label: "Année", type: "number", required: true, min: 2000, max: 2100 }],
        successMessage: "Allocations générées.",
      },
    ],
    columns: [
      staffColumn,
      relationColumn("leave_type_id", "Type", "/hr/leave-types", "name"),
      { key: "year", label: "Année" },
      { key: "days", label: "Jours", format: "count" },
    ],
    fields: [
      staffField(),
      relation("leave_type_id", "Type de congé", "/hr/leave-types", "name", { required: true, createOnly: true }),
      { key: "year", label: "Année", type: "number", required: true, createOnly: true, min: 2000, max: 2100 },
      { key: "days", label: "Jours", type: "number", required: true, min: 0, step: 0.5 },
      { key: "notes", label: "Notes", type: "textarea", fullWidth: true },
    ],
  },
  {
    key: "hr-leaves",
    endpoint: "/hr/leaves",
    title: "Congés",
    singular: "demande de congé",
    icon: "pi pi-calendar-minus",
    app: "hr",
    group: "Ressources humaines",
    propertyScoped: true,
    editableWhen: { key: "state", in: ["draft"] },
    deletableWhen: { key: "state", in: ["draft"] },
    columns: [
      staffColumn,
      relationColumn("leave_type_id", "Type", "/hr/leave-types", "name"),
      { key: "start_date", label: "Du", format: "date" },
      { key: "end_date", label: "Au", format: "date" },
      { key: "days", label: "Jours", format: "count" },
      stateColumn(LEAVE_STATES, {
        draft: "muted",
        submitted: "warning",
        approved: "success",
        refused: "danger",
        cancelled: "danger",
      }),
    ],
    fields: [
      staffField(),
      relation("leave_type_id", "Type de congé", "/hr/leave-types", "name", { required: true }),
      { key: "start_date", label: "Du", type: "date", required: true },
      { key: "end_date", label: "Au", type: "date", required: true },
      { key: "start_half_day", label: "Commence l’après-midi", type: "boolean" },
      { key: "end_half_day", label: "Finit à midi", type: "boolean" },
      { key: "reason", label: "Motif", type: "textarea", fullWidth: true },
    ],
    rowActions: [
      action("Soumettre", "pi pi-send", "submit", ["draft"], {
        successMessage: "Demande soumise.",
      }),
      action("Approuver", "pi pi-check", "approve", ["submitted"], {
        confirm: "Approuver cette demande de congé ?",
        tone: "success",
        successMessage: "Demande approuvée.",
      }),
      action("Refuser", "pi pi-times", "refuse", ["submitted"], {
        tone: "danger",
        fields: [{ key: "reason", label: "Motif du refus", type: "text" }],
        successMessage: "Demande refusée.",
      }),
      action("Annuler", "pi pi-ban", "cancel", ["draft", "submitted", "approved"], {
        confirm: "Annuler cette demande de congé ?",
        tone: "danger",
        successMessage: "Demande annulée.",
      }),
    ],
  },
  {
    key: "hr-shifts",
    endpoint: "/hr/shifts",
    title: "Planning",
    singular: "créneau",
    icon: "pi pi-clock",
    app: "hr",
    group: "Ressources humaines",
    propertyScoped: true,
    editableWhen: { key: "state", in: ["planned", "confirmed"] },
    columns: [
      { key: "date", label: "Date", format: "date" },
      staffColumn,
      { key: "start_time", label: "Début" },
      { key: "end_time", label: "Fin" },
      { key: "hours", label: "Heures", format: "count" },
      { key: "role", label: "Rôle" },
      stateColumn(SHIFT_STATES, { planned: "info", confirmed: "success", cancelled: "danger" }),
    ],
    fields: [
      staffField(),
      relation("department_id", "Département", "/hr/departments", "name"),
      { key: "date", label: "Date", type: "date", required: true },
      { key: "start_time", label: "Heure de début", type: "time", required: true },
      { key: "end_time", label: "Heure de fin", type: "time", required: true, help: "Antérieure au début : fin le lendemain (service de nuit)." },
      { key: "role", label: "Rôle", type: "text" },
      { key: "notes", label: "Notes", type: "textarea", fullWidth: true },
    ],
    rowActions: [
      action("Confirmer", "pi pi-check", "confirm", ["planned"], {
        tone: "success",
        successMessage: "Créneau confirmé.",
      }),
      action("Annuler", "pi pi-ban", "cancel", ["planned", "confirmed"], {
        confirm: "Annuler ce créneau ?",
        tone: "danger",
        successMessage: "Créneau annulé.",
      }),
    ],
  },
  {
    key: "hr-attendance",
    endpoint: "/hr/attendance",
    title: "Présences",
    singular: "pointage",
    icon: "pi pi-stopwatch",
    app: "hr",
    group: "Ressources humaines",
    propertyScoped: true,
    headerActions: [
      {
        label: "Pointer une arrivée",
        icon: "pi pi-sign-in",
        endpoint: "/hr/attendance/check-in",
        includeProperty: true,
        fields: [staffField({ createOnly: false })],
        successMessage: "Arrivée enregistrée.",
      },
      {
        label: "Pointer un départ",
        icon: "pi pi-sign-out",
        endpoint: "/hr/attendance/check-out",
        includeProperty: true,
        fields: [staffField({ createOnly: false })],
        successMessage: "Départ enregistré.",
      },
    ],
    columns: [
      staffColumn,
      { key: "check_in", label: "Arrivée", format: "datetime" },
      { key: "check_out", label: "Départ", format: "datetime" },
      { key: "worked_hours", label: "Heures", format: "count" },
      { key: "is_open", label: "En cours", format: "boolean" },
      { key: "source", label: "Source", format: "badge", labels: ATTENDANCE_SOURCES, badgeDefault: "muted" },
    ],
    fields: [
      staffField(),
      { key: "check_in", label: "Arrivée", type: "datetime", required: true },
      { key: "check_out", label: "Départ", type: "datetime", required: true },
      { key: "notes", label: "Notes", type: "textarea", fullWidth: true },
    ],
  },
];

const CRM: ResourceConfig[] = [
  {
    key: "crm-stages",
    endpoint: "/crm/stages",
    title: "Étapes du pipeline",
    singular: "étape",
    icon: "pi pi-sort-numeric-up",
    app: "crm",
    group: "CRM",
    propertyScoped: true,
    headerActions: [
      {
        label: "Étapes par défaut",
        icon: "pi pi-bolt",
        endpoint: "/crm/setup",
        includeProperty: true,
        confirm: "Créer les étapes de pipeline par défaut pour cette propriété ?",
        successMessage: "Pipeline initialisé.",
      },
    ],
    columns: [
      { key: "sequence", label: "Ordre", format: "count" },
      { key: "name", label: "Nom" },
      { key: "probability", label: "Probabilité %", format: "count" },
      { key: "is_won", label: "Gagnée", format: "boolean" },
      { key: "is_lost", label: "Perdue", format: "boolean" },
      { key: "fold", label: "Repliée", format: "boolean" },
    ],
    fields: [
      { key: "name", label: "Nom", type: "text", required: true },
      { key: "sequence", label: "Ordre", type: "number", min: 0 },
      { key: "probability", label: "Probabilité (%)", type: "number", min: 0, max: 100 },
      { key: "is_won", label: "Étape « gagnée »", type: "boolean" },
      { key: "is_lost", label: "Étape « perdue »", type: "boolean" },
      { key: "fold", label: "Repliée dans le pipeline", type: "boolean" },
    ],
  },
  {
    key: "crm-corporate-accounts",
    endpoint: "/crm/corporate-accounts",
    title: "Comptes entreprises",
    singular: "compte entreprise",
    icon: "pi pi-building",
    app: "crm",
    group: "CRM",
    propertyScoped: true,
    searchPlaceholder: "Rechercher une entreprise…",
    columns: [
      { key: "name", label: "Nom" },
      { key: "industry", label: "Secteur" },
      { key: "negotiated_discount_percent", label: "Remise %", format: "count" },
      { key: "credit_limit", label: "Plafond de crédit", format: "money" },
      { key: "payment_term_days", label: "Délai (j)", format: "count" },
      activeColumn,
    ],
    fields: [
      { key: "name", label: "Raison sociale", type: "text", required: true },
      { key: "tax_id", label: "N° contribuable", type: "text" },
      { key: "industry", label: "Secteur", type: "text" },
      { key: "negotiated_discount_percent", label: "Remise négociée (%)", type: "number", min: 0, max: 100, step: 0.01 },
      { key: "credit_limit", label: "Plafond de crédit", type: "number", min: 0, step: 0.01 },
      currencyField,
      { key: "payment_term_days", label: "Délai de paiement (jours)", type: "number", min: 0 },
      activeField,
      {
        key: "contacts",
        label: "Contacts",
        type: "lines",
        fullWidth: true,
        lineFields: [
          { key: "name", label: "Nom", type: "text", required: true },
          { key: "email", label: "E-mail", type: "email" },
          { key: "phone", label: "Téléphone", type: "text" },
          { key: "role", label: "Fonction", type: "text" },
        ],
      },
      { key: "notes", label: "Notes", type: "textarea", fullWidth: true },
    ],
  },
  {
    key: "crm-leads",
    endpoint: "/crm/leads",
    title: "Pistes & opportunités",
    singular: "piste",
    icon: "pi pi-flag",
    app: "crm",
    group: "CRM",
    propertyScoped: true,
    searchPlaceholder: "Rechercher une piste…",
    columns: [
      { key: "reference", label: "Référence" },
      { key: "title", label: "Titre" },
      { key: "lead_type", label: "Type", format: "badge", labels: LEAD_TYPES, badgeMap: { lead: "muted", opportunity: "info" } },
      { key: "contact_name", label: "Contact" },
      relationColumn("stage_id", "Étape", "/crm/stages", "name"),
      { key: "expected_revenue", label: "CA attendu", format: "money" },
      stateColumn(LEAD_STATES, { open: "info", won: "success", lost: "danger" }),
    ],
    fields: [
      { key: "title", label: "Titre", type: "text", required: true },
      { key: "lead_type", label: "Type", type: "select", createOnly: true, options: opts(LEAD_TYPES) },
      { key: "contact_name", label: "Nom du contact", type: "text" },
      { key: "contact_email", label: "E-mail du contact", type: "email" },
      { key: "contact_phone", label: "Téléphone du contact", type: "text" },
      relation("corporate_account_id", "Compte entreprise", "/crm/corporate-accounts", "name"),
      relation("guest_id", "Client", "/guests", "email"),
      { key: "source", label: "Source", type: "select", options: opts(LEAD_SOURCES) },
      { key: "segment", label: "Segment", type: "select", options: opts(LEAD_SEGMENTS) },
      { key: "arrival_date", label: "Arrivée", type: "date" },
      { key: "departure_date", label: "Départ", type: "date" },
      { key: "rooms", label: "Chambres", type: "number", min: 0 },
      { key: "guests", label: "Personnes", type: "number", min: 0 },
      { key: "expected_revenue", label: "CA attendu", type: "number", min: 0, step: 0.01 },
      currencyField,
      { key: "probability", label: "Probabilité (%)", type: "number", min: 0, max: 100 },
      relation("stage_id", "Étape", "/crm/stages", "name", { createOnly: true }),
      { key: "tags", label: "Étiquettes", type: "list", help: "Séparées par des virgules." },
      { key: "description", label: "Description", type: "textarea", fullWidth: true },
    ],
    rowActions: [
      action("Convertir", "pi pi-arrow-right-arrow-left", "convert", ["lead"], {
        confirm: "Convertir cette piste en opportunité ?",
        successMessage: "Piste convertie en opportunité.",
      }, "lead_type"),
      action("Gagné", "pi pi-thumbs-up", "win", ["open"], {
        confirm: "Marquer cette opportunité comme gagnée ?",
        tone: "success",
        successMessage: "Opportunité gagnée.",
      }),
      action("Perdu", "pi pi-thumbs-down", "lose", ["open"], {
        tone: "danger",
        fields: [{ key: "reason", label: "Motif de la perte", type: "text", required: true }],
        successMessage: "Opportunité marquée comme perdue.",
      }),
    ],
  },
];

const LOYALTY: ResourceConfig[] = [
  {
    key: "loyalty-programs",
    endpoint: "/loyalty/programs",
    title: "Programmes de fidélité",
    singular: "programme",
    icon: "pi pi-gift",
    app: "loyalty",
    group: "Fidélité",
    propertyScoped: true,
    columns: [
      { key: "name", label: "Nom" },
      { key: "earn_unit_amount", label: "Tranche", format: "money" },
      { key: "points_per_unit", label: "Points / tranche", format: "count" },
      { key: "point_value", label: "Valeur du point", format: "money" },
      { key: "min_redeem_points", label: "Seuil d’échange", format: "count" },
      activeColumn,
    ],
    fields: [
      { key: "name", label: "Nom", type: "text", required: true },
      currencyField,
      { key: "earn_unit_amount", label: "Montant d’une tranche", type: "number", min: 0, step: 0.01, help: "Ex. 1 000 : des points pour chaque tranche de 1 000 dépensés." },
      { key: "points_per_unit", label: "Points par tranche", type: "number", min: 0 },
      { key: "point_value", label: "Valeur d’un point", type: "number", min: 0, step: 0.01 },
      { key: "min_redeem_points", label: "Points minimum pour un échange", type: "number", min: 0 },
      { key: "points_expiry_months", label: "Expiration (mois)", type: "number", min: 0 },
      { key: "earn_on_reservation", label: "Points sur les séjours", type: "boolean", defaultValue: true },
      { key: "earn_on_pos", label: "Points au point de vente", type: "boolean" },
      activeField,
      {
        key: "tiers",
        label: "Niveaux",
        type: "lines",
        fullWidth: true,
        lineFields: [
          { key: "tier", label: "Niveau", type: "select", required: true, options: opts(LOYALTY_TIERS) },
          { key: "min_lifetime_points", label: "Points cumulés min.", type: "number", required: true, min: 0 },
          { key: "earn_multiplier", label: "Multiplicateur", type: "number", min: 0, step: 0.1 },
        ],
      },
      { key: "description", label: "Description", type: "textarea", fullWidth: true },
    ],
  },
  {
    key: "loyalty-accounts",
    endpoint: "/loyalty/accounts",
    title: "Comptes fidélité",
    singular: "compte fidélité",
    icon: "pi pi-star",
    app: "loyalty",
    group: "Fidélité",
    propertyScoped: true,
    editEnabled: false,
    deleteEnabled: false,
    description: "Ajouter un compte inscrit un client à un programme.",
    columns: [
      relationColumn("guest_id", "Client", "/guests", "email"),
      relationColumn("program_id", "Programme", "/loyalty/programs", "name"),
      { key: "balance", label: "Solde", format: "count" },
      { key: "lifetime_points", label: "Points cumulés", format: "count" },
      { key: "tier", label: "Niveau", format: "badge", labels: LOYALTY_TIERS, badgeMap: { bronze: "muted", silver: "info", gold: "warning", platinum: "success", diamond: "success" } },
      activeColumn,
    ],
    fields: [
      relation("program_id", "Programme", "/loyalty/programs", "name", { required: true }),
      relation("guest_id", "Client", "/guests", "email", { required: true }),
    ],
    rowActions: [
      action("Échanger des points", "pi pi-shopping-bag", "redeem", null, {
        fields: [
          { key: "points", label: "Points", type: "number", required: true, min: 1 },
          { key: "reason", label: "Motif", type: "text", required: true },
        ],
        successMessage: "Points échangés.",
      }),
      action("Ajuster", "pi pi-sliders-h", "adjust", null, {
        fields: [
          { key: "points", label: "Points (négatif pour retirer)", type: "number", required: true },
          { key: "reason", label: "Motif", type: "text", required: true },
        ],
        successMessage: "Solde ajusté.",
      }),
    ],
  },
];

const STUDIO: ResourceConfig[] = [
  {
    key: "studio-fields",
    endpoint: "/studio/fields",
    title: "Champs personnalisés",
    singular: "champ",
    icon: "pi pi-pencil",
    app: "studio",
    group: "Studio",
    organizationScoped: true,
    description: "Ajoutez des champs aux fiches (réservations, clients, articles…) de l’établissement.",
    columns: [
      { key: "res_model", label: "Fiche", format: "badge", labels: RECORD_MODELS, badgeDefault: "info" },
      { key: "key", label: "Clé" },
      { key: "label", label: "Libellé" },
      { key: "field_type", label: "Type", format: "badge", labels: CUSTOM_FIELD_TYPES, badgeDefault: "muted" },
      { key: "required", label: "Obligatoire", format: "boolean" },
      activeColumn,
    ],
    fields: [
      { key: "res_model", label: "Fiche", type: "select", required: true, createOnly: true, options: opts(RECORD_MODELS) },
      { key: "key", label: "Clé technique", type: "text", required: true, createOnly: true, help: "snake_case : lettre minuscule puis lettres, chiffres ou _." },
      { key: "label", label: "Libellé", type: "text", required: true },
      { key: "field_type", label: "Type", type: "select", required: true, options: opts(CUSTOM_FIELD_TYPES) },
      { key: "sequence", label: "Ordre", type: "number", min: 0 },
      { key: "required", label: "Obligatoire", type: "boolean" },
      activeField,
      { key: "help", label: "Aide", type: "text", fullWidth: true },
      {
        key: "options",
        label: "Options (champs de sélection)",
        type: "lines",
        fullWidth: true,
        lineFields: [
          { key: "value", label: "Valeur", type: "text", required: true },
          { key: "label", label: "Libellé", type: "text", required: true },
        ],
      },
    ],
  },
];

const AUTOMATION: ResourceConfig[] = [
  {
    key: "automation-rules",
    endpoint: "/automation/rules",
    title: "Règles d’automatisation",
    singular: "règle",
    icon: "pi pi-bolt",
    app: "automation",
    group: "Automatisations",
    organizationScoped: true,
    columns: [
      { key: "name", label: "Nom" },
      { key: "trigger_event", label: "Déclencheur" },
      { key: "run_count", label: "Exécutions", format: "count" },
      { key: "error_count", label: "Erreurs", format: "count" },
      { key: "last_run_at", label: "Dernière exécution", format: "datetime" },
      activeColumn,
    ],
    fields: [
      { key: "name", label: "Nom", type: "text", required: true },
      {
        key: "trigger_event",
        label: "Événement déclencheur",
        type: "select",
        required: true,
        optionsEndpoint: "/apps/events",
      },
      {
        key: "condition_logic",
        label: "Logique des conditions",
        type: "select",
        options: [
          { value: "all", label: "Toutes les conditions" },
          { value: "any", label: "Au moins une condition" },
        ],
      },
      activeField,
      { key: "description", label: "Description", type: "textarea", fullWidth: true },
      {
        key: "conditions",
        label: "Conditions (JSON)",
        type: "json",
        fullWidth: true,
        placeholder: '[{ "path": "record.total_amount", "operator": "gt", "value": 100000 }]',
        help: "Tableau de { path, operator, value }. Laisser vide : toujours vrai.",
      },
      {
        key: "actions",
        label: "Actions (JSON)",
        type: "json",
        required: true,
        fullWidth: true,
        placeholder: '[{ "type": "notify", "params": { "channel": "email", "to": "direction@hotel.ci", "message": "…" } }]',
        help: "Tableau de { type, params } ; types : create_activity, post_note, notify, publish_event.",
      },
    ],
    rowActions: [
      action("Activer", "pi pi-play", "toggle", ["false"], { tone: "success", successMessage: "Règle activée." }, "is_active"),
      action("Désactiver", "pi pi-pause", "toggle", ["true"], { successMessage: "Règle désactivée." }, "is_active"),
      action("Tester", "pi pi-flask", "test", null, {
        body: { event: {} },
        showResult: true,
        successMessage: "Essai à blanc effectué (aucune action exécutée).",
      }),
    ],
  },
  {
    key: "automation-runs",
    endpoint: "/automation/runs",
    title: "Historique des exécutions",
    singular: "exécution",
    icon: "pi pi-history",
    app: "automation",
    group: "Automatisations",
    readOnly: true,
    columns: [
      { key: "created_at", label: "Date", format: "datetime" },
      relationColumn("rule_id", "Règle", "/automation/rules", "name"),
      { key: "event_name", label: "Événement" },
      { key: "matched", label: "Conditions remplies", format: "boolean" },
      stateColumn(RUN_STATUSES, { running: "info", success: "success", partial: "warning", failed: "danger", skipped: "muted" }, "status", "Statut"),
      { key: "duration_ms", label: "Durée (ms)", format: "count" },
      { key: "error", label: "Erreur" },
    ],
    fields: [],
  },
];

const INTEGRATION: ResourceConfig[] = [
  {
    key: "integration-endpoints",
    endpoint: "/integration/endpoints",
    title: "Points de terminaison",
    singular: "point de terminaison",
    icon: "pi pi-send",
    app: "integration_bus",
    group: "Intégrations",
    organizationScoped: true,
    description: "Webhooks sortants signés et courtiers de messages abonnés aux événements métier.",
    columns: [
      { key: "name", label: "Nom" },
      { key: "kind", label: "Type", format: "badge", labels: ENDPOINT_KINDS, badgeDefault: "info" },
      { key: "url", label: "URL / destination" },
      { key: "event_patterns", label: "Événements", format: "count" },
      { key: "consecutive_failures", label: "Échecs", format: "count" },
      { key: "last_success_at", label: "Dernier succès", format: "datetime" },
      activeColumn,
    ],
    fields: [
      { key: "name", label: "Nom", type: "text", required: true },
      { key: "kind", label: "Type", type: "select", options: opts(ENDPOINT_KINDS) },
      { key: "url", label: "URL (webhook)", type: "url" },
      { key: "broker_destination", label: "Destination (courtier)", type: "text" },
      {
        key: "event_patterns",
        label: "Événements",
        type: "list",
        required: true,
        fullWidth: true,
        placeholder: "billing.*, hotel.reservation.created",
        help: "Motifs séparés par des virgules ; « * » pour tout recevoir.",
      },
      { key: "secret", label: "Secret de signature", type: "password", createOnly: true, help: "Généré automatiquement si vide." },
      { key: "timeout_ms", label: "Délai max. (ms)", type: "number", min: 100 },
      { key: "max_attempts", label: "Tentatives max.", type: "number", min: 1 },
      activeField,
      { key: "headers", label: "En-têtes HTTP (JSON)", type: "json", fullWidth: true, placeholder: '{ "X-Api-Key": "…" }' },
      { key: "description", label: "Description", type: "textarea", fullWidth: true },
    ],
    rowActions: [
      action("Tester", "pi pi-wifi", "test", null, {
        showResult: true,
        successMessage: "Événement de test envoyé.",
      }),
      action("Nouvelle clé", "pi pi-key", "rotate-secret", null, {
        confirm: "Générer un nouveau secret de signature ? L’ancien cessera immédiatement de fonctionner.",
        body: {},
        showResult: true,
        successMessage: "Nouveau secret généré : copiez-le, il ne sera plus affiché.",
      }),
    ],
  },
  {
    key: "integration-outbox",
    endpoint: "/integration/outbox",
    title: "File d’envoi",
    singular: "message",
    icon: "pi pi-inbox",
    app: "integration_bus",
    group: "Intégrations",
    organizationScoped: true,
    readOnly: true,
    headerActions: [
      {
        label: "Distribuer maintenant",
        icon: "pi pi-send",
        endpoint: "/integration/outbox/dispatch",
        showResult: true,
        successMessage: "Distribution lancée.",
      },
    ],
    columns: [
      { key: "created_at", label: "Créé le", format: "datetime" },
      { key: "event_name", label: "Événement" },
      relationColumn("endpoint_id", "Destination", "/integration/endpoints", "name"),
      stateColumn(OUTBOX_STATUSES, { pending: "info", delivering: "warning", delivered: "success", failed: "danger", dead: "danger" }, "status", "Statut"),
      { key: "attempts", label: "Tentatives", format: "count" },
      { key: "last_status_code", label: "HTTP" },
      { key: "last_error", label: "Dernière erreur" },
    ],
    fields: [],
    rowActions: [
      action("Relancer", "pi pi-refresh", "retry", ["failed", "dead"], {
        successMessage: "Message remis en file d’envoi.",
      }, "status"),
    ],
  },
  {
    key: "integration-inbound-sources",
    endpoint: "/integration/inbound-sources",
    title: "Sources entrantes",
    singular: "source entrante",
    icon: "pi pi-download",
    app: "integration_bus",
    group: "Intégrations",
    organizationScoped: true,
    description: "Webhooks reçus des partenaires (paiement mobile, OTA…), vérifiés par signature.",
    columns: [
      { key: "name", label: "Nom" },
      { key: "key", label: "Clé d’URL" },
      { key: "provider", label: "Fournisseur", format: "badge", labels: WEBHOOK_PROVIDERS, badgeDefault: "info" },
      { key: "received_count", label: "Reçus", format: "count" },
      { key: "rejected_count", label: "Rejetés", format: "count" },
      { key: "last_received_at", label: "Dernière réception", format: "datetime" },
      activeColumn,
    ],
    fields: [
      { key: "name", label: "Nom", type: "text", required: true },
      { key: "provider", label: "Fournisseur", type: "select", options: opts(WEBHOOK_PROVIDERS) },
      { key: "secret", label: "Secret partagé", type: "password", createOnly: true, help: "Généré automatiquement si vide." },
      { key: "signature_scheme", label: "Schéma de signature", type: "select", options: opts(SIGNATURE_SCHEMES) },
      { key: "signature_header", label: "En-tête de signature", type: "text", help: "Obligatoire pour le schéma HMAC hexadécimal." },
      { key: "signature_prefix", label: "Préfixe de signature", type: "text" },
      { key: "tolerance_seconds", label: "Tolérance (secondes)", type: "number", min: 0 },
      { key: "event_id_path", label: "Chemin de l’identifiant", type: "text", placeholder: "data.id" },
      { key: "event_type_path", label: "Chemin du type d’événement", type: "text", placeholder: "type" },
      activeField,
    ],
    rowActions: [
      action("Nouvelle clé", "pi pi-key", "rotate-secret", null, {
        confirm: "Générer un nouveau secret ? Le partenaire devra utiliser la nouvelle valeur.",
        body: {},
        showResult: true,
        successMessage: "Nouveau secret généré : copiez-le, il ne sera plus affiché.",
      }),
    ],
  },
];

export const ERP_RESOURCES: ResourceConfig[] = [
  ...ACCOUNTING,
  ...INVENTORY,
  ...PURCHASE,
  ...HR,
  ...CRM,
  ...LOYALTY,
  ...STUDIO,
  ...AUTOMATION,
  ...INTEGRATION,
];
