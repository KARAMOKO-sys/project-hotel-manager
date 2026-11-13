import { ChatbotLanguage } from '../schemas/chatbot-conversation.entity';
import { ChatbotIntent } from '../../chatbot-message/schemas/chatbot-message.entity';

/**
 * Moteur de compréhension du langage (NLU) déterministe et explicable.
 *
 * Il repose sur des règles de mots-clés multilingues (fr/en). Aucun appel à un
 * fournisseur d'IA externe n'est effectué : ce moteur peut être remplacé plus
 * tard par un vrai modèle tant que l'interface `analyze()` est respectée.
 */

/** Seuil de confiance en dessous duquel le bot considère ne pas avoir compris. */
export const LOW_CONFIDENCE_THRESHOLD = 0.5;

/** Entités extraites d'un message. */
export interface ExtractedEntities {
  /** Heure normalisée au format HH:MM. */
  time?: string;
  /** Date ISO (AAAA-MM-JJ) ou marqueur relatif (`today`, `tomorrow`). */
  date?: string;
  room_number?: string;
  quantity?: number;
}

/** Résultat de l'analyse d'un message. */
export interface NluResult {
  intent: ChatbotIntent;
  confidence: number;
  language: ChatbotLanguage | null;
  entities: ExtractedEntities;
  /** Mots-clés ayant déclenché l'intention retenue (explicabilité). */
  matched_keywords: string[];
  is_service_request: boolean;
}

/** Informations propres à l'établissement injectées dans les réponses FAQ. */
export interface FaqContext {
  property_name?: string;
  check_in_time?: string;
  check_out_time?: string;
  wifi_name?: string;
  wifi_password?: string;
  restaurant_hours?: string;
  breakfast_hours?: string;
  parking_info?: string;
  reception_phone?: string;
}

const DEFAULT_FAQ_CONTEXT: Required<FaqContext> = {
  property_name: '',
  check_in_time: '14:00',
  check_out_time: '12:00',
  wifi_name: 'Hotel-WiFi',
  wifi_password: '',
  restaurant_hours: '12:00-15:00 / 19:00-22:30',
  breakfast_hours: '06:30-10:30',
  parking_info: '',
  reception_phone: '',
};

/** Règles de mots-clés par intention (texte normalisé : minuscules, sans accents). */
const INTENT_KEYWORDS: Record<
  Exclude<ChatbotIntent, ChatbotIntent.UNKNOWN>,
  string[]
> = {
  [ChatbotIntent.GREETING]: [
    'bonjour',
    'bonsoir',
    'salut',
    'hello',
    'hi',
    'hey',
    'good morning',
    'good evening',
  ],
  [ChatbotIntent.THANKS]: ['merci', 'thanks', 'thank you', 'thx'],
  [ChatbotIntent.CHECK_IN_TIME]: [
    'check-in',
    'check in',
    'checkin',
    'arrivee',
    'arriver',
    'enregistrement',
    'arrival',
    'arrive',
  ],
  [ChatbotIntent.CHECK_OUT_TIME]: [
    'check-out',
    'check out',
    'checkout',
    'depart',
    'liberer la chambre',
    'quitter la chambre',
    'departure',
    'leave the room',
    'late checkout',
  ],
  [ChatbotIntent.WIFI]: [
    'wifi',
    'wi-fi',
    'internet',
    'mot de passe',
    'password',
    'connexion',
  ],
  [ChatbotIntent.TOWELS]: [
    'serviette',
    'serviettes',
    'towel',
    'towels',
    'drap',
    'draps',
    'linge',
  ],
  [ChatbotIntent.WAKE_UP_CALL]: [
    'reveil',
    'reveiller',
    'wake up',
    'wake-up',
    'wakeup',
    'wake me',
    'alarm',
  ],
  [ChatbotIntent.ROOM_SERVICE]: [
    'room service',
    'service en chambre',
    'commander',
    'livrer',
    'order food',
  ],
  [ChatbotIntent.RESTAURANT]: [
    'restaurant',
    'petit-dejeuner',
    'petit dejeuner',
    'dejeuner',
    'diner',
    'breakfast',
    'dinner',
    'lunch',
    'menu',
    'manger',
  ],
  [ChatbotIntent.BILLING]: [
    'facture',
    'addition',
    'payer',
    'paiement',
    'bill',
    'invoice',
    'payment',
    'pay',
  ],
  [ChatbotIntent.PARKING]: ['parking', 'garer', 'stationnement', 'car park'],
  [ChatbotIntent.COMPLAINT]: [
    'plainte',
    'reclamation',
    'probleme',
    'inacceptable',
    'pas content',
    'complaint',
    'problem',
    'unacceptable',
    'broken',
    'not working',
    'ne marche pas',
    'ne fonctionne pas',
  ],
  [ChatbotIntent.HUMAN_AGENT]: [
    'humain',
    'conseiller',
    'agent',
    'parler a quelqu',
    'une personne',
    'human',
    'real person',
    'speak to someone',
    'talk to someone',
    'operator',
  ],
};

