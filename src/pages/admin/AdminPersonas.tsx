import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Cargando } from '../../components/Cargando'
import { ErrorCarga } from '../../components/ErrorCarga'
import { Aviso, Boton } from '../../components/ui'
import { guardarPersona, mensajeErrorAdmin, type DatosPersona } from '../../lib/admin'
import { obtenerEmpresas, obtenerPersonas } from '../../lib/datos'
import { limpiarDni } from '../../lib/guardarExamen'
import { normalizar } from '../../lib/habilitaciones'
import { useConsulta } from '../../lib/useConsulta'
import { Activo, Etiqueta, Tarjeta, claseBotonSec, claseInput } from './comunes'

const VACIA: DatosPersona = { nombre: '', apellido: '', dni: '', empresa_id: '' }

export function validarDatosPersona(p: DatosPersona): string | null {
  if (!p.nombre.trim() || !p.apellido.trim()) return 'Completá nombre y apellido.'
  if (!/^\d{7,8}$/.test(limpiarDni(p.dni))) return 'El DNI tiene que tener 7 u 8 números.'
  if (!p.empresa_id) return 'Elegí la empresa.'
  return null
}

export function AdminPersonas() {
  const personas = useConsulta(obtenerPersonas, [])
  const empresas = useConsulta(obtenerEmpresas, [])
  const [form, setForm] = useState<DatosPersona | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const nombreEmpresa = useMemo(() => new Map((empresas.datos ?? []).map((e) => [e.id, e.nombre])), [empresas.datos])
  const visibles = useMemo(() => {
    const palabras = normalizar(busqueda).split(/\s+/).filter(Boolean)
    return (personas.datos ?? []).filter((p) => {
      const donde = normalizar(`${p.nombre} ${p.apellido} ${p.dni}`)
      return palabras.every((w) => donde.includes(w))
    })
  }, [personas.datos, busqueda])

  async function ejecutar(accion: () => Promise<void>) {
    setError(null)
    setOcupado(true)
    try {
      await accion()
      personas.recargar()
      return true
    } catch (e) {
      setError(mensajeErrorAdmin(e))
      return false
    } finally {
      setOcupado(false)
    }
  }

  async function guardar(e: FormEvent) {
    e.preventDefault()
    if (!form) return
    const invalido = validarDatosPersona(form)
    if (invalido) return setError(invalido)
    if (await ejecutar(() => guardarPersona({ ...form, dni: limpiarDni(form.dni) }))) setForm(null)
  }

  if ((personas.cargando && !personas.datos) || (empresas.cargando && !empresas.datos)) return <Cargando />
  if (personas.error || empresas.error) return <ErrorCarga recargar={() => (personas.recargar(), empresas.recargar())} />

  return (
    <div className="flex flex-col gap-4">
      {form ? (
        <Tarjeta>
          <form onSubmit={guardar} className="flex flex-col gap-3" noValidate>
            <h3 className="font-semibold text-slate-900">{form.id ? 'Editar persona' : 'Nueva persona'}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Etiqueta texto="Nombre">
                <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className={claseInput} />
              </Etiqueta>
              <Etiqueta texto="Apellido">
                <input value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} className={claseInput} />
              </Etiqueta>
              <Etiqueta texto="DNI">
                <input inputMode="numeric" value={form.dni} onChange={(e) => setForm({ ...form, dni: e.target.value })} className={claseInput} />
              </Etiqueta>
              <Etiqueta texto="Empresa">
                <select value={form.empresa_id} onChange={(e) => setForm({ ...form, empresa_id: e.target.value })} className={claseInput}>
                  <option value="">Elegí una empresa</option>
                  {(empresas.datos ?? [])
                    .filter((em) => em.activo || em.id === form.empresa_id)
                    .map((em) => (
                      <option key={em.id} value={em.id}>{em.nombre}</option>
                    ))}
                </select>
              </Etiqueta>
            </div>
            {form.id && <p className="text-xs text-slate-500">Cambiar la empresa no modifica los exámenes ya tomados: cada uno guarda la empresa de ese momento.</p>}
            {error && <Aviso tipo="error">{error}</Aviso>}
            <div className="flex gap-2">
              <Boton type="submit" disabled={ocupado}>Guardar</Boton>
              <button type="button" className={claseBotonSec} onClick={() => (setForm(null), setError(null))}>Cancelar</button>
            </div>
          </form>
        </Tarjeta>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Etiqueta texto="Buscar persona">
              <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className={claseInput} placeholder="Nombre o DNI" />
            </Etiqueta>
          </div>
          <Boton type="button" onClick={() => (setForm(VACIA), setError(null))}>Nueva persona</Boton>
        </div>
      )}
      {!form && error && <Aviso tipo="error">{error}</Aviso>}

      <ul className="flex flex-col gap-2" aria-label="Personas">
        {visibles.map((p) => (
          <li key={p.id}>
            <Tarjeta>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Link to={`/personas/${p.id}`} className="font-medium text-slate-900 underline-offset-2 hover:underline">
                      {p.apellido}, {p.nombre}
                    </Link>
                    <Activo activo={p.activo} />
                  </div>
                  <p className="text-sm text-slate-600">DNI {p.dni} · {nombreEmpresa.get(p.empresa_id)}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" className={claseBotonSec} onClick={() => (setForm({ ...p }), setError(null))}>Editar</button>
                  <button
                    type="button"
                    className={claseBotonSec}
                    disabled={ocupado}
                    onClick={() => void ejecutar(() => guardarPersona({ ...p, activo: !p.activo }))}
                  >
                    {p.activo ? 'Dar de baja' : 'Reactivar'}
                  </button>
                </div>
              </div>
            </Tarjeta>
          </li>
        ))}
      </ul>
      <p className="text-sm text-slate-500">Las personas no se borran: dadas de baja dejan de aparecer en el listado y en los avisos, y conservan su historial.</p>
    </div>
  )
}
