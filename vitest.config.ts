import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // os percursos de ponta a ponta são do Playwright, não do Vitest
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
})
