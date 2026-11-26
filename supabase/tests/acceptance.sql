-- Tests d'acceptation SQL/RLS (spec §12 : 3, 4, 5, 6, 7, 8, 9, 10). Lancer via tests/run.sh.
begin;
set local search_path = zoralia, public;
create schema t;
grant usage on schema t to authenticated, anon;

create function t.login(u uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', u::text, true);
  execute 'set local role authenticated';
end $$;
create function t.logout() returns void language plpgsql as $$
begin execute 'reset role'; perform set_config('request.jwt.claim.sub', '', true); end $$;
create function t.fails(q text, expected text) returns void language plpgsql as $$
begin
  begin execute q; exception when others then
    if sqlerrm like '%' || expected || '%' then return; end if;
    raise exception 'mauvaise erreur pour [%] : % (attendu %)', q, sqlerrm, expected;
  end;
  raise exception 'aurait dû échouer : %', q;
end $$;
create function t.eq(label text, got anyelement, want anyelement) returns void language plpgsql as $$
begin if got is distinct from want then raise exception '% : obtenu %, attendu %', label, got, want; end if; end $$;
grant execute on all functions in schema t to authenticated, anon;

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@x.fr', '{"full_name":"Parent A"}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@x.fr', '{"full_name":"Parent B"}');

-- Coexistence avec Popote : ses objets publics gardent leurs droits
select t.eq('popote: profil créé par son trigger', (select name from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'Parent A');
select t.eq('popote: execute conservé', has_function_privilege('authenticated', 'public.is_member(text)', 'execute'), true);
select t.eq('popote: select conservé', has_table_privilege('authenticated', 'public.profiles', 'select'), true);

create temp table ctx (k text primary key, v uuid);
grant all on ctx to authenticated;

-- 2. Parent A crée foyer et deux enfants
select t.login('aaaaaaaa-0000-0000-0000-000000000001');
insert into ctx select 'famA', create_family('Famille A');
select t.fails($$select create_family('Deuxième')$$, 'already_in_family');
insert into children (family_id, display_name) select v, 'Léa' from ctx where k = 'famA';
insert into children (family_id, display_name) select v, 'Tom' from ctx where k = 'famA';
insert into ctx select 'lea', id from children where display_name = 'Léa';
insert into ctx select 'tom', id from children where display_name = 'Tom';
select t.eq('2 enfants', (select count(*) from children), 2::bigint);
select t.logout();

-- Règles des coffres : 1er à 10 pas puis tous les 25 pas (20 coffres), valeur croissante par territoire
select t.eq('seuil coffre 1', zoralia_private.chest_threshold(1), 10);
select t.eq('seuil coffre 20', zoralia_private.chest_threshold(20), 485);
select t.eq('valeur coffre 1', zoralia_private.chest_value(1), 5);
select t.eq('valeur coffre 5', zoralia_private.chest_value(5), 8);
select t.eq('valeur coffre 20', zoralia_private.chest_value(20), 20);

-- Boutique de départ : 21 récompenses, Soirée TV remplace « Choisir le film », semis rejouable sans doublon
select t.eq('21 récompenses de départ', (select count(*) from zoralia.shop_rewards where family_id = (select v from ctx where k='famA')), 21::bigint);
select t.eq('Soirée TV à 15 pépites', (select cost from zoralia.shop_rewards where title = 'Soirée TV' and family_id = (select v from ctx where k='famA')), 15);
select t.eq('plus de « Choisir le film »', (select count(*) from zoralia.shop_rewards where title like 'Choisir le film%' and family_id = (select v from ctx where k='famA')), 0::bigint);
select zoralia_private.seed_starter_rewards((select v from ctx where k='famA'));
select t.eq('semis boutique idempotent', (select count(*) from zoralia.shop_rewards where family_id = (select v from ctx where k='famA')), 21::bigint);
select t.eq('nouveaux prix', (select string_agg(cost::text, ',' order by title collate "C") from zoralia.shop_rewards where family_id = (select v from ctx where k='famA') and title in ('1h de jeux vidéo sur la Switch', 'Choisir le jeu en famille', 'Crêperie', 'Cuisiner avec un parent', 'Jungle park', 'Petit cadeau surprise', 'Piscine')), '20,5,25,10,25,30,25');
select t.eq('dessert et sortie retirés', (select count(*) from zoralia.shop_rewards where family_id = (select v from ctx where k='famA') and (title = 'Choisir le dessert' or title like 'Sortie choisie%')), 0::bigint);

-- Liste de départ : 22 missions, renommées « à la première personne », créées une seule fois
select t.eq('26 missions de départ', (select count(*) from zoralia.missions where family_id = (select v from ctx where k='famA')), 26::bigint);
select t.eq('mission renommée présente', (select count(*) from zoralia.missions where title = 'Ranger ma chambre' and family_id = (select v from ctx where k='famA')), 1::bigint);
select t.eq('chaque mission de départ a son icône', (select count(*) from zoralia.missions where family_id = (select v from ctx where k='famA') and icon = '⭐'), 0::bigint);
select t.eq('icône du pyjama', (select icon from zoralia.missions where title = 'Je mets mon pyjama' and family_id = (select v from ctx where k='famA')), '👘');
select zoralia_private.seed_starter_missions((select v from ctx where k='famA'), 'aaaaaaaa-0000-0000-0000-000000000001');
select t.eq('voiture : routine quotidienne à 1 pas', (select category || points from zoralia.missions where title like 'J''aide mes parents à sortir%' and family_id = (select v from ctx where k='famA')), 'daily1');
select t.eq('dispute à 3 pas', (select points from zoralia.missions where title = 'Gérer une dispute calmement' and family_id = (select v from ctx where k='famA')), 3);
select t.eq('terminer mes missions à 2 pas', (select points from zoralia.missions where title = 'Je termine mes missions' and family_id = (select v from ctx where k='famA')), 2);
select t.eq('devoirs : défi héroïque à 2 pas', (select category || points from zoralia.missions where title like 'Je fais mes devoirs%' and family_id = (select v from ctx where k='famA')), 'heroic2');
select t.eq('semis idempotent', (select count(*) from zoralia.missions where family_id = (select v from ctx where k='famA')), 26::bigint);

select t.login('bbbbbbbb-0000-0000-0000-000000000002');
insert into ctx select 'famB', create_family('Famille B');
select t.eq('B ne voit pas les enfants de A', (select count(*) from children), 0::bigint);
select t.eq('B ne voit que son foyer', (select count(*) from families), 1::bigint);
select t.logout();

-- 3. Mission quotidienne +1 : claim, approbation, une seule transaction
select t.login('aaaaaaaa-0000-0000-0000-000000000001');
insert into ctx select 'm1', id from missions where title = 'Mettre la table';
insert into ctx select 'occ1', claim_mission((select v from ctx where k='m1'), (select v from ctx where k='lea'));
select t.eq('pas de pas avant validation', (select steps from child_wallet_summary where child_id = (select v from ctx where k='lea')), 0);
-- 4. pas de double gain le même jour
select t.fails(format($$select claim_mission(%L, %L)$$, (select v from ctx where k='m1'), (select v from ctx where k='lea')), 'already_claimed');
select approve_mission((select v from ctx where k='occ1'));
select approve_mission((select v from ctx where k='occ1')) where false;
select t.fails(format($$select approve_mission(%L)$$, (select v from ctx where k='occ1')), 'invalid_state');
select t.eq('+1 pas, une seule transaction', (select count(*) from step_transactions where child_id = (select v from ctx where k='lea')), 1::bigint);
select t.eq('1 pas', (select steps from child_wallet_summary where child_id = (select v from ctx where k='lea')), 1);
select t.eq('une mission ne donne pas de pépites', (select balance from child_wallet_summary where child_id = (select v from ctx where k='lea')), 0);
select t.logout();

-- 10. Parent B ne peut rien sur le foyer A
select t.login('bbbbbbbb-0000-0000-0000-000000000002');
select t.fails(format($$select approve_mission(%L)$$, (select v from ctx where k='occ1')), 'forbidden');
select t.fails(format($$select claim_mission(%L, %L)$$, (select v from ctx where k='m1'), (select v from ctx where k='lea')), 'forbidden');
select t.fails(format($$select parent_adjust_points(%L, 50, 'triche')$$, (select v from ctx where k='lea')), 'forbidden');
select t.fails(format($$select parent_adjust_steps(%L, 50, 'triche')$$, (select v from ctx where k='lea')), 'forbidden');
select t.fails($$insert into step_transactions (family_id, child_id, amount, type) select family_id, id, 99, 'mission_steps' from children$$, 'permission denied');
select t.fails(format($$select roll_dice(%L)$$, (select v from ctx where k='lea')), 'forbidden');
select t.fails(format($$select export_family(%L)$$, (select v from ctx where k='famA')), 'forbidden');
select t.fails(format($$select delete_family(%L)$$, (select v from ctx where k='famA')), 'forbidden');
select t.fails($$insert into points_transactions (family_id, child_id, amount, type) select family_id, id, 99, 'mission_reward' from children$$, 'permission denied');
select t.fails(format($$insert into children (family_id, display_name) values (%L, 'intrus')$$, (select v from ctx where k='famA')), 'row-level security');
update children set display_name = 'piraté' where id = (select v from ctx where k='lea');
select t.eq('update inter-foyer sans effet', (select count(*) from children where display_name = 'piraté'), 0::bigint);
update children set theme_id = (select id from themes where slug = 'pirates') where id = (select v from ctx where k='lea');
select t.logout();
select t.eq('univers inter-foyer sans effet', (select count(*) from zoralia.children where theme_id is not null), 0::bigint);
select t.login('aaaaaaaa-0000-0000-0000-000000000001');
update children set theme_id = (select id from themes where slug = 'princesses') where id = (select v from ctx where k='lea');
select t.eq('un enfant a son univers, pas les autres', (select count(*) from children where theme_id is not null), 1::bigint);
select t.logout();
select t.login('bbbbbbbb-0000-0000-0000-000000000002');
select t.logout();

select t.login('bbbbbbbb-0000-0000-0000-000000000002');
update missions set icon = '💥' where family_id = (select v from ctx where k='famA');
select t.logout();
select t.eq('B ne peut pas changer les icônes de A', (select count(*) from zoralia.missions where icon = '💥'), 0::bigint);
-- Colonnes protégées pour le parent lui-même
select t.login('aaaaaaaa-0000-0000-0000-000000000001');
select t.fails($$update family_treasures set current_points = 100$$, 'permission denied');
select t.fails($$update families set created_by = id$$, 'permission denied');
select t.fails($$insert into points_transactions (family_id, child_id, amount, type) select family_id, id, 99, 'mission_reward' from children$$, 'permission denied');

-- 5/6. Les pas font avancer la carte ; les coffres versent des pépites une seule fois ; dépenser ne fait pas reculer
select parent_adjust_steps((select v from ctx where k='lea'), 24, 'test');
select t.eq('25 pas => case 25 (une case par pas)', (select map_step from child_map_progress where child_id = (select v from ctx where k='lea')), 25);
select t.eq('coffre 1 (10 pas) ouvert', (select chests_opened from child_map_progress where child_id = (select v from ctx where k='lea')), 1);
select t.eq('coffre 1 verse 5 pépites', (select balance from child_wallet_summary where child_id = (select v from ctx where k='lea')), 5);
select parent_adjust_steps((select v from ctx where k='lea'), 10, 'test');
select t.eq('coffre 2 (35 pas) ouvert', (select chests_opened from child_map_progress where child_id = (select v from ctx where k='lea')), 2);
select parent_adjust_steps((select v from ctx where k='lea'), 1, 'test');
select t.eq('un coffre ne paie qu''une fois', (select balance from child_wallet_summary where child_id = (select v from ctx where k='lea')), 10);
select t.eq('2 coffres enregistrés', (select count(*) from chest_claims where child_id = (select v from ctx where k='lea')), 2::bigint);
select t.eq('badge petit aventurier (10 pas)', (select count(*) from child_badges where child_id = (select v from ctx where k='lea')), 1::bigint);
select t.fails(format($$select parent_adjust_steps(%L, -3, 'x')$$, (select v from ctx where k='lea')), 'invalid_amount');
insert into ctx select 'rw10', id from shop_rewards where cost = 10 limit 1;
insert into ctx select 'red1', request_reward((select v from ctx where k='lea'), (select v from ctx where k='rw10'));
select t.eq('demande ne débite pas', (select balance from child_wallet_summary where child_id = (select v from ctx where k='lea')), 10);
select approve_reward((select v from ctx where k='red1'));
select t.eq('approbation débite', (select balance from child_wallet_summary where child_id = (select v from ctx where k='lea')), 0);
select t.eq('carte inchangée après dépense', (select map_step from child_map_progress where child_id = (select v from ctx where k='lea')), 36);
select t.eq('pas inchangés après dépense', (select steps from child_wallet_summary where child_id = (select v from ctx where k='lea')), 36);
select t.fails(format($$select approve_reward(%L)$$, (select v from ctx where k='red1')), 'invalid_state');

-- 7. refus ne débite rien ; solde insuffisant refusé
insert into ctx select 'rw40', id from shop_rewards where cost = 40 limit 1;
select t.fails(format($$select request_reward(%L, %L)$$, (select v from ctx where k='lea'), (select v from ctx where k='rw40')), 'insufficient_points');
select parent_adjust_points((select v from ctx where k='lea'), 15, 'recharge test');
insert into ctx select 'red2', request_reward((select v from ctx where k='lea'), (select v from ctx where k='rw10'));
select reject_reward((select v from ctx where k='red2'));
select t.eq('refus ne débite rien', (select balance from child_wallet_summary where child_id = (select v from ctx where k='lea')), 15);
select t.fails(format($$select parent_adjust_points(%L, -500, 'x')$$, (select v from ctx where k='lea')), 'insufficient_points');

-- 8. Trésor : jauge crédité, contributeur débité
insert into ctx select 'tr', id from family_treasures;
select contribute_to_treasure((select v from ctx where k='tr'), (select v from ctx where k='lea'), 5);
select t.eq('jauge', (select current_points from family_treasures), 5);
select t.eq('contributeur débité', (select balance from child_wallet_summary where child_id = (select v from ctx where k='lea')), 10);
select t.eq('contribution liée au ledger', (select count(*) from treasure_contributions c join points_transactions p on p.id = c.transaction_id), 1::bigint);
select t.fails(format($$select contribute_to_treasure(%L, %L, 999)$$, (select v from ctx where k='tr'), (select v from ctx where k='lea')), 'exceeds_target');
select t.fails(format($$select contribute_to_treasure(%L, %L, 50)$$, (select v from ctx where k='tr'), (select v from ctx where k='lea')), 'insufficient_points');
select t.eq('jauge intacte après échec', (select current_points from family_treasures), 5);

-- 9. Dé : impossible avant éligibilité, résultat persisté ensuite
select t.fails(format($$select roll_dice(%L)$$, (select v from ctx where k='tom')), 'not_eligible');
update family_settings set dice_quest_threshold = 1;
select t.fails(format($$select roll_dice(%L)$$, (select v from ctx where k='tom')), 'not_eligible');
insert into ctx select 'occ2', claim_mission((select v from ctx where k='m1'), (select v from ctx where k='tom'));
select approve_mission((select v from ctx where k='occ2'));
select t.eq('dé éligible', (dice_eligibility((select v from ctx where k='tom')) ->> 'eligible')::boolean, true);
insert into ctx select 'roll1', (roll_dice((select v from ctx where k='tom')) ->> 'id')::uuid;
select t.eq('lancer persisté', (select count(*) from dice_rolls where child_id = (select v from ctx where k='tom')), 1::bigint);
select t.fails(format($$select roll_dice(%L)$$, (select v from ctx where k='tom')), 'already_rolled');
select t.eq('dé consommé', (dice_eligibility((select v from ctx where k='tom')) ->> 'eligible')::boolean, false);

-- Dé quotidien : seuil de missions validées dans la journée, un lancer par jour, six faces équiprobables avec leurs effets
select t.eq('seuil par défaut à 10 pour un nouveau foyer', (select column_default from information_schema.columns where table_schema = 'zoralia' and table_name = 'family_settings' and column_name = 'dice_quest_threshold'), '10');
update family_settings set dice_quest_threshold = 2;
select t.eq('1 mission validée ne suffit pas à 2 de seuil', (dice_eligibility((select v from ctx where k='lea')) ->> 'eligible')::boolean, false);
select t.eq('progression visible', (dice_eligibility((select v from ctx where k='lea')) ->> 'progress')::int, 1);
select t.fails(format($$select roll_dice(%L)$$, (select v from ctx where k='lea')), 'not_eligible');
update family_settings set dice_quest_threshold = 1;
insert into children (family_id, display_name) select (select v from ctx where k='famA'), 'dé' || n from generate_series(1, 8) n;
select t.logout();
select t.eq('6 faces distinctes', (select count(distinct zoralia_private.dice_face(n)) from generate_series(0, 5) n), 6::bigint);
select t.eq('chaque face a la même chance (6000 tirages, 800 à 1200 par face)',
  (select bool_and(c between 800 and 1200) and count(*) = 6 from (select f, count(*) c from (select zoralia_private.pick_face() f from generate_series(1, 6000)) x group by f) y), true);
create temp table tb as select current_points as v from family_treasures where family_id = (select v from ctx where k='famA');   -- le lancer réel de Tom a pu toucher le coffre : on compare à ce point de départ
select zoralia_private.perform_roll(id, 'lose') from children where display_name = 'dé1';
select zoralia_private.perform_roll(id, 'steps1') from children where display_name = 'dé2';
select zoralia_private.perform_roll(id, 'steps2') from children where display_name = 'dé3';
select zoralia_private.perform_roll(id, 'pep1') from children where display_name = 'dé4';
select zoralia_private.perform_roll(id, 'pep2') from children where display_name = 'dé5';
select zoralia_private.perform_roll(id, 'chest2') from children where display_name = 'dé6';
select t.eq('pas de chance : rien ne bouge', (select count(*) from step_transactions s join children c on c.id = s.child_id where c.display_name = 'dé1') + (select count(*) from points_transactions p join children c on c.id = p.child_id where c.display_name = 'dé1'), 0::bigint);
select t.eq('… mais le lancer est noté', (select count(*) from dice_rolls r join children c on c.id = r.child_id where c.display_name = 'dé1' and r.result_key = 'lose'), 1::bigint);
select t.eq('+1 pas', (select steps from child_wallet_summary w join children c on c.id = w.child_id where c.display_name = 'dé2'), 1);
select t.eq('+2 pas', (select steps from child_wallet_summary w join children c on c.id = w.child_id where c.display_name = 'dé3'), 2);
select t.eq('+1 pépite', (select balance from child_wallet_summary w join children c on c.id = w.child_id where c.display_name = 'dé4'), 1);
select t.eq('+2 pépites', (select balance from child_wallet_summary w join children c on c.id = w.child_id where c.display_name = 'dé5'), 2);
select t.eq('les pas du dé sont notés « dice_steps »', (select count(*) from step_transactions s join children c on c.id = s.child_id where s.type = 'dice_steps' and c.display_name like 'dé%'), 2::bigint);
select t.eq('les pépites du dé sont notées « dice_bonus »', (select count(*) from points_transactions p join children c on c.id = p.child_id where p.type = 'dice_bonus' and p.description = 'Dé du destin' and c.display_name like 'dé%'), 2::bigint);
select t.eq('+2 dans le coffre famille : jauge', (select current_points from family_treasures where family_id = (select v from ctx where k='famA')) - (select v from tb), 2);
select t.eq('… sans rien débiter à l''enfant', (select balance from child_wallet_summary w join children c on c.id = w.child_id where c.display_name = 'dé6'), 0);
select t.eq('… et la contribution est enregistrée', (select count(*) from treasure_contributions t2 join children c on c.id = t2.child_id where t2.transaction_id is null and c.display_name = 'dé6'), 1::bigint);
update family_treasures set current_points = target_points - 1 where family_id = (select v from ctx where k='famA');
select zoralia_private.perform_roll(id, 'chest2') from children where display_name = 'dé7';
select t.eq('coffre presque plein : seule la place restante est ajoutée', (select (result_payload ->> 'chest')::int from dice_rolls r join children c on c.id = r.child_id where c.display_name = 'dé7'), 1);
select t.eq('… et il est atteint', (select status from family_treasures where family_id = (select v from ctx where k='famA')), 'reached');
select zoralia_private.perform_roll(id, 'chest2') from children where display_name = 'dé8';
select t.eq('coffre plein : l''enfant reçoit 2 pépites à la place', (select balance from child_wallet_summary w join children c on c.id = w.child_id where c.display_name = 'dé8'), 2);
select t.eq('un enfant ne lance pas deux fois le même jour', (select count(*) from (select 1 from dice_rolls group by child_id having count(*) > 1) x), 0::bigint);
delete from children where display_name like 'dé%';
update family_treasures set current_points = (select v from tb), status = 'active' where family_id = (select v from ctx where k='famA');
drop table tb;
select t.login('aaaaaaaa-0000-0000-0000-000000000001');

-- Codes d'accès : posés par le parent, jamais lisibles, vérifiés côté serveur
select set_child_pin((select v from ctx where k='lea'), '1234');
select t.eq('has_pin visible', (select has_pin from children where id = (select v from ctx where k='lea')), true);
select t.eq('bon code enfant', verify_child_pin((select v from ctx where k='lea'), '1234'), true);
select t.eq('mauvais code enfant', verify_child_pin((select v from ctx where k='lea'), '0000'), false);
select t.eq('sans code : accès libre', verify_child_pin((select v from ctx where k='tom'), '9999'), true);
select t.fails(format($$select set_child_pin(%L, '12a4')$$, (select v from ctx where k='lea')), 'invalid_pin');
select t.fails(format($$select set_child_pin(%L, '123')$$, (select v from ctx where k='lea')), 'invalid_pin');
select t.fails($$select pin_hash from zoralia.child_pins$$, 'permission denied');
select t.fails($$select pin_hash from zoralia.family_pins$$, 'permission denied');
select t.fails(format($$update zoralia.children set has_pin = false where id = %L$$, (select v from ctx where k='lea')), 'permission denied');
select t.eq('code parent par défaut 0000', verify_parent_pin((select v from ctx where k='famA'), '0000'), true);
select t.eq('code parent faux', verify_parent_pin((select v from ctx where k='famA'), '1111'), false);
select t.eq('code parent encore par défaut', parent_pin_is_default((select v from ctx where k='famA')), true);
select set_parent_pin((select v from ctx where k='famA'), '4321');
select t.eq('nouveau code parent accepté', verify_parent_pin((select v from ctx where k='famA'), '4321'), true);
select t.eq('ancien 0000 refusé', verify_parent_pin((select v from ctx where k='famA'), '0000'), false);
select t.eq('plus par défaut', parent_pin_is_default((select v from ctx where k='famA')), false);
select set_child_pin((select v from ctx where k='lea'), null);
select t.eq('code enfant supprimé', (select has_pin from children where id = (select v from ctx where k='lea')), false);
select t.logout();
select t.login('bbbbbbbb-0000-0000-0000-000000000002');
select t.fails(format($$select set_child_pin(%L, '1111')$$, (select v from ctx where k='lea')), 'forbidden');
select t.fails(format($$select verify_child_pin(%L, '1111')$$, (select v from ctx where k='lea')), 'forbidden');
select t.fails(format($$select set_parent_pin(%L, '1111')$$, (select v from ctx where k='famA')), 'forbidden');
select t.fails(format($$select verify_parent_pin(%L, '0000')$$, (select v from ctx where k='famA')), 'forbidden');
select t.logout();
select t.login('aaaaaaaa-0000-0000-0000-000000000001');

-- Export / suppression
select t.eq('export contient les pas', jsonb_array_length(export_family((select v from ctx where k='famA')) -> 'steps') > 0, true);
select t.eq('export contient les enfants', jsonb_array_length(export_family((select v from ctx where k='famA')) -> 'children'), 2);
select t.logout();

-- La clé service_role n'est pas en cause : anon n'a accès à rien
set local role anon;
select t.fails($$select * from zoralia.children$$, 'permission denied');
select t.fails($$select zoralia.create_family('x')$$, 'permission denied');
reset role;

-- 12. Changer de thème ne touche pas aux données
select t.login('aaaaaaaa-0000-0000-0000-000000000001');
update families set active_theme_id = (select id from themes where slug = 'pirates');
select t.eq('solde conservé', (select balance from child_wallet_summary where child_id = (select v from ctx where k='lea')), 10);
select t.eq('carte conservée', (select map_step from child_map_progress where child_id = (select v from ctx where k='lea')), 36);
-- Remise à zéro : l'activité disparaît, la configuration reste, les autres foyers et autres parents sont intacts
select t.logout();
select t.login('bbbbbbbb-0000-0000-0000-000000000002');
select t.fails(format($$select reset_family_activity(%L)$$, (select v from ctx where k='famA')), 'forbidden');
select t.logout();
select t.login('aaaaaaaa-0000-0000-0000-000000000001');
select t.eq('avant remise à zéro : des pas existent', (select count(*) > 0 from step_transactions), true);
select reset_family_activity((select v from ctx where k='famA'));
select t.eq('plus de pas', (select count(*) from step_transactions), 0::bigint);
select t.eq('plus de pépites', (select count(*) from points_transactions), 0::bigint);
select t.eq('plus de coffres ouverts', (select count(*) from chest_claims), 0::bigint);
select t.eq('plus de missions réalisées', (select count(*) from mission_occurrences), 0::bigint);
select t.eq('plus de demandes', (select count(*) from reward_redemptions), 0::bigint);
select t.eq('plus de lancers de dé', (select count(*) from dice_rolls), 0::bigint);
select t.eq('plus de badges', (select count(*) from child_badges), 0::bigint);
select t.eq('soldes à zéro', (select sum(balance + steps)::int from child_wallet_summary), 0);
select t.eq('trésor vidé et actif', (select current_points || status from family_treasures), '0active');
select t.eq('les enfants restent', (select count(*) from children), 2::bigint);
select t.eq('les missions restent', (select count(*) from missions), 26::bigint);
select t.eq('la boutique reste', (select count(*) > 0 from shop_rewards), true);
select t.eq('on peut refaire la mission du jour', (select claim_mission((select v from ctx where k='m1'), (select v from ctx where k='lea')) is not null), true);
select t.logout();
select t.login('bbbbbbbb-0000-0000-0000-000000000002');
select t.eq('le foyer B n''a pas été touché', (select count(*) from missions), 26::bigint);
select t.logout();
select t.login('aaaaaaaa-0000-0000-0000-000000000001');

select delete_family((select v from ctx where k='famA'));
select t.logout();
delete from auth.users where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select t.eq('suppression du compte (Popote) emporte le foyer', (select count(*) from zoralia.families where created_by = 'aaaaaaaa-0000-0000-0000-000000000001'), 0::bigint);
select t.login('aaaaaaaa-0000-0000-0000-000000000001');
select t.eq('foyer supprimé', (select count(*) from children), 0::bigint);
select t.logout();

select 'OK : tous les tests passent' as resultat;
rollback;
