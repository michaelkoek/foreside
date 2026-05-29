import { defineConfig } from 'vitest/config';

const BASE_URL = process.env.BASE_URL || 'http://gateway.foreside-beer-case.orb.local';

export default defineConfig({
  test: {
    globalSetup: './setup.ts',
    testTimeout: 60000,
    hookTimeout: 30000,
    env: {
      BASE_URL,
    },
  },
});
