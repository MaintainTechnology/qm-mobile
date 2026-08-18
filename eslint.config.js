// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettierConfig, // must stay last: turns off rules that fight Prettier
  {
    ignores: ['dist/*', 'example/*', '.expo/*', 'node_modules/*', 'android/*', 'ios/*'],
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
]);
