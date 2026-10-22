import {defineConfig} from 'vite';
import {playwright} from '@vitest/browser-playwright';

// `npm run dev` serves the demo pages at /demo/. `npm test` runs every
// *.test.ts file in a real headless browser. Library builds use tsc.
export default defineConfig({
  test: {
    include: ['packages/*/test/**/*.test.ts', 'demo/test/**/*.test.ts'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{browser: 'chromium'}],
    },
  },
});
