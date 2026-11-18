-- Imitación mínima de lo que Supabase trae de fábrica (roles, auth, storage),
-- solo para correr los tests de base en un Postgres común, sin Docker.
-- NO se aplica en Supabase: allá esto ya existe.

-- Los roles son de todo el cluster: se crean una sola vez.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end
$$;
grant anon, authenticated, service_role to current_user;

-- Supabase da todos los privilegios sobre public a estos roles por defecto.
grant usage on schema public to anon, authenticated, service_role;
grant usage on schema extensions to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

-- auth --------------------------------------------------------------------
create schema auth;
grant usage on schema auth to anon, authenticated, service_role;

create table auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text unique,
  raw_app_meta_data  jsonb default '{}'::jsonb,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at         timestamptz default now()
);

create function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
  )::uuid
$$;

create function auth.role() returns text language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'
  )
$$;

grant execute on all functions in schema auth to anon, authenticated, service_role;

-- storage -----------------------------------------------------------------
create schema storage;
grant usage on schema storage to anon, authenticated, service_role;

create table storage.buckets (
  id                 text primary key,
  name               text not null unique,
  public             boolean default false,
  file_size_limit    bigint,
  allowed_mime_types text[]
);

create table storage.objects (
  id         uuid primary key default gen_random_uuid(),
  bucket_id  text references storage.buckets (id),
  name       text,
  owner      uuid default auth.uid(),
  created_at timestamptz default now(),
  unique (bucket_id, name)
);
alter table storage.objects enable row level security;

grant all on storage.buckets, storage.objects to anon, authenticated, service_role;

-- pg_cron / pg_net / vault ------------------------------------------------
-- En un Postgres común no están: se imitan solo lo necesario para que las
-- migraciones apliquen y los tests puedan revisar el job programado.
create schema if not exists cron;
create table cron.job (jobname text primary key, schedule text, command text);
create function cron.schedule(p_nombre text, p_cron text, p_comando text) returns bigint
language sql as $$
  insert into cron.job values (p_nombre, p_cron, p_comando)
  on conflict (jobname) do update set schedule = excluded.schedule, command = excluded.command;
  select 1::bigint;
$$;

create schema if not exists net;
create table net.llamadas (id bigserial primary key, url text, headers jsonb, body jsonb);
create function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000)
returns bigint language sql as $$
  insert into net.llamadas (url, headers, body) values (url, headers, body) returning id;
$$;

create schema if not exists vault;
create table vault.decrypted_secrets (name text primary key, decrypted_secret text);
