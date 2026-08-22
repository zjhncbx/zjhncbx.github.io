import { defineConfig } from 'astro/config';

export default defineConfig({
  // Custom domain is the canonical one; the site also works at zjhncbx.github.io
  site: 'https://www.hncbx.org.cn',
  output: 'static',
  // GitHub Pages user site (zmhncbx.github.io) serves at the root.
  base: '/',
});
