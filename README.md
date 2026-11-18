# Habilitaciones de amoladoras angulares

Aplicación web para registrar los exámenes prácticos de uso de amoladoras angulares,
generar el PDF de la planilla y controlar qué operarios están habilitados, por vencer o
vencidos. La spec completa está en [`docs/SPEC.md`](docs/SPEC.md).

> Estado: **etapa 3 (listado)**. El examen con PDF, los avisos por mail y
> la administración llegan en las etapas siguientes; este README se completa en cada una.

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

Los demás usuarios (Seguridad e Higiene) se invitan desde la pantalla de Administración
(etapa 6). Hasta entonces se pueden crear con la opción B, cambiando `'admin'` por `'seguridad'` en el SQL.

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
