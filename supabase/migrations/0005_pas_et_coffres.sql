-- Zoralia — deux monnaies : les « pas » 👣 font avancer sur la carte, les pépites 🪙 se dépensent.
--
--   mission validée  → pas (jamais dépensés, la carte ne recule jamais)
--   coffre de la carte → pépites (boutique, trésor commun)
--
-- Carte : 100 étapes de 5 pas = 500 pas, 5 territoires de 100 pas. Un coffre sur la carte :
-- le 1er à 10 pas, puis un tous les 25 pas (≈ 3 jours à 8 pas/jour) : 20 coffres. Valeur par territoire :
-- 5, 8, 10, 15, 20 pépites (4 coffres chacun, 232 pépites au total). Les coffres sont ouverts automatiquement
-- au franchissement du seuil, une seule fois (clé primaire child_id + chest_no).

-- ───────────────────────── Tables ─────────────────────────

alter table zoralia.points_transactions drop constraint points_transactions_type_check;
alter table zoralia.points_transactions add constraint points_transactions_type_check check (type in (
  'mission_reward', 'shop_purchase', 'family_treasure_contribution', 'dice_bonus',
  'parent_adjustment_credit', 'parent_adjustment_debit', 'refund', 'chest_reward'));

create table zoralia.step_transactions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references zoralia.families on delete cascade,
  child_id uuid not null references zoralia.children on delete cascade,
  amount int not null check (amount > 0),
  type text not null check (type in ('mission_steps', 'parent_adjustment_steps', 'migration')),
  reference_id uuid,
  description text not null default '',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  idempotency_key text unique
);
create index on zoralia.step_transactions (child_id, created_at desc);
create index on zoralia.step_transactions (family_id, created_at desc);

create table zoralia.chest_claims (
  child_id uuid not null references zoralia.children on delete cascade,
  chest_no int not null check (chest_no between 1 and 20),
  pepites int not null check (pepites >= 0),
  transaction_id uuid references zoralia.points_transactions on delete set null,
  claimed_at timestamptz not null default now(),
  primary key (child_id, chest_no)
);

alter table zoralia.step_transactions enable row level security;
alter table zoralia.chest_claims enable row level security;
create policy steps_select on zoralia.step_transactions for select to authenticated
  using (zoralia.is_family_member(family_id));
create policy chests_select on zoralia.chest_claims for select to authenticated
  using (exists (select 1 from zoralia.children c where c.id = child_id and zoralia.is_family_member(c.family_id)));
revoke all on zoralia.step_transactions, zoralia.chest_claims from anon, authenticated;
grant select on zoralia.step_transactions, zoralia.chest_claims to authenticated;

-- ───────────────────────── Règles de la carte (internes) ─────────────────────────

create function zoralia_private.chest_threshold(n int) returns int
language sql immutable as $$ select 10 + 25 * (n - 1) $$;

create function zoralia_private.chest_value(n int) returns int
language sql immutable as $$ select (array[5, 8, 10, 15, 20])[(n - 1) / 4 + 1] $$;

create function zoralia_private.add_steps(p_child uuid, p_amount int, p_type text, p_ref uuid, p_desc text, p_key text)
returns uuid language plpgsql security definer set search_path = zoralia as $$
declare v_family uuid; v_id uuid;
begin
  v_family := zoralia_private.lock_child(p_child);
  if p_key is not null then
    select id into v_id from zoralia.step_transactions where idempotency_key = p_key;
    if found then return v_id; end if;
  end if;
  insert into zoralia.step_transactions (family_id, child_id, amount, type, reference_id, description, idempotency_key)
  values (v_family, p_child, p_amount, p_type, p_ref, coalesce(p_desc, ''), p_key) returning id into v_id;
  return v_id;
end $$;

-- Ouvre les coffres atteints et pas encore ouverts : chacun verse ses pépites une seule fois.
create function zoralia_private.award_chests(p_child uuid) returns void
language plpgsql security definer set search_path = zoralia as $$
declare v_steps int; n int; v_tx uuid;
begin
  perform zoralia_private.lock_child(p_child);
  select coalesce(sum(amount), 0) into v_steps from zoralia.step_transactions where child_id = p_child;
  for n in 1..20 loop
    exit when zoralia_private.chest_threshold(n) > v_steps;
    if not exists (select 1 from zoralia.chest_claims where child_id = p_child and chest_no = n) then
      v_tx := zoralia_private.add_points(p_child, zoralia_private.chest_value(n), 'chest_reward', null,
                                         'Coffre n°' || n, 'chest:' || p_child || ':' || n);
      insert into zoralia.chest_claims (child_id, chest_no, pepites, transaction_id)
      values (p_child, n, zoralia_private.chest_value(n), v_tx);
    end if;
  end loop;
