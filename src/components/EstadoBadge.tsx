import { ESTADOS, type Estado } from '../lib/habilitaciones'

export function EstadoBadge({ estado }: { estado: Estado }) {
  const { texto, clases } = ESTADOS[estado]
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${clases}`}>
      {texto}
    </span>
  )
}
