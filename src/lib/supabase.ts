import { createClient } from '@supabase/supabase-js'
import { config } from './config'

export const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Los links de invitación y de recuperación traen la sesión en la URL.
    detectSessionInUrl: true,
  },
})
