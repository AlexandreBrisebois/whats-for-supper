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
    // 1. Mock schedule with a planned recipe for today
    await page.route(
      (url) => url.pathname.includes('/api/schedule') && url.searchParams.get('weekOffset') === '0',
      async (route) => {
        if (route.request().method() === 'GET') {
          const monday = currentMonday();
          // Use builders to ensure contract compliance
          const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(monday);
            d.setUTCDate(monday.getUTCDate() + i);
            const dateStr = toDateStr(d);

            return {
              date: dateStr,
              status: 0,
              recipe: builders.scheduleRecipe({
                id: MOCK_IDS.RECIPE_LASAGNA,
                name: 'Test Lasagna',
                image: `/api/recipes/${MOCK_IDS.RECIPE_LASAGNA}/hero`,
              }),
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
    await page.route(
      (url) => url.pathname.includes('/api/schedule'),
      async (route) => {
        const reqUrl = new URL(route.request().url());
        if (reqUrl.searchParams.get('weekOffset') === '0' && route.request().method() === 'GET') {
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
                      name: 'Test Lasagna',
                    })
                  : null,
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

    // Wait for flip animation to complete, then click skip
    await page.waitForTimeout(600);
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="skip-tonight-btn"]') as HTMLElement;
      btn?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    // Recovery dialog must open
    await expect(page.getByTestId('recovery-dialog-title')).toBeVisible();

    // No backend write yet
    expect(validateCalled).toBe(false);
  });

  test('"Pick Something Else" flow opens Quick Find then Step 2', async ({ page }) => {
    const monday = currentMonday();
    const today = toDateStr(monday);

    let moveCalled = false;
    let assignCalled = false;

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
              recipe: builders.scheduleRecipe({
                id: MOCK_IDS.RECIPE_LASAGNA,
                name: 'Test Lasagna',
              }),
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
    await page.waitForTimeout(600);
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="skip-tonight-btn"]') as HTMLElement;
      btn?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

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

    // Verify both APIs called
    await expect.poll(() => moveCalled).toBe(true);
    await expect.poll(() => assignCalled).toBe(true);

    // Dialog should be closed
    await expect(page.getByTestId('recovery-dialog-title')).not.toBeVisible();
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

    // Track assign call
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
  });

  test('Completing Cook Mode marks meal as cooked', async ({ page }) => {
    // 1. Mock schedule with planned recipe
    await page.route(
      (url) => url.pathname.includes('/api/schedule'),
      async (route) => {
        if (route.request().method() === 'GET') {
          const monday = currentMonday();
          const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(monday);
            d.setUTCDate(monday.getUTCDate() + i);
            const dateStr = toDateStr(d);

            return {
              date: dateStr,
              status: 0,
              recipe: builders.scheduleRecipe({
                id: MOCK_IDS.RECIPE_LASAGNA,
                name: 'Test Lasagna',
              }),
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
    await page.getByTestId('tonight-menu-card').click();
    await page.getByTestId('cook-mode-btn').click();

    // Step through Cook's Mode
    const nextBtn = page.getByTestId('cooks-mode-step-next');

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

  // C7: Planner Quick Find for today → navigating to home shows TonightMenuCard
  // SSE makes this deterministic: the `slot_updated` event is baked into the mock SSE
  // body and fires immediately on connect. By the time the user navigates to /home,
  // todayStore already has the recipe — no poll, no sync() race.
  test("Planner Quick Find for today's slot → navigating to home shows TonightMenuCard", async ({
    page,
  }) => {
    const monday = currentMonday();
    const today = toDateStr(monday);

    const recipe = builders.scheduleRecipe({
      id: MOCK_IDS.RECIPE_LASAGNA,
      name: 'Test Lasagna',
      image: '',
    });

    // SSE mock: emit connected (empty schedule) + slot_updated for today with the recipe.
    // Registered before setupCommonRoutes so LIFO gives this mock priority over the
    // default SSE route. The slot_updated event fires immediately on connect — before
    // the user even navigates to /home — so todayStore is populated on arrival.
    await mockSseWithSlotUpdate(page, { date: today, recipe, status: 0 });

    // Override fill-the-gap to return one recipe for the Quick Find modal
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

    // Track assign call — confirms the REST write fired
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

    // 1. Navigate to /planner, wait for day-card-0
    await page.goto('/planner');
    await expect(page.getByTestId('day-card-0')).toBeVisible({ timeout: 10_000 });

    // 2. Find today's card, click plan-meal-button
    const todayCard = page.locator(`[data-date="${today}"]`);
    await todayCard.getByTestId('plan-meal-button').click();

    // 3. Wait for pivot-sheet, click pivot-quick-find
    await expect(page.getByTestId('pivot-sheet')).toBeVisible({ timeout: 3000 });
    await page.getByTestId('pivot-quick-find').click();

    // 4. Wait for quick-find-modal, click quick-find-select
    await expect(page.getByTestId('quick-find-modal')).toBeVisible({ timeout: 3000 });
    await page.getByTestId('quick-find-select').first().click();

    // 5. Confirm the assign REST call fired
    await expect.poll(() => assignCalled).toBe(true);

    // 6. Navigate to /home — SSE already delivered slot_updated, store is populated
    await page.goto('/home');

    // 7. Wait for home-loader to disappear
    await expect(page.getByTestId('home-loader')).not.toBeVisible({ timeout: 5000 });

    // 8. TonightMenuCard must be visible — driven by SSE, not by sync() or a poll
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible({ timeout: 5000 });

    // 9. Assert recipe name visible
    await expect(page.getByText('Test Lasagna').first()).toBeVisible();
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

    // Reload — server returns status:3 for today
    await page.reload();
    await expect(page.getByTestId('home-loader')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('tonight-pivot-card')).not.toBeVisible();
  });
});
