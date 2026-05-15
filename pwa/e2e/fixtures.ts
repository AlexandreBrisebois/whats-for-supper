import { test as base, type Page, type APIRequestContext } from '@playwright/test';
import { generateSecretToken } from './auth-utils';

export type { Page, APIRequestContext };

export const test = base.extend({
  // Extend the page fixture to clear cookies before each test and inject auth
  page: async ({ page }, use) => {
    const fixedTestDate = '2026-05-04T12:00:00Z';

    // Pin time to 2026-05-04 12:00:00 UTC (a Monday) to match ADR-029 fixed reference date
    await page.clock.setFixedTime(new Date(fixedTestDate));

    await page.context().clearCookies();

    // Inject h_access cookie (Hearth Secret)
    const secret = process.env.HEARTH_SECRET || 'our family loves cooking';
    const token = await generateSecretToken(secret);
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
    const origins = [baseUrl, 'http://localhost:3000', 'http://pwa.wfs.localhost'];

    for (const origin of origins) {
      await page.context().addCookies([
        {
          name: 'h_access',
          value: token,
          url: origin,
        },
        {
          name: 'wfs-test-date',
          value: fixedTestDate,
          url: origin,
        },
      ]);
    }

    page.on('console', (msg) => {
      if (msg.type() === 'log' || msg.type() === 'error') {
        console.log(`[PAGE ${msg.type().toUpperCase()}] ${msg.text()}`);
      }
    });

    // Force English locale for deterministic tests
    await page.addInitScript(() => {
      window.localStorage.setItem('whats-for-supper-locale', 'en');
    });

    page.on('request', (request) => {
      if (request.url().includes('/api/')) {
        console.log(`[REQUEST] ${request.method()} ${request.url()}`);
      }
    });

    page.on('requestfailed', (request) => {
      console.log(
        `[REQUEST FAILED] ${request.method()} ${request.url()} - ${request.failure()?.errorText}`
      );
    });

    // Strict Mocking: Block any unhandled API calls to prevent DB pollution
    await page.route(
      (url) => url.pathname.includes('/api/'),
      async (route) => {
        const request = route.request();

        // Allow health checks
        if (request.url().includes('/health')) {
          return route.continue();
        }

        console.error(`❌ UNMOCKED API CALL DETECTED: ${request.method()} ${request.url()}`);

        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Unmocked API call detected. Tests must be isolated from the real backend.',
            method: request.method(),
            url: request.url(),
          }),
        });
      }
    );

    await use(page);
  },
});

export { expect } from '@playwright/test';
