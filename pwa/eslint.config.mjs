import nextConfig from 'eslint-config-next/core-web-vitals';

const eslintConfig = [
  {
    ignores: ['.next/', 'node_modules/', 'dist/', 'build/', '.env*'],
  },
  ...nextConfig,
];

export default eslintConfig;
