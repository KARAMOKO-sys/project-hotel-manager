import { RecordActivityState } from './schemas/record-activity.entity';

/** Statut calculé d'une activité (non stocké). */
export type ActivityStatus =
  'overdue' | 'today' | 'planned' | 'done' | 'cancelled';

function startOfDay(date: Date): number {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy.getTime();
}

/**
 * Statut d'une activité : `overdue` si l'échéance est un jour passé,
 * `today` si elle tombe aujourd'hui, `planned` sinon (fuseau du serveur).
 */
export function computeActivityStatus(
  activity: { state: RecordActivityState | string; due_date: Date | string },
  now: Date = new Date(),
): ActivityStatus {
  if (activity.state === String(RecordActivityState.DONE)) return 'done';
  if (activity.state === String(RecordActivityState.CANCELLED))
    return 'cancelled';
  const due = startOfDay(new Date(activity.due_date));
  const today = startOfDay(now);
  if (due < today) return 'overdue';
  if (due === today) return 'today';
  return 'planned';
}
