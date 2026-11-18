-- Tests del aviso diario: job de pg_cron y función que llama a la Edge Function.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = habilitaciones, extensions;

select plan(6);

select is(
  (select schedule from cron.job where jobname = 'habilitaciones-avisos'),
  '0 11 * * *',
  'el aviso corre todos los días a las 11:00 UTC (8:00 en Argentina)');

select is(
  (select command from cron.job where jobname = 'habilitaciones-avisos'),
  'select habilitaciones_priv.disparar_avisos()',
  'el job llama a habilitaciones_priv.disparar_avisos()');

select ok(
  not has_function_privilege('authenticated', 'habilitaciones_priv.disparar_avisos()', 'execute'),
  'un usuario logueado no puede disparar los avisos');

-- Sin secretos en Vault no llama a nada.
select is(habilitaciones_priv.disparar_avisos(), null, 'sin secretos no hace la llamada');

insert into vault.decrypted_secrets (name, decrypted_secret) values
  ('habilitaciones_avisos_url', 'https://ref.supabase.co/functions/v1/avisos-vencimiento'),
  ('habilitaciones_cron_secret', 's3cr3t');

select isnt(habilitaciones_priv.disparar_avisos(), null, 'con secretos hace la llamada');
select results_eq(
  $$select url, headers ->> 'x-cron-secret' from net.llamadas$$,
  $$values ('https://ref.supabase.co/functions/v1/avisos-vencimiento'::text, 's3cr3t'::text)$$,
  'llama a la URL guardada con el secreto en la cabecera');

select * from finish();
rollback;
