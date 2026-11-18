import { crearEmpresa, crearPersona, insertarExamen, subirPdf, type Empresa, type PersonaLista } from './datos'
import { armarRespuestas, type FormExamen } from './examen'
import { hoyAR } from './fechas'
import { generarPdfExamen } from './pdf'

export const NUEVA_EMPRESA = '__nueva__'

export type SeleccionPersona =
  | { tipo: 'existente'; persona: PersonaLista }
  | { tipo: 'nueva'; dni: string; nombre: string; apellido: string; empresaId: string; empresaNueva: string }

export function limpiarDni(dni: string): string {
  return dni.replace(/[\s.\-]/g, '')
}

/** Errores de la persona/empresa a cargar, o {} si está todo bien. */
export function validarPersona(sel: SeleccionPersona | null, personas: PersonaLista[]): Record<string, string> {
  if (!sel) return { persona: 'Elegí la persona o cargá una nueva.' }
  if (sel.tipo === 'existente') return {}
  const e: Record<string, string> = {}
  const dni = limpiarDni(sel.dni)
  if (!/^\d{7,8}$/.test(dni)) e.dni = 'El DNI tiene que tener 7 u 8 números.'
  else if (personas.some((p) => p.dni === dni)) e.dni = 'Ya hay una persona con ese DNI: buscala en la lista.'
  if (!sel.nombre.trim()) e.nombre = 'Falta el nombre.'
  if (!sel.apellido.trim()) e.apellido = 'Falta el apellido.'
  if (!sel.empresaId) e.empresa = 'Elegí la empresa.'
  if (sel.empresaId === NUEVA_EMPRESA && !sel.empresaNueva.trim()) e.empresa = 'Escribí el nombre de la empresa nueva.'
  return e
}

export interface ResultadoGuardado {
  personaId: string
  examenId: string
  pdfPath: string
}

interface Opciones {
  examenId: string
  seleccion: SeleccionPersona
  form: FormExamen
  empresas: Empresa[]
  /** Se llama apenas se crea la persona, para no crearla dos veces si después algo falla y se reintenta. */
  alCrearPersona?: (p: PersonaLista) => void
  alCrearEmpresa?: (e: Empresa) => void
}

/**
 * Crea la empresa y la persona si hacen falta, genera el PDF, lo sube y
 * registra el examen. El PDF se sube antes de insertar el examen para que el
 * examen nunca quede sin su PDF; si algo falla, reintentar con el mismo
 * examenId pisa el mismo archivo.
 */
export async function guardarExamen({ examenId, seleccion, form, empresas, alCrearPersona, alCrearEmpresa }: Opciones): Promise<ResultadoGuardado> {
  let persona: PersonaLista
  if (seleccion.tipo === 'existente') {
    persona = seleccion.persona
  } else {
    let empresaId = seleccion.empresaId
    if (empresaId === NUEVA_EMPRESA) {
      const nueva = await crearEmpresa(seleccion.empresaNueva)
      alCrearEmpresa?.(nueva)
      empresas = [...empresas, nueva]
      empresaId = nueva.id
    }
    persona = await crearPersona({
      nombre: seleccion.nombre,
      apellido: seleccion.apellido,
      dni: limpiarDni(seleccion.dni),
      empresa_id: empresaId,
    })
    alCrearPersona?.(persona)
  }

  const apto = form.resultado === 'apto'
  const tarea = form.tipo === 'tarea_puntual' ? form.descripcionTarea.trim() : null
  const respuestas = armarRespuestas(form)
  const empresa = empresas.find((e) => e.id === persona.empresa_id)?.nombre ?? ''

  const pdf = await generarPdfExamen({
    empresa,
    empleado: `${persona.apellido}, ${persona.nombre}`,
    dni: persona.dni,
    fechaExamen: form.fechaExamen,
    tipo: form.tipo,
    descripcionTarea: tarea,
    fechaVencimiento: apto ? form.fechaVencimiento : null,
    resultado: apto ? 'apto' : 'no_apto',
    controlo: form.controlo.trim(),
    observaciones: form.observaciones.trim(),
    respuestas,
    generado: hoyAR(),
  })

  const pdfPath = `${persona.id}/${examenId}.pdf`
  await subirPdf(pdfPath, pdf)

  await insertarExamen({
    id: examenId,
    persona_id: persona.id,
    fecha_examen: form.fechaExamen,
    controlo: form.controlo.trim(),
    resultado: apto ? 'apto' : 'no_apto',
    tipo_habilitacion: form.tipo,
    descripcion_tarea: tarea,
    fecha_inicio: apto ? form.fechaInicio : null,
    fecha_vencimiento: apto ? form.fechaVencimiento : null,
    respuestas,
    observaciones: form.observaciones.trim() || null,
    pdf_path: pdfPath,
  })

  return { personaId: persona.id, examenId, pdfPath }
}

export function mensajeErrorGuardado(error: unknown): string {
  const e = (error ?? {}) as { code?: string; message?: string; statusCode?: string }
  if (e.code === '23505') return 'Ya existe una persona con ese DNI o una empresa con ese nombre.'
  if (e.code === '42501' || e.statusCode === '403') return 'Tu usuario no tiene permiso para cargar exámenes.'
  if (e.message?.toLowerCase().includes('failed to fetch')) return 'No hay conexión con el servidor. Revisá tu internet y volvé a intentar.'
  return 'No se pudo guardar el examen. Volvé a intentar; si sigue fallando, avisá al administrador.'
}
