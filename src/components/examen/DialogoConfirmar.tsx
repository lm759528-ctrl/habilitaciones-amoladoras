import { useEffect, useRef, type ReactNode } from 'react'

interface Props {
  titulo: string
  children: ReactNode
  confirmar: string
  cancelar: string
  onConfirmar: () => void
  onCancelar: () => void
}

export function DialogoConfirmar({ titulo, children, confirmar, cancelar, onConfirmar, onCancelar }: Props) {
  const botonCancelar = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    botonCancelar.current?.focus()
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && onCancelar()
    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  }, [onCancelar])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialogo-titulo"
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
      >
        <h2 id="dialogo-titulo" className="text-lg font-semibold text-slate-900">{titulo}</h2>
        <div className="mt-3 text-slate-700">{children}</div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={botonCancelar}
            type="button"
            onClick={onCancelar}
            className="min-h-11 rounded-lg border border-slate-300 px-4 font-medium text-slate-700 hover:bg-slate-100"
          >
            {cancelar}
          </button>
          <button type="button" onClick={onConfirmar} className="min-h-11 rounded-lg bg-slate-800 px-4 font-medium text-white hover:bg-slate-700">
            {confirmar}
          </button>
        </div>
      </div>
    </div>
  )
}
