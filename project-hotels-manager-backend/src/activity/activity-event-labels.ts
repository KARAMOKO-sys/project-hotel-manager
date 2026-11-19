import {
  DomainEventName,
  DomainEvents,
} from '../platform/events/domain-events';

/**
 * Libellé français de chaque événement métier, utilisé dans le fil de
 * discussion (messages de suivi) et dans l'éditeur de règles.
 *
 * Typé `Record<DomainEventName, string>` : l'ajout d'un événement au
 * catalogue sans libellé provoque une erreur de compilation.
 */
export const DOMAIN_EVENT_LABELS: Record<DomainEventName, string> = {
  [DomainEvents.RESERVATION_CREATED]: 'Réservation créée',
  [DomainEvents.RESERVATION_CONFIRMED]: 'Réservation confirmée',
  [DomainEvents.RESERVATION_CANCELLED]: 'Réservation annulée',
  [DomainEvents.RESERVATION_CHECKED_IN]: 'Arrivée du client enregistrée',
  [DomainEvents.RESERVATION_CHECKED_OUT]: 'Départ du client enregistré',
  [DomainEvents.RESERVATION_NO_SHOW]: 'Client non présenté (no-show)',

  [DomainEvents.HOUSEKEEPING_TASK_COMPLETED]: 'Tâche de ménage terminée',
  [DomainEvents.MAINTENANCE_REQUEST_CREATED]: 'Demande de maintenance créée',

  [DomainEvents.INVOICE_CREATED]: 'Facture créée',
  [DomainEvents.INVOICE_PAID]: 'Facture payée',
  [DomainEvents.INVOICE_CANCELLED]: 'Facture annulée',
  [DomainEvents.PAYMENT_COMPLETED]: 'Paiement encaissé',
  [DomainEvents.PAYMENT_REFUNDED]: 'Paiement remboursé',
  [DomainEvents.POS_TRANSACTION_COMPLETED]: 'Vente au point de vente validée',
  [DomainEvents.POS_TRANSACTION_VOIDED]: 'Vente au point de vente annulée',

  [DomainEvents.JOURNAL_ENTRY_POSTED]: 'Écriture comptable validée',
  [DomainEvents.JOURNAL_ENTRY_REVERSED]: 'Écriture comptable extournée',

  [DomainEvents.STOCK_MOVE_DONE]: 'Mouvement de stock effectué',
  [DomainEvents.STOCK_LOW]: 'Stock bas',
  [DomainEvents.PURCHASE_ORDER_CONFIRMED]: 'Bon de commande confirmé',
  [DomainEvents.PURCHASE_ORDER_RECEIVED]: 'Bon de commande réceptionné',
  [DomainEvents.VENDOR_BILL_POSTED]: 'Facture fournisseur validée',

  [DomainEvents.LEAVE_REQUESTED]: 'Demande de congé soumise',
  [DomainEvents.LEAVE_APPROVED]: 'Demande de congé approuvée',
  [DomainEvents.LEAVE_REFUSED]: 'Demande de congé refusée',
  [DomainEvents.ATTENDANCE_CHECKED_IN]: 'Pointage d’arrivée enregistré',

  [DomainEvents.LEAD_CREATED]: 'Piste créée',
  [DomainEvents.LEAD_STAGE_CHANGED]: 'Étape de la piste modifiée',
  [DomainEvents.LEAD_WON]: 'Piste gagnée',
  [DomainEvents.LEAD_LOST]: 'Piste perdue',
  [DomainEvents.LOYALTY_POINTS_EARNED]: 'Points de fidélité gagnés',
  [DomainEvents.LOYALTY_POINTS_REDEEMED]: 'Points de fidélité utilisés',
  [DomainEvents.LOYALTY_TIER_CHANGED]: 'Palier de fidélité modifié',

  [DomainEvents.APP_INSTALLED]: 'Application installée',
  [DomainEvents.APP_UNINSTALLED]: 'Application désinstallée',
  [DomainEvents.RECORD_CREATED]: 'Fiche créée',
  [DomainEvents.RECORD_UPDATED]: 'Fiche modifiée',
  [DomainEvents.ACTIVITY_DUE]: 'Activité arrivée à échéance',
};

/** Libellé d'un événement ; repli sur son nom technique s'il est inconnu. */
export function labelForEvent(name: string): string {
  return (DOMAIN_EVENT_LABELS as Record<string, string>)[name] ?? name;
}
