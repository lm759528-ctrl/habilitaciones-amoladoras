import { NavLink, Outlet } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { NOMBRE_ROL, esAdmin, puedeCargarExamenes } from '../auth/permisos'
import { config } from '../lib/config'

function claseEnlace({ isActive }: { isActive: boolean }) {
  return (
    'rounded-md px-3 py-2 text-sm font-medium ' +
    (isActive ? 'bg-slate-200 text-slate-900' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900')
  )
}

export function Layout() {
  const { perfil, salir } = useAuth()

  return (
    <div className="min-h-dvh">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="text-base font-semibold text-slate-900">{config.appTitle}</span>
          <nav aria-label="Principal" className="order-last flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
            <NavLink to="/" end className={claseEnlace}>
              Habilitados
            </NavLink>
            {puedeCargarExamenes(perfil) && (
              <NavLink to="/examenes/nuevo" className={claseEnlace}>
                Nuevo examen
              </NavLink>
            )}
            {esAdmin(perfil) && (
              <NavLink to="/admin" className={claseEnlace}>
                Administración
              </NavLink>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            {perfil && (
              <span className="hidden text-right leading-tight text-slate-600 sm:block">
                <span className="block font-medium text-slate-800">{perfil.nombre || perfil.email}</span>
                <span className="block text-xs">{NOMBRE_ROL[perfil.rol]}</span>
              </span>
            )}
            <button
              type="button"
              onClick={() => void salir()}
              className="min-h-10 rounded-md border border-slate-300 px-3 font-medium text-slate-700 hover:bg-slate-100"
            >
              Salir
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
