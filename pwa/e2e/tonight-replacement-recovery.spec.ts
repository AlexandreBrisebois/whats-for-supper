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

for (const action of ['tomorrow', 'next-week', 'drop'] as const) {
  test(`Home ${action}: retry saves replacement without repeating disposition`, async ({
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
    await page.route('**/api/schedule/fill-the-gap**', (route) =>
      route.fulfill({
        json: {
          data: [
            builders.scheduleRecipe({ id: MOCK_IDS.RECIPE_LASAGNA, name: 'Replacement Lasagna' }),
          ],
        },
      })
    );
    await page.goto('/onboarding');
    await page.evaluate(async (recipeId) => {
      await fetch('/api/schedule/assign?referenceWeekStartDate=2026-10-05', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekOffset: 0, dayIndex: 6, recipeId }),
      });
    }, MOCK_IDS.RECIPE_CHICKEN);
    await page.goto('/home');
    await page.getByTestId('skip-tonight-btn').click();
    await page.getByTestId('recovery-action-pick-else').click();
    await page.getByTestId('quick-find-select').click();
    let assignments = 0,
      dispositions = 0;
    page.on('request', (request) => {
      if (
        request.method() !== 'GET' &&
        /\/api\/schedule\/(move|defer|day\/.*\/remove)/.test(request.url())
      )
        dispositions++;
    });
    await page.route('**/api/schedule/assign**', async (route) => {
      assignments++;
      expect(route.request().postDataJSON()).toMatchObject({
        requireEmpty: true,
        weekOffset: 0,
        dayIndex: 6,
        recipeId: MOCK_IDS.RECIPE_LASAGNA,
      });
      expect(new URL(route.request().url()).searchParams.get('referenceWeekStartDate')).toBe(
        '2026-10-05'
      );
      if (assignments === 1)
        return route.fulfill({ status: 400, json: { message: 'Injected save rejection' } });
      return route.fallback();
    });
    await page.getByTestId(`recovery-action-${action}`).click();
    await expect(page.getByTestId('recovery-retry-save')).toBeVisible();
    await expect(page.getByTestId('quick-find-close')).not.toBeVisible();
    await expect(page.getByTestId('recovery-dialog-title')).toBeVisible();
    expect(dispositions).toBe(1);
    await page.getByTestId('recovery-retry-save').click();
    await expect(page.getByTestId('recovery-dialog-title')).not.toBeVisible();
    expect(assignments).toBe(2);
    expect(dispositions).toBe(1);
    const plan = await page.evaluate(
      async () =>
        (await (await fetch('/api/schedule?weekOffset=0&referenceWeekStartDate=2026-10-05')).json())
          .data
    );
    expect(plan.days[6].recipe.id).toBe(MOCK_IDS.RECIPE_LASAGNA);
    await page.reload();
    const persisted = await page.evaluate(
      async () =>
        (await (await fetch('/api/schedule?weekOffset=0&referenceWeekStartDate=2026-10-05')).json())
          .data
    );
    expect(persisted.days[6].recipe.id).toBe(MOCK_IDS.RECIPE_LASAGNA);
  });
}

test('unknown save offers Retry check, then only an explicit save; leaving retains moved original', async ({
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
  await page.route('**/api/schedule/fill-the-gap**', (route) =>
    route.fulfill({
      json: {
        data: [
          builders.scheduleRecipe({ id: MOCK_IDS.RECIPE_LASAGNA, name: 'Replacement Lasagna' }),
        ],
      },
    })
  );
  await page.goto('/onboarding');
  await page.evaluate(async (recipeId) => {
    await fetch('/api/schedule/assign?referenceWeekStartDate=2026-10-05', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekOffset: 0, dayIndex: 6, recipeId }),
    });
  }, MOCK_IDS.RECIPE_CHICKEN);
  await page.goto('/home');
  await page.getByTestId('skip-tonight-btn').click();
  await page.getByTestId('recovery-action-pick-else').click();
  await page.getByTestId('quick-find-select').click();
  let assignments = 0,
    blockReads = false;
  await page.route('**/api/schedule?*', (route) =>
    blockReads
      ? route.fulfill({ status: 503, json: { message: 'Read unavailable' } })
      : route.fallback()
  );
  await page.route('**/api/schedule/assign**', (route) => {
    assignments++;
    blockReads = true;
    return route.fulfill({ status: 504, json: { message: 'Unknown save' } });
  });
  await page.getByTestId('recovery-action-tomorrow').click();
  await expect(page.getByTestId('recovery-retry-check')).toBeVisible();
  await expect(page.getByTestId('replacement-feedback')).toBeFocused();
  await expect(page.getByTestId('recovery-retry-save')).not.toBeVisible();
  expect(assignments).toBe(1);
  blockReads = false;
  await page.getByTestId('recovery-retry-check').press('Enter');
  await expect(page.getByTestId('recovery-retry-save')).toBeVisible();
  expect(assignments).toBe(1);
  await page.getByTestId('recovery-close').click();
  await expect(page.getByTestId('recovery-keep-editing')).toBeFocused();
  await page.getByTestId('recovery-keep-editing').press('Enter');
  await expect(page.getByTestId('recovery-retry-save')).toBeVisible();
  await page.getByTestId('recovery-close').click();
  await page.getByTestId('recovery-abandon').click();
  await expect(page.getByTestId('recovery-dialog-title')).not.toBeVisible();
  expect(assignments).toBe(1);
  const weeks = await page.evaluate(async () =>
    Promise.all(
      [0, 1].map(
        async (week) =>
          (
            await (
              await fetch(`/api/schedule?weekOffset=${week}&referenceWeekStartDate=2026-10-05`)
            ).json()
          ).data
      )
    )
  );
  expect(weeks[0].days[6].recipe).toBeNull();
  expect(weeks[1].days[0].recipe.id).toBe(MOCK_IDS.RECIPE_CHICKEN);
});
