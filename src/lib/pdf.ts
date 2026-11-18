// PDF del examen, A4 listo para imprimir. Replica la planilla original:
// encabezado, una tabla por sección (Sí / No / N/A / Comentarios), y al final
// controló, resultado, observaciones y firmas.
import type { PDFFont, PDFPage, RGB } from 'pdf-lib'
import type { RespuestasGuardadas } from './checklist'
import { formatearFecha } from './fechas'
import { TIPOS, type Resultado, type TipoHabilitacion } from './habilitaciones'

export const TITULO_PDF = 'EXAMEN PRÁCTICO DE USO DE AMOLADORAS ANGULARES'

export interface DatosPdf {
  empresa: string
  empleado: string
  dni: string
  fechaExamen: string
  tipo: TipoHabilitacion
  descripcionTarea: string | null
  fechaVencimiento: string | null
  resultado: Resultado
  controlo: string
  observaciones: string
  respuestas: RespuestasGuardadas
  /** Fecha de generación (aaaa-mm-dd), para el pie de página. */
  generado: string
}

// Medidas en puntos (A4 = 595.28 x 841.89)
const A4: [number, number] = [595.28, 841.89]
const MARGEN = 40
const ANCHO = A4[0] - MARGEN * 2
const COLUMNAS = [262, 30, 30, 30, ANCHO - 262 - 30 * 3] // Punto, Sí, No, N/A, Comentarios
const TAM = 8.5
const INTERLINEA = 9.5
const PAD = 2.5

