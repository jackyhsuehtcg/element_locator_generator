import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.js'],
    root: '.',
    coverage: {
      provider: 'v8',
      include: ['Extension/lib/**/*.js']
    }
  },
  resolve: {
    alias: {
      '@lib': path.resolve(__dirname, 'Extension/lib')
    }
  }
})