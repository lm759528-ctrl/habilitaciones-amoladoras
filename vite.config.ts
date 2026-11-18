/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Sin estas variables la app publicada queda en blanco: mejor que falle el build
// (por ejemplo en Cloudflare Pages) con un mensaje claro.
// Cada entrada acepta varios nombres (la key de Supabase se llama "anon" o "publishable").
const REQUERIDAS = [['VITE_SUPABASE_URL'], ['VITE_SUPABASE_ANON_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY']]

export default defineConfig(({ command, mode }) => {
  if (command === 'build') {
    const env = loadEnv(mode, process.cwd(), 'VITE_')
    const faltan = REQUERIDAS.filter((nombres) => !nombres.some((n) => env[n]?.trim())).map((n) => n.join(' o '))
    if (faltan.length) {
      throw new Error(
        `Faltan las variables ${faltan.join(' y ')}. En Cloudflare Pages: Settings → Variables and Secrets ` +
          '(Production y Preview), y después Retry deployment. En tu PC: archivo .env.local (ver .env.example).',
      )
    }
  }
  return config
})

const config = {
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    env: {
      VITE_SUPABASE_URL: 'http://localhost:54321',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
      VITE_APP_TITLE: 'Habilitaciones (test)',
    },
  },
}
