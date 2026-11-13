import { RecommendationType } from '../schemas/recommendation.entity';

/**
 * Scoreur de recommandations « content-based », déterministe et explicable.
 *
 * Score (0..1) = somme pondérée de :
 *  - 0,45 × adéquation aux préférences (part des tags du candidat présents
 *    dans les préférences du client) ;
 *  - 0,30 × affinité historique (fréquence relative de la catégorie dans
 *    l'historique de consommation) ;
 *  - 0,15 × adéquation budgétaire (écart relatif au panier moyen) ;
 *  - 0,10 × adéquation au motif de séjour (business, famille…).
 *
 * Peut être remplacé par un modèle de filtrage collaboratif en conservant
 * la signature de `score()`.
 */

export const SCORER_VERSION = 'content-based-v1';

export const WEIGHTS = {
  preferences: 0.45,
  history: 0.3,
  budget: 0.15,
  purpose: 0.1,
} as const;

/** Profil client fourni par l'appelant (module guest / guest-preference). */
export interface GuestProfile {
  /** Préférences déclarées ou déduites (ex. `spa`, `sea_view`, `vegetarian`). */
  preferences?: string[];
  /** Catégories consommées lors des séjours précédents (avec répétitions). */
  past_categories?: string[];
  /** Panier moyen habituel du client pour un extra. */
  average_spend?: number;
  /** Motif du séjour (`business`, `leisure`, `family`…). */
  stay_purpose?: string;
  /** Catégories à ne jamais proposer (refus antérieurs, allergies…). */
  excluded_categories?: string[];
}

/** Élément candidat à la recommandation. */
export interface RecommendationCandidate {
  title: string;
  type: RecommendationType;
  category?: string;
  tags?: string[];
  price?: number;
  item_id?: string;
  item_type?: string;
  description?: string;
}

export interface ScoredCandidate extends RecommendationCandidate {
  score: number;
  reasons: string[];
  breakdown: Record<keyof typeof WEIGHTS, number>;
}

const norm = (v: string) => v.trim().toLowerCase();
const round = (v: number) => Math.round(v * 1000) / 1000;

export class ContentBasedScorer {
  /** Calcule le score d'un candidat pour un profil. */
  score(
    profile: GuestProfile,
    candidate: RecommendationCandidate,
  ): ScoredCandidate {
    const prefs = new Set((profile.preferences ?? []).map(norm));
    const tags = [...new Set((candidate.tags ?? []).map(norm))];
    const category = candidate.category ? norm(candidate.category) : undefined;
    const reasons: string[] = [];

    // 1. Préférences
    const matchedTags = tags.filter((t) => prefs.has(t));
    if (category && prefs.has(category) && !matchedTags.includes(category)) {
      matchedTags.push(category);
    }
    const prefDenominator = Math.max(tags.length, 1);
    const preferences = Math.min(1, matchedTags.length / prefDenominator);
    if (matchedTags.length > 0) {
      reasons.push(`Correspond à vos préférences : ${matchedTags.join(', ')}`);
    }

    // 2. Historique
    const history = (profile.past_categories ?? []).map(norm);
    let historyScore = 0;
    if (category && history.length > 0) {
      const freq = new Map<string, number>();
      for (const c of history) freq.set(c, (freq.get(c) ?? 0) + 1);
      const max = Math.max(...freq.values());
      historyScore = (freq.get(category) ?? 0) / max;
      if (historyScore > 0) {
        reasons.push(`Catégorie déjà appréciée : ${category}`);
      }
    }

    // 3. Budget (neutre 0,5 si inconnu)
    let budget = 0.5;
    const spend = profile.average_spend;
    if (candidate.price === 0) {
      budget = 1;
      reasons.push('Offert');
    } else if (
      candidate.price !== undefined &&
      spend !== undefined &&
      spend > 0
    ) {
      budget = Math.max(0, 1 - Math.abs(candidate.price - spend) / spend);
      if (budget >= 0.7) reasons.push('Dans votre budget habituel');
    }

    // 4. Motif de séjour
    const stayPurpose = profile.stay_purpose
      ? norm(profile.stay_purpose)
      : undefined;
    const purpose = stayPurpose && tags.includes(stayPurpose) ? 1 : 0;
    if (stayPurpose && purpose) {
      reasons.push(`Adapté à un séjour ${stayPurpose}`);
    }

    const breakdown = {
      preferences: round(preferences),
      history: round(historyScore),
      budget: round(budget),
      purpose,
    };
    const score = round(
      WEIGHTS.preferences * preferences +
        WEIGHTS.history * historyScore +
        WEIGHTS.budget * budget +
        WEIGHTS.purpose * purpose,
    );

    return { ...candidate, score, reasons, breakdown };
  }

  /**
   * Classe les candidats : exclusions appliquées, seuil minimal, tri par
   * score décroissant puis par titre (ordre stable et déterministe).
   */
  rank(
    profile: GuestProfile,
    candidates: RecommendationCandidate[],
    options: { limit?: number; min_score?: number } = {},
  ): ScoredCandidate[] {
    const excluded = new Set((profile.excluded_categories ?? []).map(norm));
    const minScore = options.min_score ?? 0.2;
    const limit = options.limit ?? 5;

    return candidates
      .filter((c) => !c.category || !excluded.has(norm(c.category)))
      .map((c) => this.score(profile, c))
      .filter((c) => c.score >= minScore)
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
      .slice(0, limit);
  }
}
