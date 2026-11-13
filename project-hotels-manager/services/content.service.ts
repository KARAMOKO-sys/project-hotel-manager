// =============================================================================
// Service : contenus éditoriaux (équipe, témoignages)
// =============================================================================
// Le backend n'expose pas encore ces ressources : elles restent locales.
// Les fonctions sont asynchrones pour pouvoir basculer sur l'API sans
// modifier les composants.

import type { TeamMember, Testimonial } from "@/types";
import { teamMembers } from "@/data/team";
import { testimonials } from "@/data/testimonials";

export async function getTeamMembers(): Promise<TeamMember[]> {
  return teamMembers;
}

export async function getTestimonials(): Promise<Testimonial[]> {
  return testimonials;
}
