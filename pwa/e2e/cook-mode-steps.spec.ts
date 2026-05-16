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

// The first step text from RECIPE_SPAGHETTI's first HowToSection
const FIRST_STEP_TEXT = 'Bring a large pot of salted water to a boil';

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
        await route.continue();
      }
    });
  });

  // ── Test 1: Home page Cook Mode shows real HowToSection steps ──────────────

  test('Home page Cook Mode shows real recipe steps for HowToSection[] recipe', async ({
    page,
  }) => {
    // Override the default schedule mock to return RECIPE_SPAGHETTI for today.
    // Use includes() to match regardless of path prefix (the app may use /api/api/schedule).
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
          await route.continue();
        }
      }
    );

    // Navigate to home and wait for the menu card (today has a planned recipe)
    await page.goto('/home');
    await expect(page.getByTestId('home-loader')).not.toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible({ timeout: 10_000 });

    // Flip the card to reveal the back face (cook-mode-btn is on the back).
    // Use dispatchEvent to bypass pointer-events-none on the pre-flip front face.
    await page.getByTestId('tonight-menu-card').click();
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="cook-mode-btn"]') as HTMLElement;
      btn?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    await expect(page.getByTestId('cooks-mode-step-next')).toBeVisible({ timeout: 15_000 });

    // Advance past the ingredients screen (step 0)
    await page.getByTestId('cooks-mode-step-next').click();

    // Real step text must be visible — proves HowToSection[] steps are parsed correctly
    await expect(page.getByText(FIRST_STEP_TEXT).first()).toBeVisible({ timeout: 5_000 });
  });

  // ── Test 2: Planner Cook Mode shows real HowToSection steps ───────────────

  test('Planner Cook Mode shows real recipe steps for HowToSection[] recipe', async ({ page }) => {
    // Override the schedule mock for the planner (handles both main and smart-defaults endpoints)
    await page.route(
      (url) => url.pathname.includes('/api/schedule'),
      async (route) => {
        const reqUrl = route.request().url();
        const method = route.request().method();

        if (method !== 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: { message: 'ok' } }),
          });
          return;
        }

        if (reqUrl.includes('smart-defaults')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                weekOffset: 0,
                familySize: 2,
                consensusThreshold: 2,
                preSelectedRecipes: [],
                openSlots: [],
                consensusRecipesCount: 0,
                isVotingOpen: false,
              },
            }),
          });
          return;
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(buildSpaghettiSchedule()),
        });
      }
    );

    // Navigate to planner and wait for day cards to load
    await page.goto('/planner');
    await expect(page.getByTestId('day-card-0')).toBeVisible({ timeout: 10_000 });

    // Monday (day-card-0) has RECIPE_SPAGHETTI — click start-cook-mode
    const mondayCard = page.getByTestId('day-card-0');
    await expect(mondayCard.getByTestId('start-cook-mode')).toBeVisible({ timeout: 5_000 });
    await mondayCard.getByTestId('start-cook-mode').click();

    // Cook's Mode must open
    await expect(page.getByTestId('cooks-mode-step-next')).toBeVisible({ timeout: 5_000 });

    // Advance past the ingredients screen
    await page.getByTestId('cooks-mode-step-next').click();

    // Real step text must be visible
    await expect(page.getByText(FIRST_STEP_TEXT).first()).toBeVisible({ timeout: 5_000 });
  });
});

// ── Task 43: Cook's Mode UX guard tests ──────────────────────────────────────
//
// These tests guard the Mère-Designer redesign tasks (45, 46, 50). They will
// fail until those tasks are implemented and pass once they are. Do not skip
// them — they are the acceptance criteria for the redesign.

