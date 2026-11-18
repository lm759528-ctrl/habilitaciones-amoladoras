import { render } from '@testing-library/react'
import type { Session } from '@supabase/supabase-js'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router'
import { vi } from 'vitest'
import { AuthContext, type EstadoAuth } from '../auth/AuthContext'
import type { Perfil, Rol } from '../auth/permisos'

export function perfil(rol: Rol, extra: Partial<Perfil> = {}): Perfil {
  return { id: 'u1', nombre: 'Usuario Test', email: 'test@test.local', rol, activo: true, ...extra }
}

export const sesion = { user: { id: 'u1', email: 'test@test.local' } } as unknown as Session

export function renderConAuth(ui: ReactElement, auth: Partial<EstadoAuth> = {}, ruta = '/') {
  const valor: EstadoAuth = {
    cargando: false,
    session: null,
    perfil: null,
    ingresar: vi.fn(async () => {}),
    salir: vi.fn(async () => {}),
    ...auth,
  }
  return {
    auth: valor,
    ...render(
      <AuthContext.Provider value={valor}>
        <MemoryRouter initialEntries={[ruta]}>{ui}</MemoryRouter>
      </AuthContext.Provider>,
    ),
  }
}
