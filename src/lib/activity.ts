// Journal d'activité : pas, pépites et lancers du dé fusionnés dans l'ordre du temps.

import { effectOf, type RollPayload, type Unit } from './dice';
import type { DiceRoll, StepTransaction, Transaction } from './types';

export const TYPE_LABELS: Record<string, string> = {
  mission_reward: 'Mission', shop_purchase: 'Boutique', family_treasure_contribution: 'Trésor', dice_bonus: 'Dé du destin', dice_steps: 'Dé du destin',
  parent_adjustment_credit: 'Bonus parent', parent_adjustment_debit: 'Retrait parent', refund: 'Remboursement', chest_reward: 'Coffre de la carte',
  mission_steps: 'Mission', parent_adjustment_steps: 'Pas ajoutés', migration: 'Gains passés',
};

export interface ActivityRow { key: string; child_id: string; created_at: string; label: string; detail: string; amount: number; unit: Unit; dice: boolean }

/** Les gains du dé sont montrés une seule fois, par le lancer lui-même (avec « Dé du destin » et la face tirée), pas par leurs lignes de pas ou de pépites. */
export function buildActivity(input: { points: Transaction[]; steps: StepTransaction[]; rolls: DiceRoll[] }): ActivityRow[] {
  const rows: ActivityRow[] = [
    ...input.points.filter((x) => x.type !== 'dice_bonus').map((x): ActivityRow => ({ key: `p${x.id}`, child_id: x.child_id, created_at: x.created_at, label: TYPE_LABELS[x.type] ?? x.type, detail: x.description, amount: x.amount, unit: 'pepites', dice: false })),
    ...input.steps.filter((x) => x.type !== 'dice_steps').map((x): ActivityRow => ({ key: `s${x.id}`, child_id: x.child_id, created_at: x.created_at, label: TYPE_LABELS[x.type] ?? x.type, detail: x.description, amount: x.amount, unit: 'steps', dice: false })),
    ...input.rolls.map((r): ActivityRow => { const e = effectOf(r.result_key, r.result_payload as RollPayload); return { key: `d${r.id}`, child_id: r.child_id, created_at: r.rolled_at, label: 'Dé du destin', detail: e.label, amount: e.amount, unit: e.unit, dice: true }; }),
  ];
  return rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
}
