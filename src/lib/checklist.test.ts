import { describe, expect, it } from 'vitest'
import { CHECKLIST, totalItems, validarChecklist } from './checklist'

describe('checklist de configuración', () => {
  it('tiene las 6 secciones y los 27 puntos de la planilla', () => {
    expect(CHECKLIST.secciones.map((s) => s.titulo)).toEqual([
      'Inspección previa',
      'Chequeo de disco',
      'Chequeo de accesorio',
      'Instalación del disco en la amoladora',
      'Utilización / posición de trabajo',
      'EPP necesarios / estado',
    ])
    expect(totalItems()).toBe(27)
  })

  it('es válida', () => {
    expect(validarChecklist(CHECKLIST)).toEqual([])
  })

  it('detecta ids repetidos y secciones vacías', () => {
    expect(
      validarChecklist({
        version: 1,
        secciones: [
          { titulo: 'A', items: [{ id: 'x', texto: 'uno' }, { id: 'x', texto: 'dos' }] },
          { titulo: 'B', items: [] },
        ],
      }),
    ).toEqual(['El id "x" está repetido', 'La sección "B" no tiene puntos'])
  })
})
