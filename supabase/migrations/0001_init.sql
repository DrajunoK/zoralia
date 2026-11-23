-- Zoralia — schéma initial : tables, RLS, vues, RPC.
-- Partage le projet Supabase (donc auth.users et la connexion Google) avec Popote, sans rien toucher à `public` :
-- tout vit dans le schéma `zoralia` (à ajouter à « Exposed schemas » : Settings → API).
-- Règle : le navigateur ne modifie jamais le ledger ni les compteurs ; tout passe par des RPC
-- `security definer` qui vérifient l'utilisateur Auth, l'appartenance au foyer et l'état métier.

create schema if not exists zoralia;
create schema if not exists zoralia_private;
grant usage on schema zoralia to authenticated;

-- ───────────────────────── Tables ─────────────────────────

create table zoralia.themes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  tokens jsonb not null default '{}',
  assets jsonb not null default '{}',
  is_active boolean not null default true
);

create table zoralia.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  timezone text not null default 'Europe/Paris',
  created_by uuid not null references auth.users on delete cascade,
  active_theme_id uuid references zoralia.themes,
  created_at timestamptz not null default now()
);

create table zoralia.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references zoralia.families on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null default 'parent' check (role in ('parent')),
  created_at timestamptz not null default now(),
  unique (family_id, user_id)
);
create index on zoralia.family_members (user_id);

create table zoralia.children (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references zoralia.families on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 30),
  avatar_key text not null default 'fox',
  color_key text not null default 'sun',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index on zoralia.children (family_id);

create table zoralia.family_settings (
  family_id uuid primary key references zoralia.families on delete cascade,
  dice_enabled boolean not null default true,
  dice_mode text not null default 'quests' check (dice_mode in ('weekly', 'quests')),
  dice_quest_threshold int not null default 5 check (dice_quest_threshold between 1 and 50),
  treasure_enabled boolean not null default true,
  approval_required boolean not null default true,
  settings jsonb not null default '{}'
);

create table zoralia.missions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references zoralia.families on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  description text not null default '',
  category text not null check (category in ('daily', 'heroic', 'surprise')),
  points int not null check (points between 1 and 20),
  recurrence jsonb not null default '{"type":"daily"}',
  starts_at date,
  ends_at date,
  requires_approval boolean not null default true,
  is_active boolean not null default true,
  created_by uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now()
);
create index on zoralia.missions (family_id);

-- Aucune ligne = mission pour tous les enfants actifs du foyer.
create table zoralia.mission_children (
  mission_id uuid not null references zoralia.missions on delete cascade,
  child_id uuid not null references zoralia.children on delete cascade,
  primary key (mission_id, child_id)
);

create table zoralia.mission_occurrences (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references zoralia.missions on delete cascade,
  child_id uuid not null references zoralia.children on delete cascade,
  due_date date not null,
  status text not null check (status in ('claimed', 'approved', 'rejected')),
  claimed_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users on delete set null,
  review_note text,
  unique (mission_id, child_id, due_date)
);
create index on zoralia.mission_occurrences (child_id, due_date);

create table zoralia.points_transactions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references zoralia.families on delete cascade,
  child_id uuid not null references zoralia.children on delete cascade,
  amount int not null check (amount <> 0),
  type text not null check (type in (
    'mission_reward', 'shop_purchase', 'family_treasure_contribution', 'dice_bonus',
    'parent_adjustment_credit', 'parent_adjustment_debit', 'refund')),
  reference_id uuid,
  description text not null default '',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  idempotency_key text unique
);
create index on zoralia.points_transactions (child_id, created_at desc);
create index on zoralia.points_transactions (family_id, created_at desc);

