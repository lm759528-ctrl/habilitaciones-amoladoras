import { useState } from 'react'
import type { Respuesta, SeccionChecklist as Seccion } from '../../lib/checklist'
import type { FormExamen } from '../../lib/examen'
import { BotonesRespuesta } from './BotonesRespuesta'

interface Props {
  seccion: Seccion
  respuestas: FormExamen['respuestas']
  marcarFaltantes: boolean
  onRespuesta: (id: string, r: Respuesta) => void
  onComentario: (id: string, c: string) => void
}

export function SeccionChecklist({ seccion, respuestas, marcarFaltantes, onRespuesta, onComentario }: Props) {
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({})
  const respondidas = seccion.items.filter((i) => respuestas[i.id]?.respuesta).length

  return (
    <fieldset className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <legend className="sr-only">{seccion.titulo}</legend>
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h3 className="font-semibold text-slate-900" aria-hidden>{seccion.titulo}</h3>
        <span className={`text-sm ${respondidas === seccion.items.length ? 'text-green-700' : 'text-slate-500'}`}>
          {respondidas}/{seccion.items.length}
        </span>
      </div>
      <ol className="divide-y divide-slate-100">
        {seccion.items.map((item) => {
          const r = respuestas[item.id]
          const falta = marcarFaltantes && !r?.respuesta
          const conComentario = abiertos[item.id] || !!r?.comentario
          return (
            <li key={item.id} className={`flex flex-col gap-3 px-4 py-4 ${falta ? 'bg-red-50' : ''}`}>
              <p className="text-slate-800">
                {item.texto}
                {falta && <span className="ml-2 text-sm font-medium text-red-700">Falta responder</span>}
              </p>
              <BotonesRespuesta
                nombre={item.id}
                etiqueta={item.texto}
                valor={r?.respuesta}
                onChange={(v) => onRespuesta(item.id, v)}
              />
              {conComentario ? (
                <label className="flex flex-col gap-1 text-sm text-slate-600">
                  Comentario
                  <input
                    type="text"
                    value={r?.comentario ?? ''}
                    onChange={(e) => onComentario(item.id, e.target.value)}
                    className="min-h-11 rounded-lg border border-slate-300 px-3 text-base text-slate-900"
                    autoFocus={abiertos[item.id] && !r?.comentario}
                  />
                </label>
              ) : (
                <button
                  type="button"
                  onClick={() => setAbiertos((a) => ({ ...a, [item.id]: true }))}
                  className="self-start text-sm text-slate-600 underline underline-offset-2"
                >
                  Agregar comentario
                </button>
              )}
            </li>
          )
        })}
      </ol>
    </fieldset>
  )
}
