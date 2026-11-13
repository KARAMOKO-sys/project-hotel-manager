// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/base-entities/
// =============================================================================


export interface AddressEmbeddable {
  street?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

export interface AuditableEntity {
  /** Identifiant MongoDB. */
  _id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  is_deleted: boolean;
}

export interface ContactEmbeddable {
  name?: string;
  phone?: string;
  email?: string;
  position?: string;
  department?: string;
  is_primary?: boolean;
  is_emergency?: boolean;
  metadata?: { notes?: string; preferred_contact_method?: "email" | "phone" | "sms" | "whatsapp"; availability?: { monday?: { start: string; end: string }; tuesday?: { start: string; end: string }; wednesday?: { start: string; end: string }; thursday?: { start: string; end: string }; friday?: { start: string; end: string }; saturday?: { start: string; end: string }; sunday?: { start: string; end: string } }; timezone?: string; language?: string };
}

export enum MoneyCurrency {
  XOF = "XOF",
  EUR = "EUR",
  USD = "USD",
  GBP = "GBP",
  CAD = "CAD",
  JPY = "JPY",
  CNY = "CNY",
  CHF = "CHF",
  NGN = "NGN",
  ZAR = "ZAR",
  KES = "KES",
  GHS = "GHS",
}

export interface MoneyEmbeddable {
  amount: number;
  currency: MoneyCurrency;
}

export enum BookingChannel {
  WEBSITE = "website",
  MOBILE_APP = "mobile_app",
  OTA = "ota",
  PHONE = "phone",
  WALK_IN = "walk_in",
  CORPORATE = "corporate",
}

export enum CampaignStatus {
  DRAFT = "draft",
  SCHEDULED = "scheduled",
  SENDING = "sending",
  SENT = "sent",
  CANCELLED = "cancelled",
}

export enum CampaignType {
  EMAIL = "email",
  SMS = "sms",
  PUSH = "push",
  OFFER = "offer",
}

export enum Currency {
  XOF = "XOF",
  EUR = "EUR",
  USD = "USD",
  GBP = "GBP",
  CAD = "CAD",
}

export enum InvoiceStatus {
  DRAFT = "draft",
  ISSUED = "issued",
  PAID = "paid",
  OVERDUE = "overdue",
  CANCELLED = "cancelled",
  CREDIT_NOTE = "credit_note",
}

export enum BaseEntitiesLoyaltyTier {
  BRONZE = "bronze",
  SILVER = "silver",
  GOLD = "gold",
  PLATINUM = "platinum",
}

export enum MaintenanceCategory {
  PLUMBING = "plumbing",
  ELECTRICAL = "electrical",
  HVAC = "hvac",
  FURNITURE = "furniture",
  APPLIANCE = "appliance",
  OTHER = "other",
}

export enum NotificationChannel {
  EMAIL = "email",
  SMS = "sms",
  PUSH = "push",
  IN_APP = "in_app",
}

export enum PaymentMethod {
  CASH = "cash",
  CARD = "card",
  MOBILE_MONEY = "mobile_money",
  BANK_TRANSFER = "bank_transfer",
  CHECK = "check",
  ONLINE = "online",
}

export enum PaymentStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  FAILED = "failed",
  REFUNDED = "refunded",
  CANCELLED = "cancelled",
}

export enum PropertyType {
  HOTEL = "hotel",
  RESIDENCE = "residence",
  LODGE = "lodge",
  GUEST_HOUSE = "guest_house",
  MOTEL = "motel",
  APARTMENT = "apartment",
  HOUSE = "house",
  VILLA = "villa",
  STUDIO = "studio",
  COMMERCIAL = "commercial",
  LAND = "land",
}

export enum ReservationSource {
  DIRECT = "direct",
  BOOKING = "booking",
  EXPEDIA = "expedia",
  AIRBNB = "airbnb",
  AGODA = "agoda",
  PHONE = "phone",
  WALK_IN = "walk_in",
  OTHER = "other",
}

export enum RoomStatus {
  CLEAN = "clean",
  DIRTY = "dirty",
  INSPECTION = "inspection",
  MAINTENANCE = "maintenance",
  BLOCKED = "blocked",
  OCCUPIED = "occupied",
}

export enum TaskPriority {
  URGENT = "urgent",
  HIGH = "high",
  NORMAL = "normal",
  LOW = "low",
}

export enum TaskStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  SKIPPED = "skipped",
  INSPECTED = "inspected",
}

export enum UserType {
  SUPER_ADMIN = "super_admin",
  OWNER = "owner",
  RECEPTIONIST = "receptionist",
  HOUSEKEEPING = "housekeeping",
  ACCOUNTANT = "accountant",
  GUEST = "guest",
  PARTNER = "partner",
}

export interface User extends AuditableEntity {
  email: string;
  phone?: string;
  password_changed_at?: string;
  failed_login_attempts: number;
  locked_until?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  language: string;
  timezone: string;
  is_active: boolean;
  is_email_verified: boolean;
  is_phone_verified: boolean;
  two_factor_enabled: boolean;
  last_login_at?: string;
  last_login_ip?: string;
  metadata?: Record<string, unknown>;
}
