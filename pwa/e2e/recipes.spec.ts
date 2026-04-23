import { test, expect } from './fixtures';

test.describe('Recipes Search Page', () => {
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

  test('should display search UI and mock data correctly', async ({ page }) => {
    await page.goto('/recipes');

    // 1. Wait for loader to disappear
    await expect(page.getByTestId('recipe-loader')).not.toBeVisible({ timeout: 15_000 });

    // 2. Verify search input
    await expect(page.getByTestId('recipe-search-input')).toBeVisible();

    // 3. Verify Top Pick (Mock Data) is visible
    await expect(page.getByTestId('recipe-card-top-pick')).toBeVisible();
    await expect(page.getByTestId('recipe-card-top-pick')).toContainText(/Homemade Lasagna/i);

    // 4. Verify Secondary Results
    await expect(page.getByTestId('recipe-card-1')).toBeVisible();
    await expect(page.getByTestId('recipe-card-2')).toBeVisible();
  });
});
