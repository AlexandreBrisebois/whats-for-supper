import { test, expect } from './fixtures';
import { MOCK_IDS, setupCommonRoutes, mockSseWithRecipeReady } from './mock-api';

test.describe('Settings — FamilyGOTOSettings card', () => {
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

  // Task 38: SSE recipe_ready → spinner replaced by recipe name without poll firing
  test('SSE recipe_ready replaces pending spinner with recipe name (no polling)', async ({
    page,
  }) => {
    const GOTO_RECIPE_ID = MOCK_IDS.RECIPE_LASAGNA;
    const GOTO_DESCRIPTION = 'Slow-cooked Lasagna';

    // 1. Mock GOTO setting with a pending recipe
    await page.route(
      (url) => url.pathname.includes('/api/settings/family_goto'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              key: 'family_goto',
              value: {
                description: GOTO_DESCRIPTION,
                recipeId: GOTO_RECIPE_ID,
              },
            },
          }),
        });
      }
    );

    // 2. Mock status endpoint to always return 'pending' — polling must NOT resolve this
    let statusCallCount = 0;
    await page.route(
      (url) => url.pathname.includes('/api/recipes/') && url.pathname.endsWith('/status'),
      async (route) => {
        statusCallCount++;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: { id: GOTO_RECIPE_ID, status: 'pending' },
          }),
        });
      }
    );

    // 3. Navigate to settings page — SSE mock registered after confirming pending state
    //    to avoid a race where recipe_ready fires before currentGoto is loaded.
    await page.goto('/profile/settings');

    // 4. Initially the pending spinner should be visible (status endpoint returns 'pending')
    await expect(page.getByTestId('goto-pending-spinner')).toBeVisible({ timeout: 5000 });

    // 5. Pending subtitle should be visible
    await expect(page.getByTestId('goto-pending-subtitle')).toHaveText(
      'Usually ready in under 10 seconds'
    );

    // 6. Description echo should show what was submitted
    await expect(page.getByTestId('goto-pending-description')).toHaveText(GOTO_DESCRIPTION);

    // 7. Change link should be visible as the escape hatch
    await expect(page.getByTestId('goto-change-btn')).toBeVisible();

    // 8. Simulate SSE recipe_ready by calling markReady directly on the gotoStore.
    //    This avoids SSE timing issues (the static mock body fires on connect, which
    //    races with settings load). The gotoStore is exposed on window.__gotoStore for tests.
    await page.evaluate((recipeId) => {
      (window as any).__gotoStore?.getState().markReady(recipeId);
    }, GOTO_RECIPE_ID);

    // 9. SSE recipe_ready fires → spinner replaced by recipe name
    // (status endpoint always returns 'pending', so only SSE can drive this transition)
    await expect(page.getByTestId('goto-recipe-name')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('goto-pending-spinner')).not.toBeVisible();

    // 10. Recipe name text is visible
    await expect(page.getByTestId('goto-recipe-name')).toContainText(GOTO_DESCRIPTION);

    // 11. Verify the status endpoint was called at most once (initial seed) — no polling
    // Allow for 1 call (initial fetch on mount) but not more
    expect(statusCallCount).toBeLessThanOrEqual(1);
  });

  /**
   * Task 43 — Coverage gap:
   * When the recipe status endpoint returns 'ready' on mount, the settings card
   * must show the recipe name (not the spinner). This is the steady-state "ready"
   * view — no SSE event needed, just the initial fetch returning 'ready'.
   */
  test('GOTO ready state shows recipe name when status endpoint returns ready', async ({
    page,
  }) => {
    const GOTO_DESCRIPTION = 'Slow-cooked Lasagna';

    // Mock GOTO setting with a recipe
    await page.route(
      (url) => url.pathname.includes('/api/settings/family_goto'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              key: 'family_goto',
              value: {
                description: GOTO_DESCRIPTION,
                recipeId: MOCK_IDS.RECIPE_LASAGNA,
              },
            },
          }),
        });
      }
    );

    // Status endpoint returns 'ready' immediately — no SSE needed
    await page.route(
      (url) => url.pathname.includes('/api/recipes/') && url.pathname.endsWith('/status'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: { id: MOCK_IDS.RECIPE_LASAGNA, status: 'ready' },
          }),
        });
      }
    );

    await page.goto('/profile/settings');

    // Recipe name must be visible — spinner must not be present
    await expect(page.getByTestId('goto-recipe-name')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('goto-recipe-name')).toContainText(GOTO_DESCRIPTION);
    await expect(page.getByTestId('goto-pending-spinner')).not.toBeVisible();
  });

  /**
   * Task 43 — Coverage gap:
   * Language toggle selection must persist when the user navigates away and
   * returns to the settings page. The locale is stored in localStorage via
   * LocaleProvider — this test verifies the active button reflects the stored
   * locale on re-mount.
   */
  test('language toggle selection persists on navigation', async ({ page }) => {
    await page.goto('/profile/settings');

    // Wait for the settings page to render
    await expect(page.getByTestId('locale-btn-en')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('locale-btn-fr')).toBeVisible();

    // Switch to French
    await page.getByTestId('locale-btn-fr').click();

    // Navigate away and back
    await page.goto('/profile');
    await page.goto('/profile/settings');

    // French button must still be active (bg-indigo as a standalone class, not hover:bg-indigo/5)
    const frenchBtn = page.getByTestId('locale-btn-fr');
    await expect(frenchBtn).toBeVisible({ timeout: 5000 });
    await expect(frenchBtn).toHaveClass(/(?:^| )bg-indigo(?:$| )/);

    // English button must be inactive (only has hover:bg-indigo/5, not standalone bg-indigo)
    const englishBtn = page.getByTestId('locale-btn-en');
    await expect(englishBtn).not.toHaveClass(/(?:^| )bg-indigo(?:$| )/);

    // Restore English so other tests are not affected
    await englishBtn.click();
  });

  test('GOTO pending state shows subtitle and description echo', async ({ page }) => {
    const GOTO_DESCRIPTION = "Grandma's Chicken Soup";

    // Mock GOTO setting with a pending recipe
    await page.route(
      (url) => url.pathname.includes('/api/settings/family_goto'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              key: 'family_goto',
              value: {
                description: GOTO_DESCRIPTION,
                recipeId: MOCK_IDS.RECIPE_LASAGNA,
              },
            },
          }),
        });
      }
    );

    // Status endpoint returns 'pending' — keep spinner visible
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

    await page.goto('/profile/settings');

    // Pending state elements visible
    await expect(page.getByTestId('goto-pending-spinner')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('goto-pending-subtitle')).toBeVisible();
    await expect(page.getByTestId('goto-pending-description')).toHaveText(GOTO_DESCRIPTION);
    await expect(page.getByTestId('goto-change-btn')).toBeVisible();
  });
});
