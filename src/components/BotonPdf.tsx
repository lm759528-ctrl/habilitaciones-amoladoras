import { useState } from 'react'
import { linkFirmadoPdf } from '../lib/datos'

/**
 * Abre el PDF con un link firmado que vence. La pestaña se abre antes de pedir
 * el link porque los celulares bloquean ventanas abiertas después de un await.
 */
export function BotonPdf({ path, className = '' }: { path: string | null; className?: string }) {
  const [abriendo, setAbriendo] = useState(false)
  const [error, setError] = useState(false)

  if (!path) {
    return <span className={`text-sm text-slate-400 ${className}`}>Sin PDF</span>
  }

  async function abrir() {
    setError(false)
    setAbriendo(true)
    const ventana = window.open('', '_blank')
    try {
      const url = await linkFirmadoPdf(path!)
      if (ventana) ventana.location.href = url
      else window.location.assign(url)
    } catch {
      ventana?.close()
      setError(true)
    } finally {
      setAbriendo(false)
    }
  }

  return (
    <span className={`inline-flex flex-col items-start ${className}`}>
      <button
        type="button"
        onClick={() => void abrir()}
        disabled={abriendo}
        className="min-h-9 whitespace-nowrap rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
      >
        {abriendo ? 'Abriendo…' : 'Ver PDF'}
      </button>
      {error && <span role="alert" className="mt-1 text-xs text-red-700">No se pudo abrir el PDF.</span>}
    </span>
  )
}
