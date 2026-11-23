// Faux client Supabase pour travailler le design sans backend : `npm run dev:mock`.
// Branché à la place de ./supabase par l'alias de vite.config.ts quand le mode est « mock ».
// Les écritures sont ignorées ; `?theme=pirates` choisit l'univers, `?logout` affiche l'écran de connexion.

const params = new URLSearchParams(location.search);
export const supabaseConfigured = true;

const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const THEME_SLUGS = ['aventuriers', 'princesses', 'pirates', 'espace', 'dinosaures'];
const themes = THEME_SLUGS.map((slug, i) => ({ id: U(100 + i), slug, name: slug, is_active: true }));
const activeTheme = themes.find((t) => t.slug === params.get('theme')) ?? themes[0];

const FAMILY = U(1), LEA = U(11), TOM = U(12);
const day = new Date().toISOString().slice(0, 10);

const mission = (n: number, title: string, category: string, points: number, description = '') => ({
  id: U(200 + n), family_id: FAMILY, title, description, category, points, recurrence: { type: 'daily' },
  starts_at: null, ends_at: null, requires_approval: true, is_active: true,
});
const rows: Record<string, unknown[]> = {
  family_members: [{ user_id: U(2), families: { id: FAMILY, name: 'Bobo Family', timezone: 'Europe/Paris', active_theme_id: activeTheme.id } }],
  themes,
  family_settings: [{ family_id: FAMILY, dice_enabled: true, dice_mode: 'quests', dice_quest_threshold: 5, treasure_enabled: true, approval_required: true, settings: {} }],
  children: [
    { id: LEA, family_id: FAMILY, display_name: 'Léa', avatar_key: 'fox', color_key: 'sun', is_active: true },
    { id: TOM, family_id: FAMILY, display_name: 'Tom', avatar_key: 'panda', color_key: 'sky', is_active: true },
  ],
  child_wallet_summary: [{ child_id: LEA, family_id: FAMILY, balance: 14, steps: 62 }, { child_id: TOM, family_id: FAMILY, balance: 5, steps: 27 }],
  missions: [
    mission(1, 'Mettre la table', 'daily', 1), mission(2, 'Ranger ma chambre', 'daily', 1),
    mission(3, 'Je mange correctement', 'daily', 1, 'Avec ma fourchette et mon couteau, et je ne me lève pas de table.'),
    mission(4, 'Je me brosse les dents', 'daily', 1), mission(5, 'Pendre mon manteau', 'daily', 1),
    mission(6, 'Je maîtrise mes émotions', 'heroic', 3), mission(7, 'Très bon travail à l’école', 'heroic', 5),
  ],
  mission_children: [],
  mission_occurrences: [
    { id: U(300), mission_id: U(202), child_id: LEA, due_date: day, status: 'claimed', claimed_at: new Date().toISOString(), review_note: null },
    { id: U(301), mission_id: U(204), child_id: LEA, due_date: day, status: 'approved', claimed_at: new Date().toISOString(), review_note: null },
  ],
  shop_rewards: [
    ['Choisir le film du vendredi', 5, 'film'], ['Se coucher 15 minutes plus tard', 5, 'moon'], ['Choisir le dessert', 10, 'dessert'],
    ['Choisir le jeu en famille', 10, 'game'], ['Sortie choisie', 15, 'outing'], ['Journée « c’est moi qui décide »', 40, 'crown'],
  ].map(([title, cost, image_key], i) => ({ id: U(400 + i), family_id: FAMILY, title, description: '', cost, image_key, stock: null, is_active: true })),
  reward_redemptions: [{ id: U(500), child_id: TOM, reward_id: U(402), cost_snapshot: 10, status: 'requested', requested_at: new Date().toISOString() }],
  family_treasures: [{ id: U(600), family_id: FAMILY, title: 'Le coffre de la famille', target_points: 100, current_points: 48, reward_description: 'Une soirée pizza-cinéma 🍕', status: 'active' }],
  treasure_contributions: [{ id: U(601), treasure_id: U(600), child_id: LEA, amount: 30, created_at: new Date().toISOString() }, { id: U(602), treasure_id: U(600), child_id: TOM, amount: 18, created_at: new Date().toISOString() }],
  points_transactions: [{ id: U(700), child_id: LEA, amount: 5, type: 'chest_reward', description: 'Coffre n°3', created_at: new Date().toISOString() }],
  step_transactions: [{ id: U(710), child_id: LEA, amount: 1, type: 'mission_steps', description: 'Pendre mon manteau', created_at: new Date().toISOString() }],
  chest_claims: [{ child_id: LEA, chest_no: 1, pepites: 0, claimed_at: '' }],
  dice_rolls: [],
  badges: [['petit-aventurier', 'Petit aventurier', 'seedling', 10], ['explorateur', 'Explorateur', 'compass', 75], ['gardien-de-la-maison', 'Gardien de la maison', 'shield', 175], ['heros-confirme', 'Héros confirmé', 'medal', 300], ['maitre-des-missions', 'Maître des missions', 'trophy', 500]]
    .map(([slug, name, icon_key, steps], i) => ({ id: U(800 + i), slug, name, description: 'Bravo !', icon_key, threshold: { steps } })),
  child_badges: [{ child_id: LEA, badge_id: U(800), earned_at: '' }],
};

type Row = Record<string, unknown>;
function query(table: string) {
  let data: unknown = rows[table] ?? [];
  let single = false;
  const q: Record<string, unknown> = {
    select: () => q, order: () => q, limit: () => q, or: () => q, neq: () => q, insert: () => q, update: () => q, delete: () => q,
    eq: (field: string, value: unknown) => { data = (data as Row[]).filter((r) => !(field in r) || r[field] === value); return q; },
    maybeSingle: () => { single = true; return q; }, single: () => { single = true; return q; },
    then: (resolve: (v: unknown) => unknown) => resolve({ data: single ? (data as Row[])[0] ?? null : data, error: null }),
  };
  return q;
}

const session = { user: { id: U(2), user_metadata: { full_name: 'Justin' } } };
export const supabase = {
  from: (t: string) => query(t),
  schema: () => supabase,
  rpc: (name: string) => Promise.resolve({
    data: name === 'dice_eligibility' ? { enabled: true, mode: 'quests', eligible: true, progress: 5, threshold: 5 }
      : name === 'roll_dice' ? { id: 'r', result_key: 'double', result_payload: { bonus: 5 } } : null,
    error: null,
  }),
  auth: {
    getSession: () => Promise.resolve({ data: { session: params.has('logout') ? null : session } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signOut: () => Promise.resolve({}),
    signInWithOAuth: () => Promise.resolve({ error: null }),
  },
};
