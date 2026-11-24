import { describe, expect, it } from 'vitest';
import { buildActivity } from './activity';

const at = (m: number) => `2026-11-24T10:${String(m).padStart(2, '0')}:00Z`;
describe('journal d’activité', () => {
  const points = [
    { id: 'p1', child_id: 'a', amount: 5, type: 'chest_reward', description: 'Coffre n°1', created_at: at(1) },
    { id: 'p2', child_id: 'a', amount: 2, type: 'dice_bonus', description: 'Dé du destin', created_at: at(5) },
  ];
  const steps = [
    { id: 's1', child_id: 'a', amount: 1, type: 'mission_steps', description: 'Mettre la table', created_at: at(2) },
    { id: 's2', child_id: 'a', amount: 2, type: 'dice_steps', description: 'Dé du destin', created_at: at(4) },
  ];
  const rolls = [
    { id: 'r1', child_id: 'a', result_key: 'pep2' as const, result_payload: { pepites: 2 }, rolled_at: at(5) },
    { id: 'r2', child_id: 'a', result_key: 'steps2' as const, result_payload: { steps: 2 }, rolled_at: at(4) },
    { id: 'r3', child_id: 'b', result_key: 'lose' as const, result_payload: {}, rolled_at: at(3) },
    { id: 'r4', child_id: 'b', result_key: 'chest2' as const, result_payload: { chest: 2 }, rolled_at: at(6) },
  ];
  const rows = buildActivity({ points, steps, rolls });
  it('montre chaque lancer, même « pas de chance », avec la mention Dé du destin', () => {
    const dice = rows.filter((r) => r.dice);
    expect(dice).toHaveLength(4);
    expect(dice.every((r) => r.label === 'Dé du destin')).toBe(true);
    expect(dice.find((r) => r.key === 'dr3')).toMatchObject({ amount: 0, unit: 'none', detail: 'Pas de chance' });
    expect(dice.find((r) => r.key === 'dr4')).toMatchObject({ amount: 2, unit: 'chest' });
  });
  it('ne répète pas les gains du dé en double (une seule ligne par lancer)', () => {
    expect(rows).toHaveLength(2 + 4);   // 1 coffre + 1 mission + 4 lancers
    expect(rows.filter((r) => !r.dice).map((r) => r.key).sort()).toEqual(['pp1', 'ss1']);
  });
  it('trie du plus récent au plus ancien', () => {
    expect(rows.map((r) => r.created_at)).toEqual([...rows.map((r) => r.created_at)].sort().reverse());
  });
});
