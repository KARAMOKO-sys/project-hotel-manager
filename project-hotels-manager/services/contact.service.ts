// =============================================================================
// Service : envoi d'un message de contact (backend `/contact-messages`)
// =============================================================================

import type { ContactMessage } from "@/types";
import { contactSchema } from "@/lib/validation";
import { api } from "@/app/services/http/axios";

export interface ContactResult {
  success: boolean;
  message: string;
}

/** Envoie un message de contact (validé côté client puis par le backend). */
export async function sendContactMessage(
  input: ContactMessage,
): Promise<ContactResult> {
  const payload = { ...contactSchema.parse(input), property_id: input.property_id };
  const { data } = await api.post<ContactResult>("/contact-messages", payload);
  return data;
}
