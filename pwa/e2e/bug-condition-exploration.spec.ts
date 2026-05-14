/**
 * Bug Condition Exploration Tests
 *
 * These tests encode the EXPECTED behavior for each of the three bugs.
 * They MUST FAIL on unfixed code — failure is the proof the bugs exist.
 * They will PASS after the fixes in Task 3 are applied.
 *
 * Bug Condition A: isBugConditionA = setupMatcher is string (glob) AND testMatcher is function (predicate)
 * Bug Condition B: isBugConditionB = cookieInjectedAt = 'after-module-load' AND localStorageSeeded = false
 * Bug Condition C: isBugConditionC = onSuccess = true AND isGoto = true
 *
 * ---------------------------------------------------------------------------
 * FAILURE OUTPUT (documented after running on unfixed code — see Task 1)
 * ---------------------------------------------------------------------------
 *
 * [Bug A] "per-test settings handler wins over setupCommonRoutes glob (LIFO)"
 *   Expected: getByText(/your goto is being prepared/i) to be visible
 *   Actual:   Timed out — the glob handler in setupCommonRoutes intercepts
 *             GET /api/goto and returns { items: [] }
 *             instead of the per-test handler's stored value, so the GOTO success
 *             screen never renders correctly.
 *
 * [Bug B] "page stays on /home when cookie is set without addInitScript"
 *   Expected: page.url() to contain /home
 *   Actual:   page.url() contains /onboarding — familyStore.selectedFamilyMemberId
 *             is null at module-load time (cookie injected too late), so
 *             IdentityValidator redirects to /onboarding.
 *
 * [Bug C] "GOTO success screen stays visible until user clicks Back to Settings"
 *   Expected: getByText(/your goto is being prepared/i) to be visible
 *   Actual:   Timed out — MinimalCapture's useEffect fires immediately when
 *             onSuccess=true && isGoto=true, calling router.push(ROUTES.PROFILE_SETTINGS)
 *             before the assertion can find the element.
 * ---------------------------------------------------------------------------
 */

import path from 'path';
import { test, expect } from './fixtures';
import { MOCK_IDS, builders, setupCommonRoutes } from './mock-api';

const FIXTURE_IMAGE = path.join(__dirname, 'fixtures', 'test-meal.jpg');

// ---------------------------------------------------------------------------
// Bug Condition A — Glob/Predicate LIFO Bypass
//
// isBugConditionA: setupMatcher is string (glob) AND testMatcher is function (predicate)
//
// setupCommonRoutes registers '**/api/settings/*' (glob).
// The per-test beforeEach registers (url) => url.pathname.includes('/api/settings/') (predicate).
// Playwright resolves cross-type matchers FIFO (not LIFO), so the glob handler always wins.
// The per-test settingsStore closure is never reached.
//
// EXPECTED (correct) behavior: per-test handler wins (LIFO), gotoItems stores the PUT value,
// and the GOTO success screen is visible.
// ACTUAL (buggy) behavior: glob handler wins (FIFO), gotoItems is never written,
// GET /api/goto returns empty, success screen never shows.
// ---------------------------------------------------------------------------

