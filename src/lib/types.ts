import type { Recurrence } from './game';

export type Category = 'daily' | 'heroic' | 'surprise';

export interface Family { id: string; name: string; timezone: string; active_theme_id: string | null }
export interface FamilySettings {
  family_id: string; dice_enabled: boolean; dice_mode: 'weekly' | 'quests'; dice_quest_threshold: number;
  treasure_enabled: boolean; approval_required: boolean; settings: { badge_thresholds?: Record<string, number>; show_siblings?: boolean };
}
export interface ThemeRow { id: string; slug: string; name: string }
export interface Child { id: string; family_id: string; display_name: string; avatar_key: string; color_key: string; is_active: boolean; has_pin: boolean }
export interface Wallet { child_id: string; balance: number; steps: number }
export interface ChestClaim { child_id: string; chest_no: number; pepites: number; claimed_at: string }
export interface StepTransaction { id: string; child_id: string; amount: number; type: string; description: string; created_at: string }
export interface Mission {
  id: string; family_id: string; title: string; description: string; category: Category; points: number; icon: string;
  recurrence: Recurrence; starts_at: string | null; ends_at: string | null; requires_approval: boolean; is_active: boolean;
}
export interface MissionChild { mission_id: string; child_id: string }
export interface Occurrence {
  id: string; mission_id: string; child_id: string; due_date: string; status: 'claimed' | 'approved' | 'rejected';
  claimed_at: string; review_note: string | null;
}
export interface Reward { id: string; family_id: string; title: string; description: string; cost: number; image_key: string; stock: number | null; is_active: boolean }
export interface Redemption { id: string; child_id: string; reward_id: string; cost_snapshot: number; status: 'requested' | 'approved' | 'rejected'; requested_at: string }
export interface Treasure { id: string; title: string; target_points: number; current_points: number; reward_description: string; status: 'active' | 'reached' | 'claimed' | 'archived' }
export interface Contribution { id: string; treasure_id: string; child_id: string; amount: number; created_at: string }
export interface Transaction { id: string; child_id: string; amount: number; type: string; description: string; created_at: string }
export interface DiceRoll { id: string; child_id: string; result_key: 'double' | 'plus_one' | 'joker' | 'surprise'; result_payload: { bonus?: number; resolved?: boolean }; rolled_at: string }
export interface DiceState { enabled: boolean; mode: 'weekly' | 'quests'; eligible: boolean; progress: number; threshold: number }
export interface Badge { id: string; slug: string; name: string; description: string; icon_key: string; threshold: { steps?: number } }
export interface ChildBadge { child_id: string; badge_id: string; earned_at: string }
