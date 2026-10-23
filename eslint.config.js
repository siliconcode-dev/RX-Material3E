import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import {configs as litConfigs} from 'eslint-plugin-lit';
import {configs as wcConfigs} from 'eslint-plugin-wc';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/',
      '**/dist/',
      'dist-site/',
      '.cache/',
      'packages/tokens/css/',
      'packages/tokens/src/',
    ],
  },
  js.configs.recommended,
  {
    files: ['scripts/**/*.mjs', '*.config.js'],
    languageOptions: {globals: globals.node},
  },
  {
    files: ['packages/**/*.ts'],
    extends: [
      tseslint.configs.recommended,
      wcConfigs['flat/recommended'],
      litConfigs['flat/recommended'],
    ],
    languageOptions: {globals: globals.browser},
  },
);
