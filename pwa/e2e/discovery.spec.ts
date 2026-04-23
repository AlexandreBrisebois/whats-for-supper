import { test, expect } from './fixtures';

test.describe('Discovery Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Set x-family-member-id cookie to bypass onboarding
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
    await page.context().addCookies([
      {
        name: 'x-family-member-id',
        value: '1',
        url: baseUrl,
      },
    ]);
  });

  test('should fetch categories and then fetch the first category stack', async ({ page }) => {
    await page.goto('/discovery');

    // 1. Wait for loader to disappear
    await expect(page.getByTestId('discovery-loader')).not.toBeVisible({ timeout: 15_000 });

    // 2. Verify it loads recipes
    // In our stack, the last item in the array is on top.
    await expect(page.getByTestId('discovery-card').first()).toBeVisible();
    await expect(page.getByTestId('discovery-card').first()).toContainText(
      /Mock Gourmet Discovery/i
    );
  });

  test('should swipe through all categories and show summary', async ({ page }) => {
    await page.goto('/discovery');

    // Wait for loader
    await expect(page.getByTestId('discovery-loader')).not.toBeVisible({ timeout: 15_000 });

    // Category 1: Gourmet Discovery (2 cards)
    await page.getByTestId('like-button').click();
    await page.getByTestId('like-button').click();

    // Category 2: Coastal Kitchen (2 cards)
    await expect(page.getByTestId('discovery-card').first()).toContainText(
      /Mock Coastal Kitchen/i,
      {
        timeout: 10_000,
      }
    );
    await page.getByTestId('like-button').click();
    await page.getByTestId('like-button').click();

    // Category 3: Organic Vitality (2 cards)
    await expect(page.getByTestId('discovery-card').first()).toContainText(
      /Mock Organic Vitality/i,
      {
        timeout: 10_000,
      }
    );
    await page.getByTestId('like-button').click();
    await page.getByTestId('like-button').click();

    // Verify empty state summary
    await expect(page.getByTestId('discovery-empty-state')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('discovery-empty-state')).toContainText(/found 3 matches/i);
  });
});
