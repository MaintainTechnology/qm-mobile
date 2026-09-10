// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettierConfig, // must stay last: turns off rules that fight Prettier
  {
    // Generated output and vendored agent tooling are not application sources.
    // Keep root config, scripts, e2e and authored design-system code in scope.
    ignores: [
      'dist/**',
      'example/**',
      '.expo/**',
      'node_modules/**',
      'android/**',
      'ios/**',
      '.agents/**',
      '.claude/**',
      '.codex/**',
      '.Codex/**',
      '.gitnexus/**',
      'coverage/**',
      'test-results/**',
      'playwright-report/**',
      // Copied/generated design-canvas runtime, not the mobile application.
      'design-system/design-kit/support.js',
      'design-system/design-kit/image-slot.js',
    ],
  },
  {
    // Scoped to TS: eslint-config-expo only registers @typescript-eslint for these files.
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // Money and API payloads are the two places `any` does real damage.
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['scripts/**/*.{js,mjs,cjs}'],
    rules: { 'no-console': 'off' }, // CLI validation reports results to stdout.
  },
]);
