begin;
create extension if not exists pgtap with schema extensions;
set search_path = habilitaciones, extensions;
select plan(7);

insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@test.local', '{"habilitaciones_rol":"admin"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'seguridad@test.local', '{"habilitaciones_rol":"seguridad"}'),
  ('00000000-0000-0000-0000-0000000000a3', 'Nuevo@Test.local', '{}');

-- Seguridad no puede dar acceso
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select throws_ok($$select dar_acceso('nuevo@test.local', 'Nuevo', 'admin')$$, '42501', null, 'seguridad no da acceso');
reset role;

-- Admin
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select throws_ok($$select dar_acceso('nadie@test.local', 'Nadie', 'seguridad')$$, 'P0001', null, 'mail inexistente da error claro');
select throws_ok($$select dar_acceso('nuevo@test.local', 'Nuevo', 'evaluador')$$, 'P0001', null, 'evaluador no se asigna todavía');
select is(dar_acceso(' NUEVO@test.local ', 'Pedro Nuevo', 'seguridad'), '00000000-0000-0000-0000-0000000000a3'::uuid, 'busca el mail sin importar mayúsculas');
select is((select rol::text || ' ' || nombre from profiles where id = '00000000-0000-0000-0000-0000000000a3'), 'seguridad Pedro Nuevo', 'crea el perfil con rol y nombre');
select lives_ok($$select dar_acceso('nuevo@test.local', 'Pedro Nuevo', 'admin')$$, 'se puede cambiar el rol volviendo a dar acceso');
reset role;

set local role anon;
select throws_ok($$select habilitaciones.dar_acceso('nuevo@test.local', 'X', 'admin')$$, '42501', null, 'anon no puede');
reset role;

select * from finish();
rollback;
