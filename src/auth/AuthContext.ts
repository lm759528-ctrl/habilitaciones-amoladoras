import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Perfil } from './permisos'

export interface EstadoAuth {
  /** true mientras se recupera la sesión guardada y el perfil. */
  cargando: boolean
  session: Session | null
  /** null si no hay sesión o si el usuario no tiene perfil en la base. */
  perfil: Perfil | null
  ingresar: (email: string, password: string) => Promise<void>
  salir: () => Promise<void>
}

export const AuthContext = createContext<EstadoAuth | null>(null)

export function useAuth(): EstadoAuth {
  const valor = useContext(AuthContext)
  if (!valor) throw new Error('useAuth tiene que usarse dentro de <AuthProvider>')
  return valor
}
