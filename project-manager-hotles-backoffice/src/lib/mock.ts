// src/lib/mock.ts
// Données de démonstration utilisées comme repli quand le backend est
// indisponible, afin que le backoffice reste utilisable en mode démo.
// Les champs reflètent les schémas Mongoose du backend.

import type {
  Campaign,
  Entity,
  Guest,
  HousekeepingTask,
  Invoice,
  Organization,
  Payment,
  Property,
  Reservation,
  Role,
  Room,
  PaginatedResult,
} from "./types";

export interface ListQuery {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
}

const iso = (daysOffset: number, hour = 10): string => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

const MOCK: Record<string, Entity[]> = {
  organizations: [
    { _id: "org_1", name: "Groupe Riviera", code: "RIV", type: "group", website: "riviera.com", status: "active", is_active: true, contact: { email: "contact@riviera.com", phone: "+33 4 93 00 11 22" }, created_at: iso(-400) },
    { _id: "org_2", name: "Hôtels du Marais", code: "MAR", type: "independent", website: "marais.fr", status: "active", is_active: true, contact: { email: "hello@marais.fr", phone: "+33 1 42 00 33 44" }, created_at: iso(-320) },
    { _id: "org_3", name: "PleasantStay Paris", code: "PSP", type: "chain", website: "pleasantstay.com", status: "active", is_active: true, contact: { email: "paris@pleasantstay.com", phone: "+33 1 40 55 66 77" }, created_at: iso(-200) },
    { _id: "org_4", name: "Azur Hospitality", code: "AZR", type: "group", website: "azur-hospitality.com", status: "suspended", is_active: false, contact: { email: "ops@azur.com", phone: "+33 4 92 11 88 99" }, created_at: iso(-90) },
  ] as Organization[],

  properties: [
    { _id: "prop_1", name: "PleasantStay Opéra", code: "PS-OPR", type: "hotel", star_rating: 4, status: "active", organization_id: "org_3", address: { city: "Paris", country: "France" }, is_active: true, created_at: iso(-300) },
    { _id: "prop_2", name: "PleasantStay Riviera", code: "PS-RIV", type: "residence", star_rating: 5, status: "active", organization_id: "org_1", address: { city: "Nice", country: "France" }, is_active: true, created_at: iso(-250) },
    { _id: "prop_3", name: "Le Marais Boutique", code: "MAR-BOU", type: "guest_house", star_rating: 3, status: "active", organization_id: "org_2", address: { city: "Paris", country: "France" }, is_active: true, created_at: iso(-180) },
    { _id: "prop_4", name: "Azur Beach Club", code: "AZR-BCH", type: "villa", star_rating: 4, status: "renovation", organization_id: "org_4", address: { city: "Cannes", country: "France" }, is_active: true, created_at: iso(-60) },
    { _id: "prop_5", name: "PleasantStay Lyon", code: "PS-LYO", type: "hotel", star_rating: 3, status: "active", organization_id: "org_3", address: { city: "Lyon", country: "France" }, is_active: true, created_at: iso(-40) },
  ] as Property[],

  rooms: [
    { _id: "room_1", number: "101", floor: 1, status: "clean", max_occupancy: 2, room_type_id: "rt_std", property_id: "prop_1", is_active: true, created_at: iso(-280) },
    { _id: "room_2", number: "102", floor: 1, status: "occupied", max_occupancy: 2, room_type_id: "rt_std", property_id: "prop_1", is_active: true, created_at: iso(-280) },
    { _id: "room_3", number: "201", floor: 2, status: "dirty", max_occupancy: 2, room_type_id: "rt_dlx", property_id: "prop_1", is_active: true, created_at: iso(-275) },
    { _id: "room_4", number: "301", floor: 3, status: "maintenance", max_occupancy: 4, room_type_id: "rt_suite", property_id: "prop_1", is_active: true, created_at: iso(-270) },
    { _id: "room_5", number: "401", floor: 4, status: "inspection", max_occupancy: 4, room_type_id: "rt_suite", property_id: "prop_1", is_active: true, created_at: iso(-265) },
    { _id: "room_6", number: "10", floor: 1, status: "clean", max_occupancy: 2, room_type_id: "rt_sea", property_id: "prop_2", is_active: true, created_at: iso(-260) },
    { _id: "room_7", number: "11", floor: 1, status: "occupied", max_occupancy: 2, room_type_id: "rt_garden", property_id: "prop_2", is_active: true, created_at: iso(-255) },
    { _id: "room_8", number: "20", floor: 2, status: "blocked", max_occupancy: 3, room_type_id: "rt_duplex", property_id: "prop_2", is_active: true, created_at: iso(-250) },
  ] as Room[],

  guests: [
    { _id: "guest_1", first_name: "Sophie", last_name: "Martin", email: "sophie.martin@mail.com", phone: "+33 6 12 34 56 78", guest_status: "active", loyalty_points: 1240, loyalty_tier: "silver", is_active: true, created_at: iso(-120) },
    { _id: "guest_2", first_name: "Lucas", last_name: "Bernard", email: "lucas.bernard@mail.com", phone: "+33 6 23 45 67 89", guest_status: "active", loyalty_points: 860, loyalty_tier: "bronze", is_active: true, created_at: iso(-110) },
    { _id: "guest_3", first_name: "Emma", last_name: "Dubois", email: "emma.dubois@mail.com", phone: "+33 6 34 56 78 90", guest_status: "active", loyalty_points: 2210, loyalty_tier: "silver", is_active: true, created_at: iso(-95) },
    { _id: "guest_4", first_name: "Hugo", last_name: "Moreau", email: "hugo.moreau@mail.com", phone: "+33 6 45 67 89 01", guest_status: "inactive", loyalty_points: 340, loyalty_tier: "bronze", is_active: false, created_at: iso(-80) },
    { _id: "guest_5", first_name: "Chloé", last_name: "Laurent", email: "chloe.laurent@mail.com", phone: "+33 6 56 78 90 12", guest_status: "active", loyalty_points: 1780, loyalty_tier: "silver", is_active: true, created_at: iso(-60) },
    { _id: "guest_6", first_name: "Nathan", last_name: "Garcia", email: "nathan.garcia@mail.com", phone: "+33 6 67 89 01 23", guest_status: "active", loyalty_points: 990, loyalty_tier: "bronze", is_active: true, created_at: iso(-45) },
    { _id: "guest_7", first_name: "Léa", last_name: "Roux", email: "lea.roux@mail.com", phone: "+33 6 78 90 12 34", guest_status: "active", loyalty_points: 4450, loyalty_tier: "gold", is_active: true, created_at: iso(-30) },
    { _id: "guest_8", first_name: "Thomas", last_name: "Fournier", email: "thomas.fournier@mail.com", phone: "+33 6 89 01 23 45", guest_status: "blocked", loyalty_points: 620, loyalty_tier: "bronze", is_active: false, created_at: iso(-15) },
  ] as Guest[],

  reservations: [
    { _id: "res_1", confirmation_code: "PS-240912-A1", guest_id: "guest_1", check_in: iso(-1, 15), check_out: iso(2, 11), status: "checked_in", adults: 2, children: 0, total_amount: { amount: 356, currency: "EUR" }, created_at: iso(-3) },
    { _id: "res_2", confirmation_code: "PS-240915-B2", guest_id: "guest_2", check_in: iso(0, 15), check_out: iso(3, 11), status: "confirmed", adults: 2, children: 1, total_amount: { amount: 447, currency: "EUR" }, created_at: iso(-2) },
    { _id: "res_3", confirmation_code: "PS-240918-C3", guest_id: "guest_3", check_in: iso(1, 15), check_out: iso(4, 11), status: "pending", adults: 4, children: 0, total_amount: { amount: 657, currency: "EUR" }, created_at: iso(-1) },
    { _id: "res_4", confirmation_code: "PS-240920-D4", guest_id: "guest_5", check_in: iso(2, 15), check_out: iso(5, 11), status: "confirmed", adults: 2, children: 0, total_amount: { amount: 378, currency: "EUR" }, created_at: iso(0) },
    { _id: "res_5", confirmation_code: "PS-240922-E5", guest_id: "guest_6", check_in: iso(3, 15), check_out: iso(6, 11), status: "cancelled", adults: 2, children: 0, total_amount: { amount: 159, currency: "EUR" }, created_at: iso(1) },
    { _id: "res_6", confirmation_code: "PS-240924-F6", guest_id: "guest_7", check_in: iso(4, 15), check_out: iso(7, 11), status: "no_show", adults: 4, children: 0, total_amount: { amount: 349, currency: "EUR" }, created_at: iso(2) },
    { _id: "res_7", confirmation_code: "PS-240926-G7", guest_id: "guest_8", check_in: iso(5, 15), check_out: iso(8, 11), status: "checked_out", adults: 3, children: 0, total_amount: { amount: 238, currency: "EUR" }, created_at: iso(3) },
  ] as Reservation[],

  invoices: [
    { _id: "inv_1", invoice_number: "FAC-2024-0001", issue_date: iso(-3), due_date: iso(11), total_amount: 356, currency: "EUR", status: "paid", reservation_id: "res_1", created_at: iso(-3) },
    { _id: "inv_2", invoice_number: "FAC-2024-0002", issue_date: iso(-2), due_date: iso(12), total_amount: 447, currency: "EUR", status: "issued", reservation_id: "res_2", created_at: iso(-2) },
    { _id: "inv_3", invoice_number: "FAC-2024-0003", issue_date: iso(-1), due_date: iso(13), total_amount: 657, currency: "EUR", status: "draft", reservation_id: "res_3", created_at: iso(-1) },
    { _id: "inv_4", invoice_number: "FAC-2024-0004", issue_date: iso(-8), due_date: iso(-1), total_amount: 520, currency: "EUR", status: "overdue", reservation_id: "res_5", created_at: iso(-8) },
    { _id: "inv_5", invoice_number: "FAC-2024-0005", issue_date: iso(-12), due_date: iso(-5), total_amount: 890, currency: "EUR", status: "credit_note", reservation_id: "res_6", created_at: iso(-12) },
  ] as Invoice[],

  payments: [
    { _id: "pay_1", payment_number: "PAY-240912-01", amount: { amount: 356, currency: "EUR" }, method: "card", status: "completed", transaction_id: "TXN-77881", paid_at: iso(-1, 16) },
    { _id: "pay_2", payment_number: "PAY-240913-02", amount: { amount: 120, currency: "EUR" }, method: "cash", status: "completed", transaction_id: "TXN-77882", paid_at: iso(0, 9) },
    { _id: "pay_3", payment_number: "PAY-240914-03", amount: { amount: 447, currency: "EUR" }, method: "mobile_money", status: "pending", transaction_id: "TXN-77883", paid_at: iso(0, 14) },
    { _id: "pay_4", payment_number: "PAY-240915-04", amount: { amount: 89, currency: "EUR" }, method: "bank_transfer", status: "refunded", transaction_id: "TXN-77884", paid_at: iso(1, 10) },
  ] as Payment[],

  housekeeping: [
    { _id: "hk_1", room_id: "room_1", staff_id: "staff_1", task_date: iso(0, 8), priority: "normal", status: "pending" },
    { _id: "hk_2", room_id: "room_2", staff_id: "staff_2", task_date: iso(0, 9), priority: "high", status: "in_progress" },
    { _id: "hk_3", room_id: "room_3", staff_id: "staff_1", task_date: iso(0, 10), priority: "normal", status: "completed" },
    { _id: "hk_4", room_id: "room_4", staff_id: "staff_3", task_date: iso(0, 11), priority: "urgent", status: "skipped" },
    { _id: "hk_5", room_id: "room_5", staff_id: "staff_2", task_date: iso(1, 8), priority: "normal", status: "pending" },
  ] as HousekeepingTask[],

  campaigns: [
    { _id: "camp_1", name: "Offre été -20%", type: "offer", status: "scheduled", scheduled_at: iso(2), recipient_count: 0, created_at: iso(-10) },
    { _id: "camp_2", name: "Newsletter septembre", type: "email", status: "sent", scheduled_at: iso(-5), recipient_count: 8420, created_at: iso(-20) },
    { _id: "camp_3", name: "Relance panier", type: "sms", status: "draft", scheduled_at: iso(5), recipient_count: 0, created_at: iso(-2) },
    { _id: "camp_4", name: "Programme fidélité", type: "push", status: "sending", scheduled_at: iso(-1), recipient_count: 1200, created_at: iso(-15) },
  ] as Campaign[],

  roles: [
    { _id: "role_1", name: "Administrateur", code: "admin", description: "Accès complet au système", permissions: ["*"], role_level: 1, is_system: true, is_active: true, created_at: iso(-500) },
    { _id: "role_2", name: "Réceptionniste", code: "receptionist", description: "Gestion des réservations et check-in", permissions: ["reservation:read", "reservation:write", "guest:read"], role_level: 3, is_system: true, is_active: true, created_at: iso(-400) },
    { _id: "role_3", name: "Comptable", code: "accountant", description: "Facturation et paiements", permissions: ["invoice:read", "invoice:write", "payment:read"], role_level: 3, is_system: true, is_active: true, created_at: iso(-350) },
    { _id: "role_4", name: "Manager", code: "manager", description: "Pilotage des établissements", permissions: ["property:read", "report:read"], role_level: 2, is_system: false, is_active: true, created_at: iso(-300) },
  ] as Role[],
};

function applySearch<T extends Entity>(items: T[], search?: string): T[] {
  if (!search) return items;
  const needle = search.toLowerCase();
  return items.filter((item) =>
    JSON.stringify(item).toLowerCase().includes(needle),
  );
}

/** Retourne une liste paginée à partir des données de démonstration. */
export function getMockList<T extends Entity>(
  key: string,
  query: ListQuery = {},
): PaginatedResult<T> {
  const all = (MOCK[key] ?? []) as T[];
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;

  const items = applySearch(all, query.search);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;

  return {
    data: items.slice(start, start + limit),
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

/** Compteurs utilisés par le dashboard en mode démo. */
export function getMockCounts(): Record<string, number> {
  return Object.fromEntries(
    Object.entries(MOCK).map(([key, value]) => [key, value.length]),
  );
}
