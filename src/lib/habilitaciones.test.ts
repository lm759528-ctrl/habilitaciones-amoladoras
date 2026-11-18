import { describe, expect, it } from 'vitest'
import { aCsv, filtrar, normalizar, resumen, type Habilitacion } from './habilitaciones'

function hab(extra: Partial<Habilitacion>): Habilitacion {
  return {
    persona_id: 'p',
    nombre: 'Juan',
    apellido: 'Pérez',
    dni: '30111222',
    persona_activa: true,
    empresa_id: 'e1',
    empresa_nombre: 'Contratista Uno',
    examen_id: 'x',
    fecha_examen: '2026-01-10',
    controlo: 'Evaluador',
    resultado: 'apto',
    tipo_habilitacion: 'anual',
    descripcion_tarea: null,
    fecha_inicio: '2026-01-10',
    fecha_vencimiento: '2027-01-10',
    dias_restantes: 100,
    estado: 'vigente',
    pdf_path: null,
    ...extra,
  }
}

const lista = [
  hab({ persona_id: '1', nombre: 'José', apellido: 'Núñez', dni: '20111222', estado: 'vigente' }),
  hab({ persona_id: '2', nombre: 'Ana', apellido: 'Gómez', dni: '30999888', estado: 'por_vencer', empresa_id: 'e2' }),
  hab({ persona_id: '3', nombre: 'Luis', apellido: 'Paz', dni: '25000111', estado: 'vencido' }),
  hab({ persona_id: '4', nombre: 'Eva', apellido: 'Sosa', dni: '40000111', estado: 'no_apto', resultado: 'no_apto' }),
]

describe('normalizar', () => {
  it('ignora mayúsculas, acentos y puntos', () => {
    expect(normalizar('JOSÉ Núñez 20.111.222')).toBe('jose nunez 20111222')
  })
})

describe('filtrar', () => {
  it('sin filtros devuelve todo', () => {
    expect(filtrar(lista, {})).toHaveLength(4)
  })
  it('busca por nombre o apellido sin importar acentos', () => {
    expect(filtrar(lista, { texto: 'nunez' }).map((h) => h.persona_id)).toEqual(['1'])
    expect(filtrar(lista, { texto: 'jose nu' }).map((h) => h.persona_id)).toEqual(['1'])
    expect(filtrar(lista, { texto: 'gomez ana' }).map((h) => h.persona_id)).toEqual(['2'])
  })
  it('busca por DNI con o sin puntos', () => {
    expect(filtrar(lista, { texto: '30.999' }).map((h) => h.persona_id)).toEqual(['2'])
    expect(filtrar(lista, { texto: '25000111' }).map((h) => h.persona_id)).toEqual(['3'])
  })
  it('filtra por empresa y por estado', () => {
    expect(filtrar(lista, { empresaId: 'e2' }).map((h) => h.persona_id)).toEqual(['2'])
    expect(filtrar(lista, { estado: 'vencido' }).map((h) => h.persona_id)).toEqual(['3'])
  })
  it('oculta personas dadas de baja', () => {
    expect(filtrar([hab({ persona_activa: false })], {})).toHaveLength(0)
  })
})

describe('resumen', () => {
  it('cuenta vigentes, por vencer y vencidos', () => {
    expect(resumen(lista)).toEqual({ vigente: 1, por_vencer: 1, vencido: 1 })
  })
})

describe('aCsv', () => {
  it('arma un CSV para Excel en castellano (BOM, punto y coma, fechas dd/mm/aaaa)', () => {
    const csv = aCsv([hab({ tipo_habilitacion: 'tarea_puntual', descripcion_tarea: 'Corte; de "reja"', dias_restantes: 3, estado: 'por_vencer' })])
    const [encabezado, fila] = csv.replace('﻿', '').split('\r\n')
    expect(csv.startsWith('﻿')).toBe(true)
    expect(encabezado).toBe('Apellido;Nombre;DNI;Empresa;Tipo;Tarea;Fecha examen;Vencimiento;Días restantes;Estado')
    expect(fila).toBe('Pérez;Juan;30111222;Contratista Uno;Tarea puntual;"Corte; de ""reja""";10/01/2026;10/01/2027;3;Por vencer')
  })
  it('evita que Excel interprete fórmulas', () => {
    const csv = aCsv([hab({ apellido: '=HYPERLINK("x")' })])
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`)
  })
})
