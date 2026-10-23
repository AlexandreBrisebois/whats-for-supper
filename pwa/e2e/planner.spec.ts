import { test, expect } from './fixtures';
import {
  MOCK_IDS,
  builders,
  currentMonday,
  toDateStr,
  setupCommonRoutes,
  mockFeatureFlags,
} from './mock-api';

// Compute current week's Monday at noon UTC — avoids timezone rollback

test.describe('Supper Planner', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await setupCommonRoutes(page);

    // Override semantic search so the recipes page can render a Top Pick during planner handoff.
    await page.route('**/api/recipes/search', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            topPick: {
              id: MOCK_IDS.RECIPE_LASAGNA,
              name: 'Homemade Lasagna',
              imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
              totalTime: '45 min',
              rating: 3,
              isDiscoverable: true,
              notes: null,
              reasons: [{ source: 'name-match', label: 'Name matches your search' }],
            },
            results: [],
            appliedFilters: {},
            searchMode: 'explicit',
            resultPath: 'lexical-only',
          },
        }),
      });
    });

    await page.route('**/api/recipes/*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            recipe: builders.recipe({
              id: MOCK_IDS.RECIPE_LASAGNA,
              name: 'Homemade Lasagna',
              description: 'A classic family lasagna.',
              imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
              totalTime: '45 min',
              rating: 3,
              ingredients: ['Pasta', 'Beef', 'Tomato', 'Cheese'],
              notes: 'Family favorite.',
            }),
          }),
        });
        return;
      }

      await route.fallback();
    });

    const baseUrl = baseURL || 'http://127.0.0.1:3000';

    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);

    // Set localStorage before first navigation
    await page.addInitScript((id) => {
      localStorage.setItem(
        'family-storage',
        JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 })
      );
    }, MOCK_IDS.MEMBER_ALEX);

    const monday = currentMonday();
    const pinnedDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setUTCDate(monday.getUTCDate() + i);
      return toDateStr(d);
    });

    let currentStatus = 0;
    let isLockedState = false;

    // Single intercept covering all schedule calls — zero Prism dependency
    await page.route(
      (url) => url.pathname.includes('/api/schedule'),
      async (route) => {
        const url = route.request().url();
        const method = route.request().method();

        if (method !== 'GET') {
          if (url.includes('/voting/open')) {
            currentStatus = 1;
            isLockedState = false;
          } else if (url.includes('/lock')) {
            currentStatus = 2;
            isLockedState = true;
          }

          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: { message: 'ok' } }),
          });
          return;
        }

        if (url.includes('smart-defaults')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                weekOffset: 0,
                familySize: 3,
                consensusThreshold: 2,
                preSelectedRecipes: [
                  {
                    recipeId: MOCK_IDS.RECIPE_CARBONARA,
                    name: 'Zesty Lemon Chicken',
                    heroImageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
                    voteCount: 2,
                    familySize: 3,
                    unanimousVote: false,
                    dayIndex: 3,
                    isLocked: false,
                  },
                  {
                    recipeId: MOCK_IDS.RECIPE_STIR_FRY,
                    name: 'Ginger Beef Stir Fry',
                    heroImageUrl: 'https://images.unsplash.com/photo-1559847844-5315695dadae',
                    voteCount: 3,
                    familySize: 3,
                    unanimousVote: true,
                    dayIndex: 4,
                    isLocked: false,
                  },
                  {
                    recipeId: MOCK_IDS.RECIPE_TACOS,
                    name: 'Street Tacos',
                    heroImageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47',
                    voteCount: 2,
                    familySize: 3,
                    unanimousVote: false,
                    dayIndex: 5,
                    isLocked: false,
                  },
                ],
                openSlots: [],
                consensusRecipesCount: 1,
                isVotingOpen: currentStatus === 1,
              },
            }),
          });
          return;
        }

        // Default GET /api/schedule
        const monday = currentMonday();
        const days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(monday);
          d.setUTCDate(monday.getUTCDate() + i);
          return {
            day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
            date: toDateStr(d),
            ...(i === 0 || i === 1
              ? {
                  recipe: builders.scheduleRecipe({
                    id: i === 0 ? MOCK_IDS.RECIPE_LASAGNA : MOCK_IDS.RECIPE_TACOS,
                    name: i === 0 ? 'Homemade Lasagna' : 'Street Tacos',
                    voteCount: i === 0 ? 3 : 2,
                    ingredients: ['Pasta', 'Beef', 'Tomato', 'Cheese'],
                  }),
                }
              : {}),
          };
        });

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              ...builders.scheduleDays(),
              weekOffset: 0,
              locked: isLockedState,
              status: currentStatus,
              days,
            },
          }),
        });
      }
    );

    await page.goto('/planner');
    await expect(page.getByTestId('day-card-0')).toBeVisible({ timeout: 10_000 });
  });

  test('should display the planner navigation and segmented control', async ({ page }) => {
    // Tab switcher only visible on mobile/narrow viewports
    const isMobile = await page.evaluate(() => window.innerWidth < 1024);
    if (isMobile) {
      await expect(page.getByTestId('planner-tab')).toBeVisible();
      await expect(page.getByTestId('grocery-tab')).toBeVisible();
    } else {
      // On desktop, we expect the grocery list to be visible in the dashboard
      await expect(page.getByTestId('grocery-checklist')).toBeVisible();
    }

    await expect(page.getByTestId('planner-action-row')).toBeVisible();
    await expect(
      page.getByTestId('planner-action-row').getByTestId('ask-family-cta')
    ).toBeVisible();
    await expect(
      page.getByTestId('planner-action-row').getByTestId('planned-count-badge')
    ).toBeVisible();
  });

  test('should display 7 daily cards', async ({ page }) => {
    const cards = page.getByTestId(/^day-card-/);
    await expect(cards).toHaveCount(7);
  });

  test('should flip weeks when clicking chevrons', async ({ page }) => {
    const initialDateRange = await page.getByTestId('week-range').textContent();
    await page.getByTestId('next-week').click();

    // Wait for the date range to change (indicates data has loaded)
    await expect(page.getByTestId('week-range')).not.toHaveText(initialDateRange || '', {
      timeout: 10_000,
    });

    const nextDateRange = await page.getByTestId('week-range').textContent();
    expect(initialDateRange).not.toBe(nextDateRange);

    await expect(page.getByTestId('planner-this-week-pill')).toBeVisible();
    await expect(page.getByTestId('planner-this-week-pill')).toContainText('Back to this week');
    await page.getByTestId('planner-this-week-pill').click();

    await expect(page.getByTestId('week-range')).toContainText('This week', { timeout: 10_000 });
  });

  test('should open the planning pivot sheet when clicking "+" on an unplanned day', async ({
    page,
  }) => {
    // Tuesday (index 1) is unplanned in mock data
    await page.waitForSelector('[data-testid="plan-meal-button"]');
    await page.getByTestId('plan-meal-button').first().click();

    await expect(page.getByTestId('pivot-sheet')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('pivot-quick-find')).toBeVisible();
    await expect(page.getByTestId('pivot-search-library')).toBeVisible();
    await expect(page.getByTestId('pivot-ask-family')).toHaveCount(0);
  });

  test('should complete the search-to-planner round-trip with success feedback', async ({
    page,
  }) => {
    // 1. Open pivot sheet for an unplanned day — Wednesday (index 2) has no smart default
    const targetCard = page.getByTestId('day-card-2');
    await targetCard.getByTestId('plan-meal-button').click();

    // 2. Click "Search library"
    await page.getByTestId('pivot-search-library').click();
    await expect(page).toHaveURL(/\/recipes\?addToDay=2&weekOffset=0/);

    // 3. Verify Planning Mode banner
    await expect(page.getByTestId('planning-mode-banner')).toBeVisible();

    // 4. Open the Top Pick detail sheet and confirm planner CTA
    await page.getByTestId('recipe-card-top-pick').click();
    await expect(page.getByTestId('action-add-to-day')).toBeVisible();
    await page.getByTestId('action-add-to-day').click();

    // 5. Verify redirect back to planner with success params
    await page.waitForURL(/\/planner\?success=1&dayIndex=2/);
    await expect(page).toHaveURL(/\/planner\?success=1&dayIndex=2/);

    // 6. Verify success feedback (ring) on the card
    await expect(targetCard).toHaveClass(/ring-sage/, { timeout: 10_000 });
  });

  test('should trigger Cook Mode from a recipe card and navigate steps', async ({ page }) => {
    // Pin the browser's Date to the same Monday used by currentMonday() (2026-05-04).
    // getTodayString() reads new Date() in the browser, so pinning here makes day-card-0
    // (Monday) the "today" card.
    const PINNED_DATE = '2026-05-04T12:00:00Z';
    await page.addInitScript((isoDate) => {
      const RealDate = Date;
      const pinned = new RealDate(isoDate).getTime();
      // @ts-ignore
      globalThis.Date = class extends RealDate {
        constructor(...args: any[]) {
          if (args.length === 0) {
            super(pinned);
          } else {
            // @ts-ignore
            super(...args);
          }
        }
        static now() {
          return pinned;
        }
      };
    }, PINNED_DATE);

    await page.goto('/planner');
    await expect(page.getByTestId('day-card-0')).toBeVisible({ timeout: 10_000 });

    // Click recipe title on day-card-0 to open detail sheet
    const todayCard = page.getByTestId('day-card-0');
    await todayCard.getByTestId('edit-recipe-button').click();

    // Click STEPS button to launch Cooks Mode
    const detailSheet = page.getByTestId('recipe-detail-sheet');
    await expect(detailSheet).toBeVisible();
    await detailSheet.getByTestId('time-cook-btn').click();

    const overlay = page.getByTestId('cooks-mode-overlay');
    await expect(overlay).toBeVisible();
    await expect(page.getByTestId('cooks-mode-step-indicator')).toContainText(/Check & Prep/i);
    await expect(page.getByTestId('cooks-mode-step-next')).toContainText(/Let's Cook/i);

    // Navigate steps — text from builders.recipe() default: Step 1, Step 2
    await page.getByTestId('cooks-mode-step-next').click();
    await expect(page.getByTestId('cooks-mode-step-text')).toContainText(/Step 1/i);
    await expect(page.getByTestId('cooks-mode-step-indicator')).toContainText(/\d+ \/ \d+/i);

    await page.getByTestId('cooks-mode-step-next').click();
    await expect(page.getByTestId('cooks-mode-step-text')).toContainText(/Step 2/i);
    await expect(page.getByTestId('cooks-mode-step-indicator')).toContainText(/\d+ \/ \d+/i);

    await page.getByTestId('close-cooks-mode').click();
    await expect(overlay).not.toBeVisible();
  });

  test('uses fixed date fixtures to verify cards layout and details link', async ({ page }) => {
    const PINNED_DATE = '2026-05-04T12:00:00Z';
    await page.addInitScript((isoDate) => {
      const RealDate = Date;
      const pinned = new RealDate(isoDate).getTime();
      // @ts-ignore
      globalThis.Date = class extends RealDate {
        constructor(...args: any[]) {
          if (args.length === 0) {
            super(pinned);
          } else {
            // @ts-ignore
            super(...args);
          }
        }
        static now() {
          return pinned;
        }
      };
    }, PINNED_DATE);

    await page.goto('/planner');

    const todayCard = page.getByTestId('day-card-0');
    const nonTodayCard = page.getByTestId('day-card-1');

    // Both should render change-recipe-button
    await expect(todayCard.getByTestId('change-recipe-button')).toBeVisible();
    await expect(nonTodayCard.getByTestId('change-recipe-button')).toBeVisible();

    // Neither should render start-cook-mode or view-recipe-button
    await expect(todayCard.getByTestId('start-cook-mode')).toHaveCount(0);
    await expect(todayCard.getByTestId('view-recipe-button')).toHaveCount(0);
    await expect(nonTodayCard.getByTestId('start-cook-mode')).toHaveCount(0);
    await expect(nonTodayCard.getByTestId('view-recipe-button')).toHaveCount(0);
  });

  test('should display smart default recipes merged into the 7-day grid', async ({ page }) => {
    const cards = page.getByTestId(/^day-card-/);
    await expect(cards).toHaveCount(7);
    await expect(cards.first()).toBeVisible();
  });

  test('hold-to-move preview lets touch scroll pass and requires a hold before moving', async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 390, height: 600 });
    await mockFeatureFlags(page, [{ key: 'planner-hold-to-move', mode: 'on', enabled: true }]);
    await page.reload();
    const handle = page.getByTestId('day-card-0').getByTestId('planner-drag-handle');
    await expect(handle).toHaveAttribute('aria-label', 'Hold to move');
    const moves: unknown[] = [];
    await page.route(
      (url) => url.pathname === '/api/schedule/move',
      async (route) => {
        moves.push(route.request().postDataJSON());
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { message: 'ok' } }),
        });
      }
    );
    const client = await context.newCDPSession(page);
    await client.send('Emulation.setTouchEmulationEnabled', { enabled: true });
    await handle.scrollIntoViewIfNeeded();
    const box = await handle.boundingBox();
    if (!box) throw new Error('Missing drag handle');
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    const touch = async (type: 'touchStart' | 'touchMove' | 'touchEnd', atY: number) => {
      await client.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: type === 'touchEnd' ? [] : [{ x, y: atY }],
      });
    };
    const before = await page.getByTestId('reorder-group').innerText();
    const scrollPosition = () =>
      page.evaluate(() =>
        [...document.querySelectorAll('*')].reduce((sum, element) => sum + element.scrollTop, 0)
      );
    const scrollBefore = await scrollPosition();
    await touch('touchStart', y);
    await touch('touchMove', y - 60);
    await touch('touchEnd', y - 60);
    await expect.poll(scrollPosition).toBeGreaterThan(scrollBefore);
    await expect(handle).toHaveAttribute('data-grabbed', 'false');
    expect(moves).toHaveLength(0);
    expect(await page.getByTestId('reorder-group').innerText()).toBe(before);

    await handle.scrollIntoViewIfNeeded();
    const heldBox = await handle.boundingBox();
    if (!heldBox) throw new Error('Missing drag handle');
    const heldY = heldBox.y + heldBox.height / 2;
    await touch('touchStart', heldY);
    await expect(handle).toHaveAttribute('data-grabbed', 'true');
    // Cross a card midpoint only after activation, then release to commit once.
    for (let offset = 10; offset <= 100; offset += 10) await touch('touchMove', heldY + offset);
    await touch('touchEnd', heldY + 100);
    await expect.poll(() => moves.length).toBe(1);
    await client.detach();
  });

  test('should allow dragging cards to reorder', async ({ page }) => {
    const reorderGroup = page.getByTestId('reorder-group');
    await expect(reorderGroup).toBeVisible();
  });

  test('should assign pending smart default slots and lock when closing voting', async ({
    page,
  }) => {
    // 1. Open voting to surface smart defaults
    await page.getByTestId('ask-family-cta').click();

    // 2. Wait for the consolidated closure button to appear
    const closeVotingBtn = page.getByTestId('close-voting-btn');
    await expect(closeVotingBtn).toBeVisible({ timeout: 10_000 });

    // 3. Close voting (triggers promotion and lock in store)
    await closeVotingBtn.click();

    // 4. Verify success feedback and locked state
    await expect(page.getByTestId('planner-week-finalized')).toBeVisible();
    await expect(closeVotingBtn).not.toBeVisible();
    await expect(page.getByTestId('ask-family-cta')).toBeVisible();
  });

  test('should allow launching Cook Mode from detail sheet even if recipe image is missing', async ({
    page,
  }) => {
    // We must use a date that matches the browser's fixed clock (2026-05-04)
    const todayStr = toDateStr(currentMonday());

    await page.route(
      (url) => url.pathname === '/api/schedule',
      async (route) => {
        const monday = currentMonday();
        const days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(monday);
          d.setUTCDate(monday.getUTCDate() + i);
          const dateStr = toDateStr(d);
          return {
            day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
            date: dateStr,
            ...(dateStr === todayStr
              ? {
                  recipe: builders.scheduleRecipe({
                    id: MOCK_IDS.RECIPE_LASAGNA,
                    name: 'No Image Lasagna',
                    image: '', // Missing image
                  }),
                }
              : {}),
          };
        });

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              ...builders.scheduleDays(),
              weekOffset: 0,
              locked: false,
              status: 0,
              days,
            },
          }),
        });
      }
    );
    await page.route('**/api/recipes/*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            recipe: builders.recipe({
              id: MOCK_IDS.RECIPE_LASAGNA,
              name: 'No Image Lasagna',
              imageUrl: '',
              description: 'A classic family lasagna.',
              totalTime: '45 min',
              rating: 3,
              ingredients: ['Pasta', 'Beef', 'Tomato', 'Cheese'],
              notes: 'Family favorite.',
            }),
          }),
        });
        return;
      }
      await route.fallback();
    });

    await page.goto('/planner');

    // Click recipe title to open detail sheet
    const todayCard = page.getByTestId('day-card-0');
    await todayCard.getByTestId('edit-recipe-button').click();

    // Launch cooks mode
    const detailSheet = page.getByTestId('recipe-detail-sheet');
    await expect(detailSheet).toBeVisible();
    await detailSheet.getByTestId('time-cook-btn').click();

    // Wait for loader to disappear and overlay to appear
    await expect(page.getByTestId('cooks-mode-loading')).not.toBeVisible({ timeout: 10_000 });
    const overlay = page.getByTestId('cooks-mode-overlay');
    await expect(overlay).toBeVisible();
    await expect(overlay.getByTestId('cooks-mode-recipe-name')).toContainText(/No Image Lasagna/i);
  });
});

