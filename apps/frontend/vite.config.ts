import { defineConfig } from 'vite'
import path from 'path'
import { readdirSync, readFileSync } from 'node:fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'pdf-viewer-assets',
      generateBundle() {
        for (const folder of ['cmaps', 'standard_fonts', 'wasm']) {
          const source = path.resolve(__dirname, '../../node_modules/pdfjs-dist', folder);
          for (const entry of readdirSync(source, { withFileTypes: true })) {
            if (entry.isFile()) this.emitFile({ type: 'asset', fileName: 'pdf-assets/' + folder + '/' + entry.name, source: readFileSync(path.join(source, entry.name)) });
          }
        }
      },
    },
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: { globIgnores: ['**/pdf-assets/**', '**/pdf.worker*'] },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'favicon.svg'],
      manifest: {
        name: 'Bandanize',
        short_name: 'Bandanize',
        description: 'Organize your band projects',
        theme_color: '#0B0B0C',
        background_color: '#0B0B0C',
        display: 'standalone',
        icons: [
          {
            src: 'web-app-manifest-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'web-app-manifest-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
