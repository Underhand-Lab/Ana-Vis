import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
// @ts-ignore: 플러그인 타입 선언이 없는 경우를 대비
import reactHooks from 'eslint-plugin-react-hooks';
// @ts-ignore
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', 'android/**', 'ios/**', 'public/external/models/**']),
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    extends: [js.configs.recommended, reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
      globals: globals.browser,
    },
    rules: {
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'no-redeclare': 'off',
      'no-import-assign': 'off',
      'no-empty': 'off',
      'no-fallthrough': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/rules-of-hooks': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/purity': 'off',
      'react-refresh/only-export-components': 'off',
      'prefer-const': 'off',
    },
  },
  {
    files: ['eslint.config.ts', 'vite.config.ts', 'electron/**/*.{ts,js}', 'capacitor.config.ts', 'electron.vite.config.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: globals.node,
    },
  },
]);
