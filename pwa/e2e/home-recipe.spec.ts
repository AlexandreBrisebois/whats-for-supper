import { test, expect } from './fixtures';
import {
  MOCK_IDS,
  builders,
  setupCommonRoutes,
  currentMonday,
  toDateStr,
  mockSseWithSlotUpdate,
} from './mock-api';

test.describe('Home Command Center — Planned Recipe Flow', () => {
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

  test('Shows tonight menu card when recipe is planned', async ({ page }) => {
    const monday = currentMonday();
    const today = toDateStr(monday);
    const lasagnaRecipe = builders.scheduleRecipe({
      id: MOCK_IDS.RECIPE_LASAGNA,
      name: 'Test Lasagna',
      image: `/api/recipes/${MOCK_IDS.RECIPE_LASAGNA}/hero`,
    });

    // Override SSE to seed todayStore with the recipe deterministically.
    // Without this, the SSE `connected` (empty schedule) races against sync() (GET schedule)
    // and can reset todayStore.currentRecipe to null, hiding the menu card.
    await mockSseWithSlotUpdate(page, { date: today, recipe: lasagnaRecipe, status: 0 });

    // 1. Mock schedule with a planned recipe for today
    await page.route(
      (url) => url.pathname.includes('/api/schedule') && url.searchParams.get('weekOffset') === '0',
      async (route) => {
        if (route.request().method() === 'GET') {
          // Use builders to ensure contract compliance
          const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(monday);
            d.setUTCDate(monday.getUTCDate() + i);
            const dateStr = toDateStr(d);

            return {
              date: dateStr,
              status: 0,
              recipe: lasagnaRecipe,
            };
          });

          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: { weekOffset: 0, days } }),
          });
        } else {
          await route.continue();
        }
      }
    );

    await page.goto('/home');

    // Wait for loader to disappear
    await expect(page.getByTestId('home-loader')).not.toBeVisible();

    // Verify Menu Card is shown
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Test Lasagna' }).first()).toBeVisible();
  });

  // SSE-16: slot_updated → TonightMenuCard appears without navigation or poll
  // The schedule REST endpoint returns an EMPTY schedule (no recipe for today) so the
  // store loads with no recipe. The SSE `slot_updated` push then assigns the recipe.
  // The card must appear from the SSE event — not from a poll or a second REST fetch.
  // Proof: the REST endpoint is a one-shot empty response; no subsequent GET is mocked
  // to return a recipe, so any TonightMenuCard that appears must come from SSE alone.
  test('SSE slot_updated for today → TonightMenuCard appears without navigation or poll', async ({
    page,
  }) => {
    const monday = currentMonday();
    const today = toDateStr(monday); // fixed test Monday: 2026-05-04

    const recipe = builders.scheduleRecipe({
      id: MOCK_IDS.RECIPE_LASAGNA,
      name: 'SSE Lasagna',
      image: `/api/recipes/${MOCK_IDS.RECIPE_LASAGNA}/hero`,
    });

    // Override the SSE stream to emit connected (empty schedule) + slot_updated for today.
    // Registered before setupCommonRoutes so LIFO gives this mock priority.
    await mockSseWithSlotUpdate(page, { date: today, recipe, status: 0 });

    // Return an empty schedule from REST — no recipe for today.
    // This means the loader clears (isLoading → false) but TonightPivotCard renders,
    // not TonightMenuCard. The SSE slot_updated then pushes the recipe, which must
    // flip the card to TonightMenuCard without any further REST fetch.
    await page.route(
      (url) => url.pathname === '/api/schedule',
      async (route) => {
        if (route.request().method() === 'GET') {
          const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(monday);
            d.setUTCDate(monday.getUTCDate() + i);
            return {
              day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
              date: toDateStr(d),
              recipe: null,
              status: 0,
            };
          });
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: { weekOffset: 0, locked: false, status: 0, days } }),
          });
        } else {
          await route.continue();
        }
      }
    );

    await page.goto('/home');

    // Wait for the loader to clear — REST returned empty schedule, so isLoading → false.
    await expect(page.getByTestId('home-loader')).not.toBeVisible({ timeout: 5_000 });

    // At this point TonightPivotCard is visible (no recipe from REST).
    // The SSE slot_updated event fires and applyServerUpdate sets currentRecipe.
    // TonightMenuCard must appear — driven by SSE, not by a poll or second REST fetch.
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('heading', { name: 'SSE Lasagna' }).first()).toBeVisible();
  });

  // B5: "Order In" with no recipe writes status:3 to backend and hides pivot card
  test('"Order In" with no recipe writes status:3 and hides pivot card', async ({ page }) => {
    // Empty schedule — no recipe for today
    await page.route(
      (url) => url.pathname.includes('/api/schedule'),
      async (route) => {
        const reqUrl = new URL(route.request().url());
        if (reqUrl.searchParams.get('weekOffset') === '0' && route.request().method() === 'GET') {
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

    // Capture validate call
    let validateBody: unknown = null;
    await page.route(
      (url) => url.pathname.includes('/api/schedule/day/') && url.pathname.endsWith('/validate'),
      async (route) => {
        validateBody = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
    );

    await page.goto('/home');

    // Pivot card is visible with no recipe
    await expect(page.getByTestId('tonight-pivot-card')).toBeVisible();

    // Tap "Order In"
    await page.getByTestId('order-in-btn').click();

    // Backend write must have fired with status: 3
    await expect.poll(() => validateBody).toMatchObject({ status: 3 });

    // Pivot card must disappear for the session
    await expect(page.getByTestId('tonight-pivot-card')).not.toBeVisible({ timeout: 3000 });
  });

  // B6: "Order In" with a recipe opens SkipRecoveryDialog before any state change
  test('"Order In" with recipe opens SkipRecoveryDialog before committing', async ({ page }) => {
    // Schedule with a planned recipe for today
    const monday = currentMonday();
    const today = toDateStr(monday);
    const lasagnaRecipe = builders.scheduleRecipe({
      id: MOCK_IDS.RECIPE_LASAGNA,
      name: 'Test Lasagna',
    });
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setUTCDate(monday.getUTCDate() + i);
      const dateStr = toDateStr(d);
      return {
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
        date: dateStr,
        status: 0,
        recipe: dateStr === today ? lasagnaRecipe : null,
      };
    });

    // Override SSE to send the recipe for today so todayStore.currentRecipe is set
    // deterministically — avoids a race between SSE (empty schedule) and sync() (GET schedule).
    await mockSseWithSlotUpdate(page, { date: today, recipe: lasagnaRecipe, status: 0 });

    await page.route(
      (url) => url.pathname.includes('/api/schedule'),
      async (route) => {
        const reqUrl = new URL(route.request().url());
        if (reqUrl.searchParams.get('weekOffset') === '0' && route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: { weekOffset: 0, days } }),
          });
        } else {
          await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
        }
      }
    );

    // Ensure validate is NOT called before dialog confirmation
    let validateCalled = false;
    await page.route(
      (url) => url.pathname.includes('/api/schedule/day/') && url.pathname.endsWith('/validate'),
      async (route) => {
        validateCalled = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
    );

    await page.goto('/home');

    // Wait for loader to clear and menu card to appear (recipe is planned)
    await expect(page.getByTestId('home-loader')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible();

    // Flip the card to reveal the back face (skip button is on the back)
    await page.getByTestId('tonight-menu-card').click();

    // Wait for flip animation to complete (back face becomes visible), then click skip.
    // dispatchEvent bypasses coordinate hit-testing — the CSS rotate-y-180 transform
    // means the element's DOM bounding box doesn't match its visual position, causing
    // force:true clicks to miss. dispatchEvent fires directly on the element.
    await expect(page.getByTestId('skip-tonight-btn')).toBeVisible();
    await page.getByTestId('skip-tonight-btn').dispatchEvent('click');

    // Recovery dialog must open
    await expect(page.getByTestId('recovery-dialog-title')).toBeVisible();

    // No backend write yet
    expect(validateCalled).toBe(false);
  });

  test('"Pick Something Else" flow opens Quick Find then Step 2', async ({ page }) => {
    const monday = currentMonday();
    const today = toDateStr(monday);
    const lasagnaRecipe = builders.scheduleRecipe({
      id: MOCK_IDS.RECIPE_LASAGNA,
      name: 'Test Lasagna',
      image: `/api/recipes/${MOCK_IDS.RECIPE_LASAGNA}/hero`,
    });

    let moveCalled = false;
    let moveRecipeId: string | null = null;
    let assignCalled = false;

    await mockSseWithSlotUpdate(page, { date: today, recipe: lasagnaRecipe, status: 0 });

    // Mock schedule with a planned recipe for today
    await page.route(
      (url) => url.pathname.includes('/api/schedule'),
      async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        const method = request.method();

        if (url.pathname.endsWith('/fill-the-gap')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: [
                builders.scheduleRecipe({
                  id: MOCK_IDS.RECIPE_CHICKEN,
                  name: 'Test Chicken',
                  image: '/chicken.jpg',
                }),
              ],
            }),
          });
        } else if (url.pathname.endsWith('/move') && method === 'POST') {
          moveCalled = true;
          const body = request.postDataJSON();
          moveRecipeId = body?.recipeId ?? null;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true }),
          });
        } else if (url.pathname.endsWith('/assign') && method === 'POST') {
          assignCalled = true;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true }),
          });
        } else if (url.pathname.endsWith('/api/schedule') && method === 'GET') {
          const monday = currentMonday();
          const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(monday);
            d.setUTCDate(monday.getUTCDate() + i);
            const dateStr = toDateStr(d);
            return {
              date: dateStr,
              status: 0,
              recipe: dateStr === today ? lasagnaRecipe : null,
            };
          });
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: { weekOffset: 0, days } }),
          });
        } else {
          await route.continue();
        }
      }
    );

    await page.goto('/home');
    await expect(page.getByTestId('home-loader')).not.toBeVisible();
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible();

    // Flip the card and click skip
    await page.getByTestId('tonight-menu-card').click();
    await expect(page.getByTestId('skip-tonight-btn')).toBeVisible();
    await page.getByTestId('skip-tonight-btn').dispatchEvent('click');

    // Click "Pick Something Else"
    await page.getByTestId('recovery-action-pick-else').click();

    // Dialog should close, Quick Find should open
    await expect(page.getByTestId('recovery-dialog-title')).not.toBeVisible();
    await expect(page.getByTestId('quick-find-modal')).toBeVisible();

    // Select the recipe
    await page.getByTestId('quick-find-select').click();

    // Quick Find should close, Recovery Dialog should re-open at Step 2
    await expect(page.getByTestId('quick-find-modal')).not.toBeVisible();
    await expect(page.getByTestId('recovery-dialog-title')).toBeVisible();
    await expect(page.getByText("What about tonight's recipe?")).toBeVisible();

    // Click "Move to Tomorrow"
    await page.getByTestId('recovery-action-tomorrow').click();

    // Verify both APIs called and move sent the correct recipeId (regression: BS-10)
    await expect.poll(() => moveCalled).toBe(true);
    await expect.poll(() => assignCalled).toBe(true);
    expect(moveRecipeId).toBe(MOCK_IDS.RECIPE_LASAGNA);

    // Dialog should be closed
    await expect(page.getByTestId('recovery-dialog-title')).not.toBeVisible();
  });

  test('"Order In → Move to Tomorrow" sends recipeId and closes dialog', async ({ page }) => {
    const monday = currentMonday();
    const today = toDateStr(monday);
    const lasagnaRecipe = builders.scheduleRecipe({
      id: MOCK_IDS.RECIPE_LASAGNA,
      name: 'Test Lasagna',
      image: `/api/recipes/${MOCK_IDS.RECIPE_LASAGNA}/hero`,
    });

    let moveCalled = false;
    let moveRecipeId: string | null = null;

    await mockSseWithSlotUpdate(page, { date: today, recipe: lasagnaRecipe, status: 0 });

    await page.route(
      (url) => url.pathname.includes('/api/schedule'),
      async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        const method = request.method();

        if (url.pathname.endsWith('/move') && method === 'POST') {
          moveCalled = true;
          const body = request.postDataJSON();
          moveRecipeId = body?.recipeId ?? null;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: { message: 'Recipe moved' } }),
          });
        } else if (url.pathname.endsWith('/api/schedule') && method === 'GET') {
          const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(monday);
            d.setUTCDate(monday.getUTCDate() + i);
            const dateStr = toDateStr(d);
            return { date: dateStr, status: 0, recipe: dateStr === today ? lasagnaRecipe : null };
          });
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: { weekOffset: 0, days } }),
          });
        } else {
          await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
        }
      }
    );

    await page.goto('/home');
    await expect(page.getByTestId('home-loader')).not.toBeVisible();
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible();

    // Flip the card and click skip
    await page.getByTestId('tonight-menu-card').click();
    await expect(page.getByTestId('skip-tonight-btn')).toBeVisible();
    await page.getByTestId('skip-tonight-btn').dispatchEvent('click');

    await expect(page.getByTestId('recovery-dialog-title')).toBeVisible();

    // Click "Ordering In" → step 2
    await page.getByTestId('recovery-action-order-in').click();
    await expect(page.getByText("What about tonight's recipe?")).toBeVisible();

    // Click "Move to Tomorrow"
    await page.getByTestId('recovery-action-tomorrow').click();

    // Move must be called with the original recipe's ID (regression: BS-10)
    await expect.poll(() => moveCalled).toBe(true);
    expect(moveRecipeId).toBe(MOCK_IDS.RECIPE_LASAGNA);

    // Dialog must be closed
    await expect(page.getByTestId('recovery-dialog-title')).not.toBeVisible();
  });

  test('"Order In → Drop Tonight" marks tonight ordered in and navigates to planner', async ({
    page,
  }) => {
    const monday = currentMonday();
    const today = toDateStr(monday);
    const lasagnaRecipe = builders.scheduleRecipe({
      id: MOCK_IDS.RECIPE_LASAGNA,
      name: 'Test Lasagna',
      image: `/api/recipes/${MOCK_IDS.RECIPE_LASAGNA}/hero`,
    });

    let validateCalled = false;

    await mockSseWithSlotUpdate(page, { date: today, recipe: lasagnaRecipe, status: 0 });

    await page.route(
      (url) => url.pathname.includes('/api/schedule'),
      async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        const method = request.method();

        if (url.pathname.endsWith('/fill-the-gap')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: [
                builders.scheduleRecipe({
                  id: MOCK_IDS.RECIPE_CHICKEN,
                  name: 'Test Chicken',
                  image: '/chicken.jpg',
                }),
              ],
            }),
          });
        } else if (
          url.pathname.includes('/day/') &&
          url.pathname.endsWith('/validate') &&
          method === 'POST'
        ) {
          validateCalled = true;
          await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
        } else if (url.pathname.endsWith('/api/schedule') && method === 'GET') {
          const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(monday);
            d.setUTCDate(monday.getUTCDate() + i);
            const dateStr = toDateStr(d);
            return {
              date: dateStr,
              status: dateStr === today && validateCalled ? 3 : 0,
              recipe: dateStr === today && !validateCalled ? lasagnaRecipe : null,
            };
          });
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: { weekOffset: 0, days } }),
          });
        } else {
          await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
        }
      }
    );

    await page.goto('/home');
    await expect(page.getByTestId('home-loader')).not.toBeVisible();
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible();

    // Flip the card and click skip
    await page.getByTestId('tonight-menu-card').click();
    await expect(page.getByTestId('skip-tonight-btn')).toBeVisible();
    await page.getByTestId('skip-tonight-btn').dispatchEvent('click');

    await expect(page.getByTestId('recovery-dialog-title')).toBeVisible();

    // Click "Ordering In" → step 2
    await page.getByTestId('recovery-action-order-in').click();
    await expect(page.getByText("What about tonight's recipe?")).toBeVisible();

    // Click "Just Drop Tonight"
    await page.getByText('Just Drop Tonight').click();

    // Ordered-in validation must be called
    await expect.poll(() => validateCalled).toBe(true);

    // Dialog must be closed
    await expect(page.getByTestId('recovery-dialog-title')).not.toBeVisible();

    // Flow exits to planner with tonight marked ordered in
    await expect(page).toHaveURL(/\/planner/);
    await expect(page.getByTestId('ordered-in-indicator')).toBeVisible({ timeout: 3000 });
  });

  test('Closing Quick Find after "Pick Something Else" exits without changing tonight', async ({
    page,
  }) => {
    const monday = currentMonday();
    const today = toDateStr(monday);

    const lasagnaRecipe = builders.scheduleRecipe({
      id: MOCK_IDS.RECIPE_LASAGNA,
      name: 'Test Lasagna',
      image: `/api/recipes/${MOCK_IDS.RECIPE_LASAGNA}/hero`,
    });

    let moveCalled = false;
    let assignCalled = false;

    await mockSseWithSlotUpdate(page, { date: today, recipe: lasagnaRecipe, status: 0 });

    await page.route(
      (url) => url.pathname.includes('/api/schedule'),
      async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        const method = request.method();

        if (url.pathname.endsWith('/fill-the-gap')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: [
                builders.scheduleRecipe({
                  id: MOCK_IDS.RECIPE_CHICKEN,
                  name: 'Test Chicken',
                  image: '/chicken.jpg',
                }),
              ],
            }),
          });
        } else if (url.pathname.endsWith('/move') && method === 'POST') {
          moveCalled = true;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true }),
          });
        } else if (url.pathname.endsWith('/assign') && method === 'POST') {
          assignCalled = true;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true }),
          });
        } else if (url.pathname.endsWith('/api/schedule') && method === 'GET') {
          const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(monday);
            d.setUTCDate(monday.getUTCDate() + i);
            const dateStr = toDateStr(d);
            return {
              date: dateStr,
              status: 0,
              recipe: dateStr === today ? lasagnaRecipe : null,
            };
          });
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: { weekOffset: 0, days } }),
          });
        } else {
          await route.continue();
        }
      }
    );

    await page.goto('/home');
    await expect(page.getByTestId('home-loader')).not.toBeVisible();
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Test Lasagna' }).first()).toBeVisible();

    await page.getByTestId('tonight-menu-card').click();
    await expect(page.getByTestId('skip-tonight-btn')).toBeVisible();
    await page.getByTestId('skip-tonight-btn').dispatchEvent('click');

    await page.getByTestId('recovery-action-pick-else').click();

    await expect(page.getByTestId('recovery-dialog-title')).not.toBeVisible();
    await expect(page.getByTestId('quick-find-modal')).toBeVisible();

    await page.getByTestId('quick-find-close').click();

    await expect(page.getByTestId('quick-find-modal')).not.toBeVisible();
    await expect(page.getByTestId('recovery-dialog-title')).not.toBeVisible();
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Test Lasagna' }).first()).toBeVisible();
    expect(moveCalled).toBe(false);
    expect(assignCalled).toBe(false);
  });

  // B5 + reload: page reload after "Order In" (no recipe) does not show pivot card
  test('Page reload after "Order In" (no recipe) does not show pivot card', async ({ page }) => {
    const monday = currentMonday();
    const today = toDateStr(monday);

    // Track whether "Order In" has been tapped so we can switch the schedule response
    let orderInDone = false;

    await page.route(
      (url) => url.pathname.includes('/api/schedule'),
      async (route) => {
        const reqUrl = new URL(route.request().url());
        if (reqUrl.searchParams.get('weekOffset') === '0' && route.request().method() === 'GET') {
          if (!orderInDone) {
            // Before "Order In": empty schedule
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({ data: { weekOffset: 0, days: [] } }),
            });
          } else {
            // After "Order In": return status:3 for today (simulates server state after write)
            const days = Array.from({ length: 7 }, (_, i) => {
              const d = new Date(monday);
              d.setUTCDate(monday.getUTCDate() + i);
              const dateStr = toDateStr(d);
              return { date: dateStr, status: dateStr === today ? 3 : 0, recipe: null };
            });
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({ data: { weekOffset: 0, days } }),
            });
          }
        } else {
          await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
        }
      }
    );

    await page.route(
      (url) => url.pathname.includes('/api/schedule/day/') && url.pathname.endsWith('/validate'),
      async (route) => {
        orderInDone = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
    );

    await page.goto('/home');

    // Wait for loader to clear, then pivot card should be visible (empty schedule, no recipe)
    await expect(page.getByTestId('home-loader')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('tonight-pivot-card')).toBeVisible();

    // Tap "Order In" with no recipe
    await page.getByTestId('order-in-btn').click();
    await expect(page.getByTestId('tonight-pivot-card')).not.toBeVisible({ timeout: 3000 });

    // Override the SSE route to send status:3 for today before reload.
    // Without this, the SSE `connected` event fires with status:0 on reconnect,
    // racing against the schedule GET (which returns status:3) and potentially
    // resetting todayStore.status back to 0 — causing the pivot card to reappear.
    await page.route(/\/(?:backend\/)?api\/stream/, async (route) => {
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setUTCDate(monday.getUTCDate() + i);
        const dateStr = toDateStr(d);
        return {
          day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
          date: dateStr,
          recipe: null,
          status: dateStr === today ? 3 : 0,
        };
      });
      const body = `event: connected\ndata: ${JSON.stringify({ type: 'connected', schedule: { weekOffset: 0, locked: false, status: 0, days } })}\n\n`;
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        headers: {
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
        body,
      });
    });

    // Reload — server now returns status:3 for today
    await page.reload();
    await expect(page.getByTestId('home-loader')).not.toBeVisible({ timeout: 5000 });

    // Pivot card must NOT reappear after reload
    await expect(page.getByTestId('tonight-pivot-card')).not.toBeVisible();
  });

  test('Quick Find from pivot card shows TonightMenuCard immediately and calls assign API', async ({
    page,
  }) => {
    // Override fill-the-gap to return one recipe
    await page.route(
      (url) => url.pathname.includes('/api/schedule/fill-the-gap'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [{ id: MOCK_IDS.RECIPE_LASAGNA, name: 'Test Lasagna', image: '' }],
          }),
        });
      }
    );

    // 2. Track assign call
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

    // 3. Mock recipe detail fetch (triggered by eager hydration)
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
              name: 'Test Lasagna',
              description: 'Quick Hydrated Description',
              ingredients: ['Pasta'],
            }),
          }),
        });
      }
    );

    await page.goto('/home');
    await expect(page.getByTestId('tonight-pivot-card')).toBeVisible({ timeout: 5000 });

    // Click Quick Find (discover-btn)
    await page.getByTestId('discover-btn').click();

    // Wait for quick-find-modal
    await expect(page.getByTestId('quick-find-modal')).toBeVisible({ timeout: 3000 });

    // Click the first recipe (quick-find-select)
    await page.getByTestId('quick-find-select').first().click();

    // TonightMenuCard must appear immediately (optimistic — within 300ms)
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible({ timeout: 300 });

    // Assign API must have been called
    await expect.poll(() => assignCalled).toBe(true);

    // Verify Hydration: flip the card and check for the description
    await page.getByTestId('tonight-menu-card').click();
    await expect(page.getByText('Quick Hydrated Description')).toBeVisible({ timeout: 5000 });
    expect(recipeFetched).toBe(true);
  });

  test('Completing Cook Mode marks meal as cooked', async ({ page }) => {
    const monday = currentMonday();
    const today = toDateStr(monday);
    const lasagnaRecipe = builders.scheduleRecipe({
      id: MOCK_IDS.RECIPE_LASAGNA,
      name: 'Test Lasagna',
    });

    // Override SSE to seed todayStore with the recipe — prevents the race between
    // SSE (empty schedule) and sync() (GET schedule) from hiding the menu card.
    await mockSseWithSlotUpdate(page, { date: today, recipe: lasagnaRecipe, status: 0 });

    // 1. Mock schedule with planned recipe
    await page.route(
      (url) => url.pathname.includes('/api/schedule'),
      async (route) => {
        if (route.request().method() === 'GET') {
          const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(monday);
            d.setUTCDate(monday.getUTCDate() + i);
            const dateStr = toDateStr(d);

            return {
              date: dateStr,
              status: 0,
              recipe: lasagnaRecipe,
            };
          });

          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: { weekOffset: 0, days } }),
          });
        } else {
          await route.continue();
        }
      }
    );

    // 2. Mock validation API
    let validateCalled = false;
    await page.route(
      (url) => url.pathname.includes('/api/schedule/day/') && url.pathname.endsWith('/validate'),
      async (route) => {
        validateCalled = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
    );

    await page.goto('/home');
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible({ timeout: 10_000 });
    // Flip card to reveal back face; use dispatchEvent to bypass pointer-events-none.
    await page.getByTestId('tonight-menu-card').click();
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="cook-mode-btn"]') as HTMLElement;
      btn?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    // Step through Cook's Mode
    const nextBtn = page.getByTestId('cooks-mode-step-next');
    await expect(nextBtn).toBeVisible({ timeout: 15_000 });

    // Click Next until "Done"
    for (let i = 0; i < 5; i++) {
      const text = await nextBtn.textContent();
      if (text?.toLowerCase().includes('done')) break;
      await nextBtn.click();
    }

    await nextBtn.click(); // Click "Done"

    // Verify implicit cooked call
    await expect.poll(() => validateCalled).toBe(true);

    // Verify Success Card
    await expect(page.getByTestId('cooked-success-card')).toBeVisible();
  });
});

