import { test, expect } from './fixtures';

test.describe('Discovery Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Set x-family-member-id cookie to bypass onboarding
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
    await page.context().addCookies([
      {
        name: 'x-family-member-id',
        value: '550e8400-e29b-41d4-a716-446655440001',
        url: baseUrl,
      },
    ]);
    // Also set in localStorage for store persistence
    await page.goto('/');
    await page.evaluate(() =>
      localStorage.setItem(
        'family-storage',
        JSON.stringify({
          state: { selectedFamilyMemberId: '550e8400-e29b-41d4-a716-446655440001' },
          version: 0,
        })
      )
    );
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

    // Swipe through all 3 categories (2 cards each = 6 swipes total)
    // Note: With mock API, all categories return the same data, but the flow still works
    for (let i = 0; i < 6; i++) {
      const likeBtn = page.getByTestId('like-button');
      await expect(likeBtn).toBeEnabled({ timeout: 5_000 });
      await likeBtn.click();
    }

    // After swiping through all cards, the empty state should appear
    await expect(page.getByTestId('discovery-empty-state')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('discovery-empty-state')).toContainText(/That's a wrap/i);
  });
});
