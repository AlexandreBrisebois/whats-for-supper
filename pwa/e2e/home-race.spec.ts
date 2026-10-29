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
                calendar: builders.deploymentCalendar() as any,
                weekStartDate: '2026-05-04' as any,
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

test('ready Go-To shows tonight’s recipe before assignment responds and retains it after reload', async ({
  page,
}) => {
  const calendar = builders.deploymentCalendar();
  const recipe = builders.scheduleRecipe({ id: MOCK_IDS.RECIPE_CHICKEN });
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

  // Keep this assignment fixture independent of GOTO and unrelated live events.
  await setupCommonRoutes(page, calendar);
  await page.route('**/api/goto/active', (route) =>
    route.fulfill({
      json: { data: { recipeId: recipe.id, description: recipe.name, status: 'ready' } },
    })
  );
  let committed = false;
  const readSchedule = () => {
    const schedule = builders.scheduleDays(0, calendar);
    if (committed) schedule.days[0].recipe = recipe;
    return schedule;
  };
  await page.route(
    (url) => url.pathname === '/api/schedule',
    async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      await route.fulfill({ json: { data: readSchedule() } });
    }
  );
  await page.route('**/api/stream', async (route) => {
    // HTTP 204 stops EventSource reconnects; a finite SSE body would replay an
    // empty snapshot while the assignment is deliberately held below.
    await route.fulfill({ status: 204 });
  });
  await page.route('**/api/schedule/fill-the-gap**', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    await route.fulfill({ json: { data: [recipe] } });
  });

  let releaseAssignment!: () => void;
  const assignmentGate = new Promise<void>((resolve) => {
    releaseAssignment = resolve;
  });
  let assignmentReleased = false;
  await page.route('**/api/schedule/assign**', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    await assignmentGate;
    assignmentReleased = true;
    // Publish the same committed state to schedule reads and subsequent document loads.
    committed = true;
    await route.fulfill({ json: { data: { message: 'Recipe assigned', displacedRecipe: null } } });
  });

  try {
    await page.goto('/home');
    await expect(page.getByTestId('tonight-pivot-card')).toBeVisible();
    const assignmentRequest = page.waitForRequest(
      (request) =>
        new URL(request.url()).pathname === '/api/schedule/assign' && request.method() === 'POST'
    );
    await page.getByTestId('confirm-goto-btn').click();
    const request = await assignmentRequest;
    expect(request.postDataJSON()).toMatchObject({
      recipeId: recipe.id,
      weekOffset: 0,
      dayIndex: 0,
    });
    expect(new URL(request.url()).searchParams.get('referenceWeekStartDate')).toBe(
      calendar.referenceWeekStartDate
    );

    const menu = page.getByTestId('tonight-menu-card');
    await expect(page.getByTestId('quick-find-modal')).not.toBeVisible();
    await expect(menu).toBeVisible();
    await expect(
      menu.getByRole('heading', { name: recipe.name!, exact: true }).first()
    ).toBeVisible();
    await expect(page.getByTestId('tonight-pivot-card')).not.toBeVisible();
    expect(assignmentReleased).toBe(false);

    const assignmentResponse = page.waitForResponse((response) => response.request() === request);
    releaseAssignment();
    expect((await assignmentResponse).ok()).toBe(true);

    // A new document must recover the committed recipe, not the old optimistic store.
    await page.reload();
    await expect(menu).toBeVisible();
    await expect(
      menu.getByRole('heading', { name: recipe.name!, exact: true }).first()
    ).toBeVisible();
    await expect(page.getByTestId('tonight-pivot-card')).not.toBeVisible();
  } finally {
    releaseAssignment();
    await page.unrouteAll({ behavior: 'wait' });
  }
});
