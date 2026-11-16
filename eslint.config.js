const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    files: ['**/__tests__/**', '**/*.test.*'],
    languageOptions: { globals: require('globals').jest },
  },
  {
    files: ['**/*.cjs', 'plugins/**/*.js', '*.config.js'],
    languageOptions: { globals: require('globals').node },
  },
  {
    ignores: ['node_modules/', 'android/', 'ios/', '.expo/', 'dist/', 'coverage/', 'design/'],
  },
]);
