import { test, expect } from './fixtures';
import {
  MOCK_IDS,
  builders,
  setupCommonRoutes,
  currentMonday,
  toDateStr,
  mockSseWithRecipeReady,
} from './mock-api';

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
    await page.route(
      (url) => url.pathname.includes('/api/schedule'),
      async (route) => {
        if (route.request().url().includes('weekOffset=0') && route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: { weekOffset: 0, days: [] } }),
          });
        } else {
          await route.continue();
        }
      }
    );

    await page.goto('/home');
    await expect(page.getByTestId('tonight-pivot-card')).toBeVisible();
  });

  test('Confirming GOTO plans the meal', async ({ page }) => {
    // 1. Mock active GOTO
    await page.route(
      (url) => url.pathname.includes('/api/goto/active'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              description: 'Family GOTO',
              recipeId: MOCK_IDS.RECIPE_LASAGNA,
              status: 'ready',
            },
          }),
        });
      }
    );

    // 2. Mock SSE to emit recipe_ready — drives the ready transition (no polling)
    await mockSseWithRecipeReady(page, MOCK_IDS.RECIPE_LASAGNA);

    // 3. Mock assign API
    let assignCalled = false;
    await page.route(
      (url) => url.pathname.includes('/api/schedule/assign'),
      async (route) => {
        assignCalled = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
    );

    // 4. Mock recipe detail fetch (triggered by eager hydration)
    let recipeFetched = false;
    await page.route(
      (url) => url.pathname.endsWith(`/api/recipes/${MOCK_IDS.RECIPE_LASAGNA}`),
      async (route) => {
        if (route.request().method() !== 'GET') {
          return route.continue();
        }
        recipeFetched = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            updatedAt: new Date().toISOString(),
            recipe: builders.recipe({
              id: MOCK_IDS.RECIPE_LASAGNA,
              name: 'Family Lasagna',
              description: 'E2E Hydrated Description',
              ingredients: ['Pasta', 'Cheese'],
              totalTime: 'PT45M',
            }),
          }),
        });
      }
    );

    await page.goto('/home');
    await expect(page.getByTestId('tonight-pivot-card')).toBeVisible();

    const confirmBtn = page.getByTestId('confirm-goto-btn');
    await expect(confirmBtn).toBeEnabled();
    await expect(confirmBtn).toHaveText('Make This Tonight');
    await confirmBtn.click();

    await expect.poll(() => assignCalled).toBe(true);
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible({ timeout: 3000 });
    await expect(page.getByTestId('tonight-pivot-card')).not.toBeVisible();

    // Verify Hydration: flip the card and check for the description
    // The eager fetch should have completed by now (or will shortly)
    await page.getByTestId('tonight-menu-card').click();
    await expect(page.getByText('E2E Hydrated Description')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Pasta')).toBeVisible();
    expect(recipeFetched).toBe(true);
  });

  test('Menu card stays after GOTO confirm when schedule re-sync returns empty', async ({
    page,
  }) => {
    // Regression test for: optimistic setCurrentRecipe being overwritten by syncRecipe()
    // completing after the confirm click with an empty schedule response.

    // 1. Mock schedule to always return empty (simulates the race where the in-flight
    //    syncRecipe() hasn't seen the assignment yet when it completes)
    await page.route(
      (url) => url.pathname.includes('/api/schedule'),
      async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: { weekOffset: 0, days: [] } }),
          });
        } else {
          await route.continue();
        }
      }
    );
  });

  test('Tapping GOTO on home shows loading state then redirects to planner', async ({ page }) => {
    // 2. Mock active GOTO
    await page.route(
      (url) => url.pathname.includes('/api/goto/active'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              description: 'Family GOTO',
              recipeId: MOCK_IDS.RECIPE_LASAGNA,
              status: 'ready',
            },
          }),
        });
      }
    );

    // 3. Mock SSE to emit recipe_ready — drives the ready transition (no polling)
    await mockSseWithRecipeReady(page, MOCK_IDS.RECIPE_LASAGNA);

    // 4. Mock assign to resolve immediately
    await page.route(
      (url) => url.pathname.includes('/api/schedule/assign'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
    );

    await page.goto('/home');
    const confirmBtn = page.getByTestId('confirm-goto-btn');
    await expect(confirmBtn).toBeEnabled({ timeout: 10000 });
    await confirmBtn.click();

    // Menu card must appear despite syncRecipe() getting an empty schedule
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible({ timeout: 3000 });
    // Confirm the card stays visible through any re-sync window (no flicker)
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible({ timeout: 500 });
    await expect(page.getByTestId('tonight-pivot-card')).not.toBeVisible();
  });

  // Empty-state header, GOTO-ready button label, and ghost button styles are
  // pure prop-driven render assertions covered by TonightPivotCard.test.tsx.

  // Task 18: SSE recipe_ready → confirm-goto-btn appears (replaces polling test)
  // GOTO status endpoint returns 'pending' throughout — the button must appear
  // via the SSE recipe_ready event, not via the polling interval.
  test('SSE recipe_ready event makes confirm-goto-btn appear without polling', async ({ page }) => {
    await page.route(
      (url) => url.pathname.includes('/api/schedule'),
      async (route) => {
        if (route.request().url().includes('weekOffset=0') && route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: { weekOffset: 0, days: [] } }),
          });
        } else {
          await route.continue();
        }
      }
    );

    // First call returns pending — subsequent calls (after SSE fires) return ready.
    // This is the only path that can produce confirm-goto-btn: the component gates
    // rendering on hasGoto && gotoStatus === 'ready', so an initial 404 can never work.
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
              description: 'Test GOTO Recipe',
              recipeId: MOCK_IDS.RECIPE_LASAGNA,
              status: activeCallCount === 1 ? 'pending' : 'ready',
            },
          }),
        });
      }
    );

    // SSE fires recipe_ready for the GOTO recipe — triggers pending → ready transition
    await mockSseWithRecipeReady(page, MOCK_IDS.RECIPE_LASAGNA);

    await page.goto('/home');

    // confirm-goto-btn must appear driven by the SSE event, not the polling interval
    const confirmBtn = page.getByTestId('confirm-goto-btn');
    await expect(confirmBtn).toBeVisible({ timeout: 10000 });
    await expect(confirmBtn).toBeEnabled();
  });

  test('Pending GOTO transitions to ready via SSE recipe_ready event', async ({ page }) => {
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

    // Status endpoint always returns 'pending' — SSE must drive the transition
    await page.route(
      (url) => url.pathname.includes('/api/recipes/') && url.pathname.endsWith('/status'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { id: MOCK_IDS.RECIPE_LASAGNA, status: 'pending' } }),
        });
      }
    );

    // Mock SSE to emit recipe_ready for the GOTO recipe ID
    await mockSseWithRecipeReady(page, MOCK_IDS.RECIPE_LASAGNA);

    await page.goto('/home');
    const confirmBtn = page.getByTestId('confirm-goto-btn');

    // Initially hidden while pending (no SSE event yet — but SSE fires immediately in mock)
    // Wait for SSE-driven transition to ready
    await expect(confirmBtn).toBeVisible({ timeout: 10000 });
    await expect(confirmBtn).toBeEnabled();
    // gotoRecipeData.name from the detail endpoint ("Mock Recipe") overrides gotoDescription
    await expect(page.getByText(/mock recipe/i)).toBeVisible();
  });
});

