import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  build: {
    outDir: 'dist-extension',
    chunkSizeWarningLimit: 600,
  },
  define: {
    'import.meta.env.VITE_EXTENSION': JSON.stringify('true'),
  },
});