/** Intentions de politesse : ignorées si une intention métier est détectée. */
const SMALL_TALK_INTENTS = new Set<ChatbotIntent>([
  ChatbotIntent.GREETING,
  ChatbotIntent.THANKS,
]);

/** Intentions correspondant à une demande de service à transmettre au personnel. */
export const SERVICE_REQUEST_INTENTS = new Set<ChatbotIntent>([
  ChatbotIntent.TOWELS,
  ChatbotIntent.WAKE_UP_CALL,
  ChatbotIntent.ROOM_SERVICE,
]);

/** Intentions nécessitant toujours un humain. */
export const ESCALATION_INTENTS = new Set<ChatbotIntent>([
  ChatbotIntent.HUMAN_AGENT,
  ChatbotIntent.COMPLAINT,
]);

const LANGUAGE_MARKERS: Record<ChatbotLanguage, string[]> = {
  [ChatbotLanguage.FR]: [
    'le',
    'la',
    'les',
    'de',
    'des',
    'je',
    'est',
    'une',
    'un',
    'pour',
    'avec',
    'vous',
    'quelle',
    'heure',
    'bonjour',
    'merci',
    'svp',
    'chambre',
    'ma',
    'mon',
    'serviettes',
  ],
  [ChatbotLanguage.EN]: [
    'the',
    'is',
    'what',
    'time',
    'please',
    'hello',
    'thanks',
    'you',
    'my',
    'for',
    'with',
    'can',
    'i',
    'room',
    'towels',
    'need',
    'some',
  ],
};

const NUMBER_WORDS: Record<string, number> = {
  un: 1,
  une: 1,
  one: 1,
  deux: 2,
  two: 2,
  trois: 3,
  three: 3,
  quatre: 4,
  four: 4,
  cinq: 5,
  five: 5,
};

type Template = Record<ChatbotLanguage, string>;

const FAQ_TEMPLATES: Partial<Record<ChatbotIntent, Template>> = {
  [ChatbotIntent.GREETING]: {
    fr: 'Bonjour ! Je suis l’assistant virtuel{property}. Comment puis-je vous aider ?',
    en: 'Hello! I am the virtual assistant{property}. How can I help you?',
  },
  [ChatbotIntent.THANKS]: {
    fr: 'Avec plaisir ! N’hésitez pas si vous avez d’autres questions.',
    en: 'You are welcome! Let me know if you need anything else.',
  },
  [ChatbotIntent.CHECK_IN_TIME]: {
    fr: 'Le check-in est possible à partir de {check_in_time}.',
    en: 'Check-in is available from {check_in_time}.',
  },
  [ChatbotIntent.CHECK_OUT_TIME]: {
    fr: 'Le check-out doit être effectué avant {check_out_time}. Un départ tardif peut être demandé à la réception.',
    en: 'Check-out is before {check_out_time}. Late check-out can be requested at the front desk.',
  },
  [ChatbotIntent.WIFI]: {
    fr: 'Le réseau Wi-Fi est « {wifi_name} »{wifi_password_fr}.',
    en: 'The Wi-Fi network is "{wifi_name}"{wifi_password_en}.',
  },
  [ChatbotIntent.RESTAURANT]: {
    fr: 'Le petit-déjeuner est servi de {breakfast_hours} et le restaurant est ouvert {restaurant_hours}.',
    en: 'Breakfast is served {breakfast_hours} and the restaurant is open {restaurant_hours}.',
  },
  [ChatbotIntent.BILLING]: {
    fr: 'Votre facture est disponible à la réception et peut être réglée par carte, espèces ou Mobile Money. Un membre de l’équipe peut aussi vous l’envoyer par e-mail.',
    en: 'Your bill is available at the front desk and can be paid by card, cash or Mobile Money. Our team can also email it to you.',
  },
  [ChatbotIntent.PARKING]: {
    fr: 'Informations parking : {parking_info_fr}',
    en: 'Parking information: {parking_info_en}',
  },
};

