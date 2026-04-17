import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  // Directory containing E2E test files
  testDir: './e2e',

  // Match all .spec.ts files
  testMatch: '**/*.spec.ts',

  // Fail the test run if any test.only is left in source
  forbidOnly: isCI,

  // Retry failed tests once on CI, none locally
  retries: isCI ? 1 : 0,

  // Parallelise across workers (reduce on CI to stay within resource limits)
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
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',

    // Collect traces on first retry
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Run headless on CI, headed locally for easy debugging
    headless: isCI,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Automatically start necessary servers when running tests locally.
  webServer: isCI
    ? undefined
    : [
        // Only start mock API if we're not explicitly pointing at a live local backend
        ...(process.env.USE_LIVE_API !== 'true'
          ? [
              {
                command: 'node mock-api.js',
                url: 'http://localhost:5001/health',
                reuseExistingServer: true,
                timeout: 10_000,
              },
            ]
          : []),
        {
          command: 'npm run dev',
          url: 'http://localhost:3000',
          reuseExistingServer: true,
          timeout: 60_000,
        },
      ],
});
