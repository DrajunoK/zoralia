-- Zoralia — liste de départ des missions (routines du quotidien, formulées à la première personne).
-- Les points sont une proposition : le parent les modifie ensuite dans l'application.
-- Idempotent : une mission dont le titre existe déjà dans le foyer n'est pas recréée.

create function zoralia_private.seed_starter_missions(p_family uuid, p_user uuid) returns void
language plpgsql security definer set search_path = zoralia as $$
begin
  insert into zoralia.missions (family_id, title, description, category, points, requires_approval, created_by, created_at)
  select p_family, v.title, v.description, v.category, v.points, true, p_user,
         now() + v.ord * interval '1 millisecond'  -- conserve l'ordre de la liste à l'affichage
  from (values
    -- Quotidiennes : routines (1 pépite)
    (1,  'Mettre la table', '', 'daily', 1),
    (2,  'Débarrasser la table', '', 'daily', 1),
    (3,  'Ranger ma chambre', '', 'daily', 1),
    (4,  'Je mange correctement', 'Avec ma fourchette et mon couteau, et je ne me lève pas de table.', 'daily', 1),
    (5,  'Je me lave les mains', '', 'daily', 1),
    (6,  'Je me brosse les dents', '', 'daily', 1),
    (7,  'Je mets mon pyjama', '', 'daily', 1),
    (8,  'Je réussis mon matin', 'Habillage, dents, chaussures.', 'daily', 1),
    (9,  'Ranger et retourner mes habits', '', 'daily', 1),
    (10, 'Mettre mes habits au sale', '', 'daily', 1),
    (11, 'Pendre mon manteau', '', 'daily', 1),
    (12, 'Ranger mes chaussures', '', 'daily', 1),
    (13, 'J''écoute du 1er coup', '', 'daily', 1),
    (14, 'Je me prépare sans conflit', '', 'daily', 1),
    (15, 'Je parle gentiment et poliment', '', 'daily', 1),
    -- Héroïques : efforts qui comptent plus (3 pépites)
    (16, 'J''aide mes parents à sortir les affaires de la voiture', '', 'heroic', 3),
    (17, 'Je maîtrise mes émotions', '', 'heroic', 3),
    (18, 'Je suis courageux(se)', '', 'heroic', 3),
    (19, 'Je termine mes missions', '', 'heroic', 3),
    -- Héroïques du kit d'origine
    (20, 'Aider sans qu''on le demande', '', 'heroic', 3),
    (21, 'Gérer une dispute calmement', '', 'heroic', 4),
    (22, 'Gros effort à l''école ou à l''entraînement', '', 'heroic', 5)
  ) as v(ord, title, description, category, points)
  where not exists (select 1 from zoralia.missions m where m.family_id = p_family and m.title = v.title);
end $$;

-- Les foyers déjà créés reçoivent la liste ; les deux anciens exemples sont renommés plutôt que doublonnés.
do $$
declare f record;
begin
  for f in select id, created_by from zoralia.families loop
    update zoralia.missions set title = 'Ranger ma chambre'
     where family_id = f.id and title = 'Ranger sa chambre'
       and not exists (select 1 from zoralia.missions where family_id = f.id and title = 'Ranger ma chambre');
    update zoralia.missions set title = 'Je me prépare sans conflit'
     where family_id = f.id and title = 'Se préparer sans râler'
       and not exists (select 1 from zoralia.missions where family_id = f.id and title = 'Je me prépare sans conflit');
    perform zoralia_private.seed_starter_missions(f.id, f.created_by);
  end loop;
end $$;

-- Les nouveaux foyers reçoivent la même liste (create_family de 0001, avec ce seul changement).
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
