import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Despensa',
        short_name: 'Despensa',
        description: 'Lista de compras compartilhada',
        lang: 'pt-BR',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // guarda o app em cache para abrir instantâneo e aguentar sinal ruim no mercado;
        // os dados continuam vindo do Supabase em tempo real quando há conexão.
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        navigateFallbackDenylist: [/^\/api/],
      },
    }),
  ],
})