export async function generarPdfExamen(d: DatosPdf): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
  const doc = await PDFDocument.create()
  doc.setTitle(`${TITULO_PDF} - ${d.empleado}`)
  doc.setCreator('Habilitaciones de amoladoras')
  const normal = await doc.embedFont(StandardFonts.Helvetica)
  const negrita = await doc.embedFont(StandardFonts.HelveticaBold)
  const soportados = new Set(normal.getCharacterSet())
  const negro = rgb(0, 0, 0)
  const gris = rgb(0.9, 0.9, 0.9)
  const grisTexto = rgb(0.35, 0.35, 0.35)

  /** Reemplaza lo que Helvetica no puede dibujar (emojis, etc.). */
  const limpio = (t: string) =>
    Array.from(t.replace(/\r\n?/g, '\n').replace(/\t/g, ' '), (c) =>
      c === '\n' || soportados.has(c.codePointAt(0)!) ? c : '?',
    ).join('')

  function lineas(texto: string, font: PDFFont, tam: number, ancho: number): string[] {
    const salida: string[] = []
    for (const parrafo of limpio(texto).split('\n')) {
      let actual = ''
      for (const palabra of parrafo.split(/ +/)) {
        const prueba = actual ? `${actual} ${palabra}` : palabra
        if (font.widthOfTextAtSize(prueba, tam) <= ancho) {
          actual = prueba
          continue
        }
        if (actual) salida.push(actual)
        // Palabra más larga que la columna: se corta por caracteres.
        let resto = palabra
        while (font.widthOfTextAtSize(resto, tam) > ancho) {
          let n = resto.length - 1
          while (n > 1 && font.widthOfTextAtSize(resto.slice(0, n), tam) > ancho) n--
          salida.push(resto.slice(0, n))
          resto = resto.slice(n)
        }
        actual = resto
      }
      salida.push(actual)
    }
    return salida
  }

  let pagina: PDFPage = doc.addPage(A4)
  let y = A4[1] - MARGEN

  function nuevaPagina() {
    pagina = doc.addPage(A4)
    y = A4[1] - MARGEN
  }

  function asegurar(alto: number) {
    if (y - alto < MARGEN + 20) nuevaPagina()
  }

  function texto(t: string, x: number, yy: number, font = normal, tam = TAM, color: RGB = negro) {
    pagina.drawText(limpio(t), { x, y: yy, size: tam, font, color })
  }

  function rect(x: number, yTop: number, w: number, h: number, relleno?: RGB) {
    pagina.drawRectangle({ x, y: yTop - h, width: w, height: h, borderColor: negro, borderWidth: 0.6, color: relleno })
  }

  function centrado(t: string, x: number, w: number, yy: number, font = normal, tam = TAM) {
    texto(t, x + (w - font.widthOfTextAtSize(limpio(t), tam)) / 2, yy, font, tam)
  }

  // --- Título ---------------------------------------------------------------
  centrado(TITULO_PDF, MARGEN, ANCHO, y - 14, negrita, 13)
  y -= 30

  // --- Encabezado -----------------------------------------------------------
  const mitad = ANCHO / 2
  const campos: [string, string][][] = [
    [['Empresa', d.empresa], ['Fecha', formatearFecha(d.fechaExamen)]],
    [['Empleado', d.empleado], ['DNI', d.dni]],
    [
      ['Tipo de habilitación', TIPOS[d.tipo]],
      ['Vencimiento', d.resultado === 'apto' ? formatearFecha(d.fechaVencimiento) : 'No corresponde (no apto)'],
    ],
  ]
  for (const fila of campos) {
    const h = 17
    fila.forEach(([etiqueta, valor], i) => {
      const x = MARGEN + i * mitad
      rect(x, y, mitad, h)
      const e = `${etiqueta}: `
      texto(e, x + 4, y - 12, negrita, 10)
      const xValor = x + 7 + negrita.widthOfTextAtSize(e, 10)
      const [primera] = lineas(valor, normal, 10, mitad - (xValor - x) - 4)
      texto(primera ?? '', xValor, y - 12, normal, 10)
    })
    y -= h
  }
  if (d.tipo === 'tarea_puntual' && d.descripcionTarea) {
    const e = 'Tarea: '
    const xValor = MARGEN + 7 + negrita.widthOfTextAtSize(e, 10)
    const ls = lineas(d.descripcionTarea, normal, 10, ANCHO - (xValor - MARGEN) - 4)
    const h = ls.length * 12 + 5
    rect(MARGEN, y, ANCHO, h)
    texto(e, MARGEN + 4, y - 12, negrita, 10)
    ls.forEach((l, i) => texto(l, xValor, y - 12 - i * 12, normal, 10))
    y -= h
  }
  y -= 8

  // --- Tablas por sección ---------------------------------------------------
  const altoEncabezado = INTERLINEA + PAD * 2
  function encabezadoSeccion(titulo: string) {
    let x = MARGEN
    const titulos = [titulo, 'Sí', 'No', 'N/A', 'Comentarios']
    COLUMNAS.forEach((w, i) => {
      rect(x, y, w, altoEncabezado, gris)
      const yy = y - PAD - 7.5
      if (i === 0) texto(lineas(titulo, negrita, TAM, w - PAD * 2)[0], x + PAD, yy, negrita)
      else centrado(titulos[i], x, w, yy, negrita)
      x += w
    })
    y -= altoEncabezado
  }

  for (const seccion of d.respuestas.secciones) {
    const filas = seccion.items.map((it) => ({
      it,
      punto: lineas(it.texto, normal, TAM, COLUMNAS[0] - PAD * 2),
      comentario: it.comentario ? lineas(it.comentario, normal, TAM, COLUMNAS[4] - PAD * 2) : [],
    }))
    const alto = (f: (typeof filas)[number]) => Math.max(f.punto.length, f.comentario.length, 1) * INTERLINEA + PAD * 2

    asegurar(altoEncabezado + (filas[0] ? alto(filas[0]) : 0))
    encabezadoSeccion(seccion.titulo)
    for (const f of filas) {
      const h = alto(f)
      if (y - h < MARGEN + 20) {
        nuevaPagina()
        encabezadoSeccion(`${seccion.titulo} (continúa)`)
      }
      let x = MARGEN
      COLUMNAS.forEach((w, i) => {
        rect(x, y, w, h)
        const yy = y - PAD - 7.5
        if (i === 0) f.punto.forEach((l, n) => texto(l, x + PAD, yy - n * INTERLINEA))
        else if (i === 4) f.comentario.forEach((l, n) => texto(l, x + PAD, yy - n * INTERLINEA))
        else if (f.it.respuesta === (['si', 'no', 'na'] as const)[i - 1]) centrado('X', x, w, yy, negrita, 9)
        x += w
      })
      y -= h
    }
  }

  // --- Cierre: controló, resultado, observaciones y firmas -----------------
  const obs = lineas(d.observaciones || '', normal, 10, ANCHO - 8)
  const altoObs = Math.max(obs.length * 12 + 8, 36)
  // El cierre puede usar el espacio hasta el pie de página.
  const altoCierre = 10 + 26 + 16 + altoObs + 38 + 26
  if (y - altoCierre < 34) nuevaPagina()
  y -= 10
  texto('Controló: ', MARGEN, y - 10, negrita, 10)
  texto(d.controlo, MARGEN + negrita.widthOfTextAtSize('Controló: ', 10), y - 10, normal, 10)
  const res = d.resultado === 'apto' ? 'APTO' : 'NO APTO'
  const xRes = MARGEN + mitad
  texto('Resultado: ', xRes, y - 10, negrita, 10)
  texto(res, xRes + negrita.widthOfTextAtSize('Resultado: ', 10), y - 10, negrita, 11)
  y -= 26

  texto('Observaciones:', MARGEN, y - 10, negrita, 10)
  y -= 16
  rect(MARGEN, y, ANCHO, altoObs)
  obs.forEach((l, i) => texto(l, MARGEN + 4, y - 13 - i * 12, normal, 10))
  y -= altoObs + 38

  const anchoFirma = 200
  const firmas: [string, string][] = [
    ['Firma del evaluador', d.controlo],
    ['Firma del operario', d.empleado],
  ]
  firmas.forEach(([etiqueta, aclaracion], i) => {
    const x = i === 0 ? MARGEN + 10 : MARGEN + ANCHO - anchoFirma - 10
    pagina.drawLine({ start: { x, y }, end: { x: x + anchoFirma, y }, thickness: 0.6, color: negro })
    centrado(etiqueta, x, anchoFirma, y - 12, negrita, 9)
    centrado(`Aclaración: ${aclaracion}`, x, anchoFirma, y - 24, normal, 8)
  })

  // --- Pie de página ----------------------------------------------------------
  const paginas = doc.getPages()
  paginas.forEach((p, i) => {
    p.drawText(limpio(`${d.empleado} · DNI ${d.dni} · Generado el ${formatearFecha(d.generado)}`), {
      x: MARGEN, y: 22, size: 7, font: normal, color: grisTexto,
    })
    const num = `Página ${i + 1} de ${paginas.length}`
    p.drawText(num, { x: A4[0] - MARGEN - normal.widthOfTextAtSize(num, 7), y: 22, size: 7, font: normal, color: grisTexto })
  })

  return doc.save()
}
