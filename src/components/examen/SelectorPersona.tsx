import { useMemo, useState } from 'react'
import type { Empresa, PersonaLista } from '../../lib/datos'
import { NUEVA_EMPRESA, limpiarDni, type SeleccionPersona } from '../../lib/guardarExamen'
import { normalizar } from '../../lib/habilitaciones'

interface Props {
  personas: PersonaLista[]
  empresas: Empresa[]
  valor: SeleccionPersona | null
  errores: Record<string, string>
  onChange: (s: SeleccionPersona | null) => void
}

const claseInput = 'min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-base'

function Error({ texto }: { texto?: string }) {
  return texto ? <span className="text-sm text-red-700">{texto}</span> : null
}

export function SelectorPersona({ personas, empresas, valor, errores, onChange }: Props) {
  const [busqueda, setBusqueda] = useState('')
  const nombreEmpresa = useMemo(() => new Map(empresas.map((e) => [e.id, e.nombre])), [empresas])

  const resultados = useMemo(() => {
    const palabras = normalizar(busqueda).split(/\s+/).filter(Boolean)
    if (!palabras.length) return []
    return personas
      .filter((p) => p.activo)
      .filter((p) => {
        const donde = normalizar(`${p.nombre} ${p.apellido} ${p.dni}`)
        return palabras.every((w) => donde.includes(w))
      })
      .slice(0, 6)
  }, [busqueda, personas])

  if (valor?.tipo === 'existente') {
    const p = valor.persona
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-50 p-3">
        <div>
          <p className="font-semibold text-slate-900">{p.apellido}, {p.nombre}</p>
          <p className="text-sm text-slate-600">DNI {p.dni} · {nombreEmpresa.get(p.empresa_id)}</p>
        </div>
        <button type="button" onClick={() => onChange(null)} className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium">
          Cambiar
        </button>
      </div>
    )
  }

  if (valor?.tipo === 'nueva') {
    const set = (cambios: Partial<typeof valor>) => onChange({ ...valor, ...cambios })
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-slate-300 bg-slate-50 p-3">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-slate-900">Persona nueva</p>
          <button type="button" onClick={() => onChange(null)} className="text-sm text-slate-600 underline underline-offset-2">
            Buscar una existente
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            DNI
            <input inputMode="numeric" value={valor.dni} onChange={(e) => set({ dni: e.target.value })} className={claseInput} />
            <Error texto={errores.dni} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Nombre
            <input value={valor.nombre} onChange={(e) => set({ nombre: e.target.value })} className={claseInput} autoComplete="off" />
            <Error texto={errores.nombre} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Apellido
            <input value={valor.apellido} onChange={(e) => set({ apellido: e.target.value })} className={claseInput} autoComplete="off" />
            <Error texto={errores.apellido} />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Empresa
            <select value={valor.empresaId} onChange={(e) => set({ empresaId: e.target.value })} className={claseInput}>
              <option value="">Elegí una empresa</option>
              {empresas.filter((e) => e.activo).map((e) => (
                <option key={e.id} value={e.id}>{e.nombre}</option>
              ))}
              <option value={NUEVA_EMPRESA}>+ Empresa nueva…</option>
            </select>
            {valor.empresaId !== NUEVA_EMPRESA && <Error texto={errores.empresa} />}
          </label>
          {valor.empresaId === NUEVA_EMPRESA && (
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Nombre de la empresa nueva
              <input value={valor.empresaNueva} onChange={(e) => set({ empresaNueva: e.target.value })} className={claseInput} />
              <Error texto={errores.empresa} />
            </label>
          )}
        </div>
      </div>
    )
  }

  const pareceDni = /^\d{7,8}$/.test(limpiarDni(busqueda))
  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Buscar por nombre o DNI
        <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className={claseInput} autoComplete="off" />
      </label>
      {resultados.length > 0 && (
        <ul className="flex flex-col gap-1" aria-label="Personas encontradas">
          {resultados.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  setBusqueda('')
                  onChange({ tipo: 'existente', persona: p })
                }}
                className="flex min-h-11 w-full flex-col items-start rounded-lg border border-slate-200 bg-white px-3 py-2 text-left hover:border-slate-400"
              >
                <span className="font-medium text-slate-900">{p.apellido}, {p.nombre}</span>
                <span className="text-sm text-slate-600">DNI {p.dni} · {nombreEmpresa.get(p.empresa_id)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {busqueda && resultados.length === 0 && <p className="text-sm text-slate-600">No hay nadie con esos datos.</p>}
      <button
        type="button"
        onClick={() =>
          onChange({ tipo: 'nueva', dni: pareceDni ? limpiarDni(busqueda) : '', nombre: '', apellido: '', empresaId: '', empresaNueva: '' })
        }
        className="min-h-11 self-start rounded-lg border border-dashed border-slate-400 px-3 text-sm font-medium text-slate-700 hover:bg-white"
      >
        + Cargar persona nueva
      </button>
      <Error texto={errores.persona} />
    </div>
  )
}
