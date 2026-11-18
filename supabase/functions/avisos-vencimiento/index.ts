// Edge Function: un mail resumen diario con las habilitaciones por vencer.
// La dispara pg_cron todos los días a las 8:00 de Argentina (ver migración
// 20261118000500_cron_avisos.sql). También se puede llamar a mano para probar:
//   curl -X POST "$URL/functions/v1/avisos-vencimiento" -H "x-cron-secret: ..." -d '{"prueba":true}'
import { createClient } from 'npm:@supabase/supabase-js@2.119.0'
import { enviarMail } from './envio.ts'
import { armarMail, seleccionarAvisos, type ExamenPorVencer } from './logica.ts'

const json = (status: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } })

function mismoSecreto(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a)
  const y = new TextEncoder().encode(b)
  if (x.length !== y.length) return false
  let diff = 0
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i]
  return diff === 0
}

function hoyAR(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Usá POST' })

  const secreto = Deno.env.get('CRON_SECRET')
  if (!secreto || !mismoSecreto(req.headers.get('x-cron-secret') ?? '', secreto)) {
    return json(401, { error: 'No autorizado' })
  }

  const { prueba = false } = await req.json().catch(() => ({}))
  const alerta = Deno.env.get('ALERT_EMAIL')
  if (!alerta && !prueba) return json(500, { error: 'Falta la variable ALERT_EMAIL' })

  // Service role: lee todo sin RLS. La key la inyecta Supabase en la función.
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
    db: { schema: 'habilitaciones' },
  })

  try {
    const { data: config, error: e1 } = await db.from('configuracion').select('dias_aviso').single()
    if (e1) throw e1
    const umbrales: number[] = config.dias_aviso
    const maximo = Math.max(...umbrales)

    // 'renovado' y 'anulado' quedan afuera por el estado; vencidos, por los días.
    const { data: examenes, error: e2 } = await db
      .from('examenes_estado')
      .select('id, persona_id, empresa_id, tipo_habilitacion, descripcion_tarea, fecha_vencimiento, dias_restantes')
      .in('estado', ['vigente', 'por_vencer'])
      .gte('dias_restantes', 0)
      .lte('dias_restantes', maximo)
    if (e2) throw e2
    if (!examenes.length) return json(200, { enviados: 0, motivo: 'No hay vencimientos dentro de los umbrales' })

    const [personas, empresas, enviados] = await Promise.all([
      db.from('personas').select('id, nombre, apellido, dni, activo').in('id', [...new Set(examenes.map((e) => e.persona_id))]),
      db.from('empresas').select('id, nombre').in('id', [...new Set(examenes.map((e) => e.empresa_id))]),
      db.from('avisos_enviados').select('examen_id, umbral_dias').in('examen_id', examenes.map((e) => e.id)),
    ])
    for (const r of [personas, empresas, enviados]) if (r.error) throw r.error

    const persona = new Map(personas.data!.map((p) => [p.id, p]))
    const empresa = new Map(empresas.data!.map((e) => [e.id, e.nombre]))
    const candidatos: ExamenPorVencer[] = examenes
      .filter((e) => persona.get(e.persona_id)?.activo)
      .map((e) => {
        const p = persona.get(e.persona_id)!
        return { ...e, nombre: p.nombre, apellido: p.apellido, dni: p.dni, empresa: empresa.get(e.empresa_id) ?? '' }
      })

    const avisos = seleccionarAvisos(candidatos, umbrales, enviados.data!)
    if (!avisos.length) return json(200, { enviados: 0, motivo: 'Los avisos de hoy ya se habían enviado' })

    const mail = armarMail(avisos, {
      appUrl: Deno.env.get('APP_URL') ?? '',
      titulo: Deno.env.get('APP_TITLE') ?? 'Habilitaciones de amoladoras',
      hoy: hoyAR(),
    })

    if (prueba) return json(200, { prueba: true, para: alerta ?? null, asunto: mail.asunto, texto: mail.texto, avisos: avisos.length })

    await enviarMail(alerta!, mail)

    // Se registra después de enviar: si el envío falla, mañana se reintenta.
    const { error: e3 } = await db
      .from('avisos_enviados')
      .upsert(avisos.map((a) => ({ examen_id: a.examen.id, umbral_dias: a.umbral })), { onConflict: 'examen_id,umbral_dias', ignoreDuplicates: true })
    if (e3) console.error('Mail enviado pero no se pudo registrar en avisos_enviados', e3)

    console.log(JSON.stringify({ evento: 'avisos_enviados', cantidad: avisos.length }))
    return json(200, { enviados: avisos.length })
  } catch (error) {
    console.error(JSON.stringify({ evento: 'avisos_error', error: String((error as Error)?.message ?? error) }))
    return json(500, { error: 'No se pudieron procesar los avisos. Revisá los logs de la función.' })
  }
})
