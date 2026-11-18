// Lógica pura de los avisos de vencimiento (sin Deno ni red), para poder testearla.

export interface ExamenPorVencer {
  id: string
  persona_id: string
  nombre: string
  apellido: string
  dni: string
  empresa: string
  tipo_habilitacion: 'anual' | 'semestral' | 'tarea_puntual'
  descripcion_tarea: string | null
  fecha_vencimiento: string
  dias_restantes: number
}

export interface Aviso {
  examen: ExamenPorVencer
  umbral: number
}

/**
 * Para cada examen toma el umbral más chico que todavía lo alcanza
 * (con 30/7/0 y 5 días restantes, el de 7) y lo avisa si no se mandó antes.
 * Así, si el cron no corrió algún día, el aviso sale igual al día siguiente,
 * y nunca se manda dos veces el mismo umbral.
 */
export function seleccionarAvisos(
  examenes: ExamenPorVencer[],
  umbrales: number[],
  enviados: { examen_id: string; umbral_dias: number }[],
): Aviso[] {
  const ya = new Set(enviados.map((e) => `${e.examen_id}:${e.umbral_dias}`))
  const ordenados = [...new Set(umbrales)].filter((u) => Number.isInteger(u) && u >= 0).sort((a, b) => a - b)
  const avisos: Aviso[] = []
  for (const examen of examenes) {
    if (examen.dias_restantes < 0) continue
    const umbral = ordenados.find((u) => u >= examen.dias_restantes)
    if (umbral === undefined || ya.has(`${examen.id}:${umbral}`)) continue
    avisos.push({ examen, umbral })
  }
  return avisos.sort(
    (a, b) => a.examen.dias_restantes - b.examen.dias_restantes || a.examen.apellido.localeCompare(b.examen.apellido, 'es'),
  )
}

const TIPOS = { anual: 'Anual', semestral: 'Semestral', tarea_puntual: 'Tarea puntual' } as const

export function fechaAR(iso: string): string {
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

function textoDias(d: number): string {
  if (d === 0) return 'Vence hoy'
  return d === 1 ? '1 día' : `${d} días`
}

function escapar(t: string): string {
  return t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

export interface Mail {
  asunto: string
  html: string
  texto: string
}

export function armarMail(avisos: Aviso[], opciones: { appUrl: string; titulo: string; hoy: string }): Mail {
  const url = opciones.appUrl.replace(/\/+$/, '')
  const n = avisos.length
  const asunto = `${opciones.titulo}: ${n} ${n === 1 ? 'habilitación por vencer' : 'habilitaciones por vencer'} (${fechaAR(opciones.hoy)})`

  const filas = avisos.map(({ examen: e }) => ({
    nombre: `${e.apellido}, ${e.nombre}`,
    dni: e.dni,
    empresa: e.empresa,
    tipo: e.tipo_habilitacion === 'tarea_puntual' && e.descripcion_tarea ? `Solo para: ${e.descripcion_tarea}` : TIPOS[e.tipo_habilitacion],
    vence: fechaAR(e.fecha_vencimiento),
    dias: textoDias(e.dias_restantes),
    link: `${url}/personas/${e.persona_id}`,
    hoy: e.dias_restantes === 0,
  }))

  const td = 'style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:left"'
  const html = `<!doctype html><html lang="es-AR"><body style="font-family:Arial,Helvetica,sans-serif;color:#0f172a">
<p>Estas habilitaciones de uso de amoladoras angulares están por vencer:</p>
<table style="border-collapse:collapse;font-size:14px">
<thead><tr style="background:#f1f5f9">${['Nombre', 'DNI', 'Empresa', 'Tipo', 'Vence', 'Días restantes', ''].map((h) => `<th ${td}>${h}</th>`).join('')}</tr></thead>
<tbody>
${filas
  .map(
    (f) =>
      `<tr><td ${td}>${escapar(f.nombre)}</td><td ${td}>${escapar(f.dni)}</td><td ${td}>${escapar(f.empresa)}</td><td ${td}>${escapar(f.tipo)}</td><td ${td}>${f.vence}</td><td ${td}>${f.hoy ? '<strong style="color:#b91c1c">Vence hoy</strong>' : f.dias}</td><td ${td}><a href="${escapar(f.link)}">Ver</a></td></tr>`,
  )
  .join('\n')}
</tbody></table>
<p><a href="${escapar(url)}">Abrir ${escapar(opciones.titulo)}</a></p>
<p style="color:#64748b;font-size:12px">Aviso automático diario. No respondas este mail.</p>
</body></html>`

  const texto = [
    'Estas habilitaciones de uso de amoladoras angulares están por vencer:',
    '',
    ...filas.map((f) => `- ${f.nombre} (DNI ${f.dni}) · ${f.empresa} · ${f.tipo} · vence ${f.vence} (${f.dias}) · ${f.link}`),
    '',
    `Abrir la app: ${url}`,
  ].join('\n')

  return { asunto, html, texto }
}
