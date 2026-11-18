import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { esAdmin } from '../auth/permisos'
import { DialogoConfirmar } from '../components/examen/DialogoConfirmar'
import { Aviso } from '../components/ui'
import { anularExamen, mensajeErrorAdmin } from '../lib/admin'
import { BotonPdf } from '../components/BotonPdf'
import { Cargando } from '../components/Cargando'
import { ErrorCarga } from '../components/ErrorCarga'
import { EstadoBadge } from '../components/EstadoBadge'
import { obtenerEmpresas, obtenerHistorial, obtenerPersona } from '../lib/datos'
import { formatearFecha, textoDiasRestantes } from '../lib/fechas'
import { TIPOS, type ExamenConEstado } from '../lib/habilitaciones'
import { useConsulta } from '../lib/useConsulta'

function Examen({ ex, empresa, onAnular }: { ex: ExamenConEstado; empresa: string; onAnular?: () => void }) {
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
      <div className="mt-3 flex flex-wrap items-start gap-2">
        <BotonPdf path={ex.pdf_path} />
        {onAnular && !ex.anulado && (
          <button type="button" onClick={onAnular} className="min-h-9 rounded-md border border-red-200 bg-white px-3 text-sm font-medium text-red-700 hover:bg-red-50">
            Anular
          </button>
        )}
      </div>
    </li>
  )
}

export function DetallePersona() {
  const { id = '' } = useParams()
  const persona = useConsulta(() => obtenerPersona(id), [id])
  const historial = useConsulta(() => obtenerHistorial(id), [id])
  const empresas = useConsulta(obtenerEmpresas, [])
  const { perfil } = useAuth()
  const [anulando, setAnulando] = useState<ExamenConEstado | null>(null)
  const [motivo, setMotivo] = useState('')
  const [errorAnular, setErrorAnular] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  async function confirmarAnulacion() {
    if (!anulando || !motivo.trim()) return
    setErrorAnular(null)
    try {
      await anularExamen(anulando.id, motivo)
      setAnulando(null)
      setMotivo('')
      setAviso(`Se anuló el examen del ${formatearFecha(anulando.fecha_examen)}.`)
      historial.recargar()
    } catch (e) {
      setErrorAnular(mensajeErrorAdmin(e))
    }
  }

  if ((persona.cargando && !persona.datos) || (historial.cargando && !historial.datos)) return <Cargando />
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
      {aviso && <Aviso tipo="ok">{aviso}</Aviso>}
      {examenes.length === 0 ? (
        <p className="text-slate-600">No tiene exámenes cargados.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {examenes.map((ex) => (
            <Examen
              key={ex.id}
              ex={ex}
              empresa={nombreEmpresa.get(ex.empresa_id) ?? ''}
              onAnular={esAdmin(perfil) ? () => (setAnulando(ex), setMotivo(''), setErrorAnular(null), setAviso(null)) : undefined}
            />
          ))}
        </ul>
      )}

      {anulando && (
        <DialogoConfirmar
          titulo={`Anular el examen del ${formatearFecha(anulando.fecha_examen)}`}
          confirmar="Anular examen"
          cancelar="Cancelar"
          confirmarDeshabilitado={!motivo.trim()}
          onConfirmar={() => void confirmarAnulacion()}
          onCancelar={() => setAnulando(null)}
        >
          <p className="text-sm">El examen no se borra: queda en el historial marcado como anulado y deja de contar como habilitación. No se puede deshacer.</p>
          <label className="mt-3 flex flex-col gap-1 text-sm font-medium text-slate-700">
            Motivo
            <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} className="rounded-lg border border-slate-300 px-3 py-2 text-base font-normal" />
          </label>
          {errorAnular && <div className="mt-2"><Aviso tipo="error">{errorAnular}</Aviso></div>}
        </DialogoConfirmar>
      )}
    </section>
  )
}
