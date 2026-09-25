import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), basicSsl(), VitePWA({
    registerType: 'prompt',
    includeAssets: ['favicon.svg', 'icons/*.png'],
    manifest: {
      name: 'Daymark Habit Tracker',
      short_name: 'Daymark',
      description: 'A quiet place to keep your everyday habits visible.',
      theme_color: '#315b4d',
      background_color: '#f3f0e8',
      display: 'standalone',
      start_url: '/',
      icons: [
        ...[48, 72, 96, 128, 144, 152, 192, 256, 384, 512].map((size) => ({ src: `/icons/icon-${size}.png`, sizes: `${size}x${size}`, type: 'image/png' })),
        { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
        { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      navigateFallback: 'index.html',
      runtimeCaching: [
        { urlPattern: ({ request }) => request.destination === 'image', handler: 'CacheFirst', options: { cacheName: 'daymark-images', expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 30 } } },
        { urlPattern: ({ url }) => url.hostname.endsWith('supabase.co'), handler: 'NetworkFirst', options: { cacheName: 'daymark-api', networkTimeoutSeconds: 3, expiration: { maxEntries: 60, maxAgeSeconds: 60 * 5 } } },
      ],
    },
  })],
})
