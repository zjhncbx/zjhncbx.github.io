import { defineConfig } from 'astro/config';
import { SITE } from './src/consts.ts';

export default defineConfig({
  // Custom domain is the canonical one; the site also works at zjhncbx.github.io
  // (single source of truth: src/consts.ts)
  site: SITE,
  output: 'static',
  // GitHub Pages user site (zjhncbx.github.io) serves at the root.
  base: '/',
});
