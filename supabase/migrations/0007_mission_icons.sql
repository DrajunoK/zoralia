-- Zoralia — une icône (emoji) par mission, pour que les enfants reconnaissent d'un coup d'œil.
--
-- La liste de départ devient une fonction (une seule source pour les nouveaux foyers et pour la mise à jour
-- des foyers existants) ; les missions créées à la main gardent l'icône par défaut ⭐ jusqu'à ce qu'on la choisisse.

alter table zoralia.missions add column icon text not null default '⭐' check (char_length(icon) between 1 and 12);
grant insert (icon) on zoralia.missions to authenticated;
grant update (icon) on zoralia.missions to authenticated;

create function zoralia_private.starter_mission_list()
returns table (ord int, title text, description text, category text, points int, icon text)
language sql immutable as $$
  select * from (values
    (1, 'Mettre la table', '', 'daily', 1, '🍽️'),
    (2, 'Débarrasser la table', '', 'daily', 1, '🧽'),
    (3, 'Ranger ma chambre', '', 'daily', 1, '🧸'),
    (4, 'Je mange correctement', 'Avec ma fourchette et mon couteau, et je ne me lève pas de table.', 'daily', 1, '🍴'),
    (5, 'Je me lave les mains', '', 'daily', 1, '🧼'),
    (6, 'Je me brosse les dents', '', 'daily', 1, '🪥'),
    (7, 'Je mets mon pyjama', '', 'daily', 1, '👘'),
    (8, 'Je réussis mon matin', 'Habillage, dents, chaussures.', 'daily', 1, '🌅'),
    (9, 'Ranger et retourner mes habits', '', 'daily', 1, '👕'),
    (10, 'Mettre mes habits au sale', '', 'daily', 1, '🧺'),
    (11, 'Pendre mon manteau', '', 'daily', 1, '🧥'),
    (12, 'Ranger mes chaussures', '', 'daily', 1, '👟'),
    (13, 'J''écoute du 1er coup', '', 'daily', 1, '👂'),
    (14, 'Je me prépare sans conflit', '', 'daily', 1, '😊'),
    (15, 'Je parle gentiment et poliment', '', 'daily', 1, '💬'),
    (16, 'Je m''endors sans perturber mes parents', '', 'daily', 1, '😴'),
    (17, 'Je reste dans mon lit la nuit', '', 'daily', 1, '🛌'),
    (18, 'J''aide mes parents à sortir les affaires de la voiture', '', 'heroic', 3, '🚗'),
    (19, 'Je maîtrise mes émotions', '', 'heroic', 3, '🧘'),
    (20, 'Je suis courageux(se)', '', 'heroic', 3, '🦁'),
    (21, 'Je termine mes missions', '', 'heroic', 3, '🏁'),
    (22, 'Aider sans qu''on le demande', '', 'heroic', 3, '🤝'),
    (23, 'Gérer une dispute calmement', '', 'heroic', 4, '🕊️'),
    (24, 'Très bon travail à l''école', '', 'heroic', 5, '📚'),
    (25, 'Très bon comportement à la maison et en famille', '', 'heroic', 5, '🏡')
  ) as v(ord, title, description, category, points, icon)
$$;

create or replace function zoralia_private.seed_starter_missions(p_family uuid, p_user uuid) returns void
language plpgsql security definer set search_path = zoralia as $$
begin
  insert into zoralia.missions (family_id, title, description, category, points, icon, requires_approval, created_by, created_at)
  select p_family, v.title, v.description, v.category, v.points, v.icon, true, p_user,
         now() + v.ord * interval '1 millisecond'  -- conserve l'ordre de la liste à l'affichage
  from zoralia_private.starter_mission_list() v
  where not exists (select 1 from zoralia.missions m where m.family_id = p_family and m.title = v.title);
end $$;

-- Les foyers existants reçoivent les icônes (sans toucher à une icône déjà choisie).
update zoralia.missions m set icon = l.icon
from zoralia_private.starter_mission_list() l
where m.title = l.title and m.icon = '⭐';

revoke execute on all functions in schema zoralia from public, anon;
grant execute on all functions in schema zoralia to authenticated;
