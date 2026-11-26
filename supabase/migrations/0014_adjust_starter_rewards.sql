-- Zoralia — ajustement de la boutique :
--   « Choisir le dessert » devient « Cuisiner avec un parent », « Choisir le jeu en famille » passe à 5 pépites,
--   « 1h de jeux vidéo sur la Switch » à 20, « Petit cadeau surprise » à 30, « Sortie choisie » disparaît au profit de
--   « Piscine », « Crêperie » et « Jungle park » (25 pépites chacune).
-- Foyers existants : un prix n'est changé que s'il a encore sa valeur d'origine (un prix modifié par le parent est respecté).

create or replace function zoralia_private.starter_reward_list()
returns table (ord int, title text, cost int, image_key text)
language sql immutable as $$
  select * from (values
    (1,  '30 min de TV', 5, 'tv'),
    (2,  'Se coucher 15 minutes plus tard', 5, 'moon'),
    (3,  'Choisir le jeu en famille', 5, 'game'),
    (4,  '15 min de jeux vidéo sur le téléphone', 10, 'phone'),
    (5,  'Cuisiner avec un parent', 10, 'chef'),
    (6,  'Soirée TV', 15, 'popcorn'),
    (7,  'Inviter un copain ou une copine', 15, 'friend'),
    (8,  '1h de jeux vidéo sur la Switch', 20, 'gamepad'),
    (9,  'Bowling', 20, 'bowling'),
    (10, 'Piscine', 25, 'pool'),
    (11, 'Crêperie', 25, 'crepe'),
    (12, 'Jungle park', 25, 'jungle'),
    (13, 'Activité spéciale avec papa ou maman', 25, 'heart'),
    (14, 'Petit cadeau surprise', 30, 'gift'),
    (15, 'Soirée pyjama avec un(e) ami(e)', 30, 'pajama'),
    (16, 'Journée « c''est moi qui décide »', 40, 'crown')
  ) as v(ord, title, cost, image_key)
$$;

update zoralia.shop_rewards r set title = 'Cuisiner avec un parent', image_key = 'chef'
 where title = 'Choisir le dessert'
   and not exists (select 1 from zoralia.shop_rewards o where o.family_id = r.family_id and o.title = 'Cuisiner avec un parent');
update zoralia.shop_rewards set cost = 5  where title = 'Choisir le jeu en famille' and cost = 10;
update zoralia.shop_rewards set cost = 20 where title = '1h de jeux vidéo sur la Switch' and cost = 15;
update zoralia.shop_rewards set cost = 30 where title = 'Petit cadeau surprise' and cost = 25;

-- « Sortie choisie » : retirée. Si un enfant l'a déjà demandée, elle est seulement masquée pour garder l'historique.
update zoralia.shop_rewards r set is_active = false
 where title like 'Sortie choisie%' and exists (select 1 from zoralia.reward_redemptions d where d.reward_id = r.id);
delete from zoralia.shop_rewards r
 where title like 'Sortie choisie%' and not exists (select 1 from zoralia.reward_redemptions d where d.reward_id = r.id);

-- Ajout des seules nouveautés (les récompenses qu'un parent a supprimées ne reviennent pas).
insert into zoralia.shop_rewards (family_id, title, cost, image_key)
select f.id, v.title, v.cost, v.image_key
  from zoralia.families f cross join zoralia_private.starter_reward_list() v
 where v.title in ('Cuisiner avec un parent', 'Piscine', 'Crêperie', 'Jungle park')
   and not exists (select 1 from zoralia.shop_rewards r where r.family_id = f.id and r.title = v.title);
