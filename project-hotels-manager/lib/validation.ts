// =============================================================================
// Schémas de validation (zod)
// =============================================================================

import { z } from "zod";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validation d'une adresse email (champ requis + format). */
export const emailSchema = z
  .string()
  .trim()
  .min(1, "L'email est requis")
  .regex(EMAIL_REGEX, "Adresse email invalide");

/** Validation du formulaire de contact. */
export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Le nom doit contenir au moins 2 caractères"),
  email: emailSchema,
  subject: z
    .string()
    .trim()
    .min(3, "Le sujet doit contenir au moins 3 caractères"),
  message: z
    .string()
    .trim()
    .min(10, "Le message doit contenir au moins 10 caractères"),
});

/** Validation de l'inscription à la newsletter. */
export const newsletterSchema = z.object({
  email: emailSchema,
});

export type ContactFormValues = z.infer<typeof contactSchema>;
export type NewsletterFormValues = z.infer<typeof newsletterSchema>;
