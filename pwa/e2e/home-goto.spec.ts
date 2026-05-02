import { test, expect } from './fixtures';
import { MOCK_IDS, builders, setupCommonRoutes } from './mock-api';

test.describe('Home Command Center — GOTO & Pivot Flow', () => {
  test.beforeEach(async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);

    await setupCommonRoutes(page);

    // Hydrate store
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
  });

  test('Shows Pivot Card when no recipe is planned', async ({ page }) => {
    // 1. Mock empty schedule
    await page.route(/\/(?:backend\/)?api\/schedule(?:\?.*)?$/, async (route) => {
      if (route.request().url().includes('weekOffset=0') && route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { weekOffset: 0, days: [] } }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/home');
    await expect(page.getByTestId('tonight-pivot-card')).toBeVisible();
  });

  test('Confirming GOTO plans the meal', async ({ page }) => {
    // 1. Mock GOTO setting
    await page.route(/\/(?:backend\/)?api\/settings\/family_goto/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            key: 'family_goto',
            value: {
              description: 'Family GOTO',
              recipeId: MOCK_IDS.RECIPE_LASAGNA,
            },
          },
        }),
      });
    });

    // 2. Mock GOTO status
    await page.route(/\/(?:backend\/)?api\/recipes\/[0-9a-f-]+\/status/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { id: MOCK_IDS.RECIPE_LASAGNA, status: 'ready' } }),
      });
    });

    // 3. Mock assign API
    let assignCalled = false;
    await page.route(/\/(?:backend\/)?api\/schedule\/assign/, async (route) => {
      assignCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto('/home');
    await expect(page.getByTestId('tonight-pivot-card')).toBeVisible();

    const confirmBtn = page.getByTestId('confirm-goto-btn');
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();

    await expect.poll(() => assignCalled).toBe(true);
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible({ timeout: 3000 });
    await expect(page.getByTestId('tonight-pivot-card')).not.toBeVisible();
  });

  test('Menu card stays after GOTO confirm when schedule re-sync returns empty', async ({
    page,
  }) => {
    // Regression test for: optimistic setCurrentRecipe being overwritten by syncRecipe()
    // completing after the confirm click with an empty schedule response.

    // 1. Mock schedule to always return empty (simulates the race where the in-flight
    //    syncRecipe() hasn't seen the assignment yet when it completes)
    await page.route(/\/(?:backend\/)?api\/schedule(?:\?.*)?$/, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { weekOffset: 0, days: [] } }),
        });
      } else {
        await route.continue();
      }
    });

    // 2. Mock GOTO setting
    await page.route(/\/(?:backend\/)?api\/settings\/family_goto/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            key: 'family_goto',
            value: {
              description: 'Family GOTO',
              recipeId: MOCK_IDS.RECIPE_LASAGNA,
            },
          },
        }),
      });
    });

    // 3. Mock GOTO status as ready
    await page.route(/\/(?:backend\/)?api\/recipes\/[0-9a-f-]+\/status/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { id: MOCK_IDS.RECIPE_LASAGNA, status: 'ready' } }),
      });
    });

    // 4. Mock assign to resolve immediately
    await page.route(/\/(?:backend\/)?api\/schedule\/assign/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto('/home');
    const confirmBtn = page.getByTestId('confirm-goto-btn');
    await expect(confirmBtn).toBeEnabled({ timeout: 10000 });
    await confirmBtn.click();

    // Menu card must appear despite syncRecipe() getting an empty schedule
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible({ timeout: 3000 });
    // Wait out any re-sync window to confirm the card does not flicker back
    await page.waitForTimeout(2000);
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible();
    await expect(page.getByTestId('tonight-pivot-card')).not.toBeVisible();
  });

  test('Pending GOTO polls until ready', async ({ page }) => {
    let callCount = 0;
    await page.route(/\/(?:backend\/)?api\/recipes\/[0-9a-f-]+\/status/, async (route) => {
      callCount++;
      const status = callCount >= 2 ? 'ready' : 'pending';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { id: MOCK_IDS.RECIPE_LASAGNA, status } }),
      });
    });

    await page.route(/\/(?:backend\/)?api\/settings\/family_goto/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            key: 'family_goto',
            value: { description: 'Slow GOTO', recipeId: MOCK_IDS.RECIPE_LASAGNA },
          },
        }),
      });
    });

    await page.goto('/home');
    const confirmBtn = page.getByTestId('confirm-goto-btn');

    // Initially hidden while pending
    await expect(confirmBtn).not.toBeVisible();
    await expect(page.getByText(/your goto is being prepared/i)).toBeVisible();

    // Wait for poll and transition to ready — button should appear
    // gotoRecipeData.name from the detail endpoint ("Mock Recipe") overrides gotoDescription
    await expect(confirmBtn).toBeVisible({ timeout: 10000 });
    await expect(confirmBtn).toBeEnabled();
    await expect(page.getByText(/mock recipe/i)).toBeVisible();
  });
});
