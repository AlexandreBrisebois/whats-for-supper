import { defineConfig } from '@playwright/test';
import path from 'node:path';
import base from '../playwright.config';

// Dedicated synthetic server; never reuse an ambient process or deployed URL.
process.env.WFS_WELCOME_DEMO ??= 'true';
process.env.WFS_WELCOME_SECRET ??= 'Swipe-Match-Cook';
const port = 3019;
const codeOnlyBetaCi = Boolean(process.env.CI && process.env.WFS_WELCOME_CHANNEL === 'beta');
export default defineConfig({
  ...base,
  testDir: '.',
  testMatch: 'welcome-demo.spec.ts',
  workers: 1,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'test-results/welcome-demo.json' }]],
  use: {
    ...base.use,
    baseURL: `http://127.0.0.1:${port}`,
    ...(codeOnlyBetaCi ? { screenshot: 'off' as const, trace: 'off' as const } : {}),
  },
  webServer: {
    cwd: path.resolve(__dirname, '..'),
    // Beta's baked-channel matrix owns a dev fixture; ordinary CI still reuses its single build.
    command: `npx next ${process.env.CI && process.env.WFS_WELCOME_DEV !== 'true' ? 'start' : 'dev'} --port ${port} --hostname 127.0.0.1`,
    url: `http://127.0.0.1:${port}/welcome`,
    reuseExistingServer: false,
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_ENVIRONMENT: 'test',
      NEXT_PUBLIC_API_BASE_URL: '',
      API_INTERNAL_URL: 'http://127.0.0.1:59999',
      DEMO_MODE: process.env.WFS_WELCOME_DEMO,
      HEARTH_SECRET: process.env.WFS_WELCOME_SECRET,
    },
  },
});
