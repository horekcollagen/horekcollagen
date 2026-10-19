import { defineConfig } from 'vite';

// Custom Domain (galerie.horekcollagen.de) bedient die Seite im Wurzelpfad.
export default defineConfig({
  base: '/',
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
  },
});
