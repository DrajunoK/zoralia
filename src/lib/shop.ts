// Boutique : les récompenses sont rangées par palier de prix, sous des bandeaux colorés.

export interface Tier { key: 'small' | 'medium' | 'large'; icon: string; label: string; hint: string; color: string; from: number }

/** Paliers en pépites : la première récompense de chaque palier commence à `from`. */
export const TIERS: Tier[] = [
  { key: 'small', icon: '🍬', label: 'Petits plaisirs', hint: 'moins de 10 pépites', color: 'var(--second)', from: 0 },
  { key: 'medium', icon: '🎁', label: 'Belles récompenses', hint: 'de 10 à 24 pépites', color: '#f26d3d', from: 10 },
  { key: 'large', icon: '👑', label: 'Grandes récompenses', hint: '25 pépites et plus', color: '#8b5cf6', from: 25 },
];

export function tierOf(cost: number): Tier {
  return [...TIERS].reverse().find((t) => cost >= t.from) ?? TIERS[0];
}

/** Regroupe par palier (du moins cher au plus cher) en gardant l'ordre d'origine dans chaque groupe ; ignore les paliers vides. */
export function groupByTier<T extends { cost: number }>(items: T[]): { tier: Tier; items: T[] }[] {
  return TIERS.map((tier) => ({ tier, items: items.filter((i) => tierOf(i.cost) === tier) })).filter((g) => g.items.length > 0);
}
