import { RESPUESTAS, type Respuesta } from '../../lib/checklist'

const ESTILO_ELEGIDO: Record<Respuesta, string> = {
  si: 'border-green-600 bg-green-600 text-white',
  no: 'border-red-600 bg-red-600 text-white',
  na: 'border-slate-600 bg-slate-600 text-white',
}

interface Props {
  nombre: string
  etiqueta: string
  valor: Respuesta | undefined
  onChange: (r: Respuesta) => void
}

/** Sí / No / N/A como botones grandes, pensados para tocar con el dedo. */
export function BotonesRespuesta({ nombre, etiqueta, valor, onChange }: Props) {
  return (
    <div role="radiogroup" aria-label={etiqueta} className="grid grid-cols-3 gap-2">
      {RESPUESTAS.map((r) => {
        const elegido = valor === r.valor
        return (
          <label
            key={r.valor}
            className={
              'flex min-h-12 cursor-pointer select-none items-center justify-center rounded-lg border-2 text-base font-semibold ' +
              'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-slate-800 ' +
              (elegido ? ESTILO_ELEGIDO[r.valor] : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400')
            }
          >
            <input
              type="radio"
              name={nombre}
              value={r.valor}
              checked={elegido}
              onChange={() => onChange(r.valor)}
              className="sr-only"
            />
            {r.texto}
          </label>
        )
      })}
    </div>
  )
}
