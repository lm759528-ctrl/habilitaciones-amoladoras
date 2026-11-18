# Habilitaciones de amoladoras angulares

Aplicación web para registrar los exámenes prácticos de uso de amoladoras angulares,
generar el PDF de la planilla y controlar qué operarios están habilitados, por vencer o
vencidos. La spec completa está en [`docs/SPEC.md`](docs/SPEC.md).

> Estado: **completo (etapas 1 a 6)**.

Stack: React + Vite + TypeScript + Tailwind CSS, Supabase (Auth, Postgres, Storage) y
Cloudflare Pages.

## 1. Configurar Supabase

1. Creá un proyecto en [supabase.com](https://supabase.com) (región São Paulo es la más cercana).
2. Aplicá las migraciones desde tu PC:

   ```bash
   npx supabase login
   npx supabase link --project-ref <ref-del-proyecto>
   npx supabase db push
   ```

3. En **Authentication → Sign In / Providers**, desactivá **Allow new users to sign up**:
   los usuarios los crea solo el administrador. (La base igual está protegida: un usuario sin
   `rol` en `app_metadata` no recibe perfil y no ve nada.)
4. En **Authentication → Sign In / Providers → Email**, poné el largo mínimo de contraseña en 8.
5. En **Authentication → URL Configuration**:
   - **Site URL**: la dirección de la app en Cloudflare, por ejemplo `https://habilitaciones-amoladoras.pages.dev`.
   - **Redirect URLs**: agregá `https://habilitaciones-amoladoras.pages.dev/nueva-contrasena`
     (y `http://localhost:5173/nueva-contrasena` si vas a probar en tu PC).
     Es adonde llevan los links de invitación y de "olvidé mi contraseña".

## 2. Crear el primer administrador

Opción A, desde la terminal (en tu PC, con Node 22 o más nuevo):

```bash
cp .env.example .env.local    # completá SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
npm install
node --env-file=.env.local scripts/crear-admin.mjs admin@empresa.com "Nombre Apellido"
```

Te pide la contraseña sin mostrarla. Si el usuario ya existía, lo convierte en admin.

Opción B, desde el panel de Supabase: creá el usuario en **Authentication → Users → Add user**
(marcando *Auto Confirm User*) y ejecutá [`scripts/promover-admin.sql`](scripts/promover-admin.sql)
en el **SQL Editor**, cambiando el email y el nombre.

> La `service_role` key saltea todos los permisos. Usala solo en tu PC: nunca la pongas en
> variables `VITE_*` ni en Cloudflare.

Los demás usuarios se invitan desde la pantalla de **Administración** (ver sección 5).
También se pueden crear con la opción B, cambiando `'admin'` por `'seguridad'` en el SQL.

## 3. Publicar en Cloudflare Pages

1. En Cloudflare → **Workers & Pages → Create → Pages → Connect to Git**, elegí este repositorio.
2. Configuración del build:
   - **Framework preset**: Vite (o "None")
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - La versión de Node la toma del archivo `.node-version` (22).
3. En **Settings → Variables and Secrets** (para Production y Preview):

   | Variable | Valor |
   |---|---|
   | `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
   | `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon` / publishable key |
   | `VITE_APP_TITLE` | El título que quieras mostrar (opcional) |

4. Guardá y hacé **Retry deployment** para que el build tome las variables.
5. Volvé a Supabase y completá la **Site URL** y las **Redirect URLs** con la dirección final.

El repo ya trae `public/_redirects` (para que funcionen las rutas al recargar la página) y
`public/_headers` (cabeceras de seguridad). Si preferís publicar desde la terminal en vez de
conectar el repo: `npm run build && npx wrangler pages deploy`.

## 4. Avisos de vencimiento por mail

Todos los días a las 8:00 (hora de Argentina) se manda **un solo mail** a `ALERT_EMAIL` con las
habilitaciones que vencen dentro de los umbrales (por defecto a los 30 días, a los 7 y el mismo
día). Cada aviso sale una sola vez (queda registrado en `avisos_enviados`) y no se avisa de
personas que ya renovaron ni de personas dadas de baja. Si un día no hay nada para avisar, no
llega mail.

Los umbrales están en la tabla `configuracion` (columna `dias_aviso`). Para cambiarlos, en el
SQL Editor: `update configuracion set dias_aviso = '{30,15,7,0}';`

### Configurar el envío

1. Elegí cómo mandar los mails:
   - **Resend** (recomendado): creá una cuenta en [resend.com](https://resend.com), verificá tu
     dominio y generá una API key.
   - **Gmail**: activá la verificación en dos pasos en la cuenta y creá una
     [contraseña de aplicación](https://myaccount.google.com/apppasswords). Se usa el puerto 465,
     porque Supabase bloquea el 587.
2. Copiá `supabase/functions/.env.example` a `supabase/functions/.env`, completalo y subilo:

   ```bash
   npx supabase secrets set --env-file supabase/functions/.env
   npx supabase functions deploy avisos-vencimiento
   ```

### Programar el cron

La migración `20261118000500_cron_avisos.sql` ya deja programado el job `avisos-vencimiento`
(`0 11 * * *`, o sea 8:00 en Argentina). Falta decirle a qué URL llamar y con qué secreto.
En el **SQL Editor** de Supabase ejecutá, con tu `ref` y el mismo `CRON_SECRET` del paso anterior:

```sql
select vault.create_secret('https://<ref>.supabase.co/functions/v1/avisos-vencimiento', 'avisos_url');
select vault.create_secret('<CRON_SECRET>', 'avisos_cron_secret');
```

### Probarlo

```bash
# Muestra qué mail saldría hoy, sin mandarlo ni registrarlo
curl -X POST "https://<ref>.supabase.co/functions/v1/avisos-vencimiento" \
  -H "x-cron-secret: <CRON_SECRET>" -d '{"prueba":true}'

# Lo manda de verdad (lo mismo que hace el cron)
curl -X POST "https://<ref>.supabase.co/functions/v1/avisos-vencimiento" -H "x-cron-secret: <CRON_SECRET>"
```

Para ver las ejecuciones del cron: `select * from cron.job_run_details order by start_time desc limit 10;`.
Los errores de la función aparecen en **Edge Functions → avisos-vencimiento → Logs**.

## 5. Administración

La pantalla **Administración** (solo admin) tiene tres solapas:

- **Personas**: alta, edición (nombre, apellido, DNI, empresa) y baja/reactivación. Una persona
  dada de baja no aparece en el listado ni recibe avisos, pero conserva su historial.
- **Empresas**: alta, cambio de nombre y baja/reactivación. Las empresas dadas de baja no se
  ofrecen al cargar exámenes nuevos; los exámenes viejos mantienen su empresa.
- **Usuarios**: invitar por mail (rol Administrador o Seguridad e Higiene), cambiar el rol y
  dar de baja/reactivar. Un usuario dado de baja no ve nada aunque tenga contraseña. La base
  no deja quitar ni dar de baja al último administrador activo.

En el detalle de una persona, el admin puede **anular** un examen indicando el motivo. El examen
no se borra: queda en el historial marcado como anulado y deja de contar como habilitación.

### Configurar las invitaciones

Las invitaciones las manda Supabase Auth con la Edge Function `invitar-usuario`:

1. Subí la función (usa el mismo `APP_URL` de `supabase/functions/.env`):

   ```bash
   npx supabase secrets set --env-file supabase/functions/.env
   npx supabase functions deploy invitar-usuario
   ```

2. El servidor de mail que trae Supabase de fábrica manda muy pocos mails por hora y solo a
   miembros del equipo del proyecto. Para invitar a cualquier dirección configurá un SMTP propio
   en **Authentication → Emails → SMTP Settings** (sirven Resend, con host `smtp.resend.com`,
   puerto 465, usuario `resend` y la API key como contraseña, o Gmail con contraseña de aplicación).
3. Revisá que `https://<tu-app>/nueva-contrasena` esté en las **Redirect URLs** (sección 1).
   El link de la invitación lleva ahí para que la persona elija su contraseña.
4. Opcional: en **Authentication → Emails → Templates → Invite user** podés traducir el mail
   al español.

## Desarrollo local

```bash
cp .env.example .env.local   # completá las variables VITE_*
npm install
npm run dev                  # http://localhost:5173
```

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Chequeo de tipos y build de producción en `dist/` |
| `npm test` | Tests del frontend (Vitest) |
| `npm run test:db` | Tests de la base (pgTAP) en un Postgres local, ver abajo |

## Checklist del examen

Los puntos del examen están en [`src/config/checklist.json`](src/config/checklist.json).
Se pueden cambiar los textos, agregar o quitar puntos y secciones sin tocar el código
(después hay que volver a publicar la app). Reglas:

- Cada punto tiene un `id` único. No conviene cambiar el `id` de un punto que ya se usó.
- Si cambiás la lista, subí el número de `version`.
- Los exámenes ya cargados guardan su propia copia de la checklist, así que no cambian.

Al guardar un examen, la app genera el PDF A4 en el navegador, lo sube al bucket privado
`examenes-pdf` (ruta `<persona>/<examen>.pdf`) y después registra el examen.

## Base de datos

Las migraciones están en `supabase/migrations/` y crean:

- tablas `profiles`, `empresas`, `personas`, `examenes`, `avisos_enviados` y `configuracion`;
- vistas `examenes_estado` (historial) y `habilitaciones_actuales` (listado);
- políticas RLS en todas las tablas y el bucket privado `examenes-pdf`.

### Tests de la base

```bash
# Con Docker y Supabase CLI
npx supabase start
npx supabase test db

# Sin Docker, contra un Postgres 15+ con pgTAP (apt install postgresql-16-pgtap)
PGUSER=postgres ./scripts/test-db-local.sh
```

El script local carga una imitación mínima de `auth` y `storage`
(`scripts/local/supabase_shim.sql`) que en Supabase no hace falta.

## Roles

| Rol | Puede |
|---|---|
| `admin` | Todo: cargar, editar y anular exámenes; gestionar empresas, personas y usuarios. |
| `seguridad` | Solo lectura: listado, detalle, historial, PDFs y exportar. |
| `evaluador` | Preparado para el futuro (cargar exámenes sin gestionar usuarios). Hoy no tiene permisos. |
