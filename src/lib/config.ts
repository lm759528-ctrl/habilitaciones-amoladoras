function requerida(nombre: string, valor: string | undefined): string {
  if (!valor) {
    throw new Error(`Falta la variable de entorno ${nombre}. Revisá .env.example.`)
  }
  return valor
}

export const config = {
  supabaseUrl: requerida('VITE_SUPABASE_URL', import.meta.env.VITE_SUPABASE_URL),
  // Supabase llama a esta key "anon" o "publishable" según el panel: sirve cualquiera de los dos nombres.
  supabaseAnonKey: requerida(
    'VITE_SUPABASE_ANON_KEY',
    import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  ),
  appTitle: import.meta.env.VITE_APP_TITLE || 'Habilitaciones de amoladoras',
}
