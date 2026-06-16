import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 빌드 모드에 따른 base 경로 설정
  const getBase = () => {
    if (mode === 'web') {
      // 사용자 피드백에 따라 'web' 모드일 때 '/cv-val/' 사용
      return '/cv-val/';
    }
    // 'mobile' (Capacitor)과 'desktop' (Electron)은 로컬 파일 시스템에서 실행되므로 상대 경로가 필수입니다.
    // 사용자 피드백에 따라 'electron'은 기존에 문제가 없었으므로 './'를 유지하고, 'capacity' 문제 해결을 위해 'mobile'도 './'로 설정합니다.
    if (mode === 'mobile' || mode === 'desktop') {
      return './';
    }
    // 그 외의 모드 (예: 명시되지 않은 개발 모드 등)에 대한 안전한 기본값으로 상대 경로를 사용합니다.
    return './'; 
  };

  return {
    plugins: [react()],
    base: getBase(),
    build: {
      outDir: 'dist', // capacitor.config.ts의 webDir과 일치해야 합니다.
    },
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
  };
});