import { describe, expect, it } from 'vitest'
import { validarContrasena } from './NuevaContrasena'

describe('validarContrasena', () => {
  it('exige al menos 8 caracteres', () => {
    expect(validarContrasena('1234567', '1234567')).toMatch(/al menos 8/)
  })
  it('exige que coincidan', () => {
    expect(validarContrasena('12345678', '12345679')).toMatch(/no coinciden/)
  })
  it('acepta una contraseña válida', () => {
    expect(validarContrasena('una-clave-larga', 'una-clave-larga')).toBeNull()
  })
})
