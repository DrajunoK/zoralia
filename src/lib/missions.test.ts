import { describe, expect, it } from 'vitest';
import { ICON_CHOICES, orderViews } from './missions';

describe('liste des missions de l’enfant', () => {
  it('met le reste à faire en tête, les validées à la fin, et masque ce qui n’est pas du jour', () => {
    const views = [
      { id: 'a', state: 'approved' as const }, { id: 'b', state: 'available' as const }, { id: 'c', state: 'unavailable' as const },
      { id: 'd', state: 'claimed' as const }, { id: 'e', state: 'available' as const }, { id: 'f', state: 'rejected' as const },
    ];
    expect(orderViews(views).map((v) => v.id)).toEqual(['b', 'e', 'd', 'f', 'a']);
  });
  it('garde l’ordre d’origine à égalité', () => {
    const views = ['x', 'y', 'z'].map((id) => ({ id, state: 'available' as const }));
    expect(orderViews(views).map((v) => v.id)).toEqual(['x', 'y', 'z']);
  });
  it('propose des icônes sans doublon', () => {
    expect(new Set(ICON_CHOICES).size).toBe(ICON_CHOICES.length);
  });
});
