import { test, expect } from './fixtures';
import {
  MOCK_IDS,
  builders,
  currentMonday,
  toDateStr,
  setupCommonRoutes,
  mockNonCookingSchedule,
} from './mock-api';
import type { ScheduleDays } from '../src/lib/api/generated/models';

test.beforeEach(async ({ page, baseURL }) => {
  await page.context().addCookies([
    {
      name: 'x-family-member-id',
      value: MOCK_IDS.MEMBER_ALEX,
      url: baseURL || 'http://127.0.0.1:3000',
    },
  ]);
  await page.addInitScript((id) => {
    localStorage.setItem(
      'family-storage',
      JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 })
    );
  }, MOCK_IDS.MEMBER_ALEX);
});

function emptyWeek(): ScheduleDays {
  return {
    ...(builders.scheduleDays() as any),
    weekOffset: 0,
    status: 0,
    locked: false,
    days: Array.from({ length: 7 }, (_, index) => {
      const date = currentMonday();
      date.setUTCDate(date.getUTCDate() + index);
      return {
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index],
        date: toDateStr(date),
        status: 0,
        recipe: null,
        nonCooking: null,
      };
    }),
  };
}

for (const [choice, label, message] of [
  ['non-cooking-order-in', 'Order In', null],
  ['non-cooking-eating-out', 'Eating out', null],
  ['non-cooking-mystery', 'Mystery night', null],
  ['non-cooking-other-plans', 'Supper at Grandma’s', 'Supper at Grandma’s'],
  ['non-cooking-other-plans', 'Emma’s birthday supper', 'Emma’s birthday supper'],
] as const) {
  test(`${label} stays filled through voting, lock and reload`, async ({ page }) => {
    await setupCommonRoutes(page);
    const state = await mockNonCookingSchedule(page, emptyWeek());
    await page.goto('/planner');
    const day = page.getByTestId('day-card-0');
    await day.getByTestId('plan-meal-button').click();
    await page.getByTestId('pivot-no-cooking').click();
    await page.getByTestId(choice).click();
    if (message) await page.getByTestId('non-cooking-custom-label').fill(message);
    const write = page.waitForRequest(
      (request) => request.method() === 'POST' && request.url().includes('/day/2026-05-04/validate')
    );
    await page.getByTestId('non-cooking-save').click();
    expect((await write).postDataJSON().nonCooking.kind).toBe(
      message
        ? 'custom'
        : choice === 'non-cooking-order-in'
          ? 'order_in'
          : choice === 'non-cooking-mystery'
            ? 'mystery'
            : 'eating_out'
    );
    await expect(day.getByTestId('non-cooking-indicator')).toHaveText(label);
    await page.getByTestId('ask-family-cta').click();
    await page.getByTestId('close-voting-btn').click();
    await page.reload();
    await expect(page.getByTestId('day-card-0').getByTestId('non-cooking-indicator')).toHaveText(
      label
    );
    expect(state.days?.[0].status).toBe(3);
    await page.getByTestId('day-card-0').getByTestId('ordered-in-indicator').click();
    await page.getByTestId('pivot-no-cooking').click();
    await page.getByTestId('non-cooking-clear').click();
    await expect(page.getByTestId('day-card-0').getByTestId('plan-meal-button')).toBeVisible();
  });
}

