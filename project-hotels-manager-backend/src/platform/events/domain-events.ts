/**
 * Catalogue des événements métier de PleasantStay.
 *
 * Les services publient ces événements via `DomainEventPublisher` ; les autres
 * applications (comptabilité, stock, fidélité, automatisations, ESB…) s'y
 * abonnent avec `@OnEvent(DomainEvents.X)` sans dépendre du module émetteur.
 *
 * Convention de nommage : `<domaine>.<entité>.<verbe au participe passé>`,
 * en anglais et en minuscules, stable dans le temps (les noms sont aussi
 * utilisés comme clés de routage sur l'ESB et dans les règles d'automatisation).
 */
export const DomainEvents = {
  // Réservations
  RESERVATION_CREATED: 'hotel.reservation.created',
  RESERVATION_CONFIRMED: 'hotel.reservation.confirmed',
  RESERVATION_CANCELLED: 'hotel.reservation.cancelled',
  RESERVATION_CHECKED_IN: 'hotel.reservation.checked_in',
  RESERVATION_CHECKED_OUT: 'hotel.reservation.checked_out',
  RESERVATION_NO_SHOW: 'hotel.reservation.no_show',

  // Opérations
  HOUSEKEEPING_TASK_COMPLETED: 'hotel.housekeeping.completed',
  MAINTENANCE_REQUEST_CREATED: 'hotel.maintenance.created',

  // Facturation, paiements, point de vente
  INVOICE_CREATED: 'billing.invoice.created',
  INVOICE_PAID: 'billing.invoice.paid',
  INVOICE_CANCELLED: 'billing.invoice.cancelled',
  PAYMENT_COMPLETED: 'billing.payment.completed',
  PAYMENT_REFUNDED: 'billing.payment.refunded',
  POS_TRANSACTION_COMPLETED: 'pos.transaction.completed',
  POS_TRANSACTION_VOIDED: 'pos.transaction.voided',

  // Comptabilité
  JOURNAL_ENTRY_POSTED: 'accounting.entry.posted',
  JOURNAL_ENTRY_REVERSED: 'accounting.entry.reversed',

  // Stock et achats
  STOCK_MOVE_DONE: 'inventory.move.done',
  STOCK_LOW: 'inventory.stock.low',
  PURCHASE_ORDER_CONFIRMED: 'purchase.order.confirmed',
  PURCHASE_ORDER_RECEIVED: 'purchase.order.received',
  VENDOR_BILL_POSTED: 'purchase.bill.posted',

  // Ressources humaines
  LEAVE_REQUESTED: 'hr.leave.requested',
  LEAVE_APPROVED: 'hr.leave.approved',
  LEAVE_REFUSED: 'hr.leave.refused',
  ATTENDANCE_CHECKED_IN: 'hr.attendance.checked_in',

  // CRM et fidélité
  LEAD_CREATED: 'crm.lead.created',
  LEAD_STAGE_CHANGED: 'crm.lead.stage_changed',
  LEAD_WON: 'crm.lead.won',
  LEAD_LOST: 'crm.lead.lost',
  LOYALTY_POINTS_EARNED: 'loyalty.points.earned',
  LOYALTY_POINTS_REDEEMED: 'loyalty.points.redeemed',
  LOYALTY_TIER_CHANGED: 'loyalty.tier.changed',

  // Plateforme
  APP_INSTALLED: 'platform.app.installed',
  APP_UNINSTALLED: 'platform.app.uninstalled',
  RECORD_CREATED: 'platform.record.created',
  RECORD_UPDATED: 'platform.record.updated',
  ACTIVITY_DUE: 'platform.activity.due',
} as const;

export type DomainEventName = (typeof DomainEvents)[keyof typeof DomainEvents];

/** Liste de tous les noms d'événements (pour les écrans de configuration). */
export const DOMAIN_EVENT_NAMES: DomainEventName[] =
  Object.values(DomainEvents);

/** Référence vers la fiche concernée par un événement. */
export interface RecordRef {
  /** Nom du modèle Mongoose (ex. `Reservation`, `Invoice`). */
  model: string;
  id: string;
}

/**
 * Enveloppe commune à tous les événements métier.
 * `payload` contient une copie légère de la fiche (jamais de secret).
 */
export interface DomainEvent<TPayload = Record<string, unknown>> {
  /** Identifiant unique (sert de clé d'idempotence sur l'ESB). */
  id: string;
  name: DomainEventName;
  occurred_at: Date;
  organization_id?: string;
  property_id?: string;
  /** Utilisateur à l'origine de l'action, si connu. */
  actor_id?: string;
  record?: RecordRef;
  payload: TPayload;
}

/** Données fournies par l'émetteur ; `id` et `occurred_at` sont ajoutés. */
export type DomainEventInput<TPayload = Record<string, unknown>> = Omit<
  DomainEvent<TPayload>,
  'id' | 'occurred_at' | 'name'
>;
