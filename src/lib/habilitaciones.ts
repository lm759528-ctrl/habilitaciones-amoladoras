import { formatearFecha } from './fechas'

export type Estado = 'vigente' | 'por_vencer' | 'vencido' | 'no_apto' | 'renovado' | 'anulado'
export type TipoHabilitacion = 'anual' | 'semestral' | 'tarea_puntual'
export type Resultado = 'apto' | 'no_apto'

/** Fila de la vista habilitaciones_actuales. */
export interface Habilitacion {
  persona_id: string
  nombre: string
  apellido: string
  dni: string
  persona_activa: boolean
  empresa_id: string
  empresa_nombre: string
  examen_id: string
  fecha_examen: string
  controlo: string
  resultado: Resultado
  tipo_habilitacion: TipoHabilitacion
  descripcion_tarea: string | null
  fecha_inicio: string | null
  fecha_vencimiento: string | null
  dias_restantes: number | null
  estado: Estado
  pdf_path: string | null
}

/** Fila de la vista examenes_estado (historial). */
export interface ExamenConEstado {
  id: string
  persona_id: string
  empresa_id: string
  fecha_examen: string
  controlo: string
  resultado: Resultado
  tipo_habilitacion: TipoHabilitacion
  descripcion_tarea: string | null
  fecha_inicio: string | null
  fecha_vencimiento: string | null
  observaciones: string | null
  pdf_path: string | null
  anulado: boolean
  motivo_anulacion: string | null
  created_at: string
  dias_restantes: number | null
  estado: Estado
}

export const ESTADOS: Record<Estado, { texto: string; clases: string }> = {
  vigente: { texto: 'Vigente', clases: 'bg-green-100 text-green-800 ring-green-600/20' },
  por_vencer: { texto: 'Por vencer', clases: 'bg-yellow-100 text-yellow-900 ring-yellow-600/30' },
  vencido: { texto: 'Vencido', clases: 'bg-red-100 text-red-800 ring-red-600/20' },
  no_apto: { texto: 'No apto', clases: 'bg-slate-100 text-slate-700 ring-slate-500/20' },
  renovado: { texto: 'Renovado', clases: 'bg-slate-100 text-slate-700 ring-slate-500/20' },
  anulado: { texto: 'Anulado', clases: 'bg-slate-100 text-slate-500 ring-slate-500/20 line-through' },
}

export const TIPOS: Record<TipoHabilitacion, string> = {
  anual: 'Anual',
  semestral: 'Semestral',
  tarea_puntual: 'Tarea puntual',
}

/** Estados que se pueden elegir en el filtro del listado. */
export const ESTADOS_LISTADO: Estado[] = ['vigente', 'por_vencer', 'vencido', 'no_apto']

export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\./g, '')
    .toLowerCase()
    .trim()
}

export interface Filtros {
  texto?: string
  empresaId?: string
  estado?: Estado | ''
}

export function filtrar(lista: Habilitacion[], { texto = '', empresaId = '', estado = '' }: Filtros): Habilitacion[] {
  const palabras = normalizar(texto).split(/\s+/).filter(Boolean)
  return lista.filter((h) => {
    if (!h.persona_activa) return false
    if (empresaId && h.empresa_id !== empresaId) return false
    if (estado && h.estado !== estado) return false
    const donde = normalizar(`${h.nombre} ${h.apellido} ${h.dni}`)
    return palabras.every((p) => donde.includes(p))
  })
}

export function resumen(lista: Habilitacion[]): { vigente: number; por_vencer: number; vencido: number } {
  const r = { vigente: 0, por_vencer: 0, vencido: 0 }
  for (const h of lista) {
    if (h.estado === 'vigente' || h.estado === 'por_vencer' || h.estado === 'vencido') r[h.estado]++
  }
  return r
}

export function ordenarPorApellido(lista: Habilitacion[]): Habilitacion[] {
  return [...lista].sort(
    (a, b) => a.apellido.localeCompare(b.apellido, 'es') || a.nombre.localeCompare(b.nombre, 'es'),
  )
}

// --- Exportación -----------------------------------------------------------

function celda(valor: string | number | null): string {
  if (valor === null) return ''
  if (typeof valor === 'number') return String(valor)
  // Un texto que empieza con = + - @ Excel lo toma como fórmula.
  const seguro = /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor
  return /[;"\r\n]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro
}

/** CSV para Excel en configuración regional de Argentina: UTF-8 con BOM y ";". */
export function aCsv(lista: Habilitacion[]): string {
  const encabezado = ['Apellido', 'Nombre', 'DNI', 'Empresa', 'Tipo', 'Tarea', 'Fecha examen', 'Vencimiento', 'Días restantes', 'Estado']
  const filas = lista.map((h) =>
    [
      h.apellido,
      h.nombre,
      h.dni,
      h.empresa_nombre,
      TIPOS[h.tipo_habilitacion],
      h.descripcion_tarea,
      formatearFecha(h.fecha_examen),
      formatearFecha(h.fecha_vencimiento),
      h.dias_restantes,
      ESTADOS[h.estado].texto,
    ]
      .map(celda)
      .join(';'),
  )
  return '﻿' + [encabezado.join(';'), ...filas].join('\r\n')
}

export function descargarCsv(lista: Habilitacion[], nombreArchivo: string) {
  const blob = new Blob([aCsv(lista)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo
  a.click()
  URL.revokeObjectURL(url)
}