for (const [choice, kind, heading] of [
  ['non-cooking-order-in', 'order_in', 'Order In'],
  ['non-cooking-eating-out', 'eating_out', 'Eating out'],
] as const) {
  test(`${heading} note saves, reloads, edits and clears`, async ({ page }) => {
    await setupCommonRoutes(page);
    const state = await mockNonCookingSchedule(page, emptyWeek());
    await page.goto('/planner');
    const day = page.getByTestId('day-card-0');
    await day.getByTestId('plan-meal-button').click();
    await page.getByTestId('pivot-no-cooking').click();
    await page.getByTestId(choice).click();
    await expect(page.getByTestId('non-cooking-custom-label')).toHaveAccessibleName(
      'Tell the family the plan'
    );
    await page.getByTestId('non-cooking-custom-label').fill('  Luigi’s  ');
    await page.getByTestId('non-cooking-save').click();
    await expect(day.getByTestId('non-cooking-indicator')).toHaveText(heading);
    await expect(day.getByTestId('non-cooking-note')).toHaveText('Luigi’s');
    expect(state.days?.[0].nonCooking).toEqual({ kind, customLabel: 'Luigi’s' });
    await page.reload();
    await expect(day.getByTestId('non-cooking-note')).toHaveText('Luigi’s');
    await page.goto('/home');
    await expect(page.getByTestId('today-non-cooking-label')).toHaveText(heading);
    await expect(page.getByTestId('today-non-cooking-note')).toHaveText('Luigi’s');
    await page.reload();
    await expect(page.getByTestId('today-non-cooking-note')).toHaveText('Luigi’s');
    await page.getByTestId('today-non-cooking-plan').click();
    await page.getByTestId('pivot-no-cooking').click();
    await expect(page.getByTestId('non-cooking-custom-label')).toHaveValue('Luigi’s');
    await page.getByTestId('non-cooking-custom-label').fill('Try the new café');
    await page.getByTestId('non-cooking-save').click();
    await expect(day.getByTestId('non-cooking-note')).toHaveText('Try the new café');
    await day.getByTestId('ordered-in-indicator').click();
    await page.getByTestId('pivot-no-cooking').click();
    await page.getByTestId('non-cooking-custom-label').fill('');
    await page.getByTestId('non-cooking-save').click();
    await expect(day.getByTestId('non-cooking-note')).toHaveCount(0);
    await expect(day.getByTestId('non-cooking-indicator')).toHaveText(heading);
    await expect(page.getByText('No cook tonight', { exact: true })).toHaveCount(0);
  });
}

test('close and failed save retain the empty day and editable message', async ({ page }) => {
  await setupCommonRoutes(page);
  await mockNonCookingSchedule(page, emptyWeek());
  await page.goto('/planner');
  await page.getByTestId('day-card-0').getByTestId('plan-meal-button').click();
  await page.getByTestId('pivot-no-cooking').click();
  await page.getByTestId('non-cooking-other-plans').click();
  await page.getByTestId('non-cooking-custom-label').fill('Birthday supper');
  await page.getByTestId('non-cooking-eating-out').click();
  await page.getByTestId('non-cooking-other-plans').click();
  await expect(page.getByTestId('non-cooking-custom-label')).toHaveValue('Birthday supper');
  await page.route('**/api/schedule/day/*/validate', (route) =>
    route.fulfill({ status: 500, json: { status: 500, message: 'Unavailable' } })
  );
  await page.getByTestId('non-cooking-save').click();
  await expect(page.getByTestId('non-cooking-sheet').getByRole('alert')).toBeVisible();
  await expect(page.getByTestId('non-cooking-custom-label')).toHaveValue('Birthday supper');
  await expect(
    page.getByTestId('non-cooking-sheet').getByRole('button', { name: 'Cancel', exact: true })
  ).toHaveCount(0);
  await page.getByTestId('non-cooking-close').click();
  await expect(page.getByTestId('day-card-0').getByTestId('plan-meal-button')).toBeVisible();
});

for (const [kind, label, customLabel] of [
  ['order_in', 'Order In', null],
  ['eating_out', 'Eating out', null],
  ['custom', 'Emma’s birthday supper', 'Emma’s birthday supper'],
] as const) {
  test(`drag onto ${kind} swaps the skipped plan and survives reload`, async ({ page }) => {
    await page.clock.setSystemTime(new Date('2026-05-04T12:00:00Z'));
    await setupCommonRoutes(page);
    const state = emptyWeek();
    state.days![0].recipe = builders.scheduleRecipe({ name: 'Pasta' });
    state.days![1].status = 3;
    state.days![1].nonCooking = { kind, customLabel };
    await mockNonCookingSchedule(page, state);
    await page.goto('/planner');
    const source = page.getByTestId('day-card-0');
    const target = page.getByTestId('day-card-1');
    const handle = source.getByTestId('planner-drag-handle');
    await expect(page.getByTestId('reorder-group').locator('..')).toHaveCSS('transform', 'none');
    await handle.hover();
    const from = await handle.boundingBox();
    if (!from) throw new Error('Missing planner drag handle');
    const move = page.waitForRequest(
      (request) =>
        request.method() === 'POST' && new URL(request.url()).pathname === '/api/schedule/move'
    );
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await expect(handle).toHaveAttribute('data-grabbed', 'true');
    const to = await target.boundingBox();
    if (!to) throw new Error('Missing planner drop target');
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 20 });
    await page.mouse.up();
    expect((await move).postDataJSON()).toMatchObject({ fromIndex: 0, toIndex: 1 });
    await expect(source.getByTestId('non-cooking-indicator')).toHaveText(label);
    await expect(target).toContainText('Pasta');
    await page.reload();
    await expect(page.getByTestId('day-card-0').getByTestId('non-cooking-indicator')).toHaveText(
      label
    );
    expect(state.days![1].nonCooking).toBeNull();
  });
}

