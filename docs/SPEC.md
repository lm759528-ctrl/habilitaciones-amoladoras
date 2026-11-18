# Spec: Sistema de habilitación de operarios de amoladoras angulares — V1

## Objetivo

Reemplazar la planilla de Word "Examen práctico de uso de amoladoras angulares" por una
aplicación web (celular y PC) donde:

- el **administrador** carga los exámenes prácticos y la app genera el PDF;
- **Seguridad e Higiene** ve, con usuario y contraseña, quién está habilitado, vigente o vencido;
- llega **un mail resumen diario** antes de que venza cada habilitación.

Usuarios: 10 a 12 operarios de empresas contratistas, un administrador y personal de
Seguridad e Higiene. La app maneja datos personales (DNI): nada se lee sin login.

## Stack

- Frontend: React + Vite + TypeScript + Tailwind CSS, deploy en **Cloudflare Pages** (sitio estático,
  con `public/_redirects` para que las rutas de la SPA caigan en `index.html`).
- Backend: Supabase (Auth, Postgres, Storage, Edge Functions, pg_cron).
- Español de Argentina, fechas dd/mm/aaaa, zona horaria `America/Argentina/Buenos_Aires`.
- Diseño neutro, sin marcas; título de la app configurable (`VITE_APP_TITLE`).

## Etapas (cada una se revisa con Lucas antes de seguir)

| # | Etapa | Contenido |
|---|---|---|
| 1 | Base de datos y RLS | Migraciones: tablas, vistas, políticas RLS, bucket privado. Tests de base de datos. |
| 2 | Login y roles | Proyecto Vite listo para Cloudflare Pages, login con Supabase Auth, rutas por rol, script del primer admin. |
| 3 | Listado | Resumen, tabla/tarjetas, búsqueda, filtros, exportar CSV/Excel, ver PDF. |
| 4 | Nuevo examen y PDF | Checklist desde archivo de configuración, confirmación "No" + "Apto", PDF A4, subida a Storage. |
| 5 | Avisos por mail | Edge Function + pg_cron 8:00 AR, umbrales configurables, Resend o SMTP Gmail. |
| 6 | Administración | ABM empresas, personas y usuarios (invitar y asignar rol), anular exámenes. |

## Proyecto de Supabase compartido

Lucas usa un proyecto de Supabase que ya tiene otra app de la empresa (plan gratis). Por eso
todo va en esquemas propios (`habilitaciones` expuesto por la API, `habilitaciones_priv` para
funciones internas), con nombres prefijados en bucket, cron, Vault, trigger de `auth.users` y
`app_metadata` (`habilitaciones_rol`, `habilitaciones_nombre`). La configuración global de Auth
(registro público, Site URL, largo de contraseña) no se toca si la otra app la necesita.

## Modelo de datos (etapa 1)

| Tabla / vista | Para qué |
|---|---|
| `profiles` | Un perfil por usuario de Auth: `nombre`, `email`, `rol` (`admin`, `seguridad`, `evaluador`), `activo`. |
| `empresas` | Contratistas. Se dan de baja con `activo = false`, no se borran. |
| `personas` | Operarios: nombre, apellido, DNI único (7 u 8 dígitos, sin puntos), empresa actual. |
| `examenes` | Cada examen práctico, con la empresa del operario en ese momento, checklist (`respuestas`), resultado, fechas, PDF y anulación. |
| `avisos_enviados` | Qué aviso (umbral en días) ya se mandó para cada examen. |
| `configuracion` | Fila única con los umbrales de aviso (`dias_aviso`, por defecto `{30,7,0}`). |
| vista `examenes_estado` | Todos los exámenes con `dias_restantes` y `estado` (para el historial). |
| vista `habilitaciones_actuales` | Una fila por persona con su habilitación actual y su estado (para el listado). |

### Estados

Calculados con la fecha de hoy en Buenos Aires:

