-- Zoralia — chaque enfant peut choisir son univers. NULL = l'univers par défaut du foyer.
alter table zoralia.children add column theme_id uuid references zoralia.themes;
grant update (theme_id) on zoralia.children to authenticated;
