import { describe, expect, it } from 'vitest'
import { esAdmin, puedeCargarExamenes, tieneAcceso } from './permisos'
import { perfil } from '../test/renderConAuth'

describe('permisos', () => {
  it('sin perfil no hay acceso', () => {
    expect(tieneAcceso(null)).toBe(false)
    expect(esAdmin(null)).toBe(false)
    expect(puedeCargarExamenes(null)).toBe(false)
  })

  it('un perfil dado de baja no tiene acceso, aunque sea admin', () => {
    const baja = perfil('admin', { activo: false })
    expect(tieneAcceso(baja)).toBe(false)
    expect(esAdmin(baja)).toBe(false)
    expect(puedeCargarExamenes(baja)).toBe(false)
  })

  it('admin puede todo', () => {
    expect(esAdmin(perfil('admin'))).toBe(true)
    expect(puedeCargarExamenes(perfil('admin'))).toBe(true)
  })

  it('seguridad solo lee', () => {
    expect(tieneAcceso(perfil('seguridad'))).toBe(true)
    expect(esAdmin(perfil('seguridad'))).toBe(false)
    expect(puedeCargarExamenes(perfil('seguridad'))).toBe(false)
  })

  it('evaluador todavía no carga exámenes (rol preparado, sin activar)', () => {
    expect(puedeCargarExamenes(perfil('evaluador'))).toBe(false)
    expect(esAdmin(perfil('evaluador'))).toBe(false)
  })
})
