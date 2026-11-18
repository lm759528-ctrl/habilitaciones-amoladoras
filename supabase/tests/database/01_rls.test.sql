-- Tests de permisos: RLS, grants y bucket privado.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = habilitaciones, extensions;

select plan(45);

-- ---------------------------------------------------------------------------
-- Datos de prueba (como postgres, dueño de las tablas)
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@test.local',     '{"habilitaciones_rol":"admin","habilitaciones_nombre":"Ana Admin"}', '{}'),
  ('00000000-0000-0000-0000-0000000000a2', 'seguridad@test.local', '{"habilitaciones_rol":"seguridad"}', '{}'),
  -- Usuario sin rol en app_metadata (p. ej. un registro público por error),
  -- que además intenta darse admin por user_metadata. Tiene un "rol" de otra app
  -- del mismo proyecto de Supabase, que acá no cuenta.
  ('00000000-0000-0000-0000-0000000000a3', 'intruso@test.local',   '{"rol":"admin"}', '{"habilitaciones_rol":"admin"}');

insert into empresas (id, nombre) values ('00000000-0000-0000-0000-0000000000e1', 'Contratista Uno');
insert into personas (id, nombre, apellido, dni, empresa_id) values
  ('00000000-0000-0000-0000-0000000000b1', 'Juan', 'Pérez', '30111222', '00000000-0000-0000-0000-0000000000e1');
insert into examenes (id, persona_id, fecha_examen, controlo, resultado, tipo_habilitacion, respuestas) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', habilitaciones_priv.hoy_ar(), 'Evaluador', 'apto', 'anual',
   '{"version":1,"secciones":[{"titulo":"S","items":[{"id":"a","texto":"A","respuesta":"si","comentario":""}]}]}');
insert into avisos_enviados (examen_id, umbral_dias) values ('00000000-0000-0000-0000-0000000000c1', 30);
insert into storage.objects (bucket_id, name) values ('habilitaciones-examenes', 'b1/c1.pdf');

-- ---------------------------------------------------------------------------
-- Estructura
-- ---------------------------------------------------------------------------
select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'habilitaciones' and c.relkind = 'r' and not c.relrowsecurity),
  0, 'RLS está activado en todas las tablas de habilitaciones');

select ok(
  (select bool_and(coalesce(c.reloptions @> array['security_invoker=true'], false))
   from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'habilitaciones' and c.relkind = 'v'),
  'todas las vistas de habilitaciones usan security_invoker');

select is((select public from storage.buckets where id = 'habilitaciones-examenes'), false, 'el bucket de PDFs es privado');
select is((select allowed_mime_types from storage.buckets where id = 'habilitaciones-examenes'), array['application/pdf'], 'el bucket solo acepta PDFs');

-- ---------------------------------------------------------------------------
-- Creación de perfiles
-- ---------------------------------------------------------------------------
select is((select rol::text from profiles where id = '00000000-0000-0000-0000-0000000000a1'), 'admin', 'rol en app_metadata crea el perfil admin');
select is((select nombre from profiles where id = '00000000-0000-0000-0000-0000000000a1'), 'Ana Admin', 'el perfil toma el nombre');
select is((select email from profiles where id = '00000000-0000-0000-0000-0000000000a2'), 'seguridad@test.local', 'el perfil guarda el email');
select is((select count(*)::int from profiles where id = '00000000-0000-0000-0000-0000000000a3'), 0, 'sin rol en app_metadata no se crea perfil (user_metadata no cuenta)');

-- ---------------------------------------------------------------------------
-- Sin login (anon)
-- ---------------------------------------------------------------------------
set local role anon;
select throws_ok('select * from habilitaciones.personas', '42501', null, 'anon no puede leer personas');
select throws_ok('select * from habilitaciones.examenes', '42501', null, 'anon no puede leer exámenes');
select throws_ok('select * from habilitaciones.habilitaciones_actuales', '42501', null, 'anon no puede leer el listado');
select throws_ok('select * from habilitaciones.profiles', '42501', null, 'anon no puede leer perfiles');
select is((select count(*)::int from storage.objects), 0, 'anon no ve PDFs');
reset role;

-- ---------------------------------------------------------------------------
-- Logueado pero sin perfil
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select is((select count(*)::int from personas), 0, 'sin perfil no ve personas');
select is((select count(*)::int from examenes), 0, 'sin perfil no ve exámenes');
select is((select count(*)::int from habilitaciones_actuales), 0, 'sin perfil no ve el listado (la vista respeta RLS)');
select is((select count(*)::int from examenes_estado), 0, 'sin perfil no ve el historial');
select is((select count(*)::int from storage.objects), 0, 'sin perfil no ve PDFs');
select throws_ok($$insert into empresas (nombre) values ('X')$$, '42501', null, 'sin perfil no crea empresas');
reset role;

