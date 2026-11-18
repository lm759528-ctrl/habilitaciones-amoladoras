import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { BotonPdf } from '../components/BotonPdf'
import { Cargando } from '../components/Cargando'
import { ErrorCarga } from '../components/ErrorCarga'
import { DialogoConfirmar } from '../components/examen/DialogoConfirmar'
import { SeccionChecklist } from '../components/examen/SeccionChecklist'
import { SelectorPersona } from '../components/examen/SelectorPersona'
import { Aviso, Boton } from '../components/ui'
import { CHECKLIST } from '../lib/checklist'
import { obtenerEmpresas, obtenerPersonas, type Empresa, type PersonaLista } from '../lib/datos'
import { calcularVencimiento, formVacio, itemsEnNo, validarExamen, type FormExamen } from '../lib/examen'
import { formatearFecha, hoyAR } from '../lib/fechas'
import { guardarExamen, mensajeErrorGuardado, validarPersona, type ResultadoGuardado, type SeleccionPersona } from '../lib/guardarExamen'
import { TIPOS, type TipoHabilitacion } from '../lib/habilitaciones'
import { useConsulta } from '../lib/useConsulta'

const claseInput = 'min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-base'

function Campo({ etiqueta, error, children }: { etiqueta: string; error?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
      {etiqueta}
      {children}
      {error && <span className="text-sm font-normal text-red-700">{error}</span>}
    </label>
  )
}

function Bloque({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-lg font-semibold text-slate-900">{titulo}</h2>
      {children}
    </section>
  )
}

export function NuevoExamen() {
  const personas = useConsulta(obtenerPersonas, [])
  const empresas = useConsulta(obtenerEmpresas, [])

  if (personas.cargando || empresas.cargando) return <Cargando />
  if (personas.error || empresas.error) return <ErrorCarga recargar={() => (personas.recargar(), empresas.recargar())} />
  return <FormularioExamen personasIniciales={personas.datos ?? []} empresasIniciales={empresas.datos ?? []} />
}

