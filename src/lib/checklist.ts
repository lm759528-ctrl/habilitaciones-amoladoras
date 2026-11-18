import config from '../config/checklist.json'

export type Respuesta = 'si' | 'no' | 'na'

export interface ItemChecklist {
  id: string
  texto: string
}

export interface SeccionChecklist {
  titulo: string
  items: ItemChecklist[]
}

export interface Checklist {
  version: number
  secciones: SeccionChecklist[]
}

/** Lo que se guarda en examenes.respuestas: una copia de la checklist con lo respondido. */
export interface RespuestasGuardadas {
  version: number
  secciones: {
    titulo: string
    items: (ItemChecklist & { respuesta: Respuesta; comentario: string })[]
  }[]
}

export const RESPUESTAS: { valor: Respuesta; texto: string }[] = [
  { valor: 'si', texto: 'Sí' },
  { valor: 'no', texto: 'No' },
  { valor: 'na', texto: 'N/A' },
]

/** Revisa que el archivo de configuración esté bien armado. */
export function validarChecklist(c: Checklist): string[] {
  const errores: string[] = []
  const ids = new Set<string>()
  if (!Number.isInteger(c.version) || c.version < 1) errores.push('"version" tiene que ser un entero mayor a 0')
  if (!c.secciones?.length) errores.push('No hay secciones')
  for (const s of c.secciones ?? []) {
    if (!s.titulo?.trim()) errores.push('Hay una sección sin título')
    if (!s.items?.length) errores.push(`La sección "${s.titulo}" no tiene puntos`)
    for (const i of s.items ?? []) {
      if (!i.id?.trim() || !i.texto?.trim()) errores.push(`Hay un punto sin id o sin texto en "${s.titulo}"`)
      if (ids.has(i.id)) errores.push(`El id "${i.id}" está repetido`)
      ids.add(i.id)
    }
  }
  return errores
}

const errores = validarChecklist(config)
if (errores.length) throw new Error(`src/config/checklist.json tiene errores: ${errores.join('; ')}`)

export const CHECKLIST: Checklist = config

export function totalItems(c: Checklist = CHECKLIST): number {
  return c.secciones.reduce((n, s) => n + s.items.length, 0)
}
