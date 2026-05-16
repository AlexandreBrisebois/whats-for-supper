import { test, expect } from './fixtures';
import {
  MOCK_IDS,
  builders,
  setupCommonRoutes,
  currentMonday,
  toDateStr,
  mockSseWithRecipeReady,
} from './mock-api';

test.describe('Home Command Center — Optimistic UI Race Fix', () => {
  test.beforeEach(async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';

    // x-family-member-id is needed for store persistence
    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);

    await setupCommonRoutes(page);

    // Mock active family GOTO
    await page.route(
      (url) => url.pathname.includes('/api/goto/active'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              description: 'Mock Recipe',
              recipeId: MOCK_IDS.RECIPE_LASAGNA,
              status: 'ready',
            },
          }),
        });
      }
    );

    // Mock GOTO status API — kept for completeness but confirm-goto-btn is now
    // driven by SSE recipe_ready, not by this polling endpoint.
    await page.route(
      (url) => url.pathname.includes('/api/recipes/') && url.pathname.endsWith('/status'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: MOCK_IDS.RECIPE_LASAGNA,
              status: 'pending', // always pending — SSE drives the transition
            },
          }),
        });
      }
    );

    // Mock SSE to emit recipe_ready for the GOTO recipe — this is what makes
    // confirm-goto-btn appear (replaces the old polling-based status check).
    await mockSseWithRecipeReady(page, MOCK_IDS.RECIPE_LASAGNA);

    // Mock initial schedule: Today is empty (shows pivot card)
    await page.route(
      (url) => url.pathname.includes('/api/schedule'),
      async (route) => {
        const url = new URL(route.request().url());
        const weekOffset = url.searchParams.get('weekOffset');

        if (weekOffset === '0') {
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
      }
    );

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
    await page.route(
      (url) => url.pathname.includes('/api/schedule/assign'),
      async (route) => {
        assignCalled = true;
      }
    );

    // 2. Mock recipes for QuickFind (fill-the-gap) - register BEFORE clicking discover
    await page.route(
      (url) => url.pathname.includes('/api/schedule/fill-the-gap'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              builders.scheduleRecipe({ id: MOCK_IDS.RECIPE_CHICKEN, name: 'Optimistic Chicken' }),
            ],
          }),
        });
      }
    );

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
    await page.route(
      (url) => url.pathname.includes('/api/schedule/assign'),
      async (route) => {
        assignCalled = true;
      }
    );

    // 2. Ensure Pivot Card is visible with GOTO ready — button appears only when ready
    await expect(page.getByTestId('tonight-pivot-card')).toBeVisible();
    const confirmBtn = page.getByTestId('confirm-goto-btn');
    await expect(confirmBtn).toBeVisible({ timeout: 10000 });
    await expect(confirmBtn).toBeEnabled();

    // 3. Click Confirm GOTO
    await confirmBtn.click();

    // 4. VERIFY: TonightMenuCard should appear IMMEDIATELY
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible({ timeout: 2000 });
    await expect(page.getByText('Mock Recipe').first()).toBeVisible();

    // Also verify Pivot Card is gone
    await expect(page.getByTestId('tonight-pivot-card')).not.toBeVisible();

    expect(assignCalled).toBe(true);
  });

  test('Pending GOTO transitions to ready via SSE recipe_ready event', async ({ page }) => {
    // Override the GOTO mock to start as pending
    let activeCallCount = 0;
    await page.route(
      (url) => url.pathname.includes('/api/goto/active'),
      async (route) => {
        activeCallCount++;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              description: 'Mock Recipe',
              recipeId: MOCK_IDS.RECIPE_LASAGNA,
              status: activeCallCount === 1 ? 'pending' : 'ready',
            },
          }),
        });
      }
    );

    // Status endpoint always returns 'pending' — polling must NOT resolve this
    await page.route(
      (url) => url.pathname.includes('/api/recipes/') && url.pathname.endsWith('/status'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: { id: MOCK_IDS.RECIPE_LASAGNA, status: 'pending' },
          }),
        });
      }
    );

    // Reload to pick up the new mock (beforeEach already set mockSseWithRecipeReady)
    await page.goto('/home');

    // confirm-goto-btn must appear driven by the SSE recipe_ready event
    // (status endpoint always returns 'pending', so polling can never resolve this)
    const confirmBtn = page.getByTestId('confirm-goto-btn');
    await expect(confirmBtn).toBeVisible({ timeout: 20000 });
    await expect(confirmBtn).toBeEnabled();
    await expect(page.getByText('Mock Recipe').first()).toBeVisible();
  });
});
