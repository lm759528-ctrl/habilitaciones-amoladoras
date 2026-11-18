import { describe, expect, it } from 'vitest'
import { formatearFecha, hoyAR, textoDiasRestantes } from './fechas'

describe('formatearFecha', () => {
  it('muestra dd/mm/aaaa', () => {
    expect(formatearFecha('2026-03-05')).toBe('05/03/2026')
  })
  it('no corre la fecha un día por la zona horaria', () => {
    expect(formatearFecha('2026-01-01')).toBe('01/01/2026')
  })
  it('acepta un timestamp y lo muestra en hora de Buenos Aires', () => {
    // 02:00 UTC del 1/1 son las 23:00 del 31/12 en Argentina
    expect(formatearFecha('2026-01-01T02:00:00Z')).toBe('31/12/2025')
  })
  it('vacío para null', () => {
    expect(formatearFecha(null)).toBe('')
  })
})

describe('textoDiasRestantes', () => {
  it.each([
    [null, ''],
    [0, 'Vence hoy'],
    [1, '1 día'],
    [30, '30 días'],
    [-1, 'Venció hace 1 día'],
    [-5, 'Venció hace 5 días'],
  ])('%s → %s', (dias, texto) => {
    expect(textoDiasRestantes(dias)).toBe(texto)
  })
})

describe('hoyAR', () => {
  it('usa la fecha de Argentina, no la de UTC', () => {
    expect(hoyAR(new Date('2026-11-19T02:30:00Z'))).toBe('2026-11-18')
    expect(hoyAR(new Date('2026-11-19T03:30:00Z'))).toBe('2026-11-19')
  })
})