const SERVICE_TEMPLATES: Partial<Record<ChatbotIntent, Template>> = {
  [ChatbotIntent.TOWELS]: {
    fr: 'C’est noté : {quantity} serviette(s) supplémentaire(s){room_fr} vous seront apportées rapidement.',
    en: 'Noted: {quantity} extra towel(s){room_en} will be brought to you shortly.',
  },
  [ChatbotIntent.ROOM_SERVICE]: {
    fr: 'Votre demande de service en chambre a été transmise à notre équipe{room_fr}.',
    en: 'Your room service request has been sent to our team{room_en}.',
  },
};

const WAKE_UP_TEMPLATES: { with_time: Template; without_time: Template } = {
  with_time: {
    fr: 'Votre réveil est programmé à {time}{date_fr}{room_fr}.',
    en: 'Your wake-up call is scheduled at {time}{date_en}{room_en}.',
  },
  without_time: {
    fr: 'À quelle heure souhaitez-vous être réveillé(e) ? (ex. : 7h30)',
    en: 'What time would you like your wake-up call? (e.g. 7:30am)',
  },
};

const FALLBACK: Template = {
  fr: 'Je ne suis pas sûr d’avoir bien compris. Pouvez-vous reformuler ? Je peux vous renseigner sur le check-in/out, le Wi-Fi, le restaurant, la facturation ou transmettre une demande (serviettes, réveil…).',
  en: 'I am not sure I understood. Could you rephrase? I can help with check-in/out, Wi-Fi, the restaurant, billing, or pass on a request (towels, wake-up call…).',
};

const ESCALATION: Template = {
  fr: 'Je transfère votre demande à un membre de notre équipe, qui vous répondra dans les plus brefs délais.',
  en: 'I am transferring your request to a member of our team, who will reply as soon as possible.',
};

const ESCALATED_WAITING: Template = {
  fr: 'Un membre de notre équipe a été prévenu et vous répondra très bientôt.',
  en: 'A member of our team has been notified and will reply very soon.',
};

const SUGGESTED_REPLIES: Record<ChatbotLanguage, string[]> = {
  fr: [
    'Quelle est l’heure du check-out ?',
    'Quel est le mot de passe Wi-Fi ?',
    'Je voudrais des serviettes supplémentaires',
    'Je souhaite un réveil à 7h',
    'Parler à un conseiller',
  ],
  en: [
    'What time is check-out?',
    'What is the Wi-Fi password?',
    'I would like extra towels',
    'I need a wake-up call at 7am',
    'Talk to a human',
  ],
};

/** Normalise un texte : minuscules, sans accents, apostrophes et espaces unifiés. */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsKeyword(normalized: string, keyword: string): boolean {
  const pattern = new RegExp(
    `(^|[^a-z0-9])${escapeRegExp(keyword)}($|[^a-z0-9])`,
  );
  return pattern.test(normalized);
}

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '');
}

