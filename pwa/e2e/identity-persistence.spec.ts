import { test, expect } from './fixtures';
import { MOCK_IDS, builders, setupCommonRoutes } from './mock-api';

test.describe('Identity Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await setupCommonRoutes(page);

    // Set identity cookie manually to simulate a logged-in state
    // Use 127.0.0.1 to match the default in fixtures.ts
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
    await page.context().addCookies([
      {
        name: 'x-family-member-id',
        value: MOCK_IDS.MEMBER_ALEX,
        url: baseUrl,
      },
    ]);

    // Seed the Zustand store in localStorage
    await page.addInitScript((id) => {
      localStorage.setItem(
        'family-storage',
        JSON.stringify({
          state: { selectedFamilyMemberId: id },
          version: 0,
        })
      );
    }, MOCK_IDS.MEMBER_ALEX);
  });

  test('family member selection persists when navigating Home -> Profile -> Settings', async ({
    page,
  }) => {
    // 1. Start at Profile
    await page.goto('/profile');
    await expect(page.getByText('Alex', { exact: true })).toBeVisible();

    // 2. Navigate to Home via Nav
    await page.getByTestId('nav-item-home').click();
    await expect(page).toHaveURL(/\/home/);

    // 3. Navigate back to Profile via Nav
    await page.getByTestId('nav-item-profile').click();
    await expect(page).toHaveURL(/\/profile/);

    // 4. Verify active member is displayed
    await expect(page.getByText('Alex', { exact: true })).toBeVisible();

    // 5. Navigate to Settings
    await page.getByRole('button', { name: /settings/i }).click();
    await expect(page).toHaveURL(/\/profile\/settings/);

    // 6. Verify family list is populated (not empty)
    const alexInList = page.getByTestId(`family-member-${MOCK_IDS.MEMBER_ALEX}`);
    await expect(alexInList).toBeVisible();
  });

  test('client-side navigation preserves family list even if server-side fetch fails', async ({
    page,
  }) => {
    // 1. Load Profile successfully
    await page.goto('/profile');
    await expect(page.getByText('Alex', { exact: true })).toBeVisible();

    // 2. Mock API failure for subsequent family fetches
    // This will affect client-side fetches. Server-side fetches from the PWA server
    // are harder to mock in Playwright but our code is now resilient to them returning null.
    await page.route('**/api/family', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal Server Error' }),
      })
    );

    // 3. Navigate to Home via Nav
    await page.getByTestId('nav-item-home').click();
    await expect(page).toHaveURL(/\/home/);

    // 4. Navigate back to Profile via Nav
    await page.getByTestId('nav-item-profile').click();

    // 5. Verify data is still there (not trashed by the failed transition)
    await expect(page.getByText('Alex', { exact: true })).toBeVisible();
  });
});
