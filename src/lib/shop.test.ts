import { describe, expect, it } from 'vitest';
import { groupByTier, tierOf } from './shop';

describe('paliers de la boutique', () => {
  it('range les prix dans le bon palier aux frontières', () => {
    expect([1, 5, 9, 10, 24, 25, 40].map((c) => tierOf(c).key)).toEqual(['small', 'small', 'small', 'medium', 'medium', 'large', 'large']);
  });
  it('groupe du moins cher au plus cher, saute les paliers vides et garde l’ordre', () => {
    const items = [{ id: 'a', cost: 40 }, { id: 'b', cost: 5 }, { id: 'c', cost: 5 }, { id: 'd', cost: 25 }];
    const groups = groupByTier(items);
    expect(groups.map((g) => g.tier.key)).toEqual(['small', 'large']);
    expect(groups[0].items.map((i) => i.id)).toEqual(['b', 'c']);
    expect(groups[1].items.map((i) => i.id)).toEqual(['a', 'd']);
    expect(groupByTier([])).toEqual([]);
  });
});
