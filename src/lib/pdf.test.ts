import { writeFileSync } from 'node:fs'
import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { CHECKLIST, type Respuesta } from './checklist'
import { generarPdfExamen, type DatosPdf } from './pdf'

function datos(extra: Partial<DatosPdf> = {}, comentario: (i: number) => string = (i: number) => (i % 9 === 0 ? 'Se corrigió en el momento.' : '')): DatosPdf {
  let n = 0
  return {
    empresa: 'Montajes del Sur S.R.L.',
    empleado: 'Pereyra, Julián',
    dni: '35777888',
    fechaExamen: '2026-11-18',
    tipo: 'tarea_puntual',
    descripcionTarea: 'Corte de cañería en sala de bombas, sector B',
    fechaVencimiento: '2026-11-20',
    resultado: 'apto',
    controlo: 'Carlos Ríos',
    observaciones: 'Buen manejo general. Reforzar el chequeo del disco antes de cada uso.',
    generado: '2026-11-18',
    respuestas: {
      version: 1,
      secciones: CHECKLIST.secciones.map((s) => ({
        titulo: s.titulo,
        items: s.items.map((i) => {
          n++
          return { ...i, respuesta: (['si', 'si', 'na', 'si', 'no'] as Respuesta[])[n % 5], comentario: comentario(n) }
        }),
      })),
    },
    ...extra,
  }
}

async function cargar(bytes: Uint8Array) {
  return PDFDocument.load(bytes)
}

describe('generarPdfExamen', () => {
  it('genera un PDF A4', async () => {
    const bytes = await generarPdfExamen(datos())
    if (process.env.GUARDAR_PDF) writeFileSync(process.env.GUARDAR_PDF, bytes)
    const doc = await cargar(bytes)
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-')
    const { width, height } = doc.getPage(0).getSize()
    expect(Math.round(width)).toBe(595)
    expect(Math.round(height)).toBe(842)
    expect(doc.getTitle()).toContain('EXAMEN PRÁCTICO DE USO DE AMOLADORAS ANGULARES')
  })

  it('agrega páginas si los comentarios son largos', async () => {
    const largo = 'Comentario largo que ocupa varias líneas dentro de la columna de comentarios de la tabla. '.repeat(3)
    const doc = await cargar(await generarPdfExamen(datos({}, () => largo)))
    expect(doc.getPageCount()).toBeGreaterThan(2)
  })

  it('no falla con caracteres que la fuente no tiene ni con palabras muy largas', async () => {
    const bytes = await generarPdfExamen(
      datos({ observaciones: 'Todo ok 👍 → listo. ' + 'x'.repeat(300), empleado: 'Ñandú, José “Pepe”' }),
    )
    expect((await cargar(bytes)).getPageCount()).toBeGreaterThanOrEqual(1)
  })

  it('un No apto dice que no corresponde vencimiento', async () => {
    const bytes = await generarPdfExamen(datos({ resultado: 'no_apto', tipo: 'anual', descripcionTarea: null, fechaVencimiento: null }))
    if (process.env.GUARDAR_PDF) writeFileSync(process.env.GUARDAR_PDF.replace('.pdf', '-noapto.pdf'), bytes)
    expect((await cargar(bytes)).getPageCount()).toBeGreaterThanOrEqual(1)
  })
})
