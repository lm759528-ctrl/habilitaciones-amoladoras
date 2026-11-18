import { describe, expect, it } from 'vitest'
import type { Checklist } from './checklist'
import { armarRespuestas, calcularVencimiento, formVacio, itemsEnNo, validarExamen, type FormExamen } from './examen'

const checklist: Checklist = {
  version: 3,
  secciones: [
    { titulo: 'S1', items: [{ id: 'a', texto: 'Punto A' }, { id: 'b', texto: 'Punto B' }] },
    { titulo: 'S2', items: [{ id: 'c', texto: 'Punto C' }] },
  ],
}

function completo(extra: Partial<FormExamen> = {}): FormExamen {
  return {
    ...formVacio('2026-03-10', 'Carlos'),
    resultado: 'apto',
    fechaVencimiento: '2027-03-10',
    respuestas: {
      a: { respuesta: 'si', comentario: '' },
      b: { respuesta: 'na', comentario: 'No aplica' },
      c: { respuesta: 'si', comentario: '' },
    },
    ...extra,
  }
}

describe('calcularVencimiento (igual que en la base)', () => {
  it('anual: 12 meses', () => expect(calcularVencimiento('anual', '2026-03-10')).toBe('2027-03-10'))
  it('semestral: 6 meses', () => expect(calcularVencimiento('semestral', '2026-03-10')).toBe('2026-09-10'))
  it('ajusta a fin de mes', () => {
    expect(calcularVencimiento('semestral', '2026-08-31')).toBe('2027-02-28')
    expect(calcularVencimiento('anual', '2028-02-29')).toBe('2029-02-28')
  })
  it('cruza el año', () => expect(calcularVencimiento('semestral', '2026-11-18')).toBe('2027-05-18'))
  it('tarea puntual: la pone el admin', () => expect(calcularVencimiento('tarea_puntual', '2026-03-10')).toBe(''))
  it('sin fecha de inicio no calcula', () => expect(calcularVencimiento('anual', '')).toBe(''))
})

describe('formVacio', () => {
  it('arranca con la fecha de hoy, inicio igual al examen y vencimiento a 12 meses', () => {
    const f = formVacio('2026-11-18', 'Carlos')
    expect(f).toMatchObject({ fechaExamen: '2026-11-18', fechaInicio: '2026-11-18', fechaVencimiento: '2027-11-18', tipo: 'anual', controlo: 'Carlos' })
  })
})

describe('validarExamen', () => {
  it('un examen completo no tiene errores', () => {
    expect(validarExamen(completo(), checklist)).toEqual({})
  })

  it('pide fecha, quién controló y resultado', () => {
    const e = validarExamen(completo({ fechaExamen: '', controlo: '  ', resultado: '' }), checklist)
    expect(Object.keys(e).sort()).toEqual(['controlo', 'fechaExamen', 'resultado'])
  })

  it('pide responder todos los puntos', () => {
    const e = validarExamen(completo({ respuestas: { a: { respuesta: 'si', comentario: '' } } }), checklist)
    expect(e.checklist).toBe('Faltan responder 2 puntos de la checklist.')
  })

  it('tarea puntual pide descripción y fecha de fin', () => {
    const e = validarExamen(completo({ tipo: 'tarea_puntual', descripcionTarea: '', fechaVencimiento: '' }), checklist)
    expect(e.descripcionTarea).toBeDefined()
    expect(e.fechaVencimiento).toBeDefined()
  })

  it('el vencimiento no puede ser anterior al inicio', () => {
    const e = validarExamen(completo({ fechaInicio: '2026-03-10', fechaVencimiento: '2026-03-09' }), checklist)
    expect(e.fechaVencimiento).toMatch(/anterior/)
  })

  it('tarea puntual puede vencer el mismo día', () => {
    expect(validarExamen(completo({ tipo: 'tarea_puntual', descripcionTarea: 'Corte', fechaVencimiento: '2026-03-10' }), checklist)).toEqual({})
  })

  it('un No apto no pide fechas de vigencia', () => {
    expect(validarExamen(completo({ resultado: 'no_apto', fechaInicio: '', fechaVencimiento: '' }), checklist)).toEqual({})
  })
})

describe('itemsEnNo', () => {
  it('lista los puntos respondidos con No', () => {
    const f = completo()
    f.respuestas.c = { respuesta: 'no', comentario: '' }
    expect(itemsEnNo(f, checklist).map((i) => i.texto)).toEqual(['Punto C'])
  })
})

describe('armarRespuestas', () => {
  it('guarda una copia de la checklist con textos, respuestas y comentarios', () => {
    expect(armarRespuestas(completo(), checklist)).toEqual({
      version: 3,
      secciones: [
        {
          titulo: 'S1',
          items: [
            { id: 'a', texto: 'Punto A', respuesta: 'si', comentario: '' },
            { id: 'b', texto: 'Punto B', respuesta: 'na', comentario: 'No aplica' },
          ],
        },
        { titulo: 'S2', items: [{ id: 'c', texto: 'Punto C', respuesta: 'si', comentario: '' }] },
      ],
    })
  })
})
