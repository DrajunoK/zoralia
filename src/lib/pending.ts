// Validation des missions : les demandes en attente sont regroupées par jour puis par enfant.

/** Date AAAA-MM-JJ décalée de `delta` jours (calcul en UTC, sans effet de fuseau). */
export function shiftDay(date: string, delta: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** « Aujourd'hui », « Hier », sinon « lun. 3 nov. ». */
export function dayLabel(date: string, today: string): string {
  if (date === today) return 'Aujourd’hui';
  if (date === shiftDay(today, -1)) return 'Hier';
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
}

export interface PendingGroup<T> { date: string; label: string; children: { childId: string; items: T[] }[]; count: number }

/** Jours du plus récent au plus ancien ; dans chaque jour, un groupe par enfant dans l'ordre d'arrivée. */
export function groupPending<T extends { due_date: string; child_id: string }>(items: T[], today: string): PendingGroup<T>[] {
  const days = new Map<string, Map<string, T[]>>();
  for (const it of items) {
    const byChild = days.get(it.due_date) ?? new Map<string, T[]>();
    byChild.set(it.child_id, [...(byChild.get(it.child_id) ?? []), it]);
    days.set(it.due_date, byChild);
  }
  return [...days.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, byChild]) => ({
      date,
      label: dayLabel(date, today),
      children: [...byChild.entries()].map(([childId, list]) => ({ childId, items: list })),
      count: [...byChild.values()].reduce((n, l) => n + l.length, 0),
    }));
}
