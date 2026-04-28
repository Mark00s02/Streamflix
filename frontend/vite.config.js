import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import fs from 'fs';

const certsExist = fs.existsSync('../certs/key.pem') && fs.existsSync('../certs/cert.pem');

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    ...(certsExist ? {
      https: {
        key: fs.readFileSync('../certs/key.pem'),
        cert: fs.readFileSync('../certs/cert.pem'),
      },
    } : {}),
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
