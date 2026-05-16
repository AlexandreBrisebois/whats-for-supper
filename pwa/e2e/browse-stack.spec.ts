import { test, expect } from './fixtures';
import { MOCK_IDS, setupCommonRoutes } from './mock-api';

test.describe('Recipe Stack Browse', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await setupCommonRoutes(page);

    const baseUrl = baseURL || 'http://127.0.0.1:3000';

    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);

    await page.addInitScript((id) => {
      localStorage.setItem(
        'family-storage',
        JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 })
      );
    }, MOCK_IDS.MEMBER_ALEX);

    // Navigate to home
    await page.goto('/');
    await expect(page.getByTestId('tonight-pivot-card')).toBeVisible();
  });

  test('can open the browse stack from home and navigate cards', async ({ page }) => {
    // Open Browse All
    await page.getByTestId('home-browse-all-trigger').click();

    // Check overlay presence
    await expect(page.getByTestId('browse-all-stack-container')).toBeVisible();
    await expect(page.getByTestId('stack-card-front')).toBeVisible();

    // Check counter
    await expect(page.getByTestId('stack-depth-indicator')).toHaveText(/1\s*\/\s*\d+/);

    // Verify the front card is bound to a recipe
    const recipeId = await page.getByTestId('stack-card-front').getAttribute('data-recipe-id');
    expect(recipeId).toBeTruthy();

    // Tap to open detail
    await page.getByTestId('stack-card-front').click();
    await expect(page.getByTestId('recipe-detail-sheet')).toBeVisible();
    await page.getByTestId('action-close-sheet').click();
    await expect(page.getByTestId('recipe-detail-sheet')).not.toBeVisible();

    // Back to home
    await page.getByTestId('browse-all-exit').click();
    await expect(page.getByTestId('browse-all-stack-container')).not.toBeVisible();
  });

  test('can toggle discoverable filter', async ({ page }) => {
    await page.getByTestId('home-browse-all-trigger').click();

    const toggle = page.getByTestId('stack-toggle-discoverable');
    await expect(toggle).toContainText('All');

    await toggle.click();
    await expect(toggle).toContainText('Discovery');

    // Should trigger a reload (mocked API handles this)
    await expect(page.getByTestId('stack-card-front').first()).toBeVisible();
  });
});
