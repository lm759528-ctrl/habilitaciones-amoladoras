-- Etapa 1: esquema base (tipos, tablas, restricciones y triggers de negocio).
-- Las políticas RLS están en 20261118000300_rls.sql.

create schema if not exists private;
comment on schema private is 'Funciones internas (no expuestas por la API REST).';
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------

-- 'evaluador' queda preparado: hoy ninguna política le da permisos.
create type public.rol_usuario as enum ('admin', 'seguridad', 'evaluador');
create type public.resultado_examen as enum ('apto', 'no_apto');
create type public.tipo_habilitacion as enum ('anual', 'semestral', 'tarea_puntual');

-- ---------------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------------

-- Fecha de hoy en Argentina (no la del servidor, que corre en UTC).
create function private.hoy_ar()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/Argentina/Buenos_Aires')::date
$$;

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  nombre     text not null default '',
  email      text,
  rol        public.rol_usuario not null,
  activo     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'Perfil y rol de cada usuario de la app. El rol se lee solo de acá.';

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- Crea el perfil al crear el usuario en Auth, pero solo si el rol viene en
-- app_metadata (que solo puede escribir el service_role). Un usuario creado
-- por cualquier otra vía queda sin perfil y, por lo tanto, sin acceso.
create function private.crear_profile_desde_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rol text := new.raw_app_meta_data ->> 'rol';
begin
  if v_rol is null or v_rol not in ('admin', 'seguridad', 'evaluador') then
    return new;
  end if;

  insert into public.profiles (id, nombre, email, rol)
  values (
    new.id,
    coalesce(new.raw_app_meta_data ->> 'nombre', new.raw_user_meta_data ->> 'nombre', ''),
    new.email,
    v_rol::public.rol_usuario
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.crear_profile_desde_auth();

-- Nunca dejar la app sin un admin activo.
create function private.proteger_ultimo_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.rol = 'admin' and old.activo
     and (tg_op = 'DELETE' or new.rol <> 'admin' or not new.activo)
     and not exists (
       select 1 from public.profiles p
       where p.rol = 'admin' and p.activo and p.id <> old.id
     )
  then
    raise exception 'No se puede quitar el último administrador activo'
      using errcode = 'P0001';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger profiles_proteger_ultimo_admin
  before update or delete on public.profiles
  for each row execute function private.proteger_ultimo_admin();

-- ---------------------------------------------------------------------------
-- empresas
-- ---------------------------------------------------------------------------

create table public.empresas (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null check (btrim(nombre) <> ''),
  activo     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index empresas_nombre_unico on public.empresas (lower(btrim(nombre)));

create trigger empresas_updated_at
  before update on public.empresas
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- personas
-- ---------------------------------------------------------------------------

create table public.personas (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null check (btrim(nombre) <> ''),
  apellido   text not null check (btrim(apellido) <> ''),
  -- DNI argentino: 7 u 8 dígitos, sin puntos ni espacios.
  dni        text not null unique check (dni ~ '^[0-9]{7,8}$'),
  empresa_id uuid not null references public.empresas (id) on delete restrict,
  activo     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index personas_empresa_id on public.personas (empresa_id);

create trigger personas_updated_at
  before update on public.personas
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- examenes
-- ---------------------------------------------------------------------------

-- La checklist tiene que tener secciones con ítems, y cada ítem una
-- respuesta 'si', 'no' o 'na'. Los textos se guardan con el examen para que
-- el historial no dependa de cambios futuros en la configuración.
create function private.respuestas_validas(r jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
         jsonb_typeof(r) = 'object'
     and jsonb_typeof(r -> 'secciones') = 'array'
     and jsonb_array_length(r -> 'secciones') > 0
     and not jsonb_path_exists(r, '$.secciones[*] ? (!exists(@.items) || @.items.type() != "array")')
     and not jsonb_path_exists(
       r,
       '$.secciones[*].items[*] ? (!exists(@.respuesta) || !(@.respuesta == "si" || @.respuesta == "no" || @.respuesta == "na"))'
     ),
     false)  -- un check que da NULL pasaría: lo que no se puede evaluar es inválido
$$;

create table public.examenes (
  id                 uuid primary key default gen_random_uuid(),
  persona_id         uuid not null references public.personas (id) on delete restrict,
  -- Empresa del operario al momento del examen (puede cambiar después).
  empresa_id         uuid not null references public.empresas (id) on delete restrict,
  fecha_examen       date not null,
  controlo           text not null check (btrim(controlo) <> ''),
  resultado          public.resultado_examen not null,
  tipo_habilitacion  public.tipo_habilitacion not null,
  descripcion_tarea  text,
  fecha_inicio       date,
  fecha_vencimiento  date,
  respuestas         jsonb not null,
  observaciones      text,
  pdf_path           text,
  anulado            boolean not null default false,
  motivo_anulacion   text,
  anulado_at         timestamptz,
  anulado_by         uuid references auth.users (id),
  created_by         uuid references auth.users (id) default auth.uid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint examenes_tarea_puntual_con_descripcion check (
    tipo_habilitacion <> 'tarea_puntual' or btrim(coalesce(descripcion_tarea, '')) <> ''
  ),
  constraint examenes_apto_con_fechas check (
    resultado <> 'apto'
    or (fecha_inicio is not null and fecha_vencimiento is not null and fecha_vencimiento >= fecha_inicio)
  ),
  constraint examenes_no_apto_sin_habilitacion check (
    resultado <> 'no_apto' or (fecha_inicio is null and fecha_vencimiento is null)
  ),
  constraint examenes_anulado_con_motivo check (
    not anulado or btrim(coalesce(motivo_anulacion, '')) <> ''
  ),
  constraint examenes_respuestas_validas check (private.respuestas_validas(respuestas))
);
comment on table public.examenes is 'Exámenes prácticos. No se borran: se anulan con motivo.';

create index examenes_persona_reciente on public.examenes (persona_id, fecha_examen desc, created_at desc);
create index examenes_vencimiento on public.examenes (fecha_vencimiento) where not anulado and resultado = 'apto';

create trigger examenes_updated_at
  before update on public.examenes
  for each row execute function private.set_updated_at();

-- Vencimiento automático: anual = 12 meses, semestral = 6 meses desde el inicio.
-- Si el admin manda una fecha de vencimiento, se respeta.
create function private.calcular_vencimiento(p_tipo public.tipo_habilitacion, p_inicio date)
returns date
language sql
immutable
set search_path = ''
as $$
  select case p_tipo
    when 'anual'     then (p_inicio + interval '12 months')::date
    when 'semestral' then (p_inicio + interval '6 months')::date
    else null  -- tarea puntual: la fecha la pone el admin
  end
$$;

create function private.examenes_completar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.empresa_id is null then
    select p.empresa_id into new.empresa_id
    from public.personas p
    where p.id = new.persona_id;
  end if;

  if new.resultado = 'apto' then
    new.fecha_inicio := coalesce(new.fecha_inicio, new.fecha_examen);
    if new.fecha_vencimiento is null then
      if new.tipo_habilitacion = 'tarea_puntual' then
        raise exception 'Para una tarea puntual hay que indicar la fecha de fin'
          using errcode = '23514';
      end if;
      new.fecha_vencimiento := private.calcular_vencimiento(new.tipo_habilitacion, new.fecha_inicio);
    end if;
  end if;

  return new;
end;
$$;

create trigger examenes_completar
  before insert or update on public.examenes
  for each row execute function private.examenes_completar();

-- Reglas de edición: no se borra, la autoría no cambia y un examen anulado
-- queda congelado (no se puede "desanular" ni editar).
create function private.examenes_proteger()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Los exámenes no se borran: anulalo indicando el motivo'
      using errcode = 'P0001';
  end if;

  if old.anulado then
    raise exception 'El examen está anulado y no se puede modificar'
      using errcode = 'P0001';
  end if;

  if new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at then
    raise exception 'No se puede cambiar quién ni cuándo cargó el examen'
      using errcode = 'P0001';
  end if;

  if new.anulado then
    new.anulado_at := now();
    new.anulado_by := auth.uid();
  else
    new.anulado_at := null;
    new.anulado_by := null;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger examenes_proteger
  before update or delete on public.examenes
  for each row execute function private.examenes_proteger();

-- ---------------------------------------------------------------------------
-- avisos_enviados
-- ---------------------------------------------------------------------------

create table public.avisos_enviados (
  examen_id   uuid not null references public.examenes (id) on delete restrict,
  umbral_dias integer not null check (umbral_dias >= 0),
  enviado_at  timestamptz not null default now(),
  primary key (examen_id, umbral_dias)
);
comment on table public.avisos_enviados is 'Avisos de vencimiento ya enviados (los escribe la Edge Function).';

-- ---------------------------------------------------------------------------
-- configuracion (fila única)
-- ---------------------------------------------------------------------------

create table public.configuracion (
  id         boolean primary key default true check (id),
  -- Días antes del vencimiento en que se avisa. 0 = el día del vencimiento.
  dias_aviso integer[] not null default '{30,7,0}'
    check (cardinality(dias_aviso) > 0 and 0 <= all (dias_aviso) and array_position(dias_aviso, null) is null),
  updated_at timestamptz not null default now()
);
comment on table public.configuracion is 'Parámetros de la app editables por el admin (una sola fila).';

insert into public.configuracion (id) values (true);

create trigger configuracion_updated_at
  before update on public.configuracion
  for each row execute function private.set_updated_at();
