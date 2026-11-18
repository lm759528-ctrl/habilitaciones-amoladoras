-- Etapa 1: Row Level Security y permisos.
--
-- Regla general: sin login no se ve nada; con login pero sin perfil activo
-- tampoco. 'seguridad' solo lee; 'admin' puede todo (salvo borrar exámenes).
-- 'evaluador' está preparado en habilitaciones_priv.puede_cargar_examenes().

-- ---------------------------------------------------------------------------
-- Funciones de rol (security definer para poder leer profiles sin recursión)
-- ---------------------------------------------------------------------------

create function habilitaciones_priv.rol_actual()
returns habilitaciones.rol_usuario
language sql
stable
security definer
set search_path = ''
as $$
  select p.rol
  from habilitaciones.profiles p
  where p.id = auth.uid() and p.activo
$$;

create function habilitaciones_priv.es_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(habilitaciones_priv.rol_actual() = 'admin', false)
$$;

-- Cualquier usuario con perfil activo puede leer los datos de la app.
create function habilitaciones_priv.puede_leer()
returns boolean
language sql
stable
set search_path = ''
as $$
  select habilitaciones_priv.rol_actual() is not null
$$;

-- Quién puede cargar exámenes (y crear personas/empresas desde ese formulario).
-- Para habilitar el rol evaluador: array['admin', 'evaluador'].
create function habilitaciones_priv.puede_cargar_examenes()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(habilitaciones_priv.rol_actual() = any (array['admin']::habilitaciones.rol_usuario[]), false)
$$;

revoke all on all functions in schema habilitaciones_priv from public, anon;
grant execute on all functions in schema habilitaciones_priv to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Grants (defensa en profundidad: Supabase da todo a anon por defecto)
-- ---------------------------------------------------------------------------

revoke all on
  habilitaciones.profiles, habilitaciones.empresas, habilitaciones.personas, habilitaciones.examenes,
  habilitaciones.avisos_enviados, habilitaciones.configuracion,
  habilitaciones.examenes_estado, habilitaciones.habilitaciones_actuales
from anon, authenticated;

grant select, update            on habilitaciones.profiles        to authenticated;
grant select, insert, update    on habilitaciones.empresas        to authenticated;
grant select, insert, update    on habilitaciones.personas        to authenticated;
grant select, insert, update    on habilitaciones.examenes        to authenticated;
grant select                    on habilitaciones.avisos_enviados to authenticated;
grant select, update            on habilitaciones.configuracion   to authenticated;
grant select on habilitaciones.examenes_estado, habilitaciones.habilitaciones_actuales to authenticated;

-- service_role (Edge Functions y scripts de admin): en un esquema propio no hereda
-- los permisos por defecto que Supabase da sobre public.
grant all on all tables in schema habilitaciones to service_role;

-- ---------------------------------------------------------------------------
-- RLS en todas las tablas
-- ---------------------------------------------------------------------------

alter table habilitaciones.profiles        enable row level security;
alter table habilitaciones.empresas        enable row level security;
alter table habilitaciones.personas        enable row level security;
alter table habilitaciones.examenes        enable row level security;
alter table habilitaciones.avisos_enviados enable row level security;
alter table habilitaciones.configuracion   enable row level security;

-- profiles: cada uno ve el suyo; el admin ve y edita todos. Nadie inserta ni
-- borra desde el cliente (los perfiles se crean con el usuario de Auth).
create policy profiles_select on habilitaciones.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select habilitaciones_priv.es_admin()));

create policy profiles_update_admin on habilitaciones.profiles
  for update to authenticated
  using ((select habilitaciones_priv.es_admin()))
  with check ((select habilitaciones_priv.es_admin()));

-- empresas
create policy empresas_select on habilitaciones.empresas
  for select to authenticated
  using ((select habilitaciones_priv.puede_leer()));

create policy empresas_insert on habilitaciones.empresas
  for insert to authenticated
  with check ((select habilitaciones_priv.puede_cargar_examenes()));

create policy empresas_update_admin on habilitaciones.empresas
  for update to authenticated
  using ((select habilitaciones_priv.es_admin()))
  with check ((select habilitaciones_priv.es_admin()));

-- personas
create policy personas_select on habilitaciones.personas
  for select to authenticated
  using ((select habilitaciones_priv.puede_leer()));

create policy personas_insert on habilitaciones.personas
  for insert to authenticated
  with check ((select habilitaciones_priv.puede_cargar_examenes()));

create policy personas_update_admin on habilitaciones.personas
  for update to authenticated
  using ((select habilitaciones_priv.es_admin()))
  with check ((select habilitaciones_priv.es_admin()));

-- examenes: el que carga queda registrado como autor. Sin política de delete.
create policy examenes_select on habilitaciones.examenes
  for select to authenticated
  using ((select habilitaciones_priv.puede_leer()));

create policy examenes_insert on habilitaciones.examenes
  for insert to authenticated
  with check (
    (select habilitaciones_priv.puede_cargar_examenes())
    and created_by = (select auth.uid())
    and not anulado
  );

create policy examenes_update_admin on habilitaciones.examenes
  for update to authenticated
  using ((select habilitaciones_priv.es_admin()))
  with check ((select habilitaciones_priv.es_admin()));

-- avisos_enviados: los escribe la Edge Function con service_role.
create policy avisos_enviados_select_admin on habilitaciones.avisos_enviados
  for select to authenticated
  using ((select habilitaciones_priv.es_admin()));

-- configuracion
create policy configuracion_select on habilitaciones.configuracion
  for select to authenticated
  using ((select habilitaciones_priv.puede_leer()));

create policy configuracion_update_admin on habilitaciones.configuracion
  for update to authenticated
  using ((select habilitaciones_priv.es_admin()))
  with check ((select habilitaciones_priv.es_admin()));
