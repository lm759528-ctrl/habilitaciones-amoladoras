# Habilitaciones de amoladoras angulares

Aplicación web para registrar los exámenes prácticos de uso de amoladoras angulares,
generar el PDF de la planilla y controlar qué operarios están habilitados, por vencer o
vencidos. La spec completa está en [`docs/SPEC.md`](docs/SPEC.md).

> Estado: **etapa 1 (base de datos y RLS)**. El frontend, los avisos por mail y la
> administración llegan en las etapas siguientes; este README se completa en cada una.

## Base de datos (Supabase)

Las migraciones están en `supabase/migrations/` y crean:

- tablas `profiles`, `empresas`, `personas`, `examenes`, `avisos_enviados` y `configuracion`;
- vistas `examenes_estado` (historial) y `habilitaciones_actuales` (listado);
- políticas RLS en todas las tablas y el bucket privado `examenes-pdf`.

### Aplicarlas a un proyecto de Supabase

```bash
npm i -g supabase            # o usar npx supabase
supabase login
supabase link --project-ref <ref-del-proyecto>
supabase db push
```

En el panel de Supabase, en **Authentication → Sign In / Providers**, desactivá
**Allow new users to sign up**: los usuarios los crea solo el administrador.
(La base igual está protegida: un usuario que no tenga `rol` en `app_metadata` no
recibe perfil y no ve nada.)

### Tests

```bash
# Con Docker y Supabase CLI
supabase start
supabase test db

# Sin Docker, contra un Postgres 15+ con pgTAP (apt install postgresql-16-pgtap)
PGUSER=postgres ./scripts/test-db-local.sh
```

El script local carga una imitación mínima de `auth` y `storage`
(`scripts/local/supabase_shim.sql`) que en Supabase no hace falta.
