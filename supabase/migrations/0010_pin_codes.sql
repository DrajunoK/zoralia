-- Zoralia — codes d'accès : un code à 4 chiffres par enfant (modifiable par le parent) et un code pour l'espace parent.
--
-- C'est un verrou « doux » contre les petites mains sur la tablette familiale, pas une frontière de sécurité :
-- le parent reste le seul compte authentifié (Google). Les codes sont stockés hachés (sha256 salé), dans des tables
-- fermées au navigateur ; seules des RPC permettent de les poser et de les vérifier. Le code parent vaut 0000 tant
-- qu'il n'a pas été changé.

alter table zoralia.children add column has_pin boolean not null default false;

create table zoralia.child_pins (
  child_id uuid primary key references zoralia.children on delete cascade,
  pin_hash bytea not null
);
create table zoralia.family_pins (
  family_id uuid primary key references zoralia.families on delete cascade,
  pin_hash bytea not null
);
-- Fermées : RLS activée, aucune policy, aucun droit pour les rôles de l'API.
alter table zoralia.child_pins enable row level security;
alter table zoralia.family_pins enable row level security;
revoke all on zoralia.child_pins, zoralia.family_pins from anon, authenticated;

create function zoralia_private.pin_hash(p_salt uuid, p_pin text) returns bytea
language sql immutable as $$ select sha256(convert_to(p_salt::text || ':' || p_pin, 'UTF8')) $$;

create function zoralia_private.check_pin_format(p_pin text) returns void
language plpgsql immutable as $$
begin
  if p_pin is null or p_pin !~ '^[0-9]{4}$' then raise exception 'invalid_pin' using errcode = 'P0001'; end if;
end $$;

-- Pose (ou supprime avec NULL) le code d'un enfant.
create function zoralia.set_child_pin(p_child uuid, p_pin text) returns void
language plpgsql security definer set search_path = zoralia as $$
declare v_family uuid;
begin
  v_family := zoralia_private.lock_child(p_child);
  perform zoralia_private.require_parent(v_family);
  if p_pin is null then
    delete from zoralia.child_pins where child_id = p_child;
    update zoralia.children set has_pin = false where id = p_child;
  else
    perform zoralia_private.check_pin_format(p_pin);
    insert into zoralia.child_pins (child_id, pin_hash) values (p_child, zoralia_private.pin_hash(p_child, p_pin))
    on conflict (child_id) do update set pin_hash = excluded.pin_hash;
    update zoralia.children set has_pin = true where id = p_child;
  end if;
end $$;

-- Vrai si le code est bon (ou si l'enfant n'a pas de code).
create function zoralia.verify_child_pin(p_child uuid, p_pin text) returns boolean
language plpgsql stable security definer set search_path = zoralia as $$
declare v_family uuid; v_hash bytea;
begin
  select family_id into v_family from zoralia.children where id = p_child;
  if v_family is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  perform zoralia_private.require_parent(v_family);
  select pin_hash into v_hash from zoralia.child_pins where child_id = p_child;
  return v_hash is null or v_hash = zoralia_private.pin_hash(p_child, coalesce(p_pin, ''));
end $$;

create function zoralia.set_parent_pin(p_family uuid, p_pin text) returns void
language plpgsql security definer set search_path = zoralia as $$
begin
  perform zoralia_private.require_parent(p_family);
  perform zoralia_private.check_pin_format(p_pin);
  insert into zoralia.family_pins (family_id, pin_hash) values (p_family, zoralia_private.pin_hash(p_family, p_pin))
  on conflict (family_id) do update set pin_hash = excluded.pin_hash;
end $$;

-- Code de l'espace parent : 0000 tant qu'aucun code n'a été choisi.
create function zoralia.verify_parent_pin(p_family uuid, p_pin text) returns boolean
language plpgsql stable security definer set search_path = zoralia as $$
declare v_hash bytea;
begin
  perform zoralia_private.require_parent(p_family);
  select pin_hash into v_hash from zoralia.family_pins where family_id = p_family;
  if v_hash is null then return coalesce(p_pin, '') = '0000'; end if;
  return v_hash = zoralia_private.pin_hash(p_family, coalesce(p_pin, ''));
end $$;

create function zoralia.parent_pin_is_default(p_family uuid) returns boolean
language plpgsql stable security definer set search_path = zoralia as $$
begin
  perform zoralia_private.require_parent(p_family);
  return not exists (select 1 from zoralia.family_pins where family_id = p_family);
end $$;

revoke execute on all functions in schema zoralia from public, anon;
grant execute on all functions in schema zoralia to authenticated;
