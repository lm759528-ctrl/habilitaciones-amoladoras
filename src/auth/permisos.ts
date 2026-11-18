// Espejo en el frontend de las funciones private.* de la base.
// La base es la que decide (RLS); esto solo sirve para mostrar u ocultar cosas.

export type Rol = 'admin' | 'seguridad' | 'evaluador'

export interface Perfil {
  id: string
  nombre: string
  email: string | null
  rol: Rol
  activo: boolean
}

export const NOMBRE_ROL: Record<Rol, string> = {
  admin: 'Administrador',
  seguridad: 'Seguridad e Higiene',
  evaluador: 'Evaluador',
}

/** Roles que hoy pueden cargar exámenes. Para activar evaluador: ['admin', 'evaluador']. */
const ROLES_QUE_CARGAN: readonly Rol[] = ['admin']

export function tieneAcceso(perfil: Perfil | null): perfil is Perfil {
  return perfil !== null && perfil.activo
}

export function esAdmin(perfil: Perfil | null): boolean {
  return tieneAcceso(perfil) && perfil.rol === 'admin'
}

export function puedeCargarExamenes(perfil: Perfil | null): boolean {
  return tieneAcceso(perfil) && ROLES_QUE_CARGAN.includes(perfil.rol)
}
