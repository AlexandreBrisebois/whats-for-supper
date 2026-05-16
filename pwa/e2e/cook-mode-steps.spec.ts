/**
 * E2E tests verifying Cook's Mode displays real recipe steps (not just the
 * ingredients screen) when the recipe has HowToSection[] instructions.
 *
 * Regression guard for: cook-mode-steps-display bugfix
 * Requirements: 2.2, 3.4
 *
 * Task 43 additions: ingredient checklist interactivity (Task 45), dietary
 * badge removal (Task 46), "Let's Cook →" CTA (Task 45), and Done celebration
 * moment (Task 50).
 *
 * All date logic uses currentMonday() / toDateStr() from mock-api.ts, which
 * pins to the fixed test date (2026-05-04, Monday). Never use new Date() here.
 */
import { test, expect } from './fixtures';
import { MOCK_IDS, builders, setupCommonRoutes, currentMonday, toDateStr } from './mock-api';
import { REALISTIC_RECIPES } from '../src/testing/realistic-recipes';

/**
 * Build a 7-day schedule response with RECIPE_SPAGHETTI on Monday (the fixed test date).
 * Uses currentMonday() / toDateStr() — never new Date() — so the date is always stable.
 */
function buildSpaghettiSchedule() {
  const monday = currentMonday();
  // Uses the pinned test Monday (2026-05-04). Tests that use this function must
  // call page.clock.setFixedTime('2026-05-04T12:00:00Z') so getTodayString() matches.
  const todayStr = toDateStr(monday);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    const dateStr = toDateStr(d);
    return {
      day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      date: dateStr,
      recipe:
        dateStr === todayStr
          ? builders.scheduleRecipe({
              id: MOCK_IDS.RECIPE_SPAGHETTI,
              name: 'Spaghetti with Toasted Garlic Bread',
            })
          : null,
      status: 0,
    };
  });
  return {
    data: {
      weekOffset: 0,
      locked: false,
      status: 0,
      days,
    },
  };
}

test.describe('Cook Mode — HowToSection[] steps display', () => {
  test.beforeEach(async ({ page }) => {
    // Pin the browser clock to the fixed test Monday so getTodayString() matches
    // the date used in buildSpaghettiSchedule() — 2026-05-04 (Monday).
    await page.clock.setFixedTime(new Date('2026-05-04T12:00:00Z'));

    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);

    // Seed localStorage with the selected family member before any navigation
    await page.addInitScript((id) => {
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

    await setupCommonRoutes(page);

    // Override the SSE stream to emit a slot_updated event for 2026-05-04 (today in the
    // pinned clock). This updates todayStore.currentRecipe, which the home page server
    // component cannot set (server-side fetches are not intercepted by page.route()).
    // Registered AFTER setupCommonRoutes so LIFO gives this handler priority.
    const spaghettiRecipe = builders.scheduleRecipe({
      id: MOCK_IDS.RECIPE_SPAGHETTI,
      name: 'Spaghetti with Toasted Garlic Bread',
    });
    await page.route(/\/(?:backend\/)?api\/stream/, async (route) => {
      const connected = `event: connected\ndata: ${JSON.stringify({ type: 'connected', schedule: { weekOffset: 0, locked: false, status: 0, days: buildSpaghettiSchedule().data.days } })}\n\n`;
      const slotUpdated = `event: slot_updated\ndata: ${JSON.stringify({ type: 'slot_updated', date: '2026-05-04', recipe: spaghettiRecipe, status: 0 })}\n\n`;
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        headers: {
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
        body: connected + slotUpdated,
      });
    });

    // Register the spaghetti recipe detail override AFTER setupCommonRoutes so LIFO
    // gives this handler priority over the default **/api/recipes/* wildcard.
    await page.route('**/api/recipes/*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ recipe: REALISTIC_RECIPES[MOCK_IDS.RECIPE_SPAGHETTI] }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { message: 'ok' } }),
        });
      }
    });
  });

  // HowToSection[] step parsing (home + planner entry points) is covered by
  // CooksMode.test.tsx. Only the Done → celebration → /home navigation seam
  // requires a real browser.

  // ── Done → celebration → /home navigation seam ──────────────────────────

  test('completing all steps shows celebration overlay then navigates to /home', async ({
    page,
  }) => {
    await page.route(
      (url) => url.pathname.includes('/api/schedule') && !url.pathname.includes('smart-defaults'),
      async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(buildSpaghettiSchedule()),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: { message: 'ok' } }),
          });
        }
      }
    );

    await page.goto('/home');
    await expect(page.getByTestId('home-loader')).not.toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible({ timeout: 10_000 });

    await page.getByTestId('tonight-menu-card').click();
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="cook-mode-btn"]') as HTMLElement;
      btn?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    await expect(page.getByTestId('cooks-mode-step-next')).toBeVisible({ timeout: 15_000 });

    // Step through all steps until Done appears
    let isDone = false;
    for (let i = 0; i < 20; i++) {
      const nextBtn = page.getByTestId('cooks-mode-step-next');
      const label = await nextBtn.textContent();
      if (label?.toLowerCase().includes('done')) {
        isDone = true;
        break;
      }
      await nextBtn.click();
      await expect(nextBtn).toBeVisible();
    }
    expect(isDone).toBe(true);

    await page.getByTestId('cooks-mode-step-next').click();

    await expect(page.getByTestId('cooks-mode-celebration')).toBeVisible({ timeout: 2_000 });
    await expect(page).toHaveURL(/\/home/, { timeout: 5_000 });
  });
});
