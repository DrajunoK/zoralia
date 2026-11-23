import { describe, expect, it } from 'vitest';
import {
  isMissionAvailable,
  isoWeekday,
  localDate,
  mapStep,
  missionState,
  nextStepAt,
  territoryIndex,
  territoryOfCell,
} from './game';

describe('carte', () => {
  it('avance d’une case toutes les 5 pépites gagnées', () => {
    expect(mapStep(0)).toBe(0);
    expect(mapStep(4)).toBe(0);
    expect(mapStep(5)).toBe(1);
    expect(mapStep(25)).toBe(5);
  });
  it('plafonne à 50 cases', () => {
    expect(mapStep(250)).toBe(50);
    expect(mapStep(9999)).toBe(50);
    expect(nextStepAt(250)).toBeNull();
  });
  it('indique la prochaine case', () => {
    expect(nextStepAt(18)).toBe(20);
    expect(nextStepAt(20)).toBe(25);
  });
  it('découpe les territoires selon le kit', () => {
    expect([0, 29, 30, 79, 80, 149, 150, 249, 250].map(territoryIndex)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4]);
    expect(territoryOfCell(5)).toBe(0); // 25 pépites
    expect(territoryOfCell(6)).toBe(1); // 30 pépites
    expect(territoryOfCell(50)).toBe(4);
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
