import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
// @ts-ignore: 플러그인 타입 선언이 없는 경우를 대비
import reactHooks from 'eslint-plugin-react-hooks';
// @ts-ignore
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';
import type { Linter } from 'eslint';

export default defineConfig([
  globalIgnores([
    'dist/**',
    'out/**',
    'android/**',
    'ios/**',
    'expo-app/dist/**',
    'public/external/**',
    'src/_legacy/**',
  ]),
  {
    // 린트 대상을 TS 파일까지 확장합니다.
    files: ['**/*.{js,jsx,ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
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
      'no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-empty': 'off',
      'prefer-const': 'off',
      'react-refresh/only-export-components': 'off',
      'react-hooks/rules-of-hooks': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    files: ['@apps/features/track-ball/detector/yolo-live.js'],
    languageOptions: {
      globals: {
        tf: 'readonly',
      },
    },
  },
  {
    files: ['electron/**/*.{js,ts}', '*.config.{js,ts}', 'eslint.config.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
  },
]);
