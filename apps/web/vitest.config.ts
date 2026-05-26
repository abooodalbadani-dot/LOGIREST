import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: { 
    environment: 'jsdom', 
    setupFiles: ['src/tests/setup.ts'], 
    globals: true,
    exclude: ['**/node_modules/**', '**/dist/**', '**/tests/e2e/**']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@logirest/shared-types': path.resolve(__dirname, '../../packages/shared-types/src/index.ts'),
    },
  },
});