-- ---------------------------------------------------------------------------
-- Seguridad (solo lectura)
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select is((select count(*)::int from personas), 1, 'seguridad ve personas');
select is((select count(*)::int from examenes), 1, 'seguridad ve exámenes');
select is((select count(*)::int from habilitaciones_actuales), 1, 'seguridad ve el listado');
select is((select count(*)::int from storage.objects where bucket_id = 'habilitaciones-examenes'), 1, 'seguridad puede leer PDFs (URL firmada)');
select is((select count(*)::int from profiles), 1, 'seguridad solo ve su propio perfil');
select is((select count(*)::int from avisos_enviados), 0, 'seguridad no ve avisos enviados');
select throws_ok($$insert into empresas (nombre) values ('X')$$, '42501', null, 'seguridad no crea empresas');
select throws_ok($$insert into personas (nombre, apellido, dni, empresa_id) values ('A','B','20111222','00000000-0000-0000-0000-0000000000e1')$$,
  '42501', null, 'seguridad no crea personas');
select throws_ok($$insert into examenes (persona_id, fecha_examen, controlo, resultado, tipo_habilitacion, respuestas, created_by)
  values ('00000000-0000-0000-0000-0000000000b1', current_date, 'X', 'no_apto', 'anual',
  '{"secciones":[{"titulo":"S","items":[]}]}', '00000000-0000-0000-0000-0000000000a2')$$,
  '42501', null, 'seguridad no carga exámenes');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('habilitaciones-examenes', 'x.pdf')$$, '42501', null, 'seguridad no sube PDFs');
select is_empty($$update personas set nombre = 'Hack' returning id$$, 'seguridad no edita personas');
select is_empty($$update examenes set anulado = true, motivo_anulacion = 'x' returning id$$, 'seguridad no anula exámenes');
select is_empty($$update profiles set rol = 'admin' returning id$$, 'seguridad no puede darse rol admin');
select is_empty($$update configuracion set dias_aviso = '{1}' returning id$$, 'seguridad no cambia la configuración');
select throws_ok('delete from examenes', '42501', null, 'seguridad no borra exámenes');
reset role;

select is((select rol::text from profiles where id = '00000000-0000-0000-0000-0000000000a2'), 'seguridad', 'el rol de seguridad no cambió');

-- ---------------------------------------------------------------------------
-- Admin
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select lives_ok($$insert into empresas (id, nombre) values ('00000000-0000-0000-0000-0000000000e2', 'Contratista Dos')$$, 'admin crea empresas');
select lives_ok($$insert into personas (id, nombre, apellido, dni, empresa_id)
  values ('00000000-0000-0000-0000-0000000000b2', 'María', 'Gómez', '28999888', '00000000-0000-0000-0000-0000000000e2')$$, 'admin crea personas');
select lives_ok($$insert into examenes (id, persona_id, fecha_examen, controlo, resultado, tipo_habilitacion, respuestas)
  values ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b2', current_date, 'Evaluador', 'no_apto', 'anual',
  '{"secciones":[{"titulo":"S","items":[{"id":"a","texto":"A","respuesta":"no"}]}]}')$$, 'admin carga exámenes');
select is((select created_by from examenes where id = '00000000-0000-0000-0000-0000000000c2'),
  '00000000-0000-0000-0000-0000000000a1'::uuid, 'el examen queda con el admin como autor');
select throws_ok($$insert into examenes (persona_id, fecha_examen, controlo, resultado, tipo_habilitacion, respuestas, created_by)
  values ('00000000-0000-0000-0000-0000000000b2', current_date, 'X', 'no_apto', 'anual',
  '{"secciones":[{"titulo":"S","items":[]}]}', '00000000-0000-0000-0000-0000000000a2')$$,
  '42501', null, 'no se puede cargar un examen a nombre de otro usuario');
select lives_ok($$insert into storage.objects (bucket_id, name) values ('habilitaciones-examenes', 'b2/c2.pdf')$$, 'admin sube PDFs');
select isnt_empty($$update examenes set observaciones = 'ok' where id = '00000000-0000-0000-0000-0000000000c2' returning id$$, 'admin edita exámenes');
select is((select count(*)::int from profiles), 2, 'admin ve todos los perfiles');
select is((select count(*)::int from avisos_enviados), 1, 'admin ve avisos enviados');
select throws_ok('delete from examenes', '42501', null, 'admin tampoco borra exámenes');
reset role;

select * from finish();
rollback;
