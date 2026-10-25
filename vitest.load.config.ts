import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/load/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 240000,
    hookTimeout: 60000,
  },
});
