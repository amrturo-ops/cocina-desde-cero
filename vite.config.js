import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { NOMBRE_APP, NOMBRE_CORTO } from './src/textos.js';

// «npm run build»            → versión normal (PWA instalable, para GitHub Pages)
// «npm run build:prueba»     → un único HTML con todo dentro, para probar en el móvil sin servidor
export default defineConfig(({ mode }) => ({
  // './' hace que funcione en GitHub Pages dentro de cualquier repositorio
  base: './',
  plugins: [
    react(),
    mode === 'prueba'
      ? viteSingleFile()
      : VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['icons/icon.svg'],
          manifest: {
            name: NOMBRE_APP,
            short_name: NOMBRE_CORTO,
            description: 'Aprende a cocinar desde cero con recetas reales.',
            lang: 'es',
            start_url: './',
            scope: './',
            display: 'standalone',
            background_color: '#F2F5F3',
            theme_color: '#2F7D4F',
            icons: [
              { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
              { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
              { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
            ],
          },
          workbox: { globPatterns: ['**/*.{js,css,html,svg,png,webp,json}'] },
        }),
  ],
  build: mode === 'prueba' ? { outDir: 'dist-prueba', assetsInlineLimit: 100000000 } : {},
}));
