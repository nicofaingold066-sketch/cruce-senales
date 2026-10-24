import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'

export default defineConfig(({ mode }) => ({
  test: {
    // Pruebas puras de los componentes nuevos del equipo (friccion, componentes-nuevos) viven junto al código.
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    environment: 'node',
    env: loadEnv(mode, process.cwd(), 'VITE_'),
  },
}))
