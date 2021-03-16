module.exports = {
  root: true,
  extends: [
    'eslint-config-digitalbazaar',
    'eslint-config-digitalbazaar/jsdoc'
  ],
  env: {
    node: true
  },
  rules: {
    'jsdoc/check-examples': 'off'
  },
  ignorePatterns: ['dist/']
};
