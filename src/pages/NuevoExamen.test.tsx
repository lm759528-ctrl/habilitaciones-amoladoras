import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { perfil, renderConAuth, sesion } from '../test/renderConAuth'
import { NuevoExamen } from './NuevoExamen'

const guardar = vi.hoisted(() => vi.fn())

vi.mock('../lib/datos', () => ({
  obtenerPersonas: async () => [
    { id: 'p1', nombre: 'Ana', apellido: 'Zapata', dni: '20111222', activo: true, empresa_id: 'e1' },
    { id: 'p2', nombre: 'Luis', apellido: 'Acosta', dni: '30999888', activo: true, empresa_id: 'e1' },
  ],
  obtenerEmpresas: async () => [{ id: 'e1', nombre: 'Contratista Uno', activo: true }],
  linkFirmadoPdf: async () => 'https://firmado.example/pdf',
}))

vi.mock('../lib/guardarExamen', async (original) => ({
  ...(await original<typeof import('../lib/guardarExamen')>()),
  guardarExamen: guardar,
}))

beforeEach(() => {
  guardar.mockReset()
  guardar.mockResolvedValue({ personaId: 'p1', examenId: 'x', pdfPath: 'p1/x.pdf' })
})

async function abrir() {
  renderConAuth(<NuevoExamen />, { session: sesion, perfil: perfil('admin', { nombre: 'Carlos Ríos' }) })
  await screen.findByRole('heading', { name: 'Nuevo examen' })
}

async function elegirPersona() {
  await userEvent.type(screen.getByLabelText('Buscar por nombre o DNI'), 'zapata')
  await userEvent.click(screen.getByRole('button', { name: /Zapata, Ana/ }))
}

async function responderTodo(respuesta: 'Sí' | 'No' | 'N/A' = 'Sí') {
  for (const grupo of screen.getAllByRole('radiogroup').filter((g) => g.getAttribute('aria-label') !== 'Resultado')) {
    await userEvent.click(within(grupo).getByRole('radio', { name: respuesta }))
  }
}

describe('Nuevo examen', () => {
  it('propone hoy como fecha, el usuario como evaluador y el vencimiento a 12 meses', async () => {
    await abrir()
    expect(screen.getByLabelText('Controló')).toHaveValue('Carlos Ríos')
    expect(screen.getAllByRole('radiogroup')).toHaveLength(28) // 27 puntos + resultado
  })

  it('no deja guardar incompleto y marca lo que falta', async () => {
    await abrir()
    await userEvent.click(screen.getByRole('button', { name: 'Guardar examen' }))
    expect(screen.getByText('Revisá los datos marcados en rojo antes de guardar.')).toBeInTheDocument()
    expect(screen.getByText('Elegí la persona o cargá una nueva.')).toBeInTheDocument()
    expect(screen.getByText('Faltan responder 27 puntos de la checklist.')).toBeInTheDocument()
    expect(screen.getAllByText('Falta responder')).toHaveLength(27)
    expect(guardar).not.toHaveBeenCalled()
  })

  it('guarda un examen apto completo', async () => {
    await abrir()
    await elegirPersona()
    await responderTodo()
    await userEvent.click(screen.getByRole('radio', { name: 'Apto' }))
    await userEvent.click(screen.getByRole('button', { name: 'Guardar examen' }))
    expect(guardar).toHaveBeenCalledTimes(1)
    const { seleccion, form } = guardar.mock.calls[0][0]
    expect(seleccion.persona.id).toBe('p1')
    expect(form).toMatchObject({ resultado: 'apto', controlo: 'Carlos Ríos', tipo: 'anual' })
    expect(await screen.findByRole('heading', { name: 'Examen guardado' })).toBeInTheDocument()
  })

  it('si hay un "No" y se marca Apto pide confirmación', async () => {
    await abrir()
    await elegirPersona()
    await responderTodo()
    const discoEstado = screen.getByRole('radiogroup', { name: 'Estado del disco' })
    await userEvent.click(within(discoEstado).getByRole('radio', { name: 'No' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Apto' }))
    await userEvent.click(screen.getByRole('button', { name: 'Guardar examen' }))

    const dialogo = screen.getByRole('alertdialog', { name: '¿Guardar como Apto?' })
    expect(within(dialogo).getByText('Estado del disco')).toBeInTheDocument()
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Volver a revisar' }))
    expect(guardar).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Guardar examen' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sí, guardar como Apto' }))
    expect(guardar).toHaveBeenCalledTimes(1)
  })

  it('un No apto con puntos en "No" no pide confirmación ni fechas', async () => {
    await abrir()
    await elegirPersona()
    await responderTodo('No')
    await userEvent.click(screen.getByRole('radio', { name: 'No apto' }))
    expect(screen.queryByLabelText('Vence')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Guardar examen' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(guardar).toHaveBeenCalledTimes(1)
  })

  it('tarea puntual pide la tarea y la fecha de fin', async () => {
    await abrir()
    await elegirPersona()
    await responderTodo()
    await userEvent.selectOptions(screen.getByLabelText('Tipo de habilitación'), 'tarea_puntual')
    await userEvent.click(screen.getByRole('radio', { name: 'Apto' }))
    expect(screen.getByLabelText(/Fecha de fin de la tarea/)).toHaveValue('')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar examen' }))
    expect(screen.getByText('Describí la tarea.')).toBeInTheDocument()
    expect(screen.getByText('Indicá la fecha de fin de la tarea.')).toBeInTheDocument()
    expect(guardar).not.toHaveBeenCalled()
  })

  it('permite cargar una persona nueva y avisa si el DNI ya existe', async () => {
    await abrir()
    await userEvent.type(screen.getByLabelText('Buscar por nombre o DNI'), '20.111.222')
    await userEvent.click(screen.getByRole('button', { name: /Zapata, Ana.*20111222/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Cambiar' }))
    await userEvent.type(screen.getByLabelText('Buscar por nombre o DNI'), '40111222')
    await userEvent.click(screen.getByRole('button', { name: '+ Cargar persona nueva' }))
    expect(screen.getByLabelText('DNI')).toHaveValue('40111222')
    await userEvent.clear(screen.getByLabelText('DNI'))
    await userEvent.type(screen.getByLabelText('DNI'), '30999888')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar examen' }))
    expect(screen.getByText('Ya hay una persona con ese DNI: buscala en la lista.')).toBeInTheDocument()
  })

  it('muestra el error si falla el guardado y deja reintentar', async () => {
    guardar.mockRejectedValueOnce({ message: 'Failed to fetch' })
    await abrir()
    await elegirPersona()
    await responderTodo()
    await userEvent.click(screen.getByRole('radio', { name: 'Apto' }))
    await userEvent.click(screen.getByRole('button', { name: 'Guardar examen' }))
    expect(await screen.findByText(/No hay conexión con el servidor/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Guardar examen' }))
    expect(await screen.findByRole('heading', { name: 'Examen guardado' })).toBeInTheDocument()
    expect(guardar.mock.calls[0][0].examenId).toBe(guardar.mock.calls[1][0].examenId)
  })
})
