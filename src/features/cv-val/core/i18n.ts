import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector) // 브라우저 언어 감지
  .use(initReactI18next) // react-i18next 초기화
  .init({
    fallbackLng: 'en', // 기본 언어
    debug: false, // 개발 중 디버그 활성화
    interpolation: {
      escapeValue: false, // React는 XSS 방지를 기본적으로 처리하므로 필요 없음
    },
  });

export default i18n;