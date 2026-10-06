import { defineConfig } from '@playwright/test';
import path from 'node:path';
import base from '../playwright.config';

// Dedicated server: never reuse an ambient process with unknown runtime identity.
const port = 3017;
export default defineConfig({
  ...base,
  testDir: '.',
  testMatch: 'install-identity.spec.ts',
  workers: 1,
  retries: 0,
  use: { ...base.use, baseURL: `http://127.0.0.1:${port}` },
  webServer: {
    cwd: path.resolve(__dirname, '..'),
    command: `npx next ${process.env.CI ? 'start' : 'dev'} --port ${port} --hostname 127.0.0.1`,
    url: `http://127.0.0.1:${port}/welcome`,
    reuseExistingServer: false,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      NEXT_PUBLIC_ENVIRONMENT: 'test',
      // Port 9 has no WFS API: initial identity must not depend on a live backend.
      API_INTERNAL_URL: 'http://127.0.0.1:9',
      HEARTH_SECRET: 'Paris-Montreal',
      DEMO_MODE: process.env.WFS_IDENTITY_TEST_DEMO_MODE ?? process.env.DEMO_MODE ?? 'false',
      WFS_FEATURE_PREVIEW_PDF_RECIPE_IMPORT:
        process.env.WFS_IDENTITY_TEST_PDF_MODE ??
        process.env.WFS_FEATURE_PREVIEW_PDF_RECIPE_IMPORT ??
        'off',
    },
  },
});
