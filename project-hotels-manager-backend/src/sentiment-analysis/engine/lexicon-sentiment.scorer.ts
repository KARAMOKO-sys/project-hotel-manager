import {
  ReviewAspect,
  ReviewEmotion,
  SentimentLabel,
  SentimentLanguage,
} from '../schemas/sentiment-analysis.entity';

/**
 * Scoreur de sentiment lexical (fr/en), déterministe et explicable.
 *
 * Principe (inspiré de VADER) :
 *  1. le texte est normalisé (minuscules, sans accents) puis découpé en
 *     propositions (ponctuation, « mais », « but », « however »…) ;
 *  2. chaque mot du lexique apporte une valence (-3 à +3), amplifiée par un
 *     intensifieur (« très », « very »…) et inversée par une négation proche
 *     (« pas », « not », « jamais »…) ;
 *  3. la somme est normalisée dans ]-1, 1[ par `s / sqrt(s² + α)` ;
 *  4. les aspects (propreté, personnel…) héritent du score de la proposition
 *     dans laquelle ils sont mentionnés.
 *
 * Aucune dépendance externe : peut être remplacé par un modèle ML en
 * conservant la signature de `score()`.
 */

export const SCORER_VERSION = 'lexicon-v1';

/** Seuil (valeur absolue) au-delà duquel un score n'est plus neutre. */
export const NEUTRAL_THRESHOLD = 0.15;

const NORMALIZATION_ALPHA = 15;
const NEGATION_FACTOR = -0.75;
const INTENSIFIER_FACTOR = 1.5;
/** Nombre de mots après une négation sur lesquels elle s'applique. */
const NEGATION_WINDOW = 3;

const LEXICON: Record<string, number> = {
  // --- positifs (fr) ---
  excellent: 3,
  excellente: 3,
  parfait: 3,
  parfaite: 3,
  exceptionnel: 3,
  exceptionnelle: 3,
  superbe: 3,
  magnifique: 3,
  formidable: 3,
  delicieux: 3,
  delicieuse: 3,
  adore: 3,
  genial: 2.5,
  geniale: 2.5,
  top: 2,
  bon: 2,
  bonne: 2,
  bien: 1.5,
  agreable: 2,
  sympa: 2,
  sympathique: 2,
  accueillant: 2,
  accueillante: 2,
  chaleureux: 2,
  chaleureuse: 2,
  serviable: 2,
  aimable: 2,
  propre: 2,
  propres: 2,
  impeccable: 2.5,
  confortable: 2,
  calme: 1.5,
  spacieux: 1.5,
  spacieuse: 1.5,
  recommande: 2,
  satisfait: 2,
  satisfaite: 2,
  content: 2,
  contente: 2,
  ravi: 2.5,
  ravie: 2.5,
  professionnel: 2,
  professionnelle: 2,
  efficace: 1.5,
  ideal: 2,
  ideale: 2,
  beau: 2,
  belle: 2,
  // --- positifs (en) ---
  amazing: 3,
  perfect: 3,
  wonderful: 3,
  fantastic: 3,
  outstanding: 3,
  delicious: 3,
  love: 3,
  loved: 3,
  great: 2.5,
  good: 2,
  nice: 2,
  pleasant: 2,
  friendly: 2,
  welcoming: 2,
  helpful: 2,
  clean: 2,
  spotless: 2.5,
  comfortable: 2,
  quiet: 1.5,
  spacious: 1.5,
  recommend: 2,
  recommended: 2,
  satisfied: 2,
  happy: 2,
  professional: 2,
  efficient: 1.5,
  beautiful: 2,
  lovely: 2.5,
  cheap: 1,
  affordable: 1.5,
  // --- négatifs (fr) ---
  horrible: -3,
  affreux: -3,
  affreuse: -3,
  catastrophique: -3,
  pire: -3,
  inacceptable: -3,
  deteste: -3,
  scandaleux: -3,
  mauvais: -2,
  mauvaise: -2,
  nul: -2.5,
  nulle: -2.5,
  sale: -2.5,
  sales: -2.5,
  bruyant: -2,
  bruyante: -2,
  impoli: -2.5,
  impolie: -2.5,
  desagreable: -2,
  cher: -1.5,
  chere: -1.5,
  casse: -2,
  cassee: -2,
  lent: -1.5,
  lente: -1.5,
  decu: -2,
  decue: -2,
  decevant: -2,
  decevante: -2,
  inconfortable: -2,
  froid: -1,
  froide: -1,
  probleme: -1.5,
  bruit: -1,
  odeur: -1,
  // --- négatifs (en) ---
  terrible: -3,
  awful: -3,
  worst: -3,
  unacceptable: -3,
  hate: -3,
  disgusting: -3,
  bad: -2,
  poor: -2,
  dirty: -2.5,
  noisy: -2,
  loud: -1.5,
  rude: -2.5,
  unpleasant: -2,
  expensive: -1.5,
  overpriced: -2,
  broken: -2,
  slow: -1.5,
  disappointed: -2,
  disappointing: -2,
  uncomfortable: -2,
  cold: -1,
  smelly: -2,
  problem: -1.5,
  noise: -1,
};

