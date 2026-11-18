import { describe, expect, it } from 'vitest'
import { validarPedido } from './validar'

describe('validarPedido', () => {
  it('acepta un pedido válido y normaliza el email', () => {
    expect(validarPedido({ email: ' Ana@Planta.com ', nombre: ' Ana ', rol: 'seguridad' })).toEqual({
      ok: true,
      pedido: { email: 'ana@planta.com', nombre: 'Ana', rol: 'seguridad' },
    })
  })
  it('rechaza email inválido, nombre vacío y roles no habilitados', () => {
    expect(validarPedido({ email: 'x', nombre: 'A', rol: 'admin' })).toMatchObject({ ok: false })
    expect(validarPedido({ email: 'a@b.com', nombre: '', rol: 'admin' })).toMatchObject({ ok: false })
    expect(validarPedido({ email: 'a@b.com', nombre: 'A', rol: 'evaluador' })).toMatchObject({ ok: false })
    expect(validarPedido(null)).toMatchObject({ ok: false })
  })
})
