// Consultas a Supabase. Los permisos los aplica RLS en la base.
import { supabase } from './supabase'
import type { ExamenConEstado, Habilitacion } from './habilitaciones'

export const BUCKET_PDF = 'examenes-pdf'
/** Los links a los PDFs vencen a los 5 minutos. */
const SEGUNDOS_LINK_PDF = 300

export interface Empresa {
  id: string
  nombre: string
  activo: boolean
}

export interface Persona {
  id: string
  nombre: string
  apellido: string
  dni: string
  activo: boolean
  empresa_id: string
  empresa: { nombre: string } | null
}

function o<T>({ data, error }: { data: T | null; error: unknown }): T {
  if (error) throw error
  return data as T
}

export async function obtenerHabilitaciones(): Promise<Habilitacion[]> {
  return o(await supabase.from('habilitaciones_actuales').select('*'))
}

export async function obtenerEmpresas(): Promise<Empresa[]> {
  return o(await supabase.from('empresas').select('id, nombre, activo').order('nombre'))
}

export async function obtenerPersona(id: string): Promise<Persona | null> {
  return o(
    await supabase
      .from('personas')
      .select('id, nombre, apellido, dni, activo, empresa_id, empresa:empresas(nombre)')
      .eq('id', id)
      .maybeSingle(),
  )
}

export async function obtenerHistorial(personaId: string): Promise<ExamenConEstado[]> {
  return o(
    await supabase
      .from('examenes_estado')
      .select('*')
      .eq('persona_id', personaId)
      .order('fecha_examen', { ascending: false })
      .order('created_at', { ascending: false }),
  )
}

export async function linkFirmadoPdf(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET_PDF).createSignedUrl(path, SEGUNDOS_LINK_PDF)
  if (error) throw error
  return data.signedUrl
}

// --- Carga de exámenes ---------------------------------------------------------

export interface PersonaLista {
  id: string
  nombre: string
  apellido: string
  dni: string
  activo: boolean
  empresa_id: string
}

export async function obtenerPersonas(): Promise<PersonaLista[]> {
  return o(await supabase.from('personas').select('id, nombre, apellido, dni, activo, empresa_id').order('apellido'))
}

export async function crearEmpresa(nombre: string): Promise<Empresa> {
  return o(await supabase.from('empresas').insert({ nombre: nombre.trim() }).select('id, nombre, activo').single())
}

export async function crearPersona(p: Pick<PersonaLista, 'nombre' | 'apellido' | 'dni' | 'empresa_id'>): Promise<PersonaLista> {
  return o(
    await supabase
      .from('personas')
      .insert({ nombre: p.nombre.trim(), apellido: p.apellido.trim(), dni: p.dni, empresa_id: p.empresa_id })
      .select('id, nombre, apellido, dni, activo, empresa_id')
      .single(),
  )
}

export async function subirPdf(path: string, bytes: Uint8Array): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET_PDF)
    .upload(path, new Blob([bytes as BlobPart], { type: 'application/pdf' }), { contentType: 'application/pdf', upsert: true })
  if (error) throw error
}

export interface ExamenNuevo {
  id: string
  persona_id: string
  fecha_examen: string
  controlo: string
  resultado: 'apto' | 'no_apto'
  tipo_habilitacion: 'anual' | 'semestral' | 'tarea_puntual'
  descripcion_tarea: string | null
  fecha_inicio: string | null
  fecha_vencimiento: string | null
  respuestas: unknown
  observaciones: string | null
  pdf_path: string
}

export async function insertarExamen(e: ExamenNuevo): Promise<void> {
  const { error } = await supabase.from('examenes').insert(e)
  if (error) throw error
}
