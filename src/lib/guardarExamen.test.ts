import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CHECKLIST } from './checklist'
import { formVacio, type FormExamen } from './examen'
import { NUEVA_EMPRESA, guardarExamen, limpiarDni, validarPersona } from './guardarExamen'

const llamadas = vi.hoisted(() => ({ orden: [] as string[], examen: null as Record<string, unknown> | null, path: '' }))

vi.mock('./datos', () => ({
  crearEmpresa: vi.fn(async (nombre: string) => {
    llamadas.orden.push('empresa')
    return { id: 'e-nueva', nombre, activo: true }
  }),
  crearPersona: vi.fn(async (p: Record<string, string>) => {
    llamadas.orden.push('persona')
    return { id: 'p-nueva', activo: true, ...p }
  }),
  subirPdf: vi.fn(async (path: string, bytes: Uint8Array) => {
    llamadas.orden.push('pdf')
    llamadas.path = path
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-')
  }),
  insertarExamen: vi.fn(async (e: Record<string, unknown>) => {
    llamadas.orden.push('examen')
    llamadas.examen = e
  }),
}))

function formCompleto(extra: Partial<FormExamen> = {}): FormExamen {
  const respuestas: FormExamen['respuestas'] = {}
  for (const s of CHECKLIST.secciones) for (const i of s.items) respuestas[i.id] = { respuesta: 'si', comentario: '' }
  return { ...formVacio('2026-11-18', 'Carlos Ríos'), resultado: 'apto', respuestas, ...extra }
}

const existente = { id: 'p1', nombre: 'Ana', apellido: 'Zapata', dni: '20111222', activo: true, empresa_id: 'e1' }
const empresas = [{ id: 'e1', nombre: 'Contratista Uno', activo: true }]

beforeEach(() => {
  llamadas.orden = []
  llamadas.examen = null
})

describe('guardarExamen', () => {
  it('con persona existente: sube el PDF y después registra el examen', async () => {
    const r = await guardarExamen({ examenId: 'x1', seleccion: { tipo: 'existente', persona: existente }, form: formCompleto(), empresas })
    expect(llamadas.orden).toEqual(['pdf', 'examen'])
    expect(r).toEqual({ personaId: 'p1', examenId: 'x1', pdfPath: 'p1/x1.pdf' })
    expect(llamadas.examen).toMatchObject({
      id: 'x1', persona_id: 'p1', resultado: 'apto', tipo_habilitacion: 'anual',
      fecha_inicio: '2026-11-18', fecha_vencimiento: '2027-11-18', descripcion_tarea: null, pdf_path: 'p1/x1.pdf', observaciones: null,
    })
    expect((llamadas.examen!.respuestas as { secciones: unknown[] }).secciones).toHaveLength(6)
  })

  it('con persona y empresa nuevas: las crea primero y avisa para no duplicarlas al reintentar', async () => {
    const alCrearPersona = vi.fn()
    await guardarExamen({
      examenId: 'x2',
      seleccion: { tipo: 'nueva', dni: '30.111.222', nombre: 'Juan', apellido: 'Pérez', empresaId: NUEVA_EMPRESA, empresaNueva: 'Nueva SRL' },
      form: formCompleto(),
      empresas,
      alCrearPersona,
    })
    expect(llamadas.orden).toEqual(['empresa', 'persona', 'pdf', 'examen'])
    expect(alCrearPersona).toHaveBeenCalledWith(expect.objectContaining({ id: 'p-nueva', dni: '30111222', empresa_id: 'e-nueva' }))
  })

  it('un No apto se guarda sin fechas de vigencia', async () => {
    await guardarExamen({ examenId: 'x3', seleccion: { tipo: 'existente', persona: existente }, form: formCompleto({ resultado: 'no_apto' }), empresas })
    expect(llamadas.examen).toMatchObject({ resultado: 'no_apto', fecha_inicio: null, fecha_vencimiento: null })
  })

  it('si falla la subida del PDF no registra el examen', async () => {
    const { subirPdf } = await import('./datos')
    vi.mocked(subirPdf).mockRejectedValueOnce(new Error('sin red'))
    await expect(
      guardarExamen({ examenId: 'x4', seleccion: { tipo: 'existente', persona: existente }, form: formCompleto(), empresas }),
    ).rejects.toThrow('sin red')
    expect(llamadas.orden).not.toContain('examen')
  })
})

describe('validarPersona', () => {
  const nueva = { tipo: 'nueva' as const, dni: '30111222', nombre: 'Juan', apellido: 'Pérez', empresaId: 'e1', empresaNueva: '' }
  it('pide elegir una persona', () => expect(validarPersona(null, [])).toHaveProperty('persona'))
  it('acepta una persona nueva completa', () => expect(validarPersona(nueva, [existente])).toEqual({}))
  it('valida el DNI y avisa si ya existe', () => {
    expect(validarPersona({ ...nueva, dni: '123' }, [])).toHaveProperty('dni')
    expect(validarPersona({ ...nueva, dni: '20.111.222' }, [existente]).dni).toMatch(/Ya hay una persona/)
  })
  it('pide el nombre de la empresa nueva', () => {
    expect(validarPersona({ ...nueva, empresaId: NUEVA_EMPRESA }, [])).toHaveProperty('empresa')
  })
  it('limpia puntos y espacios del DNI', () => expect(limpiarDni(' 30.111.222 ')).toBe('30111222'))
})
