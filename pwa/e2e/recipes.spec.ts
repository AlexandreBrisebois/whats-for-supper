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

    // Give it a moment to load
    await page.waitForLoadState('networkidle');

    // Wait for loader to disappear
    await expect(page.locator('.animate-spin')).not.toBeVisible({ timeout: 10_000 });

    // 1. Verify search input is present and has the right placeholder
    await expect(page.getByPlaceholder(/Something spicy for \d+/i)).toBeVisible();

    // 2. Verify Agent's Recommendations section
    await expect(page.getByText(/Agent's Recommendations/i)).toBeVisible();

    // 3. Verify Top Pick (Mock Data) is visible and correctly rendered
    // "Homemade Lasagna" should be visible
    const topPickHeading = page.getByRole('heading', { name: /Homemade Lasagna/i });
    await expect(topPickHeading).toBeVisible();

    // Description should also be visible
    await expect(page.getByText(/The ultimate comfort food/i)).toBeVisible();

    // 4. Verify Secondary Results
    await expect(page.getByRole('heading', { name: /Zesty Lemon Chicken/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Creamy Pesto Pasta/i })).toBeVisible();

    // Screenshots for manual verification if needed
    await page.screenshot({ path: 'e2e-screenshots/recipes-page.png' });
  });
});