| Estado | Regla |
|---|---|
| `anulado` | El examen fue anulado (solo en el historial; el listado los ignora). |
| `no_apto` | Resultado "No apto": no genera habilitación. |
| `renovado` | Apto, pero hay un apto **anual o semestral** más nuevo de la misma persona. Una tarea puntual no renueva otra habilitación. |
| `vencido` | `fecha_vencimiento` < hoy. |
| `por_vencer` | Faltan como mucho tantos días como el umbral de aviso más grande. |
| `vigente` | El resto de los aptos. |

### Qué examen muestra el listado

Un examen posterior no inhabilita una habilitación que sigue en fecha (confirmado por Lucas):

1. Si la persona tiene alguna habilitación vigente o por vencer, se muestra esa: primero
   anual o semestral, después tarea puntual, y entre iguales la más reciente.
2. Si no tiene ninguna en fecha, se muestra su último examen no anulado (vencido o no apto).

### Reglas de vencimiento

- `fecha_inicio` vale por defecto `fecha_examen`.
- Anual: `fecha_inicio + 12 meses`. Semestral: `fecha_inicio + 6 meses`. Se calcula sola si no
  viene, pero el admin la puede editar.
- Tarea puntual: `descripcion_tarea` y `fecha_vencimiento` obligatorias (puede ser el mismo día).
- "No apto": `fecha_inicio` y `fecha_vencimiento` quedan vacías.

### Formato de `respuestas`

Se guarda una copia de la checklist tal como se tomó, así el historial no depende de que la
lista de configuración cambie después:

```json
{
  "version": 1,
  "secciones": [
    {
      "titulo": "Inspección previa",
      "items": [
        { "id": "inspeccion_desconectada", "texto": "Amoladora desconectada de la energía",
          "respuesta": "si", "comentario": "" }
      ]
    }
  ]
}
```

Cada `respuesta` tiene que ser `si`, `no` o `na`.

## Permisos

| | sin login | usuario sin perfil | `seguridad` | `evaluador` (preparado) | `admin` |
|---|---|---|---|---|---|
| Leer empresas, personas, exámenes, vistas, PDFs | no | no | sí | sí | sí |
| Crear empresas, personas, exámenes; subir PDFs | no | no | no | sí (cuando se active) | sí |
| Editar y anular | no | no | no | no | sí |
| Ver perfiles | no | solo el propio | solo el propio | solo el propio | todos |
| Cambiar roles | no | no | no | no | sí |
| Borrar exámenes | nadie, ni siquiera el admin o el `service_role` |

- RLS activado en todas las tablas; las vistas usan `security_invoker` para respetar RLS.
- El rol sale **solo** de `profiles`, y un perfil nuevo solo se crea si el usuario tiene
  `rol` en `app_metadata` (que solo puede escribir el `service_role`). Si alguien activara por
  error el registro público, ese usuario no ve nada.
- El rol `evaluador` existe en el enum. Para activarlo alcanza con cambiar
  `private.puede_cargar_examenes()`.
- No se puede desactivar ni degradar al último admin activo.
- Bucket `habilitaciones-examenes` privado, solo PDFs de hasta 5 MB; se abren con URLs firmadas.

## Comandos

```bash
# Tests de base de datos contra un Supabase local (supabase start)
supabase test db

# Tests contra un Postgres 15+ común, sin Docker (usa un "shim" de auth/storage)
./scripts/test-db-local.sh
```

## Estructura

```
supabase/migrations/   → migraciones SQL (orden por timestamp)
supabase/tests/        → tests pgTAP de la base
scripts/               → utilidades (tests locales, crear admin)
docs/                  → spec y decisiones
src/                   → frontend (desde la etapa 2)
```

## Límites

- **Siempre:** RLS en toda tabla nueva, tests de base para cada política, migraciones nuevas
  en vez de editar las ya aplicadas.
- **Preguntar antes:** cambios de modelo que no estén en esta spec, dependencias nuevas.
- **Nunca:** claves o secretos en el repo, borrar exámenes, exponer DNI sin login.
