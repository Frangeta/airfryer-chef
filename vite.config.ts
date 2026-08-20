import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

// El nombre del repo se usa como base path en GitHub Pages
// (https://<usuario>.github.io/<repo>/). Si usas un dominio propio o una
// "user page" (<usuario>.github.io), cambia esto a '/'.
// Nota: en el despliegue real, el workflow de GitHub Actions calcula esto
// automáticamente a partir del nombre real del repositorio (VITE_BASE_PATH),
// así que este valor de aquí es solo el de respaldo para desarrollo local —
// no hace falta que coincida con el nombre de marca de la app ("Chefryer").
// Si algún día renombras el propio repositorio de GitHub, no hay que tocar
// nada aquí: se recalcula solo.
const REPO_NAME = process.env.VITE_BASE_PATH || '/airfryer-chef/';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icons/favicon-16.png', 'icons/favicon-32.png'],
      manifest: {
        name: 'Chefryer',
        short_name: 'Chefryer',
        description: 'Tu asistente de cocina con IA para la Air Fryer de doble cesta.',
        lang: 'es',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#F6F3EC',
        theme_color: '#2E6F5C',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // Precachea el "cascarón" de la app (JS/CSS/HTML hasheados por Vite)
        // para que abra al instante y funcione sin conexión; los datos en sí
        // (Firestore) siguen necesitando red, claro.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/__/]
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  base: REPO_NAME,
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
});
