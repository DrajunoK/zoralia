// Règles de jeu pures (affichage). Le serveur (RPC Supabase) reste l'autorité pour tout gain ou débit.

export const POINTS_PER_STEP = 5;
export const MAP_STEPS = 50;

/** 1 case parcourue toutes les 5 pépites gagnées cumulées, plafonnée à 50. */
export function mapStep(lifetimeEarned: number): number {
  return Math.min(MAP_STEPS, Math.floor(Math.max(0, lifetimeEarned) / POINTS_PER_STEP));
}

/** Pépites gagnées cumulées pour atteindre la case suivante (null si la carte est finie). */
export function nextStepAt(lifetimeEarned: number): number | null {
  const step = mapStep(lifetimeEarned);
  return step >= MAP_STEPS ? null : (step + 1) * POINTS_PER_STEP;
}

/** Territoires du kit : bornes en pépites gagnées cumulées (0-29, 30-79, 80-149, 150-249, 250+). */
export const TERRITORY_STARTS = [0, 30, 80, 150, 250] as const;

export function territoryIndex(lifetimeEarned: number): number {
  let idx = 0;
  TERRITORY_STARTS.forEach((start, i) => {
    if (lifetimeEarned >= start) idx = i;
  });
  return idx;
}

/** Territoire de la case n (1..50), atteinte à 5·n pépites. */
export function territoryOfCell(cell: number): number {
  return territoryIndex(cell * POINTS_PER_STEP);
}

export type Recurrence =
  | { type: 'daily' }
  | { type: 'weekly'; days: number[] } // 1 = lundi … 7 = dimanche
  | { type: 'once' };

export interface MissionLike {
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  recurrence: Recurrence;
}

export interface OccurrenceLike {
  due_date: string;
  status: 'claimed' | 'approved' | 'rejected';
}

/** Date locale AAAA-MM-JJ dans le fuseau du foyer. */
export function localDate(timezone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(now);
}

/** Jour ISO (1 = lundi … 7 = dimanche) d'une date AAAA-MM-JJ. */
export function isoWeekday(day: string): number {
  const d = new Date(`${day}T12:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

/** Miroir côté client de `private.mission_available` ; sert à l'affichage uniquement. */
export function isMissionAvailable(
  m: MissionLike,
  assignedChildIds: string[],
  childId: string,
  day: string,
  childOccurrences: OccurrenceLike[],
): boolean {
  if (!m.is_active) return false;
  if ((m.starts_at && day < m.starts_at) || (m.ends_at && day > m.ends_at)) return false;
  if (assignedChildIds.length > 0 && !assignedChildIds.includes(childId)) return false;
  switch (m.recurrence?.type ?? 'daily') {
    case 'weekly':
      return (m.recurrence as { days: number[] }).days?.includes(isoWeekday(day)) ?? false;
    case 'once':
      return !childOccurrences.some((o) => o.status !== 'rejected');
    default:
      return true;
  }
}

export type MissionState = 'available' | 'claimed' | 'approved' | 'rejected' | 'unavailable';

/** État d'une mission pour un enfant aujourd'hui. */
export function missionState(
  m: MissionLike,
  assignedChildIds: string[],
  childId: string,
  day: string,
  childOccurrences: OccurrenceLike[],
): MissionState {
  const today = childOccurrences.find((o) => o.due_date === day);
  if (today) return today.status;
  return isMissionAvailable(m, assignedChildIds, childId, day, childOccurrences) ? 'available' : 'unavailable';
}
