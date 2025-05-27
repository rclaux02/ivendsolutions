import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  root: path.join(__dirname, 'src/renderer'),
  publicDir: path.join(__dirname, 'public'),
  build: {
    outDir: path.join(__dirname, 'dist/renderer'),
    emptyOutDir: true
  },
  server: {
    port: 5173,
    host: true,
    hmr: true,
    watch: {
      usePolling: true
    }
  },
  resolve: {
    alias: {
      '@': path.join(__dirname, 'src')
    }
  }
}); 