import nextConfig from 'eslint-config-next/core-web-vitals';

const eslintConfig = [
  {
    ignores: ['.next/', 'node_modules/', 'dist/', 'build/', '.env*'],
  },
  ...nextConfig,
  {
    files: ['**/*.spec.ts', '**/*.spec.tsx', '**/*.test.ts', '**/*.test.tsx'],
    rules: {
      'react/display-name': 'off',
      'react/prop-types': 'off',
    },
  },
];

export default eslintConfig;
