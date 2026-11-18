import { Aviso } from './ui'

export function ErrorCarga({ recargar }: { recargar: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <Aviso tipo="error">No se pudieron cargar los datos. Revisá tu conexión.</Aviso>
      <button type="button" onClick={recargar} className="text-sm font-medium text-slate-700 underline underline-offset-2">
        Reintentar
      </button>
    </div>
  )
}
