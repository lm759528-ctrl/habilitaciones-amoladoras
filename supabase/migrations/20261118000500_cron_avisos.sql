-- Etapa 5: aviso diario de vencimientos.
-- pg_cron llama todos los días a las 8:00 de Argentina (11:00 UTC; Argentina
-- no tiene horario de verano) a la Edge Function avisos-vencimiento, por HTTP
-- con pg_net. La URL y el secreto se guardan en Supabase Vault (no en el repo):
--
--   select vault.create_secret('https://<ref>.supabase.co/functions/v1/avisos-vencimiento', 'avisos_url');
--   select vault.create_secret('<el mismo CRON_SECRET de la función>', 'avisos_cron_secret');
--
-- Mientras no existan esos secretos, el job corre y no hace nada.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create function private.disparar_avisos()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secreto text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'avisos_url';
  select decrypted_secret into v_secreto from vault.decrypted_secrets where name = 'avisos_cron_secret';

  if v_url is null or v_secreto is null then
    raise warning 'Avisos de vencimiento: faltan los secretos avisos_url / avisos_cron_secret en Vault';
    return null;
  end if;

  return net.http_post(
    url := v_url,
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secreto),
    timeout_milliseconds := 30000
  );
end;
$$;

comment on function private.disparar_avisos() is
  'Llama a la Edge Function de avisos de vencimiento. La ejecuta pg_cron todos los días.';

revoke all on function private.disparar_avisos() from public, anon, authenticated;

-- Reprogramar con el mismo nombre reemplaza el job anterior.
select cron.schedule('avisos-vencimiento', '0 11 * * *', 'select private.disparar_avisos()');