end $$;

-- Badges : seuils en pas (modifiables par foyer via family_settings.settings.badge_thresholds).
update zoralia.badges set threshold = jsonb_build_object('steps', case slug
  when 'petit-aventurier' then 10 when 'explorateur' then 75 when 'gardien-de-la-maison' then 175
  when 'heros-confirme' then 300 else 500 end);

create or replace function zoralia_private.award_badges(p_child uuid) returns void
language plpgsql security definer set search_path = zoralia as $$
declare v_steps int; v_overrides jsonb;
begin
  select coalesce((select sum(amount) from zoralia.step_transactions where child_id = p_child), 0),
         coalesce(s.settings -> 'badge_thresholds', '{}')
    into v_steps, v_overrides
  from zoralia.children c join zoralia.family_settings s on s.family_id = c.family_id
  where c.id = p_child;

  insert into zoralia.child_badges (child_id, badge_id)
  select p_child, b.id from zoralia.badges b
  where coalesce((v_overrides ->> b.slug)::int, (b.threshold ->> 'steps')::int) <= v_steps
  on conflict do nothing;
end $$;

-- Une mission validée donne des pas (et non plus des pépites), ce qui peut ouvrir un coffre.
create or replace function zoralia_private.approve_occurrence(p_occ uuid, p_note text) returns uuid
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
  v_tx := zoralia_private.add_steps(o.child_id, m.points, 'mission_steps', p_occ, m.title, 'mission:' || p_occ);
  perform zoralia_private.award_chests(o.child_id);
  perform zoralia_private.award_badges(o.child_id);
  return v_tx;
end $$;

-- Dé : « missions validées depuis le dernier lancer » se compte maintenant dans les pas.
create or replace function zoralia_private.dice_state(p_child uuid) returns jsonb
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
  select count(*)::int into v_progress from zoralia.step_transactions
   where child_id = p_child and type = 'mission_steps' and (v_last is null or created_at > v_last);
  return jsonb_build_object('enabled', v_enabled, 'mode', 'quests',
                            'eligible', v_enabled and v_progress >= v_threshold,
                            'progress', v_progress, 'threshold', v_threshold);
end $$;

-- Dé : « ×2 » double le dernier coffre ouvert (au moins +2 pépites).
create or replace function zoralia.roll_dice(p_child uuid) returns jsonb
language plpgsql security definer set search_path = zoralia as $$
declare v_family uuid; v_state jsonb; v_pick int; v_key text; v_payload jsonb := '{}'; v_bonus int;
        v_roll uuid := gen_random_uuid();
begin
  v_family := zoralia_private.lock_child(p_child);
  perform zoralia_private.require_parent(v_family);
  v_state := zoralia_private.dice_state(p_child);
  if not (v_state ->> 'eligible')::boolean then raise exception 'not_eligible' using errcode = 'P0001'; end if;

  v_pick := floor(random() * 4)::int;
  v_key := (array['double', 'plus_one', 'joker', 'surprise'])[v_pick + 1];

  if v_key = 'double' then
    v_bonus := greatest(2, coalesce((select pepites from zoralia.chest_claims
                                      where child_id = p_child and pepites > 0 order by chest_no desc limit 1), 0));
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
  end if;
  return jsonb_build_object('id', v_roll, 'result_key', v_key, 'result_payload', v_payload);
end $$;

-- Le parent ajoute des pas à la main (bon geste spontané, mission faite hors application…).
create function zoralia.parent_adjust_steps(p_child uuid, p_amount int, p_reason text) returns uuid
language plpgsql security definer set search_path = zoralia as $$
declare v_family uuid; v_tx uuid;
begin
  v_family := zoralia_private.lock_child(p_child);
  perform zoralia_private.require_parent(v_family);
  if p_amount is null or p_amount < 1 or p_amount > 500 then raise exception 'invalid_amount' using errcode = 'P0001'; end if;
  v_tx := zoralia_private.add_steps(p_child, p_amount, 'parent_adjustment_steps', null,
            coalesce(nullif(trim(p_reason), ''), 'Pas ajoutés par le parent'), null);
  perform zoralia_private.award_chests(p_child);
  perform zoralia_private.award_badges(p_child);
  return v_tx;
