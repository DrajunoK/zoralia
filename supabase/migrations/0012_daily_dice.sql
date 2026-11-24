-- Zoralia — le dé du destin devient quotidien : un lancer par jour et par enfant, débloqué quand l'enfant a fait
-- valider au moins N missions dans la journée (10 par défaut, réglable). Six faces, la même chance pour chacune :
--   🍀 0 « pas de chance »   👣 +1 pas   👣 +2 pas   🪙 +1 pépite   🪙 +2 pépites   🧰 +2 dans le coffre de la famille
-- « Dans la journée » = missions validées par un parent ce jour-là (heure du foyer), pour ne pas pénaliser un parent qui valide le lendemain.
-- Tirage et effets sont côté serveur ; chaque gain est dans le journal avec la mention « Dé du destin ».

alter table zoralia.step_transactions drop constraint step_transactions_type_check;
alter table zoralia.step_transactions add constraint step_transactions_type_check
  check (type in ('mission_steps', 'parent_adjustment_steps', 'migration', 'dice_steps'));

-- Anciennes faces conservées dans l'historique ; nouvelles faces ajoutées.
alter table zoralia.dice_rolls drop constraint dice_rolls_result_key_check;
alter table zoralia.dice_rolls add constraint dice_rolls_result_key_check
  check (result_key in ('lose', 'steps1', 'steps2', 'pep1', 'pep2', 'chest2', 'double', 'plus_one', 'joker', 'surprise'));
alter table zoralia.dice_rolls add column roll_date date;
update zoralia.dice_rolls r set roll_date = (r.rolled_at at time zone f.timezone)::date from zoralia.families f where f.id = r.family_id;
alter table zoralia.dice_rolls alter column roll_date set not null;
-- Un seul lancer par enfant et par jour, garanti par la base (même si deux appareils lancent en même temps).
create unique index dice_rolls_one_per_day on zoralia.dice_rolls (child_id, roll_date);

alter table zoralia.family_settings alter column dice_quest_threshold set default 10;
update zoralia.family_settings set dice_quest_threshold = 10 where dice_quest_threshold = 5;  -- ancienne valeur par défaut

-- ───────────── règles du dé (internes) ─────────────

create function zoralia_private.dice_face(n int) returns text
language sql immutable as $$ select (array['lose', 'steps1', 'steps2', 'pep1', 'pep2', 'chest2'])[n + 1] $$;

-- Tirage équiprobable : floor(random() * 6) donne 0..5 avec la même probabilité.
create function zoralia_private.pick_face() returns text
language sql volatile as $$ select zoralia_private.dice_face(floor(random() * 6)::int) $$;

-- Missions validées aujourd'hui (heure du foyer) pour un enfant.
create function zoralia_private.validated_today(p_child uuid) returns int
language sql stable security definer set search_path = zoralia as $$
  select count(*)::int
  from zoralia.mission_occurrences o
  join zoralia.missions m on m.id = o.mission_id
  join zoralia.families f on f.id = m.family_id
  where o.child_id = p_child and o.status = 'approved'
    and (o.reviewed_at at time zone f.timezone)::date = (now() at time zone f.timezone)::date
$$;

create or replace function zoralia_private.dice_state(p_child uuid) returns jsonb
language plpgsql stable security definer set search_path = zoralia as $$
declare v_enabled boolean; v_threshold int; v_family uuid; v_done int; v_rolled boolean;
begin
  select st.dice_enabled, st.dice_quest_threshold, c.family_id into v_enabled, v_threshold, v_family
  from zoralia.children c join zoralia.family_settings st on st.family_id = c.family_id where c.id = p_child;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  v_done := zoralia_private.validated_today(p_child);
  v_rolled := exists (select 1 from zoralia.dice_rolls where child_id = p_child and roll_date = zoralia_private.local_today(v_family));
  return jsonb_build_object('enabled', v_enabled, 'progress', v_done, 'threshold', v_threshold,
                            'rolled', v_rolled, 'eligible', v_enabled and not v_rolled and v_done >= v_threshold);
end $$;

-- Applique une face : insère le lancer et crédite ce qu'il faut. Appelée par roll_dice (face tirée au hasard) et par les tests (face imposée).
create function zoralia_private.perform_roll(p_child uuid, p_face text) returns jsonb
language plpgsql security definer set search_path = zoralia as $$
declare v_family uuid; v_roll uuid := gen_random_uuid(); v_payload jsonb := '{}'; v_t zoralia.family_treasures; v_add int; v_key text := p_face;
begin
  v_family := zoralia_private.lock_child(p_child);
  case p_face
    when 'steps1' then v_payload := '{"steps":1}';
    when 'steps2' then v_payload := '{"steps":2}';
    when 'pep1' then v_payload := '{"pepites":1}';
    when 'pep2' then v_payload := '{"pepites":2}';
    when 'chest2' then
      select * into v_t from zoralia.family_treasures where family_id = v_family and status = 'active' for update;
      if found and v_t.target_points > v_t.current_points then
        v_add := least(2, v_t.target_points - v_t.current_points);
        v_payload := jsonb_build_object('chest', v_add);
      else v_payload := '{"pepites":2,"fallback":true}';   -- pas de coffre à remplir : l'enfant reçoit les 2 pépites
      end if;
    else v_payload := '{}';
  end case;

  insert into zoralia.dice_rolls (id, family_id, child_id, result_key, result_payload, roll_date)
  values (v_roll, v_family, p_child, p_face, v_payload, zoralia_private.local_today(v_family));

  if v_payload ? 'steps' then
    perform zoralia_private.add_steps(p_child, (v_payload ->> 'steps')::int, 'dice_steps', v_roll, 'Dé du destin', 'dice:' || v_roll);
    perform zoralia_private.award_chests(p_child); perform zoralia_private.award_badges(p_child);
  end if;
  if v_payload ? 'pepites' then
    perform zoralia_private.add_points(p_child, (v_payload ->> 'pepites')::int, 'dice_bonus', v_roll, 'Dé du destin', 'dice:' || v_roll);
  end if;
  if v_payload ? 'chest' then
    update zoralia.family_treasures set current_points = current_points + v_add,
           status = case when current_points + v_add >= target_points then 'reached' else status end where id = v_t.id;
    insert into zoralia.treasure_contributions (treasure_id, child_id, amount) values (v_t.id, p_child, v_add);
  end if;
  return jsonb_build_object('id', v_roll, 'result_key', v_key, 'result_payload', v_payload);
end $$;

create or replace function zoralia.roll_dice(p_child uuid) returns jsonb
language plpgsql security definer set search_path = zoralia as $$
declare v_family uuid; v_state jsonb;
begin
  v_family := zoralia_private.lock_child(p_child);
  perform zoralia_private.require_parent(v_family);
  v_state := zoralia_private.dice_state(p_child);
  if (v_state ->> 'rolled')::boolean then raise exception 'already_rolled' using errcode = 'P0001'; end if;
  if not (v_state ->> 'eligible')::boolean then raise exception 'not_eligible' using errcode = 'P0001'; end if;
  return zoralia_private.perform_roll(p_child, zoralia_private.pick_face());
end $$;

revoke execute on all functions in schema zoralia from public, anon;
grant execute on all functions in schema zoralia to authenticated;
