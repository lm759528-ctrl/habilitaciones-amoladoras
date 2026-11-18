-- Tests de reglas de negocio: vencimientos, estados, anulación y validaciones.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = habilitaciones, extensions;

select plan(41);

insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@test.local', '{"habilitaciones_rol":"admin"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'admin2@test.local', '{"habilitaciones_rol":"admin"}');

insert into empresas (id, nombre) values
  ('00000000-0000-0000-0000-0000000000e1', 'Contratista Uno'),
  ('00000000-0000-0000-0000-0000000000e2', 'Contratista Dos');

insert into personas (id, nombre, apellido, dni, empresa_id) values
  ('00000000-0000-0000-0000-000000000001', 'Vigente',   'A', '10000001', '00000000-0000-0000-0000-0000000000e1'),
  ('00000000-0000-0000-0000-000000000002', 'PorVencer', 'B', '10000002', '00000000-0000-0000-0000-0000000000e1'),
  ('00000000-0000-0000-0000-000000000003', 'Vencido',   'C', '10000003', '00000000-0000-0000-0000-0000000000e1'),
  ('00000000-0000-0000-0000-000000000004', 'NoApto',    'D', '10000004', '00000000-0000-0000-0000-0000000000e1'),
  ('00000000-0000-0000-0000-000000000005', 'Renovado',  'E', '10000005', '00000000-0000-0000-0000-0000000000e1'),
  ('00000000-0000-0000-0000-000000000006', 'Anulado',   'F', '10000006', '00000000-0000-0000-0000-0000000000e1'),
  ('00000000-0000-0000-0000-000000000007', 'AptoLuegoNoApto',  'G', '10000007', '00000000-0000-0000-0000-0000000000e1'),
  ('00000000-0000-0000-0000-000000000008', 'AnualMasTarea',    'H', '10000008', '00000000-0000-0000-0000-0000000000e1'),
  ('00000000-0000-0000-0000-000000000009', 'SoloTareaVigente', 'I', '10000009', '00000000-0000-0000-0000-0000000000e1'),
  ('00000000-0000-0000-0000-000000000010', 'VencidoLuegoNoApto', 'J', '10000010', '00000000-0000-0000-0000-0000000000e1');

-- Respuestas válidas mínimas, para no repetir.
create temp table r as select
  '{"version":1,"secciones":[{"titulo":"S","items":[{"id":"a","texto":"A","respuesta":"si","comentario":""}]}]}'::jsonb as ok;

-- ---------------------------------------------------------------------------
-- Cálculo de vencimiento
-- ---------------------------------------------------------------------------
insert into examenes (id, persona_id, fecha_examen, controlo, resultado, tipo_habilitacion, respuestas)
select '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-000000000001', '2026-03-10', 'X', 'apto', 'anual', ok from r;
select is((select fecha_inicio from examenes where id = '00000000-0000-0000-0000-0000000000f1'), '2026-03-10'::date, 'fecha_inicio = fecha_examen por defecto');
select is((select fecha_vencimiento from examenes where id = '00000000-0000-0000-0000-0000000000f1'), '2027-03-10'::date, 'anual vence a los 12 meses');
select is((select empresa_id from examenes where id = '00000000-0000-0000-0000-0000000000f1'),
  '00000000-0000-0000-0000-0000000000e1'::uuid, 'el examen guarda la empresa de la persona');

insert into examenes (id, persona_id, fecha_examen, fecha_inicio, controlo, resultado, tipo_habilitacion, respuestas)
select '00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-000000000001', '2026-08-31', '2026-08-31', 'X', 'apto', 'semestral', ok from r;
select is((select fecha_vencimiento from examenes where id = '00000000-0000-0000-0000-0000000000f2'), '2027-02-28'::date, 'semestral vence a los 6 meses (fin de mes)');

insert into examenes (id, persona_id, fecha_examen, controlo, resultado, tipo_habilitacion, fecha_vencimiento, respuestas)
select '00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-000000000001', '2026-03-10', 'X', 'apto', 'anual', '2026-12-31', ok from r;
select is((select fecha_vencimiento from examenes where id = '00000000-0000-0000-0000-0000000000f3'), '2026-12-31'::date, 'se respeta el vencimiento editado por el admin');

insert into examenes (id, persona_id, fecha_examen, controlo, resultado, tipo_habilitacion, descripcion_tarea, fecha_vencimiento, respuestas)
select '00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-000000000001', '2026-03-10', 'X', 'apto', 'tarea_puntual', 'Corte de caño', '2026-03-10', ok from r;
select is((select fecha_vencimiento from examenes where id = '00000000-0000-0000-0000-0000000000f4'), '2026-03-10'::date, 'tarea puntual puede vencer el mismo día');

