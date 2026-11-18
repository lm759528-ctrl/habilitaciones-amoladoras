import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { AuthContext, type EstadoAuth } from './AuthContext'
import type { Perfil } from './permisos'

async function buscarPerfil(userId: string): Promise<Perfil | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nombre, email, rol, activo')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let activo = true

    async function aplicarSesion(nueva: Session | null) {
      if (!activo) return
      setSession(nueva)
      if (!nueva) {
        setPerfil(null)
        setCargando(false)
        return
      }
      try {
        const p = await buscarPerfil(nueva.user.id)
        if (activo) setPerfil(p)
      } catch {
        if (activo) setPerfil(null)
      } finally {
        if (activo) setCargando(false)
      }
    }

    // onAuthStateChange emite INITIAL_SESSION al suscribirse, así que no hace
    // falta llamar a getSession(). No se puede await dentro del callback (bloquea
    // al cliente), por eso el perfil se busca fuera del ciclo con setTimeout.
    const { data } = supabase.auth.onAuthStateChange((evento, nueva) => {
      if (evento === 'TOKEN_REFRESHED') {
        setSession(nueva)
        return
      }
      setTimeout(() => void aplicarSesion(nueva), 0)
    })

    return () => {
      activo = false
      data.subscription.unsubscribe()
    }
  }, [])

  const ingresar = useCallback(async (email: string, password: string) => {
    setCargando(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) {
      setCargando(false)
      throw error
    }
  }, [])

  const salir = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const valor = useMemo<EstadoAuth>(
    () => ({ cargando, session, perfil, ingresar, salir }),
    [cargando, session, perfil, ingresar, salir],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}
