// Validación pura del pedido de invitación (testeable sin Deno).
export const ROLES_INVITABLES = ['admin', 'seguridad'] as const
export type RolInvitable = (typeof ROLES_INVITABLES)[number]

export interface PedidoInvitacion {
  email: string
  nombre: string
  rol: RolInvitable
}

export function validarPedido(body: unknown): { ok: true; pedido: PedidoInvitacion } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : ''
  const nombre = typeof b.nombre === 'string' ? b.nombre.trim() : ''
  const rol = b.rol
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'El email no es válido.' }
  if (!nombre) return { ok: false, error: 'Falta el nombre.' }
  if (nombre.length > 120) return { ok: false, error: 'El nombre es demasiado largo.' }
  if (!ROLES_INVITABLES.includes(rol as RolInvitable)) return { ok: false, error: 'El rol tiene que ser admin o seguridad.' }
  return { ok: true, pedido: { email, nombre, rol: rol as RolInvitable } }
}
