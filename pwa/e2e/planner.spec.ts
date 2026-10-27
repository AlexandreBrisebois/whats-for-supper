import { test, expect } from './fixtures';
import type { ScheduleDays } from '../src/lib/api/generated/models';
import {
  MOCK_IDS,
  builders,
  currentMonday,
  toDateStr,
  setupCommonRoutes,
  mockFeatureFlags,
  mockNonCookingSchedule,
} from './mock-api';

function dragWeek() {
  const schedule = builders.scheduleDays() as unknown as ScheduleDays;
  schedule.days = schedule.days!.map((day, index) => ({
    ...day,
    status: 0,
    nonCooking: null,
    recipe:
      index < 3
        ? builders.scheduleRecipe({
            id: index === 1 ? MOCK_IDS.RECIPE_TACOS : MOCK_IDS.RECIPE_LASAGNA,
            name: ['Monday Lasagna', 'Tuesday Tacos', 'Repeated Lasagna'][index],
          })
        : null,
  }));
  return schedule;
}

async function openDragWeek(page: import('@playwright/test').Page, schedule = dragWeek()) {
  await page.clock.setSystemTime(new Date('2026-05-04T12:00:00Z'));
  await page.setViewportSize({ width: 900, height: 1100 });
  await mockNonCookingSchedule(page, schedule);
  const moves: Array<{ fromIndex: number; toIndex: number; recipeId: string }> = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/schedule/move')
      moves.push(request.postDataJSON());
  });
  await page.reload();
  await expect(page.getByTestId('day-card-0')).toContainText('Monday Lasagna');
  await expect(page.getByTestId('reorder-group').locator('..')).toHaveCSS('transform', 'none');
  return { schedule, moves };
}

async function heldMouse(page: import('@playwright/test').Page, index = 0) {
  const handle = page.getByTestId(`day-card-${index}`).getByTestId('planner-drag-handle');
  await handle.scrollIntoViewIfNeeded();
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(handle).toHaveAttribute('data-grabbed', 'true');
  return {
    handle,
    over: async (to: number) => {
      const row = page.getByTestId(`day-card-${to}`);
      const target = (await row.boundingBox())!;
      await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, {
        steps: 15,
      });
      return row;
    },
  };
}

async function liveWeek(
  page: import('@playwright/test').Page,
  schedule: unknown,
  echoSeq?: number
) {
  await page.evaluate(
    ({ schedule, echoSeq }) => {
      (window as any).__sseSource.dispatchEvent(
        new MessageEvent('week_updated', {
          data: JSON.stringify({ schedule, ...(echoSeq === undefined ? {} : { echoSeq }) }),
        })
      );
    },
    { schedule, echoSeq }
  );
}

// Compute current week's Monday at noon UTC — avoids timezone rollback

