import {defineConfig} from 'vite';
import {playwright} from '@vitest/browser-playwright';

// `npm run dev` serves the demo pages at /demo/. `npm test` runs every
// *.test.ts file in a real headless browser. Library builds use tsc.
//
// On CI the tests use the Google Chrome that GitHub's runners already have,
// so no browser download or system packages are needed.
export default defineConfig({
  test: {
    include: ['packages/*/test/**/*.test.ts', 'demo/test/**/*.test.ts'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({launchOptions: process.env.CI ? {channel: 'chrome'} : {}}),
      instances: [{browser: 'chromium'}],
    },
  },
});
