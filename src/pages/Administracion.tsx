import { useSearchParams } from 'react-router'
import { AdminEmpresas } from './admin/AdminEmpresas'
import { AdminPersonas } from './admin/AdminPersonas'
import { AdminUsuarios } from './admin/AdminUsuarios'

const SECCIONES = [
  { id: 'personas', titulo: 'Personas', componente: AdminPersonas },
  { id: 'empresas', titulo: 'Empresas', componente: AdminEmpresas },
  { id: 'usuarios', titulo: 'Usuarios', componente: AdminUsuarios },
] as const

export function Administracion() {
  const [params, setParams] = useSearchParams()
  const actual = SECCIONES.find((s) => s.id === params.get('seccion')) ?? SECCIONES[0]
  const Componente = actual.componente

  return (
    <section className="mx-auto flex max-w-4xl flex-col gap-5">
      <h1 className="text-2xl font-semibold text-slate-900">Administración</h1>
      <div role="tablist" aria-label="Secciones" className="flex gap-1 rounded-lg bg-slate-100 p-1">
        {SECCIONES.map((s) => (
          <button
            key={s.id}
            role="tab"
            type="button"
            aria-selected={s.id === actual.id}
            onClick={() => setParams({ seccion: s.id })}
            className={
              'min-h-10 flex-1 rounded-md px-3 text-sm font-medium ' +
              (s.id === actual.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900')
            }
          >
            {s.titulo}
          </button>
        ))}
      </div>
      <div role="tabpanel" aria-label={actual.titulo}>
        <Componente />
      </div>
    </section>
  )
}
