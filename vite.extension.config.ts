import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import type { Plugin } from 'vite';

const DISPLAY_NAME = 'LinkedOut';

function generateManifest(): Plugin {
  return {
    name: 'generate-manifest',
    writeBundle(_, bundle) {
      // Only generate for the initial bundle, not chunks
      if (!bundle['index.html']) return;

      const root = process.cwd();
      const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'));

      const manifest = {
        manifest_version: 3,
        name: DISPLAY_NAME,
        description: pkg.description,
        version: pkg.version,
        icons: {
          '16': 'out-logo-16.png',
          '32': 'out-logo-32.png',
          '128': 'out-logo.png',
        },
        action: {
          default_title: 'Open LinkedOut',
        },
        background: {
          service_worker: 'background.js',
        },
      };

      writeFileSync(
        resolve(root, 'dist-extension/manifest.json'),
        JSON.stringify(manifest, null, 2) + '\n',
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), generateManifest()],
  base: './',
  build: {
    outDir: 'dist-extension',
    chunkSizeWarningLimit: 600,
  },
  define: {
    'import.meta.env.VITE_EXTENSION': JSON.stringify('true'),
  },
});
