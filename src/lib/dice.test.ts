import { describe, expect, it } from 'vitest';
import { FACES, effectOf, unlockText } from './dice';

describe('dé du destin', () => {
  it('a six faces différentes', () => {
    expect(FACES).toHaveLength(6);
    expect(new Set(FACES.map((f) => f.key)).size).toBe(6);
  });
  it('décrit chaque effet', () => {
    expect(effectOf('lose', {})).toMatchObject({ unit: 'none', amount: 0 });
    expect(effectOf('steps2', { steps: 2 })).toMatchObject({ unit: 'steps', amount: 2, label: '+2 pas' });
    expect(effectOf('pep1', { pepites: 1 })).toMatchObject({ unit: 'pepites', amount: 1, label: '+1 pépite' });
    expect(effectOf('pep2', { pepites: 2 })).toMatchObject({ unit: 'pepites', amount: 2, label: '+2 pépites' });
  });
  it('la face « coffre » dit où vont les pépites, et ce qui change quand le coffre est plein', () => {
    expect(effectOf('chest2', { chest: 2 })).toMatchObject({ unit: 'chest', amount: 2 });
    expect(effectOf('chest2', { chest: 1 }).message).toContain('1 pépite de plus');
    expect(effectOf('chest2', { pepites: 2, fallback: true })).toMatchObject({ unit: 'pepites', amount: 2 });
  });
  it('lit les anciens lancers sans planter', () => {
    expect(effectOf('double', { bonus: 3 })).toMatchObject({ unit: 'pepites', amount: 3 });
    expect(effectOf('joker', {}).unit).toBe('none');
  });
  it('explique comment débloquer le dé', () => {
    expect(unlockText({ eligible: false, rolled: false, progress: 6, threshold: 10 })).toContain('encore 4 missions');
    expect(unlockText({ eligible: false, rolled: false, progress: 9, threshold: 10 })).toContain('encore 1 mission ');
    expect(unlockText({ eligible: true, rolled: false, progress: 10, threshold: 10 })).toContain('prêt');
    expect(unlockText({ eligible: false, rolled: true, progress: 12, threshold: 10 })).toContain('demain');
  });
});
