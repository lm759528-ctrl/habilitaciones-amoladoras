import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { mensajeDeError } from '../auth/errores'
import { Aviso, Boton, Campo, PantallaCentrada } from '../components/ui'
import { supabase } from '../lib/supabase'

export function RecuperarContrasena() {
  const [email, setEmail] = useState('')
  const [estado, setEstado] = useState<'inicio' | 'enviando' | 'enviado'>('inicio')
  const [error, setError] = useState<string | null>(null)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setEstado('enviando')
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/nueva-contrasena`,
    })
    if (error) {
      setError(mensajeDeError(error))
      setEstado('inicio')
      return
    }
    setEstado('enviado')
  }

  return (
    <PantallaCentrada titulo="Recuperar contraseña">
      {estado === 'enviado' ? (
        <div className="flex flex-col gap-4">
          {/* Mismo mensaje exista o no el email, para no revelar quién tiene usuario. */}
          <Aviso tipo="ok">Si el email tiene un usuario, te llegó un link para elegir una contraseña nueva.</Aviso>
          <Link to="/login" className="text-center text-sm text-slate-600 underline underline-offset-2">
            Volver al ingreso
          </Link>
        </div>
      ) : (
        <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
          <Campo
            id="email"
            etiqueta="Email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error && <Aviso tipo="error">{error}</Aviso>}
          <Boton type="submit" disabled={estado === 'enviando' || !email}>
            {estado === 'enviando' ? 'Enviando…' : 'Enviar link'}
          </Boton>
          <Link to="/login" className="text-center text-sm text-slate-600 underline underline-offset-2">
            Volver al ingreso
          </Link>
        </form>
      )}
    </PantallaCentrada>
  )
}