select throws_ok($$insert into examenes (persona_id, fecha_examen, controlo, resultado, tipo_habilitacion, descripcion_tarea, respuestas)
  select '00000000-0000-0000-0000-000000000001', '2026-03-10', 'X', 'apto', 'tarea_puntual', 'Corte', ok from r$$,
  '23514', null, 'tarea puntual sin fecha de fin da error');
select throws_ok($$insert into examenes (persona_id, fecha_examen, controlo, resultado, tipo_habilitacion, fecha_vencimiento, respuestas)
  select '00000000-0000-0000-0000-000000000001', '2026-03-10', 'X', 'apto', 'tarea_puntual', '2026-03-11', ok from r$$,
  '23514', null, 'tarea puntual sin descripción da error');
select throws_ok($$insert into examenes (persona_id, fecha_examen, controlo, resultado, tipo_habilitacion, fecha_vencimiento, respuestas)
  select '00000000-0000-0000-0000-000000000001', '2026-03-10', 'X', 'apto', 'anual', '2026-03-01', ok from r$$,
  '23514', null, 'el vencimiento no puede ser anterior al inicio');
select throws_ok($$insert into examenes (persona_id, fecha_examen, controlo, resultado, tipo_habilitacion, fecha_vencimiento, respuestas)
  select '00000000-0000-0000-0000-000000000001', '2026-03-10', 'X', 'no_apto', 'anual', '2027-03-10', ok from r$$,
  '23514', null, 'un "No apto" no genera habilitación');

select is(habilitaciones_priv.calcular_vencimiento('anual', '2028-02-29'), '2029-02-28'::date, 'anual desde 29/02 vence el 28/02');

-- ---------------------------------------------------------------------------
-- Validaciones
-- ---------------------------------------------------------------------------
select throws_ok($$insert into examenes (persona_id, fecha_examen, controlo, resultado, tipo_habilitacion, respuestas)
  values ('00000000-0000-0000-0000-000000000001', '2026-03-10', 'X', 'no_apto', 'anual',
  '{"secciones":[{"titulo":"S","items":[{"id":"a","texto":"A","respuesta":"tal vez"}]}]}')$$,
  '23514', null, 'respuesta distinta de si/no/na da error');
select throws_ok($$insert into examenes (persona_id, fecha_examen, controlo, resultado, tipo_habilitacion, respuestas)
  values ('00000000-0000-0000-0000-000000000001', '2026-03-10', 'X', 'no_apto', 'anual',
  '{"secciones":[{"titulo":"S","items":[{"id":"a","texto":"A"}]}]}')$$,
  '23514', null, 'ítem sin responder da error');
select throws_ok($$insert into examenes (persona_id, fecha_examen, controlo, resultado, tipo_habilitacion, respuestas)
  values ('00000000-0000-0000-0000-000000000001', '2026-03-10', 'X', 'no_apto', 'anual', '{}')$$,
  '23514', null, 'checklist sin secciones da error');
select throws_ok($$insert into personas (nombre, apellido, dni, empresa_id) values ('A','B','30.111.222','00000000-0000-0000-0000-0000000000e1')$$,
  '23514', null, 'DNI con puntos da error');
select throws_ok($$insert into personas (nombre, apellido, dni, empresa_id) values ('A','B','10000001','00000000-0000-0000-0000-0000000000e1')$$,
  '23505', null, 'DNI repetido da error');
select throws_ok($$insert into empresas (nombre) values ('  contratista uno ')$$,
  '23505', null, 'empresa repetida (sin importar mayúsculas) da error');

-- ---------------------------------------------------------------------------
-- Estados
-- ---------------------------------------------------------------------------
insert into examenes (persona_id, fecha_examen, fecha_inicio, fecha_vencimiento, controlo, resultado, tipo_habilitacion, respuestas)
select '00000000-0000-0000-0000-000000000002'::uuid, habilitaciones_priv.hoy_ar() - 300, habilitaciones_priv.hoy_ar() - 300, habilitaciones_priv.hoy_ar() + 30, 'X', 'apto'::resultado_examen, 'anual'::tipo_habilitacion, ok from r
union all
select '00000000-0000-0000-0000-000000000003', habilitaciones_priv.hoy_ar() - 400, habilitaciones_priv.hoy_ar() - 400, habilitaciones_priv.hoy_ar() - 1, 'X', 'apto', 'anual', ok from r;

