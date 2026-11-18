import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { perfil, renderConAuth, sesion } from '../test/renderConAuth'
import { DetallePersona } from './DetallePersona'

const base = {
  persona_id: 'p1', empresa_id: 'e1', controlo: 'Carlos Evaluador', resultado: 'apto', tipo_habilitacion: 'anual',
  descripcion_tarea: null, observaciones: null, pdf_path: 'p1/a.pdf', anulado: false, motivo_anulacion: null,
  created_at: '2026-01-01T12:00:00Z',
}

vi.mock('../lib/datos', () => ({
  obtenerPersona: async (id: string) =>
    id === 'p1'
      ? { id: 'p1', nombre: 'Ana', apellido: 'Zapata', dni: '20111222', activo: true, empresa_id: 'e1', empresa: { nombre: 'Contratista Uno' } }
      : null,
  obtenerHistorial: async () => [
    { ...base, id: 'x3', fecha_examen: '2026-11-01', fecha_inicio: '2026-11-01', fecha_vencimiento: '2027-11-01', dias_restantes: 348, estado: 'vigente' },
    { ...base, id: 'x2', fecha_examen: '2026-10-01', fecha_inicio: null, fecha_vencimiento: null, dias_restantes: null, resultado: 'no_apto', estado: 'no_apto', pdf_path: null },
    { ...base, id: 'x1', fecha_examen: '2025-11-01', fecha_inicio: '2025-11-01', fecha_vencimiento: '2026-11-01', dias_restantes: -17, estado: 'renovado' },
    { ...base, id: 'x0', fecha_examen: '2025-10-01', fecha_inicio: '2025-10-01', fecha_vencimiento: '2026-10-01', dias_restantes: -48, estado: 'anulado', anulado: true, motivo_anulacion: 'Carga duplicada' },
  ],
  obtenerEmpresas: async () => [{ id: 'e1', nombre: 'Contratista Uno', activo: true }],
  linkFirmadoPdf: async () => 'https://firmado.example/pdf',
}))

function render(ruta: string) {
  return renderConAuth(
    <Routes>
      <Route path="/personas/:id" element={<DetallePersona />} />
    </Routes>,
    { session: sesion, perfil: perfil('seguridad') },
    ruta,
  )
}

describe('DetallePersona', () => {
  it('muestra los datos y todo el historial con su estado', async () => {
    render('/personas/p1')
    expect(await screen.findByRole('heading', { name: 'Zapata, Ana' })).toBeInTheDocument()
    expect(screen.getByText('20111222')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(4)
    expect(screen.getByText('Examen del 01/11/2026')).toBeInTheDocument()
    expect(screen.getByText('01/11/2026 al 01/11/2027', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('Renovado')).toBeInTheDocument()
    expect(screen.getByText('Anulado')).toBeInTheDocument()
    expect(screen.getByText('Carga duplicada')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Ver PDF' })).toHaveLength(3)
    expect(screen.getByText('Sin PDF')).toBeInTheDocument()
  })

  it('avisa si la persona no existe', async () => {
    render('/personas/otra')
    expect(await screen.findByRole('heading', { name: 'Persona no encontrada' })).toBeInTheDocument()
  })
})
