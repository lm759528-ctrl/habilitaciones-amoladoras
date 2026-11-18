import { createClient } from '@supabase/supabase-js'
import { config } from './config'

// Las tablas viven en el esquema `habilitaciones` (no en public), para poder
// compartir el proyecto de Supabase con otras apps.
export const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
  db: { schema: 'habilitaciones' },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Los links de invitación y de recuperación traen la sesión en la URL.
    detectSessionInUrl: true,
  },
})
