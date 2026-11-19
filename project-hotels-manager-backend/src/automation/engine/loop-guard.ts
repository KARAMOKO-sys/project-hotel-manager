import { AsyncLocalStorage } from 'async_hooks';

/**
 * Protection contre les boucles d'automatisation.
 *
 * 1. Tout événement dont `actor_id` commence par `automation:` (convention
 *    pour les événements publiés à la suite d'une action automatique) est
 *    ignoré par le moteur : une automatisation ne déclenche jamais une autre
 *    automatisation par ce biais.
 * 2. Les actions s'exécutent dans un contexte `AsyncLocalStorage`. Si une
 *    action provoque (directement, dans la même chaîne asynchrone) la
 *    publication d'un événement métier, le moteur voit la chaîne : une règle
 *    déjà présente dans la chaîne n'est pas relancée, et au-delà de
 *    `MAX_CHAIN_DEPTH` niveaux plus aucune règle n'est exécutée.
 *
 * Les actions actuelles (activité, note, notification, `integration.outbound`)
 * ne publient aucun événement métier ; ces garde-fous protègent les actions
 * futures. Les événements différés (ex. `platform.activity.due` publié par la
 * tâche planifiée pour une activité créée par une règle) restent traités :
 * ils ne forment pas de boucle synchrone et permettent les escalades.
 */
export const AUTOMATION_ACTOR_PREFIX = 'automation:';
export const MAX_CHAIN_DEPTH = 3;

export interface AutomationChain {
  depth: number;
  rule_ids: string[];
}

const storage = new AsyncLocalStorage<AutomationChain>();

/** Chaîne d'automatisation en cours (undefined hors exécution d'action). */
export function currentChain(): AutomationChain | undefined {
  return storage.getStore();
}

/** Exécute `fn` en ajoutant `ruleId` à la chaîne courante. */
export function runInChain<T>(
  ruleId: string,
  fn: () => Promise<T>,
  parent: AutomationChain | undefined = currentChain(),
): Promise<T> {
  const chain: AutomationChain = {
    depth: (parent?.depth ?? 0) + 1,
    rule_ids: [...(parent?.rule_ids ?? []), ruleId],
  };
  return storage.run(chain, fn);
}

/** Raison d'ignorer un événement, ou `null` s'il doit être traité. */
export function ignoreReason(
  event: { actor_id?: string },
  chain: AutomationChain | undefined,
): string | null {
  if (
    typeof event.actor_id === 'string' &&
    event.actor_id.startsWith(AUTOMATION_ACTOR_PREFIX)
  ) {
    return 'événement produit par une automatisation';
  }
  if (chain && chain.depth >= MAX_CHAIN_DEPTH) {
    return `profondeur maximale de chaîne atteinte (${MAX_CHAIN_DEPTH})`;
  }
  return null;
}

/** Vrai si la règle est déjà dans la chaîne (récursion directe). */
export function isRuleInChain(
  ruleId: string,
  chain: AutomationChain | undefined,
): boolean {
  return !!chain?.rule_ids.includes(ruleId);
}
