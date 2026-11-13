// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/guest/
// =============================================================================

import type { User } from "./base-entities";

export interface CreateGuestDto {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  birth_date?: string;
  nationality?: string;
  identification_type?: string;
  identification_number?: string;
  preferences?: Record<string, unknown>;
  loyalty_tier?: LoyaltyTier;
  marketing_consent?: boolean;
}

export type UpdateGuestDto = Partial<CreateGuestDto>;

export enum LoyaltyTier {
  BRONZE = "bronze",
  SILVER = "silver",
  GOLD = "gold",
  PLATINUM = "platinum",
  DIAMOND = "diamond",
}

export enum GuestStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  BLOCKED = "blocked",
  SUSPENDED = "suspended",
}

export interface Guest extends User {
  birth_date?: string;
  preferences: { language?: string; currency?: string; timezone?: string; room_preferences?: { floor_preference?: "low" | "high" | "any"; view_preference?: "city" | "any" | "pool" | "sea" | "garden"; smoking_preference?: "any" | "smoking" | "non-smoking"; bed_preference?: "any" | "king" | "queen" | "twin" | "double" }; amenities?: string[]; special_needs?: string[]; dietary_requirements?: string[]; communication_preference?: "email" | "phone" | "sms" | "whatsapp"; newsletter_frequency?: "daily" | "weekly" | "monthly" | "never"; notification_settings?: { booking_updates?: boolean; promotions?: boolean; reminders?: boolean; surveys?: boolean } };
  loyalty_points: number;
  loyalty_tier: LoyaltyTier;
  total_stays: number;
  total_spent: number;
  marketing_consent: boolean;
  guest_status?: GuestStatus;
  nationality?: string;
  identification_type?: string;
  identification_number?: string;
  identification_document_url?: string;
  last_visit_date?: string;
  last_booking_date?: string;
  total_cancellations?: number;
  total_no_shows?: number;
  average_rating?: number;
  total_reviews?: number;
  favorite_properties?: string[];
  tags?: string[];
  referral_code?: string;
  referred_by?: string;
  loyalty_transactions?: Array<{ date: string; action: string; description: string; points: number }>;
}