function FormularioExamen({ personasIniciales, empresasIniciales }: { personasIniciales: PersonaLista[]; empresasIniciales: Empresa[] }) {
  const { perfil } = useAuth()
  const [personas, setPersonas] = useState(personasIniciales)
  const [empresas, setEmpresas] = useState(empresasIniciales)
  const [examenId, setExamenId] = useState(() => crypto.randomUUID())
  const [seleccion, setSeleccion] = useState<SeleccionPersona | null>(null)
  const [form, setForm] = useState<FormExamen>(() => formVacio(hoyAR(), perfil?.nombre ?? ''))
  const [intentoGuardar, setIntentoGuardar] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null)
  const [guardado, setGuardado] = useState<ResultadoGuardado | null>(null)

  const errores = useMemo(() => validarExamen(form), [form])
  const erroresPersona = useMemo(() => validarPersona(seleccion, personas), [seleccion, personas])
  const mostrar = (clave: string, lista: Record<string, string | undefined> = errores) => (intentoGuardar ? lista[clave] : undefined)
  const enNo = itemsEnNo(form)

  function cambiar(cambios: Partial<FormExamen>) {
    setForm((f) => {
      const nuevo = { ...f, ...cambios }
      // El vencimiento se recalcula al cambiar el tipo o el inicio; después el admin lo puede editar.
      if ('tipo' in cambios || 'fechaInicio' in cambios) {
        nuevo.fechaVencimiento = nuevo.tipo === 'tarea_puntual' ? (cambios.tipo ? '' : f.fechaVencimiento) : calcularVencimiento(nuevo.tipo, nuevo.fechaInicio)
      }
      return nuevo
    })
  }

  function cambiarFechaExamen(fecha: string) {
    // Mientras el inicio venga siendo igual a la fecha del examen, lo acompaña.
    cambiar(form.fechaInicio === form.fechaExamen ? { fechaExamen: fecha, fechaInicio: fecha } : { fechaExamen: fecha })
  }

  function responder(id: string, cambios: { respuesta?: FormExamen['respuestas'][string]['respuesta']; comentario?: string }) {
    setForm((f) => ({
      ...f,
      respuestas: { ...f.respuestas, [id]: { ...(f.respuestas[id] ?? { comentario: '' }), ...cambios } },
    }))
  }

  function enviar(e: FormEvent) {
    e.preventDefault()
    setIntentoGuardar(true)
    setErrorGuardado(null)
    if (Object.keys(errores).length || Object.keys(erroresPersona).length) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (form.resultado === 'apto' && enNo.length) {
      setConfirmando(true)
      return
    }
    void guardar()
  }

  async function guardar() {
    setConfirmando(false)
    setGuardando(true)
    try {
      const r = await guardarExamen({
        examenId,
        seleccion: seleccion!,
        form,
        empresas,
        alCrearEmpresa: (em) => setEmpresas((l) => [...l, em]),
        alCrearPersona: (p) => {
          setPersonas((l) => [...l, p])
          setSeleccion({ tipo: 'existente', persona: p })
        },
      })
      setGuardado(r)
      window.scrollTo({ top: 0 })
    } catch (err) {
      setErrorGuardado(mensajeErrorGuardado(err))
    } finally {
      setGuardando(false)
    }
  }

  function otroExamen() {
    setGuardado(null)
    setSeleccion(null)
    setExamenId(crypto.randomUUID())
    setForm(formVacio(hoyAR(), form.controlo))
    setIntentoGuardar(false)
  }

  if (guardado) {
    return (
      <section className="mx-auto flex max-w-lg flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Examen guardado</h1>
        <Aviso tipo="ok">Se registró el examen y se generó el PDF.</Aviso>
        <div className="flex flex-wrap gap-3">
          <BotonPdf path={guardado.pdfPath} />
          <Link to={`/personas/${guardado.personaId}`} className="inline-flex min-h-9 items-center rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-100">
            Ver historial de la persona
          </Link>
        </div>
        <Boton type="button" onClick={otroExamen}>Cargar otro examen</Boton>
      </section>
    )
  }

  const totalErrores = intentoGuardar ? Object.keys(errores).length + Object.keys(erroresPersona).length : 0

  return (
    <form onSubmit={enviar} noValidate className="mx-auto flex max-w-3xl flex-col gap-5">
      <h1 className="text-2xl font-semibold text-slate-900">Nuevo examen</h1>
      {totalErrores > 0 && <Aviso tipo="error">Revisá los datos marcados en rojo antes de guardar.</Aviso>}

      <Bloque titulo="Persona evaluada">
        <SelectorPersona
          personas={personas}
          empresas={empresas}
          valor={seleccion}
          errores={intentoGuardar ? erroresPersona : {}}
          onChange={setSeleccion}
        />
      </Bloque>

      <Bloque titulo="Datos del examen">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Fecha del examen" error={mostrar('fechaExamen')}>
            <input type="date" value={form.fechaExamen} onChange={(e) => cambiarFechaExamen(e.target.value)} className={claseInput} />
          </Campo>
          <Campo etiqueta="Controló" error={mostrar('controlo')}>
            <input value={form.controlo} onChange={(e) => cambiar({ controlo: e.target.value })} className={claseInput} placeholder="Nombre de quien evaluó" />
          </Campo>
        </div>
        <Campo etiqueta="Tipo de habilitación">
          <select value={form.tipo} onChange={(e) => cambiar({ tipo: e.target.value as TipoHabilitacion })} className={claseInput}>
            {Object.entries(TIPOS).map(([valor, texto]) => (
              <option key={valor} value={valor}>{texto}</option>
            ))}
          </select>
        </Campo>
        {form.tipo === 'tarea_puntual' && (
          <Campo etiqueta="Tarea habilitada" error={mostrar('descripcionTarea')}>
            <input value={form.descripcionTarea} onChange={(e) => cambiar({ descripcionTarea: e.target.value })} className={claseInput} placeholder="Ej.: corte de cañería en sala de bombas" />
          </Campo>
        )}
      </Bloque>

      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-slate-900">Checklist</h2>
        {mostrar('checklist') && <span className="text-sm text-red-700">{errores.checklist}</span>}
      </div>
      {CHECKLIST.secciones.map((s) => (
        <SeccionChecklist
          key={s.titulo}
          seccion={s}
          respuestas={form.respuestas}
          marcarFaltantes={intentoGuardar}
          onRespuesta={(id, respuesta) => responder(id, { respuesta })}
          onComentario={(id, comentario) => responder(id, { comentario })}
        />
      ))}

      <Bloque titulo="Resultado">
        <div role="radiogroup" aria-label="Resultado" className="grid grid-cols-2 gap-3">
          {([['apto', 'Apto', 'border-green-600 bg-green-600 text-white'], ['no_apto', 'No apto', 'border-red-600 bg-red-600 text-white']] as const).map(([valor, texto, elegido]) => (
            <label
              key={valor}
              className={
                'flex min-h-14 cursor-pointer items-center justify-center rounded-lg border-2 text-lg font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-slate-800 ' +
                (form.resultado === valor ? elegido : 'border-slate-300 bg-white text-slate-700')
              }
            >
              <input type="radio" name="resultado" value={valor} checked={form.resultado === valor} onChange={() => cambiar({ resultado: valor })} className="sr-only" />
              {texto}
            </label>
          ))}
        </div>
        {mostrar('resultado') && <span className="text-sm text-red-700">{errores.resultado}</span>}

        {form.resultado === 'apto' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Habilitado desde" error={mostrar('fechaInicio')}>
              <input type="date" value={form.fechaInicio} onChange={(e) => cambiar({ fechaInicio: e.target.value })} className={claseInput} />
            </Campo>
            <Campo etiqueta={form.tipo === 'tarea_puntual' ? 'Fecha de fin de la tarea' : 'Vence'} error={mostrar('fechaVencimiento')}>
              <input type="date" value={form.fechaVencimiento} min={form.fechaInicio} onChange={(e) => cambiar({ fechaVencimiento: e.target.value })} className={claseInput} />
              <span className="text-xs font-normal text-slate-500">
                {form.fechaVencimiento && <>Vence el {formatearFecha(form.fechaVencimiento)}. </>}
                {form.tipo !== 'tarea_puntual' && <>Se calcula sola ({TIPOS[form.tipo].toLowerCase()}), pero la podés cambiar.</>}
              </span>
            </Campo>
          </div>
        )}
        {form.resultado === 'no_apto' && <p className="text-sm text-slate-600">Un examen No apto no genera habilitación.</p>}

        <Campo etiqueta="Observaciones">
          <textarea value={form.observaciones} onChange={(e) => cambiar({ observaciones: e.target.value })} rows={3} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-base" />
        </Campo>
      </Bloque>

      {errorGuardado && <Aviso tipo="error">{errorGuardado}</Aviso>}
      <Boton type="submit" disabled={guardando} className="min-h-14 text-lg">
        {guardando ? 'Guardando y generando PDF…' : 'Guardar examen'}
      </Boton>

      {confirmando && (
        <DialogoConfirmar
          titulo="¿Guardar como Apto?"
          confirmar="Sí, guardar como Apto"
          cancelar="Volver a revisar"
          onConfirmar={() => void guardar()}
          onCancelar={() => setConfirmando(false)}
        >
          <p>Hay {enNo.length === 1 ? 'un punto marcado' : `${enNo.length} puntos marcados`} con “No”:</p>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {enNo.map((i) => <li key={i.id}>{i.texto}</li>)}
          </ul>
        </DialogoConfirmar>
      )}
    </form>
  )
}