test.describe("Cook's Mode — UX redesign guard tests (Tasks 45, 46, 50)", () => {
  test.beforeEach(async ({ page }) => {
    // Pin the browser clock to the fixed test Monday so getTodayString() matches
    // the schedule mock date (2026-05-04). Without this, start-cook-mode is not
    // shown and currentRecipe is null (server returns a different day's recipe).
    await page.clock.setFixedTime(new Date('2026-05-04T12:00:00Z'));

    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);

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
        await route.continue();
      }
    });

    // Override schedule to return RECIPE_SPAGHETTI for today
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
          await route.continue();
        }
      }
    );

    // Override the SSE stream to emit slot_updated for 2026-05-04 so that todayStore
    // picks up the recipe even though the home page server component can't be intercepted.
    const spaghettiScheduleRecipe = builders.scheduleRecipe({
      id: MOCK_IDS.RECIPE_SPAGHETTI,
      name: 'Spaghetti with Toasted Garlic Bread',
    });
    await page.route(/\/(?:backend\/)?api\/stream/, async (route) => {
      const connected = `event: connected\ndata: ${JSON.stringify({ type: 'connected', schedule: buildSpaghettiSchedule().data })}\n\n`;
      const slotUpdated = `event: slot_updated\ndata: ${JSON.stringify({ type: 'slot_updated', date: '2026-05-04', recipe: spaghettiScheduleRecipe, status: 0 })}\n\n`;
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
  });

  /**
   * Task 45 guard — Ingredient checklist is interactive.
   * Tapping an ingredient row toggles its checked state. Tapping again unchecks it.
   * The ingredient must show a checked visual (CheckCircle2 filled, bg-sage) when tapped.
   */
  test('ingredient checklist is interactive — tap to check, tap again to uncheck', async ({
    page,
  }) => {
    await page.goto('/home');
    await expect(page.getByTestId('home-loader')).not.toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible({ timeout: 10_000 });

    // Flip card to reveal back face; use dispatchEvent to bypass pointer-events-none.
    await page.getByTestId('tonight-menu-card').click();
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="cook-mode-btn"]') as HTMLElement;
      btn?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    await expect(page.getByTestId('cooks-mode-step-next')).toBeVisible({ timeout: 15_000 });

    // Card 0 is the ingredient checklist — find the first ingredient toggle button
    const firstIngredient = page.getByTestId('ingredient-toggle').first();
    await expect(firstIngredient).toBeVisible({ timeout: 5_000 });

    // Initially unchecked
    await expect(firstIngredient).not.toHaveClass(/bg-sage/);

    // Tap to check
    await firstIngredient.click();
    await expect(firstIngredient).toHaveClass(/bg-sage/, { timeout: 2_000 });

    // Tap again to uncheck
    await firstIngredient.click();
    await expect(firstIngredient).not.toHaveClass(/bg-sage/, { timeout: 2_000 });
  });

  /**
   * Task 46 guard — Dietary badge must NOT be present on Card 0.
   * The "Plant-Powered Choice!" / "Healthy Pick!" Sparkles badge was removed
   * as redundant noise. Verify it is absent from the ingredient screen.
   */
  test('dietary badge (Plant-Powered / Healthy Pick) is NOT present on Card 0', async ({
    page,
  }) => {
    await page.goto('/home');
    await expect(page.getByTestId('home-loader')).not.toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible({ timeout: 10_000 });

    // Flip card to reveal back face; use dispatchEvent to bypass pointer-events-none.
    await page.getByTestId('tonight-menu-card').click();
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="cook-mode-btn"]') as HTMLElement;
      btn?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    await expect(page.getByTestId('cooks-mode-step-next')).toBeVisible({ timeout: 15_000 });

    // The dietary badge text must not be present anywhere in the overlay
    await expect(page.getByText('Plant-Powered Choice!')).not.toBeVisible();
    await expect(page.getByText('Healthy Pick!')).not.toBeVisible();
  });

  /**
   * Task 45 guard — "Let's Cook →" CTA on Card 0.
   * The Next button on the ingredient checklist card (step 0) must read
   * "Let's Cook →" instead of the generic "Next →".
   */
  test('"Let\'s Cook →" CTA is shown on Card 0 (ingredient checklist)', async ({ page }) => {
    await page.goto('/home');
    await expect(page.getByTestId('home-loader')).not.toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible({ timeout: 10_000 });

    // Flip card to reveal back face; use dispatchEvent to bypass pointer-events-none.
    await page.getByTestId('tonight-menu-card').click();
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="cook-mode-btn"]') as HTMLElement;
      btn?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    await expect(page.getByTestId('cooks-mode-step-next')).toBeVisible({ timeout: 15_000 });

    // The next button on step 0 must say "Let's Cook" (not "Next")
    await expect(page.getByTestId('cooks-mode-step-next')).toContainText("Let's Cook");
  });

  /**
   * Task 50 guard — Done → celebration moment visible before redirect.
   * Completing the last step must show a "Supper's done!" celebration overlay
   * briefly before navigating to /home. The overlay must be visible at the
   * moment the Done button is tapped.
   */
  test('Done → "Supper\'s done!" celebration moment visible before redirect', async ({ page }) => {
    await page.goto('/home');
    await expect(page.getByTestId('home-loader')).not.toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible({ timeout: 10_000 });

    // Flip card to reveal back face; use dispatchEvent to bypass pointer-events-none.
    await page.getByTestId('tonight-menu-card').click();
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="cook-mode-btn"]') as HTMLElement;
      btn?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    await expect(page.getByTestId('cooks-mode-step-next')).toBeVisible({ timeout: 15_000 });

    // Step through all steps until we reach the last one (Done button)
    // The spaghetti recipe has multiple steps — keep clicking Next until Done appears
    let isDone = false;
    for (let i = 0; i < 20; i++) {
      const nextBtn = page.getByTestId('cooks-mode-step-next');
      const label = await nextBtn.textContent();
      if (label?.toLowerCase().includes('done')) {
        isDone = true;
        break;
      }
      await nextBtn.click();
      await page.waitForTimeout(200);
    }
    expect(isDone).toBe(true);

    // Tap Done — celebration overlay must appear
    await page.getByTestId('cooks-mode-step-next').click();

    // "Supper's done!" text must be visible before navigation completes
    await expect(page.getByText("Supper's done!")).toBeVisible({ timeout: 2_000 });

    // After the celebration (600ms), navigation to /home occurs
    await expect(page).toHaveURL(/\/home/, { timeout: 5_000 });
  });
});
