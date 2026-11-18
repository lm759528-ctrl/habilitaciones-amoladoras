-- Etapa 1: vistas de estado.
-- Las dos vistas usan security_invoker para que se apliquen las políticas RLS
-- de quien consulta (sin eso, una vista corre con los permisos de su dueño).

-- Todos los exámenes con días restantes y estado calculado (historial).
create view public.examenes_estado
with (security_invoker = true)
as
with umbral as (
  select coalesce((select max(d) from public.configuracion c, unnest(c.dias_aviso) d), 30) as dias
)
select
  e.id,
  e.persona_id,
  e.empresa_id,
  e.fecha_examen,
  e.controlo,
  e.resultado,
  e.tipo_habilitacion,
  e.descripcion_tarea,
  e.fecha_inicio,
  e.fecha_vencimiento,
  e.observaciones,
  e.pdf_path,
  e.anulado,
  e.motivo_anulacion,
  e.created_at,
  case when e.resultado = 'apto' then e.fecha_vencimiento - private.hoy_ar() end as dias_restantes,
  case
    when e.anulado then 'anulado'
    when e.resultado = 'no_apto' then 'no_apto'
    when exists (
      select 1
      from public.examenes n
      where n.persona_id = e.persona_id
        and n.id <> e.id
        and not n.anulado
        and n.resultado = 'apto'
        and (n.fecha_examen, n.created_at) > (e.fecha_examen, e.created_at)
    ) then 'renovado'
    when e.fecha_vencimiento < private.hoy_ar() then 'vencido'
    when e.fecha_vencimiento - private.hoy_ar() <= (select dias from umbral) then 'por_vencer'
    else 'vigente'
  end as estado
from public.examenes e;

comment on view public.examenes_estado is
  'Exámenes con estado: anulado, no_apto, renovado, vencido, por_vencer o vigente.';

-- Una fila por persona: su examen más reciente que no esté anulado (listado).
-- Si el último examen es "No apto", la persona figura como no_apto aunque
-- tenga un apto anterior todavía en fecha.
create view public.habilitaciones_actuales
with (security_invoker = true)
as
select distinct on (e.persona_id)
  e.persona_id,
  p.nombre,
  p.apellido,
  p.dni,
  p.activo as persona_activa,
  e.empresa_id,
  em.nombre as empresa_nombre,
  e.id as examen_id,
  e.fecha_examen,
  e.controlo,
  e.resultado,
  e.tipo_habilitacion,
  e.descripcion_tarea,
  e.fecha_inicio,
  e.fecha_vencimiento,
  e.dias_restantes,
  e.estado,
  e.pdf_path
from public.examenes_estado e
join public.personas p on p.id = e.persona_id
join public.empresas em on em.id = e.empresa_id
where not e.anulado
order by e.persona_id, e.fecha_examen desc, e.created_at desc;

comment on view public.habilitaciones_actuales is
  'Habilitación actual de cada persona (último examen no anulado) con su estado.';
