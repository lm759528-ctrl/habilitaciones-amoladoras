import { useState, type FormEvent } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { NOMBRE_ROL, type Rol } from '../../auth/permisos'
import { Cargando } from '../../components/Cargando'
import { ErrorCarga } from '../../components/ErrorCarga'
import { Aviso, Boton } from '../../components/ui'
import { actualizarUsuario, darAcceso, mensajeErrorAdmin, obtenerUsuarios } from '../../lib/admin'
import { useConsulta } from '../../lib/useConsulta'
import { Activo, Etiqueta, Tarjeta, claseBotonSec, claseInput } from './comunes'

/** Roles que se pueden asignar hoy. 'evaluador' queda para más adelante. */
const ROLES: Rol[] = ['admin', 'seguridad']

export function AdminUsuarios() {
  const { perfil } = useAuth()
  const usuarios = useConsulta(obtenerUsuarios, [])
  const [acceso, setAcceso] = useState({ email: '', nombre: '', rol: 'seguridad' as Rol })
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function ejecutar(accion: () => Promise<string | void>, ok: string) {
    setMensaje(null)
    setOcupado(true)
    try {
      const texto = await accion()
      usuarios.recargar()
      setMensaje({ tipo: 'ok', texto: texto || ok })
      return true
    } catch (e) {
      setMensaje({ tipo: 'error', texto: mensajeErrorAdmin(e) })
      return false
    } finally {
      setOcupado(false)
    }
  }

  async function darleAcceso(e: FormEvent) {
    e.preventDefault()
    const listo = await ejecutar(
      () => darAcceso(acceso),
      `Listo: ${acceso.email} ya puede entrar como ${NOMBRE_ROL[acceso.rol]}, con la contraseña que le pusiste en Supabase.`,
    )
    if (listo) setAcceso({ email: '', nombre: '', rol: 'seguridad' })
  }

  if (usuarios.cargando && !usuarios.datos) return <Cargando />
  if (usuarios.error) return <ErrorCarga recargar={usuarios.recargar} />

  return (
    <div className="flex flex-col gap-4">
      <Tarjeta>
        <form onSubmit={darleAcceso} className="flex flex-col gap-3">
          <h3 className="font-semibold text-slate-900">Dar acceso a un usuario</h3>
          <p className="text-sm text-slate-600">
            Primero creá el usuario en Supabase (Authentication → Users → Add user → Create new user, con
            "Auto Confirm User" marcado). Después cargá acá el mismo mail, su nombre y el rol.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Etiqueta texto="Email">
              <input type="email" required value={acceso.email} onChange={(e) => setAcceso({ ...acceso, email: e.target.value })} className={claseInput} />
            </Etiqueta>
            <Etiqueta texto="Nombre">
              <input required value={acceso.nombre} onChange={(e) => setAcceso({ ...acceso, nombre: e.target.value })} className={claseInput} />
            </Etiqueta>
            <Etiqueta texto="Rol">
              <select value={acceso.rol} onChange={(e) => setAcceso({ ...acceso, rol: e.target.value as Rol })} className={claseInput}>
                {ROLES.map((r) => <option key={r} value={r}>{NOMBRE_ROL[r]}</option>)}
              </select>
            </Etiqueta>
          </div>
          <Boton type="submit" disabled={ocupado || !acceso.email.trim() || !acceso.nombre.trim()} className="self-start">
            {ocupado ? 'Guardando…' : 'Dar acceso'}
          </Boton>
        </form>
      </Tarjeta>

      {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}

      <ul className="flex flex-col gap-2" aria-label="Usuarios">
        {(usuarios.datos ?? []).map((u) => {
          const yo = u.id === perfil?.id
          return (
            <li key={u.id}>
              <Tarjeta>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">{u.nombre || u.email}</span>
                      <Activo activo={u.activo} />
                      {yo && <span className="text-xs text-slate-500">(vos)</span>}
                    </div>
                    <p className="text-sm text-slate-600">{u.email}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      aria-label={`Rol de ${u.nombre || u.email}`}
                      value={u.rol}
                      disabled={ocupado}
                      onChange={(e) => void ejecutar(() => actualizarUsuario(u.id, { rol: e.target.value as Rol }), 'Rol actualizado.')}
                      className="min-h-10 rounded-md border border-slate-300 bg-white px-2 text-sm"
                    >
                      {[...new Set([...ROLES, u.rol])].map((r) => <option key={r} value={r}>{NOMBRE_ROL[r]}</option>)}
                    </select>
                    <button
                      type="button"
                      className={claseBotonSec}
                      disabled={ocupado}
                      onClick={() =>
                        void ejecutar(
                          () => actualizarUsuario(u.id, { activo: !u.activo }),
                          u.activo ? 'Usuario dado de baja: ya no puede ver nada.' : 'Usuario reactivado.',
                        )
                      }
                    >
                      {u.activo ? 'Dar de baja' : 'Reactivar'}
                    </button>
                  </div>
                </div>
              </Tarjeta>
            </li>
          )
        })}
      </ul>
      <p className="text-sm text-slate-500">
        Un usuario dado de baja puede seguir ingresando, pero no ve ningún dato. No se puede quitar al último administrador.
      </p>
    </div>
  )
}
