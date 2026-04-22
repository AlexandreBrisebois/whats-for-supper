import { test as base, type Page, type APIRequestContext } from '@playwright/test';

export type { Page, APIRequestContext };

export const test = base.extend({
  // Extend the page fixture to clear cookies before each test
  page: async ({ page }, use) => {
    await page.context().clearCookies();
    page.on('console', (msg) => {
      if (msg.type() === 'log' || msg.type() === 'error') {
        console.log(`[PAGE ${msg.type().toUpperCase()}] ${msg.text()}`);
      }
    });
    await use(page);
  },
});

export { expect } from '@playwright/test';
