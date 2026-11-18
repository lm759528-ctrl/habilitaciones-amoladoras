import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { perfil, renderConAuth, sesion } from '../test/renderConAuth'
import { Administracion } from './Administracion'

const invitar = vi.fn(async (_d: unknown) => ({ existente: false }))
const guardarEmpresa = vi.fn(async (_d: unknown) => {})

vi.mock('../lib/admin', () => ({
  obtenerUsuarios: async () => [
    { id: 'u1', nombre: 'Usuario Test', email: 'test@test.local', rol: 'admin', activo: true },
    { id: 'u2', nombre: 'Laura Seguridad', email: 'laura@planta.local', rol: 'seguridad', activo: true },
  ],
  invitarUsuario: (d: unknown) => invitar(d),
  actualizarUsuario: vi.fn(async () => {}),
  guardarEmpresa: (d: unknown) => guardarEmpresa(d),
  guardarPersona: vi.fn(async () => {}),
  cambiarActivoPersona: vi.fn(async () => {}),
  mensajeErrorAdmin: () => 'error',
}))

vi.mock('../lib/datos', () => ({
  obtenerEmpresas: async () => [{ id: 'e1', nombre: 'Contratista Uno', activo: true }],
  obtenerPersonas: async () => [{ id: 'p1', nombre: 'Ana', apellido: 'Zapata', dni: '20111222', activo: true, empresa_id: 'e1' }],
}))

const render = (ruta: string) => renderConAuth(<Administracion />, { session: sesion, perfil: perfil('admin') }, ruta)

describe('Administracion', () => {
  it('lista personas por defecto', async () => {
    render('/admin')
    expect(await screen.findByText(/Zapata, Ana/)).toBeInTheDocument()
  })

  it('agrega una empresa', async () => {
    render('/admin?seccion=empresas')
    expect(await screen.findByText('Contratista Uno')).toBeInTheDocument()
    const inputs = screen.getAllByRole('textbox')
    fireEvent.change(inputs[0], { target: { value: 'Montajes del Sur' } })
    fireEvent.click(screen.getByRole('button', { name: /Agregar/ }))
    await waitFor(() => expect(guardarEmpresa).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Montajes del Sur' })))
  })

  it('invita un usuario de Seguridad e Higiene', async () => {
    render('/admin?seccion=usuarios')
    expect(await screen.findByText('Laura Seguridad')).toBeInTheDocument()
    expect(screen.getByText(/\(vos\)/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'nuevo@planta.local' } })
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Pedro Gómez' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar invitación' }))
    await waitFor(() =>
      expect(invitar).toHaveBeenCalledWith(expect.objectContaining({ email: 'nuevo@planta.local', nombre: 'Pedro Gómez' })),
    )
  })

  it('si el email ya tenía cuenta de otra app, avisa que entra con su contraseña', async () => {
    invitar.mockResolvedValueOnce({ existente: true })
    render('/admin?seccion=usuarios')
    await screen.findByText('Laura Seguridad')
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'ya@planta.local' } })
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Ya Existe' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar invitación' }))
    expect(await screen.findByText(/ya tenía cuenta/)).toBeInTheDocument()
  })
})