end $$;

-- Un ajustement de pépites ne touche plus aux badges (ils dépendent des pas).
create or replace function zoralia.parent_adjust_points(p_child uuid, p_amount int, p_reason text) returns uuid
language plpgsql security definer set search_path = zoralia as $$
declare v_family uuid;
begin
  v_family := zoralia_private.lock_child(p_child);
  perform zoralia_private.require_parent(v_family);
  if p_amount is null or p_amount = 0 or abs(p_amount) > 1000 then
    raise exception 'invalid_amount' using errcode = 'P0001';
  end if;
  return zoralia_private.add_points(p_child, p_amount,
            case when p_amount > 0 then 'parent_adjustment_credit' else 'parent_adjustment_debit' end,
            null, coalesce(nullif(trim(p_reason), ''), 'Ajustement parent'), null);
end $$;

-- ───────────────────────── Vues ─────────────────────────

drop view zoralia.child_map_progress;
drop view zoralia.child_wallet_summary;

create view zoralia.child_wallet_summary with (security_invoker = true) as
select c.id as child_id, c.family_id,
       coalesce((select sum(t.amount) from zoralia.points_transactions t where t.child_id = c.id), 0)::int as balance,
       coalesce((select sum(s.amount) from zoralia.step_transactions s where s.child_id = c.id), 0)::int as steps
from zoralia.children c;

create view zoralia.child_map_progress with (security_invoker = true) as
select w.child_id, w.family_id, w.steps, least(100, w.steps / 5)::int as map_step,
       (select count(*) from zoralia.chest_claims k where k.child_id = w.child_id)::int as chests_opened
from zoralia.child_wallet_summary w;

grant select on zoralia.child_wallet_summary, zoralia.child_map_progress to authenticated;

-- ───────────────────────── Export ─────────────────────────

create or replace function zoralia.export_family(p_family uuid) returns jsonb
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
    'steps', coalesce((select jsonb_agg(to_jsonb(t)) from zoralia.step_transactions t where family_id = p_family), '[]'),
    'chests', coalesce((select jsonb_agg(to_jsonb(k)) from zoralia.chest_claims k
                         join zoralia.children c on c.id = k.child_id where c.family_id = p_family), '[]'),
    'transactions', coalesce((select jsonb_agg(to_jsonb(t)) from zoralia.points_transactions t where family_id = p_family), '[]'),
    'rewards', coalesce((select jsonb_agg(to_jsonb(r)) from zoralia.shop_rewards r where family_id = p_family), '[]'),
    'redemptions', coalesce((select jsonb_agg(to_jsonb(d)) from zoralia.reward_redemptions d where family_id = p_family), '[]'),
    'treasures', coalesce((select jsonb_agg(to_jsonb(t)) from zoralia.family_treasures t where family_id = p_family), '[]'),
    'dice_rolls', coalesce((select jsonb_agg(to_jsonb(d)) from zoralia.dice_rolls d where family_id = p_family), '[]'));
end $$;

-- ───────────────────────── Reprise des données existantes ─────────────────────────
-- Les gains passés (pépites gagnées) deviennent les premiers pas. Les coffres déjà atteints sont marqués
-- ouverts sans pépites : ces gains ont déjà été payés en pépites sous l'ancienne règle.

insert into zoralia.step_transactions (family_id, child_id, amount, type, description, idempotency_key)
select c.family_id, c.id, g.gained, 'migration', 'Gains passés convertis en pas', 'migration:' || c.id
from zoralia.children c
join (select child_id, sum(amount)::int as gained from zoralia.points_transactions
       where amount > 0 and type in ('mission_reward', 'dice_bonus', 'parent_adjustment_credit')
       group by child_id) g on g.child_id = c.id
where g.gained > 0
on conflict (idempotency_key) do nothing;

insert into zoralia.chest_claims (child_id, chest_no, pepites)
select s.child_id, n, 0
from (select child_id, sum(amount)::int as steps from zoralia.step_transactions group by child_id) s
cross join generate_series(1, 20) n
where zoralia_private.chest_threshold(n) <= s.steps
on conflict do nothing;

-- ───────────────────────── Droits d'exécution ─────────────────────────

revoke execute on all functions in schema zoralia from public, anon;
grant execute on all functions in schema zoralia to authenticated;