create table zoralia.shop_rewards (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references zoralia.families on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  description text not null default '',
  cost int not null check (cost between 1 and 1000),
  image_key text not null default 'gift',
  stock int check (stock >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index on zoralia.shop_rewards (family_id);

create table zoralia.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references zoralia.families on delete cascade,
  child_id uuid not null references zoralia.children on delete cascade,
  reward_id uuid not null references zoralia.shop_rewards,
  cost_snapshot int not null check (cost_snapshot > 0),
  status text not null default 'requested' check (status in ('requested', 'approved', 'rejected')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users on delete set null
);
create index on zoralia.reward_redemptions (family_id, status);

create table zoralia.family_treasures (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references zoralia.families on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  target_points int not null check (target_points between 1 and 5000),
  current_points int not null default 0 check (current_points >= 0),
  reward_description text not null default '',
  status text not null default 'active' check (status in ('active', 'reached', 'claimed', 'archived')),
  created_at timestamptz not null default now()
);
-- Un seul trésor en cours à la fois par foyer.
create unique index family_treasures_one_open on zoralia.family_treasures (family_id)
  where status in ('active', 'reached');

create table zoralia.treasure_contributions (
  id uuid primary key default gen_random_uuid(),
  treasure_id uuid not null references zoralia.family_treasures on delete cascade,
  child_id uuid not null references zoralia.children on delete cascade,
  amount int not null check (amount > 0),
  transaction_id uuid references zoralia.points_transactions on delete set null,
  created_at timestamptz not null default now()
);
create index on zoralia.treasure_contributions (treasure_id);

create table zoralia.dice_rolls (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references zoralia.families on delete cascade,
  child_id uuid not null references zoralia.children on delete cascade,
  result_key text not null check (result_key in ('double', 'plus_one', 'joker', 'surprise')),
  result_payload jsonb not null default '{}',
  rolled_at timestamptz not null default now(),
  consumed_quest_count int not null default 0
);
create index on zoralia.dice_rolls (child_id, rolled_at desc);

create table zoralia.badges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  icon_key text not null default 'star',
  threshold jsonb not null default '{}',
  theme_id uuid references zoralia.themes
);

create table zoralia.child_badges (
  child_id uuid not null references zoralia.children on delete cascade,
  badge_id uuid not null references zoralia.badges on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (child_id, badge_id)
);

-- ───────────────────────── Aides RLS ─────────────────────────

create function zoralia.is_family_member(fid uuid) returns boolean
language sql stable security definer set search_path = zoralia as $$
  select exists (select 1 from zoralia.family_members where family_id = fid and user_id = auth.uid())
$$;

create function zoralia.is_family_parent(fid uuid) returns boolean
language sql stable security definer set search_path = zoralia as $$
  select exists (select 1 from zoralia.family_members
                 where family_id = fid and user_id = auth.uid() and role = 'parent')
$$;

-- ───────────────────────── RLS ─────────────────────────

alter table zoralia.themes enable row level security;
alter table zoralia.families enable row level security;
alter table zoralia.family_members enable row level security;
alter table zoralia.children enable row level security;
alter table zoralia.family_settings enable row level security;
alter table zoralia.missions enable row level security;
alter table zoralia.mission_children enable row level security;
alter table zoralia.mission_occurrences enable row level security;
alter table zoralia.points_transactions enable row level security;
alter table zoralia.shop_rewards enable row level security;
alter table zoralia.reward_redemptions enable row level security;
alter table zoralia.family_treasures enable row level security;
alter table zoralia.treasure_contributions enable row level security;
alter table zoralia.dice_rolls enable row level security;
alter table zoralia.badges enable row level security;
alter table zoralia.child_badges enable row level security;

create policy themes_select on zoralia.themes for select to authenticated using (true);
create policy badges_select on zoralia.badges for select to authenticated using (true);

create policy families_select on zoralia.families for select to authenticated
  using (zoralia.is_family_member(id));
create policy families_update on zoralia.families for update to authenticated
  using (zoralia.is_family_parent(id)) with check (zoralia.is_family_parent(id));

create policy members_select on zoralia.family_members for select to authenticated
  using (zoralia.is_family_member(family_id));

create policy children_select on zoralia.children for select to authenticated
  using (zoralia.is_family_member(family_id));
create policy children_insert on zoralia.children for insert to authenticated
  with check (zoralia.is_family_parent(family_id));
create policy children_update on zoralia.children for update to authenticated
  using (zoralia.is_family_parent(family_id)) with check (zoralia.is_family_parent(family_id));

create policy settings_select on zoralia.family_settings for select to authenticated
  using (zoralia.is_family_member(family_id));
create policy settings_update on zoralia.family_settings for update to authenticated
  using (zoralia.is_family_parent(family_id)) with check (zoralia.is_family_parent(family_id));

create policy missions_select on zoralia.missions for select to authenticated
  using (zoralia.is_family_member(family_id));
create policy missions_insert on zoralia.missions for insert to authenticated
  with check (zoralia.is_family_parent(family_id) and created_by = auth.uid());
create policy missions_update on zoralia.missions for update to authenticated
  using (zoralia.is_family_parent(family_id)) with check (zoralia.is_family_parent(family_id));

create policy mission_children_select on zoralia.mission_children for select to authenticated
  using (exists (select 1 from zoralia.missions m where m.id = mission_id and zoralia.is_family_member(m.family_id)));
create policy mission_children_insert on zoralia.mission_children for insert to authenticated
  with check (
    exists (select 1 from zoralia.missions m where m.id = mission_id and zoralia.is_family_parent(m.family_id))
    and exists (select 1 from zoralia.children c join zoralia.missions m on m.family_id = c.family_id
                where c.id = child_id and m.id = mission_id));
create policy mission_children_delete on zoralia.mission_children for delete to authenticated
  using (exists (select 1 from zoralia.missions m where m.id = mission_id and zoralia.is_family_parent(m.family_id)));

create policy occurrences_select on zoralia.mission_occurrences for select to authenticated
  using (exists (select 1 from zoralia.missions m where m.id = mission_id and zoralia.is_family_member(m.family_id)));

create policy transactions_select on zoralia.points_transactions for select to authenticated
  using (zoralia.is_family_member(family_id));

create policy rewards_select on zoralia.shop_rewards for select to authenticated
  using (zoralia.is_family_member(family_id));
create policy rewards_insert on zoralia.shop_rewards for insert to authenticated
  with check (zoralia.is_family_parent(family_id));
create policy rewards_update on zoralia.shop_rewards for update to authenticated
  using (zoralia.is_family_parent(family_id)) with check (zoralia.is_family_parent(family_id));

create policy redemptions_select on zoralia.reward_redemptions for select to authenticated
  using (zoralia.is_family_member(family_id));

create policy treasures_select on zoralia.family_treasures for select to authenticated
  using (zoralia.is_family_member(family_id));
create policy treasures_insert on zoralia.family_treasures for insert to authenticated
  with check (zoralia.is_family_parent(family_id));
create policy treasures_update on zoralia.family_treasures for update to authenticated
  using (zoralia.is_family_parent(family_id)) with check (zoralia.is_family_parent(family_id));

create policy contributions_select on zoralia.treasure_contributions for select to authenticated
  using (exists (select 1 from zoralia.family_treasures t where t.id = treasure_id and zoralia.is_family_member(t.family_id)));

create policy dice_select on zoralia.dice_rolls for select to authenticated
  using (zoralia.is_family_member(family_id));

create policy child_badges_select on zoralia.child_badges for select to authenticated
  using (exists (select 1 from zoralia.children c where c.id = child_id and zoralia.is_family_member(c.family_id)));

-- ───────────────────────── Droits de colonnes ─────────────────────────
-- Défense en profondeur : même avec une policy trop large, le client ne peut écrire que ces colonnes.

revoke all on all tables in schema zoralia from anon, authenticated;

grant select on zoralia.themes, zoralia.badges, zoralia.families, zoralia.family_members,
  zoralia.children, zoralia.family_settings, zoralia.missions, zoralia.mission_children,
  zoralia.mission_occurrences, zoralia.points_transactions, zoralia.shop_rewards,
  zoralia.reward_redemptions, zoralia.family_treasures, zoralia.treasure_contributions,
  zoralia.dice_rolls, zoralia.child_badges to authenticated;

grant update (name, timezone, active_theme_id) on zoralia.families to authenticated;
grant insert (family_id, display_name, avatar_key, color_key) on zoralia.children to authenticated;
grant update (display_name, avatar_key, color_key, is_active) on zoralia.children to authenticated;
grant update (dice_enabled, dice_mode, dice_quest_threshold, treasure_enabled, approval_required, settings)
  on zoralia.family_settings to authenticated;
grant insert (family_id, title, description, category, points, recurrence, starts_at, ends_at,
              requires_approval, is_active, created_by) on zoralia.missions to authenticated;
grant update (title, description, category, points, recurrence, starts_at, ends_at,
              requires_approval, is_active) on zoralia.missions to authenticated;
grant insert, delete on zoralia.mission_children to authenticated;
grant insert (family_id, title, description, cost, image_key, stock, is_active) on zoralia.shop_rewards to authenticated;
grant update (title, description, cost, image_key, stock, is_active) on zoralia.shop_rewards to authenticated;
grant insert (family_id, title, target_points, reward_description) on zoralia.family_treasures to authenticated;
grant update (title, target_points, reward_description, status) on zoralia.family_treasures to authenticated;

-- ───────────────────────── Vues (droits de l'appelant) ─────────────────────────

create view zoralia.child_wallet_summary with (security_invoker = true) as
select c.id as child_id, c.family_id,
       coalesce(sum(t.amount), 0)::int as balance,
       coalesce(sum(t.amount) filter (
         where t.amount > 0 and t.type in ('mission_reward', 'dice_bonus', 'parent_adjustment_credit')
       ), 0)::int as lifetime_earned_points
from zoralia.children c
left join zoralia.points_transactions t on t.child_id = c.id
group by c.id;

create view zoralia.child_map_progress with (security_invoker = true) as
select child_id, family_id, lifetime_earned_points,
       least(50, lifetime_earned_points / 5)::int as map_step
from zoralia.child_wallet_summary;

grant select on zoralia.child_wallet_summary, zoralia.child_map_progress to authenticated;

-- ───────────────────────── Fonctions internes (schéma private, non exposé) ─────────────────────────

create function zoralia_private.require_parent(fid uuid) returns void
language plpgsql stable security definer set search_path = zoralia as $$
begin
  if auth.uid() is null or not zoralia.is_family_parent(fid) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end $$;

-- Verrouille la ligne enfant (sérialise les opérations sur son solde) et renvoie son foyer.
create function zoralia_private.lock_child(p_child uuid) returns uuid
language plpgsql security definer set search_path = zoralia as $$
declare v_family uuid;
begin
  select family_id into v_family from zoralia.children where id = p_child for update;
  if v_family is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  return v_family;
end $$;

create function zoralia_private.add_points(p_child uuid, p_amount int, p_type text, p_ref uuid, p_desc text, p_key text)
returns uuid language plpgsql security definer set search_path = zoralia as $$
declare v_family uuid; v_id uuid;
begin
  v_family := zoralia_private.lock_child(p_child);
  if p_key is not null then
    select id into v_id from zoralia.points_transactions where idempotency_key = p_key;
    if found then return v_id; end if;
  end if;
  if p_amount < 0 and
     (select coalesce(sum(amount), 0) from zoralia.points_transactions where child_id = p_child) + p_amount < 0 then
    raise exception 'insufficient_points' using errcode = 'P0001';
  end if;
  insert into zoralia.points_transactions (family_id, child_id, amount, type, reference_id, description, idempotency_key)
  values (v_family, p_child, p_amount, p_type, p_ref, coalesce(p_desc, ''), p_key)
  returning id into v_id;
  return v_id;
end $$;

create function zoralia_private.award_badges(p_child uuid) returns void
language plpgsql security definer set search_path = zoralia as $$
declare v_lifetime int; v_overrides jsonb;
begin
  select w.lifetime_earned_points, coalesce(s.settings -> 'badge_thresholds', '{}')
    into v_lifetime, v_overrides
  from zoralia.child_wallet_summary w
  join zoralia.family_settings s on s.family_id = w.family_id
  where w.child_id = p_child;

  insert into zoralia.child_badges (child_id, badge_id)
  select p_child, b.id from zoralia.badges b
  where coalesce((v_overrides ->> b.slug)::int, (b.threshold ->> 'lifetime_earned')::int) <= v_lifetime
  on conflict do nothing;
end $$;

create function zoralia_private.local_today(p_family uuid) returns date
language sql stable security definer set search_path = zoralia as $$
  select (now() at time zone timezone)::date from zoralia.families where id = p_family
$$;

create function zoralia_private.mission_available(p_mission uuid, p_child uuid, p_day date) returns boolean
language plpgsql stable security definer set search_path = zoralia as $$
declare m zoralia.missions; r jsonb;
begin
  select * into m from zoralia.missions where id = p_mission;
  if not found or not m.is_active then return false; end if;
  if (m.starts_at is not null and p_day < m.starts_at) or (m.ends_at is not null and p_day > m.ends_at) then
    return false;
  end if;
  if exists (select 1 from zoralia.mission_children where mission_id = p_mission)
     and not exists (select 1 from zoralia.mission_children where mission_id = p_mission and child_id = p_child) then
    return false;
  end if;
  r := m.recurrence;
  case coalesce(r ->> 'type', 'daily')
    when 'weekly' then
      return exists (select 1 from jsonb_array_elements_text(coalesce(r -> 'days', '[]')) d
                     where d::int = extract(isodow from p_day)::int);
    when 'once' then
      return not exists (select 1 from zoralia.mission_occurrences
                         where mission_id = p_mission and child_id = p_child and status <> 'rejected');
    else return true;
  end case;
end $$;

create function zoralia_private.approve_occurrence(p_occ uuid, p_note text) returns uuid
language plpgsql security definer set search_path = zoralia as $$
declare o zoralia.mission_occurrences; m zoralia.missions; v_tx uuid;
begin
  select * into o from zoralia.mission_occurrences where id = p_occ for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if o.status <> 'claimed' then raise exception 'invalid_state' using errcode = 'P0001'; end if;
  select * into m from zoralia.missions where id = o.mission_id;
  update zoralia.mission_occurrences
     set status = 'approved', reviewed_at = now(), reviewed_by = auth.uid(), review_note = p_note
   where id = p_occ;
  v_tx := zoralia_private.add_points(o.child_id, m.points, 'mission_reward', p_occ, m.title, 'mission:' || p_occ);
  perform zoralia_private.award_badges(o.child_id);
  return v_tx;
end $$;

create function zoralia_private.dice_state(p_child uuid) returns jsonb
language plpgsql stable security definer set search_path = zoralia as $$
declare v_enabled boolean; v_mode text; v_threshold int; v_tz text;
        v_last timestamptz; v_progress int; v_eligible boolean;
begin
  select st.dice_enabled, st.dice_mode, st.dice_quest_threshold, f.timezone
    into v_enabled, v_mode, v_threshold, v_tz
  from zoralia.children c
  join zoralia.family_settings st on st.family_id = c.family_id
  join zoralia.families f on f.id = c.family_id
  where c.id = p_child;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  select max(rolled_at) into v_last from zoralia.dice_rolls where child_id = p_child;
  if v_mode = 'weekly' then
    v_eligible := v_last is null or (v_last at time zone v_tz) < date_trunc('week', now() at time zone v_tz);
    return jsonb_build_object('enabled', v_enabled, 'mode', 'weekly', 'eligible', v_enabled and v_eligible,
                              'progress', case when v_eligible then 1 else 0 end, 'threshold', 1);
  end if;
  select count(*)::int into v_progress from zoralia.points_transactions
   where child_id = p_child and type = 'mission_reward' and (v_last is null or created_at > v_last);
  return jsonb_build_object('enabled', v_enabled, 'mode', 'quests',
                            'eligible', v_enabled and v_progress >= v_threshold,
                            'progress', v_progress, 'threshold', v_threshold);
end $$;

-- ───────────────────────── RPC publiques ─────────────────────────

-- Crée le foyer, l'appartenance parent, les réglages, le trésor et les exemples du kit.
create function zoralia.create_family(p_name text, p_theme_slug text default 'aventuriers',
                                     p_timezone text default 'Europe/Paris') returns uuid
language plpgsql security definer set search_path = zoralia as $$
declare v_family uuid; v_theme uuid;
begin
  if auth.uid() is null then raise exception 'forbidden' using errcode = '42501'; end if;
  if exists (select 1 from zoralia.family_members where user_id = auth.uid()) then
    raise exception 'already_in_family' using errcode = 'P0001';
  end if;
  select id into v_theme from zoralia.themes where slug = p_theme_slug and is_active;
  insert into zoralia.families (name, timezone, created_by, active_theme_id)
  values (trim(p_name), p_timezone, auth.uid(), v_theme) returning id into v_family;
  insert into zoralia.family_members (family_id, user_id, role) values (v_family, auth.uid(), 'parent');
  insert into zoralia.family_settings (family_id) values (v_family);

  insert into zoralia.family_treasures (family_id, title, target_points, reward_description)
  values (v_family, 'Le coffre de la famille', 100, 'Une grosse récompense pour toute la famille !');

  insert into zoralia.missions (family_id, title, category, points, requires_approval, created_by) values
    (v_family, 'Mettre la table', 'daily', 1, true, auth.uid()),
    (v_family, 'Ranger sa chambre', 'daily', 1, true, auth.uid()),
    (v_family, 'Se préparer sans râler', 'daily', 1, true, auth.uid()),
    (v_family, 'Aider sans qu''on le demande', 'heroic', 3, true, auth.uid()),
    (v_family, 'Gérer une dispute calmement', 'heroic', 4, true, auth.uid()),
    (v_family, 'Gros effort à l''école ou à l''entraînement', 'heroic', 5, true, auth.uid());

  insert into zoralia.shop_rewards (family_id, title, cost, image_key) values
    (v_family, 'Choisir le film du vendredi', 5, 'film'),
    (v_family, 'Se coucher 15 minutes plus tard', 5, 'moon'),
    (v_family, 'Choisir le dessert', 10, 'dessert'),
    (v_family, 'Choisir le jeu en famille', 10, 'game'),
    (v_family, 'Sortie choisie (piscine, crêpes…)', 15, 'outing'),
    (v_family, 'Inviter un copain ou une copine', 15, 'friend'),
    (v_family, 'Activité spéciale avec papa ou maman', 25, 'heart'),
    (v_family, 'Petit cadeau', 25, 'gift'),
    (v_family, 'Journée « c''est moi qui décide »', 40, 'crown');
  return v_family;
end $$;

create function zoralia.claim_mission(p_mission uuid, p_child uuid) returns uuid
language plpgsql security definer set search_path = zoralia as $$
declare v_family uuid; m zoralia.missions; v_day date; v_occ uuid; v_auto boolean;
begin
  v_family := zoralia_private.lock_child(p_child);
  perform zoralia_private.require_parent(v_family);
  select * into m from zoralia.missions where id = p_mission and family_id = v_family;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  v_day := zoralia_private.local_today(v_family);
  if not zoralia_private.mission_available(p_mission, p_child, v_day) then
    raise exception 'not_available' using errcode = 'P0001';
  end if;
  begin
    insert into zoralia.mission_occurrences (mission_id, child_id, due_date, status)
    values (p_mission, p_child, v_day, 'claimed') returning id into v_occ;
  exception when unique_violation then
    raise exception 'already_claimed' using errcode = 'P0001';
  end;
  select not (m.requires_approval or approval_required) into v_auto
    from zoralia.family_settings where family_id = v_family;
  if v_auto then perform zoralia_private.approve_occurrence(v_occ, null); end if;
  return v_occ;
end $$;

create function zoralia.approve_mission(p_occurrence uuid, p_note text default null) returns uuid
language plpgsql security definer set search_path = zoralia as $$
declare v_family uuid;
begin
  select m.family_id into v_family from zoralia.mission_occurrences o
    join zoralia.missions m on m.id = o.mission_id where o.id = p_occurrence;
  if v_family is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  perform zoralia_private.require_parent(v_family);
  return zoralia_private.approve_occurrence(p_occurrence, p_note);
end $$;

create function zoralia.reject_mission(p_occurrence uuid, p_note text default null) returns void
language plpgsql security definer set search_path = zoralia as $$
declare v_family uuid; v_status text;
begin
  select m.family_id, o.status into v_family, v_status from zoralia.mission_occurrences o
    join zoralia.missions m on m.id = o.mission_id where o.id = p_occurrence for update of o;
  if v_family is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  perform zoralia_private.require_parent(v_family);
  if v_status <> 'claimed' then raise exception 'invalid_state' using errcode = 'P0001'; end if;
  update zoralia.mission_occurrences
     set status = 'rejected', reviewed_at = now(), reviewed_by = auth.uid(), review_note = p_note
   where id = p_occurrence;
end $$;

-- Le parent enregistre directement une mission accomplie.
create function zoralia.record_mission(p_mission uuid, p_child uuid) returns uuid
language plpgsql security definer set search_path = zoralia as $$
declare v_family uuid; v_day date; v_occ uuid;
begin
  v_family := zoralia_private.lock_child(p_child);
  perform zoralia_private.require_parent(v_family);
  if not exists (select 1 from zoralia.missions where id = p_mission and family_id = v_family) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  v_day := zoralia_private.local_today(v_family);
  select id into v_occ from zoralia.mission_occurrences
   where mission_id = p_mission and child_id = p_child and due_date = v_day;
  if v_occ is null then
    if not zoralia_private.mission_available(p_mission, p_child, v_day) then
      raise exception 'not_available' using errcode = 'P0001';
    end if;
    insert into zoralia.mission_occurrences (mission_id, child_id, due_date, status)
    values (p_mission, p_child, v_day, 'claimed') returning id into v_occ;
  end if;
  return zoralia_private.approve_occurrence(v_occ, null);
end $$;

create function zoralia.request_reward(p_child uuid, p_reward uuid) returns uuid
language plpgsql security definer set search_path = zoralia as $$
declare v_family uuid; r zoralia.shop_rewards; v_id uuid;
begin
  v_family := zoralia_private.lock_child(p_child);
  perform zoralia_private.require_parent(v_family);
  select * into r from zoralia.shop_rewards where id = p_reward and family_id = v_family and is_active;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if r.stock is not null and r.stock <= 0 then raise exception 'out_of_stock' using errcode = 'P0001'; end if;
  if (select coalesce(sum(amount), 0) from zoralia.points_transactions where child_id = p_child) < r.cost then
    raise exception 'insufficient_points' using errcode = 'P0001';
  end if;
  insert into zoralia.reward_redemptions (family_id, child_id, reward_id, cost_snapshot)
  values (v_family, p_child, p_reward, r.cost) returning id into v_id;
  return v_id;
end $$;

create function zoralia.approve_reward(p_redemption uuid) returns uuid
language plpgsql security definer set search_path = zoralia as $$
declare d zoralia.reward_redemptions; r zoralia.shop_rewards; v_tx uuid;
begin
  select * into d from zoralia.reward_redemptions where id = p_redemption for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  perform zoralia_private.require_parent(d.family_id);
  if d.status <> 'requested' then raise exception 'invalid_state' using errcode = 'P0001'; end if;
  select * into r from zoralia.shop_rewards where id = d.reward_id for update;
  if r.stock is not null and r.stock <= 0 then raise exception 'out_of_stock' using errcode = 'P0001'; end if;
  v_tx := zoralia_private.add_points(d.child_id, -d.cost_snapshot, 'shop_purchase', d.id, r.title, 'redemption:' || d.id);
  if r.stock is not null then update zoralia.shop_rewards set stock = stock - 1 where id = r.id; end if;
  update zoralia.reward_redemptions set status = 'approved', reviewed_at = now(), reviewed_by = auth.uid()
   where id = d.id;
  return v_tx;
end $$;

create function zoralia.reject_reward(p_redemption uuid) returns void
language plpgsql security definer set search_path = zoralia as $$
declare d zoralia.reward_redemptions;
begin
  select * into d from zoralia.reward_redemptions where id = p_redemption for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  perform zoralia_private.require_parent(d.family_id);
  if d.status <> 'requested' then raise exception 'invalid_state' using errcode = 'P0001'; end if;
  update zoralia.reward_redemptions set status = 'rejected', reviewed_at = now(), reviewed_by = auth.uid()
   where id = p_redemption;
end $$;

create function zoralia.contribute_to_treasure(p_treasure uuid, p_child uuid, p_amount int) returns uuid
language plpgsql security definer set search_path = zoralia as $$
declare v_family uuid; t zoralia.family_treasures; v_tx uuid; v_contrib uuid;
begin
  v_family := zoralia_private.lock_child(p_child);
  perform zoralia_private.require_parent(v_family);
  if p_amount is null or p_amount <= 0 then raise exception 'invalid_amount' using errcode = 'P0001'; end if;
  select * into t from zoralia.family_treasures where id = p_treasure and family_id = v_family for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if t.status <> 'active' or not (select treasure_enabled from zoralia.family_settings where family_id = v_family) then
    raise exception 'invalid_state' using errcode = 'P0001';
  end if;
  if t.current_points + p_amount > t.target_points then
    raise exception 'exceeds_target' using errcode = 'P0001';
  end if;
  v_tx := zoralia_private.add_points(p_child, -p_amount, 'family_treasure_contribution', t.id, t.title, null);
  insert into zoralia.treasure_contributions (treasure_id, child_id, amount, transaction_id)
  values (t.id, p_child, p_amount, v_tx) returning id into v_contrib;
  update zoralia.family_treasures
     set current_points = current_points + p_amount,
         status = case when current_points + p_amount >= target_points then 'reached' else status end
   where id = t.id;
  return v_contrib;
end $$;

create function zoralia.dice_eligibility(p_child uuid) returns jsonb
language plpgsql stable security definer set search_path = zoralia as $$
declare v_family uuid;
begin
  select family_id into v_family from zoralia.children where id = p_child;
  if v_family is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  perform zoralia_private.require_parent(v_family);
  return zoralia_private.dice_state(p_child);
end $$;

-- Tirage côté serveur : faces du kit (×2, +1, joker, surprise), persisté une seule fois.
create function zoralia.roll_dice(p_child uuid) returns jsonb
language plpgsql security definer set search_path = zoralia as $$
declare v_family uuid; v_state jsonb; v_pick int; v_key text; v_payload jsonb := '{}'; v_bonus int;
        v_roll uuid := gen_random_uuid(); v_last int;
begin
  v_family := zoralia_private.lock_child(p_child);
  perform zoralia_private.require_parent(v_family);
  v_state := zoralia_private.dice_state(p_child);
  if not (v_state ->> 'eligible')::boolean then raise exception 'not_eligible' using errcode = 'P0001'; end if;

  v_pick := floor(random() * 4)::int;
  v_key := (array['double', 'plus_one', 'joker', 'surprise'])[v_pick + 1];

  if v_key = 'double' then
    -- ×2 : on double la dernière mission validée (au moins +1).
    select coalesce((select amount from zoralia.points_transactions
                      where child_id = p_child and type = 'mission_reward'
                      order by created_at desc limit 1), 1) into v_last;
    v_bonus := v_last;
    v_payload := jsonb_build_object('bonus', v_bonus);
  elsif v_key = 'plus_one' then
    v_bonus := 1;
    v_payload := jsonb_build_object('bonus', 1);
  else
    v_payload := jsonb_build_object('resolved', false);
  end if;

  insert into zoralia.dice_rolls (id, family_id, child_id, result_key, result_payload, consumed_quest_count)
  values (v_roll, v_family, p_child, v_key, v_payload,
          case when v_state ->> 'mode' = 'quests' then (v_state ->> 'threshold')::int else 0 end);
  if v_bonus is not null then
    perform zoralia_private.add_points(p_child, v_bonus, 'dice_bonus', v_roll, 'Dé du destin', 'dice:' || v_roll);
    perform zoralia_private.award_badges(p_child);
  end if;
  return jsonb_build_object('id', v_roll, 'result_key', v_key, 'result_payload', v_payload);
end $$;

-- Joker / petite surprise honorés par le parent.
create function zoralia.resolve_dice_roll(p_roll uuid) returns void
language plpgsql security definer set search_path = zoralia as $$
declare v_family uuid;
begin
  select family_id into v_family from zoralia.dice_rolls where id = p_roll;
  if v_family is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  perform zoralia_private.require_parent(v_family);
  update zoralia.dice_rolls set result_payload = result_payload || '{"resolved": true}' where id = p_roll;
end $$;

create function zoralia.parent_adjust_points(p_child uuid, p_amount int, p_reason text) returns uuid
language plpgsql security definer set search_path = zoralia as $$
declare v_family uuid; v_tx uuid;
begin
  v_family := zoralia_private.lock_child(p_child);
  perform zoralia_private.require_parent(v_family);
  if p_amount is null or p_amount = 0 or abs(p_amount) > 1000 then
    raise exception 'invalid_amount' using errcode = 'P0001';
  end if;
  v_tx := zoralia_private.add_points(p_child, p_amount,
            case when p_amount > 0 then 'parent_adjustment_credit' else 'parent_adjustment_debit' end,
            null, coalesce(nullif(trim(p_reason), ''), 'Ajustement parent'), null);
  if p_amount > 0 then perform zoralia_private.award_badges(p_child); end if;
  return v_tx;
end $$;

-- Export RGPD : toutes les données du foyer en JSON.
create function zoralia.export_family(p_family uuid) returns jsonb
language plpgsql stable security definer set search_path = zoralia as $$
begin
  perform zoralia_private.require_parent(p_family);
  return jsonb_build_object(
    'family', (select to_jsonb(f) from zoralia.families f where id = p_family),
    'settings', (select to_jsonb(s) from zoralia.family_settings s where family_id = p_family),
    'children', coalesce((select jsonb_agg(to_jsonb(c)) from zoralia.children c where family_id = p_family), '[]'),
    'missions', coalesce((select jsonb_agg(to_jsonb(m)) from zoralia.missions m where family_id = p_family), '[]'),
    'occurrences', coalesce((select jsonb_agg(to_jsonb(o)) from zoralia.mission_occurrences o
                              join zoralia.missions m on m.id = o.mission_id where m.family_id = p_family), '[]'),
    'transactions', coalesce((select jsonb_agg(to_jsonb(t)) from zoralia.points_transactions t where family_id = p_family), '[]'),
    'rewards', coalesce((select jsonb_agg(to_jsonb(r)) from zoralia.shop_rewards r where family_id = p_family), '[]'),
    'redemptions', coalesce((select jsonb_agg(to_jsonb(d)) from zoralia.reward_redemptions d where family_id = p_family), '[]'),
    'treasures', coalesce((select jsonb_agg(to_jsonb(t)) from zoralia.family_treasures t where family_id = p_family), '[]'),
    'dice_rolls', coalesce((select jsonb_agg(to_jsonb(d)) from zoralia.dice_rolls d where family_id = p_family), '[]'));
end $$;

-- Suppression complète du foyer (cascade) ; le compte Google reste, il pourra recréer un foyer.
create function zoralia.delete_family(p_family uuid) returns void
language plpgsql security definer set search_path = zoralia as $$
begin
  perform zoralia_private.require_parent(p_family);
  delete from zoralia.families where id = p_family;
end $$;

-- ───────────────────────── Droits d'exécution ─────────────────────────

revoke execute on all functions in schema zoralia from public, anon;
grant execute on all functions in schema zoralia to authenticated;
revoke all on schema zoralia_private from public, anon, authenticated;

-- ───────────────────────── Données de référence ─────────────────────────

insert into zoralia.themes (slug, name, description) values
  ('aventuriers', 'La Guilde des Aventuriers', 'Parchemin, carte fantasy, blasons et coffres'),
  ('princesses', 'Le Royaume des Princesses', 'Palais lumineux, jardins fleuris et cristaux'),
  ('pirates', 'Les Îles des Pirates', 'Carte marine, archipel, boussole et trésor'),
  ('espace', 'La Galaxie des Héros', 'Planètes colorées, fusées et étoiles'),
  ('dinosaures', 'Le Monde des Dinosaures', 'Vallée préhistorique, fougères et volcans');

-- Seuils indicatifs (le kit ne les fixe pas) ; modifiables par foyer via family_settings.settings.badge_thresholds.
insert into zoralia.badges (slug, name, description, icon_key, threshold) values
  ('petit-aventurier', 'Petit aventurier', 'Les premières pépites sont gagnées !', 'seedling', '{"lifetime_earned": 5}'),
  ('explorateur', 'Explorateur', 'Tu explores de nouveaux territoires.', 'compass', '{"lifetime_earned": 30}'),
  ('gardien-de-la-maison', 'Gardien de la maison', 'Tu prends soin de la maison.', 'shield', '{"lifetime_earned": 80}'),
  ('heros-confirme', 'Héros confirmé', 'Un vrai héros du quotidien.', 'medal', '{"lifetime_earned": 150}'),
  ('maitre-des-missions', 'Maître des missions', 'Le sommet des légendes !', 'trophy', '{"lifetime_earned": 250}');
