import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

export function Boton({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={
        'inline-flex min-h-11 items-center justify-center rounded-lg bg-slate-800 px-4 font-medium text-white ' +
        'hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-800 ' +
        'disabled:cursor-not-allowed disabled:opacity-60 ' +
        className
      }
      {...props}
    />
  )
}

interface CampoProps extends InputHTMLAttributes<HTMLInputElement> {
  etiqueta: string
  id: string
}

export function Campo({ etiqueta, id, className = '', ...props }: CampoProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {etiqueta}
      </label>
      <input
        id={id}
        className={
          'min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-base ' +
          'focus:border-slate-500 focus:outline-2 focus:outline-slate-300 ' +
          className
        }
        {...props}
      />
    </div>
  )
}

export function Aviso({ tipo, children }: { tipo: 'error' | 'ok'; children: ReactNode }) {
  const estilos = tipo === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-green-200 bg-green-50 text-green-800'
  return (
    <p role={tipo === 'error' ? 'alert' : 'status'} className={`rounded-lg border px-3 py-2 text-sm ${estilos}`}>
      {children}
    </p>
  )
}

/** Tarjeta centrada para login y pantallas sueltas. */
export function PantallaCentrada({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-6 text-xl font-semibold text-slate-900">{titulo}</h1>
        {children}
      </div>
    </main>
  )
}
