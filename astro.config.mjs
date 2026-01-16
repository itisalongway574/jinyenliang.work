// @ts-check
import { defineConfig } from 'astro/config';
import removeComments from 'astro-remove-comments';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://jinyenliang.work',
  integrations: [removeComments()],
  vite: {
    plugins: [tailwindcss()]
  }
});