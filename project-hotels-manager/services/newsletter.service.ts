// =============================================================================
// Service : newsletter (backend `/newsletter-subscriptions`)
// =============================================================================

import { newsletterSchema } from "@/lib/validation";
import { api } from "@/app/services/http/axios";

export interface NewsletterResult {
  success: boolean;
  message: string;
}

/** Inscrit un email à la newsletter. */
export async function subscribeNewsletter(
  email: string,
): Promise<NewsletterResult> {
  const payload = newsletterSchema.parse({ email });
  const { data } = await api.post<NewsletterResult>(
    "/newsletter-subscriptions",
    payload,
  );
  return data;
}
