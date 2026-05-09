import { test, expect } from './fixtures';
import { setupCommonRoutes } from './mock-api';

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
          timestamp: new Date().toISOString(),
          checks: {},
          demoMode: true,
        }),
      });
    });
  });

  test('pre-populates the passphrase on the welcome page', async ({ page }) => {
    await page.goto('/welcome');

    // Check that the passphrase input is pre-populated
    const passphraseInput = page.getByPlaceholder(/Family passphrase/i);
    await expect(passphraseInput).toHaveValue('Swipe-Match-Cook');
  });

  test('shows AI notice and prevents agent search on recipes page', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://127.0.0.1:3000';

    // Simulate being logged in
    await page
      .context()
      .addCookies([{ name: 'x-hearth-secret', value: 'Swipe-Match-Cook', url: baseUrl }]);

    await page.goto('/recipes');

    // Attempt to trigger agent search
    const agentTrigger = page.getByTestId('agent-search-trigger');
    await agentTrigger.click();

    // Verify AI notice appears
    const notice = page.getByTestId('demo-ai-notice');
    await expect(notice).toBeVisible();
    await expect(notice).toContainText(/disabled in Demo Mode/i);

    // Verify search mode didn't actually change to agent (textarea should not be visible)
    await expect(page.getByTestId('agent-search-input')).not.toBeVisible();
  });
});
