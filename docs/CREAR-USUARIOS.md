# Cómo crear usuarios

Guía para el administrador. La app **no manda invitaciones por mail**: los usuarios se crean
siempre a mano en Supabase y después se les da acceso desde la app.

## Tipos de usuario

| Tipo | Qué puede hacer |
|---|---|
| **Administrador** | Todo: cargar exámenes, generar el PDF, anular exámenes y gestionar personas, empresas y usuarios. |
| **Seguridad e Higiene** | Solo mirar: listado, detalle, historial, PDFs y exportar. No puede cargar ni cambiar nada. |

## Crear un usuario nuevo

### 1. En Supabase

1. Entrá a [supabase.com/dashboard](https://supabase.com/dashboard) y abrí el proyecto.
2. Andá a **Authentication → Users**.
3. Tocá **Add user → Create new user**.
4. Completá el **mail** y una **contraseña** (mínimo 8 caracteres).
5. Marcá **Auto Confirm User**.
6. Tocá **Create user**.

> Si la persona ya tiene usuario en ese proyecto (por ejemplo, porque usa la otra app de la
> empresa), salteá este paso: se usa el mismo usuario y entra con la contraseña que ya tiene.

### 2. En la app

1. Entrá a la app con tu usuario de administrador.
2. Andá a **Administración → Usuarios**.
3. En **Dar acceso a un usuario**, completá:
   - **Email**: el mismo que cargaste en Supabase.
   - **Nombre**: como querés que aparezca.
   - **Rol**: Administrador o Seguridad e Higiene.
4. Tocá **Dar acceso**.

Si el mail no existe en Supabase, la app te avisa. Revisá que esté bien escrito o crealo primero
(paso 1).

### 3. Avisarle a la persona

Pasale la dirección de la app, su mail y la contraseña. Si quiere cambiarla, en la pantalla de
ingreso tiene **Olvidé mi contraseña**.

## Otras tareas

Todo en **Administración → Usuarios**, en la lista:

- **Cambiar el rol**: elegí el nuevo rol en el desplegable de esa persona.
- **Dar de baja**: tocá **Dar de baja**. Puede seguir entrando, pero no ve ningún dato.
  Para devolverle el acceso, tocá **Reactivar**.
- **Último administrador**: la app no deja quitar ni dar de baja al último administrador activo,
  para que nunca quede sin nadie que la maneje.

Para borrar un usuario del todo (por ejemplo, alguien que ya no trabaja más), primero dalo de baja
en la app y después borralo en Supabase → **Authentication → Users** → los tres puntitos →
**Delete user**. Si esa persona también usa la otra app de la empresa, no lo borres: alcanza con
darlo de baja acá.
