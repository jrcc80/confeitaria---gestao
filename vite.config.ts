import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['vite.svg'],
      manifest: {
        name: 'Dai de Açúcar Gestão',
        short_name: 'Dai Gestão',
        description: 'App PWA para ingredientes, receitas, precificação e lucro.',
        theme_color: '#d98c9a',
        background_color: '#fff8f4',
        display: 'standalone',
        start_url: './',
        icons: [
          {
            src: 'vite.svg',
            sizes: 'any',
            type: 'image/svg+xml',
          },
        ],
      },
    }),
  ],
});
