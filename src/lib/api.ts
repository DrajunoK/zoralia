import { supabase } from './supabase';
import type {
  Badge, Child, ChestClaim, ChildBadge, StepTransaction, Contribution, DiceRoll, DiceState, Family, FamilySettings, Mission, MissionChild,
  Occurrence, Redemption, Reward, ThemeRow, Transaction, Treasure, Wallet,
} from './types';

function ok<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export const api = {
  async myFamily(userId: string): Promise<Family | null> {
    const row = ok(await supabase.from('family_members').select('families(id,name,timezone,active_theme_id)')
      .eq('user_id', userId).limit(1).maybeSingle());
    return (row as unknown as { families: Family } | null)?.families ?? null;
  },
  async themes() { return ok(await supabase.from('themes').select('id,slug,name').eq('is_active', true)) as ThemeRow[]; },
  async settings(f: string) { return ok(await supabase.from('family_settings').select('*').eq('family_id', f).single()) as FamilySettings; },
  async children(f: string) { return ok(await supabase.from('children').select('*').eq('family_id', f).order('created_at')) as Child[]; },
  async wallets(f: string) { return ok(await supabase.from('child_wallet_summary').select('child_id,balance,steps').eq('family_id', f)) as Wallet[]; },
  async missions(f: string) { return ok(await supabase.from('missions').select('*').eq('family_id', f).order('created_at')) as Mission[]; },
  async missionChildren() { return ok(await supabase.from('mission_children').select('*')) as MissionChild[]; },
  /** Réclamées (toutes dates) + occurrences depuis `since` (aujourd'hui et historique récent). */
  async occurrences(since: string) {
    return ok(await supabase.from('mission_occurrences').select('*').or(`status.eq.claimed,due_date.gte.${since}`)) as Occurrence[];
  },
  async rewards(f: string) { return ok(await supabase.from('shop_rewards').select('*').eq('family_id', f).order('cost')) as Reward[]; },
  async redemptions(f: string) {
    return ok(await supabase.from('reward_redemptions').select('*').eq('family_id', f).order('requested_at', { ascending: false }).limit(50)) as Redemption[];
  },
  async treasure(f: string) {
    return ok(await supabase.from('family_treasures').select('*').eq('family_id', f).order('created_at', { ascending: false }).limit(1).maybeSingle()) as Treasure | null;
  },
  async contributions(treasureId: string) { return ok(await supabase.from('treasure_contributions').select('*').eq('treasure_id', treasureId)) as Contribution[]; },
  async transactions(f: string, limit = 60) {
    return ok(await supabase.from('points_transactions').select('id,child_id,amount,type,description,created_at').eq('family_id', f).order('created_at', { ascending: false }).limit(limit)) as Transaction[];
  },
  async chestClaims() { return ok(await supabase.from('chest_claims').select('child_id,chest_no,pepites,claimed_at')) as ChestClaim[]; },
  async stepTransactions(f: string, limit = 60) {
    return ok(await supabase.from('step_transactions').select('id,child_id,amount,type,description,created_at').eq('family_id', f).order('created_at', { ascending: false }).limit(limit)) as StepTransaction[];
  },
  async diceRolls(f: string) { return ok(await supabase.from('dice_rolls').select('*').eq('family_id', f).order('rolled_at', { ascending: false }).limit(50)) as DiceRoll[]; },
  async diceState(childId: string) { return ok(await supabase.rpc('dice_eligibility', { p_child: childId })) as DiceState; },
  async badges() { return ok(await supabase.from('badges').select('*').order('threshold->steps')) as Badge[]; },
  async childBadges() { return ok(await supabase.from('child_badges').select('*')) as ChildBadge[]; },

  // ── Mutations : RPC pour tout ce qui touche aux pépites ──
  createFamily: async (name: string, theme: string, timezone: string) =>
    ok(await supabase.rpc('create_family', { p_name: name, p_theme_slug: theme, p_timezone: timezone })) as string,
  claimMission: async (mission: string, child: string) => ok(await supabase.rpc('claim_mission', { p_mission: mission, p_child: child })),
  /** Valide plusieurs missions l'une après l'autre (le verrou de l'enfant les sérialise) ; s'arrête à la première erreur. */
  approveMany: async (ids: string[]) => { for (const id of ids) ok(await supabase.rpc('approve_mission', { p_occurrence: id, p_note: null })); return ids.length; },
  approveMission: async (occ: string, note?: string) => ok(await supabase.rpc('approve_mission', { p_occurrence: occ, p_note: note || null })),
  rejectMission: async (occ: string, note?: string) => ok(await supabase.rpc('reject_mission', { p_occurrence: occ, p_note: note || null })),
  recordMission: async (mission: string, child: string) => ok(await supabase.rpc('record_mission', { p_mission: mission, p_child: child })),
  requestReward: async (child: string, reward: string) => ok(await supabase.rpc('request_reward', { p_child: child, p_reward: reward })),
  approveReward: async (id: string) => ok(await supabase.rpc('approve_reward', { p_redemption: id })),
  rejectReward: async (id: string) => ok(await supabase.rpc('reject_reward', { p_redemption: id })),
  contribute: async (treasure: string, child: string, amount: number) =>
    ok(await supabase.rpc('contribute_to_treasure', { p_treasure: treasure, p_child: child, p_amount: amount })),
  rollDice: async (child: string) => ok(await supabase.rpc('roll_dice', { p_child: child })) as { id: string; result_key: DiceRoll['result_key']; result_payload: DiceRoll['result_payload'] },
  resolveRoll: async (id: string) => ok(await supabase.rpc('resolve_dice_roll', { p_roll: id })),
  adjustSteps: async (child: string, amount: number, reason: string) =>
    ok(await supabase.rpc('parent_adjust_steps', { p_child: child, p_amount: amount, p_reason: reason })),
  adjustPoints: async (child: string, amount: number, reason: string) =>
    ok(await supabase.rpc('parent_adjust_points', { p_child: child, p_amount: amount, p_reason: reason })),
  exportFamily: async (f: string) => ok(await supabase.rpc('export_family', { p_family: f })),
  deleteFamily: async (f: string) => ok(await supabase.rpc('delete_family', { p_family: f })),

  // ── Écritures directes autorisées par RLS (configuration) ──
  addChild: async (c: Pick<Child, 'family_id' | 'display_name' | 'avatar_key' | 'color_key'>) => ok(await supabase.from('children').insert(c)),
  updateChild: async (id: string, patch: Partial<Child>) => ok(await supabase.from('children').update(patch).eq('id', id)),
  updateFamily: async (id: string, patch: Partial<Family>) => ok(await supabase.from('families').update(patch).eq('id', id)),
  updateSettings: async (f: string, patch: Partial<FamilySettings>) => ok(await supabase.from('family_settings').update(patch).eq('family_id', f)),
  async saveMission(m: Partial<Mission> & { family_id: string }, childIds: string[], userId: string) {
    let id = m.id;
    if (id) {
      const { id: _id, family_id: _f, ...patch } = m;
      ok(await supabase.from('missions').update(patch).eq('id', id));
    } else {
      const row = ok(await supabase.from('missions').insert({ ...m, created_by: userId }).select('id').single()) as { id: string };
      id = row.id;
    }
    ok(await supabase.from('mission_children').delete().eq('mission_id', id));
    if (childIds.length) ok(await supabase.from('mission_children').insert(childIds.map((c) => ({ mission_id: id, child_id: c }))));
  },
  async saveReward(r: Partial<Reward> & { family_id: string }) {
    if (r.id) { const { id, family_id: _f, ...patch } = r; ok(await supabase.from('shop_rewards').update(patch).eq('id', id)); }
    else ok(await supabase.from('shop_rewards').insert(r));
  },
  saveTreasure: async (t: { id?: string; family_id: string; title: string; target_points: number; reward_description: string }) => {
    if (t.id) { const { id, family_id: _f, ...patch } = t; ok(await supabase.from('family_treasures').update(patch).eq('id', id)); }
    else ok(await supabase.from('family_treasures').insert(t));
  },
  setTreasureStatus: async (id: string, status: Treasure['status']) => ok(await supabase.from('family_treasures').update({ status }).eq('id', id)),
};
