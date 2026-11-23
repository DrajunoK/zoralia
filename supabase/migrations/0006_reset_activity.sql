-- Zoralia — remise à zéro de l'activité d'un foyer (fin de période de test, nouvelle année scolaire…).
--
-- Efface tout ce que les enfants ont fait : missions réalisées, pas, pépites, coffres ouverts, demandes de
-- récompenses, lancers de dé, badges, contributions au trésor (qui repart à 0).
-- Conserve le foyer, les enfants, les missions, la boutique, le trésor (objectif et récompense) et les réglages.
-- Réservée au parent du foyer ; le journal est effacé avec le reste, pense à l'exporter avant si besoin.

create function zoralia.reset_family_activity(p_family uuid) returns void
language plpgsql security definer set search_path = zoralia as $$
declare v_latest uuid;
begin
  perform zoralia_private.require_parent(p_family);

  delete from zoralia.mission_occurrences where mission_id in (select id from zoralia.missions where family_id = p_family);
  delete from zoralia.reward_redemptions where family_id = p_family;
  delete from zoralia.treasure_contributions where treasure_id in (select id from zoralia.family_treasures where family_id = p_family);
  delete from zoralia.chest_claims where child_id in (select id from zoralia.children where family_id = p_family);
  delete from zoralia.child_badges where child_id in (select id from zoralia.children where family_id = p_family);
  delete from zoralia.dice_rolls where family_id = p_family;
  delete from zoralia.step_transactions where family_id = p_family;
  delete from zoralia.points_transactions where family_id = p_family;

  -- le trésor le plus récent repart vide et actif ; les anciens sont archivés (un seul trésor ouvert à la fois)
  select id into v_latest from zoralia.family_treasures where family_id = p_family order by created_at desc limit 1;
  update zoralia.family_treasures set status = 'archived' where family_id = p_family and id is distinct from v_latest;
  update zoralia.family_treasures set current_points = 0, status = 'active' where id = v_latest;
end $$;

revoke execute on all functions in schema zoralia from public, anon;
grant execute on all functions in schema zoralia to authenticated;
