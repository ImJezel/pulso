/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { viteSingleFile } from 'vite-plugin-singlefile'

/*
 * Dos builds:
 *   `vite build`              → dist/        La PWA completa. Se sirve por http,
 *                                            es instalable y funciona sin conexión.
 *   `vite build --mode unico` → dist-unico/  Un solo index.html con el JS y el CSS
 *                                            dentro. Abre con doble clic, sin
 *                                            servidor: el build normal no puede
 *                                            porque el navegador bloquea los
 *                                            módulos ES cargados desde file://.
 */
export default defineConfig(({ mode }) => {
  const unico = mode === 'unico'

  return {
  base: './',
  build: unico ? { outDir: 'dist-unico', assetsInlineLimit: 100_000_000, cssCodeSplit: false } : {},
  plugins: [
    react(),
    tailwindcss(),
    ...(unico ? [viteSingleFile()] : []),
    ...(unico ? [] : [VitePWA({
      registerType: 'autoUpdate',
      // El registro se hace a mano en main.tsx, con un guardia de protocolo:
      // al abrir dist/index.html con doble clic (file://) el registro
      // automático lanza un error de consola y no aporta nada.
      injectRegister: null,
      includeAssets: ['icono.svg', 'icono-192.png', 'icono-512.png'],
      manifest: {
        name: 'Pulso — Control de tratamiento',
        short_name: 'Pulso',
        description:
          'Lleva el control de tus medicamentos, tu presión y tu glucosa. Tus datos se quedan en tu dispositivo.',
        lang: 'es-DO',
        dir: 'ltr',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F6F3EC',
        theme_color: '#14312B',
        categories: ['health', 'medical', 'lifestyle'],
        icons: [
          { src: 'icono-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icono-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icono-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Las fuentes de Google se guardan en caché la primera vez que hay red;
        // a partir de ahí la app abre completa sin conexión.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    })]),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
  }
})
