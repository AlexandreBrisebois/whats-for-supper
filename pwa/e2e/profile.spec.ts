import { test, expect } from './fixtures';
import { MOCK_IDS, setupCommonRoutes } from './mock-api';

test.describe('Profile Page', () => {
  test.beforeEach(async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);

    await setupCommonRoutes(page);
  });

  /**
   * Task 43 — Coverage gap:
   * The profile page title must read "Who's Eating?" (Task 39 fix).
   * Verifies the title is visible on the page regardless of member selection state.
   */
  test('"Who\'s Eating?" title is visible on the profile page', async ({ page }) => {
    await page.goto('/profile');

    // The h2 heading must contain the updated title text
    await expect(page.getByRole('heading', { name: /who's eating/i })).toBeVisible({
      timeout: 5000,
    });
  });
});
