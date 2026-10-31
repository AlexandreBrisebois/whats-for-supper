import { test, expect } from './fixtures';
import { builders, MOCK_IDS, setupCommonRoutes } from './mock-api';

test.use({ timezoneId: 'Asia/Tokyo' });
const calendar = builders.deploymentCalendar({
  timeZone: 'America/Toronto',
  today: '2026-10-11',
  capturedAtUtc: '2026-10-12T01:30:00Z',
  currentWeekStartDate: '2026-10-05',
  referenceWeekStartDate: '2026-10-05',
  nextDayAtUtc: '2026-10-12T04:00:00Z',
});

test('Home Order In plus Tomorrow commits a full following week without prior validation', async ({
  page,
  baseURL,
}) => {
  await page.clock.setFixedTime(new Date(calendar.capturedAtUtc));
  await setupCommonRoutes(page, calendar);
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
  await page.evaluate(
    async ({ selected, other }) => {
      for (let i = 6; i < 21; i++)
        await fetch('/api/schedule/assign?referenceWeekStartDate=2026-10-05', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            weekOffset: Math.floor(i / 7),
            dayIndex: i % 7,
            recipeId: i === 6 ? selected : other,
          }),
        });
    },
    { selected: MOCK_IDS.RECIPE_CHICKEN, other: MOCK_IDS.RECIPE_LASAGNA }
  );
  await page.goto('/home');
  await expect(page.getByTestId('tonight-menu-card')).toBeVisible();
  await page.getByTestId('tonight-menu-card').click();
  await page.getByTestId('skip-tonight-btn').dispatchEvent('click');
  await page.getByTestId('recovery-action-order-in').click();
  const validations: string[] = [];
  page.on('request', (r) => {
    if (r.method() === 'POST' && r.url().includes('/validate')) validations.push(r.url());
  });
  const movement = page.waitForRequest(
    (r) => r.method() === 'POST' && r.url().includes('/api/schedule/move')
  );
  await page.getByTestId('recovery-action-tomorrow').click();
  const request = await movement;
  expect(request.postDataJSON()).toMatchObject({
    intent: 'tomorrow',
    sourceDisposition: 'order_in',
    fromIndex: 6,
    toIndex: 0,
    targetWeekOffset: 1,
  });
  expect(validations).toEqual([]);
  await expect(page.getByTestId('recovery-dialog-title')).not.toBeVisible();
  const weeks = await page.evaluate(async () =>
    Promise.all(
      [0, 1, 2, 3].map(
        async (offset) =>
          (
            await (
              await fetch(`/api/schedule?weekOffset=${offset}&referenceWeekStartDate=2026-10-05`)
            ).json()
          ).data
      )
    )
  );
  expect(weeks[0].days[6]).toMatchObject({ status: 3, recipe: null });
  expect(weeks[1].days[0].recipe.id).toBe(MOCK_IDS.RECIPE_CHICKEN);
  expect(weeks[3].days[0].recipe.id).toBe(MOCK_IDS.RECIPE_LASAGNA);
  // The move response precedes its mock SSE callbacks. Drain those callbacks
  // before the page closes, keeping any teardown-time API reads isolated.
  await page.context().route('**/api/**', (route) => route.abort());
  await page.unrouteAll({ behavior: 'wait' });
});

for (const entry of ['Home', 'Planner', 'Search', 'Browse'] as const) {
  test(`${entry} retains recovery and never assigns replacement after a cooked conflict`, async ({
    page,
    baseURL,
  }) => {
    await page.clock.setFixedTime(new Date(calendar.capturedAtUtc));
    await setupCommonRoutes(page, calendar);
    await page.route('**/api/schedule/fill-the-gap**', (route) =>
      route.fulfill({
        json: {
          data: [
            builders.scheduleRecipe({ id: MOCK_IDS.RECIPE_LASAGNA, name: 'Replacement Lasagna' }),
          ],
        },
      })
    );
    await page.route('**/api/recipes/search', (route) =>
      route.fulfill({
        json: {
          data: {
            topPick: {
              ...builders.recipe({ id: MOCK_IDS.RECIPE_LASAGNA, name: 'Replacement Lasagna' }),
              reasons: [],
            },
            results: [],
            appliedFilters: {},
            searchMode: 'explicit',
            resultPath: 'lexical-only',
          },
        },
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
      await fetch('/api/schedule/assign?referenceWeekStartDate=2026-10-05', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekOffset: 0, dayIndex: 6, recipeId: id }),
      });
    }, MOCK_IDS.RECIPE_CHICKEN);
    if (entry === 'Home') {
      await page.goto('/home');
      await page.getByTestId('tonight-menu-card').click();
      await page.getByTestId('skip-tonight-btn').dispatchEvent('click');
      await page.getByTestId('recovery-action-order-in').click();
    } else if (entry === 'Planner') {
      await page.goto('/planner?weekOffset=0&referenceWeekStartDate=2026-10-05');
      await page.getByTestId('day-card-6').getByTestId('change-recipe-button').click();
      await page.getByTestId('pivot-quick-find').click();
      await page.getByTestId('quick-find-select').click();
    } else if (entry === 'Search') {
      await page.goto('/recipes?addToDay=6&weekOffset=0&referenceWeekStartDate=2026-10-05');
      await page.getByTestId('recipe-search-input').fill('lasagna');
      await page.getByTestId('recipe-search-input').press('Enter');
      await page.getByTestId('recipe-card-top-pick').click();
      await page.getByTestId('action-add-to-day').click();
    } else {
      await page.goto('/browse-all-stack');
      await page.getByTestId('stack-card-front').click();
      await page.getByTestId('action-cook-this').click();
      await page.getByTestId('action-cook-tonight').click();
    }
    await expect(page.getByTestId('recovery-dialog-title')).toBeVisible();
    let moves = 0,
      assignments = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/api/schedule/move**', async (route) => {
      moves++;
      expect(route.request().postDataJSON().intent).toBe('tomorrow');
      await gate;
      await route.fulfill({ status: 409, json: { message: 'A cooked meal blocks this move.' } });
    });
    page.on('request', (r) => {
      if (r.method() === 'POST' && new URL(r.url()).pathname === '/api/schedule/assign')
        assignments++;
    });
    const move = page.waitForRequest(
      (r) => r.method() === 'POST' && r.url().includes('/api/schedule/move')
    );
    await page.getByTestId('recovery-action-tomorrow').click();
    await move;
    try {
      await expect(page.getByTestId('recovery-action-tomorrow')).toBeDisabled();
    } finally {
      release();
    }
    await expect(page.getByText(/completed meal or changed plan blocks/)).toBeVisible();
    await expect(page.getByTestId('recovery-dialog-title')).toBeVisible();
    expect(moves).toBe(1);
    expect(assignments).toBe(0);
  });
}
