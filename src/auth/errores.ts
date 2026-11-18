// Mensajes de error de Supabase Auth en castellano.

interface ErrorConCodigo {
  code?: string
  message?: string
  status?: number
}

const POR_CODIGO: Record<string, string> = {
  invalid_credentials: 'El email o la contraseña no son correctos.',
  email_not_confirmed: 'Todavía no confirmaste tu email. Revisá tu casilla.',
  user_banned: 'Tu usuario está deshabilitado. Hablá con el administrador.',
  over_request_rate_limit: 'Demasiados intentos. Esperá unos minutos y probá de nuevo.',
  over_email_send_rate_limit: 'Se enviaron demasiados emails. Esperá unos minutos y probá de nuevo.',
  weak_password: 'La contraseña es muy débil. Usá al menos 8 caracteres.',
  same_password: 'La contraseña nueva tiene que ser distinta de la anterior.',
  session_not_found: 'Tu sesión venció. Volvé a ingresar.',
}

export function mensajeDeError(error: unknown): string {
  const e = (error ?? {}) as ErrorConCodigo
  if (e.code && POR_CODIGO[e.code]) return POR_CODIGO[e.code]
  if (e.status === 429) return POR_CODIGO.over_request_rate_limit
  if (e.message?.toLowerCase().includes('failed to fetch')) {
    return 'No hay conexión con el servidor. Revisá tu internet.'
  }
  return 'Ocurrió un error inesperado. Probá de nuevo.'
}
