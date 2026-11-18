import { describe, expect, it } from 'vitest'
import { armarMail, seleccionarAvisos, type ExamenPorVencer } from './logica'

function ex(id: string, dias: number, extra: Partial<ExamenPorVencer> = {}): ExamenPorVencer {
  return {
    id, persona_id: `p${id}`, nombre: 'Juan', apellido: `Apellido${id}`, dni: '30111222', empresa: 'Contratista Uno',
    tipo_habilitacion: 'anual', descripcion_tarea: null, fecha_vencimiento: '2026-12-18', dias_restantes: dias, ...extra,
  }
}

const U = [30, 7, 0]

describe('seleccionarAvisos', () => {
  it('avisa a los 30, a los 7 y el día del vencimiento', () => {
    expect(seleccionarAvisos([ex('a', 30)], U, [])).toEqual([{ examen: ex('a', 30), umbral: 30 }])
    expect(seleccionarAvisos([ex('a', 7)], U, [])[0].umbral).toBe(7)
    expect(seleccionarAvisos([ex('a', 0)], U, [])[0].umbral).toBe(0)
  })

  it('no avisa fuera de los umbrales ni a vencidos', () => {
    expect(seleccionarAvisos([ex('a', 31), ex('b', -1)], U, [])).toEqual([])
  })

  it('no repite un aviso ya enviado', () => {
    const enviados = [{ examen_id: 'a', umbral_dias: 30 }]
    expect(seleccionarAvisos([ex('a', 29)], U, enviados)).toEqual([])
    expect(seleccionarAvisos([ex('a', 7)], U, enviados)[0].umbral).toBe(7)
  })

  it('si el cron no corrió un día, avisa igual al siguiente', () => {
    expect(seleccionarAvisos([ex('a', 28)], U, [])[0].umbral).toBe(30)
  })

  it('si se carga un examen que ya está a 5 días, manda solo el de 7 (no el de 30)', () => {
    expect(seleccionarAvisos([ex('a', 5)], U, [])).toHaveLength(1)
    expect(seleccionarAvisos([ex('a', 5)], U, [])[0].umbral).toBe(7)
    expect(seleccionarAvisos([ex('a', 4)], U, [{ examen_id: 'a', umbral_dias: 7 }])).toEqual([])
  })

  it('respeta umbrales configurados distintos', () => {
    expect(seleccionarAvisos([ex('a', 15)], [15, 1], [])[0].umbral).toBe(15)
    expect(seleccionarAvisos([ex('a', 16)], [15, 1], [])).toEqual([])
  })

  it('ordena por días restantes', () => {
    expect(seleccionarAvisos([ex('a', 30), ex('b', 0), ex('c', 7)], U, []).map((a) => a.examen.id)).toEqual(['b', 'c', 'a'])
  })
})

describe('armarMail', () => {
  const opciones = { appUrl: 'https://app.example/', titulo: 'Habilitaciones', hoy: '2026-11-18' }

  it('arma un resumen con nombre, DNI, empresa, vencimiento, días y link', () => {
    const m = armarMail(
      [
        { examen: ex('a', 0, { nombre: 'Ana', apellido: 'Zapata' }), umbral: 0 },
        { examen: ex('b', 7, { tipo_habilitacion: 'tarea_puntual', descripcion_tarea: 'Corte de reja' }), umbral: 7 },
      ],
      opciones,
    )
    expect(m.asunto).toBe('Habilitaciones: 2 habilitaciones por vencer (18/11/2026)')
    expect(m.texto).toContain('- Zapata, Ana (DNI 30111222) · Contratista Uno · Anual · vence 18/12/2026 (Vence hoy) · https://app.example/personas/pa')
    expect(m.texto).toContain('Solo para: Corte de reja')
    expect(m.html).toContain('href="https://app.example/personas/pb"')
  })

  it('escapa el HTML de los datos', () => {
    const m = armarMail([{ examen: ex('a', 1, { empresa: '<script>x</script>' }), umbral: 7 }], opciones)
    expect(m.html).not.toContain('<script>')
    expect(m.html).toContain('&lt;script&gt;')
  })
})
