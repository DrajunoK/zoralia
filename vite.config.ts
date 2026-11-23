import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'

// `vite --mode mock` (npm run dev:mock) remplace le client Supabase par de fausses données pour travailler le design.
const mockSupabase = (): Plugin => ({
  name: 'zoralia-mock-supabase',
  enforce: 'pre',
  resolveId(source) {
    if (source.startsWith('.') && /\/supabase$/.test(source)) return fileURLToPath(new URL('./src/lib/supabase.mock.ts', import.meta.url))
  },
})

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [mode === 'mock' ? mockSupabase() : null, react()],
}))
