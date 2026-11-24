import { describe, expect, it } from 'vitest';
import {
  CHEST_COUNT,
  chestCell,
  chestSegment,
  chestsReached,
  chestThreshold,
  chestValue,
  isMissionAvailable,
  isoWeekday,
  localDate,
  mapCell,
  missionState,
  nextCellAt,
  nextChest,
  territoryIndex,
  territoryOfCell,
} from './game';

describe('carte', () => {
  it('avance d’une case par pas', () => {
    expect(mapCell(0)).toBe(0);
    expect(mapCell(1)).toBe(1);
    expect(mapCell(36)).toBe(36);
    expect(mapCell(-4)).toBe(0);
  });
  it('plafonne à 500 cases', () => {
    expect(mapCell(500)).toBe(500);
    expect(mapCell(9999)).toBe(500);
    expect(nextCellAt(500)).toBeNull();
  });
  it('indique la case suivante', () => {
    expect(nextCellAt(18)).toBe(19);
    expect(nextCellAt(0)).toBe(1);
  });
  it('découpe cinq territoires de 100 pas', () => {
    expect([0, 99, 100, 199, 200, 399, 400, 500].map(territoryIndex)).toEqual([0, 0, 1, 1, 2, 3, 4, 4]);
    expect(territoryOfCell(100)).toBe(0);
    expect(territoryOfCell(101)).toBe(1);
    expect(territoryOfCell(500)).toBe(4);
  });
});

describe('coffres', () => {
  it('le premier coffre arrive vite, puis un tous les 25 pas', () => {
    expect([1, 2, 3, 20].map(chestThreshold)).toEqual([10, 35, 60, 485]);
  });
  it('la valeur augmente avec les territoires', () => {
    expect([1, 4, 5, 8, 9, 13, 17, 20].map(chestValue)).toEqual([5, 5, 8, 8, 10, 15, 20, 20]);
    const total = Array.from({ length: CHEST_COUNT }, (_, i) => chestValue(i + 1)).reduce((a, b) => a + b, 0);
    expect(total).toBe(232);
  });
  it('place chaque coffre sur la case de son seuil', () => {
    expect(chestCell(1)).toBe(10);
    expect(chestCell(2)).toBe(35);
    expect(chestCell(20)).toBe(485);
  });
  it('mesure l’avancement vers le prochain coffre', () => {
    expect(chestSegment(0)).toEqual({ done: 0, size: 10 });
    expect(chestSegment(4)).toEqual({ done: 4, size: 10 });
    expect(chestSegment(10)).toEqual({ done: 0, size: 25 });
    expect(chestSegment(62)).toEqual({ done: 2, size: 25 });
    expect(chestSegment(485)).toBeNull();
  });
  it('compte les coffres atteints et annonce le suivant', () => {
    expect(chestsReached(9)).toBe(0);
    expect(chestsReached(10)).toBe(1);
    expect(chestsReached(62)).toBe(3);
    expect(chestsReached(9999)).toBe(CHEST_COUNT);
    expect(nextChest(62)).toEqual({ no: 4, at: 85, value: 5, missing: 23 });
    expect(nextChest(485)).toBeNull();
  });
});

describe('dates', () => {
  it('calcule la date locale du foyer', () => {
    const t = new Date('2026-03-01T23:30:00Z');
    expect(localDate('Europe/Paris', t)).toBe('2026-03-02');
    expect(localDate('UTC', t)).toBe('2026-03-01');
  });
  it('donne le jour ISO', () => {
    expect(isoWeekday('2026-03-02')).toBe(1); // lundi
    expect(isoWeekday('2026-03-08')).toBe(7); // dimanche
  });
});

describe('disponibilité des missions', () => {
  const base = { is_active: true, starts_at: null, ends_at: null, recurrence: { type: 'daily' as const } };
  it('quotidienne : toujours disponible', () => {
    expect(isMissionAvailable(base, [], 'c1', '2026-03-02', [])).toBe(true);
  });
  it('désactivée ou hors fenêtre', () => {
    expect(isMissionAvailable({ ...base, is_active: false }, [], 'c1', '2026-03-02', [])).toBe(false);
    expect(isMissionAvailable({ ...base, starts_at: '2026-03-03' }, [], 'c1', '2026-03-02', [])).toBe(false);
    expect(isMissionAvailable({ ...base, ends_at: '2026-03-01' }, [], 'c1', '2026-03-02', [])).toBe(false);
  });
  it('limitée à certains enfants', () => {
    expect(isMissionAvailable(base, ['c2'], 'c1', '2026-03-02', [])).toBe(false);
    expect(isMissionAvailable(base, ['c1', 'c2'], 'c1', '2026-03-02', [])).toBe(true);
  });
  it('hebdomadaire : seulement les jours choisis', () => {
    const weekly = { ...base, recurrence: { type: 'weekly' as const, days: [1, 3] } };
    expect(isMissionAvailable(weekly, [], 'c1', '2026-03-02', [])).toBe(true); // lundi
    expect(isMissionAvailable(weekly, [], 'c1', '2026-03-03', [])).toBe(false); // mardi
  });
  it('unique : plus disponible après une réclamation non refusée', () => {
    const once = { ...base, recurrence: { type: 'once' as const } };
    expect(isMissionAvailable(once, [], 'c1', '2026-03-02', [])).toBe(true);
    expect(isMissionAvailable(once, [], 'c1', '2026-03-05', [{ due_date: '2026-03-02', status: 'approved' }])).toBe(false);
    expect(isMissionAvailable(once, [], 'c1', '2026-03-05', [{ due_date: '2026-03-02', status: 'rejected' }])).toBe(true);
  });
  it('état du jour : une occurrence existante prime', () => {
    expect(missionState(base, [], 'c1', '2026-03-02', [{ due_date: '2026-03-02', status: 'claimed' }])).toBe('claimed');
    expect(missionState(base, [], 'c1', '2026-03-02', [{ due_date: '2026-03-01', status: 'approved' }])).toBe('available');
    expect(missionState({ ...base, is_active: false }, [], 'c1', '2026-03-02', [])).toBe('unavailable');
  });
});
