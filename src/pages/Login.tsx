import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { mensajeDeError } from '../auth/errores'
import { Aviso, Boton, Campo, PantallaCentrada } from '../components/ui'
import { config } from '../lib/config'

export function Login() {
  const { session, cargando, ingresar } = useAuth()
  const location = useLocation()
  const desde = (location.state as { desde?: string } | null)?.desde ?? '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (session && !cargando) return <Navigate to={desde} replace />

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      await ingresar(email, password)
    } catch (err) {
      setError(mensajeDeError(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <PantallaCentrada titulo={config.appTitle}>
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
        <Campo
          id="password"
          etiqueta="Contraseña"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <Aviso tipo="error">{error}</Aviso>}
        <Boton type="submit" disabled={enviando || !email || !password}>
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </Boton>
        <Link to="/recuperar" className="text-center text-sm text-slate-600 underline underline-offset-2">
          Olvidé mi contraseña
        </Link>
      </form>
    </PantallaCentrada>
  )
}
