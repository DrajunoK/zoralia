-- Zoralia — nouvelle liste de récompenses de départ (écrans, jeux vidéo, sorties…), même principe que les missions :
-- une fonction unique pour les nouveaux foyers et pour compléter les foyers existants, rejouable sans doublon.
--
-- Foyers existants : « Choisir le film du vendredi » (5) devient « Soirée TV » (15) et « Petit cadeau » devient
-- « Petit cadeau surprise », mais seulement si le parent n'a pas déjà modifié leur prix ; les récompenses manquantes sont ajoutées.

create function zoralia_private.starter_reward_list()
returns table (ord int, title text, cost int, image_key text)
language sql immutable as $$
  select * from (values
    (1,  '30 min de TV', 5, 'tv'),
    (2,  'Se coucher 15 minutes plus tard', 5, 'moon'),
    (3,  '15 min de jeux vidéo sur le téléphone', 10, 'phone'),
    (4,  'Choisir le dessert', 10, 'dessert'),
    (5,  'Choisir le jeu en famille', 10, 'game'),
    (6,  'Soirée TV', 15, 'popcorn'),
    (7,  '1h de jeux vidéo sur la Switch', 15, 'gamepad'),
    (8,  'Sortie choisie (piscine, crêpes…)', 15, 'outing'),
    (9,  'Inviter un copain ou une copine', 15, 'friend'),
    (10, 'Bowling', 20, 'bowling'),
    (11, 'Activité spéciale avec papa ou maman', 25, 'heart'),
    (12, 'Petit cadeau surprise', 25, 'gift'),
    (13, 'Soirée pyjama avec un(e) ami(e)', 30, 'pajama'),
    (14, 'Journée « c''est moi qui décide »', 40, 'crown')
  ) as v(ord, title, cost, image_key)
$$;

create function zoralia_private.seed_starter_rewards(p_family uuid) returns void
language plpgsql security definer set search_path = zoralia as $$
begin
  -- renommages (uniquement si le prix d'origine n'a pas été changé)
  update zoralia.shop_rewards set title = 'Soirée TV', cost = 15, image_key = 'popcorn'
   where family_id = p_family and title = 'Choisir le film du vendredi' and cost = 5
     and not exists (select 1 from zoralia.shop_rewards where family_id = p_family and title = 'Soirée TV');
  update zoralia.shop_rewards set title = 'Petit cadeau surprise'
   where family_id = p_family and title = 'Petit cadeau'
     and not exists (select 1 from zoralia.shop_rewards where family_id = p_family and title = 'Petit cadeau surprise');

  insert into zoralia.shop_rewards (family_id, title, cost, image_key, created_at)
  select p_family, v.title, v.cost, v.image_key, now() + v.ord * interval '1 millisecond'
  from zoralia_private.starter_reward_list() v
  where not exists (select 1 from zoralia.shop_rewards r where r.family_id = p_family and r.title = v.title);
end $$;

do $$
declare f record;
begin
  for f in select id from zoralia.families loop
    perform zoralia_private.seed_starter_rewards(f.id);
  end loop;
end $$;

-- Les nouveaux foyers reçoivent la même liste (create_family de 0002, avec ce seul changement).
create or replace function zoralia.create_family(p_name text, p_theme_slug text default 'aventuriers',
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

  perform zoralia_private.seed_starter_missions(v_family, auth.uid());
  perform zoralia_private.seed_starter_rewards(v_family);
  return v_family;
end $$;

revoke execute on all functions in schema zoralia from public, anon;
grant execute on all functions in schema zoralia to authenticated;
