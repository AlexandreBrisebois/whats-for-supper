import { test as base } from '@playwright/test';

export const test = base.extend({
  // Extend the page fixture to clear cookies before each test
  page: async ({ page }, use) => {
    await page.context().clearCookies();
    await use(page);
  },
});

export { expect } from '@playwright/test';
