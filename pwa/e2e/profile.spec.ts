import { test, expect } from './fixtures';
import { MOCK_IDS, setupCommonRoutes } from './mock-api';

test.describe('Profile Page', () => {
  test.beforeEach(async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
    await page.context().addCookies([
      {
        name: 'x-family-member-id',
        value: MOCK_IDS.MEMBER_ALEX,
        url: baseUrl,
        httpOnly: true, // Matches app behavior for PWA persistence
      },
    ]);

    await page.setViewportSize({ width: 390, height: 844 });
    await setupCommonRoutes(page);
  });

  test('"Table\'s Set!" title is visible on the profile page', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByRole('heading', { name: /table.*set/i })).toBeVisible({
      timeout: 10000,
    });
  });

  test('Escape hatch "Continue as" button is visible when a member is already selected', async ({
    page,
  }) => {
    await page.goto('/profile');
    await expect(page.getByTestId('continue-as-btn')).toBeVisible();
    await expect(page.getByTestId('continue-as-btn')).toContainText(/alex/i);
  });

  test('Tapping "Continue as" navigates to /home', async ({ page }) => {
    await page.goto('/profile');
    await page.getByTestId('continue-as-btn').click();
    await expect(page).toHaveURL(/\/home/);
  });
});
