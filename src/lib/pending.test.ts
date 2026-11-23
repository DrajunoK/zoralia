import { describe, expect, it } from 'vitest';
import { dayLabel, groupPending, shiftDay } from './pending';

describe('validation en attente', () => {
  it('décale les jours à travers les fins de mois et d’année', () => {
    expect(shiftDay('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftDay('2026-01-01', -1)).toBe('2025-12-31');
    expect(shiftDay('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('nomme aujourd’hui, hier puis la date', () => {
    expect(dayLabel('2026-11-23', '2026-11-23')).toBe('Aujourd’hui');
    expect(dayLabel('2026-11-22', '2026-11-23')).toBe('Hier');
    expect(dayLabel('2026-11-20', '2026-11-23')).toMatch(/20/);
  });
  it('regroupe par jour (récent d’abord) puis par enfant', () => {
    const items = [
      { id: 1, due_date: '2026-11-22', child_id: 'tom' },
      { id: 2, due_date: '2026-11-23', child_id: 'lea' },
      { id: 3, due_date: '2026-11-23', child_id: 'tom' },
      { id: 4, due_date: '2026-11-23', child_id: 'lea' },
    ];
    const groups = groupPending(items, '2026-11-23');
    expect(groups.map((g) => [g.label, g.count])).toEqual([['Aujourd’hui', 3], ['Hier', 1]]);
    expect(groups[0].children.map((c) => [c.childId, c.items.map((i) => i.id)])).toEqual([['lea', [2, 4]], ['tom', [3]]]);
    expect(groupPending([], '2026-11-23')).toEqual([]);
  });
});
