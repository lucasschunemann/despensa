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
        id: '/',
        // Vazio mantém a URL de instalação (?sala=...), conforme o manifest spec.
        start_url: '',
        scope: '/',
        name: 'despensa',
        short_name: 'despensa',
        description: 'Mercado, contas e planos da sua casa em sintonia',
        lang: 'pt-BR',
        display: 'standalone',
        background_color: '#f7f7f5',
        theme_color: '#f7f7f5',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // handlers de notificação entram no service worker gerado
        importScripts: ['push-sw.js'],
        // guarda o app em cache para abrir instantâneo e aguentar sinal ruim no mercado;
        // os dados continuam vindo do Supabase em tempo real quando há conexão.
        globPatterns: ['**/*.{js,css,html,png,svg,webp,woff2}'],
        navigateFallbackDenylist: [/^\/api/],
      },
    }),
  ],
})
