import react from '@vitejs/plugin-react'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
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

// Chaque build écrit son identifiant dans sw.js : le fichier change à chaque déploiement, donc le navigateur
// installe la nouvelle version et vide l'ancien cache (voir public/sw.js).
const serviceWorkerBuildId = (): Plugin => {
  let out = 'dist'
  return {
    name: 'zoralia-sw-build-id',
    apply: 'build',
    configResolved(config) { out = resolve(config.root, config.build.outDir) },
    closeBundle() {
      const file = resolve(out, 'sw.js')
      if (existsSync(file)) writeFileSync(file, readFileSync(file, 'utf8').replace("const BUILD = '__BUILD__'", `const BUILD = '${Date.now().toString(36)}'`))
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [mode === 'mock' ? mockSupabase() : null, react(), serviceWorkerBuildId()],
}))