insert into examenes (persona_id, fecha_examen, controlo, resultado, tipo_habilitacion, respuestas)
select '00000000-0000-0000-0000-000000000004', habilitaciones_priv.hoy_ar(), 'X', 'no_apto', 'anual', ok from r;

-- Renovado: un apto viejo y uno nuevo.
insert into examenes (id, persona_id, fecha_examen, controlo, resultado, tipo_habilitacion, respuestas)
select '00000000-0000-0000-0000-0000000000d1'::uuid, '00000000-0000-0000-0000-000000000005'::uuid, habilitaciones_priv.hoy_ar() - 200, 'X', 'apto'::resultado_examen, 'anual'::tipo_habilitacion, ok from r
union all
select '00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-000000000005', habilitaciones_priv.hoy_ar() - 5, 'X', 'apto', 'anual', ok from r;

-- Anulado: un apto viejo vigente y uno nuevo que se anula.
insert into examenes (id, persona_id, fecha_examen, controlo, resultado, tipo_habilitacion, respuestas)
select '00000000-0000-0000-0000-0000000000a5'::uuid, '00000000-0000-0000-0000-000000000006'::uuid, habilitaciones_priv.hoy_ar() - 100, 'X', 'apto'::resultado_examen, 'anual'::tipo_habilitacion, ok from r
union all
select '00000000-0000-0000-0000-0000000000a6', '00000000-0000-0000-0000-000000000006', habilitaciones_priv.hoy_ar() - 1, 'X', 'apto', 'anual', ok from r;

-- Persona 1: el examen más reciente (2026-08-31, semestral) define su estado.
-- Se mueven a fechas relativas a hoy para que el test no dependa del día.
update examenes set fecha_examen = habilitaciones_priv.hoy_ar() - 10, fecha_inicio = habilitaciones_priv.hoy_ar() - 10, fecha_vencimiento = habilitaciones_priv.hoy_ar() + 170
where id = '00000000-0000-0000-0000-0000000000f2';

select is((select estado from habilitaciones_actuales where persona_id = '00000000-0000-0000-0000-000000000001'), 'vigente', 'estado vigente');
select is((select dias_restantes from habilitaciones_actuales where persona_id = '00000000-0000-0000-0000-000000000001'), 170, 'días restantes');
select is((select estado from habilitaciones_actuales where persona_id = '00000000-0000-0000-0000-000000000002'), 'por_vencer', 'a 30 días: por vencer');
select is((select estado from habilitaciones_actuales where persona_id = '00000000-0000-0000-0000-000000000003'), 'vencido', 'vencido ayer');
select is((select estado from habilitaciones_actuales where persona_id = '00000000-0000-0000-0000-000000000004'), 'no_apto', 'no apto');
select is((select dias_restantes from habilitaciones_actuales where persona_id = '00000000-0000-0000-0000-000000000004'), null, 'no apto no tiene días restantes');
select is((select examen_id from habilitaciones_actuales where persona_id = '00000000-0000-0000-0000-000000000005'),
  '00000000-0000-0000-0000-0000000000d2'::uuid, 'el listado muestra el examen más nuevo');
select is((select estado from examenes_estado where id = '00000000-0000-0000-0000-0000000000d1'), 'renovado', 'el examen viejo figura como renovado');
-- Un examen nuevo no inhabilita una habilitación vigente.
insert into examenes (id, persona_id, fecha_examen, controlo, resultado, tipo_habilitacion, descripcion_tarea, fecha_vencimiento, respuestas)
select '00000000-0000-0000-0000-000000000e71'::uuid, '00000000-0000-0000-0000-000000000007'::uuid, habilitaciones_priv.hoy_ar() - 30, 'X', 'apto'::resultado_examen, 'anual'::tipo_habilitacion, null, null::date, ok from r
union all
select '00000000-0000-0000-0000-000000000e72', '00000000-0000-0000-0000-000000000007', habilitaciones_priv.hoy_ar() - 1, 'X', 'no_apto', 'anual', null, null, ok from r
union all
select '00000000-0000-0000-0000-000000000e81', '00000000-0000-0000-0000-000000000008', habilitaciones_priv.hoy_ar() - 60, 'X', 'apto', 'anual', null, null, ok from r
union all
select '00000000-0000-0000-0000-000000000e82', '00000000-0000-0000-0000-000000000008', habilitaciones_priv.hoy_ar() - 2, 'X', 'apto', 'tarea_puntual', 'Corte de reja', habilitaciones_priv.hoy_ar() + 1, ok from r
union all
select '00000000-0000-0000-0000-000000000e91', '00000000-0000-0000-0000-000000000009', habilitaciones_priv.hoy_ar() - 400, 'X', 'apto', 'anual', null, null, ok from r
union all
select '00000000-0000-0000-0000-000000000e92', '00000000-0000-0000-0000-000000000009', habilitaciones_priv.hoy_ar() - 3, 'X', 'apto', 'tarea_puntual', 'Corte de reja', habilitaciones_priv.hoy_ar() + 2, ok from r
union all
select '00000000-0000-0000-0000-000000000ea1', '00000000-0000-0000-0000-000000000010', habilitaciones_priv.hoy_ar() - 400, 'X', 'apto', 'anual', null, null, ok from r
union all
select '00000000-0000-0000-0000-000000000ea2', '00000000-0000-0000-0000-000000000010', habilitaciones_priv.hoy_ar() - 1, 'X', 'no_apto', 'anual', null, null, ok from r;