/** Moteur NLU à base de règles de mots-clés. */
export class KeywordIntentEngine {
  /** Analyse complète d'un message (intention, langue, entités). */
  analyze(text: string): NluResult {
    const normalized = normalizeText(text);
    const { intent, confidence, matched_keywords } =
      this.detectIntent(normalized);
    return {
      intent,
      confidence,
      language: this.detectLanguage(normalized),
      entities: this.extractEntities(normalized),
      matched_keywords,
      is_service_request: SERVICE_REQUEST_INTENTS.has(intent),
    };
  }

  /**
   * Détecte l'intention par comptage de mots-clés.
   *
   * - aucune correspondance → `unknown`, confiance 0 ;
   * - les intentions de politesse sont écartées si une intention métier existe ;
   * - une égalité entre intentions métier rend la réponse ambiguë (confiance 0,4) ;
   * - sinon la confiance croît avec le nombre de mots-clés trouvés.
   */
  detectIntent(normalized: string): {
    intent: ChatbotIntent;
    confidence: number;
    matched_keywords: string[];
  } {
    const scored = (
      Object.entries(INTENT_KEYWORDS) as [ChatbotIntent, string[]][]
    )
      .map(([intent, keywords]) => ({
        intent,
        matches: keywords.filter((k) => containsKeyword(normalized, k)),
      }))
      .filter((s) => s.matches.length > 0);

    if (scored.length === 0) {
      return {
        intent: ChatbotIntent.UNKNOWN,
        confidence: 0,
        matched_keywords: [],
      };
    }

    const business = scored.filter((s) => !SMALL_TALK_INTENTS.has(s.intent));
    const candidates = business.length > 0 ? business : scored;
    candidates.sort((a, b) => b.matches.length - a.matches.length);

    const [best, second] = candidates;
    let confidence: number;
    if (second && second.matches.length === best.matches.length) {
      confidence = 0.4;
    } else if (best.matches.length >= 2) {
      confidence = 0.9;
    } else {
      confidence = 0.75;
    }

    return {
      intent: best.intent,
      confidence,
      matched_keywords: best.matches,
    };
  }

