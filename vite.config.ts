import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Сборка в один index.html: все JS/CSS инлайнятся.
// Внешних ассетов нет (вся графика процедурная), поэтому dist/index.html
// можно сразу класть в ZIP для консоли Яндекс Игр.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 100000000,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
