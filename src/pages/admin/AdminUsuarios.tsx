import { useState, type FormEvent } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { NOMBRE_ROL, type Rol } from '../../auth/permisos'
import { Cargando } from '../../components/Cargando'
import { ErrorCarga } from '../../components/ErrorCarga'
import { Aviso, Boton } from '../../components/ui'
import { actualizarUsuario, invitarUsuario, mensajeErrorAdmin, obtenerUsuarios } from '../../lib/admin'
import { useConsulta } from '../../lib/useConsulta'
import { Activo, Etiqueta, Tarjeta, claseBotonSec, claseInput } from './comunes'

/** Roles que se pueden asignar hoy. 'evaluador' queda para más adelante. */
const ROLES: Rol[] = ['admin', 'seguridad']

export function AdminUsuarios() {
  const { perfil } = useAuth()
  const usuarios = useConsulta(obtenerUsuarios, [])
  const [invitacion, setInvitacion] = useState({ email: '', nombre: '', rol: 'seguridad' as Rol })
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function ejecutar(accion: () => Promise<void>, ok: string) {
    setMensaje(null)
    setOcupado(true)
    try {
      await accion()
      usuarios.recargar()
      setMensaje({ tipo: 'ok', texto: ok })
      return true
    } catch (e) {
      setMensaje({ tipo: 'error', texto: mensajeErrorAdmin(e) })
      return false
    } finally {
      setOcupado(false)
    }
  }

  async function invitar(e: FormEvent) {
    e.preventDefault()
    const listo = await ejecutar(
      () => invitarUsuario(invitacion),
      `Se mandó la invitación a ${invitacion.email}. Va a recibir un link para elegir su contraseña.`,
    )
    if (listo) setInvitacion({ email: '', nombre: '', rol: 'seguridad' })
  }

  if (usuarios.cargando && !usuarios.datos) return <Cargando />
  if (usuarios.error) return <ErrorCarga recargar={usuarios.recargar} />

  return (
    <div className="flex flex-col gap-4">
      <Tarjeta>
        <form onSubmit={invitar} className="flex flex-col gap-3">
          <h3 className="font-semibold text-slate-900">Invitar usuario</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <Etiqueta texto="Email">
              <input type="email" required value={invitacion.email} onChange={(e) => setInvitacion({ ...invitacion, email: e.target.value })} className={claseInput} />
            </Etiqueta>
            <Etiqueta texto="Nombre">
              <input required value={invitacion.nombre} onChange={(e) => setInvitacion({ ...invitacion, nombre: e.target.value })} className={claseInput} />
            </Etiqueta>
            <Etiqueta texto="Rol">
              <select value={invitacion.rol} onChange={(e) => setInvitacion({ ...invitacion, rol: e.target.value as Rol })} className={claseInput}>
                {ROLES.map((r) => <option key={r} value={r}>{NOMBRE_ROL[r]}</option>)}
              </select>
            </Etiqueta>
          </div>
          <Boton type="submit" disabled={ocupado || !invitacion.email.trim() || !invitacion.nombre.trim()} className="self-start">
            {ocupado ? 'Enviando…' : 'Enviar invitación'}
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