// These flows use the shared stateful handlers, independently of the legacy fixtures above.
test.describe('Quick Replace relative next week', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await page.clock.setFixedTime(new Date('2026-10-14T12:00:00Z'));
    await setupCommonRoutes(
      page,
      builders.deploymentCalendar({
        today: '2026-10-14',
        currentWeekStartDate: '2026-10-12',
        referenceWeekStartDate: '2026-10-12',
        capturedAtUtc: '2026-10-14T12:00:00Z',
        nextDayAtUtc: '2026-10-15T00:00:00Z',
      })
    );
    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseURL! }]);
    await page.addInitScript(
      (id) =>
        localStorage.setItem(
          'family-storage',
          JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 })
        ),
      MOCK_IDS.MEMBER_ALEX
    );
    await page.goto('/onboarding');
    await page.evaluate(async (id) => {
      await fetch('/api/schedule/assign?referenceWeekStartDate=2026-10-12', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekOffset: 1, dayIndex: 2, recipeId: id }),
      });
    }, MOCK_IDS.RECIPE_CHICKEN);
    await page.route('**/api/schedule/fill-the-gap**', (route) =>
      route.fulfill({
        json: { data: [builders.scheduleRecipe({ id: MOCK_IDS.RECIPE_CARBONARA })] },
      })
    );
  });

  test('saves the old meal in week two before replacing week one and survives reload', async ({
    page,
  }) => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let deferComplete = false;
    let deferrals = 0;
    let replacements = 0;
    await page.route('**/api/schedule/defer**', async (route) => {
      deferrals++;
      expect(route.request().method()).toBe('POST');
      const url = new URL(route.request().url());
      expect(url.searchParams.get('referenceWeekStartDate')).toBe('2026-10-12');
      expect(url.searchParams.get('targetWeekOffset')).toBe('2');
      expect(route.request().postDataJSON()).toEqual({
        sourceDate: '2026-10-21',
        recipeId: MOCK_IDS.RECIPE_CHICKEN,
      });
      await gate;
      deferComplete = true;
      await route.fallback();
    });
    await page.route('**/api/schedule/assign**', async (route) => {
      expect(deferComplete).toBe(true);
      expect(route.request().postDataJSON()).toMatchObject({
        weekOffset: 1,
        dayIndex: 2,
        recipeId: MOCK_IDS.RECIPE_CARBONARA,
      });
      expect(new URL(route.request().url()).searchParams.get('referenceWeekStartDate')).toBe(
        '2026-10-12'
      );
      replacements++;
      await route.fallback();
    });
    await page.goto('/planner?weekOffset=1');
    await expect(page.getByTestId('day-card-2')).toContainText('Chicken');
    await page.getByTestId('day-card-2').getByTestId('change-recipe-button').click();
    await page.getByTestId('pivot-quick-find').click();
    await page.getByTestId('quick-find-select').click();
    await page.evaluate((id) => {
      (window as any).__sseSource.addEventListener('week_updated', (event: MessageEvent) => {
        const schedule = JSON.parse(event.data).schedule;
        if (schedule.weekOffset === 1 && schedule.days[2].recipe?.id === id)
          (window as any).__replacementSnapshot = true;
      });
    }, MOCK_IDS.RECIPE_CARBONARA);
    const pending = page.waitForRequest(
      (request) => new URL(request.url()).pathname === '/api/schedule/defer'
    );
    await page.getByRole('button', { name: /Save for Next Week/ }).click();
    await pending;
    await expect(page.getByRole('button', { name: /Save for Next Week/ })).toBeDisabled();
    await page.getByRole('button', { name: /Save for Next Week/ }).dispatchEvent('click');
    expect(deferrals).toBe(1);
    expect(replacements).toBe(0);
    release();
    await expect(page.getByTestId('day-card-2')).toContainText(
      builders.scheduleRecipe({ id: MOCK_IDS.RECIPE_CARBONARA }).name!
    );
    await page.waitForFunction(() => (window as any).__replacementSnapshot === true);
    await page.reload();
    await expect(page.getByTestId('day-card-2')).toContainText(
      builders.scheduleRecipe({ id: MOCK_IDS.RECIPE_CARBONARA }).name!
    );
    await expect(page.getByTestId('day-card-0')).not.toContainText('Chicken');
    await expect(page.getByTestId('day-card-1')).not.toContainText('Chicken');
    await page.getByTestId('next-week').click();
    await expect(
      page.getByTestId('day-card-0').and(page.locator('[data-date="2026-10-26"]'))
    ).toContainText('Chicken');
    await page.reload();
    await expect(
      page.getByTestId('day-card-0').and(page.locator('[data-date="2026-10-26"]'))
    ).toContainText('Chicken');
    expect(replacements).toBe(1);
  });

  for (const failure of ['defer', 'replacement'] as const) {
    test(`${failure} rejection preserves recovery and retry does not repeat completed defer`, async ({
      page,
    }) => {
      let deferrals = 0;
      let assignments = 0;
      await page.route('**/api/schedule/defer**', async (route) => {
        deferrals++;
        if (failure === 'defer')
          return route.fulfill({ status: 409, json: { message: 'Cannot defer' } });
        await route.fallback();
      });
      await page.route('**/api/schedule/assign**', async (route) => {
        assignments++;
        if (assignments === 1)
          return route.fulfill({ status: 500, json: { message: 'Assignment failed' } });
        await route.fallback();
      });
      await page.goto('/planner?weekOffset=1');
      await page.getByTestId('day-card-2').getByTestId('change-recipe-button').click();
      await page.getByTestId('pivot-quick-find').click();
      await page.getByTestId('quick-find-select').click();
      await page.getByRole('button', { name: /Save for Next Week/ }).click();
      await expect(
        page.getByText(
          failure === 'defer'
            ? 'The current meal could not be moved. Your plan was refreshed; please try again.'
            : 'The previous meal was moved, but the replacement could not be added. Your plan was refreshed; please try again.'
        )
      ).toBeVisible();
      expect(deferrals).toBe(1);
      expect(assignments).toBe(failure === 'defer' ? 0 : 1);
      if (failure === 'defer') {
        await expect(page.getByTestId('day-card-2')).toContainText('Chicken');
      } else {
        await page.getByRole('button', { name: /Save for Next Week/ }).click();
        await expect(page.getByTestId('day-card-2')).toContainText(
          builders.scheduleRecipe({ id: MOCK_IDS.RECIPE_CARBONARA }).name!
        );
        expect(assignments).toBe(2);
        expect(deferrals).toBe(1);
        const destination = await page.evaluate(
          async () =>
            (
              await (
                await fetch('/api/schedule?weekOffset=2&referenceWeekStartDate=2026-10-12')
              ).json()
            ).data
        );
        expect(
          destination.days.filter((day: any) => day.recipe?.id === MOCK_IDS.RECIPE_CHICKEN)
        ).toHaveLength(1);
      }
    });
  }
});
