import { useState, type FormEvent } from 'react'
import { Cargando } from '../../components/Cargando'
import { ErrorCarga } from '../../components/ErrorCarga'
import { Aviso, Boton } from '../../components/ui'
import { guardarEmpresa, mensajeErrorAdmin } from '../../lib/admin'
import { obtenerEmpresas, type Empresa } from '../../lib/datos'
import { useConsulta } from '../../lib/useConsulta'
import { Activo, Etiqueta, Tarjeta, claseBotonSec, claseInput } from './comunes'

export function AdminEmpresas() {
  const empresas = useConsulta(obtenerEmpresas, [])
  const [nueva, setNueva] = useState('')
  const [editando, setEditando] = useState<{ id: string; nombre: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function ejecutar(accion: () => Promise<void>) {
    setError(null)
    setOcupado(true)
    try {
      await accion()
      empresas.recargar()
      return true
    } catch (e) {
      setError(mensajeErrorAdmin(e))
      return false
    } finally {
      setOcupado(false)
    }
  }

  async function crear(e: FormEvent) {
    e.preventDefault()
    if (!nueva.trim()) return
    if (await ejecutar(() => guardarEmpresa({ nombre: nueva }))) setNueva('')
  }

  if (empresas.cargando && !empresas.datos) return <Cargando />
  if (empresas.error) return <ErrorCarga recargar={empresas.recargar} />

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={crear} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Etiqueta texto="Nueva empresa">
            <input value={nueva} onChange={(e) => setNueva(e.target.value)} className={claseInput} placeholder="Nombre de la contratista" />
          </Etiqueta>
        </div>
        <Boton type="submit" disabled={ocupado || !nueva.trim()}>Agregar</Boton>
      </form>
      {error && <Aviso tipo="error">{error}</Aviso>}
      <ul className="flex flex-col gap-2" aria-label="Empresas">
        {(empresas.datos ?? []).map((em: Empresa) => (
          <li key={em.id}>
            <Tarjeta>
              {editando?.id === em.id ? (
                <form
                  className="flex flex-col gap-2 sm:flex-row"
                  onSubmit={async (e) => {
                    e.preventDefault()
                    if (await ejecutar(() => guardarEmpresa({ id: em.id, nombre: editando.nombre }))) setEditando(null)
                  }}
                >
                  <input
                    aria-label="Nombre de la empresa"
                    value={editando.nombre}
                    onChange={(e) => setEditando({ id: em.id, nombre: e.target.value })}
                    className={`${claseInput} flex-1`}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button type="submit" className={claseBotonSec} disabled={ocupado || !editando.nombre.trim()}>Guardar</button>
                    <button type="button" className={claseBotonSec} onClick={() => setEditando(null)}>Cancelar</button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">{em.nombre}</span>
                    <Activo activo={em.activo} />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className={claseBotonSec} onClick={() => setEditando({ id: em.id, nombre: em.nombre })}>
                      Editar
                    </button>
                    <button
                      type="button"
                      className={claseBotonSec}
                      disabled={ocupado}
                      onClick={() => void ejecutar(() => guardarEmpresa({ id: em.id, nombre: em.nombre, activo: !em.activo }))}
                    >
                      {em.activo ? 'Dar de baja' : 'Reactivar'}
                    </button>
                  </div>
                </div>
              )}
            </Tarjeta>
          </li>
        ))}
      </ul>
      <p className="text-sm text-slate-500">Las empresas no se borran: dadas de baja dejan de aparecer al cargar personas nuevas.</p>
    </div>
  )
}