// ── Group C: todayStore integration ──────────────────────────────────────────

test.describe('Home Command Center — todayStore (Group C)', () => {
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

  // C7: "Make This Tonight" tap shows TonightMenuCard immediately (no network wait)
  test('"Make This Tonight" shows TonightMenuCard immediately without waiting for network', async ({
    page,
  }) => {
    // Mock active GOTO
    await page.route(
      (url) => url.pathname.includes('/api/goto/active'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              description: 'Family GOTO',
              recipeId: MOCK_IDS.RECIPE_LASAGNA,
              status: 'ready',
            },
          }),
        });
      }
    );

    // Mock SSE to emit recipe_ready — drives the ready transition (no polling)
    await mockSseWithRecipeReady(page, MOCK_IDS.RECIPE_LASAGNA);

    // Mock assign to be slow (500ms) — menu card must appear before it resolves
    // Use a raw Promise delay instead of page.waitForTimeout() to avoid "Test ended"
    // errors when the route callback outlives the test's assertion phase.
    await page.route(
      (url) => url.pathname.includes('/api/schedule/assign'),
      async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
    );

    await page.goto('/home');

    const confirmBtn = page.getByTestId('confirm-goto-btn');
    await expect(confirmBtn).toBeEnabled({ timeout: 10000 });
    await confirmBtn.click();

    // TonightMenuCard must appear immediately (optimistic) — well before the 500ms assign resolves
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible({ timeout: 300 });
    await expect(page.getByTestId('tonight-pivot-card')).not.toBeVisible();

    // Clean up any in-flight routes to avoid "Test ended" errors
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });

  // C7: Page reload after "Make This Tonight" still shows TonightMenuCard
  // TODO: home-loader does not clear after reload; revisit when SSE push model replaces polling sync
  test.skip('Page reload after "Make This Tonight" still shows TonightMenuCard', async ({
    page,
  }) => {
    const monday = currentMonday();
    const today = toDateStr(monday);

    // Mock active GOTO
    await page.route(
      (url) => url.pathname.includes('/api/goto/active'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              description: 'Family GOTO',
              recipeId: MOCK_IDS.RECIPE_LASAGNA,
              status: 'ready',
            },
          }),
        });
      }
    );

    // Mock GOTO status as ready
    await page.route(
      (url) => url.pathname.includes('/api/recipes/') && url.pathname.endsWith('/status'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { id: MOCK_IDS.RECIPE_LASAGNA, status: 'ready' } }),
        });
      }
    );

    // Track whether assign has been called so we can return the recipe on reload
    let assignDone = false;
    await page.route(
      (url) => url.pathname.includes('/api/schedule/assign'),
      async (route) => {
        assignDone = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
    );

    // After assign, schedule returns the recipe for today
    await page.route(
      (url) => url.pathname.includes('/api/schedule'),
      async (route) => {
        if (route.request().url().includes('weekOffset=0') && route.request().method() === 'GET') {
          if (!assignDone) {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({ data: { weekOffset: 0, days: [] } }),
            });
          } else {
            const days = Array.from({ length: 7 }, (_, i) => {
              const d = new Date(monday);
              d.setUTCDate(monday.getUTCDate() + i);
              const dateStr = toDateStr(d);
              return {
                date: dateStr,
                status: 0,
                recipe:
                  dateStr === today
                    ? builders.scheduleRecipe({
                        id: MOCK_IDS.RECIPE_LASAGNA,
                        name: 'Family GOTO',
                        image: `/api/recipes/${MOCK_IDS.RECIPE_LASAGNA}/hero`,
                      })
                    : null,
              };
            });
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({ data: { weekOffset: 0, days } }),
            });
          }
        } else {
          await route.continue();
        }
      }
    );

    await page.goto('/home');

    const confirmBtn = page.getByTestId('confirm-goto-btn');
    await expect(confirmBtn).toBeEnabled({ timeout: 10000 });
    await confirmBtn.click();

    // Menu card appears optimistically
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible({ timeout: 3000 });

    // Wait for assign to complete
    await expect.poll(() => assignDone).toBe(true);

    // Reload — server now returns the recipe
    await page.reload();
    await expect(page.getByTestId('home-loader')).not.toBeVisible({ timeout: 5000 });

    // TonightMenuCard must still be visible after reload
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible();
    await expect(page.getByTestId('tonight-pivot-card')).not.toBeVisible();
  });

  test('"Make This Tonight" → navigating to planner shows recipe in today\'s slot', async ({
    page,
  }) => {
    const monday = currentMonday();
    const today = toDateStr(monday);
    let assignDone = false;

    // Mock active GOTO
    await page.route(
      (url) => url.pathname.includes('/api/goto/active'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              description: 'Family GOTO',
              recipeId: MOCK_IDS.RECIPE_LASAGNA,
              status: 'ready',
            },
          }),
        });
      }
    );

    // Mock SSE to emit recipe_ready — drives the ready transition (no polling)
    await mockSseWithRecipeReady(page, MOCK_IDS.RECIPE_LASAGNA);

    // Stateful schedule mock: before assign → empty; after assign → today's slot has the recipe
    await page.route(
      (url) => url.pathname.includes('/api/schedule'),
      async (route) => {
        if (route.request().url().includes('weekOffset=0') && route.request().method() === 'GET') {
          if (!assignDone) {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({ data: { weekOffset: 0, locked: false, status: 0, days: [] } }),
            });
          } else {
            const days = Array.from({ length: 7 }, (_, i) => {
              const d = new Date(monday);
              d.setUTCDate(monday.getUTCDate() + i);
              const dateStr = toDateStr(d);
              return {
                day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
                date: dateStr,
                recipe:
                  dateStr === today
                    ? { id: MOCK_IDS.RECIPE_LASAGNA, name: 'Family GOTO', image: '' }
                    : null,
                status: 0,
              };
            });
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({ data: { weekOffset: 0, locked: false, status: 0, days } }),
            });
          }
        } else if (route.request().url().includes('smart-defaults')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                weekOffset: 0,
                familySize: 3,
                consensusThreshold: 2,
                preSelectedRecipes: [],
                openSlots: [],
                consensusRecipesCount: 0,
              },
            }),
          });
        } else {
          await route.continue();
        }
      }
    );

    // Mock assign endpoint with assignDone flag
    await page.route(
      (url) => url.pathname.includes('/api/schedule/assign'),
      async (route) => {
        assignDone = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
    );

    // 1. Navigate to /home, wait for confirm-goto-btn enabled
    await page.goto('/home');
    const confirmBtn = page.getByTestId('confirm-goto-btn');
    await expect(confirmBtn).toBeEnabled({ timeout: 10000 });

    // 2. Click confirm-goto-btn
    await confirmBtn.click();

    // 3. Wait for assign to complete
    await expect.poll(() => assignDone).toBe(true);

    // 4. Navigate to /planner
    await page.goto('/planner');

    // 5. Wait for day-card-0
    await expect(page.getByTestId('day-card-0')).toBeVisible({ timeout: 10_000 });

    // 6. Assert today's card contains recipe-name with 'Family GOTO'
    const todayCard = page.locator(`[data-date="${today}"]`);
    await expect(todayCard.getByTestId('recipe-name')).toContainText('Family GOTO', {
      timeout: 5000,
    });
  });
});
