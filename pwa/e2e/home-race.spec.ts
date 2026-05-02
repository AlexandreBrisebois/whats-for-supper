import { test, expect } from './fixtures';
import { MOCK_IDS, builders, setupCommonRoutes } from './mock-api';

test.describe('Home Command Center — Optimistic UI Race Fix', () => {
  test.beforeEach(async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';

    // x-family-member-id is needed for store persistence
    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);

    await setupCommonRoutes(page);

    // Mock family GOTO setting
    await page.route(/\/(?:backend\/)?api\/settings\/family_goto/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            key: 'family_goto',
            value: {
              description: 'Our Family Spaghetti',
              recipeId: MOCK_IDS.RECIPE_LASAGNA,
            },
          },
        }),
      });
    });

    // Mock GOTO status API
    await page.route(
      new RegExp(`/(?:backend/)?api/recipes/${MOCK_IDS.RECIPE_LASAGNA}/status`),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: MOCK_IDS.RECIPE_LASAGNA,
              status: 'ready',
            },
          }),
        });
      }
    );

    // Mock initial schedule: Today is empty (shows pivot card)
    await page.route(/\/(?:backend\/)?api\/schedule(?:\?.*)?$/, async (route) => {
      const url = new URL(route.request().url());
      const weekOffset = url.searchParams.get('weekOffset');

      if (weekOffset === '0') {
        const today = new Date().toISOString().split('T')[0];
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              weekOffset: 0,
              days: [],
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Visit a page to initialize the domain context for localStorage
    await page.goto('/onboarding');
    await page.evaluate((id) => {
      localStorage.setItem(
        'family-storage',
        JSON.stringify({
          state: {
            selectedFamilyMemberId: id,
            familyMembers: [{ id, name: 'Alex' }],
            _hasHydrated: true,
            hasLoaded: true,
          },
          version: 0,
        })
      );
    }, MOCK_IDS.MEMBER_ALEX);

    await page.goto('/home');

    // Wait for the pivot card to be visible - this ensures sync is done
    await expect(page.getByTestId('tonight-pivot-card')).toBeVisible({ timeout: 10000 });
  });

  test('Selecting a recipe from QuickFind shows the menu card immediately (optimistic)', async ({
    page,
  }) => {
    // 1. Mock assign API to NEVER resolve (simulate slow network)
    let assignCalled = false;
    await page.route(/\/(?:backend\/)?api\/schedule\/assign/, async (route) => {
      assignCalled = true;
    });

    // 2. Mock recipes for QuickFind (fill-the-gap) - register BEFORE clicking discover
    await page.route('**/api/schedule/fill-the-gap', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            builders.scheduleRecipe({ id: MOCK_IDS.RECIPE_CHICKEN, name: 'Optimistic Chicken' }),
          ],
        }),
      });
    });

    // 3. Ensure Pivot Card is visible initially
    await expect(page.getByTestId('tonight-pivot-card')).toBeVisible();

    // 4. Open QuickFind and select a recipe
    await page.getByTestId('discover-btn').click();
    await expect(page.getByTestId('quick-find-modal')).toBeVisible();

    // Wait for recipe to appear
    const recipeItem = page.getByText('Optimistic Chicken').first();
    await expect(recipeItem).toBeVisible();

    // 5. Click the SELECT button
    await page.getByTestId('quick-find-select').click();

    // 6. VERIFY: TonightMenuCard should appear IMMEDIATELY
    await expect(page.getByTestId('quick-find-modal')).not.toBeVisible();
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Optimistic Chicken').first()).toBeVisible();

    // Also verify Pivot Card is gone
    await expect(page.getByTestId('tonight-pivot-card')).not.toBeVisible();

    expect(assignCalled).toBe(true);
  });

  test('Confirming GOTO shows the menu card immediately (optimistic)', async ({ page }) => {
    // 1. Mock assign API to NEVER resolve
    let assignCalled = false;
    await page.route(/\/(?:backend\/)?api\/schedule\/assign/, async (route) => {
      assignCalled = true;
    });

    // 2. Ensure Pivot Card is visible with GOTO ready
    await expect(page.getByTestId('tonight-pivot-card')).toBeVisible();
    const confirmBtn = page.getByTestId('confirm-goto-btn');
    await expect(confirmBtn).toBeEnabled();

    // 3. Click Confirm GOTO
    await confirmBtn.click();

    // 4. VERIFY: TonightMenuCard should appear IMMEDIATELY
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible({ timeout: 2000 });
    await expect(page.getByText('Our Family Spaghetti').first()).toBeVisible();

    // Also verify Pivot Card is gone
    await expect(page.getByTestId('tonight-pivot-card')).not.toBeVisible();

    expect(assignCalled).toBe(true);
  });

  test('Pending GOTO polls until ready', async ({ page }) => {
    // 1. Mock status API to return pending twice, then ready
    let statusCalls = 0;
    await page.route(
      new RegExp(`/(?:backend/)?api/recipes/${MOCK_IDS.RECIPE_LASAGNA}/status`),
      async (route) => {
        statusCalls++;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: MOCK_IDS.RECIPE_LASAGNA,
              status: statusCalls > 2 ? 'ready' : 'pending',
            },
          }),
        });
      }
    );

    // Reload to pick up the new mock
    await page.goto('/home');

    // 2. Ensure initially disabled
    await expect(
      page.getByText(/checking your goto/i).or(page.getByText(/your goto is being prepared/i))
    ).toBeVisible();
    const confirmBtn = page.getByTestId('confirm-goto-btn');
    await expect(confirmBtn).toBeDisabled();

    // 3. Wait for polling to hit the 'ready' state (polls every 5s)
    // We can speed up time or just wait. Since it's only 2 polls, it might take 10-15s.
    // In Playwright, we can't easily speed up setInterval without injecting scripts.
    // But we can wait for the button to become enabled.
    await expect(confirmBtn).toBeEnabled({ timeout: 20000 });
    await expect(page.getByText('Our Family Spaghetti').first()).toBeVisible();
  });
});