  /** Détecte la langue par marqueurs lexicaux ; `null` si indéterminée. */
  detectLanguage(normalized: string): ChatbotLanguage | null {
    const tokens = normalized.split(/[^a-z']+/).filter(Boolean);
    const score = (lang: ChatbotLanguage) =>
      tokens.filter((t) => LANGUAGE_MARKERS[lang].includes(t)).length;
    const fr = score(ChatbotLanguage.FR);
    const en = score(ChatbotLanguage.EN);
    if (fr === en) return null;
    return fr > en ? ChatbotLanguage.FR : ChatbotLanguage.EN;
  }

  /** Extrait heure, date, numéro de chambre et quantité. */
  extractEntities(normalized: string): ExtractedEntities {
    const entities: ExtractedEntities = {};

    const ampm = normalized.match(/\b(\d{1,2})(?:[:h](\d{2}))?\s*(am|pm)\b/);
    const hm = normalized.match(/\b(\d{1,2})\s*(?:h|:)\s*(\d{2})?\b/);
    if (ampm) {
      let hours = Number(ampm[1]) % 12;
      if (ampm[3] === 'pm') hours += 12;
      entities.time = this.formatTime(hours, Number(ampm[2] ?? 0));
    } else if (hm) {
      entities.time = this.formatTime(Number(hm[1]), Number(hm[2] ?? 0));
    }
    if (entities.time === undefined) delete entities.time;

    const iso = normalized.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
    const fr = normalized.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
    if (iso) {
      entities.date = `${iso[1]}-${iso[2]}-${iso[3]}`;
    } else if (fr) {
      entities.date = `${fr[3]}-${fr[2].padStart(2, '0')}-${fr[1].padStart(2, '0')}`;
    } else if (/\b(demain|tomorrow)\b/.test(normalized)) {
      entities.date = 'tomorrow';
    } else if (
      /\b(aujourd'hui|aujourd hui|today|ce soir|tonight)\b/.test(normalized)
    ) {
      entities.date = 'today';
    }

    const room = normalized.match(
      /\b(?:chambre|room|ch\.?)\s*(?:n°|no|#)?\s*(\d{1,5})\b/,
    );
    if (room) entities.room_number = room[1];

    const qty = normalized.match(
      /\b(\d{1,2}|un|une|one|deux|two|trois|three|quatre|four|cinq|five)\s+(?:autres?\s+|more\s+|extra\s+|supplementaires?\s+)?(?:serviettes?|towels?|draps?|oreillers?|pillows?)\b/,
    );
    if (qty) {
      entities.quantity = NUMBER_WORDS[qty[1]] ?? Number(qty[1]);
    }

    return entities;
  }

  /**
   * Construit la réponse du bot pour une intention donnée.
   * Retourne `null` si aucune réponse automatique n'est possible.
   */
  buildAnswer(
    intent: ChatbotIntent,
    language: ChatbotLanguage,
    entities: ExtractedEntities = {},
    context: FaqContext = {},
  ): string | null {
    const ctx = { ...DEFAULT_FAQ_CONTEXT, ...this.compact(context) };
    const values: Record<string, string> = {
      ...ctx,
      property: ctx.property_name
        ? language === ChatbotLanguage.FR
          ? ` de ${ctx.property_name}`
          : ` of ${ctx.property_name}`
        : '',
      wifi_password_fr: ctx.wifi_password
        ? `, mot de passe : ${ctx.wifi_password}`
        : ' ; le mot de passe figure sur votre carte de chambre',
      wifi_password_en: ctx.wifi_password
        ? `, password: ${ctx.wifi_password}`
        : '; the password is printed on your key card holder',
      parking_info_fr:
        ctx.parking_info || 'veuillez vous adresser à la réception.',
      parking_info_en: ctx.parking_info || 'please ask the front desk.',
      quantity: String(entities.quantity ?? 2),
      time: entities.time ?? '',
      room_fr: entities.room_number ? ` (chambre ${entities.room_number})` : '',
      room_en: entities.room_number ? ` (room ${entities.room_number})` : '',
      date_fr:
        entities.date === 'tomorrow'
          ? ' demain'
          : entities.date && entities.date !== 'today'
            ? ` le ${entities.date}`
            : '',
      date_en:
        entities.date === 'tomorrow'
          ? ' tomorrow'
          : entities.date && entities.date !== 'today'
            ? ` on ${entities.date}`
            : '',
    };

    if (intent === ChatbotIntent.WAKE_UP_CALL) {
      const template = entities.time
        ? WAKE_UP_TEMPLATES.with_time
        : WAKE_UP_TEMPLATES.without_time;
      return fill(template[language], values);
    }

    const template = SERVICE_TEMPLATES[intent] ?? FAQ_TEMPLATES[intent];
    return template ? fill(template[language], values) : null;
  }

  /** Message de repli lorsque l'intention n'est pas comprise. */
  fallbackMessage(language: ChatbotLanguage): string {
    return FALLBACK[language];
  }

  /** Message annonçant le transfert vers un humain. */
  escalationMessage(language: ChatbotLanguage): string {
    return ESCALATION[language];
  }

  /** Message envoyé quand la conversation attend déjà un humain. */
  waitingForStaffMessage(language: ChatbotLanguage): string {
    return ESCALATED_WAITING[language];
  }

  /** Réponses rapides proposées au client, en excluant l'intention courante. */
  suggestedReplies(
    language: ChatbotLanguage,
    lastIntent?: ChatbotIntent | string,
  ): string[] {
    const all = SUGGESTED_REPLIES[language];
    if (!lastIntent) return all;
    return all.filter((reply) => {
      const detected = this.detectIntent(normalizeText(reply)).intent;
      return String(detected) !== String(lastIntent);
    });
  }

  private formatTime(hours: number, minutes: number): string | undefined {
    if (hours > 23 || minutes > 59) return undefined;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  private compact(context: FaqContext): FaqContext {
    return Object.fromEntries(
      Object.entries(context).filter(
        ([, v]) => v !== undefined && v !== null && v !== '',
      ),
    ) as FaqContext;
  }
}