// ── Group C: todayStore integration ──────────────────────────────────────────

test.describe('Home Command Center — Planner → todayStore propagation (Group C)', () => {
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

  // C7: Page reload after "Order In" does not show pivot card (already covered in B5 reload test above)
  // This test confirms the same behaviour holds after the todayStore refactor.
  test('Page reload after "Order In" (no recipe) does not show pivot card — post-todayStore refactor', async ({
    page,
  }) => {
    const monday = currentMonday();
    const today = toDateStr(monday);
    let orderInDone = false;

    await page.route(
      (url) => url.pathname.includes('/api/schedule'),
      async (route) => {
        const reqUrl = new URL(route.request().url());
        if (reqUrl.searchParams.get('weekOffset') === '0' && route.request().method() === 'GET') {
          if (!orderInDone) {
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
              return { date: dateStr, status: dateStr === today ? 3 : 0, recipe: null };
            });
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({ data: { weekOffset: 0, days } }),
            });
          }
        } else {
          await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
        }
      }
    );

    await page.route(
      (url) => url.pathname.includes('/api/schedule/day/') && url.pathname.endsWith('/validate'),
      async (route) => {
        orderInDone = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
    );

    await page.goto('/home');
    await expect(page.getByTestId('home-loader')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('tonight-pivot-card')).toBeVisible();

    await page.getByTestId('order-in-btn').click();
    await expect(page.getByTestId('tonight-pivot-card')).not.toBeVisible({ timeout: 3000 });

    // Override the SSE route to send status:3 for today before reload.
    // Without this, the SSE `connected` event races against the GET schedule response,
    // and the status:0 from SSE can reset todayStore, causing the pivot card to reappear.
    await page.route(/\/(?:backend\/)?api\/stream/, async (route) => {
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setUTCDate(monday.getUTCDate() + i);
        const dateStr = toDateStr(d);
        return {
          day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
          date: dateStr,
          recipe: null,
          status: dateStr === today ? 3 : 0,
        };
      });
      const body = `event: connected\ndata: ${JSON.stringify({ type: 'connected', schedule: { weekOffset: 0, locked: false, status: 0, days } })}\n\n`;
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        headers: {
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
        body,
      });
    });

    // Reload — server returns status:3 for today
    await page.reload();
    await expect(page.getByTestId('home-loader')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('tonight-pivot-card')).not.toBeVisible();
  });
});
