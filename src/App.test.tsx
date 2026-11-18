import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { perfil, renderConAuth, sesion } from './test/renderConAuth'

vi.mock('./lib/datos', () => ({
  obtenerHabilitaciones: async () => [],
  obtenerEmpresas: async () => [],
  obtenerPersonas: async () => [],
}))

describe('rutas y roles', () => {
  it('sin sesión manda al login', () => {
    renderConAuth(<App />, {}, '/')
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeInTheDocument()
  })

  it('sin sesión tampoco deja entrar a administración', () => {
    renderConAuth(<App />, {}, '/admin')
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeInTheDocument()
    expect(screen.queryByText('Administración')).not.toBeInTheDocument()
  })

  it('mientras carga la sesión no muestra nada protegido', () => {
    renderConAuth(<App />, { cargando: true }, '/admin')
    expect(screen.getByRole('status')).toHaveTextContent('Cargando')
  })

  it('logueado sin perfil ve "Sin acceso"', () => {
    renderConAuth(<App />, { session: sesion, perfil: null }, '/')
    expect(screen.getByRole('heading', { name: 'Sin acceso' })).toBeInTheDocument()
  })

  it('un perfil dado de baja ve "Sin acceso"', () => {
    renderConAuth(<App />, { session: sesion, perfil: perfil('seguridad', { activo: false }) }, '/')
    expect(screen.getByRole('heading', { name: 'Sin acceso' })).toBeInTheDocument()
  })

  it('seguridad ve el listado pero no los menús de admin', () => {
    renderConAuth(<App />, { session: sesion, perfil: perfil('seguridad') }, '/')
    expect(screen.getByRole('heading', { name: 'Habilitados' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Nuevo examen' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Administración' })).not.toBeInTheDocument()
    expect(screen.getByText('Seguridad e Higiene')).toBeInTheDocument()
  })

  it('seguridad que entra a /admin por URL vuelve al listado', () => {
    renderConAuth(<App />, { session: sesion, perfil: perfil('seguridad') }, '/admin')
    expect(screen.getByRole('heading', { name: 'Habilitados' })).toBeInTheDocument()
  })

  it('seguridad que entra a /examenes/nuevo por URL vuelve al listado', () => {
    renderConAuth(<App />, { session: sesion, perfil: perfil('seguridad') }, '/examenes/nuevo')
    expect(screen.getByRole('heading', { name: 'Habilitados' })).toBeInTheDocument()
  })

  it('admin ve todos los menús y entra a administración', async () => {
    renderConAuth(<App />, { session: sesion, perfil: perfil('admin') }, '/')
    await userEvent.click(screen.getByRole('link', { name: 'Administración' }))
    expect(screen.getByRole('heading', { name: 'Administración' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Nuevo examen' })).toBeInTheDocument()
  })

  it('el botón Salir cierra la sesión', async () => {
    const { auth } = renderConAuth(<App />, { session: sesion, perfil: perfil('admin') }, '/')
    await userEvent.click(screen.getByRole('button', { name: 'Salir' }))
    expect(auth.salir).toHaveBeenCalled()
  })
})

describe('login', () => {
  it('muestra el error en castellano si las credenciales son incorrectas', async () => {
    const ingresar = async () => {
      throw { code: 'invalid_credentials', message: 'Invalid login credentials' }
    }
    renderConAuth(<App />, { ingresar }, '/login')
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.com')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'mala')
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('El email o la contraseña no son correctos.')
  })

  it('envía email y contraseña', async () => {
    const { auth } = renderConAuth(<App />, {}, '/login')
    await userEvent.type(screen.getByLabelText('Email'), 'admin@planta.com')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'secreta123')
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(auth.ingresar).toHaveBeenCalledWith('admin@planta.com', 'secreta123')
  })

  it('usa el título configurable', () => {
    renderConAuth(<App />, {}, '/login')
    expect(screen.getByRole('heading', { name: 'Habilitaciones (test)' })).toBeInTheDocument()
  })
})
