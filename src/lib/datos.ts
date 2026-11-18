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
