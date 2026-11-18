import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from './AuthContext'
import { tieneAcceso, type Perfil } from './permisos'
import { Cargando } from '../components/Cargando'
import { SinAcceso } from '../pages/SinAcceso'

interface Props {
  children: ReactNode
  /** Si se indica, además de estar logueado hay que cumplir esta condición. */
  permitido?: (perfil: Perfil) => boolean
}

export function RequireAuth({ children, permitido }: Props) {
  const { cargando, session, perfil } = useAuth()
  const location = useLocation()

  if (cargando) return <Cargando />
  if (!session) return <Navigate to="/login" replace state={{ desde: location.pathname }} />
  if (!tieneAcceso(perfil)) return <SinAcceso />
  if (permitido && !permitido(perfil)) return <Navigate to="/" replace />

  return <>{children}</>
}
