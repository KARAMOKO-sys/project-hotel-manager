// src/lib/resources.ts
// Définition déclarative des ressources CRUD du backoffice, utilisée par le
// composant générique ResourcePage et la barre de navigation.
// Les champs correspondent aux schémas Mongoose du backend.

import type { Entity } from "./types";
import { ERP_RESOURCES } from "./erp-resources";

export type BadgeTone = "success" | "warning" | "danger" | "info" | "muted";

export type ColumnFormat =
  | "text"
  | "name"
  | "date"
  | "datetime"
  | "money"
  | "badge"
  | "boolean"
  | "count"
  | "relation";

export interface ResourceColumn {
  key: string;
  label: string;
  format?: ColumnFormat;
  /** Correspondance valeur -> tonalité de badge. */
  badgeMap?: Record<string, BadgeTone>;
  /** Tonalité utilisée quand aucune correspondance n'est trouvée. */
  badgeDefault?: BadgeTone;
  /** Libellés affichés à la place des valeurs brutes (badges). */
  labels?: Record<string, string>;
  /** Format `relation` : liste à charger pour traduire l'identifiant. */
  relationEndpoint?: string;
  /** Format `relation` : champ(s) libellé (voir `optionLabel`). */
  relationLabel?: string;
}

export type ResourceFieldType =
  | "text"
  | "email"
  | "url"
  | "password"
  | "number"
  | "date"
  | "datetime"
  | "time"
  | "boolean"
  | "select"
  | "relation"
  | "textarea"
  /** Liste de chaînes saisie séparée par des virgules ou des retours à la ligne. */
  | "list"
  /** Objet / tableau JSON saisi dans une zone de texte. */
  | "json"
  /** Tableau de lignes (sous-formulaire défini par `lineFields`). */
  | "lines";

export interface ResourceField {
  key: string;
  label: string;
  type: ResourceFieldType;
  required?: boolean;
  createOnly?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  step?: number;
  placeholder?: string;
  /** Texte d'aide affiché sous le champ. */
  help?: string;
  options?: Array<{ label: string; value: string }>;
  /** Liste servant d'options (`select` / `relation`). */
  optionsEndpoint?: string;
  /**
   * Champ libellé des options. `a|b` : premier champ renseigné ;
   * `a+b` : concaténation (ex. `code+name` → « 411 — Clients »).
   */
  optionLabel?: string;
  /** Champ valeur des options (par défaut `_id`). */
  optionValue?: string;
  /** Valeur par défaut à la création. */
  defaultValue?: string | boolean;
  /** Champs d'une ligne (type `lines`). */
  lineFields?: ResourceField[];
  /** Occupe toute la largeur du formulaire. */
  fullWidth?: boolean;
}

export interface VisibleWhen {
  key: string;
  in: string[];
}

export interface ResourceRowAction {
  label: string;
  icon: string;
  /** Chemin relatif : `post` → POST {endpoint}/{id}/post. */
  endpoint: string;
  method?: "post" | "patch";
  /** Message de confirmation (français). */
  confirm?: string;
  visibleWhen?: VisibleWhen;
  /**
   * Corps envoyé. `prompt:<libellé>` demande une valeur texte envoyée dans
   * `reason`.
   */
  body?: Record<string, unknown> | `prompt:${string}`;
  /** Champs demandés dans une boîte de dialogue avant l'envoi. */
  fields?: ResourceField[];
  /** Corps calculé depuis la ligne ; une chaîne est un message d'erreur. */
  buildBody?: (row: Entity) => Record<string, unknown> | string;
  tone?: "danger" | "success";
  /** Affiche la réponse du serveur (secret généré, résultat de test…). */
  showResult?: boolean;
  successMessage?: string;
}

export interface ResourceHeaderAction {
  label: string;
  icon: string;
  /** Chemin absolu (ex. `/accounting/setup`). */
  endpoint: string;
  confirm?: string;
  fields?: ResourceField[];
  /** Ajoute `property_id` (propriété courante) au corps. */
  includeProperty?: boolean;
  showResult?: boolean;
  successMessage?: string;
}

