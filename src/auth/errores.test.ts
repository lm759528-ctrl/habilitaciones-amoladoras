import { describe, expect, it } from 'vitest'
import { mensajeDeError } from './errores'

describe('mensajeDeError', () => {
  it('traduce credenciales inválidas', () => {
    expect(mensajeDeError({ code: 'invalid_credentials', message: 'Invalid login credentials' })).toBe(
      'El email o la contraseña no son correctos.',
    )
  })

  it('traduce el límite de intentos por status 429', () => {
    expect(mensajeDeError({ status: 429 })).toMatch(/Demasiados intentos/)
  })

  it('avisa si no hay conexión', () => {
    expect(mensajeDeError(new TypeError('Failed to fetch'))).toMatch(/conexión/)
  })

  it('nunca muestra el mensaje técnico en inglés', () => {
    expect(mensajeDeError({ message: 'Database error querying schema' })).toBe(
      'Ocurrió un error inesperado. Probá de nuevo.',
    )
    expect(mensajeDeError(undefined)).toBe('Ocurrió un error inesperado. Probá de nuevo.')
  })
})
