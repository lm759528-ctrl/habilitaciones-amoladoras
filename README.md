# Habilitaciones de amoladoras angulares

Aplicación web para registrar los exámenes prácticos de uso de amoladoras angulares,
generar el PDF de la planilla y controlar qué operarios están habilitados, por vencer o
vencidos. La spec completa está en [`docs/SPEC.md`](docs/SPEC.md).

> Estado: **completo (etapas 1 a 6)**.

Stack: React + Vite + TypeScript + Tailwind CSS, Supabase (Auth, Postgres, Storage) y
Cloudflare Pages.

## 1. Configurar Supabase

La app puede ir en un proyecto de Supabase propio o en uno que ya uses para otra cosa (por
ejemplo, si el plan gratis no te deja crear más proyectos). Todo lo suyo queda aparte:

- tablas y vistas en el esquema **`habilitaciones`** (no toca `public`);
- funciones internas en **`habilitaciones_priv`**;
- bucket **`habilitaciones-examenes`**, job de cron **`habilitaciones-avisos`** y secretos de
  Vault con prefijo `habilitaciones_`;
- el rol de cada usuario va en `app_metadata.habilitaciones_rol`. Los usuarios de la otra app
  no ven nada acá hasta que un admin les da acceso.

Pasos:

1. Si vas a usar un proyecto nuevo, crealo en [supabase.com](https://supabase.com) (región São Paulo).
2. Creá las tablas, de una de estas dos formas:
   - **SQL Editor** (recomendado si el proyecto ya tiene otra app): pegá y ejecutá, uno por uno
     y en orden, los archivos de [`supabase/migrations/`](supabase/migrations/)
     (`…000100_esquema_base.sql`, `…000200_vistas.sql`, `…000300_rls.sql`, `…000400_storage.sql`
     y `…000500_cron_avisos.sql`). Cada uno tiene que terminar en "Success".
   - **Terminal**, en un proyecto nuevo:

     ```bash
     npx supabase login
     npx supabase link --project-ref <ref-del-proyecto>
     npx supabase db push
     ```

3. En **Project Settings → Data API → Exposed schemas** (en algunos paneles, **API Settings**),
   agregá `habilitaciones` a la lista y guardá. Sin esto la app no ve las tablas.
4. En **Authentication → URL Configuration → Redirect URLs**, agregá
   `https://habilitaciones-amoladoras.pages.dev/nueva-contrasena`
   (y `http://localhost:5173/nueva-contrasena` si vas a probar en tu PC). Es adonde llevan los
   links de invitación y de "olvidé mi contraseña".
5. Opciones de login que valen para todo el proyecto (si lo compartís, decidí pensando en la otra app):
   - **Site URL**: si el proyecto es solo de esta app, poné la dirección de Cloudflare. Si es
     compartido, dejá la de la otra app: esta app siempre manda su propia dirección de regreso.
   - **Allow new users to sign up** (Sign In / Providers): en un proyecto propio, desactivalo.
     Si la otra app necesita registro público, dejalo como está: acá un usuario sin
     `habilitaciones_rol` no recibe perfil y no ve nada.
   - **Largo mínimo de contraseña** (Sign In / Providers → Email): 8 o más, si no afecta a la otra app.

## 2. Crear el primer administrador

Opción A, desde la terminal (en tu PC, con Node 22 o más nuevo):

```bash
cp .env.example .env.local    # completá SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
npm install
node --env-file=.env.local scripts/crear-admin.mjs admin@empresa.com "Nombre Apellido"
```

Te pide la contraseña sin mostrarla. Si el usuario ya existía, lo convierte en admin.

Opción B, desde el panel de Supabase: creá el usuario en **Authentication → Users → Add user**
(marcando *Auto Confirm User*). Si ya tenés usuario en ese proyecto (por la otra app), salteá
este paso y usá el mismo: vas a entrar con la misma contraseña. Después ejecutá [`scripts/promover-admin.sql`](scripts/promover-admin.sql)
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
   - **Root directory**: vacío.
3. En **Settings → Variables and Secrets** (para Production y Preview):

   | Variable | Valor |
   |---|---|
   | `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
   | `VITE_SUPABASE_ANON_KEY` (o `VITE_SUPABASE_PUBLISHABLE_KEY`) | Supabase → Project Settings → API → `anon` / publishable key |
   | `VITE_APP_TITLE` | El título que quieras mostrar (opcional) |

4. Guardá y hacé **Retry deployment** para que el build tome las variables.
5. Volvé a Supabase y revisá que la **Redirect URL** (sección 1, paso 4) tenga la dirección final.

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
SQL Editor: `update habilitaciones.configuracion set dias_aviso = '{30,15,7,0}';`

### Configurar el envío

1. Elegí cómo mandar los mails:
   - **Resend** (recomendado): creá una cuenta en [resend.com](https://resend.com), verificá tu
     dominio y generá una API key.
   - **Gmail**: activá la verificación en dos pasos en la cuenta y creá una
     [contraseña de aplicación](https://myaccount.google.com/apppasswords). Se usa el puerto 465,
     porque Supabase bloquea el 587.
   Si el proyecto ya tiene `RESEND_API_KEY` de otra app, podés usar la misma o, si esta app usa
   otra cuenta de Resend, cargar su key como `HABILITACIONES_RESEND_API_KEY` (tiene prioridad y
   no pisa la de la otra app).
2. Cargá los secretos de [`supabase/functions/.env.example`](supabase/functions/.env.example) en
   **Supabase → Edge Functions → Secrets** (se pueden pegar todos juntos como `NOMBRE=valor`), o
   desde la terminal con `npx supabase secrets set --env-file supabase/functions/.env`.
3. Subí las funciones, de una de estas dos formas:
   - **Desde GitHub, sin terminal** (queda automático para los cambios futuros):
     1. En Supabase → tu cuenta (arriba a la derecha) → **Access Tokens** → **Generate new token**.
     2. En GitHub → el repo → **Settings → Secrets and variables → Actions**:
        - pestaña **Secrets** → **New repository secret**: `SUPABASE_ACCESS_TOKEN` con el token;
        - pestaña **Variables** → **New repository variable**: `SUPABASE_PROJECT_REF` con el `ref`.
     3. En **Actions → Subir funciones a Supabase → Run workflow**. Después corre sola cada vez
        que se mergea un cambio en `supabase/functions/`.
   - **Desde la terminal**:

     ```bash
     npx supabase login
     npx supabase functions deploy avisos-vencimiento --project-ref <ref>
     npx supabase functions deploy invitar-usuario --project-ref <ref>
     ```

   Subir las funciones no toca la base de datos ni otras apps del proyecto.

### Programar el cron

La migración `20261118000500_cron_avisos.sql` ya deja programado el job `habilitaciones-avisos`
(`0 11 * * *`, o sea 8:00 en Argentina). Falta decirle a qué URL llamar y con qué secreto.
En el **SQL Editor** de Supabase ejecutá, con tu `ref` y el mismo `CRON_SECRET` del paso anterior:

```sql
select vault.create_secret('https://<ref>.supabase.co/functions/v1/avisos-vencimiento', 'habilitaciones_avisos_url');
select vault.create_secret('<CRON_SECRET>', 'habilitaciones_cron_secret');
```

### Probarlo

Desde el **SQL Editor**, sin terminal (usa la URL y el secreto guardados en Vault, así que también
prueba que el cron esté bien configurado):

```sql
-- Pide un ensayo: arma el mail de hoy sin mandarlo ni registrarlo
select net.http_post(
  url := (select decrypted_secret from vault.decrypted_secrets where name = 'habilitaciones_avisos_url'),
  body := '{"prueba":true}'::jsonb,
  headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret',
    (select decrypted_secret from vault.decrypted_secrets where name = 'habilitaciones_cron_secret'))
);

