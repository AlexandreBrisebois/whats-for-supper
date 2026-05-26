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
          allowAgentSearch: false,
          allowPhotoSearch: false,
        }),
      });
    });
  });

  // pre-populates the passphrase on the welcome page is covered by welcome/page.test.tsx

  test('blocks agent search with explicit notice and keeps standard search available', async ({
    page,
    baseURL,
  }) => {
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

    // Attempt to trigger agent search in demo mode
    const agentTrigger = page.getByTestId('demo-agent-search-toggle');
    await expect(agentTrigger).toBeVisible();
    await agentTrigger.click();

    // Deterministic test-id-only notice path
    const notice = page.getByTestId('demo-ai-notice');
    await expect(notice).toBeVisible();
    await expect(notice).toContainText(/disabled in Demo Mode/i);

    // No dead-end: agent canvas remains blocked, standard input remains usable
    await expect(page.getByTestId('agent-search-input')).not.toBeVisible();
    await expect(page.getByTestId('recipe-search-input')).toBeVisible();
  });

  test('blocks photo search with explicit notice and does not open capture flow', async ({
    page,
    baseURL,
  }) => {
    const baseUrl = baseURL || 'http://127.0.0.1:3000';

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

    const photoTrigger = page.getByTestId('demo-photo-search-toggle');
    await expect(photoTrigger).toBeVisible();
    await photoTrigger.click();

    const notice = page.getByTestId('demo-photo-notice');
    await expect(notice).toBeVisible();
    await expect(notice).toContainText(/disabled in Demo Mode/i);

    await expect(page.getByTestId('inventory-capture-popup')).not.toBeVisible();
    await expect(page.getByTestId('recipe-search-input')).toBeVisible();
  });
});
