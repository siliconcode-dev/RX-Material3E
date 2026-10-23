import {readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {defineConfig} from 'vite';

// Builds the demo site as static files for hosting (e.g. Cloudflare Pages):
//   npm run build:site  ->  dist-site/
// Every demo/*.html becomes a page at the site root.
const demo = resolve(import.meta.dirname, 'demo');

export default defineConfig({
  root: demo,
  base: './',
  publicDir: false,
  build: {
    outDir: resolve(import.meta.dirname, 'dist-site'),
    emptyOutDir: true,
    rollupOptions: {
      input: Object.fromEntries(
        readdirSync(demo)
          .filter((file) => file.endsWith('.html'))
          .map((file) => [file.replace(/\.html$/, ''), resolve(demo, file)]),
      ),
    },
  },
});
