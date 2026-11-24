-- Zoralia — ajustement de la liste de départ des missions :
--   « J'aide mes parents à sortir les affaires de la voiture » devient une routine quotidienne à 1 pas,
--   « Gérer une dispute calmement » passe à 3 pas, « Je termine mes missions » à 2 pas,
--   et un nouveau défi héroïque est ajouté : « Je fais mes devoirs correctement et sans râler » (2 pas).
-- Les foyers existants sont mis à jour seulement si la mission a encore sa valeur d'origine : une valeur modifiée par le parent est respectée.

create or replace function zoralia_private.starter_mission_list()
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
    (18, 'J''aide mes parents à sortir les affaires de la voiture', '', 'daily', 1, '🚗'),
    (19, 'Je maîtrise mes émotions', '', 'heroic', 3, '🧘'),
    (20, 'Je suis courageux(se)', '', 'heroic', 3, '🦁'),
    (21, 'Je termine mes missions', '', 'heroic', 2, '🏁'),
    (22, 'Aider sans qu''on le demande', '', 'heroic', 3, '🤝'),
    (23, 'Gérer une dispute calmement', '', 'heroic', 3, '🕊️'),
    (24, 'Je fais mes devoirs correctement et sans râler', '', 'heroic', 2, '✏️'),
    (25, 'Très bon travail à l''école', '', 'heroic', 5, '📚'),
    (26, 'Très bon comportement à la maison et en famille', '', 'heroic', 5, '🏡')
  ) as v(ord, title, description, category, points, icon)
$$;

update zoralia.missions set category = 'daily', points = 1
 where title = 'J''aide mes parents à sortir les affaires de la voiture' and category = 'heroic' and points = 3;
update zoralia.missions set points = 3 where title = 'Gérer une dispute calmement' and points = 4;
update zoralia.missions set points = 2 where title = 'Je termine mes missions' and points = 3;

do $$
declare f record;
begin
  for f in select id, created_by from zoralia.families loop
    perform zoralia_private.seed_starter_missions(f.id, f.created_by);
  end loop;
end $$;
