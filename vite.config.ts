import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// El nombre del repo se usa como base path en GitHub Pages
// (https://<usuario>.github.io/<repo>/). Si usas un dominio propio o una
// "user page" (<usuario>.github.io), cambia esto a '/'.
const REPO_NAME = process.env.VITE_BASE_PATH || '/airfryer-chef/';

export default defineConfig({
  plugins: [react()],
  base: REPO_NAME,
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
});