export interface ResourceConfig {
  key: string;
  endpoint: string;
  title: string;
  singular: string;
  icon: string;
  columns: ResourceColumn[];
  searchPlaceholder?: string;
  fields: ResourceField[];
  deleteProtectedKey?: string;
  /** Application ERP (clé du catalogue) requise pour afficher la ressource. */
  app?: string;
  /** Section du menu (par défaut « Hôtellerie »). */
  group?: string;
  /** Filtre les listes et préremplit `property_id` avec la propriété courante. */
  propertyScoped?: boolean;
  /** Filtre les listes et préremplit `organization_id` avec l'établissement courant. */
  organizationScoped?: boolean;
  rowActions?: ResourceRowAction[];
  headerActions?: ResourceHeaderAction[];
  /** Consultation seule (ni création, ni modification, ni suppression). */
  readOnly?: boolean;
  createEnabled?: boolean;
  editEnabled?: boolean;
  deleteEnabled?: boolean;
  /** Modification autorisée seulement pour ces valeurs. */
  editableWhen?: VisibleWhen;
  /** Suppression autorisée seulement pour ces valeurs. */
  deletableWhen?: VisibleWhen;
  /** Texte d'aide affiché sous le titre. */
  description?: string;
}

const HOTEL_RESOURCES: ResourceConfig[] = [
  {
    key: "organizations",
    endpoint: "/organizations",
    title: "Établissements",
    singular: "établissement",
    icon: "pi pi-sitemap",
    searchPlaceholder: "Rechercher un établissement…",
    columns: [
      { key: "name", label: "Nom" },
      { key: "code", label: "Code" },
      {
        key: "type",
        label: "Type",
        format: "badge",
        badgeMap: { chain: "info", group: "info", independent: "success" },
      },
      { key: "website", label: "Site web" },
      {
        key: "status",
        label: "Statut",
        format: "badge",
        badgeMap: { active: "success", inactive: "muted", suspended: "danger" },
      },
    ],
    fields: [
      { key: "name", label: "Nom", type: "text", required: true },
      { key: "code", label: "Code", type: "text", required: true },
      {
        key: "type",
        label: "Type",
        type: "select",
        options: [
          { label: "Groupe", value: "group" },
          { label: "Chaîne", value: "chain" },
          { label: "Indépendant", value: "independent" },
        ],
      },
      { key: "website", label: "Site web", type: "url" },
      { key: "contact.email", label: "E-mail de contact", type: "email" },
      { key: "address.city", label: "Ville", type: "text" },
      {
        key: "status",
        label: "Statut",
        type: "select",
        options: [
          { label: "Actif", value: "active" },
          { label: "Inactif", value: "inactive" },
          { label: "Suspendu", value: "suspended" },
        ],
      },
      { key: "is_active", label: "Actif", type: "boolean" },
    ],
  },
  {
    key: "properties",
    endpoint: "/properties",
    title: "Propriétés",
    singular: "propriété",
    icon: "pi pi-building",
    searchPlaceholder: "Rechercher une propriété…",
    columns: [
      { key: "name", label: "Nom" },
      { key: "code", label: "Code" },
      {
        key: "type",
        label: "Type",
        format: "badge",
        badgeMap: {
          hotel: "info",
          residence: "info",
          villa: "success",
          apartment: "success",
          lodge: "warning",
          guest_house: "warning",
        },
      },
      { key: "star_rating", label: "Étoiles", format: "count" },
      {
        key: "status",
        label: "Statut",
        format: "badge",
        badgeMap: {
          active: "success",
          inactive: "muted",
          renovation: "warning",
          suspended: "danger",
        },
      },
    ],
    fields: [
      {
        key: "organization_id",
        label: "Établissement",
        type: "select",
        required: true,
        optionsEndpoint: "/organizations",
        optionLabel: "name",
      },
      { key: "name", label: "Nom", type: "text", required: true },
      { key: "code", label: "Code", type: "text", required: true },
      {
        key: "type",
        label: "Type",
        type: "select",
        options: [
          { label: "Hôtel", value: "hotel" },
          { label: "Résidence", value: "residence" },
          { label: "Villa", value: "villa" },
          { label: "Appartement", value: "apartment" },
          { label: "Lodge", value: "lodge" },
          { label: "Maison d’hôtes", value: "guest_house" },
          { label: "Motel", value: "motel" },
          { label: "Studio", value: "studio" },
        ],
      },
      { key: "star_rating", label: "Étoiles", type: "number", min: 1, max: 5 },
      { key: "address.city", label: "Ville", type: "text" },
      { key: "address.country", label: "Pays", type: "text" },
    ],
  },
  {
    key: "rooms",
    endpoint: "/rooms",
    title: "Chambres",
    singular: "chambre",
    icon: "pi pi-home",
    searchPlaceholder: "Rechercher une chambre…",
    columns: [
      { key: "number", label: "N°" },
      { key: "floor", label: "Étage", format: "count" },
      { key: "max_occupancy", label: "Occupants max", format: "count" },
      {
        key: "status",
        label: "Statut",
        format: "badge",
        badgeMap: {
          clean: "success",
          dirty: "warning",
          inspection: "warning",
          maintenance: "danger",
          blocked: "danger",
          occupied: "info",
        },
      },
      { key: "room_type_id", label: "Type (ID)" },
    ],
    fields: [
      {
        key: "property_id",
        label: "Propriété",
        type: "select",
        required: true,
        optionsEndpoint: "/properties",
        optionLabel: "name",
      },
      {
        key: "room_type_id",
        label: "Type de chambre",
        type: "select",
        required: true,
        optionsEndpoint: "/room-types",
        optionLabel: "name",
      },
      { key: "number", label: "Numéro", type: "text", required: true },
      { key: "floor", label: "Étage", type: "number", min: 0 },
      { key: "max_occupancy", label: "Occupation maximale", type: "number", min: 1 },
      {
        key: "status",
        label: "Statut",
        type: "select",
        options: [
          { label: "Propre", value: "clean" },
          { label: "À nettoyer", value: "dirty" },
          { label: "Inspection", value: "inspection" },
          { label: "Maintenance", value: "maintenance" },
          { label: "Bloquée", value: "blocked" },
          { label: "Occupée", value: "occupied" },
        ],
      },
      { key: "is_active", label: "Active", type: "boolean" },
    ],
  },
  {
    key: "reservations",
    endpoint: "/reservations",
    title: "Réservations",
    singular: "réservation",
    icon: "pi pi-calendar",
    searchPlaceholder: "Rechercher une réservation…",
    columns: [
      { key: "confirmation_code", label: "Confirmation" },
      { key: "check_in", label: "Arrivée", format: "date" },
      { key: "check_out", label: "Départ", format: "date" },
      { key: "adults", label: "Adultes", format: "count" },
      { key: "total_amount", label: "Total", format: "money" },
      {
        key: "status",
        label: "Statut",
        format: "badge",
        badgeMap: {
          pending: "warning",
          confirmed: "info",
          checked_in: "success",
          checked_out: "success",
          cancelled: "danger",
          no_show: "danger",
        },
      },
    ],
    fields: [
      {
        key: "property_id",
        label: "Propriété",
        type: "select",
        required: true,
        optionsEndpoint: "/properties",
        optionLabel: "name",
      },
      {
        key: "guest_id",
        label: "Client",
        type: "select",
        required: true,
        optionsEndpoint: "/guests",
        optionLabel: "email",
      },
      {
        key: "room_type_id",
        label: "Type de chambre",
        type: "select",
        required: true,
        optionsEndpoint: "/room-types",
        optionLabel: "name",
      },
      { key: "check_in", label: "Arrivée", type: "date", required: true },
      { key: "check_out", label: "Départ", type: "date", required: true },
      { key: "adults", label: "Adultes", type: "number", min: 1 },
      { key: "children", label: "Enfants", type: "number", min: 0 },
    ],
  },
  {
    key: "guests",
    endpoint: "/guests",
    title: "Clients",
    singular: "client",
    icon: "pi pi-users",
    searchPlaceholder: "Rechercher un client…",
    columns: [
      { key: "first_name", label: "Client", format: "name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Téléphone" },
      { key: "loyalty_points", label: "Points", format: "count" },
      {
        key: "loyalty_tier",
        label: "Niveau",
        format: "badge",
        badgeMap: {
          bronze: "muted",
          silver: "info",
          gold: "warning",
          platinum: "success",
          diamond: "success",
        },
      },
      {
        key: "guest_status",
        label: "Statut",
        format: "badge",
        badgeMap: {
          active: "success",
          inactive: "muted",
          blocked: "danger",
          suspended: "danger",
        },
      },
    ],
    fields: [
      { key: "email", label: "E-mail", type: "email", required: true },
      {
        key: "password",
        label: "Mot de passe",
        type: "password",
        required: true,
        minLength: 6,
        createOnly: true,
      },
      { key: "first_name", label: "Prénom", type: "text" },
      { key: "last_name", label: "Nom", type: "text" },
      { key: "phone", label: "Téléphone", type: "text" },
      {
        key: "loyalty_tier",
        label: "Niveau fidélité",
        type: "select",
        options: [
          { label: "Bronze", value: "bronze" },
          { label: "Argent", value: "silver" },
          { label: "Or", value: "gold" },
          { label: "Platine", value: "platinum" },
          { label: "Diamant", value: "diamond" },
        ],
      },
      { key: "marketing_consent", label: "Consentement marketing", type: "boolean" },
    ],
  },
  {
    key: "invoices",
    endpoint: "/invoices",
    title: "Factures",
    singular: "facture",
    icon: "pi pi-file",
    searchPlaceholder: "Rechercher une facture…",
    columns: [
      { key: "invoice_number", label: "N° facture" },
      { key: "issue_date", label: "Émission", format: "date" },
      { key: "due_date", label: "Échéance", format: "date" },
      { key: "total_amount", label: "Montant", format: "money" },
      {
        key: "status",
        label: "Statut",
        format: "badge",
        badgeMap: {
          draft: "muted",
          issued: "info",
          paid: "success",
          overdue: "danger",
          cancelled: "warning",
          credit_note: "info",
        },
      },
    ],
    fields: [
      {
        key: "reservation_id",
        label: "Réservation",
        type: "select",
        optionsEndpoint: "/reservations",
        optionLabel: "confirmation_code",
      },
      {
        key: "guest_id",
        label: "Client",
        type: "select",
        optionsEndpoint: "/guests",
        optionLabel: "email",
      },
      {
        key: "property_id",
        label: "Propriété",
        type: "select",
        optionsEndpoint: "/properties",
        optionLabel: "name",
      },
      { key: "issue_date", label: "Date d’émission", type: "date" },
      { key: "due_date", label: "Date d’échéance", type: "date" },
      { key: "total_amount", label: "Montant total", type: "number", min: 0, step: 0.01 },
      {
        key: "currency",
        label: "Devise",
        type: "select",
        options: [
          { label: "EUR", value: "EUR" },
          { label: "USD", value: "USD" },
          { label: "XOF", value: "XOF" },
        ],
      },
    ],
  },
  {
    key: "payments",
    endpoint: "/payments",
    title: "Paiements",
    singular: "paiement",
    icon: "pi pi-credit-card",
    searchPlaceholder: "Rechercher un paiement…",
    columns: [
      { key: "payment_number", label: "N° paiement" },
      { key: "amount", label: "Montant", format: "money" },
      {
        key: "method",
        label: "Méthode",
        format: "badge",
        badgeMap: {
          cash: "success",
          card: "info",
          mobile_money: "info",
          bank_transfer: "warning",
          check: "warning",
          online: "info",
        },
      },
      { key: "paid_at", label: "Payé le", format: "date" },
      {
        key: "status",
        label: "Statut",
        format: "badge",
        badgeMap: {
          pending: "warning",
          completed: "success",
          failed: "danger",
          refunded: "danger",
          cancelled: "muted",
        },
      },
    ],
    fields: [
      {
        key: "invoice_id",
        label: "Facture",
        type: "select",
        optionsEndpoint: "/invoices",
        optionLabel: "invoice_number",
      },
      {
        key: "reservation_id",
        label: "Réservation",
        type: "select",
        optionsEndpoint: "/reservations",
        optionLabel: "confirmation_code",
      },
      { key: "amount.amount", label: "Montant", type: "number", min: 0, step: 0.01, required: true },
      {
        key: "amount.currency",
        label: "Devise",
        type: "select",
        required: true,
        options: [
          { label: "EUR", value: "EUR" },
          { label: "USD", value: "USD" },
          { label: "XOF", value: "XOF" },
        ],
      },
      {
        key: "method",
        label: "Méthode",
        type: "select",
        options: [
          { label: "Espèces", value: "cash" },
          { label: "Carte", value: "card" },
          { label: "Mobile money", value: "mobile_money" },
          { label: "Virement", value: "bank_transfer" },
          { label: "Chèque", value: "check" },
          { label: "En ligne", value: "online" },
        ],
      },
    ],
  },
  {
    key: "housekeeping",
    endpoint: "/housekeeping",
    title: "Ménage",
    singular: "tâche",
    icon: "pi pi-broom",
    searchPlaceholder: "Rechercher une tâche…",
    columns: [
      { key: "room_id", label: "Chambre (ID)" },
      { key: "staff_id", label: "Employé (ID)" },
      { key: "task_date", label: "Date", format: "date" },
      {
        key: "priority",
        label: "Priorité",
        format: "badge",
        badgeMap: {
          urgent: "danger",
          high: "warning",
          normal: "info",
          low: "muted",
        },
      },
      {
        key: "status",
        label: "Statut",
        format: "badge",
        badgeMap: {
          pending: "warning",
          in_progress: "info",
          completed: "success",
          skipped: "danger",
          inspected: "success",
        },
      },
    ],
    fields: [
      {
        key: "property_id",
        label: "Propriété",
        type: "select",
        required: true,
        optionsEndpoint: "/properties",
        optionLabel: "name",
      },
      {
        key: "room_id",
        label: "Chambre",
        type: "select",
        required: true,
        optionsEndpoint: "/rooms",
        optionLabel: "number",
      },
      {
        key: "staff_id",
        label: "Employé",
        type: "select",
        optionsEndpoint: "/housekeeping-staff",
        optionLabel: "first_name",
      },
      { key: "task_date", label: "Date", type: "date", required: true },
      {
        key: "priority",
        label: "Priorité",
        type: "select",
        options: [
          { label: "Faible", value: "low" },
          { label: "Normale", value: "normal" },
          { label: "Élevée", value: "high" },
          { label: "Urgente", value: "urgent" },
        ],
      },
      { key: "description", label: "Description", type: "text" },
    ],
  },
  {
    key: "campaigns",
    endpoint: "/campaigns",
    title: "Campagnes",
    singular: "campagne",
    icon: "pi pi-megaphone",
    searchPlaceholder: "Rechercher une campagne…",
    columns: [
      { key: "name", label: "Nom" },
      {
        key: "type",
        label: "Canal",
        format: "badge",
        badgeMap: { email: "info", sms: "success", push: "warning", offer: "info" },
      },
      { key: "scheduled_at", label: "Programmée", format: "date" },
      { key: "recipient_count", label: "Destinataires", format: "count" },
      {
        key: "status",
        label: "Statut",
        format: "badge",
        badgeMap: {
          draft: "muted",
          scheduled: "info",
          sending: "warning",
          sent: "success",
          cancelled: "danger",
        },
      },
    ],
    fields: [
      {
        key: "property_id",
        label: "Propriété",
        type: "select",
        optionsEndpoint: "/properties",
        optionLabel: "name",
      },
      { key: "name", label: "Nom", type: "text", required: true },
      {
        key: "type",
        label: "Canal",
        type: "select",
        options: [
          { label: "E-mail", value: "email" },
          { label: "SMS", value: "sms" },
          { label: "Notification push", value: "push" },
          { label: "Offre", value: "offer" },
        ],
      },
      { key: "subject", label: "Objet", type: "text" },
      { key: "scheduled_at", label: "Programmée le", type: "date" },
    ],
  },
  {
    key: "roles",
    endpoint: "/roles",
    title: "Rôles & permissions",
    singular: "rôle",
    icon: "pi pi-shield",
    searchPlaceholder: "Rechercher un rôle…",
    columns: [
      { key: "name", label: "Nom" },
      { key: "code", label: "Code" },
      { key: "description", label: "Description" },
      { key: "permissions", label: "Permissions", format: "count" },
      { key: "is_system", label: "Système", format: "boolean" },
    ],
    fields: [
      { key: "name", label: "Nom", type: "text", required: true },
      { key: "code", label: "Code", type: "text", required: true },
      { key: "description", label: "Description", type: "text" },
      { key: "role_level", label: "Niveau", type: "number", min: 0 },
      { key: "is_active", label: "Actif", type: "boolean" },
    ],
    deleteProtectedKey: "is_system",
  },
];

/** Section du menu des ressources hôtelières historiques. */
export const HOTEL_GROUP = "Hôtellerie";

export const RESOURCES: ResourceConfig[] = [
  ...HOTEL_RESOURCES.map((resource) => ({ group: HOTEL_GROUP, ...resource })),
  ...ERP_RESOURCES,
];

export function getResource(key: string): ResourceConfig | undefined {
  return RESOURCES.find((resource) => resource.key === key);
}
