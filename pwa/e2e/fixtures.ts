import { test as base, type Page, type APIRequestContext } from '@playwright/test';
import { generateSecretToken } from './auth-utils';

export type { Page, APIRequestContext };

export const test = base.extend({
  // Extend the page fixture to clear cookies before each test and inject auth
  page: async ({ page }, use) => {
    await page.context().clearCookies();

    // Inject h_access cookie (Hearth Secret)
    const secret = process.env.HEARTH_SECRET || 'our family loves cooking';
    const token = await generateSecretToken(secret);
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
    await page.context().addCookies([
      {
        name: 'h_access',
        value: token,
        url: baseUrl,
      },
    ]);

    page.on('console', (msg) => {
      if (msg.type() === 'log' || msg.type() === 'error') {
        console.log(`[PAGE ${msg.type().toUpperCase()}] ${msg.text()}`);
      }
    });
    await use(page);
  },
});

export { expect } from '@playwright/test';