async function collapseDevelopmentBadge(page: import('@playwright/test').Page) {
  const devBadge = page.getByRole('button', { name: 'Collapse issues badge' });
  if (await devBadge.isVisible()) await devBadge.click();
}

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

    const readScheduleFixture = () => {
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
      return {
        ...builders.scheduleDays(),
        weekOffset: 0,
        votingRoundId: MOCK_IDS.VOTING_ROUND,
        locked: isLockedState,
        status: currentStatus,
        days,
      };
    };

    await page.route(/\/(?:backend\/)?api\/stream/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        headers: { 'Cache-Control': 'no-cache' },
        body: `event: connected\ndata: ${JSON.stringify({ type: 'connected', schedule: readScheduleFixture() })}\n\n`,
      });
    });

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

        // HTTP and stream reads describe the same persisted schedule and round.
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: readScheduleFixture() }),
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
    await expect(page.getByTestId('planned-count-badge')).toHaveCount(0);
  });

  for (const width of [390, 1280]) {
    for (const locale of ['en', 'fr'] as const) {
      for (const [status, past] of [
        [0, false],
        [1, false],
        [2, false],
        [0, true],
        [2, true],
      ] as const) {
        test(`keeps count-free actions reachable at ${width}px in ${locale}, status ${status}, past ${past}`, async ({
          page,
        }, testInfo) => {
          // Let animation time advance while retaining the fixture's calendar date.
          await page.clock.setSystemTime(new Date('2026-05-04T12:00:00Z'));
          await page.setViewportSize({ width, height: 900 });
          await page.addInitScript((value) => localStorage.setItem('locale', value), locale);
          const schedule = {
            ...builders.scheduleDays(past ? -1 : 0),
            status,
            locked: status === 2,
          };
          await page.route(/\/api\/schedule(?:\?|$)/, (route) =>
            route.fulfill({ json: { data: schedule } })
          );
          await page.route(/\/(?:backend\/)?api\/stream/, (route) =>
            route.fulfill({
              contentType: 'text/event-stream',
              body: `event: connected\ndata: ${JSON.stringify({ type: 'connected', schedule })}\n\n`,
            })
          );
          // Initialize the existing calendar owner before checking past-week availability.
          const calendarRead = page.waitForResponse(
            (response) => /\/api\/schedule\?/.test(response.url()) && response.status() === 200
          );
          await page.goto('/recipes?addToDay=0&weekOffset=0');
          await calendarRead;
          await page.getByTestId('nav-item-planner').click();
          await expect(page.getByTestId('day-card-0')).toBeVisible();
          await expect(page.getByTestId('reorder-group').locator('..')).toHaveCSS(
            'transform',
            'none'
          );
          await expect(page.getByTestId(/^day-card-/)).toHaveCount(7);
          await expect(page.getByTestId('planned-count-badge')).toHaveCount(0);
          const row = page.getByTestId('planner-action-row');
          if (past) {
            await expect(row).toHaveCount(0);
          } else {
            await expect(row).toBeVisible();
            const actions =
              status === 1
                ? [
                    ['nudge-family-cta', locale === 'fr' ? 'Relancer la famille' : 'Nudge family'],
                    ['close-voting-btn', locale === 'fr' ? 'Fermer le vote' : 'Close Voting'],
                  ]
                : [
                    [
                      'ask-family-cta',
                      locale === 'fr' ? 'Demander à la famille' : 'Ask the Family',
                    ],
                  ];
            for (const [id, label] of actions) {
              const button = row.getByTestId(id);
              await expect(button).toHaveAccessibleName(label);
              await button.click({ trial: true });
              const bounds = await button.boundingBox();
              expect(bounds!.x).toBeGreaterThanOrEqual(0);
              expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
              expect(await button.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
            }
            expect(await row.locator(':scope > div').count()).toBe(2);
          }
          await expect(page.getByTestId('reorder-group').locator('..')).toHaveCSS('opacity', '1');
          await expect(page.getByTestId('day-card-6')).toHaveCSS('opacity', '1');
          await page.screenshot({
            path: testInfo.outputPath(`${locale}-${width}-${status}-${past}.png`),
          });
        });
      }
    }
  }

  test('should display 7 daily cards', async ({ page }) => {
    const cards = page.getByTestId(/^day-card-/);
    await expect(cards).toHaveCount(7);
  });

  test('should flip weeks when clicking chevrons', async ({ page }) => {
    await page.goto('/planner?view=family');
    await expect(page.getByTestId('planner-this-week-pill')).toHaveCount(0);
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
    await expect(page).toHaveURL(/\/planner\?view=family$/);
    await expect(page.getByTestId('planner-this-week-pill')).toHaveCount(0);
    await page.getByTestId('prev-week').click();
    await expect(page.getByTestId('week-range')).not.toHaveText(initialDateRange || '');
    await expect(page.getByTestId('planner-this-week-pill').locator('svg')).toHaveClass(
      /lucide-chevron-right/
    );
    await page.getByTestId('planner-this-week-pill').click();
    await expect(page.getByTestId('week-range')).toHaveText(initialDateRange || '');
    await expect(page).toHaveURL(/\/planner\?view=family$/);
    await expect(page.getByTestId('planner-this-week-pill')).toHaveCount(0);
  });

  for (const width of [390, 1280]) {
    for (const locale of ['en', 'fr'] as const) {
      test(`return direction and full label at ${width}px in ${locale}`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 900 });
        await page.addInitScript((value) => localStorage.setItem('locale', value), locale);
        const label = locale === 'fr' ? 'Retour à cette semaine' : 'Back to this week';
        for (const offset of [-2, 2]) {
          await page.goto(`/planner?weekOffset=${offset}&view=family`);
          const pill = page.getByTestId('planner-this-week-pill');
          await expect(pill).toBeVisible();
          await expect(pill).toHaveAccessibleName(label);
          await expect(pill).toHaveText(label);
          const arrow = pill.locator('svg');
          await expect(arrow).toHaveAttribute('aria-hidden', 'true');
          await expect(arrow).toHaveClass(
            offset < 0 ? /lucide-chevron-right/ : /lucide-chevron-left/
          );
          const layout = await pill.evaluate((button, past) => {
            const arrow = button.querySelector('svg')!;
            const text = Array.from(button.childNodes).find(
              (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
            )!;
            const range = document.createRange();
            range.selectNode(text);
            const label = range.getBoundingClientRect();
            const icon = arrow.getBoundingClientRect();
            const bounds = button.getBoundingClientRect();
            return {
              correctSide: past ? label.right <= icon.left : icon.right <= label.left,
              fits:
                button.scrollWidth <= button.clientWidth &&
                label.left >= bounds.left &&
                label.right <= bounds.right,
              inViewport: bounds.left >= 0 && bounds.right <= window.innerWidth,
            };
          }, offset < 0);
          expect(layout).toEqual({ correctSide: true, fits: true, inViewport: true });
          await page.screenshot({ path: testInfo.outputPath(`return-${offset}.png`) });
          await pill.click();
          await expect(page).toHaveURL(/\/planner\?view=family$/);
          await expect(pill).toHaveCount(0);
        }
      });
    }
  }

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
    await expect(targetCard.getByTestId('planner-meal')).toHaveClass(/ring-sage/, {
      timeout: 10_000,
    });
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

    await collapseDevelopmentBadge(page);
    await page.getByTestId('cooking-view-step-by-step').click();

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

  test('always-on hold-to-move lets touch scroll pass and requires a hold before moving', async ({
    page,
    context,
  }) => {
    const { moves } = await openDragWeek(page);
    await page.setViewportSize({ width: 390, height: 600 });
    const handle = page.getByTestId('day-card-0').getByTestId('planner-drag-handle');
    await expect(handle).toHaveAttribute(
      'aria-label',
      'Hold to move. Use the Up and Down arrow keys to move one day.'
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
    expect(moves[0]).toMatchObject({ fromIndex: 0, toIndex: 1, recipeId: MOCK_IDS.RECIPE_LASAGNA });
    await expect(page.getByTestId('day-card-0')).toContainText('Tuesday Tacos');
    await expect(page.getByTestId('day-card-1')).toContainText('Monday Lasagna');
    await page.reload();
    await expect(page.getByTestId('day-card-0')).toContainText('Tuesday Tacos');
    await expect(page.getByTestId('day-card-1')).toContainText('Monday Lasagna');
    expect(moves).toHaveLength(1);
    await client.detach();
  });

  test('fixed date empty destination keeps labels still and commits once', async ({ page }) => {
    await page.clock.setSystemTime(new Date('2026-05-04T12:00:00Z'));
    await page.setViewportSize({ width: 900, height: 1100 });
    const schedule = builders.scheduleDays() as unknown as ScheduleDays;
    schedule.days = schedule.days!.map((day, index) => ({
      ...day,
      status: 0,
      nonCooking: null,
      recipe:
        index === 0
          ? builders.scheduleRecipe({ id: MOCK_IDS.RECIPE_LASAGNA, name: 'Monday Lasagna' })
          : null,
    }));
    await mockNonCookingSchedule(page, schedule);
    const moves: unknown[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/api/schedule/move')
        moves.push(request.postDataJSON());
    });
    await page.reload();
    const source = page.getByTestId('day-card-0');
    const target = page.getByTestId('day-card-1');
    const date = source.getByTestId('planner-date');
    await expect(date).toBeVisible();
    await expect(page.getByTestId('reorder-group').locator('..')).toHaveCSS('transform', 'none');
    const dateBox = (await date.boundingBox())!;
    await page
      .getByTestId('reorder-group')
      .locator('..')
      .evaluate((node: HTMLElement) => {
        node.style.willChange = 'transform';
      });
    const handle = source.getByTestId('planner-drag-handle');
    const from = (await handle.boundingBox())!;
    const to = (await target.boundingBox())!;
    const meal = (await source.getByTestId('planner-meal').boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await expect(handle).toHaveAttribute('data-grabbed', 'true');
    await expect(page.getByTestId('planner-drag-preview')).toContainText('Monday Lasagna');
    await expect(page.getByTestId('planner-drag-preview').getByTestId('planner-date')).toHaveCount(
      0
    );
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 20 });
    await expect(source).toHaveAttribute('data-drag-source', 'true');
    await expect(target).toHaveAttribute('data-drop-target', 'true');
    expect((await date.boundingBox())!.y).toBeCloseTo(dateBox.y, 0);
    const lifted = (await page.getByTestId('planner-drag-preview').boundingBox())!;
    expect(lifted.x).toBeCloseTo(meal.x, 0);
    expect(lifted.y).toBeCloseTo(meal.y + to.y + to.height / 2 - from.y - from.height / 2, 0);
    expect(moves).toHaveLength(0);
    await page.mouse.up();
    await expect.poll(() => moves.length).toBe(1);
    expect(moves[0]).toMatchObject({
      weekOffset: 0,
      recipeId: MOCK_IDS.RECIPE_LASAGNA,
      fromIndex: 0,
      toIndex: 1,
    });
    await expect(source.getByTestId('plan-meal-button')).toBeVisible();
    await expect(target).toContainText('Monday Lasagna');
    await page.reload();
    await expect(source.getByTestId('plan-meal-button')).toBeVisible();
    await expect(target).toContainText('Monday Lasagna');
    expect(moves).toHaveLength(1);
  });

  test('fixed date previews original arrangement across candidates and repeated recipe IDs', async ({
    page,
  }) => {
    const { moves } = await openDragWeek(page);
    const drag = await heldMouse(page, 2);
    await drag.over(1);
    await expect(page.getByTestId('day-card-1')).toContainText('Repeated Lasagna');
    await drag.over(0);
    await expect(page.getByTestId('day-card-0')).toContainText('Repeated Lasagna');
    await expect(page.getByTestId('day-card-1')).toContainText('Tuesday Tacos');
    await expect(page.getByTestId('day-card-2')).toContainText('Monday Lasagna');
    await expect(
      page.getByTestId('planner-drag-preview').getByTestId('planner-drop-feedback')
    ).toHaveText('Swap meals');
    expect(moves).toHaveLength(0);
    await page.mouse.up();
    await expect.poll(() => moves.length).toBe(1);
    expect(moves[0]).toMatchObject({ fromIndex: 2, toIndex: 0, recipeId: MOCK_IDS.RECIPE_LASAGNA });
    await page.reload();
    await expect(page.getByTestId('day-card-0')).toContainText('Repeated Lasagna');
    await expect(page.getByTestId('day-card-1')).toContainText('Tuesday Tacos');
    await expect(page.getByTestId('day-card-2')).toContainText('Monday Lasagna');
    expect(moves).toHaveLength(1);
  });

  test('fixed date swaps a recipe with a saved non-cooking plan and retains metadata', async ({
    page,
  }) => {
    const schedule = dragWeek();
    Object.assign(schedule.days![1], {
      recipe: null,
      status: 3,
      nonCooking: { kind: 'custom', customLabel: 'Supper with Grandma' },
    });
    const { moves } = await openDragWeek(page, schedule);
    const drag = await heldMouse(page);
    await drag.over(1);
    await expect(page.getByTestId('day-card-0')).toContainText('Supper with Grandma');
    await expect(page.getByTestId('day-card-1')).toContainText('Monday Lasagna');
    expect(moves).toHaveLength(0);
    await page.mouse.up();
    await expect.poll(() => moves.length).toBe(1);
    await page.reload();
    await expect(page.getByTestId('day-card-0')).toContainText('Supper with Grandma');
    await expect(page.getByTestId('day-card-1')).toContainText('Monday Lasagna');
    expect(schedule.days![0].nonCooking).toEqual({
      kind: 'custom',
      customLabel: 'Supper with Grandma',
    });
    expect(schedule.days![0].status).toBe(3);
    expect(schedule.days![2].recipe?.name).toBe('Repeated Lasagna');
  });

  for (const ending of ['source', 'Escape', 'pointercancel', 'outside', 'blur'] as const) {
    test(`fixed date cancels without a request on ${ending}`, async ({ page }) => {
      const { moves } = await openDragWeek(page);
      const drag = await heldMouse(page);
      await drag.over(1);
      if (ending === 'source') await drag.over(0);
      if (ending === 'Escape') await page.keyboard.press('Escape');
      if (ending === 'pointercancel')
        await page.evaluate(() =>
          window.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1 }))
        );
      if (ending === 'outside') await page.mouse.move(1, 1);
      if (ending === 'blur') await page.evaluate(() => window.dispatchEvent(new Event('blur')));
      if (ending === 'Escape')
        await expect(
          page.getByTestId('day-card-0').getByTestId('planner-drag-handle')
        ).toHaveAttribute('data-grabbed', 'false');
      await page.mouse.up();
      await expect(page.getByTestId('planner-drag-preview')).toHaveCount(0);
      await expect(page.getByTestId('day-card-0')).toContainText('Monday Lasagna');
      await expect(page.getByTestId('day-card-1')).toContainText('Tuesday Tacos');
      expect(moves).toHaveLength(0);
    });
  }

  test('fixed date week navigation retires the old gesture', async ({ page }) => {
    const { moves } = await openDragWeek(page);
    const next = builders.scheduleDays(1);
    next.days![0].recipe = builders.scheduleRecipe({ name: 'Next week supper' });
    await page.route(
      (url) => url.pathname === '/api/schedule' && url.searchParams.get('weekOffset') === '1',
      (route) => route.fulfill({ json: { data: next } })
    );
    const drag = await heldMouse(page);
    await drag.over(1);
    await page.getByTestId('next-week').evaluate((button: HTMLButtonElement) => button.click());
    await expect(page.getByTestId('planner-drag-preview')).toHaveCount(0);
    await page.mouse.up();
    await expect(page.getByTestId('day-card-0')).toHaveAttribute('data-date', next.days![0].date!);
    await expect(page.getByTestId('day-card-0')).toContainText('Next week supper');
    expect(moves).toHaveLength(0);
  });

  test('fixed date leaving Planner cancels the uncommitted gesture', async ({ page }) => {
    const { moves } = await openDragWeek(page);
    const drag = await heldMouse(page);
    await drag.over(1);
    await page.getByTestId('nav-item-recipes').evaluate((link: HTMLAnchorElement) => link.click());
    await expect(page).toHaveURL(/\/recipes/);
    await expect(page.getByTestId('planner-drag-preview')).toHaveCount(0);
    await page.mouse.up();
    expect(moves).toHaveLength(0);
    await page.getByTestId('nav-item-planner').click();
    await expect(page.getByTestId('day-card-0')).toContainText('Monday Lasagna');
    await expect(page.getByTestId('day-card-1')).toContainText('Tuesday Tacos');
    expect(moves).toHaveLength(0);
  });

  test('fixed date rejection restores original dated content', async ({ page }) => {
    const { moves } = await openDragWeek(page);
    await page.route(
      (url) => url.pathname === '/api/schedule/move',
      (route) => route.fulfill({ status: 409, json: { message: 'Conflict' } })
    );
    const drag = await heldMouse(page);
    await drag.over(1);
    await page.mouse.up();
    await expect.poll(() => moves.length).toBe(1);
    await expect(page.getByTestId('day-card-0')).toContainText('Monday Lasagna');
    await expect(page.getByTestId('day-card-1')).toContainText('Tuesday Tacos');
    await page.reload();
    await expect(page.getByTestId('day-card-0')).toContainText('Monday Lasagna');
    expect(moves).toHaveLength(1);
  });

  test('fixed date destination stays visible beside a wrapped overlay without added layout space', async ({
    page,
  }) => {
    const schedule = dragWeek();
    schedule.days![0].recipe!.name =
      'Monday Lasagna with roasted vegetables and a very long family recipe name';
    await openDragWeek(page, schedule);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId('reorder-group').locator('..')).toHaveCSS('transform', 'none');
    await expect(page.getByTestId('reorder-group').locator('xpath=ancestor::main[1]')).toHaveCSS(
      'padding-left',
      '16px'
    );
    const sourceDate = page.getByTestId('day-card-0').getByTestId('planner-date');
    const dateBox = (await sourceDate.boundingBox())!;
    const drag = await heldMouse(page);
    const row = await drag.over(1);
    const date = row.getByTestId('planner-date');
    await expect(date).toHaveAttribute('data-drop-target', 'true');
    await expect(date.getByTestId('planner-drop-arrow')).toBeVisible();
    expect((await date.boundingBox())!.width).toBe(dateBox.width);
    expect((await date.boundingBox())!.x).toBeCloseTo(dateBox.x, 0);
    await expect(
      page.getByTestId('planner-drag-preview').getByTestId('planner-drop-feedback')
    ).toHaveText('Swap meals');
    await expect(row.getByTestId('planner-drop-feedback')).toHaveCount(0);
    await page.mouse.move(1, 1);
    await expect(page.getByTestId('planner-drop-arrow')).toHaveCount(0);
    await expect(page.getByTestId('planner-drop-feedback')).toHaveCount(0);
    await page.keyboard.press('Escape');
    const root = page
      .getByTestId('reorder-group')
      .locator('xpath=ancestor::div[contains(@class,"solar-earth-bg")][1]');
    await expect(root).toHaveCSS('padding-bottom', '0px');
    await expect(root).toHaveCSS('min-height', 'auto');
  });

  test('fixed date Other plans saves and clears after a completed drag without an echo', async ({
    page,
  }) => {
    const { schedule, moves } = await openDragWeek(page);
    const drag = await heldMouse(page);
    await drag.over(1);
    await page.mouse.up();
    await expect.poll(() => moves.length).toBe(1);
    const day = page.getByTestId('day-card-3');
    await day.getByTestId('plan-meal-button').click();
    await page.getByTestId('pivot-no-cooking').click();
    await page.getByTestId('non-cooking-other-plans').click();
    await page.getByTestId('non-cooking-custom-label').fill('Supper at Grandma’s');
    await page.getByTestId('non-cooking-save').click();
    await expect(page.getByTestId('non-cooking-sheet')).toHaveCount(0);
    expect(schedule.days![3].nonCooking?.customLabel).toBe('Supper at Grandma’s');
    await expect(day.getByTestId('non-cooking-indicator')).toHaveText('Supper at Grandma’s');
    await day.getByTestId('ordered-in-indicator').click();
    await page.getByTestId('pivot-no-cooking').click();
    await page.getByTestId('non-cooking-clear').click();
    await expect(day.getByTestId('plan-meal-button')).toBeVisible();
    expect(schedule.days![3].nonCooking).toBeNull();
  });

  test('fixed date defers live snapshots during drag and an in-flight move', async ({ page }) => {
    const { schedule, moves } = await openDragWeek(page);
    let release!: () => void;
    const heldResponse = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/api/schedule/move?**', async (route) => {
      await heldResponse;
      await route.fallback();
    });
    const drag = await heldMouse(page);
    await drag.over(1);
    const live = structuredClone(schedule);
    live.days![3].recipe = builders.scheduleRecipe({ name: 'Family update' });
    await liveWeek(page, live);
    await expect(page.getByTestId('day-card-3')).not.toContainText('Family update');
    await page.mouse.up();
    await expect.poll(() => moves.length).toBe(1);
    await expect(page.getByTestId('day-card-1')).toContainText('Monday Lasagna');
    // While HTTP is pending, protect the optimistic move from older snapshots.
    const confirmed = structuredClone(schedule);
    confirmed.days![3].recipe = live.days![3].recipe;
    await liveWeek(page, confirmed);
    await expect(page.getByTestId('day-card-3')).not.toContainText('Family update');
    schedule.days![3].recipe = live.days![3].recipe;
    release();
    await expect(page.getByTestId('day-card-3')).toContainText('Family update');
    await expect(page.getByTestId('day-card-0')).toContainText('Tuesday Tacos');
    await expect(page.getByTestId('day-card-1')).toContainText('Monday Lasagna');
    expect(moves).toHaveLength(1);
  });

  test('fixed date keyboard follows moved handle and respects both week boundaries', async ({
    page,
  }) => {
    const schedule = dragWeek();
    schedule.days![6].recipe = builders.scheduleRecipe({
      id: MOCK_IDS.RECIPE_CARBONARA,
      name: 'Sunday supper',
    });
    const { moves } = await openDragWeek(page, schedule);
    const first = page.getByTestId('day-card-0').getByTestId('planner-drag-handle');
    await expect(first).toHaveAttribute('aria-keyshortcuts', 'ArrowUp ArrowDown');
    await first.focus();
    await page.keyboard.press('ArrowUp');
    expect(moves).toHaveLength(0);
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => moves.length).toBe(1);
    await expect(page.getByTestId('day-card-1').getByTestId('planner-drag-handle')).toBeFocused();
    expect(moves[0]).toMatchObject({ fromIndex: 0, toIndex: 1 });
    await expect(page.getByTestId('day-card-0')).toContainText('Tuesday Tacos');
    await expect(page.getByTestId('day-card-1')).toContainText('Monday Lasagna');
    const last = page.getByTestId('day-card-6').getByTestId('planner-drag-handle');
    await last.focus();
    await page.keyboard.press('ArrowDown');
    expect(moves).toHaveLength(1);
    await expect(last).toBeFocused();
    await page.reload();
    await expect(page.getByTestId('day-card-1')).toContainText('Monday Lasagna');
  });

  test('fixed date handle keeps a 44px target with wrapped text', async ({ page }) => {
    const schedule = dragWeek();
    schedule.days![0].recipe!.name =
      'Monday Lasagna with roasted vegetables and a very long family recipe name';
    await openDragWeek(page, schedule);
    await page.setViewportSize({ width: 320, height: 740 });
    const handle = page.getByTestId('day-card-0').getByTestId('planner-drag-handle');
    const box = (await handle.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    const row = page.getByTestId('day-card-0');
    const date = (await row.getByTestId('planner-date').boundingBox())!;
    const content = (await row.getByTestId('planner-meal').boundingBox())!;
    expect(date.x + date.width).toBeLessThan(content.x);
    expect(Math.abs(date.y + date.height / 2 - content.y - content.height / 2)).toBeLessThan(1);
    expect(await row.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
  });

  for (const locale of ['en', 'fr'] as const) {
    for (const [width, height] of [
      [320, 740],
      [390, 844],
      [768, 1024],
      [1024, 768],
    ]) {
      test(`fixed date layout ${locale} ${width}x${height}`, async ({ page }) => {
        await page.addInitScript((locale) => localStorage.setItem('locale', locale), locale);
        const schedule = dragWeek();
        schedule.days![0].recipe!.name =
          locale === 'fr'
            ? 'Monday Lasagna — Lasagnes aux légumes rôtis pour toute la famille'
            : 'Monday Lasagna with roasted vegetables for the whole family';
        await openDragWeek(page, schedule);
        await page.setViewportSize({ width, height });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        if (width === 320)
          await page.evaluate(() => {
            document.documentElement.style.fontSize = '125%';
          });
        const row = page.getByTestId('day-card-0');
        await expect(row).toBeVisible();
        await expect(page.getByTestId('reorder-group').locator('..')).toHaveCSS(
          'transform',
          'none'
        );
        // Sample both rectangles in one layout frame after responsive changes.
        const { date, content } = await row.evaluate((node) => ({
          date: node
            .querySelector('[data-testid="planner-date"]')!
            .getBoundingClientRect()
            .toJSON(),
          content: node
            .querySelector('[data-testid="planner-meal"]')!
            .getBoundingClientRect()
            .toJSON(),
        }));
        expect(date.x + date.width).toBeLessThan(content.x);
        expect(Math.abs(date.y + date.height / 2 - content.y - content.height / 2)).toBeLessThan(1);
        expect(await row.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
        await expect(row.getByTestId('edit-recipe-button')).toBeVisible();
        await expect(row.getByTestId('change-recipe-button')).toBeVisible();
        const drag = await heldMouse(page);
        await drag.over(1);
        await expect(
          page.getByTestId('planner-drag-preview').getByTestId('planner-drop-feedback')
        ).toHaveText(locale === 'fr' ? 'Échanger les repas' : 'Swap meals');
        await expect(page.getByTestId('planner-drag-preview').getByRole('button')).toHaveCount(0);
        await page.screenshot({ path: `/tmp/wfs-fixed-date-layout-${locale}-${width}.png` });
        await page.keyboard.press('Escape');
        await page.mouse.up();
        await expect(row).toContainText('Monday Lasagna');
      });
    }
  }

  for (const input of ['mouse', 'touch', 'touch-empty'] as const) {
    test(`${input === 'touch-empty' ? 'fixed date' : 'baseline'} dated held ${input} movement`, async ({
      page,
      context,
    }) => {
      await page.setViewportSize({ width: 900, height: 1100 });
      const schedule = builders.scheduleDays() as unknown as ScheduleDays;
      schedule.days = schedule.days!.map((day, index) => ({
        ...day,
        status: 0,
        nonCooking: null,
        recipe:
          index === 0 || (index === 1 && input !== 'touch-empty')
            ? builders.scheduleRecipe({
                id: index === 0 ? MOCK_IDS.RECIPE_LASAGNA : MOCK_IDS.RECIPE_TACOS,
                name: index === 0 ? 'Monday Lasagna' : 'Tuesday Tacos',
              })
            : null,
      }));
      await mockNonCookingSchedule(page, schedule);
      const moves: unknown[] = [];
      page.on('request', (request) => {
        if (new URL(request.url()).pathname === '/api/schedule/move')
          moves.push(request.postDataJSON());
      });
      await page.reload();
      const source = page.getByTestId('day-card-0');
      const target = page.getByTestId('day-card-1');
      const handle = source.getByTestId('planner-drag-handle');
      await expect(source).toContainText('Monday Lasagna');
      await handle.scrollIntoViewIfNeeded();
      const from = (await handle.boundingBox())!;
      const to = (await target.boundingBox())!;
      const x = from.x + from.width / 2;
      const y = from.y + from.height / 2;
      const endY = to.y + to.height / 2;
      const client = input !== 'mouse' ? await context.newCDPSession(page) : null;
      if (client) await client.send('Emulation.setTouchEmulationEnabled', { enabled: true });
      const touch = async (type: 'touchStart' | 'touchMove' | 'touchEnd', atY: number) => {
        await client!.send('Input.dispatchTouchEvent', {
          type,
          touchPoints: type === 'touchEnd' ? [] : [{ x, y: atY }],
        });
      };
      if (client) await touch('touchStart', y);
      else {
        await page.mouse.move(x, y);
        await page.mouse.down();
      }
      await expect(handle).toHaveAttribute('data-grabbed', 'true');
      for (let step = 1; step <= 20; step++) {
        const atY = y + ((endY - y) * step) / 20;
        if (client) await touch('touchMove', atY);
        else await page.mouse.move(x, atY);
      }
      expect(moves).toHaveLength(0);
      if (client) await touch('touchEnd', endY);
      else await page.mouse.up();
      await expect.poll(() => moves.length).toBe(1);
      expect(moves[0]).toMatchObject({
        weekOffset: 0,
        recipeId: MOCK_IDS.RECIPE_LASAGNA,
        fromIndex: 0,
        toIndex: 1,
      });
      await expect(source).toHaveAttribute('data-date', schedule.days![0].date!);
      if (input === 'touch-empty')
        await expect(source.getByTestId('plan-meal-button')).toBeVisible();
      else await expect(source).toContainText('Tuesday Tacos');
      await expect(target).toContainText('Monday Lasagna');
      await page.reload();
      if (input === 'touch-empty')
        await expect(source.getByTestId('plan-meal-button')).toBeVisible();
      else await expect(source).toContainText('Tuesday Tacos');
      await expect(target).toContainText('Monday Lasagna');
      expect(moves).toHaveLength(1);
      await client?.detach();
    });
  }

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
