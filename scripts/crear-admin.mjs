#!/usr/bin/env node
// Crea (o promueve) el primer usuario administrador.
//
//   node --env-file=.env.local scripts/crear-admin.mjs admin@empresa.com "Nombre Apellido"
//
// Necesita SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY. La service_role key saltea
// RLS: usala solo en tu PC, nunca en el frontend ni en Cloudflare.
import { createClient } from '@supabase/supabase-js'
import { createInterface } from 'node:readline'

const [email, nombre = ''] = process.argv.slice(2)
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env

if (!email || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Uso: node --env-file=.env.local scripts/crear-admin.mjs <email> "<nombre>"')
  console.error('Requiere SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno.')
  process.exit(1)
}

/** Pide la contraseña sin mostrarla en pantalla. */
function pedirContrasena(pregunta) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    rl._writeToOutput = (s) => {
      if (s.startsWith(pregunta)) rl.output.write(s)
    }
    rl.question(pregunta, (respuesta) => {
      rl.close()
      process.stdout.write('\n')
      resolve(respuesta)
    })
  })
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function buscarUsuario(email) {
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const u = data.users.find((x) => x.email?.toLowerCase() === email.toLowerCase())
    if (u || data.users.length < 200) return u ?? null
  }
}

const appMetadata = { rol: 'admin', nombre }
let usuario = await buscarUsuario(email)

if (usuario) {
  console.log(`El usuario ${email} ya existe: se lo hace administrador.`)
  const { error } = await supabase.auth.admin.updateUserById(usuario.id, {
    app_metadata: { ...usuario.app_metadata, ...appMetadata },
  })
  if (error) throw error
} else {
  const password = await pedirContrasena('Contraseña para el admin (mínimo 8 caracteres): ')
  if (password.length < 8) {
    console.error('La contraseña tiene que tener al menos 8 caracteres.')
    process.exit(1)
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: appMetadata,
  })
  if (error) throw error
  usuario = data.user
}

// El trigger de la base crea el perfil al crear el usuario; para un usuario
// que ya existía (o por las dudas) se asegura acá.
const { error } = await supabase
  .from('profiles')
  .upsert({ id: usuario.id, email: usuario.email, nombre, rol: 'admin', activo: true })
if (error) throw error

console.log(`Listo: ${email} es administrador. Ya puede ingresar a la app.`)
