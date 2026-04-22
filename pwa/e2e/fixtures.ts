import { test as base, type Page, type APIRequestContext } from '@playwright/test';

export type { Page, APIRequestContext };

export const test = base.extend({
  // Extend the page fixture to clear cookies before each test
  page: async ({ page }, use) => {
    await page.context().clearCookies();
    await use(page);
  },
});

export { expect } from '@playwright/test';
