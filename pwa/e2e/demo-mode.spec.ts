import { test, expect } from './fixtures';
import { MOCK_IDS, setupCommonRoutes } from './mock-api';

test.describe('Demo Mode', () => {
  test.beforeEach(async ({ page }) => {
    await setupCommonRoutes(page);

    // Override health check to enable demo mode
    await page.route('**/api/health', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'Healthy',
          timestamp: '2026-05-04T12:00:00.000Z',
          checks: {},
          demoMode: true,
          demoModeRawValue: 'true',
          demoRestoreCronValid: true,
        }),
      });
    });
  });

  // pre-populates the passphrase on the welcome page is covered by welcome/page.test.tsx

  test('keeps standard search available in demo mode', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://127.0.0.1:3000';

    // Simulate being logged in
    await page.context().addCookies([
      { name: 'x-hearth-secret', value: 'Swipe-Match-Cook', url: baseUrl },
      { name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl },
    ]);
    await page.addInitScript((id) => {
      localStorage.setItem(
        'family-storage',
        JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 })
      );
    }, MOCK_IDS.MEMBER_ALEX);

    await page.goto('/recipes');

    await expect(page.getByTestId('recipe-search-input')).toBeVisible();

    await expect(page.getByTestId('recipe-search-input')).toBeVisible();
  });
});
