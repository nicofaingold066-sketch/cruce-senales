import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'

export default defineConfig(({ mode }) => ({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    env: loadEnv(mode, process.cwd(), 'VITE_'),
  },
}))
