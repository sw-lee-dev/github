import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // 같은 Wi-Fi 의 휴대폰에서 http://<PC IP>:5173 으로 접속 가능
    proxy: {
      '/api': 'http://localhost:8090',
    },
  },
});