test('Home reconciles and reloads a custom message saved in planner', async ({ page }) => {
  await setupCommonRoutes(page);
  const state = emptyWeek();
  await mockNonCookingSchedule(page, state);
  await page.goto('/planner');
  await page.getByTestId('day-card-0').getByTestId('plan-meal-button').click();
  await page.getByTestId('pivot-no-cooking').click();
  await page.getByTestId('non-cooking-other-plans').click();
  await page.getByTestId('non-cooking-custom-label').fill('Supper at Grandma’s');
  await page.getByTestId('non-cooking-save').click();
  await expect(page.getByTestId('day-card-0').getByTestId('non-cooking-indicator')).toHaveText(
    'Supper at Grandma’s'
  );
  await page.goto('/home');
  await expect(page.getByTestId('today-non-cooking-label')).toHaveText('Supper at Grandma’s');
  await page.reload();
  await expect(page.getByTestId('today-non-cooking-label')).toHaveText('Supper at Grandma’s');
  await page.getByTestId('today-non-cooking-plan').click();
  await expect(page.getByTestId('pivot-sheet')).toContainText('Change supper plans');
  await expect(page.getByTestId('non-cooking-sheet')).toBeHidden();
  await page.getByTestId('pivot-no-cooking').click();
  await expect(page.getByTestId('non-cooking-custom-label')).toHaveValue('Supper at Grandma’s');
  await page.getByTestId('non-cooking-close').click();
  await expect(page.getByTestId('non-cooking-sheet')).toBeHidden();
  await expect(page.getByTestId('day-card-0').getByTestId('non-cooking-indicator')).toHaveText(
    'Supper at Grandma’s'
  );
});

test('Other plans stays readable and reachable on a phone', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setupCommonRoutes(page);
  await mockNonCookingSchedule(page, emptyWeek());
  await page.goto('/planner');
  await page.getByTestId('day-card-0').getByTestId('plan-meal-button').click();
  await expect(
    page.getByTestId('pivot-sheet').getByRole('heading', { name: 'Plan supper', exact: true })
  ).toBeVisible();
  await expect(page.getByTestId('pivot-no-cooking')).toContainText('Other plans');
  await expect(page.getByTestId('pivot-sheet')).toHaveCSS('opacity', '1');
  await page.screenshot({ path: testInfo.outputPath('other-plans-menu.png') });
  await page.getByTestId('pivot-no-cooking').click();
  await expect(page.getByRole('dialog')).toHaveAccessibleName('What’s the plan? Monday, May 4');
  await expect(page.getByRole('button', { name: 'Mystery night', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await expect(
    page.getByTestId('non-cooking-sheet').getByRole('group').getByRole('button').first()
  ).toHaveText('Mystery night');
  await expect(page.getByTestId('non-cooking-custom-label')).toBeHidden();
  await expect(
    page.getByTestId('non-cooking-sheet').getByRole('button', { name: 'Save', exact: true })
  ).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath('other-plans-sheet.png') });
  await page.getByTestId('non-cooking-other-plans').click();
  await page.getByTestId('non-cooking-custom-label').fill('Supper at Grandma’s');
  await page.getByTestId('non-cooking-save').click();
  await expect(page.getByTestId('non-cooking-sheet')).toBeHidden();
  await page.goto('/home');
  await expect(page.getByTestId('today-non-cooking-plan')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('other-plans-home.png') });
});

