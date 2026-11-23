// Règles de jeu pures (affichage). Le serveur (RPC Supabase) reste l'autorité pour tout gain ou débit.
//
// Deux monnaies : les pas 👣 (missions → carte, jamais dépensés) et les pépites 🪙 (coffres → boutique, trésor).
// Carte : 100 étapes de 5 pas = 500 pas, 5 territoires de 100 pas. Miroir de supabase/migrations/0005_pas_et_coffres.sql.

export const STEPS_PER_CELL = 5;
export const MAP_CELLS = 100;
export const CELLS_PER_TERRITORY = 20;
export const STEPS_PER_TERRITORY = STEPS_PER_CELL * CELLS_PER_TERRITORY;
export const CHEST_COUNT = 20;
const CHEST_VALUES = [5, 8, 10, 15, 20]; // pépites par territoire (4 coffres chacun)

/** Étape atteinte sur la carte : 1 étape toutes les 5 pas, plafonnée à 100. */
export function mapCell(steps: number): number {
  return Math.min(MAP_CELLS, Math.floor(Math.max(0, steps) / STEPS_PER_CELL));
}

/** Total de pas pour atteindre l'étape suivante (null si la carte est finie). */
export function nextCellAt(steps: number): number | null {
  const cell = mapCell(steps);
  return cell >= MAP_CELLS ? null : (cell + 1) * STEPS_PER_CELL;
}

/** Pas nécessaires pour ouvrir le coffre n (1..20) : le 1er à 10 pas, puis un tous les 25 pas. */
export function chestThreshold(n: number): number {
  return 10 + 25 * (n - 1);
}

/** Pépites contenues dans le coffre n : 5, 8, 10, 15 puis 20 selon le territoire. */
export function chestValue(n: number): number {
  return CHEST_VALUES[Math.floor((n - 1) / 4)];
}

/** Étape de la carte où se trouve le coffre n. */
export function chestCell(n: number): number {
  return Math.ceil(chestThreshold(n) / STEPS_PER_CELL);
}

export function chestsReached(steps: number): number {
  let n = 0;
  while (n < CHEST_COUNT && chestThreshold(n + 1) <= steps) n++;
  return n;
}

/** Prochain coffre à ouvrir (null quand tous sont ouverts). */
export function nextChest(steps: number): { no: number; at: number; value: number; missing: number } | null {
  const no = chestsReached(steps) + 1;
  if (no > CHEST_COUNT) return null;
  return { no, at: chestThreshold(no), value: chestValue(no), missing: chestThreshold(no) - steps };
}

export function territoryIndex(steps: number): number {
  return Math.min(4, Math.floor(Math.max(0, steps) / STEPS_PER_TERRITORY));
}

/** Territoire de l'étape (1..100). */
export function territoryOfCell(cell: number): number {
  return Math.min(4, Math.floor((cell - 1) / CELLS_PER_TERRITORY));
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
