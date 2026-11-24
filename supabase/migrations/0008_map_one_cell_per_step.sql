-- Zoralia — la carte avance d'une case par pas (500 cases) au lieu d'une case tous les 5 pas.
-- Seule la vue change : les coffres, les seuils et les pas eux-mêmes ne bougent pas.

create or replace view zoralia.child_map_progress with (security_invoker = true) as
select w.child_id, w.family_id, w.steps, least(500, w.steps)::int as map_step,
       (select count(*) from zoralia.chest_claims k where k.child_id = w.child_id)::int as chests_opened
from zoralia.child_wallet_summary w;
