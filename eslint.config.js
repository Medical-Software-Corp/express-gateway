const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  js.configs.recommended,
  {
    ignores: [
      'dist/',
      'coverage/',
      'admin/node_modules/',
      'bin/generators/gateway/templates/basic/server.js',
      'bin/generators/gateway/templates/getting-started/server.js'
    ]
  },
  {
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.es6
      }
    },
    rules: {
      'space-before-function-paren': 0,
      'comma-dangle': [2, 'never'],
      'no-var': 'error',
      'semi': [2, 'always'],
      'no-console': 'warn',
      'no-prototype-builtins': 'off',
      'prefer-const': 'error'
    }
  },
  {
    // Test files configuration
    files: ['test/**/*.js', '**/*.test.js'],
    languageOptions: {
      globals: {
        ...globals.mocha
      }
    }
  }
];
