import js from '@eslint/js';
import globals from 'globals';
// @ts-ignore: 플러그인 타입 선언이 없는 경우를 대비
import reactHooks from 'eslint-plugin-react-hooks';
// @ts-ignore
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';
import type { Linter } from 'eslint';

export default defineConfig([
  globalIgnores(['dist']),
  {
    // 린트 대상을 TS 파일까지 확장합니다.
    files: ['**/*.{js,jsx,ts,tsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ] as Linter.Config[],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
]);