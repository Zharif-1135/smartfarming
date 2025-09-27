// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'robots.txt'],
      manifest: {
        name: 'Smart Farming Dashboard',
        short_name: 'SmartFarm',
        description: 'Dashboard monitoring smart farming - online & offline',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/logo192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/logo512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: ({ request }) =>
              request.destination === 'script' ||
              request.destination === 'style' ||
              request.destination === 'worker',
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-resources',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 hari
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 hari
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.firebaseio\.com\/.*$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 // 1 jam
              }
            }
          },
          {
            urlPattern: /^https:\/\/dataservice\.accuweather\.com\/.*$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'accuweather-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 // 1 jam
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],

  // ===================================================================
  // 👇 TAMBAHAN UNTUK MENGATASI ERROR CORS ACCUWEATHER
  // ===================================================================
  server: {
    proxy: {
      // Setiap permintaan ke '/api' akan diteruskan ke AccuWeather
      '/api': {
        target: 'https://dataservice.accuweather.com',
        changeOrigin: true, // Diperlukan untuk hosting virtual
        rewrite: (path) => path.replace(/^\/api/, ''), // Hapus '/api' dari path
      },
    }
  }
})