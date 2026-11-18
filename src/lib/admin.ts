// Operaciones de administración. RLS en la base exige rol admin para todas.
import type { Rol } from '../auth/permisos'
import { supabase } from './supabase'

function ok<T>({ data, error }: { data: T | null; error: unknown }): T {
  if (error) throw error
  return data as T
}

// --- Empresas ---------------------------------------------------------------

export async function guardarEmpresa(e: { id?: string; nombre: string; activo?: boolean }): Promise<void> {
  const fila = { nombre: e.nombre.trim(), ...(e.activo === undefined ? {} : { activo: e.activo }) }
  const { error } = e.id
    ? await supabase.from('empresas').update(fila).eq('id', e.id)
    : await supabase.from('empresas').insert(fila)
  if (error) throw error
}

// --- Personas ---------------------------------------------------------------

export interface DatosPersona {
  id?: string
  nombre: string
  apellido: string
  dni: string
  empresa_id: string
  activo?: boolean
}

export async function guardarPersona(p: DatosPersona): Promise<void> {
  const fila = {
    nombre: p.nombre.trim(),
    apellido: p.apellido.trim(),
    dni: p.dni,
    empresa_id: p.empresa_id,
    ...(p.activo === undefined ? {} : { activo: p.activo }),
  }
  const { error } = p.id
    ? await supabase.from('personas').update(fila).eq('id', p.id)
    : await supabase.from('personas').insert(fila)
  if (error) throw error
}

export async function cambiarActivoPersona(id: string, activo: boolean): Promise<void> {
  const { error } = await supabase.from('personas').update({ activo }).eq('id', id)
  if (error) throw error
}

// --- Usuarios ---------------------------------------------------------------

export interface Usuario {
  id: string
  nombre: string
  email: string | null
  rol: Rol
  activo: boolean
  created_at: string
}

export async function obtenerUsuarios(): Promise<Usuario[]> {
  return ok(await supabase.from('profiles').select('id, nombre, email, rol, activo, created_at').order('nombre'))
}

export async function actualizarUsuario(id: string, cambios: Partial<Pick<Usuario, 'nombre' | 'rol' | 'activo'>>): Promise<void> {
  const { error } = await supabase.from('profiles').update(cambios).eq('id', id)
  if (error) throw error
}

/**
 * Da acceso a la app a un usuario que ya existe en Supabase
 * (Authentication → Users → Add user). No manda mails: lo hace la función
 * habilitaciones.dar_acceso de la base, que solo puede usar un admin.
 * Si ya tenía acceso, le actualiza el nombre y el rol y lo reactiva.
 */
export async function darAcceso(datos: { email: string; nombre: string; rol: Rol }): Promise<void> {
  const { error } = await supabase.rpc('dar_acceso', { p_email: datos.email.trim(), p_nombre: datos.nombre.trim(), p_rol: datos.rol })
  if (error) throw error
}

// --- Exámenes ---------------------------------------------------------------

export async function anularExamen(id: string, motivo: string): Promise<void> {
  const { error } = await supabase.from('examenes').update({ anulado: true, motivo_anulacion: motivo.trim() }).eq('id', id)
  if (error) throw error
}

/** Mensaje en castellano para errores de la base. */
export function mensajeErrorAdmin(error: unknown): string {
  const e = (error ?? {}) as { code?: string; message?: string }
  if (e.code === '23505') return 'Ya existe un registro con ese dato (DNI o nombre repetido).'
  if (e.code === '23514') return 'Hay un dato con formato inválido.'
  if (e.code === '42501') return 'Tu usuario no tiene permiso para hacer esto.'
  // Los triggers de la base ya devuelven el motivo en castellano.
  if (e.code === 'P0001' && e.message) return e.message
  if (e.message?.toLowerCase().includes('failed to fetch')) return 'No hay conexión con el servidor.'
  if (error instanceof Error && !('code' in error)) return error.message
  return 'No se pudo guardar. Probá de nuevo.'
}
