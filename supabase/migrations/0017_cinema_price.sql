-- Zoralia — « Séance de cinéma » passe de 35 à 30 pépites.

create or replace function zoralia_private.starter_reward_list()
returns table (ord int, title text, cost int, image_key text)
language sql immutable as $$
  select * from (values
    (1, '30 min de TV', 5, 'tv'),
    (2, 'Se coucher 15 minutes plus tard', 5, 'moon'),
    (3, 'Choisir le jeu en famille', 5, 'game'),
    (4, 'Une histoire en plus au coucher', 5, 'book'),
    (5, '15 min de jeux vidéo sur le téléphone', 10, 'phone'),
    (6, 'Cuisiner avec un parent', 10, 'chef'),
    (7, 'Choisir le menu d''un repas', 10, 'menu'),
    (8, 'Soirée TV', 15, 'popcorn'),
    (9, 'Inviter un copain ou une copine', 15, 'friend'),
    (10, 'Atelier peinture ou bricolage avec un parent', 15, 'art'),
    (11, '1h de jeux vidéo sur la Switch', 20, 'gamepad'),
    (12, 'Bowling', 20, 'bowling'),
    (13, 'Piscine', 25, 'pool'),
    (14, 'Crêperie', 25, 'crepe'),
    (15, 'Jungle park', 25, 'jungle'),
    (16, 'Activité spéciale avec papa ou maman', 25, 'heart'),
    (17, 'Camping dans le salon (cabane et lampe torche)', 25, 'tent'),
    (18, 'Escalade', 25, 'climb'),
    (19, 'Petit cadeau surprise', 30, 'gift'),
    (20, 'Soirée pyjama avec un(e) ami(e)', 30, 'pajama'),
    (21, 'McDonald''s', 30, 'burger'),
    (22, 'Séance de cinéma', 30, 'film'),
    (23, 'Journée « c''est moi qui décide »', 40, 'crown')
  ) as v(ord, title, cost, image_key)
$$;

-- Foyers existants : seulement si le parent n'a pas déjà changé le prix.
update zoralia.shop_rewards set cost = 30 where title = 'Séance de cinéma' and cost = 35;
