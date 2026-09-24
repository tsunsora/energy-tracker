import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'prompt',
    injectRegister: false,
    includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png', 'licenses/*.txt'],
    manifest: {
      name: 'Energy — Vanguard Tracker', short_name: 'Energy',
      description: 'An offline energy companion for your Vanguard table.',
      theme_color: '#101217', background_color: '#101217', display: 'standalone', orientation: 'portrait',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
      ]
    },
    workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'] }
  })]
});
