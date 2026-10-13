import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./frontend/src', import.meta.url)) } },
  test: {
    environment: 'node',
    include: [
      'backend/src/**/*.test.ts',
      'frontend/src/**/*.test.ts',
      'packages/*/src/**/*.test.ts',
    ],
    clearMocks: true,
  },
});
