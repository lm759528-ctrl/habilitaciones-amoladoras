-- Etapa 1: Row Level Security y permisos.
--
-- Regla general: sin login no se ve nada; con login pero sin perfil activo
-- tampoco. 'seguridad' solo lee; 'admin' puede todo (salvo borrar exámenes).
-- 'evaluador' está preparado en private.puede_cargar_examenes().

-- ---------------------------------------------------------------------------
-- Funciones de rol (security definer para poder leer profiles sin recursión)
-- ---------------------------------------------------------------------------

create function private.rol_actual()
returns public.rol_usuario
language sql
stable
security definer
set search_path = ''
as $$
  select p.rol
  from public.profiles p
  where p.id = auth.uid() and p.activo
$$;

create function private.es_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(private.rol_actual() = 'admin', false)
$$;

-- Cualquier usuario con perfil activo puede leer los datos de la app.
create function private.puede_leer()
returns boolean
language sql
stable
set search_path = ''
as $$
  select private.rol_actual() is not null
$$;

-- Quién puede cargar exámenes (y crear personas/empresas desde ese formulario).
-- Para habilitar el rol evaluador: array['admin', 'evaluador'].
create function private.puede_cargar_examenes()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(private.rol_actual() = any (array['admin']::public.rol_usuario[]), false)
$$;

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Grants (defensa en profundidad: Supabase da todo a anon por defecto)
-- ---------------------------------------------------------------------------

revoke all on
  public.profiles, public.empresas, public.personas, public.examenes,
  public.avisos_enviados, public.configuracion,
  public.examenes_estado, public.habilitaciones_actuales
from anon, authenticated;

grant select, update            on public.profiles        to authenticated;
grant select, insert, update    on public.empresas        to authenticated;
grant select, insert, update    on public.personas        to authenticated;
grant select, insert, update    on public.examenes        to authenticated;
grant select                    on public.avisos_enviados to authenticated;
grant select, update            on public.configuracion   to authenticated;
grant select on public.examenes_estado, public.habilitaciones_actuales to authenticated;

-- ---------------------------------------------------------------------------
-- RLS en todas las tablas
-- ---------------------------------------------------------------------------

alter table public.profiles        enable row level security;
alter table public.empresas        enable row level security;
alter table public.personas        enable row level security;
alter table public.examenes        enable row level security;
alter table public.avisos_enviados enable row level security;
alter table public.configuracion   enable row level security;

-- profiles: cada uno ve el suyo; el admin ve y edita todos. Nadie inserta ni
-- borra desde el cliente (los perfiles se crean con el usuario de Auth).
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select private.es_admin()));

create policy profiles_update_admin on public.profiles
  for update to authenticated
  using ((select private.es_admin()))
  with check ((select private.es_admin()));

-- empresas
create policy empresas_select on public.empresas
  for select to authenticated
  using ((select private.puede_leer()));

create policy empresas_insert on public.empresas
  for insert to authenticated
  with check ((select private.puede_cargar_examenes()));

create policy empresas_update_admin on public.empresas
  for update to authenticated
  using ((select private.es_admin()))
  with check ((select private.es_admin()));

-- personas
create policy personas_select on public.personas
  for select to authenticated
  using ((select private.puede_leer()));

create policy personas_insert on public.personas
  for insert to authenticated
  with check ((select private.puede_cargar_examenes()));

create policy personas_update_admin on public.personas
  for update to authenticated
  using ((select private.es_admin()))
  with check ((select private.es_admin()));

-- examenes: el que carga queda registrado como autor. Sin política de delete.
create policy examenes_select on public.examenes
  for select to authenticated
  using ((select private.puede_leer()));

create policy examenes_insert on public.examenes
  for insert to authenticated
  with check (
    (select private.puede_cargar_examenes())
    and created_by = (select auth.uid())
    and not anulado
  );

create policy examenes_update_admin on public.examenes
  for update to authenticated
  using ((select private.es_admin()))
  with check ((select private.es_admin()));

-- avisos_enviados: los escribe la Edge Function con service_role.
create policy avisos_enviados_select_admin on public.avisos_enviados
  for select to authenticated
  using ((select private.es_admin()));

-- configuracion
create policy configuracion_select on public.configuracion
  for select to authenticated
  using ((select private.puede_leer()));

create policy configuracion_update_admin on public.configuracion
  for update to authenticated
  using ((select private.es_admin()))
  with check ((select private.es_admin()));
