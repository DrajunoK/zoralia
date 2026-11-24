import { describe, expect, it } from 'vitest';
import { PARENT_MINUTES, isChildUnlocked, isCompletePin, isParentUnlocked, lockAll, unlockChild, unlockParent, type Store } from './lock';

const memory = (): Store => { const m = new Map<string, string>(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) }; };

describe('verrou des profils', () => {
  it('un enfant n’est ouvert qu’après son code, et seulement lui', () => {
    const s = memory();
    expect(isChildUnlocked(s, 'lea')).toBe(false);
    unlockChild(s, 'lea');
    expect(isChildUnlocked(s, 'lea')).toBe(true);
    expect(isChildUnlocked(s, 'tom')).toBe(false);
  });
  it('l’espace parent reste ouvert 15 minutes puis se referme', () => {
    const s = memory();
    unlockParent(s, 1_000);
    expect(isParentUnlocked(s, 1_000 + (PARENT_MINUTES * 60_000) - 1)).toBe(true);
    expect(isParentUnlocked(s, 1_000 + PARENT_MINUTES * 60_000)).toBe(false);
  });
  it('revenir aux profils referme tout', () => {
    const s = memory();
    unlockChild(s, 'lea'); unlockParent(s);
    lockAll(s);
    expect(isChildUnlocked(s, 'lea')).toBe(false);
    expect(isParentUnlocked(s)).toBe(false);
  });
  it('résiste à un stockage corrompu', () => {
    const s = memory(); s.setItem('zoralia:unlocked', '{pas du json');
    expect(isChildUnlocked(s, 'lea')).toBe(false);
    expect(isParentUnlocked(s)).toBe(false);
  });
  it('reconnaît un code complet de 4 chiffres', () => {
    expect(['1234', '0000'].every(isCompletePin)).toBe(true);
    expect(['', '123', '12345', '12a4', ' 123'].some(isCompletePin)).toBe(false);
  });
});
