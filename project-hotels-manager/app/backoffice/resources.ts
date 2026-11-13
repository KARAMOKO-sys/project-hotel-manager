export interface BackofficeAction {
  label: string;
  endpoint: string;
  body?: Record<string, unknown>;
  confirm?: boolean;
  method?: "patch" | "delete";
}

export interface BackofficeResource {
  id: string;
  label: string;
  endpoint: string;
  listEndpoint?: string;
  lookupByIdPrefix?: string;
  group: string;
  readOnly?: boolean;
  createEnabled?: boolean;
  updateEnabled?: boolean;
  deleteEnabled?: boolean;
  actions?: BackofficeAction[];
}

export const BACKOFFICE_GROUPS = [
  "Pilotage",
  "Hébergement",
  "Réservations",
  "Clients",
  "Finance",
  "Équipe",
  "Marketing",
  "Services",
  "Administration",
] as const;

export const BACKOFFICE_RESOURCES: BackofficeResource[] = [
  { id: "kpis", label: "Indicateurs", endpoint: "kpis", group: "Pilotage", readOnly: true },
  { id: "reports", label: "Rapports", endpoint: "reports", group: "Pilotage", readOnly: true },
  { id: "ia-predictions", label: "Prédictions IA", endpoint: "ia-predictions", group: "Pilotage", readOnly: true },
  { id: "sentiment-analyses", label: "Analyse de sentiment", endpoint: "sentiment-analyses", group: "Pilotage", readOnly: true },
  { id: "properties", label: "Établissements", endpoint: "properties", group: "Hébergement" },
  { id: "room-types", label: "Types de chambres", endpoint: "room-types", group: "Hébergement" },
  { id: "rooms", label: "Chambres", endpoint: "rooms", group: "Hébergement" },
  { id: "blocked-dates", label: "Dates bloquées", endpoint: "blocked-dates", group: "Hébergement" },
  { id: "daily-prices", label: "Tarifs journaliers", endpoint: "daily-prices", group: "Hébergement" },
  { id: "rate-plans", label: "Plans tarifaires", endpoint: "rate-plans", group: "Hébergement" },
  { id: "dynamic-pricing-rules", label: "Tarification dynamique", endpoint: "dynamic-pricing-rules", group: "Hébergement" },
  {
    id: "reservations",
    label: "Réservations",
    endpoint: "reservations",
    group: "Réservations",
    actions: [
      { label: "Confirmer", endpoint: "confirm" },
      { label: "Arrivée", endpoint: "check-in" },
      { label: "Départ", endpoint: "check-out" },
      { label: "No-show", endpoint: "no-show" },
      {
        label: "Annuler",
        endpoint: "cancel",
        body: { reason: "Annulée depuis le backoffice" },
        confirm: true,
      },
    ],
  },
  { id: "reservation-rooms", label: "Chambres réservées", endpoint: "reservation-rooms", group: "Réservations" },
  { id: "waitlist", label: "Liste d’attente", endpoint: "waitlist", group: "Réservations" },
  {
    id: "guests",
    label: "Clients",
    endpoint: "guests",
    group: "Clients",
    actions: [
      { label: "Activer", endpoint: "activate" },
      { label: "Désactiver", endpoint: "deactivate", confirm: true },
    ],
  },
  { id: "guest-preferences", label: "Préférences clients", endpoint: "guest-preferences", group: "Clients" },
  { id: "guest-segments", label: "Segments clients", endpoint: "guest-segments", group: "Clients" },
  { id: "guest-requests", label: "Demandes clients", endpoint: "guest-requests", group: "Clients" },
  {
    id: "recommendations",
    label: "Recommandations",
    endpoint: "recommendations",
    group: "Clients",
    actions: [
      { label: "Présentée", endpoint: "shown" },
      { label: "Accepter", endpoint: "accept" },
      { label: "Ignorer", endpoint: "dismiss" },
    ],
  },
  { id: "invoices", label: "Factures", endpoint: "invoices", group: "Finance" },
  { id: "invoice-items", label: "Lignes de facture", endpoint: "invoice-items", group: "Finance" },
  {
    id: "payments",
    label: "Paiements",
    endpoint: "payments",
    group: "Finance",
    actions: [{ label: "Marquer payé", endpoint: "complete", confirm: true }],
  },
  { id: "tax-rates", label: "Taxes", endpoint: "tax-rates", group: "Finance" },
  { id: "pos-transactions", label: "Transactions point de vente", endpoint: "pos-transactions", group: "Finance" },
  { id: "pos-items", label: "Articles point de vente", endpoint: "pos-items", group: "Finance" },
  {
    id: "staff",
    label: "Personnel",
    endpoint: "staff",
    group: "Équipe",
    actions: [
      { label: "Réactiver", endpoint: "reactivate" },
      { label: "Retour de congé", endpoint: "return" },
      { label: "Suspendre", endpoint: "suspend", body: {}, confirm: true },
    ],
  },
  { id: "admins", label: "Administrateurs", endpoint: "admins", group: "Équipe" },
  { id: "owners", label: "Propriétaires", endpoint: "owners", group: "Équipe" },
  { id: "receptionists", label: "Réceptionnistes", endpoint: "receptionists", group: "Équipe" },
  { id: "housekeeping-staff", label: "Personnel d’entretien", endpoint: "housekeeping-staff", group: "Équipe" },
  { id: "accountants", label: "Comptables", endpoint: "accountants", group: "Équipe" },
  { id: "housekeeping", label: "Ménage", endpoint: "housekeeping", group: "Services" },
  { id: "maintenance-requests", label: "Maintenance", endpoint: "maintenance-requests", group: "Services" },
  { id: "campaigns", label: "Campagnes", endpoint: "campaigns", group: "Marketing" },
  { id: "campaign-analytics", label: "Statistiques des campagnes", endpoint: "campaign-analytics", group: "Marketing", readOnly: true },
  { id: "partners", label: "Partenaires", endpoint: "partners", group: "Marketing" },
  { id: "ota-connections", label: "Canaux de réservation", endpoint: "ota-connections", group: "Marketing" },
  { id: "chatbot-conversations", label: "Conversations chatbot", endpoint: "chatbot-conversations", group: "Services" },
  { id: "chatbot-messages", label: "Messages chatbot", endpoint: "chatbot-messages", group: "Services" },
  { id: "organizations", label: "Organisations", endpoint: "organizations", group: "Administration" },
  { id: "roles", label: "Rôles", endpoint: "roles", group: "Administration" },
  {
    id: "user-roles",
    label: "Affectations de rôles",
    endpoint: "user-roles",
    listEndpoint: "user-roles/me",
    lookupByIdPrefix: "user/",
    group: "Administration",
    updateEnabled: false,
  },
  {
    id: "sessions",
    label: "Sessions",
    endpoint: "sessions",
    listEndpoint: "sessions/me",
    lookupByIdPrefix: "user/",
    group: "Administration",
    readOnly: true,
    actions: [
      {
        label: "Révoquer",
        endpoint: "",
        method: "delete",
        confirm: true,
      },
    ],
  },
  { id: "audit-logs", label: "Journal d’audit", endpoint: "audit-logs", group: "Administration", readOnly: true },
  { id: "webhook-logs", label: "Journaux webhook", endpoint: "webhook-logs", group: "Administration", readOnly: true },
  {
    id: "notification-logs",
    label: "Journaux notifications",
    endpoint: "notification-logs",
    group: "Administration",
    readOnly: true,
    actions: [
      { label: "Envoyée", endpoint: "sent", body: {} },
      { label: "Livrée", endpoint: "delivered" },
      { label: "Lue", endpoint: "read" },
      { label: "Relancer", endpoint: "retry", confirm: true },
    ],
  },
  { id: "contact-messages", label: "Messages de contact", endpoint: "contact-messages", group: "Administration" },
  { id: "newsletter-subscriptions", label: "Abonnés newsletter", endpoint: "newsletter-subscriptions", group: "Administration", readOnly: true },
];

export function getResource(id: string) {
  return BACKOFFICE_RESOURCES.find((resource) => resource.id === id);
}
