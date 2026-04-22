import { test, expect } from './fixtures';

test.describe('Discovery Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Set x-family-member-id cookie to bypass onboarding
    await page.context().addCookies([
      {
        name: 'x-family-member-id',
        value: '1',
        url: 'http://127.0.0.1:3001',
      },
    ]);
  });

  test('should fetch categories and then fetch the first category stack', async ({ page }) => {
    await page.goto('/discovery');

    // 1. Wait for loader to disappear
    await expect(page.locator('.animate-spin')).not.toBeVisible({ timeout: 15_000 });

    // 2. Verify it loads recipes from the first category
    // In our stack, the last item in the array is on top.
    // The mock API returns [mock-1, mock-2], so mock-2 is on top.
    await expect(page.locator('h2').last()).toContainText(/Mock Gourmet Discovery 2/i);
  });

  test('should swipe through all categories and show summary', async ({ page }) => {
    await page.goto('/discovery');

    // Wait for loader
    await expect(page.locator('.animate-spin')).not.toBeVisible({ timeout: 15_000 });

    // Category 1: Gourmet Discovery (2 cards)
    await page.locator('button').filter({ hasText: '♥' }).click();
    await page.locator('button').filter({ hasText: '♥' }).click();

    // Category 2: Coastal Kitchen (2 cards)
    await expect(page.locator('h2').last()).toContainText(/Mock Coastal Kitchen 2/i, {
      timeout: 10_000,
    });
    await page.locator('button').filter({ hasText: '♥' }).click();
    await page.locator('button').filter({ hasText: '♥' }).click();

    // Category 3: Organic Vitality (2 cards)
    await expect(page.locator('h2').last()).toContainText(/Mock Organic Vitality 2/i, {
      timeout: 10_000,
    });
    await page.locator('button').filter({ hasText: '♥' }).click();
    await page.locator('button').filter({ hasText: '♥' }).click();

    // Verify empty state summary
    await expect(page.locator('h3')).toContainText(/That's a wrap/i, { timeout: 10_000 });
    // We found 1 match per category (mock-2 has hasFamilyInterest: true)
    await expect(page.locator('p')).toContainText(/found 3 matches/i);
  });
});
