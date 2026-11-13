// =============================================================================
// Utilitaires de formatage
// =============================================================================

import type { Address, Money } from "@/types";

/**
 * Formate un montant du backend (`{ amount, currency }`), sans décimales.
 * @example formatPrice({ amount: 45000, currency: "XOF" }) // "45 000 F CFA"
 */
export function formatPrice(price: Money, locale = "fr-FR"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: price.currency ?? "XOF",
    maximumFractionDigits: 0,
  }).format(price.amount);
}

/**
 * Adresse courte (ville, pays) ou complète.
 * @example formatAddress({ city: "Abidjan", country: "Côte d'Ivoire" })
 */
export function formatAddress(address: Address = {}, full = false): string {
  const parts = full
    ? [address.street, address.city, address.state, address.country]
    : [address.city, address.country];
  return parts.filter((part) => part?.trim()).join(", ");
}

/** Image principale d'une propriété, avec image par défaut. */
export function coverImage(images: string[] = []): string {
  return images[0] || "/img/property-1.jpg";
}