test.describe('Bug Condition A — Glob/Predicate LIFO Bypass', () => {
  test.beforeEach(async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';

    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);

    await page.addInitScript((id) => {
      localStorage.setItem(
        'family-storage',
        JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 })
      );
    }, MOCK_IDS.MEMBER_ALEX);

    // Step 1: Register setupCommonRoutes — this registers '**/api/goto' (glob)
    await setupCommonRoutes(page);

    // Step 2: Register per-test GOTO handler using a PREDICATE matcher (Bug Condition A)
    // On unfixed code: Playwright resolves FIFO for cross-type matchers → glob wins → this handler never fires
    let gotoItems: any[] = [];
    await page.route(
      (url) => url.pathname.includes('/api/goto'),
      async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ items: gotoItems }),
          });
        } else {
          const body = route.request().postDataJSON();
          gotoItems = body.items || [];
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(body),
          });
        }
      }
    );

    // POST /api/recipes/describe — use glob so Bug A doesn't interfere with describe endpoint
    await page.route('**/api/recipes/describe', async (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON() as { name?: string };
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: builders.recipe({
              id: MOCK_IDS.RECIPE_GOTO_STUB,
              name: body?.name ?? 'Described Recipe',
              imageUrl: null,
            }),
          }),
        });
      } else {
        await route.continue();
      }
    });
  });

  /**
   * Validates: Bug Condition A
   *
   * After setupCommonRoutes (glob) and per-test predicate handler are both registered,
   * completing the describe-it GOTO flow should show the success screen.
   *
   * FAILS on unfixed code because:
   *   - The glob handler intercepts PUT /api/goto (gotoItems never written)
   *   - The glob handler intercepts GET /api/goto and returns empty list
   *   - The component cannot confirm the GOTO was saved, so the success screen may not render
   *     correctly, OR the success screen renders but the useEffect navigates away (Bug C also
   *     present)
   *
   * PASSES after Fix A: per-test glob handler wins via LIFO, settingsStore is written,
   * success screen is visible.
   */
  test('per-test settings handler wins over setupCommonRoutes glob (LIFO)', async ({ page }) => {
    await page.goto('/capture?intent=goto');

    // Open the describe form
    await page.getByRole('button', { name: /or describe it instead/i }).click();

    // Fill in the recipe name
    await page.getByPlaceholder(/our family spaghetti/i).fill('Our family spaghetti');

    // Track the GOTO PUT to confirm it was called
    const settingsRequest = page.waitForRequest(
      (req) => req.url().includes('/api/goto') && req.method() === 'PUT'
    );

    await page.getByRole('button', { name: /synthesize recipe/i }).click();

    // Wait for the GOTO PUT to complete
    await settingsRequest;

    // EXPECTED (correct): per-test handler stored the value, success screen is visible
    // ACTUAL (buggy): glob handler intercepted, per-test handler never fired,
    //   success screen may not render or useEffect navigates away immediately
    await expect(page.getByText(/your goto is being prepared/i)).toBeVisible({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// Bug Condition B — Cookie Timing
//
// isBugConditionB: cookieInjectedAt = 'after-module-load' AND localStorageSeeded = false
//
// familyStore initializes selectedFamilyMemberId from getFamilyMemberIdCookie() at module-load
// time. addCookies in beforeEach injects the cookie AFTER module evaluation. Store starts with
// null, IdentityValidator redirects to /onboarding.
//
// EXPECTED (correct) behavior: page stays on /home (identity is recognized).
// ACTUAL (buggy) behavior: page redirects to /onboarding (store has null, IdentityValidator fires).
// ---------------------------------------------------------------------------

test.describe('Bug Condition B — Cookie Timing', () => {
  /**
   * Validates: Bug Condition B
   *
   * Sets the x-family-member-id cookie via addCookies ONLY (no addInitScript).
   * Navigates to /home and asserts the URL stays /home.
   *
   * FAILS on unfixed code because:
   *   - familyStore reads getFamilyMemberIdCookie() at module-load time (before addCookies runs)
   *   - selectedFamilyMemberId is null
   *   - IdentityValidator redirects to /onboarding
   *
   * PASSES after Fix B: addInitScript seeds family-storage in localStorage before navigation,
   * Zustand persist middleware hydrates with the correct ID, IdentityValidator allows /home.
   */
  test('page stays on /home when cookie is set without addInitScript', async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';

    // Bug Condition B: inject cookie ONLY — no addInitScript seeding localStorage
    // isBugConditionB: cookieInjectedAt = 'after-module-load' AND localStorageSeeded = false
    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);

    // NOTE: Intentionally NO addInitScript here — this is the bug condition

    await setupCommonRoutes(page);

    await page.goto('/home');

    // EXPECTED (correct): URL stays /home — identity is recognized
    // ACTUAL (buggy): URL becomes /onboarding — familyStore.selectedFamilyMemberId is null
    await expect(page).toHaveURL(/\/home/, { timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// Bug Condition C — GOTO Auto-Navigation
//
// isBugConditionC: onSuccess = true AND isGoto = true
//
// MinimalCapture.tsx has a useEffect that calls router.push(ROUTES.PROFILE_SETTINGS) when
// onSuccess = true && isGoto = true. This navigates away before the test assertion
// getByText(/your goto is being prepared/i) can find the element.
//
// EXPECTED (correct) behavior: success screen stays visible until user clicks "Back to Settings".
// ACTUAL (buggy) behavior: useEffect navigates away immediately, element is unmounted.
//
// NOTE: This test uses GLOB matchers for per-test handlers (not predicates) so that Bug A
// does NOT interfere. The test isolates only Bug C.
// ---------------------------------------------------------------------------

test.describe('Bug Condition C — GOTO Auto-Navigation', () => {
  test.beforeEach(async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';

    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);

    // Fix B applied here: seed localStorage so identity is recognized (isolates Bug C only)
    await page.addInitScript((id) => {
      localStorage.setItem(
        'family-storage',
        JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 })
      );
    }, MOCK_IDS.MEMBER_ALEX);

    await setupCommonRoutes(page);

    // Per-test GOTO handler using GLOB matcher (not predicate) — Fix A applied here
    // This ensures Bug A does NOT interfere with Bug C's test
    let gotoItems: any[] = [];
    await page.route('**/api/goto', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: gotoItems }),
        });
      } else if (route.request().method() === 'PUT') {
        const body = route.request().postDataJSON();
        gotoItems = body.items || [];
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(body),
        });
      }
    });

    // POST /api/recipes/describe — glob matcher (Fix A applied, isolates Bug C)
    await page.route('**/api/recipes/describe', async (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON() as { name?: string };
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: builders.recipe({
              id: MOCK_IDS.RECIPE_GOTO_STUB,
              name: body?.name ?? 'Described Recipe',
              imageUrl: null,
            }),
          }),
        });
      } else {
        await route.continue();
      }
    });

    // POST /api/recipes (photo capture) — returns data-wrapped recipe so submitRecipe() gets an ID
    await page.route('**/api/recipes', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            data: builders.recipe({ id: MOCK_IDS.RECIPE_LASAGNA, name: 'Captured Recipe' }),
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [], total: 0 }),
        });
      }
    });
  });

  /**
   * Validates: Bug Condition C
   *
   * After a successful describe-it GOTO capture (onSuccess=true, isGoto=true),
   * the success screen should stay visible until the user clicks "Back to Settings".
   *
   * Bug A is neutralized by using glob matchers for per-test handlers.
   * Bug B is neutralized by using addInitScript to seed localStorage.
   * This test isolates Bug C only.
   *
   * FAILS on unfixed code because:
   *   - MinimalCapture's useEffect fires when onSuccess=true && isGoto=true
   *   - router.push(ROUTES.PROFILE_SETTINGS) is called immediately
   *   - The success screen is unmounted before getByText can find the element
   *
   * PASSES after Fix C: useEffect only fires for isGoto=false; GOTO success screen
   * stays visible until the user clicks "Back to Settings".
   */
  test('GOTO success screen stays visible until user clicks Back to Settings', async ({ page }) => {
    await page.goto('/capture?intent=goto');

    // Open the describe form
    await page.getByRole('button', { name: /or describe it instead/i }).click();

    // Fill in the recipe name
    await page.getByPlaceholder(/our family spaghetti/i).fill('Our family spaghetti');

    // Track both API calls
    const describeRequest = page.waitForRequest(
      (req) => req.url().includes('/api/recipes/describe') && req.method() === 'POST'
    );
    const settingsRequest = page.waitForRequest(
      (req) => req.url().includes('/api/goto') && req.method() === 'PUT'
    );

    await page.getByRole('button', { name: /synthesize recipe/i }).click();

    await Promise.all([describeRequest, settingsRequest]);

    // EXPECTED (correct): success screen is visible — useEffect does NOT auto-navigate for isGoto=true
    // ACTUAL (buggy): useEffect calls router.push(ROUTES.PROFILE_SETTINGS) immediately,
    //   unmounting the success screen before this assertion can find the element
    await expect(page.getByText(/your goto is being prepared/i)).toBeVisible({ timeout: 10_000 });

    // Also assert the "Back to Settings" button is present (user must click explicitly)
    await expect(page.getByRole('button', { name: /back to settings/i })).toBeVisible();

    // Assert we have NOT been auto-navigated away
    await expect(page).not.toHaveURL(/\/profile\/settings/);
  });

  /**
   * Validates: Bug Condition C — Photo path variant
   *
   * Same as above but using the photo capture path (not describe-it).
   * Ensures Bug C affects both capture paths.
   */
  test('GOTO success screen stays visible after photo capture', async ({ page }) => {
    await page.goto('/capture?intent=goto&mode=photo');

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(FIXTURE_IMAGE);

    await expect(page.getByRole('heading', { name: /photos \(1\)/i })).toBeVisible({
      timeout: 10_000,
    });

    const settingsRequest = page.waitForRequest(
      (req) => req.url().includes('/api/goto') && req.method() === 'PUT'
    );

    await page.getByRole('button', { name: /save recipe/i }).click();

    await settingsRequest;

    // EXPECTED (correct): success screen is visible
    // ACTUAL (buggy): useEffect navigates away immediately
    await expect(page.getByText(/your goto is being prepared/i)).toBeVisible({ timeout: 10_000 });

    // Assert we have NOT been auto-navigated away
    await expect(page).not.toHaveURL(/\/profile\/settings/);
  });
});