test.describe('Home local calendar day', () => {
  test.use({ timezoneId: 'America/Toronto' });

  for (const [kind, customLabel, label] of [
    ['eating_out', null, 'Eating out'],
    ['mystery', null, 'Mystery night'],
    ['custom', "Supper at mom's", "Supper at mom's"],
  ] as const) {
    test(`shows ${kind} on deployment Sunday while the browser is Monday`, async ({
      page,
      baseURL,
    }) => {
      await page.clock.setFixedTime(new Date('2026-05-11T03:30:00Z'));
      await page.context().addCookies([
        {
          name: 'wfs-test-date',
          value: '2026-05-11T03:30:00Z',
          url: baseURL || 'http://127.0.0.1:3000',
        },
      ]);
      await setupCommonRoutes(page);
      const previous = emptyWeek();
      previous.weekOffset = 0;
      previous.calendar = builders.deploymentCalendar({
        timeZone: 'America/Toronto',
        capturedAtUtc: '2026-05-11T03:30:00Z',
        today: '2026-05-10',
        currentWeekStartDate: '2026-05-04',
        referenceWeekStartDate: '2026-05-04',
        nextDayAtUtc: '2026-05-11T04:00:00Z',
      }) as any;
      previous.days![6].status = 3;
      previous.days![6].nonCooking = { kind, customLabel };
      const current = emptyWeek();
      current.days = current.days!.map((day) => {
        const date = new Date(`${day.date}T12:00:00Z`);
        date.setUTCDate(date.getUTCDate() + 7);
        return { ...day, date: toDateStr(date) };
      });
      current.days[0].status = 3;
      current.days[0].nonCooking = { kind: 'order_in', customLabel: null };
      await page.route(
        (url) => url.pathname === '/api/schedule',
        (route) => {
          const offset = new URL(route.request().url()).searchParams.get('weekOffset');
          return route.fulfill({ json: { data: offset === '0' ? previous : current } });
        }
      );
      await page.route('**/api/stream', (route) =>
        route.fulfill({
          contentType: 'text/event-stream',
          body: `event: connected\ndata: ${JSON.stringify({ schedule: previous, connectionId: 'local-calendar-test' })}\n\n`,
        })
      );
      const deploymentWeek = page.waitForRequest(
        (request) =>
          new URL(request.url()).pathname === '/api/schedule' &&
          new URL(request.url()).searchParams.get('weekOffset') === '0'
      );
      await page.goto('/home');
      await deploymentWeek;
      for (const reload of [false, true]) {
        if (reload) await page.reload();
        if (kind === 'mystery') {
          await expect(page.getByTestId('tonight-pivot-card')).toBeVisible();
          await expect(page.getByTestId('discover-btn')).toBeVisible();
          await expect(page.getByTestId('order-in-btn')).toBeVisible();
          await expect(page.getByTestId('today-non-cooking-plan')).toBeHidden();
        } else {
          await expect(page.getByTestId('today-non-cooking-label')).toHaveText(label);
          await expect(page.getByTestId('order-in-btn')).toBeHidden();
        }
      }
    });
  }
});

test('Home Order In opens the change menu with recipe and removal paths', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setupCommonRoutes(page);
  const state = emptyWeek();
  state.days![0].status = 3;
  state.days![0].nonCooking = { kind: 'order_in', customLabel: null };
  await mockNonCookingSchedule(page, state);
  await page.goto('/home');
  await page.getByTestId('today-non-cooking-plan').click();
  await expect(page.getByTestId('pivot-sheet')).toContainText('Change supper plans');
  await expect(page.getByTestId('non-cooking-sheet')).toBeHidden();
  await expect(page.getByTestId('pivot-quick-find')).toBeVisible();
  await expect(page.getByTestId('pivot-remove-recipe')).toContainText('Remove supper plan');
  await page.getByTestId('pivot-search-library').click();
  await expect(page).toHaveURL(/\/recipes\?addToDay=0&weekOffset=0/);
  await page.goto('/home');
  await page.getByTestId('today-non-cooking-plan').click();
  await page.getByTestId('pivot-remove-recipe').click();
  await expect(page.getByTestId('day-card-0').getByTestId('plan-meal-button')).toBeVisible();
  expect(state.days![0].nonCooking).toBeNull();
});

for (const removalPath of ['menu', 'editor'] as const) {
  test(`removing today's plan from the ${removalPath} updates Home without reload`, async ({
    page,
  }) => {
    await setupCommonRoutes(page);
    const state = emptyWeek();
    state.days![0].status = 3;
    state.days![0].nonCooking = { kind: 'order_in', customLabel: null };
    await mockNonCookingSchedule(page, state);
    await page.goto('/home');
    await page.getByTestId('today-non-cooking-plan').click();
    await expect(page.getByTestId('pivot-sheet')).toBeVisible();
    const removed = page.waitForResponse(
      (response) => response.request().method() === 'DELETE' && response.url().endsWith('/remove')
    );
    if (removalPath === 'editor') {
      await page.getByTestId('pivot-no-cooking').click();
      await page.getByTestId('non-cooking-clear').click();
    } else {
      await page.getByTestId('pivot-remove-recipe').click();
    }
    expect((await removed).status()).toBe(204);
    await expect(page.getByTestId('day-card-0').getByTestId('plan-meal-button')).toBeVisible();
    await page.getByTestId('nav-item-home').click();
    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByTestId('today-non-cooking-plan')).toBeHidden();
    await expect(page.getByTestId('tonight-pivot-card')).toBeVisible();
    expect(state.days![0]).toMatchObject({ status: 0, nonCooking: null });
  });
}
