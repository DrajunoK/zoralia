-- Simule le minimum de Supabase pour exécuter les migrations hors plateforme (tests locaux uniquement).
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated;
grant usage on schema public to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;

-- Objets « Popote » déjà présents dans le même projet : la migration Zoralia ne doit pas les toucher.
create table public.profiles (id uuid primary key references auth.users on delete cascade, name text not null default '', email text);
create function public.on_user() returns trigger language plpgsql as $$ begin insert into public.profiles (id, name, email) values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), new.email); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.on_user();
create function public.is_member(gid text) returns boolean language sql stable as $$ select true $$;
grant select on public.profiles to authenticated;
grant execute on function public.is_member(text) to authenticated;
