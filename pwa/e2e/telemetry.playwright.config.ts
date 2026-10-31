import { defineConfig, devices } from '@playwright/test';
import base from '../playwright.config';

// These fixtures own copied Next applications, ports and disposable receivers.
// Never start, reuse or stop the shared checkout's development server.
export default defineConfig({
  ...base,
  testDir: '.',
  webServer: undefined,
  testMatch: [
    '**/telemetry-opening.spec.ts',
    '**/telemetry-navigation.spec.ts',
    '**/telemetry-errors.spec.ts',
    '**/telemetry-*-live.spec.ts',
  ],
  workers: 1,
  reporter: [['list']],
  use: { ...base.use, baseURL: 'http://127.0.0.1:1' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
