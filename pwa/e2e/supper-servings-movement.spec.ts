import { test, expect, type Page } from './fixtures';
import { setupCommonRoutes, MOCK_IDS } from './mock-api';
import { scalarQuantity } from '../src/testing/grocery-fixtures';
import { checkGrocery, checkedExtra, groceryChecked } from './supper-grocery';

const reference = '2026-05-04';
const pasta = MOCK_IDS.RECIPE_CARBONARA;

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: 'wait' });
});

async function readWeek(page: Page, offset = 0) {
  return page.evaluate(
    async ({ reference, offset }) =>
      (
        await (
          await fetch(`/api/schedule?weekOffset=${offset}&referenceWeekStartDate=${reference}`)
        ).json()
      ).data,
    { reference, offset }
  );
}

async function assign(page: Page, dayIndex: number, weekOffset = 0, recipeId = pasta) {
  return page.evaluate(
    async ({ reference, dayIndex, weekOffset, recipeId }) => {
      const response = await fetch(`/api/schedule/assign?referenceWeekStartDate=${reference}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekOffset, dayIndex, recipeId }),
      });
      return response.status;
    },
    { reference, dayIndex, weekOffset, recipeId }
  );
}

async function mutate(page: Page, path: string, body: unknown, method = 'POST') {
  return page.evaluate(
    async ({ path, body, method }) => {
      const response = await fetch(path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        ...(body == null ? {} : { body: JSON.stringify(body) }),
      });
      const text = await response.text();
      return { status: response.status, data: text ? JSON.parse(text) : null };
    },
    { path, body, method }
  );
}

async function counts(page: Page, offset = 0) {
  return page.evaluate(
    async ({ offset, reference }) =>
      (
        await (
          await fetch(
            `/api/schedule/servings?weekOffset=${offset}&referenceWeekStartDate=${reference}`
          )
        ).json()
      ).data,
    { offset, reference }
  );
}

async function saveCounts(
  page: Page,
  offset: number,
  days: { date: string; servings: number | null }[]
) {
  const state = await counts(page, offset);
  expect(
    (
      await mutate(
        page,
        '/api/schedule/servings',
        {
          referenceWeekStartDate: reference,
          weekOffset: offset,
          expectedVersion: state.version,
          days,
        },
        'PUT'
      )
    ).status
  ).toBe(200);
}

const check = checkGrocery;

async function openMovement(
  page: Page,
  recovery: Parameters<typeof setupCommonRoutes>[2] = {},
  unit = 'g'
) {
  const refresh = {
    delayed: false,
    failRefresh: false,
    knownRecipe: { id: pasta, basis: 2, quantity: 200, ingredient: 'pasta', unit },
  };
  await page.setViewportSize({ width: 900, height: 1100 });
  const control = await setupCommonRoutes(page, undefined, {
    ...recovery,
    supperServings: refresh,
  });
  await page.context().addCookies([
    {
      name: 'x-family-member-id',
      value: MOCK_IDS.MEMBER_ALEX,
      url: process.env.BASE_URL || 'http://127.0.0.1:3000',
    },
  ]);
  await page.goto('/planner');
  expect(await assign(page, 2)).toBe(200);
  await page.reload();
  await page.goto('/profile/settings');
  await page.getByTestId('usual-portions-automatic').uncheck();
  await page.getByTestId('usual-portions-input').fill('4');
  await page.getByTestId('save-usual-portions').click();
  await expect(page.getByTestId('save-usual-portions')).toBeDisabled();
  await page.goto('/planner');
  await page.getByTestId('at-the-table-mode').click();
  await page.getByTestId('portion-input-2026-05-06').fill('6');
  await page.getByTestId('save-portions').click();
  await expect(page.getByTestId('portions-editor')).toHaveCount(0);
  await expect
    .poll(async () => (await readWeek(page)).groceryItems?.[0]?.quantity)
    .toEqual(scalarQuantity(600));
  return { refresh, control };
}

test('common calendar move Wednesday six to Thursday four recomputes groceries and keeps dated counts', async ({
  page,
}) => {
  await openMovement(page);
  const name = (await readWeek(page)).days[2].recipe.name;
  const handle = page.getByTestId('day-card-2').getByTestId('planner-drag-handle');
  await handle.focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByTestId('day-card-3')).toContainText(name);
  await expect
    .poll(async () => (await readWeek(page)).groceryItems?.[0]?.quantity)
    .toEqual(scalarQuantity(400));
  const counts = await page.evaluate(
    async () =>
      (
        await (
          await fetch('/api/schedule/servings?weekOffset=0&referenceWeekStartDate=2026-05-04')
        ).json()
      ).data
  );
  expect(counts.days[2]).toMatchObject({ date: '2026-05-06', servings: 6, overrideServings: 6 });
  expect(counts.days[3]).toMatchObject({ date: '2026-05-07', servings: 4, overrideServings: null });
  await page.getByTestId('grocery-tab').click();
  await expect(page.getByTestId('grocery-item-quantity-hint')).toContainText('400');
  const recipe = await page.evaluate(
    async (id) => (await (await fetch(`/api/recipes/${id}`)).json()).recipe,
    pasta
  );
  expect(recipe).toMatchObject({ servings: 2, ingredients: ['200 g pasta'] });
});

test('common Tomorrow Sunday chain conserves occurrences and recomputes every dated week', async ({
  page,
}) => {
  test.setTimeout(60000);
  await openMovement(page);
  for (let i = 6; i < 21; i++) expect(await assign(page, i % 7, Math.floor(i / 7))).toBe(200);
  await saveCounts(page, 0, [{ date: '2026-05-10', servings: 6 }]);
  await saveCounts(page, 1, [{ date: '2026-05-11', servings: 2 }]);
  await page.evaluate(() => {
    (window as any).__lastMovementWeek = null;
    (window as any).__sseSource.addEventListener(
      'fill_the_gap_invalidated',
      (event: MessageEvent) => {
        (window as any).__lastMovementWeek = JSON.parse(event.data).weekStartDate;
      }
    );
  });
  const moved = await mutate(page, `/api/schedule/move?referenceWeekStartDate=${reference}`, {
    weekOffset: 0,
    fromIndex: 6,
    toIndex: 0,
    targetWeekOffset: 1,
    recipeId: pasta,
    intent: 'tomorrow',
    sourceDisposition: 'order_in',
  });
  expect(moved.data.data).toMatchObject({
    moved: true,
    refreshComplete: true,
    affectedWeekStartDates: [reference, '2026-05-11', '2026-05-18', '2026-05-25'],
  });
  const weeks = await Promise.all([0, 1, 2, 3].map((offset) => readWeek(page, offset)));
  expect(weeks.flatMap((week) => week.days).filter((day) => day.recipe?.id === pasta)).toHaveLength(
    16
  );
  expect(
    weeks.map(
      (week) => week.groceryItems?.find((line: any) => line.normalizedKey === 'pasta')?.quantity
    )
  ).toEqual([600, 2600, 2800, 400].map(scalarQuantity));
  expect(weeks.every((week) => week.groceryRefresh.status === 'current')).toBe(true);
  expect((await counts(page)).days[6].servings).toBe(6);
  expect((await counts(page, 1)).days[0].servings).toBe(2);
  await expect
    .poll(() => page.evaluate(() => (window as any).__lastMovementWeek))
    .toBe('2026-05-25');
  await page.reload();
  await expect(page.getByTestId('day-card-6').getByTestId('non-cooking-indicator')).toBeVisible();
});

test('common defer spills past full next week into the actual Monday override', async ({
  page,
}) => {
  await openMovement(page);
  for (let day = 0; day < 7; day++)
    expect(await assign(page, day, 1, MOCK_IDS.RECIPE_CHICKEN)).toBe(200);
  await saveCounts(page, 2, [{ date: '2026-05-18', servings: 8 }]);
  const moved = await mutate(
    page,
    `/api/schedule/defer?referenceWeekStartDate=${reference}&targetWeekOffset=1`,
    { sourceDate: '2026-05-06', recipeId: pasta }
  );
  expect(moved.data.data).toMatchObject({ scheduledDate: '2026-05-18', scheduledWeekOffset: 2 });
  expect(
    (await readWeek(page, 2)).groceryItems.find((line: any) => line.normalizedKey === 'pasta')
      .quantity
  ).toEqual(scalarQuantity(800));
  expect(
    (await readWeek(page)).groceryItems.filter((line: any) => line.normalizedKey === 'pasta')
  ).toEqual([]);
  expect((await counts(page)).days[2].servings).toBe(6);
  await page.reload();
  await expect(page.getByTestId('day-card-2').getByTestId('plan-meal-button')).toBeVisible();
});

test('common occupied swap uses destination counts and selectively unchecks a known increase', async ({
  page,
}) => {
  await openMovement(page);
  expect(await assign(page, 3, 0, MOCK_IDS.RECIPE_CHICKEN)).toBe(200);
  await saveCounts(page, 0, [
    { date: '2026-05-06', servings: 4 },
    { date: '2026-05-07', servings: 6 },
  ]);
  await check(page);
  await checkedExtra(page);
  await page.reload();
  await page.getByTestId('day-card-2').getByTestId('planner-drag-handle').focus();
  await page.keyboard.press('ArrowDown');
  await expect
    .poll(
      async () =>
        (await readWeek(page)).groceryItems.find((line: any) => line.normalizedKey === 'pasta')
          ?.quantity
    )
    .toEqual(scalarQuantity(600));
  const week = await readWeek(page);
  expect(week.days[2].recipe.id).toBe(MOCK_IDS.RECIPE_CHICKEN);
  expect(week.days[3].recipe.id).toBe(pasta);
  expect(groceryChecked(week)).toBe(false);
  expect(week.groceryExtras).toEqual(
    expect.arrayContaining([expect.objectContaining({ name: 'unrelated', checked: true })])
  );
  await page.getByTestId('grocery-tab').click();
  await expect(page.getByTestId('grocery-portions-summary')).toBeVisible();
});

test('common new assignment contributes 400 plus 600 and later checks survive unchanged refresh', async ({
  page,
}) => {
  await openMovement(page);
  await saveCounts(page, 0, [
    { date: '2026-05-06', servings: 4 },
    { date: '2026-05-08', servings: 6 },
  ]);
  await check(page);
  expect(await assign(page, 4)).toBe(200);
  let week = await readWeek(page);
  expect(week.groceryItems.find((line: any) => line.normalizedKey === 'pasta').quantity).toEqual(
    scalarQuantity(1000)
  );
  expect(groceryChecked(week)).toBe(false);
  const reset = week.groceryRefresh.resetSummaryVersion;
  expect(reset).toBeTruthy();
  await check(page);
  expect(
    (await mutate(page, '/api/schedule/servings/refresh', { weekStartDates: [reference] })).status
  ).toBe(202);
  week = await readWeek(page);
  expect(groceryChecked(week)).toBe(true);
  expect(week.groceryRefresh.resetSummaryVersion).toBe(reset);
  await page.reload();
  await page.getByTestId('grocery-tab').click();
  const aisle = page.getByRole('button', { name: /Pantry/ });
  if ((await aisle.getAttribute('aria-expanded')) === 'false') await aisle.click();
  await expect(page.getByTestId('grocery-item-quantity-hint')).toContainText('1000');
});

test('common guarded drop and replacement preserve portions and checked manual extras', async ({
  page,
}) => {
  await openMovement(page);
  expect(await assign(page, 3, 0, MOCK_IDS.RECIPE_CHICKEN)).toBe(200);
  await saveCounts(page, 0, [
    { date: '2026-05-06', servings: 4 },
    { date: '2026-05-07', servings: 6 },
  ]);
  await check(page);
  const extra = await mutate(page, '/api/grocery-extras', {
    name: 'Soap',
    clientId: MOCK_IDS.GROCERY_EXTRA,
    weekStartDate: reference,
  });
  expect(extra.status).toBe(201);
  const extraId = extra.data.id;
  expect(
    (
      await mutate(
        page,
        `/api/grocery-extras/${extraId}`,
        { checked: true, expectedVersion: 1, weekStartDate: reference },
        'PATCH'
      )
    ).status
  ).toBe(200);
  const token = (await readWeek(page)).days[3].removalToken;
  expect(
    (
      await mutate(
        page,
        `/api/schedule/day/2026-05-07/remove?expectedPlanToken=${token}`,
        null,
        'DELETE'
      )
    ).status
  ).toBe(204);
  expect(await assign(page, 3)).toBe(200);
  const week = await readWeek(page);
  expect(week.groceryItems.find((line: any) => line.normalizedKey === 'pasta').quantity).toEqual(
    scalarQuantity(1000)
  );
  expect(groceryChecked(week)).toBe(false);
  expect(week.groceryExtras).toEqual(
    expect.arrayContaining([expect.objectContaining({ id: extraId, checked: true })])
  );
  expect((await counts(page)).days[3].servings).toBe(6);
});

test('common committed move exposes pending then failed groceries and Retry never replays movement', async ({
  page,
}) => {
  const { refresh, control } = await openMovement(page);
  refresh.delayed = true;
  let moves = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/schedule/move')
      moves++;
  });
  await page.getByTestId('day-card-2').getByTestId('planner-drag-handle').focus();
  await page.keyboard.press('ArrowDown');
  await page.getByTestId('grocery-tab').click();
  await expect(page.getByTestId('grocery-portions-updating')).toBeVisible();
  control.finishRefresh(true);
  await expect(page.getByText('Portions saved. Shopping list needs updating.')).toBeVisible({
    timeout: 10000,
  });
  const failed = (await readWeek(page)).groceryRefresh;
  const before = await counts(page);
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByTestId('grocery-portions-updating')).toBeVisible();
  const retried = (await readWeek(page)).groceryRefresh;
  expect(retried.status).toBe('updating');
  expect(retried.workflowId).not.toBe(failed.workflowId);
  expect(retried.version).toBe(failed.version);
  expect((await counts(page)).version).toBe(before.version);
  expect((await counts(page)).days).toEqual(before.days);
  control.finishRefresh();
  await expect(page.getByTestId('grocery-item-quantity-hint')).toContainText('400');
  expect(moves).toBe(1);
  expect((await counts(page)).days[2].servings).toBe(6);
});

test('common known 204 removal failure can retry through a new held refresh without replaying delete', async ({
  page,
}) => {
  const { refresh, control } = await openMovement(page, {
    schedulePostCommitFailure: (operation) => operation === 'remove',
  });
  let removes = 0;
  page.on('request', (request) => {
    if (request.method() === 'DELETE' && new URL(request.url()).pathname.endsWith('/remove'))
      removes++;
  });
  const token = (await readWeek(page)).days[2].removalToken;
  expect(
    (
      await mutate(
        page,
        `/api/schedule/day/2026-05-06/remove?expectedPlanToken=${token}`,
        null,
        'DELETE'
      )
    ).status
  ).toBe(204);
  const failed = (await readWeek(page)).groceryRefresh;
  expect(failed.status).toBe('failed');
  const before = await counts(page);
  refresh.delayed = true;
  expect(
    (await mutate(page, '/api/schedule/servings/refresh', { weekStartDates: [reference] })).status
  ).toBe(202);
  const pending = (await readWeek(page)).groceryRefresh;
  expect(pending.status).toBe('updating');
  expect(pending.workflowId).not.toBe(failed.workflowId);
  expect(pending.version).toBe(failed.version);
  control.finishRefresh();
  const completed = await readWeek(page);
  expect(completed.groceryRefresh.status).toBe('current');
  expect(completed.groceryItems).toEqual([]);
  expect((await counts(page)).version).toBe(before.version);
  expect((await counts(page)).days).toEqual(before.days);
  expect(removes).toBe(1);
});

test('common lost Tomorrow receipt keeps UI recovery and never replays movement or assignment', async ({
  page,
}) => {
  let lost = true;
  await openMovement(page, {
    schedulePostCommitFailure: (operation) => operation === 'move' && lost && !(lost = false),
  });
  await page.goto(
    `/recipes?addToDay=2&weekOffset=0&referenceWeekStartDate=${reference}&open=${MOCK_IDS.RECIPE_CHICKEN}`
  );
  await page.getByTestId('action-add-to-day').click();
  const writes: string[] = [];
  page.on('request', (request) => {
    if (!['GET', 'HEAD'].includes(request.method())) writes.push(new URL(request.url()).pathname);
  });
  await page.getByTestId('recovery-action-tomorrow').click();
  await expect(page.getByTestId('recovery-retry-check')).toBeVisible();
  await page.getByTestId('recovery-retry-check').click();
  await expect(page.getByTestId('replacement-feedback')).toContainText(
    'original meal could not be confirmed'
  );
  await page.getByTestId('recovery-review-plan').click();
  await expect(page.getByTestId('replacement-feedback')).toContainText('unconfirmed');
  await page.getByTestId('recovery-abandon').click();
  await expect(page).toHaveURL(/planner/);
  const week = await readWeek(page);
  expect(week.days[2].recipe).toBeNull();
  expect(week.days[3].recipe.id).toBe(pasta);
  expect(week.groceryItems.find((line: any) => line.normalizedKey === 'pasta').quantity).toEqual(
    scalarQuantity(400)
  );
  expect(week.groceryRefresh.status).toBe('current');
  expect(writes.filter((path) => path === '/api/schedule/move')).toHaveLength(1);
  expect(
    writes.filter((path) => ['/api/schedule/assign', '/api/schedule/servings'].includes(path))
  ).toHaveLength(0);
});

test('common dated projection and recipe corrections use shared quantities without review across different units', async ({
  page,
}) => {
  await openMovement(page);
  const day = (await readWeek(page)).days[2];
  const projection = await page.evaluate(
    async ({ pasta, occurrenceId }) =>
      await (
        await fetch(
          `/api/recipes/${pasta}/ingredient-projection?supperDate=2026-05-06&context=assigned&occurrenceId=${occurrenceId}`
        )
      ).json(),
    { pasta, occurrenceId: day.occurrenceId }
  );
  expect(projection).toMatchObject({
    targetServings: 6,
    lines: [expect.objectContaining({ quantity: 600 })],
  });
  await check(page);
  expect((await mutate(page, `/api/recipes/${pasta}`, { servings: 1 }, 'PATCH')).status).toBe(200);
  expect((await readWeek(page)).groceryItems[0].quantity).toEqual(scalarQuantity(1200));
  expect(groceryChecked(await readWeek(page))).toBe(false);
  await mutate(page, `/api/recipes/${pasta}`, { ingredients: ['pasta'] }, 'PATCH');
  await check(page);
  await mutate(page, `/api/recipes/${pasta}`, { ingredients: ['200 g pasta'] }, 'PATCH');
  let week = await readWeek(page);
  expect(week.groceryItems[0]).toMatchObject({
    quantity: scalarQuantity(1200),
    quantityComplete: true,
  });
  expect(week.groceryItems[0].checkReviewReason).not.toBe('prior_amount_unknown');
  expect(groceryChecked(week)).toBe(true);
  await mutate(page, '/api/schedule/servings/refresh', { weekStartDates: [reference] });
  expect((await readWeek(page)).groceryItems[0].checkReviewReason).not.toBe('prior_amount_unknown');
  await check(page);
  week = await readWeek(page);
  expect(week.groceryItems[0].checkReviewReason).toBeUndefined();
  expect(week.groceryItems[0].quantity).toEqual(scalarQuantity(1200));
});

test('common same-bucket unitless checks survive unprovable changes without a prior-amount warning', async ({
  page,
}) => {
  await openMovement(page, {}, '');
  await mutate(page, `/api/recipes/${pasta}`, { ingredients: ['pasta'] }, 'PATCH');
  await check(page);
  await mutate(page, `/api/recipes/${pasta}`, { ingredients: ['200  pasta'] }, 'PATCH');
  expect((await readWeek(page)).groceryItems[0]).toMatchObject({
    quantity: scalarQuantity(600),
    quantityComplete: true,
    checkReviewReason: undefined,
  });
  await mutate(page, `/api/recipes/${pasta}`, { ingredients: ['pasta'] }, 'PATCH');
  expect((await readWeek(page)).groceryItems[0]).toMatchObject({
    quantity: null,
    quantityComplete: false,
    checkReviewReason: undefined,
  });
  await mutate(page, '/api/schedule/servings/refresh', { weekStartDates: [reference] });
  expect((await readWeek(page)).groceryItems[0].checkReviewReason).toBeUndefined();
  await mutate(page, `/api/recipes/${pasta}`, { ingredients: ['200  pasta'] }, 'PATCH');
  expect((await readWeek(page)).groceryItems[0].checkReviewReason).toBeUndefined();
  await check(page);
  expect((await readWeek(page)).groceryItems[0]).toMatchObject({
    quantity: scalarQuantity(600),
    quantityComplete: true,
    checkReviewReason: undefined,
  });
  await mutate(page, `/api/recipes/${pasta}`, { ingredients: ['salt to taste'] }, 'PATCH');
  const ordinary = (await readWeek(page)).groceryItems[0];
  expect(ordinary).toMatchObject({ quantity: null, quantityComplete: true });
  expect(ordinary.checkReviewReason).not.toBe('prior_amount_unknown');
});

test('common usual-size edits refresh every materialized week without changing dated overrides or pure reads', async ({
  page,
}) => {
  await openMovement(page);
  expect(await assign(page, 1, 1)).toBe(200);
  expect((await readWeek(page, 1)).groceryItems[0].quantity).toEqual(scalarQuantity(400));
  const state = await counts(page);
  expect(
    (
      await mutate(
        page,
        '/api/schedule/servings',
        {
          referenceWeekStartDate: reference,
          weekOffset: 0,
          expectedVersion: state.version,
          defaultServings: 5,
          days: [],
        },
        'PUT'
      )
    ).status
  ).toBe(200);
  expect((await readWeek(page)).groceryItems[0].quantity).toEqual(scalarQuantity(600));
  expect((await readWeek(page, 1)).groceryItems[0].quantity).toEqual(scalarQuantity(500));
  const before = await counts(page, 1);
  expect(await counts(page, 1)).toEqual(before);
});

test('common recipe-backed Skipped keeps original quantities while its dormant count stays dated', async ({
  page,
}) => {
  await openMovement(page);
  expect((await mutate(page, '/api/schedule/day/2026-05-06/validate', { status: 3 })).status).toBe(
    200
  );
  expect((await readWeek(page)).groceryItems[0].quantity).toEqual(scalarQuantity(200));
  expect((await counts(page)).days[2].servings).toBe(6);
});
