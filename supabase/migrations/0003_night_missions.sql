-- Zoralia — deux missions de nuit ajoutées à la liste de départ.
-- Redéfinit le semis (24 missions, idempotent par titre) puis le rejoue pour les foyers existants ;
-- create_family (0002) appelle déjà ce semis, les nouveaux foyers reçoivent donc aussi les 24.

create or replace function zoralia_private.seed_starter_missions(p_family uuid, p_user uuid) returns void
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
    (16, 'Je m''endors sans perturber mes parents', '', 'daily', 1),
    (17, 'Je reste dans mon lit la nuit', '', 'daily', 1),
    -- Héroïques : efforts qui comptent plus (3 pépites)
    (18, 'J''aide mes parents à sortir les affaires de la voiture', '', 'heroic', 3),
    (19, 'Je maîtrise mes émotions', '', 'heroic', 3),
    (20, 'Je suis courageux(se)', '', 'heroic', 3),
    (21, 'Je termine mes missions', '', 'heroic', 3),
    -- Héroïques du kit d'origine
    (22, 'Aider sans qu''on le demande', '', 'heroic', 3),
    (23, 'Gérer une dispute calmement', '', 'heroic', 4),
    (24, 'Gros effort à l''école ou à l''entraînement', '', 'heroic', 5)
  ) as v(ord, title, description, category, points)
  where not exists (select 1 from zoralia.missions m where m.family_id = p_family and m.title = v.title);
end $$;


do $$
declare f record;
begin
  for f in select id, created_by from zoralia.families loop
    perform zoralia_private.seed_starter_missions(f.id, f.created_by);
  end loop;
end $$;
