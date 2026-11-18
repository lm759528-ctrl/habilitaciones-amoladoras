const ZONA = 'America/Argentina/Buenos_Aires'

const formatoTimestamp = new Intl.DateTimeFormat('es-AR', {
  timeZone: ZONA,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

/**
 * 'aaaa-mm-dd' (columna date) → 'dd/mm/aaaa', sin pasar por Date para que la
 * zona horaria no corra el día. Un timestamp se muestra en hora de Argentina.
 */
export function formatearFecha(valor: string | null | undefined): string {
  if (!valor) return ''
  const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor)
  if (soloFecha) return `${soloFecha[3]}/${soloFecha[2]}/${soloFecha[1]}`
  return formatoTimestamp.format(new Date(valor))
}

export function textoDiasRestantes(dias: number | null): string {
  if (dias === null) return ''
  if (dias === 0) return 'Vence hoy'
  const n = Math.abs(dias)
  const unidad = n === 1 ? 'día' : 'días'
  return dias > 0 ? `${n} ${unidad}` : `Venció hace ${n} ${unidad}`
}
