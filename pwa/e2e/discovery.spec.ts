import { test, expect } from './fixtures';
import { MOCK_IDS, builders } from './mock-api';

const MOCK_CATEGORIES = ['Italian', 'Asian', 'Mexican'];

const MOCK_STACK = [
  builders.recipe({ id: MOCK_IDS.RECIPE_LASAGNA, name: 'Mock Gourmet Discovery' }),
  builders.recipe({ id: MOCK_IDS.RECIPE_CARBONARA, name: 'Mock Comfort Classic' }),
];

test.describe('Discovery Flow', () => {
  test.beforeEach(async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';

    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);

    await page.addInitScript((id) => {
      localStorage.setItem(
        'family-storage',
        JSON.stringify({
          state: { selectedFamilyMemberId: id },
          version: 0,
        })
      );
    }, MOCK_IDS.MEMBER_ALEX);

    await page.route(/\/(?:backend\/)?api\/discovery\/categories/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: MOCK_CATEGORIES }),
      });
    });

    await page.route(/\/(?:backend\/)?api\/discovery(?:\?|$)/, async (route) => {
      // The app might call /api/discovery or /api/discovery?category=...
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: MOCK_STACK }),
      });
    });

    await page.route(/\/(?:backend\/)?api\/discovery\/.*\/vote/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });
  });

  test('should fetch categories and then fetch the first category stack', async ({ page }) => {
    await page.goto('/discovery');

    await expect(page.getByTestId('discovery-loader')).not.toBeVisible({ timeout: 15_000 });

    await expect(page.getByTestId('discovery-card').first()).toBeVisible();
    await expect(page.getByTestId('discovery-card').first()).toContainText(
      /Mock Gourmet Discovery/i
    );
  });

  test('should swipe through all categories and show summary', async ({ page }) => {
    await page.goto('/discovery');

    await expect(page.getByTestId('discovery-loader')).not.toBeVisible({ timeout: 15_000 });

    // 3 categories × 2 cards = 6 swipes total
    for (let i = 0; i < 6; i++) {
      const likeBtn = page.getByTestId('like-button');
      await expect(likeBtn).toBeEnabled({ timeout: 5_000 });
      await likeBtn.click();
    }

    await expect(page.getByTestId('discovery-empty-state')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('discovery-empty-state')).toContainText(/That's a wrap/i);
  });
});
