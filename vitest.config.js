import { defineConfig } from 'vitest';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setupTests.js',
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', 'src/test'],
    },
  },
});