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

-- Liste de départ : 22 missions, renommées « à la première personne », créées une seule fois
select t.eq('25 missions de départ', (select count(*) from zoralia.missions where family_id = (select v from ctx where k='famA')), 25::bigint);
select t.eq('mission renommée présente', (select count(*) from zoralia.missions where title = 'Ranger ma chambre' and family_id = (select v from ctx where k='famA')), 1::bigint);
select zoralia_private.seed_starter_missions((select v from ctx where k='famA'), 'aaaaaaaa-0000-0000-0000-000000000001');
select t.eq('semis idempotent', (select count(*) from zoralia.missions where family_id = (select v from ctx where k='famA')), 25::bigint);

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
select t.logout();

-- Colonnes protégées pour le parent lui-même
select t.login('aaaaaaaa-0000-0000-0000-000000000001');
select t.fails($$update family_treasures set current_points = 100$$, 'permission denied');
select t.fails($$update families set created_by = id$$, 'permission denied');
select t.fails($$insert into points_transactions (family_id, child_id, amount, type) select family_id, id, 99, 'mission_reward' from children$$, 'permission denied');

-- 5/6. Les pas font avancer la carte ; les coffres versent des pépites une seule fois ; dépenser ne fait pas reculer
select parent_adjust_steps((select v from ctx where k='lea'), 24, 'test');
select t.eq('25 pas => case 5', (select map_step from child_map_progress where child_id = (select v from ctx where k='lea')), 5);
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
select t.eq('carte inchangée après dépense', (select map_step from child_map_progress where child_id = (select v from ctx where k='lea')), 7);
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
select t.fails(format($$select roll_dice(%L)$$, (select v from ctx where k='tom')), 'not_eligible');
select t.eq('dé consommé', (dice_eligibility((select v from ctx where k='tom')) ->> 'eligible')::boolean, false);

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
select t.eq('carte conservée', (select map_step from child_map_progress where child_id = (select v from ctx where k='lea')), 7);
select delete_family((select v from ctx where k='famA'));
select t.logout();
delete from auth.users where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select t.eq('suppression du compte (Popote) emporte le foyer', (select count(*) from zoralia.families where created_by = 'aaaaaaaa-0000-0000-0000-000000000001'), 0::bigint);
select t.login('aaaaaaaa-0000-0000-0000-000000000001');
select t.eq('foyer supprimé', (select count(*) from children), 0::bigint);
select t.logout();

select 'OK : tous les tests passent' as resultat;
rollback;
