-- Los usuarios se crean a mano en Supabase (Authentication → Users → Add user).
-- Después, un admin les da acceso desde la app con esta función: busca el
-- usuario por mail y le crea (o actualiza) el perfil con el rol. No manda mails.

create function habilitaciones.dar_acceso(p_email text, p_nombre text, p_rol habilitaciones.rol_usuario)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not habilitaciones_priv.es_admin() then
    raise exception 'Solo un administrador puede dar acceso' using errcode = '42501';
  end if;
  if p_rol not in ('admin', 'seguridad') then
    raise exception 'El rol tiene que ser Administrador o Seguridad e Higiene' using errcode = 'P0001';
  end if;
  if btrim(coalesce(p_nombre, '')) = '' then
    raise exception 'Falta el nombre' using errcode = 'P0001';
  end if;

  select u.id into v_id
  from auth.users u
  where lower(u.email) = lower(btrim(p_email))
  limit 1;

  if v_id is null then
    raise exception 'No hay ningún usuario con ese mail en Supabase. Crealo primero en Authentication → Users → Add user.'
      using errcode = 'P0001';
  end if;

  insert into habilitaciones.profiles (id, email, nombre, rol, activo)
  select v_id, u.email, btrim(p_nombre), p_rol, true from auth.users u where u.id = v_id
  on conflict (id) do update set nombre = excluded.nombre, rol = excluded.rol, activo = true;

  return v_id;
end;
$$;

comment on function habilitaciones.dar_acceso(text, text, habilitaciones.rol_usuario) is
  'Da acceso a la app a un usuario ya creado en Supabase Auth. Solo admin.';

revoke all on function habilitaciones.dar_acceso(text, text, habilitaciones.rol_usuario) from public, anon;
grant execute on function habilitaciones.dar_acceso(text, text, habilitaciones.rol_usuario) to authenticated;
