import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;
const hasExternalBaseUrl = !!process.env.BASE_URL;
const shouldManageWebServer = !hasExternalBaseUrl;

export default defineConfig({
  // Directory containing E2E test files
  testDir: './e2e',

  // Match all .spec.ts files
  testMatch: '**/*.spec.ts',

  // Fail the test run if any test.only is left in source
  forbidOnly: isCI,

  // Retry failed tests once on CI, none locally
  retries: isCI ? 1 : 0,

  // Run tests in files in parallel
  fullyParallel: true,

  // Parallelise across workers
  workers: isCI ? 2 : undefined,

  // Per-test timeout
  timeout: 30_000,

  // Expect assertion timeout
  expect: {
    timeout: 5_000,
  },

  // Reporters
  reporter: isCI
    ? [
        ['html', { open: 'never' }],
        ['json', { outputFile: 'playwright-report/results.json' }],
        ['github'],
      ]
    : [['html', { open: 'on-failure' }], ['list']],

  use: {
    // All tests hit the local Next.js dev server
    baseURL: process.env.BASE_URL ?? 'http://127.0.0.1:3000',

    // Collect traces on first retry
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Run headless to avoid profile interference
    headless: true,

    // Block service workers so page.route() intercepts work correctly
    serviceWorkers: 'block',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Let Playwright manage the app server whenever tests are targeting the default local base URL.
  webServer: shouldManageWebServer
    ? {
        command: isCI
          ? 'NEXT_PUBLIC_ENVIRONMENT=test npm run start'
          : 'NEXT_PUBLIC_ENVIRONMENT=test npm run dev',
        url: 'http://127.0.0.1:3000',
        reuseExistingServer: !isCI,
        stdout: 'pipe',
        stderr: 'pipe',
        env: {
          NEXT_PUBLIC_ENVIRONMENT: 'test',
          PORT: '3000',
          API_INTERNAL_URL: 'http://127.0.0.1:5001',
          NEXT_PUBLIC_API_BASE_URL: isCI ? 'http://127.0.0.1:5001' : '',
          HEARTH_SECRET: process.env.HEARTH_SECRET || 'our family loves cooking',
          NEXT_PUBLIC_ENABLE_AGENT_SEARCH: 'true',
          NEXT_PUBLIC_ENABLE_PHOTO_SEARCH: 'true',
        },
      }
    : undefined,
});
