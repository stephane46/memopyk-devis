import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: __dirname,
  // Prevent Vite from searching PostCSS config in this backend package
  css: { postcss: null },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: [],
    globals: true,
  },
});