const NEGATIONS = new Set([
  'pas',
  'jamais',
  'aucun',
  'aucune',
  'rien',
  'sans',
  'ni',
  'not',
  'no',
  'never',
  'nothing',
  'without',
]);

const INTENSIFIERS = new Set([
  'tres',
  'vraiment',
  'trop',
  'extremement',
  'super',
  'tellement',
  'si',
  'totalement',
  'very',
  'really',
  'extremely',
  'so',
  'too',
  'absolutely',
  'totally',
  'incredibly',
]);

/** Mots-clés (normalisés) déclenchant la détection d'un aspect. */
const ASPECT_KEYWORDS: Record<ReviewAspect, string[]> = {
  [ReviewAspect.CLEANLINESS]: [
    'propre',
    'propres',
    'proprete',
    'sale',
    'sales',
    'hygiene',
    'poussiere',
    'tache',
    'taches',
    'odeur',
    'clean',
    'cleanliness',
    'dirty',
    'dust',
    'dusty',
    'stain',
    'stains',
    'smell',
    'smelly',
    'spotless',
    'impeccable',
  ],
  [ReviewAspect.STAFF]: [
    'personnel',
    'staff',
    'equipe',
    'team',
    'reception',
    'receptionniste',
    'receptionist',
    'accueil',
    'employe',
    'employes',
    'employee',
    'employees',
    'serveur',
    'serveurs',
    'waiter',
    'waiters',
    'manager',
    'service',
  ],
  [ReviewAspect.LOCATION]: [
    'emplacement',
    'localisation',
    'situation',
    'situe',
    'quartier',
    'centre',
    'plage',
    'location',
    'located',
    'neighborhood',
    'neighbourhood',
    'area',
    'downtown',
    'beach',
  ],
  [ReviewAspect.PRICE]: [
    'prix',
    'tarif',
    'tarifs',
    'cher',
    'chere',
    'cout',
    'rapport qualite',
    'price',
    'prices',
    'expensive',
    'overpriced',
    'cheap',
    'affordable',
    'value',
    'cost',
  ],
  [ReviewAspect.FOOD]: [
    'nourriture',
    'repas',
    'petit-dejeuner',
    'petit dejeuner',
    'dejeuner',
    'diner',
    'buffet',
    'cuisine',
    'plat',
    'plats',
    'restaurant',
    'food',
    'breakfast',
    'dinner',
    'lunch',
    'meal',
    'meals',
    'dish',
    'dishes',
  ],
  [ReviewAspect.NOISE]: [
    'bruit',
    'bruyant',
    'bruyante',
    'calme',
    'silence',
    'silencieux',
    'noise',
    'noisy',
    'loud',
    'quiet',
  ],
};

const EMOTION_KEYWORDS: Record<ReviewEmotion, string[]> = {
  [ReviewEmotion.JOY]: [
    'heureux',
    'heureuse',
    'ravi',
    'ravie',
    'adore',
    'enchante',
    'happy',
    'delighted',
    'love',
    'loved',
    'enjoyed',
  ],
  [ReviewEmotion.SATISFACTION]: [
    'satisfait',
    'satisfaite',
    'recommande',
    'satisfied',
    'recommend',
    'recommended',
  ],
  [ReviewEmotion.ANGER]: [
    'furieux',
    'furieuse',
    'colere',
    'scandaleux',
    'inacceptable',
    'angry',
    'furious',
    'outrageous',
    'unacceptable',
  ],
  [ReviewEmotion.FRUSTRATION]: [
    'frustre',
    'frustrant',
    'agacant',
    'enervant',
    'attente',
    'frustrated',
    'frustrating',
    'annoying',
    'waited',
    'waiting',
  ],
  [ReviewEmotion.DISAPPOINTMENT]: [
    'decu',
    'decue',
    'decevant',
    'decevante',
    'disappointed',
    'disappointing',
    'letdown',
  ],
};

const LANGUAGE_MARKERS: Record<SentimentLanguage, string[]> = {
  [SentimentLanguage.FR]: [
    'le',
    'la',
    'les',
    'de',
    'des',
    'et',
    'est',
    'tres',
    'un',
    'une',
    'mais',
    'chambre',
    'pas',
    'nous',
    'avons',
    'etait',
  ],
  [SentimentLanguage.EN]: [
    'the',
    'and',
    'is',
    'was',
    'very',
    'a',
    'but',
    'room',
    'not',
    'we',
    'were',
    'had',
    'it',
  ],
};

/** Découpe en propositions : ponctuation forte et conjonctions d'opposition. */
const CLAUSE_SPLITTER =
  /[.!?;\n]+|,|\b(?:mais|cependant|pourtant|toutefois|neanmoins|par contre|but|however|although|though|whereas)\b/;

export interface AspectScore {
  aspect: ReviewAspect;
  score: number;
  label: SentimentLabel;
  mentions: number;
}

export interface SentimentScore {
  score: number;
  label: SentimentLabel;
  confidence: number;
  language: SentimentLanguage | null;
  aspects: AspectScore[];
  emotions: ReviewEmotion[];
  /** Mots du lexique trouvés, avec leur contribution (explicabilité). */
  contributions: { word: string; value: number }[];
  model_version: string;
}

