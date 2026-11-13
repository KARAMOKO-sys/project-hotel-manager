// =============================================================================
// Hooks : contenus éditoriaux (équipe, témoignages)
// =============================================================================

"use client";

import { getTeamMembers, getTestimonials } from "@/services/content.service";
import { useAsync } from "./useAsync";

export function useTeamMembers() {
  const { data, loading, error } = useAsync(
    getTeamMembers,
    [],
    "Impossible de charger l'équipe.",
  );
  return { teamMembers: data ?? [], loading, error };
}

export function useTestimonials() {
  const { data, loading, error } = useAsync(
    getTestimonials,
    [],
    "Impossible de charger les témoignages.",
  );
  return { testimonials: data ?? [], loading, error };
}
