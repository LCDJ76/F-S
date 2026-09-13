import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANT : remplace "lcdj-stock-app" par le nom EXACT de ton repo GitHub
// si tu déploies sur https://<ton-user>.github.io/<nom-du-repo>/
// Si ton repo s'appelle <ton-user>.github.io (site "racine"), mets base: '/'
export default defineConfig({
  plugins: [react()],
  base: '/lcdj-stock-app/',
})
