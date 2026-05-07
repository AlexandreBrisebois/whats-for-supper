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

  test('user can switch the active family member from the profile dropdown', async ({ page }) => {
    await page.goto('/profile');

    await expect(page.getByTestId('profile-dropdown-toggle')).toBeVisible();
    await page.getByTestId('profile-dropdown-toggle').click();

    await expect(page.getByTestId('profile-dropdown-menu')).toBeVisible();
    await page.getByTestId(`profile-dropdown-option-${MOCK_IDS.MEMBER_JORDAN}`).click();

    await expect(page).toHaveURL(/\/home/);

    const cookies = await page.context().cookies();
    expect(cookies.find((cookie) => cookie.name === 'x-family-member-id')?.value).toBe(
      MOCK_IDS.MEMBER_JORDAN
    );

    await page.goto('/profile');
    await expect(page.getByTestId('profile-dropdown-toggle')).toContainText('Jordan');
  });
});
