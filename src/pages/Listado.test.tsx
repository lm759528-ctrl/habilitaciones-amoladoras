import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Habilitacion } from '../lib/habilitaciones'
import { perfil, renderConAuth, sesion } from '../test/renderConAuth'
import { Listado } from './Listado'

const datos = vi.hoisted(() => ({
  habilitaciones: [] as Habilitacion[],
  falla: false,
}))

vi.mock('../lib/datos', () => ({
  obtenerHabilitaciones: async () => {
    if (datos.falla) throw new Error('sin red')
    return datos.habilitaciones
  },
  obtenerEmpresas: async () => [
    { id: 'e1', nombre: 'Contratista Uno', activo: true },
    { id: 'e2', nombre: 'Contratista Dos', activo: true },
  ],
  linkFirmadoPdf: async () => 'https://firmado.example/pdf',
}))

function hab(extra: Partial<Habilitacion>): Habilitacion {
  return {
    persona_id: 'p', nombre: 'Juan', apellido: 'Pérez', dni: '30111222', persona_activa: true,
    empresa_id: 'e1', empresa_nombre: 'Contratista Uno', examen_id: 'x', fecha_examen: '2026-01-10',
    controlo: 'Evaluador', resultado: 'apto', tipo_habilitacion: 'anual', descripcion_tarea: null,
    fecha_inicio: '2026-01-10', fecha_vencimiento: '2027-01-10', dias_restantes: 100, estado: 'vigente',
    pdf_path: 'p/x.pdf', ...extra,
  }
}

function render() {
  return renderConAuth(<Listado />, { session: sesion, perfil: perfil('seguridad') })
}

function tabla() {
  return within(screen.getByRole('table'))
}

beforeEach(() => {
  datos.falla = false
  datos.habilitaciones = [
    hab({ persona_id: '1', apellido: 'Zapata', nombre: 'Ana', dni: '20111222' }),
    hab({ persona_id: '2', apellido: 'Acosta', nombre: 'Luis', dni: '30999888', estado: 'por_vencer', dias_restantes: 5, empresa_id: 'e2', empresa_nombre: 'Contratista Dos' }),
    hab({ persona_id: '3', apellido: 'Méndez', nombre: 'Eva', dni: '25000111', estado: 'vencido', dias_restantes: -2, fecha_vencimiento: '2026-11-16' }),
    hab({ persona_id: '4', apellido: 'Ruiz', nombre: 'Carlos', dni: '28000111', tipo_habilitacion: 'tarea_puntual', descripcion_tarea: 'Corte de reja sector B' }),
    hab({ persona_id: '5', apellido: 'Baja', nombre: 'Persona', persona_activa: false }),
  ]
})

describe('Listado', () => {
  it('muestra el resumen de vigentes, por vencer y vencidos', async () => {
    render()
    expect(await screen.findByRole('button', { name: /2\s*Vigentes/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /1\s*Por vencer/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /1\s*Vencidos/ })).toBeInTheDocument()
  })

  it('ordena por apellido, oculta dadas de baja y muestra fechas dd/mm/aaaa', async () => {
    render()
    await screen.findByRole('table')
    const filas = tabla().getAllByRole('row').slice(1)
    expect(filas.map((f) => within(f).getAllByRole('cell')[0].textContent)).toEqual([
      'Acosta, Luis', 'Méndez, Eva', 'Ruiz, Carlos', 'Zapata, Ana',
    ])
    expect(tabla().getByText('16/11/2026')).toBeInTheDocument()
    expect(tabla().getByText('Venció hace 2 días')).toBeInTheDocument()
  })

  it('muestra "Solo para" en las tareas puntuales', async () => {
    render()
    await screen.findByRole('table')
    expect(tabla().getByText('Solo para: Corte de reja sector B')).toBeInTheDocument()
  })

  it('busca por DNI con puntos', async () => {
    render()
    await screen.findByRole('table')
    await userEvent.type(screen.getByLabelText('Buscar'), '30.999')
    expect(tabla().getAllByRole('row')).toHaveLength(2)
    expect(tabla().getByText('Acosta, Luis')).toBeInTheDocument()
  })

  it('filtra por empresa', async () => {
    render()
    await screen.findByRole('table')
    await userEvent.selectOptions(screen.getByLabelText('Empresa'), 'e2')
    expect(tabla().getAllByRole('row')).toHaveLength(2)
  })

  it('tocar una tarjeta del resumen filtra por ese estado, y tocarla otra vez lo quita', async () => {
    render()
    const vencidos = await screen.findByRole('button', { name: /Vencidos/ })
    await userEvent.click(vencidos)
    expect(tabla().getAllByRole('row')).toHaveLength(2)
    expect(tabla().getByText('Méndez, Eva')).toBeInTheDocument()
    await userEvent.click(vencidos)
    expect(tabla().getAllByRole('row')).toHaveLength(5)
  })

  it('avisa cuando nadie coincide', async () => {
    render()
    await screen.findByRole('table')
    await userEvent.type(screen.getByLabelText('Buscar'), 'inexistente')
    expect(screen.getByText('Nadie coincide con la búsqueda.')).toBeInTheDocument()
  })

  it('muestra un error con reintento si falla la carga', async () => {
    datos.falla = true
    render()
    expect(await screen.findByText(/No se pudieron cargar los datos/)).toBeInTheDocument()
    datos.falla = false
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('table')).toBeInTheDocument()
  })

  it('el botón Ver PDF abre el link firmado', async () => {
    const ventana = { location: { href: '' }, close: vi.fn() }
    const open = vi.spyOn(window, 'open').mockReturnValue(ventana as unknown as Window)
    render()
    await screen.findByRole('table')
    await userEvent.click(tabla().getAllByRole('button', { name: 'Ver PDF' })[0])
    expect(open).toHaveBeenCalledWith('', '_blank')
    await vi.waitFor(() => expect(ventana.location.href).toBe('https://firmado.example/pdf'))
  })
})
