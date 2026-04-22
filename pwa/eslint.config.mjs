import nextConfig from 'eslint-config-next/core-web-vitals';

const eslintConfig = [
  {
    ignores: ['.next/', 'node_modules/', 'dist/', 'build/', '.env*'],
  },
  ...nextConfig,
  {
    files: ['**/*.spec.ts', '**/*.spec.tsx', '**/*.test.ts', '**/*.test.tsx', 'e2e/**/*.ts'],
    rules: {
      'react/display-name': 'off',
      'react/prop-types': 'off',
      'react-hooks/rules-of-hooks': 'off',
    },
  },
];

export default eslintConfig;
