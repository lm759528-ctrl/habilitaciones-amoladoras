// Edge Function: el admin invita a un usuario por email y le asigna el rol.
// La invitación necesita la service role key, que nunca llega al navegador.
// Supabase verifica el JWT del que llama (verify_jwt) y acá además se exige
// que su perfil sea admin activo.
import { createClient } from 'npm:@supabase/supabase-js@2.119.0'
import { validarPedido } from './validar.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (status: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json(405, { error: 'Usá POST' })

  const url = Deno.env.get('SUPABASE_URL')!
  const authorization = req.headers.get('Authorization') ?? ''

  // 1. ¿Quién llama? Con su propio token, así RLS solo le deja ver su perfil.
  const comoUsuario = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
    db: { schema: 'habilitaciones' },
  })
  const { data: quien } = await comoUsuario.auth.getUser()
  if (!quien.user) return json(401, { error: 'Tenés que ingresar de nuevo.' })
  const { data: perfil } = await comoUsuario.from('profiles').select('rol, activo').eq('id', quien.user.id).maybeSingle()
  if (perfil?.rol !== 'admin' || !perfil.activo) return json(403, { error: 'Solo un administrador puede invitar usuarios.' })

  // 2. ¿Qué pide?
  const validacion = validarPedido(await req.json().catch(() => null))
  if (!validacion.ok) return json(400, { error: validacion.error })
  const { email, nombre, rol } = validacion.pedido

  // 3. Invitar con la service role key.
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
    db: { schema: 'habilitaciones' },
  })
  const appUrl = (Deno.env.get('APP_URL') ?? '').replace(/\/+$/, '')

  // El proyecto de Supabase puede tener usuarios de otra app: si el email ya
  // tiene cuenta, no se manda invitación y se le da acceso con su contraseña.
  const existente = await buscarUsuario(admin, email)
  let id: string
  if (existente) {
    id = existente.id
  } else {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { nombre },
      redirectTo: appUrl ? `${appUrl}/nueva-contrasena` : undefined,
    })
    if (error) {
      console.error(JSON.stringify({ evento: 'invitacion_error', error: error.message }))
      return json(502, { error: 'No se pudo enviar la invitación. Revisá la configuración de mail de Supabase Auth.' })
    }
    id = data.user.id
  }

  // 4. Rol: en app_metadata (solo lo escribe la service role) y en profiles.
  // Claves con prefijo para no pisar las de otras apps del mismo proyecto.
  const r1 = await admin.auth.admin.updateUserById(id, {
    app_metadata: { ...existente?.app_metadata, habilitaciones_rol: rol, habilitaciones_nombre: nombre },
  })
  const r2 = await admin.from('profiles').upsert({ id, email, nombre, rol, activo: true })
  if (r1.error || r2.error) {
    console.error(JSON.stringify({ evento: 'invitacion_rol_error', error: (r1.error ?? r2.error)?.message }))
    return json(500, { error: 'Se mandó la invitación pero no se pudo asignar el rol. Asignalo desde la lista.' })
  }

  console.log(JSON.stringify({ evento: existente ? 'acceso_agregado' : 'usuario_invitado', rol, por: quien.user.id }))
  return json(200, { id, existente: Boolean(existente) })
})

// Solo usa auth.admin, así que alcanza con el tipo de ese pedazo del cliente.
type ClienteAdmin = { auth: { admin: Pick<ReturnType<typeof createClient>["auth"]["admin"], "listUsers"> } }

async function buscarUsuario(admin: ClienteAdmin, email: string) {
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const u = data.users.find((x) => x.email?.toLowerCase() === email.toLowerCase())
    if (u || data.users.length < 200) return u ?? null
  }
}