-- Unos segundos después, la respuesta (status 200 = todo bien)
select status_code, content from net._http_response order by created desc limit 1;

-- Para mandarlo de verdad (lo mismo que hace el cron a las 8:00)
select habilitaciones_priv.disparar_avisos();
```

O desde una terminal:

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
  no deja quitar ni dar de baja al último administrador activo. Si el email ya tiene cuenta en
  el proyecto de Supabase (por ejemplo, de la otra app), no se manda mail: se le da acceso y
  entra con la contraseña que ya tiene.

En el detalle de una persona, el admin puede **anular** un examen indicando el motivo. El examen
no se borra: queda en el historial marcado como anulado y deja de contar como habilitación.

### Configurar las invitaciones

Las invitaciones las manda Supabase Auth con la Edge Function `invitar-usuario`:

1. Subí la función `invitar-usuario` igual que en la sección 4 (con GitHub se sube junto con la
   otra). Usa el mismo secreto `APP_URL`.

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
`habilitaciones-examenes` (ruta `<persona>/<examen>.pdf`) y después registra el examen.

## Base de datos

Las migraciones están en `supabase/migrations/` y crean:

- en el esquema `habilitaciones`: tablas `profiles`, `empresas`, `personas`, `examenes`, `avisos_enviados` y `configuracion`;
- vistas `examenes_estado` (historial) y `habilitaciones_actuales` (listado);
- políticas RLS en todas las tablas y el bucket privado `habilitaciones-examenes`.

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
