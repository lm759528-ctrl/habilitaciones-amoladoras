import { describe, expect, it } from 'vitest'
import { mensajeErrorAdmin } from './admin'

describe('mensajeErrorAdmin', () => {
  it('traduce duplicados y permisos', () => {
    expect(mensajeErrorAdmin({ code: '23505' })).toMatch(/Ya existe/)
    expect(mensajeErrorAdmin({ code: '42501' })).toMatch(/permiso/)
  })
  it('muestra el motivo de los triggers de la base', () => {
    expect(mensajeErrorAdmin({ code: 'P0001', message: 'No se puede quitar el último administrador activo' })).toBe(
      'No se puede quitar el último administrador activo',
    )
  })
  it('muestra el mensaje de la Edge Function', () => {
    expect(mensajeErrorAdmin(new Error('Ya existe un usuario con ese email.'))).toBe('Ya existe un usuario con ese email.')
  })
})