/** Normalise un texte : minuscules, sans accents, apostrophes séparées. */
export function normalizeReview(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/n't\b/g, ' not')
    .replace(/['’`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Convertit un score en libellé. */
export function labelFromScore(score: number): SentimentLabel {
  if (score >= NEUTRAL_THRESHOLD) return SentimentLabel.POSITIVE;
  if (score <= -NEUTRAL_THRESHOLD) return SentimentLabel.NEGATIVE;
  return SentimentLabel.NEUTRAL;
}

function round(value: number, decimals = 3): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function tokenize(normalized: string): string[] {
  return normalized.split(/[^a-z0-9-]+/).filter(Boolean);
}

function containsPhrase(normalized: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9-])${escaped}($|[^a-z0-9-])`).test(normalized);
}

/** Scoreur lexical fr/en. */
export class LexiconSentimentScorer {
  /** Analyse complète d'un texte. */
  score(text: string): SentimentScore {
    const normalized = normalizeReview(text);
    const clauses = normalized
      .split(CLAUSE_SPLITTER)
      .map((c) => (c ?? '').trim())
      .filter(Boolean);

    let total = 0;
    const contributions: { word: string; value: number }[] = [];
    const aspectTotals = new Map<ReviewAspect, { sum: number; n: number }>();

    for (const clause of clauses) {
      const { raw, contributions: clauseContribs } = this.scoreClause(clause);
      total += raw;
      contributions.push(...clauseContribs);

      for (const aspect of this.extractAspects(clause)) {
        const entry = aspectTotals.get(aspect) ?? { sum: 0, n: 0 };
        entry.sum += raw;
        entry.n += 1;
        aspectTotals.set(aspect, entry);
      }
    }

    const score = round(this.normalize(total));
    const aspects: AspectScore[] = [...aspectTotals.entries()].map(
      ([aspect, { sum, n }]) => {
        const aspectScore = round(this.normalize(sum / n));
        return {
          aspect,
          score: aspectScore,
          label: labelFromScore(aspectScore),
          mentions: n,
        };
      },
    );

    return {
      score,
      label: labelFromScore(score),
      confidence: round(Math.min(1, contributions.length / 3), 2),
      language: this.detectLanguage(normalized),
      aspects,
      emotions: this.detectEmotions(normalized),
      contributions,
      model_version: SCORER_VERSION,
    };
  }

  /** Liste les aspects mentionnés dans un texte (sans score). */
  extractAspects(text: string): ReviewAspect[] {
    const normalized = normalizeReview(text);
    return (Object.entries(ASPECT_KEYWORDS) as [ReviewAspect, string[]][])
      .filter(([, keywords]) =>
        keywords.some((k) => containsPhrase(normalized, k)),
      )
      .map(([aspect]) => aspect);
  }

  /** Détecte les émotions exprimées par mots-clés. */
  detectEmotions(text: string): ReviewEmotion[] {
    const normalized = normalizeReview(text);
    return (Object.entries(EMOTION_KEYWORDS) as [ReviewEmotion, string[]][])
      .filter(([, keywords]) =>
        keywords.some((k) => containsPhrase(normalized, k)),
      )
      .map(([emotion]) => emotion);
  }

  /** Détecte la langue (fr/en) ; `null` si indéterminée. */
  detectLanguage(normalized: string): SentimentLanguage | null {
    const tokens = tokenize(normalized);
    const count = (lang: SentimentLanguage) =>
      tokens.filter((t) => LANGUAGE_MARKERS[lang].includes(t)).length;
    const fr = count(SentimentLanguage.FR);
    const en = count(SentimentLanguage.EN);
    if (fr === en) return null;
    return fr > en ? SentimentLanguage.FR : SentimentLanguage.EN;
  }

  /** Somme brute des valences d'une proposition (négations/intensifieurs inclus). */
  private scoreClause(clause: string): {
    raw: number;
    contributions: { word: string; value: number }[];
  } {
    const tokens = tokenize(clause);
    const contributions: { word: string; value: number }[] = [];
    let raw = 0;
    let negationRemaining = 0;
    let boost = 1;

    for (const token of tokens) {
      if (NEGATIONS.has(token)) {
        negationRemaining = NEGATION_WINDOW;
        continue;
      }
      if (INTENSIFIERS.has(token)) {
        boost = INTENSIFIER_FACTOR;
        continue;
      }
      const valence = LEXICON[token];
      if (valence !== undefined) {
        let value = valence * boost;
        if (negationRemaining > 0) value *= NEGATION_FACTOR;
        raw += value;
        contributions.push({ word: token, value: round(value, 2) });
        boost = 1;
      }
      if (negationRemaining > 0) negationRemaining -= 1;
    }
    return { raw, contributions };
  }

  /** Ramène une somme brute dans ]-1, 1[. */
  private normalize(raw: number): number {
    if (raw === 0) return 0;
    return raw / Math.sqrt(raw * raw + NORMALIZATION_ALPHA);
  }
}
