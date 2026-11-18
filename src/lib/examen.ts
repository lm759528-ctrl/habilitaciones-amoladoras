import { CHECKLIST, type Checklist, type ItemChecklist, type Respuesta, type RespuestasGuardadas } from './checklist'
import type { Resultado, TipoHabilitacion } from './habilitaciones'

export interface FormExamen {
  /** Fechas en formato aaaa-mm-dd (lo que usa <input type="date">). */
  fechaExamen: string
  controlo: string
  tipo: TipoHabilitacion
  descripcionTarea: string
  fechaInicio: string
  fechaVencimiento: string
  resultado: Resultado | ''
  observaciones: string
  respuestas: Record<string, { respuesta?: Respuesta; comentario: string }>
}

export type ErroresExamen = Partial<Record<keyof FormExamen | 'checklist', string>>

function diasDelMes(anio: number, mes: number): number {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate()
}

/**
 * Misma regla que private.calcular_vencimiento() en la base: anual +12 meses,
 * semestral +6, y si el día no existe en ese mes, el último día del mes.
 */
export function calcularVencimiento(tipo: TipoHabilitacion, inicio: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(inicio)
  if (!m || tipo === 'tarea_puntual') return ''
  const meses = tipo === 'anual' ? 12 : 6
  const total = Number(m[2]) - 1 + meses
  const anio = Number(m[1]) + Math.floor(total / 12)
  const mes = (total % 12) + 1
  const dia = Math.min(Number(m[3]), diasDelMes(anio, mes))
  return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

export function formVacio(hoy: string, controlo: string): FormExamen {
  return {
    fechaExamen: hoy,
    controlo,
    tipo: 'anual',
    descripcionTarea: '',
    fechaInicio: hoy,
    fechaVencimiento: calcularVencimiento('anual', hoy),
    resultado: '',
    observaciones: '',
    respuestas: {},
  }
}

export function validarExamen(f: FormExamen, checklist: Checklist = CHECKLIST): ErroresExamen {
  const e: ErroresExamen = {}
  if (!f.fechaExamen) e.fechaExamen = 'Indicá la fecha del examen.'
  if (!f.controlo.trim()) e.controlo = 'Indicá quién controló.'
  if (!f.resultado) e.resultado = 'Indicá el resultado.'
  if (f.tipo === 'tarea_puntual' && !f.descripcionTarea.trim()) e.descripcionTarea = 'Describí la tarea.'

  if (f.resultado === 'apto') {
    if (!f.fechaInicio) e.fechaInicio = 'Indicá desde cuándo vale.'
    if (!f.fechaVencimiento) {
      e.fechaVencimiento = f.tipo === 'tarea_puntual' ? 'Indicá la fecha de fin de la tarea.' : 'Indicá el vencimiento.'
    } else if (f.fechaInicio && f.fechaVencimiento < f.fechaInicio) {
      e.fechaVencimiento = 'El vencimiento no puede ser anterior al inicio.'
    }
  }

  const faltan = checklist.secciones.flatMap((s) => s.items).filter((i) => !f.respuestas[i.id]?.respuesta).length
  if (faltan) e.checklist = `Faltan responder ${faltan} ${faltan === 1 ? 'punto' : 'puntos'} de la checklist.`
  return e
}

export function itemsEnNo(f: FormExamen, checklist: Checklist = CHECKLIST): ItemChecklist[] {
  return checklist.secciones.flatMap((s) => s.items).filter((i) => f.respuestas[i.id]?.respuesta === 'no')
}

export function armarRespuestas(f: FormExamen, checklist: Checklist = CHECKLIST): RespuestasGuardadas {
  return {
    version: checklist.version,
    secciones: checklist.secciones.map((s) => ({
      titulo: s.titulo,
      items: s.items.map((i) => ({
        id: i.id,
        texto: i.texto,
        respuesta: f.respuestas[i.id]!.respuesta!,
        comentario: f.respuestas[i.id]?.comentario.trim() ?? '',
      })),
    })),
  }
}
