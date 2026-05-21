import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/cv-val/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@cv-val': path.resolve(__dirname, './@packages/cv-val'),
      '@packages': path.resolve(__dirname, './@packages'),
      '@apps': path.resolve(__dirname, './@apps'),
      '@shared': path.resolve(__dirname, './@shared'),
      'react-native': 'react-native-web',
    },
    // 리액트 인스턴스를 하나로 강제 고정하여 버전 충돌 방지
    dedupe: ['react', 'react-dom'],
  },
});