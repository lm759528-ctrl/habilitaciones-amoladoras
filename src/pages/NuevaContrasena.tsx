import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { mensajeDeError } from '../auth/errores'
import { Cargando } from '../components/Cargando'
import { Aviso, Boton, Campo, PantallaCentrada } from '../components/ui'
import { supabase } from '../lib/supabase'

export const LARGO_MINIMO = 8

/** Error de validación o null si la contraseña sirve. */
export function validarContrasena(password: string, repetida: string): string | null {
  if (password.length < LARGO_MINIMO) return `La contraseña tiene que tener al menos ${LARGO_MINIMO} caracteres.`
  if (password !== repetida) return 'Las contraseñas no coinciden.'
  return null
}

/**
 * Destino de los links de invitación y de recuperación: el link trae la sesión
 * y acá el usuario elige su contraseña.
 */
export function NuevaContrasena() {
  const { cargando, session } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [repetida, setRepetida] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (cargando) return <Cargando />

  if (!session) {
    return (
      <PantallaCentrada titulo="Link vencido">
        <div className="flex flex-col gap-4">
          <Aviso tipo="error">El link ya se usó o venció. Pedí uno nuevo.</Aviso>
          <Link to="/recuperar" className="text-center text-sm text-slate-600 underline underline-offset-2">
            Pedir un link nuevo
          </Link>
        </div>
      </PantallaCentrada>
    )
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const invalida = validarContrasena(password, repetida)
    if (invalida) {
      setError(invalida)
      return
    }
    setError(null)
    setEnviando(true)
    const { error } = await supabase.auth.updateUser({ password })
    setEnviando(false)
    if (error) {
      setError(mensajeDeError(error))
      return
    }
    navigate('/', { replace: true })
  }

  return (
    <PantallaCentrada titulo="Elegí tu contraseña">
      <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
        <p className="text-sm text-slate-600">Usuario: {session.user.email}</p>
        <Campo
          id="password"
          etiqueta={`Contraseña nueva (mínimo ${LARGO_MINIMO} caracteres)`}
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Campo
          id="repetida"
          etiqueta="Repetí la contraseña"
          type="password"
          autoComplete="new-password"
          required
          value={repetida}
          onChange={(e) => setRepetida(e.target.value)}
        />
        {error && <Aviso tipo="error">{error}</Aviso>}
        <Boton type="submit" disabled={enviando}>
          {enviando ? 'Guardando…' : 'Guardar contraseña'}
        </Boton>
      </form>
    </PantallaCentrada>
  )
}
