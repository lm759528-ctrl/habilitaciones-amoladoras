import type { ReactNode } from 'react'

export const claseInput = 'min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-base'
export const claseBotonSec =
  'min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50'

export function Etiqueta({ texto, children }: { texto: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
      {texto}
      {children}
    </label>
  )
}

export function Tarjeta({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">{children}</div>
}

export function Activo({ activo }: { activo: boolean }) {
  return activo ? (
    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">Activo</span>
  ) : (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">De baja</span>
  )
}
