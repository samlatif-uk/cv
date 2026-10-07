import { defineConfig } from 'vite';

export default defineConfig({
  root: 'lab',
  base: '/lab/',
  publicDir: false,
  server: { fs: { allow: ['..'] } },
  build: {
    outDir: '../dist/lab', emptyOutDir: true,
    rollupOptions: { input: { atlas: 'lab/index.html', stories: 'lab/stories/index.html' } },
  },
});
