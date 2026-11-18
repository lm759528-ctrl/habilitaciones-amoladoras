-- Alternativa sin terminal para crear el primer admin:
-- 1. En Supabase → Authentication → Users → "Add user" → "Create new user",
--    cargá el email y la contraseña y marcá "Auto Confirm User".
-- 2. Pegá esto en el SQL Editor, cambiando el email y el nombre, y ejecutalo.

insert into habilitaciones.profiles (id, email, nombre, rol, activo)
select id, email, 'Nombre Apellido', 'admin', true
from auth.users
where email = 'admin@empresa.com'
on conflict (id) do update set rol = 'admin', activo = true, nombre = excluded.nombre;

-- Tiene que devolver una fila con rol = admin:
select id, email, nombre, rol, activo from habilitaciones.profiles where email = 'admin@empresa.com';
