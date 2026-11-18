import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { BotonPdf } from '../components/BotonPdf'
import { Cargando } from '../components/Cargando'
import { ErrorCarga } from '../components/ErrorCarga'
import { EstadoBadge } from '../components/EstadoBadge'
import { obtenerEmpresas, obtenerHabilitaciones } from '../lib/datos'
import { formatearFecha, textoDiasRestantes } from '../lib/fechas'
import {
  ESTADOS,
  ESTADOS_LISTADO,
  TIPOS,
  descargarCsv,
  filtrar,
  ordenarPorApellido,
  resumen,
  type Estado,
  type Habilitacion,
} from '../lib/habilitaciones'
import { useConsulta } from '../lib/useConsulta'

function Tipo({ h }: { h: Habilitacion }) {
  if (h.tipo_habilitacion !== 'tarea_puntual') return <>{TIPOS[h.tipo_habilitacion]}</>
  return (
    <span className="flex flex-col gap-0.5">
      <span>{TIPOS.tarea_puntual}</span>
      <span className="text-xs font-medium text-slate-500">Solo para: {h.descripcion_tarea}</span>
    </span>
  )
}

function Dias({ h }: { h: Habilitacion }) {
  const texto = textoDiasRestantes(h.dias_restantes)
  if (!texto) return <span className="text-slate-400">—</span>
  const color = h.estado === 'vencido' ? 'text-red-700' : h.estado === 'por_vencer' ? 'text-yellow-800' : ''
  return <span className={color}>{texto}</span>
}

const TARJETAS_RESUMEN: { estado: 'vigente' | 'por_vencer' | 'vencido'; texto: string; borde: string }[] = [
  { estado: 'vigente', texto: 'Vigentes', borde: 'border-l-green-500' },
  { estado: 'por_vencer', texto: 'Por vencer', borde: 'border-l-yellow-400' },
  { estado: 'vencido', texto: 'Vencidos', borde: 'border-l-red-500' },
]

export function Listado() {
  const habilitaciones = useConsulta(obtenerHabilitaciones, [])
  const empresas = useConsulta(obtenerEmpresas, [])
  const [texto, setTexto] = useState('')
  const [empresaId, setEmpresaId] = useState('')
  const [estado, setEstado] = useState<Estado | ''>('')

  const activas = useMemo(() => filtrar(habilitaciones.datos ?? [], {}), [habilitaciones.datos])
  const totales = useMemo(() => resumen(activas), [activas])
  const visibles = useMemo(
    () => ordenarPorApellido(filtrar(activas, { texto, empresaId, estado })),
    [activas, texto, empresaId, estado],
  )

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Habilitados</h1>
        <button
          type="button"
          onClick={() => descargarCsv(visibles, `habilitaciones-${new Date().toISOString().slice(0, 10)}.csv`)}
          disabled={visibles.length === 0}
          className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
        >
          Exportar a Excel (CSV)
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {TARJETAS_RESUMEN.map(({ estado: e, texto: etiqueta, borde }) => (
          <button
            key={e}
            type="button"
            aria-pressed={estado === e}
            onClick={() => setEstado(estado === e ? '' : e)}
            className={
              `rounded-xl border border-l-4 bg-white p-3 text-left shadow-sm sm:p-4 ${borde} ` +
              (estado === e ? 'border-slate-400 ring-2 ring-slate-300' : 'border-slate-200 hover:border-slate-300')
            }
          >
            <span className="block text-2xl font-semibold text-slate-900 sm:text-3xl">{totales[e]}</span>
            <span className="block text-xs text-slate-600 sm:text-sm">{etiqueta}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Buscar
          <input
            type="search"
            placeholder="Nombre, apellido o DNI"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-base font-normal"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Empresa
          <select
            value={empresaId}
            onChange={(e) => setEmpresaId(e.target.value)}
            className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-base font-normal"
          >
            <option value="">Todas</option>
            {(empresas.datos ?? []).map((em) => (
              <option key={em.id} value={em.id}>
                {em.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Estado
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value as Estado | '')}
            className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-base font-normal"
          >
            <option value="">Todos</option>
            {ESTADOS_LISTADO.map((e) => (
              <option key={e} value={e}>
                {ESTADOS[e].texto}
              </option>
            ))}
          </select>
        </label>
      </div>

      {habilitaciones.cargando ? (
        <Cargando />
      ) : habilitaciones.error ? (
        <ErrorCarga recargar={habilitaciones.recargar} />
      ) : visibles.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-600">
          {activas.length === 0 ? 'Todavía no hay exámenes cargados.' : 'Nadie coincide con la búsqueda.'}
        </p>
      ) : (
        <>
          {/* Celular: tarjetas */}
          <ul className="flex flex-col gap-3 md:hidden" aria-label="Habilitaciones">
            {visibles.map((h) => (
              <li key={h.persona_id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <Link to={`/personas/${h.persona_id}`} className="font-semibold text-slate-900 underline-offset-2 hover:underline">
                    {h.apellido}, {h.nombre}
                  </Link>
                  <EstadoBadge estado={h.estado} />
                </div>
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  <dt className="text-slate-500">DNI</dt>
                  <dd>{h.dni}</dd>
                  <dt className="text-slate-500">Empresa</dt>
                  <dd>{h.empresa_nombre}</dd>
                  <dt className="text-slate-500">Tipo</dt>
                  <dd><Tipo h={h} /></dd>
                  {h.fecha_vencimiento && (
                    <>
                      <dt className="text-slate-500">Vence</dt>
                      <dd>
                        {formatearFecha(h.fecha_vencimiento)} · <Dias h={h} />
                      </dd>
                    </>
                  )}
                </dl>
                <BotonPdf path={h.pdf_path} className="mt-3" />
              </li>
            ))}
          </ul>

          {/* PC: tabla */}
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Nombre</th>
                  <th scope="col" className="px-4 py-3 font-semibold">DNI</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Empresa</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Tipo</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Vencimiento</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Días restantes</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Estado</th>
                  <th scope="col" className="px-4 py-3 font-semibold"><span className="sr-only">PDF</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibles.map((h) => (
                  <tr key={h.persona_id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">
                      <Link to={`/personas/${h.persona_id}`} className="text-slate-900 underline-offset-2 hover:underline">
                        {h.apellido}, {h.nombre}
                      </Link>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{h.dni}</td>
                    <td className="px-4 py-3">{h.empresa_nombre}</td>
                    <td className="px-4 py-3"><Tipo h={h} /></td>
                    <td className="px-4 py-3 tabular-nums">{formatearFecha(h.fecha_vencimiento) || '—'}</td>
                    <td className="px-4 py-3"><Dias h={h} /></td>
                    <td className="px-4 py-3"><EstadoBadge estado={h.estado} /></td>
                    <td className="px-4 py-3 text-right"><BotonPdf path={h.pdf_path} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-slate-500">
            {visibles.length} de {activas.length} personas
          </p>
        </>
      )}
    </section>
  )
}
