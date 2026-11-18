import { Link, useParams } from 'react-router'
import { BotonPdf } from '../components/BotonPdf'
import { Cargando } from '../components/Cargando'
import { ErrorCarga } from '../components/ErrorCarga'
import { EstadoBadge } from '../components/EstadoBadge'
import { obtenerEmpresas, obtenerHistorial, obtenerPersona } from '../lib/datos'
import { formatearFecha, textoDiasRestantes } from '../lib/fechas'
import { TIPOS, type ExamenConEstado } from '../lib/habilitaciones'
import { useConsulta } from '../lib/useConsulta'

function Examen({ ex, empresa }: { ex: ExamenConEstado; empresa: string }) {
  return (
    <li className={`rounded-xl border bg-white p-4 shadow-sm ${ex.anulado ? 'border-dashed border-slate-300 opacity-75' : 'border-slate-200'}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-900">Examen del {formatearFecha(ex.fecha_examen)}</p>
          <p className="text-sm text-slate-600">
            {ex.resultado === 'apto' ? 'Apto' : 'No apto'} · {TIPOS[ex.tipo_habilitacion]}
            {ex.tipo_habilitacion === 'tarea_puntual' && ex.descripcion_tarea && <> · Solo para: {ex.descripcion_tarea}</>}
          </p>
        </div>
        <EstadoBadge estado={ex.estado} />
      </div>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm sm:grid-cols-[auto_1fr_auto_1fr]">
        {ex.fecha_vencimiento && (
          <>
            <dt className="text-slate-500">Vigencia</dt>
            <dd>
              {formatearFecha(ex.fecha_inicio)} al {formatearFecha(ex.fecha_vencimiento)}
              {(ex.estado === 'vigente' || ex.estado === 'por_vencer' || ex.estado === 'vencido') && (
                <span className="text-slate-500"> ({textoDiasRestantes(ex.dias_restantes)})</span>
              )}
            </dd>
          </>
        )}
        <dt className="text-slate-500">Controló</dt>
        <dd>{ex.controlo}</dd>
        <dt className="text-slate-500">Empresa</dt>
        <dd>{empresa}</dd>
        {ex.observaciones && (
          <>
            <dt className="text-slate-500">Observaciones</dt>
            <dd className="whitespace-pre-line">{ex.observaciones}</dd>
          </>
        )}
        {ex.anulado && (
          <>
            <dt className="text-slate-500">Motivo de anulación</dt>
            <dd>{ex.motivo_anulacion}</dd>
          </>
        )}
      </dl>
      <BotonPdf path={ex.pdf_path} className="mt-3" />
    </li>
  )
}

export function DetallePersona() {
  const { id = '' } = useParams()
  const persona = useConsulta(() => obtenerPersona(id), [id])
  const historial = useConsulta(() => obtenerHistorial(id), [id])
  const empresas = useConsulta(obtenerEmpresas, [])

  if (persona.cargando || historial.cargando) return <Cargando />
  if (persona.error || historial.error) {
    return <ErrorCarga recargar={() => (persona.recargar(), historial.recargar())} />
  }
  if (!persona.datos) {
    return (
      <section>
        <h1 className="text-2xl font-semibold text-slate-900">Persona no encontrada</h1>
        <Link to="/" className="mt-2 inline-block text-slate-600 underline underline-offset-2">Volver al listado</Link>
      </section>
    )
  }

  const p = persona.datos
  const nombreEmpresa = new Map((empresas.datos ?? []).map((e) => [e.id, e.nombre]))
  const examenes = historial.datos ?? []

  return (
    <section className="flex flex-col gap-5">
      <Link to="/" className="text-sm text-slate-600 underline underline-offset-2">← Volver al listado</Link>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">
          {p.apellido}, {p.nombre}
        </h1>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-slate-500">DNI</dt>
          <dd className="tabular-nums">{p.dni}</dd>
          <dt className="text-slate-500">Empresa</dt>
          <dd>{p.empresa?.nombre}</dd>
          {!p.activo && (
            <>
              <dt className="text-slate-500">Situación</dt>
              <dd>Dada de baja</dd>
            </>
          )}
        </dl>
      </div>

      <h2 className="text-lg font-semibold text-slate-900">Historial de exámenes</h2>
      {examenes.length === 0 ? (
        <p className="text-slate-600">No tiene exámenes cargados.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {examenes.map((ex) => (
            <Examen key={ex.id} ex={ex} empresa={nombreEmpresa.get(ex.empresa_id) ?? ''} />
          ))}
        </ul>
      )}
    </section>
  )
}