select is((select examen_id from habilitaciones_actuales where persona_id = '00000000-0000-0000-0000-000000000007'),
  '00000000-0000-0000-0000-000000000e71'::uuid, 'un No apto nuevo no tapa una habilitación vigente');
select is((select estado from habilitaciones_actuales where persona_id = '00000000-0000-0000-0000-000000000007'), 'vigente', '... y la persona sigue vigente');
select is((select examen_id from habilitaciones_actuales where persona_id = '00000000-0000-0000-0000-000000000008'),
  '00000000-0000-0000-0000-000000000e81'::uuid, 'con anual y tarea puntual vigentes, el listado muestra la anual');
select is((select estado from examenes_estado where id = '00000000-0000-0000-0000-000000000e81'), 'vigente', 'una tarea puntual no renueva (ni inhabilita) la anual');
select is((select examen_id from habilitaciones_actuales where persona_id = '00000000-0000-0000-0000-000000000009'),
  '00000000-0000-0000-0000-000000000e92'::uuid, 'si solo la tarea puntual está en fecha, se muestra esa');
select is((select estado from habilitaciones_actuales where persona_id = '00000000-0000-0000-0000-000000000010'), 'no_apto',
  'sin habilitación en fecha, se muestra el último examen');

select is((select count(*)::int from habilitaciones_actuales), 10, 'una fila por persona');

update configuracion set dias_aviso = '{7,0}';
select is((select estado from habilitaciones_actuales where persona_id = '00000000-0000-0000-0000-000000000002'), 'vigente', 'por_vencer usa el umbral configurado');
update configuracion set dias_aviso = '{30,7,0}';

-- ---------------------------------------------------------------------------
-- Anulación
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

select throws_ok($$update examenes set anulado = true where id = '00000000-0000-0000-0000-0000000000a6'$$,
  '23514', null, 'anular sin motivo da error');
select lives_ok($$update examenes set anulado = true, motivo_anulacion = 'Carga duplicada' where id = '00000000-0000-0000-0000-0000000000a6'$$,
  'anular con motivo');
select is((select anulado_by from examenes where id = '00000000-0000-0000-0000-0000000000a6'),
  '00000000-0000-0000-0000-0000000000a1'::uuid, 'queda registrado quién anuló');
select is((select examen_id from habilitaciones_actuales where persona_id = '00000000-0000-0000-0000-000000000006'),
  '00000000-0000-0000-0000-0000000000a5'::uuid, 'el listado ignora el examen anulado');
select throws_ok($$update examenes set anulado = false where id = '00000000-0000-0000-0000-0000000000a6'$$,
  'P0001', null, 'un examen anulado no se puede desanular ni editar');
select throws_ok($$update examenes set created_by = '00000000-0000-0000-0000-0000000000a2' where id = '00000000-0000-0000-0000-0000000000a5'$$,
  'P0001', null, 'no se puede cambiar el autor');
reset role;

-- Ni siquiera el dueño de las tablas (o el service_role) borra exámenes.
select throws_ok($$delete from examenes where id = '00000000-0000-0000-0000-0000000000a5'$$,
  'P0001', null, 'los exámenes no se borran');

-- ---------------------------------------------------------------------------
-- Último admin
-- ---------------------------------------------------------------------------
update profiles set activo = false where id = '00000000-0000-0000-0000-0000000000a2';
select throws_ok($$update profiles set rol = 'seguridad' where id = '00000000-0000-0000-0000-0000000000a1'$$,
  'P0001', null, 'no se puede degradar al último admin activo');

select * from finish();
rollback;
