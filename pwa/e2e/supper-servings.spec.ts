import { test, expect } from './fixtures';
import {
  setupCommonRoutes,
  builders,
  MOCK_IDS,
  mockNonCookingSchedule,
  mockSupperServings,
} from './mock-api';
import type { Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

async function settingsFixture(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.context().addCookies([
    {
      name: 'x-family-member-id',
      value: MOCK_IDS.MEMBER_ALEX,
      url: process.env.BASE_URL || 'http://127.0.0.1:3000',
    },
  ]);
  const control = await setupCommonRoutes(page);
  await page.goto('/profile/settings');
  const section = page.getByTestId('usual-portions-section');
  await expect(section.getByTestId('usual-portions-automatic')).toBeEnabled();
  const read = () =>
    page.evaluate(async () => {
      const response = await fetch('/api/schedule/servings?weekOffset=0');
      if (!response.ok) throw new Error(`read portions ${response.status}`);
      return (await response.json()).data as {
        version: string;
        defaultServings: number | null;
        defaultServingsSource: 'family' | 'explicit';
      };
    });
  return { control, section, read };
}

test('Settings portions use persisted family size, preserve explicit five, and reset equal-five source', async ({
  page,
}) => {
  const { section, read } = await settingsFixture(page);
  const automatic = section.getByTestId('usual-portions-automatic');
  const input = section.getByTestId('usual-portions-input');
  const save = section.getByTestId('save-usual-portions');
  await expect(automatic).toBeChecked();
  await expect(input).toHaveValue('2');
  await page.getByTestId('add-member-trigger').click();
  for (const name of ['Sam', 'Pat']) {
    await page.getByTestId('family-name-input').fill(name);
    await page.getByTestId('add-member-submit').click();
    await expect(page.getByTestId('family-name-input')).toHaveValue('');
  }
  await expect(input).toHaveValue('4');
  await automatic.uncheck();
  await input.fill('5');
  const committed = page.waitForResponse(
    (response) =>
      response.request().method() === 'PUT' &&
      new URL(response.url()).pathname === '/api/schedule/servings'
  );
  await save.click();
  const response = await committed;
  expect(response.ok()).toBe(true);
  expect(response.request().postDataJSON()).toMatchObject({ defaultServings: 5, days: [] });
  await expect(section.getByText('Saved', { exact: true })).toBeVisible();
  await page.getByTestId('family-name-input').fill('Lee');
  await page.getByTestId('add-member-submit').click();
  await expect(page.getByTestId('family-name-input')).toHaveValue('');
  await expect(input).toHaveValue('5');
  expect(await read()).toMatchObject({ defaultServingsSource: 'explicit', defaultServings: 5 });
  await page.reload();
  await expect(automatic).not.toBeChecked();
  await expect(input).toHaveValue('5');
  const before = await read();
  await automatic.check();
  await expect(save).toBeEnabled();
  await save.click();
  await expect(section.getByText('Saved', { exact: true })).toBeVisible();
  const after = await read();
  expect(after).toMatchObject({ defaultServingsSource: 'family', defaultServings: 5 });
  expect(after.version).not.toBe(before.version);
});

test('Settings portions retain invalid drafts and explicit values during roster failure', async ({
  page,
}) => {
  const { section, read } = await settingsFixture(page);
  await section.getByTestId('usual-portions-automatic').uncheck();
  const input = section.getByTestId('usual-portions-input');
  const save = section.getByTestId('save-usual-portions');
  for (const value of ['0', '-1', '1.5', '2147483648']) {
    await input.fill(value);
    await expect(input).toHaveValue(value);
    await expect(save).toBeDisabled();
  }
  await input.fill('7');
  await save.click();
  await expect(section.getByText('Saved', { exact: true })).toBeVisible();
  await page.route('**/api/family', async (route) =>
    route.request().method() === 'GET'
      ? route.fulfill({
          status: 503,
          // CI uses a cross-origin API; expose the header so Kiota can avoid backoff.
          headers: { 'Retry-After': '0', 'Access-Control-Expose-Headers': 'Retry-After' },
          json: { message: 'Roster unavailable' },
        })
      : route.fallback()
  );
  await page.reload();
  await expect(input).toHaveValue('7');
  await expect(input).toBeEnabled();
  await expect(section.getByRole('button', { name: 'Retry family list' })).toBeVisible();
  await input.fill('5');
  await save.click();
  await expect(section.getByText('Saved', { exact: true })).toBeVisible();
  expect(await read()).toMatchObject({ defaultServingsSource: 'explicit', defaultServings: 5 });
});

test('Settings portions reconcile a dropped acknowledgement without replaying a write', async ({
  page,
}) => {
  const { control, section, read } = await settingsFixture(page);
  let writes = 0;
  page.on('request', (request) => {
    if (request.method() === 'PUT' && new URL(request.url()).pathname === '/api/schedule/servings')
      writes++;
  });
  await section.getByTestId('usual-portions-automatic').uncheck();
  await section.getByTestId('usual-portions-input').fill('5');
  control.loseNextSaveReply();
  await section.getByTestId('save-usual-portions').click();
  const review = section.getByRole('button', { name: 'Review current portions' });
  await expect(review).toBeVisible();
  await expect(section.getByTestId('usual-portions-input')).toHaveValue('5');
  expect(await read()).toMatchObject({ defaultServingsSource: 'explicit', defaultServings: 5 });
  await review.click();
  await expect(section.getByText('Saved', { exact: true })).toBeVisible();
  expect(writes).toBe(1);
});

test('Settings portions protect a dirty baseline across a concurrent membership update', async ({
  page,
}) => {
  const { section, read } = await settingsFixture(page);
  await section.getByTestId('usual-portions-automatic').uncheck();
  await section.getByTestId('usual-portions-input').fill('7');
  await page.getByTestId('add-member-trigger').click();
  await page.getByTestId('family-name-input').fill('Concurrent member');
  await page.getByTestId('add-member-submit').click();
  await expect(page.getByTestId('family-name-input')).toHaveValue('');
  await expect(section.getByRole('button', { name: 'Review current portions' })).toBeVisible();
  await expect(section.getByTestId('usual-portions-input')).toHaveValue('7');
  await expect(section.getByTestId('save-usual-portions')).toBeDisabled();
  const current = await read();
  await section.getByRole('button', { name: 'Review current portions' }).click();
  await expect(section.getByText('Current saved portions: 3 (Family size)')).toBeVisible();
  const committed = page.waitForResponse(
    (response) =>
      response.request().method() === 'PUT' &&
      new URL(response.url()).pathname === '/api/schedule/servings'
  );
  await section.getByTestId('save-usual-portions').click();
  expect((await committed).request().postDataJSON()).toMatchObject({
    expectedVersion: current.version,
    defaultServings: 7,
    days: [],
  });
  await expect(section.getByText('Saved', { exact: true })).toBeVisible();
});

test('Settings portions late reads cannot replace the newest authoritative count', async ({
  page,
}) => {
  const { section } = await settingsFixture(page);
  const captured = await page.evaluate(async () =>
    (await fetch('/api/schedule/servings?weekOffset=0')).json()
  );
  let release!: () => void;
  const blocked = new Promise<void>((done) => {
    release = done;
  });
  let seen = 0;
  await page.route('**/api/schedule/servings?**', async (route) => {
    if (route.request().method() !== 'GET' || ++seen !== 1) return route.fallback();
    await blocked;
    await route.fulfill({ json: captured });
  });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect.poll(() => seen).toBeGreaterThan(0);
  await page.evaluate(async () => {
    await fetch('/api/family', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Later member' }),
    });
    window.dispatchEvent(new Event('focus'));
  });
  await expect(section.getByTestId('usual-portions-input')).toHaveValue('3');
  release();
  await expect(section.getByTestId('usual-portions-input')).toHaveValue('3');
});

test('Settings portions retain the draft after a real mock optimistic conflict', async ({
  page,
}) => {
  const { section } = await settingsFixture(page);
  await section.getByTestId('usual-portions-automatic').uncheck();
  await section.getByTestId('usual-portions-input').fill('7');
  let competed = false;
  await page.route('**/api/schedule/servings', async (route) => {
    if (route.request().method() !== 'PUT' || competed) return route.fallback();
    competed = true;
    await page.evaluate(async () => {
      const baseline = (await (await fetch('/api/schedule/servings?weekOffset=0')).json()).data;
      const other = await fetch('/api/schedule/servings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referenceWeekStartDate: baseline.referenceWeekStartDate,
          weekOffset: baseline.weekOffset,
          expectedVersion: baseline.version,
          defaultServings: 5,
          days: [],
        }),
      });
      if (!other.ok) throw new Error(`competing save ${other.status}`);
    });
    return route.fallback();
  });
  const conflict = page.waitForResponse(
    (response) =>
      response.status() === 409 && new URL(response.url()).pathname === '/api/schedule/servings'
  );
  await section.getByTestId('save-usual-portions').click();
  await conflict;
  await section.getByRole('button', { name: 'Review current portions' }).click();
  await expect(section.getByTestId('usual-portions-input')).toHaveValue('7');
  await expect(section.getByText('Current saved portions: 5 (Your chosen total)')).toBeVisible();
  await expect(section.getByTestId('save-usual-portions')).toBeEnabled();
  await expect(section.getByText('Saved', { exact: true })).toHaveCount(0);
});

test('Settings portions display an actual empty family as unavailable through the generated client', async ({
  page,
}) => {
  const { section, read } = await settingsFixture(page);
  await page.evaluate(async () => {
    const members = (await (await fetch('/api/family')).json()).data as { id: string }[];
    for (const member of members) {
      const response = await fetch(`/api/family/${member.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(`delete member ${response.status}`);
    }
    window.dispatchEvent(new Event('focus'));
  });
  expect(await read()).toMatchObject({ defaultServingsSource: 'family', defaultServings: null });
  await expect(section.getByTestId('usual-portions-input')).toHaveValue('');
  await expect(
    section.getByText('Family size is unavailable. You can set usual portions.')
  ).toBeVisible();
  await section.getByTestId('usual-portions-automatic').uncheck();
  await section.getByTestId('usual-portions-input').fill('3');
  await expect(section.getByTestId('save-usual-portions')).toBeEnabled();
});

for (const locale of ['en', 'fr'] as const) {
  test.describe(`Settings portions ${locale} layout`, () => {
    test.use({ appLocale: locale });
    test(`Settings portions localized controls fit a 320px phone and 820px tablet in ${locale}`, async ({
      page,
    }, info) => {
      const { section } = await settingsFixture(page);
      for (const width of [320, 820]) {
        await page.setViewportSize({ width, height: 844 });
        await expect(
          section.getByRole('heading', {
            name: locale === 'fr' ? 'Portions habituelles' : 'Usual portions',
          })
        ).toBeVisible();
        await section.getByTestId('usual-portions-automatic').uncheck();
        await section.getByTestId('usual-portions-input').fill('7');
        await section.getByTestId('usual-portions-input').focus();
        await expect(section.getByTestId('usual-portions-input')).toBeFocused();
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
        ).toBe(true);
        await section.getByTestId('save-usual-portions').scrollIntoViewIfNeeded();
        await section.getByTestId('save-usual-portions').click({ trial: true });
        await section.screenshot({ path: info.outputPath(`settings-${locale}-${width}.png`) });
        await section.getByTestId('usual-portions-automatic').check();
      }
    });
  });
}

test('grocery PATCH mocks retain captured reference and existing item/full-map bodies across rollover', async ({
  page,
}) => {
  await setupCommonRoutes(page);
  await page.context().addCookies([
    {
      name: 'x-family-member-id',
      value: MOCK_IDS.MEMBER_ALEX,
      url: process.env.BASE_URL || 'http://127.0.0.1:3000',
    },
  ]);
  await page.goto('/planner');
  const result = await page.evaluate(async () => {
    const write = (suffix: string, body: unknown, reference = '2026-04-27') =>
      fetch(`/api/schedule/1/grocery${suffix}?referenceWeekStartDate=${reference}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    const read = async (offset: number) =>
      (
        await (
          await fetch(`/api/schedule?weekOffset=${offset}&referenceWeekStartDate=2026-04-27`)
        ).json()
      ).data;
    const itemStatus = (await write('/item', { ingredientName: 'pasta', checked: true })).status;
    const item = await read(1);
    const mapStatus = (await write('', { oil: true, pasta: false })).status;
    const map = await read(1);
    const other = await read(2);
    const invalid = await Promise.all(
      ['/item', ''].map(
        async (suffix) =>
          (
            await write(
              suffix,
              suffix ? { ingredientName: 'bad', checked: true } : { bad: true },
              '2026-04-28'
            )
          ).status
      )
    );
    return {
      itemStatus,
      item: item.groceryState,
      mapStatus,
      map: map.groceryState,
      other: other.groceryState,
      invalid,
    };
  });
  expect(result).toEqual({
    itemStatus: 204,
    item: { pasta: true },
    mapStatus: 200,
    map: { oil: true, pasta: false },
    other: {},
    invalid: [400, 400],
  });
});

async function configureUsualInSettings(page: Page, count: number) {
  await page.goto('/profile/settings');
  await page.getByTestId('usual-portions-automatic').uncheck();
  await page.getByTestId('usual-portions-input').fill(String(count));
  await page.getByTestId('save-usual-portions').click();
  await expect(page.getByTestId('save-usual-portions')).toBeDisabled();
}

async function fixture(
  page: Page,
  fail = false,
  completeness: 'true' | 'absent' | 'null' | 'false' = 'true',
  transport: 'stream' | 'polling' = 'stream'
) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.context().addCookies([
    {
      name: 'x-family-member-id',
      value: MOCK_IDS.MEMBER_ALEX,
      url: process.env.BASE_URL || 'http://127.0.0.1:3000',
    },
  ]);
  const common = await setupCommonRoutes(page);
  const schedule = builders.scheduleDays() as any;
  schedule.days = schedule.days.map((day: any, index: number) => ({
    ...day,
    recipe:
      index === 2
        ? builders.scheduleRecipe({
            id: MOCK_IDS.RECIPE_CARBONARA,
            name: 'Original pasta for two',
            image: '',
          })
        : null,
    status: 0,
  }));
  schedule.groceryItems = [
    {
      displayName: 'pasta',
      normalizedKey: 'pasta',
      section: 'Pantry',
      quantity: 200,
      ...(completeness === 'absent'
        ? {}
        : { quantityComplete: completeness === 'null' ? null : completeness === 'true' }),
      unitText: 'g',
      recipeIds: [MOCK_IDS.RECIPE_CARBONARA],
    },
  ];
  schedule.groceryState = { pasta: true, unrelated: true };
  await mockNonCookingSchedule(page, schedule);
  if (transport === 'polling') {
    // HTTP retry acceptance uses polling; a fulfilled SSE body would reconnect/replay.
    await page.route(
      (url) => url.pathname === '/api/stream',
      (route) => route.fulfill({ status: 204 })
    );
  }
  const control = await mockSupperServings(page, () => schedule, {
    readFamilyCount: common.readFamilyCount,
    delayed: true,
    knownRecipe: {
      id: MOCK_IDS.RECIPE_CARBONARA,
      basis: 2,
      quantity: 200,
      ingredient: 'pasta',
      unit: 'g',
    },
  });
  let writes = 0;
  page.on('request', (request) => {
    if (request.method() === 'PUT' && new URL(request.url()).pathname === '/api/schedule/servings')
      writes++;
  });
  await page.goto('/planner');
  await expect(page.getByTestId('at-the-table-mode')).toBeVisible();
  await page.getByTestId('at-the-table-mode').click();
  await page.getByTestId('portion-input-2026-05-06').fill('6');
  await expect(page.getByTestId('portions-editor')).not.toContainText('Original pasta for two');
  await expect(page.getByTestId('ask-family-cta')).toBeVisible();
  await page.getByTestId('save-portions').click();
  await expect(page.getByTestId('at-the-table-mode')).toBeVisible();
  expect(writes).toBe(1);
  await page.getByTestId('grocery-tab').click();
  await expect(page.getByTestId('grocery-portions-updating')).toBeVisible();
  control.finishRefresh(fail);
  return { schedule, writes: () => writes, control };
}

test('saved portions return before refresh, then 600 g and one quiet check-reset explanation', async ({
  page,
}) => {
  const { schedule, writes } = await fixture(page);
  await expect(page.getByTestId('grocery-portions-updating')).not.toBeVisible({ timeout: 10000 });
  await expect(page.getByTestId('grocery-portions-summary')).toHaveText(
    /Shopping list updated. Items needing more are unchecked./
  );
  const aisle = page.getByRole('button', { name: /Pantry/ });
  if ((await aisle.getAttribute('aria-expanded')) === 'false') await aisle.click();
  await expect(page.getByTestId('grocery-item-quantity-hint')).toContainText('600');
  expect(schedule.groceryState.pasta).toBe(false);
  expect(schedule.groceryState.unrelated).toBe(true);
  await expect(page.getByText(/more needed|\+400/)).toHaveCount(0);
  await page.getByTestId('grocery-item-checkbox').click();
  expect(schedule.groceryState.pasta).toBe(true);
  await page.getByRole('button', { name: 'Dismiss', exact: true }).click();
  await expect(page.getByTestId('grocery-portions-summary')).toHaveCount(0);
  expect(writes()).toBe(1);
});

test('a failed grocery refresh retains saved counts and Retry does not replay the save', async ({
  page,
}) => {
  const { writes, schedule, control } = await fixture(page, true, 'true', 'polling');
  await expect(page.getByText('Portions saved. Shopping list needs updating.')).toBeVisible({
    timeout: 10000,
  });
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByTestId('grocery-portions-updating')).toBeVisible();
  control.finishRefresh();
  await expect(page.getByTestId('grocery-item-quantity-hint')).toContainText('600', {
    timeout: 10000,
  });
  expect(writes()).toBe(1);
  expect(schedule.groceryState.pasta).toBe(false);
});

async function draftFixture(
  page: Page,
  options: {
    width?: number;
    height?: number;
    status?: number;
    photo?: boolean;
    usual?: number;
  } = {}
) {
  await page.setViewportSize({ width: options.width ?? 390, height: options.height ?? 844 });
  await page.context().addCookies([
    {
      name: 'x-family-member-id',
      value: MOCK_IDS.MEMBER_ALEX,
      url: process.env.BASE_URL || 'http://127.0.0.1:3000',
    },
  ]);
  const common = await setupCommonRoutes(page);
  const schedule = builders.scheduleDays() as any;
  schedule.days = schedule.days.map((day: any, i: number) => ({
    ...day,
    recipe:
      i === 2
        ? builders.scheduleRecipe({
            name: 'A very long recipe name that never belongs in portions mode',
            image: options.photo ? `/api/recipes/${MOCK_IDS.RECIPE_LASAGNA}/hero` : '',
          })
        : null,
    status: i === 4 ? 3 : 0,
    nonCooking: i === 4 ? { kind: 'EatingOut' } : null,
  }));
  schedule.status = options.status ?? 0;
  if (options.photo)
    await page.route(`**/api/recipes/${MOCK_IDS.RECIPE_LASAGNA}/hero`, (route) =>
      route.fulfill({
        body: fs.readFileSync(path.resolve('e2e/fixtures/recipe-photos/original.webp')),
        contentType: 'image/webp',
      })
    );
  await mockNonCookingSchedule(page, schedule);
  const control = await mockSupperServings(page, () => schedule, {
    readFamilyCount: common.readFamilyCount,
  });
  if (options.usual !== undefined)
    control.restoreSnapshot({ ...control.captureSnapshot(), savedUsual: options.usual });
  const bodies: any[] = [];
  page.on('request', (request) => {
    if (request.method() === 'PUT' && new URL(request.url()).pathname === '/api/schedule/servings')
      bodies.push(request.postDataJSON());
  });
  await page.addInitScript(() => {
    const style = document.createElement('style');
    style.textContent = 'nextjs-portal{display:none}';
    document.addEventListener('DOMContentLoaded', () => document.head.append(style), {
      once: true,
    });
  });
  await page.goto('/recipes');
  await page.getByTestId('nav-item-planner').click();
  await page.getByTestId('at-the-table-mode').click();
  await expect(page.getByTestId('portion-input-2026-05-06')).toBeVisible();
  return { bodies, control, schedule };
}

test('corrects today cooked portions without reopening cooking', async ({ page }) => {
  const { schedule, control, bodies } = await draftFixture(page);
  await page.getByTestId('save-portions').click();
  schedule.calendar.today = '2026-05-06';
  schedule.days[2].status = 2;
  const snapshot = control.captureSnapshot();
  control.restoreSnapshot({ ...snapshot, overrides: [['2026-05-06', 5]] });
  await page.getByTestId('at-the-table-mode').click();
  const input = page.getByTestId('portion-input-2026-05-06');
  await expect(input).toBeEnabled();
  await expect(input).toHaveValue('5');
  await input.fill('6');
  await page.getByTestId('save-portions').click();
  await expect(page.getByTestId('at-the-table-mode')).toBeVisible();
  expect(bodies).toHaveLength(1);
  expect(bodies[0].days).toEqual([{ date: '2026-05-06', servings: 6 }]);
  expect(schedule.days[2].status).toBe(2);
});

for (const action of ['leave', 'four', 'reset'] as const) {
  test(`current cooked inherited portions ${action} preserves the saved baseline and intent`, async ({
    page,
  }) => {
    const { schedule, control, bodies } = await draftFixture(page, { usual: 4 });
    await page.getByTestId('save-portions').click();
    schedule.calendar.today = '2026-05-06';
    schedule.days[2].status = 2;
    control.restoreSnapshot({
      ...control.captureSnapshot(),
      overrides: [],
      inherited: [['2026-05-06', 5]],
    });
    await page.getByTestId('at-the-table-mode').click();
    const input = page.getByTestId('portion-input-2026-05-06');
    await expect(input).toHaveValue('5');
    await expect(page.getByTestId('reset-portions-2026-05-06')).toHaveCount(0);
    if (action === 'leave') {
      await page.getByTestId('save-portions').click();
      expect(bodies).toHaveLength(0);
    } else {
      await input.fill(action === 'reset' ? '6' : '4');
      if (action === 'reset') await page.getByTestId('reset-portions-2026-05-06').click();
      await expect(input).toHaveValue('4');
      await page.getByTestId('save-portions').click();
      await expect(page.getByTestId('at-the-table-mode')).toBeVisible();
      expect(bodies).toHaveLength(1);
      expect(bodies[0].days).toEqual([
        { date: '2026-05-06', servings: action === 'reset' ? null : 4 },
      ]);
      const stored = control.captureSnapshot();
      expect(stored.inherited.find(([date]) => date === '2026-05-06')?.[1]).toBe(4);
      control.restoreSnapshot({ ...stored, savedUsual: 6 });
    }
    await page.getByTestId('at-the-table-mode').click();
    await expect(input).toHaveValue(action === 'leave' ? '5' : '4');
    expect(schedule.days[2].status).toBe(2);
    expect(schedule.days[2].preparation ?? null).toBeNull();
  });
}

test('configured usual, sparse reset and invalid correction keep date-only drafts', async ({
  page,
}) => {
  const { bodies } = await draftFixture(page, { usual: 4 });
  await expect(page.getByTestId('portion-input-2026-05-05')).toHaveValue('4');
  await page.getByTestId('portion-input-2026-05-06').fill('6');
  await page.getByTestId('portion-input-2026-05-09').fill('2');
  await page.getByTestId('save-portions').click();
  await expect(page.getByTestId('at-the-table-mode')).toBeVisible();
  expect(bodies).toHaveLength(1);
  expect(bodies[0]).toMatchObject({
    days: [
      { date: '2026-05-06', servings: 6 },
      { date: '2026-05-09', servings: 2 },
    ],
  });
  await page.getByTestId('at-the-table-mode').click();
  await page.getByTestId('reset-portions-2026-05-06').click();
  await expect(page.getByTestId('portion-input-2026-05-06')).toHaveValue('4');
  await page.getByTestId('save-portions').click();
  await expect(page.getByTestId('at-the-table-mode')).toBeVisible();
  expect(bodies[1]).toMatchObject({ days: [{ date: '2026-05-06', servings: null }] });
  expect(bodies[1]).not.toHaveProperty('defaultServings');
  await page.getByTestId('at-the-table-mode').click();
  await page.getByTestId('portion-input-2026-05-06').fill('0');
  await expect(page.getByTestId('save-portions')).toBeDisabled();
  await page.getByTestId('portion-input-2026-05-06').fill('4');
  await page.getByTestId('save-portions').click();
  expect(bodies).toHaveLength(2);
});

test('the same absolute portions draft survives a changed reference and saves its captured offset', async ({
  page,
}) => {
  const { bodies } = await draftFixture(page);
  await page.goto('/planner?weekOffset=1&referenceWeekStartDate=2026-04-27');
  await page.getByTestId('at-the-table-mode').click();
  await page.getByTestId('portion-input-2026-05-06').fill('6');
  await expect
    .poll(() =>
      page.evaluate(() => {
        const raw = sessionStorage.getItem('wfs-portions-draft:2026-05-04');
        return raw ? JSON.parse(raw) : null;
      })
    )
    .toMatchObject({
      key: '2026-05-04',
      state: { weekOffset: 1, referenceWeekStartDate: '2026-04-27' },
      draft: { '2026-05-06': '6' },
    });
  page.once('dialog', (dialog) => dialog.accept());
  await page.goto('/planner?weekOffset=0&referenceWeekStartDate=2026-05-04');
  await test.info().attach('rollover-retained-draft', {
    body: JSON.stringify(
      await page.evaluate(() => ({ url: location.href, storage: { ...sessionStorage } }))
    ),
    contentType: 'application/json',
  });
  await expect(page.getByTestId('portions-restored')).toBeVisible();
  await expect(page.getByTestId('portion-input-2026-05-06')).toHaveValue('6');
  expect(bodies).toHaveLength(0);
  await page.getByTestId('save-portions').click();
  await expect(page.getByTestId('at-the-table-mode')).toBeVisible();
  expect(bodies).toHaveLength(1);
  expect(bodies[0]).toMatchObject({
    weekOffset: 1,
    referenceWeekStartDate: '2026-04-27',
    days: [{ date: '2026-05-06', servings: 6 }],
  });
});

test('native Back keeps the draft until explicit discard and does not trap later history', async ({
  page,
}) => {
  const { bodies } = await draftFixture(page);
  await page.getByTestId('portion-input-2026-05-06').fill('6');
  await page.goBack();
  await expect(page.getByTestId('portions-departure')).toBeVisible();
  await page.getByTestId('portions-keep-editing').click();
  await expect(page.getByTestId('portion-input-2026-05-06')).toHaveValue('6');
  await page.goBack();
  await page.getByTestId('portions-discard').click();
  await expect(page).toHaveURL(/\/recipes$/);
  expect(bodies).toHaveLength(0);
  await page.goForward();
  await expect(page).toHaveURL(/\/planner$/);
  await expect(page.getByTestId('at-the-table-mode')).toBeVisible();
});

test('reload retains the exact draft and captured baseline without an automatic save', async ({
  page,
}) => {
  const { bodies } = await draftFixture(page, { usual: 4 });
  const capturedVersion = await page.evaluate(
    async () =>
      (await (await fetch('/api/schedule/servings?referenceWeekStartDate=2026-05-04')).json()).data
        .version
  );
  await page.getByTestId('portion-input-2026-05-06').fill('6');
  page.once('dialog', (dialog) => dialog.accept());
  await page.reload();
  await expect(page.getByTestId('portions-restored')).toBeVisible();
  await expect(page.getByTestId('usual-portions')).toHaveCount(0);
  await expect(page.getByTestId('portion-input-2026-05-06')).toHaveValue('6');
  expect(bodies).toHaveLength(0);
  await page.getByTestId('save-portions').click();
  await expect(page.getByTestId('at-the-table-mode')).toBeVisible();
  expect(bodies[0]).toMatchObject({
    expectedVersion: capturedVersion,
    days: [{ date: '2026-05-06', servings: 6 }],
  });
});

for (const destination of ['week', 'grocery', 'shell', 'back'] as const) {
  test(`dirty ${destination} departure keeps editing then saves once and continues`, async ({
    page,
  }) => {
    const { bodies } = await draftFixture(page);
    await page.getByTestId('portion-input-2026-05-06').fill('6');
    const depart = async () => {
      if (destination === 'back') await page.goBack();
      else
        await page
          .getByTestId(
            destination === 'week'
              ? 'next-week'
              : destination === 'grocery'
                ? 'grocery-tab'
                : 'nav-item-recipes'
          )
          .click();
    };
    await depart();
    await expect(page.getByTestId('portions-departure')).toBeVisible();
    await page.getByTestId('portions-keep-editing').click();
    await expect(page.getByTestId('portion-input-2026-05-06')).toHaveValue('6');
    expect(bodies).toHaveLength(0);
    await depart();
    await page.getByTestId('portions-save-continue').click();
    if (destination === 'week') await expect(page).toHaveURL(/weekOffset=1/);
    else if (destination === 'grocery')
      await expect(page.getByTestId('grocery-portions-updating')).toHaveCount(0);
    else await expect(page).toHaveURL(/\/recipes$/);
    await expect(page.getByTestId('portions-editor')).toHaveCount(0);
    expect(bodies).toHaveLength(1);
    expect(bodies[0].days).toEqual([{ date: '2026-05-06', servings: 6 }]);
    if (destination === 'back') {
      await page.goForward();
      await expect(page).toHaveURL(/\/planner$/);
      await page.goBack();
      await expect(page).toHaveURL(/\/recipes$/);
    }
  });
}

test('returning to a clean draft releases native history and does not restore obsolete edits', async ({
  page,
}) => {
  const { bodies } = await draftFixture(page, { usual: 4 });
  await page.getByTestId('portion-input-2026-05-06').fill('5');
  await page.getByTestId('reset-portions-2026-05-06').click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        Object.keys(sessionStorage).filter((k) => k.startsWith('wfs-portions-draft:'))
      )
    )
    .toEqual([]);
  await page.goBack();
  await expect(page).toHaveURL(/\/recipes$/);
  await page.goForward();
  await expect(page.getByTestId('at-the-table-mode')).toBeVisible();
  expect(bodies).toHaveLength(0);
});

test('remote serving conflict retains exact drafts until explicit review and one corrected save', async ({
  page,
}) => {
  const { bodies } = await draftFixture(page, { usual: 4 });
  await page.getByTestId('portion-input-2026-05-06').fill('6');
  const remote = await page.evaluate(async () => {
    const saved = (await (await fetch('/api/schedule/servings?weekOffset=0')).json()).data;
    return (
      await fetch('/api/schedule/servings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referenceWeekStartDate: saved.referenceWeekStartDate,
          weekOffset: 0,
          expectedVersion: saved.version,
          days: [{ date: '2026-05-09', servings: 8 }],
        }),
      })
    ).status;
  });
  expect(remote).toBe(200);
  const remoteVersion = await page.evaluate(
    async () => (await (await fetch('/api/schedule/servings?weekOffset=0')).json()).data.version
  );
  await page.getByTestId('save-portions').click();
  await expect(page.getByTestId('portions-review')).toBeVisible();
  await expect(page.getByTestId('portion-input-2026-05-06')).toHaveValue('6');
  await expect(page.getByTestId('usual-portions')).toHaveCount(0);
  await expect(page.getByTestId('save-portions')).toBeDisabled();
  await page.getByTestId('portions-review').click();
  await page.getByTestId('portions-keep-draft').click();
  await expect(page.getByTestId('save-portions')).toBeEnabled();
  await expect(page.getByTestId('portion-input-2026-05-09')).toHaveValue('8');
  await expect(page.getByTestId('portion-input-2026-05-06')).toHaveValue('6');
  await page.getByTestId('save-portions').dblclick();
  await expect(page.getByTestId('at-the-table-mode')).toBeVisible();
  expect(bodies).toHaveLength(3); // remote write, rejected stale batch, one reviewed batch
  expect(bodies[2]).toMatchObject({
    expectedVersion: remoteVersion,
    days: [{ date: '2026-05-06', servings: 6 }],
  });
});

test('native reload and tab close offer browser prompt, dismiss keeps draft and accepted reload restores it', async ({
  page,
}) => {
  const { bodies } = await draftFixture(page);
  await page.getByTestId('portion-input-2026-05-06').fill('6');
  await expect.poll(() => page.evaluate(() => history.state?.portionsDraft)).toBeTruthy();
  let prompts = 0;
  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('beforeunload');
    prompts++;
    await dialog.dismiss();
  });
  await page.reload({ timeout: 2000 }).catch((error) => {
    expect(String(error)).toMatch(/aborted|timeout|Timeout/);
  });
  await expect(page.getByTestId('portion-input-2026-05-06')).toHaveValue('6');
  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('beforeunload');
    prompts++;
    await dialog.dismiss();
  });
  await page.close({ runBeforeUnload: true });
  await expect(page.getByTestId('portion-input-2026-05-06')).toHaveValue('6');
  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('beforeunload');
    prompts++;
    await dialog.accept();
  });
  await page.reload();
  await expect(page.getByTestId('portions-restored')).toBeVisible();
  expect(prompts).toBe(3);
  expect(bodies).toHaveLength(0);
});

test('keyboard numbers enforce integer bounds and reset without a premature write', async ({
  page,
}) => {
  const { bodies } = await draftFixture(page, { usual: 4 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const input = page.getByTestId('portion-input-2026-05-06');
  await input.focus();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('6');
  await expect(input).toHaveValue('6');
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('button', { name: 'More portions 2026-05-06', exact: true })
  ).toBeFocused();
  await expect(
    page.getByRole('button', { name: 'More portions 2026-05-06', exact: true })
  ).toHaveCSS('outline-style', 'solid');
  for (const invalid of ['0', '-1', '1.5', '1e2', '2147483648', '']) {
    await input.fill(invalid);
    await expect(page.getByTestId('save-portions')).toBeDisabled();
  }
  await input.fill('1');
  await expect(
    page.getByRole('button', { name: 'Fewer portions 2026-05-06', exact: true })
  ).toBeDisabled();
  await input.fill('2147483647');
  await expect(
    page.getByRole('button', { name: 'More portions 2026-05-06', exact: true })
  ).toBeDisabled();
  await expect(page.getByTestId('save-portions')).toBeEnabled();
  await input.fill('6');
  expect(await input.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(
    true
  );
  await input.focus();
  await page.setViewportSize({ width: 320, height: 390 });
  await input.scrollIntoViewIfNeeded();
  await expect(input).toBeInViewport();
  await page.getByTestId('reset-portions-2026-05-06').click();
  await expect(input).toHaveValue('4');
  expect(bodies).toHaveLength(0);
});

for (const locale of ['en', 'fr'] as const)
  test.describe(`portions rendered ${locale}`, () => {
    test.use({ appLocale: locale });
    for (const status of [0, 1, 2])
      test(`state ${status} both modes reflow with 48px targets`, async ({ page }, info) => {
        test.setTimeout(120000);
        const { bodies } = await draftFixture(page, { status, photo: true });
        const metrics: unknown[] = [];
        for (const [width, height] of [
          [320, 740],
          [390, 844],
          [844, 390],
          [834, 1112],
          [1112, 834],
        ])
          for (const scale of [1, 2]) {
            await page.setViewportSize({ width, height });
            await page.evaluate(
              (scale) => (document.documentElement.style.fontSize = `${scale * 16}px`),
              scale
            );
            await page.emulateMedia({ reducedMotion: 'reduce' });
            for (const mode of ['table', 'recipes']) {
              if (mode === 'table') {
                if (await page.getByTestId('at-the-table-mode').isVisible())
                  await page.getByTestId('at-the-table-mode').click();
                await expect(page.getByTestId('portion-input-2026-05-06')).toBeVisible();
                await expect(page.getByTestId('save-portions')).toBeEnabled();
                await expect
                  .poll(() =>
                    page
                      .getByTestId('portion-row-2026-05-06')
                      .locator('img')
                      .evaluate((img) => (img as HTMLImageElement).naturalWidth)
                  )
                  .toBeGreaterThan(0);
                await expect(page.getByTestId('portions-editor')).not.toContainText(
                  'A very long recipe name'
                );
                await expect(
                  page.getByTestId('portion-row-2026-05-08').locator('input')
                ).toHaveCount(0);
              } else await page.getByTestId('save-portions').click();
              const expectedActions =
                status === 1 ? ['nudge-family-cta', 'close-voting-btn'] : ['ask-family-cta'];
              for (const id of expectedActions) await expect(page.getByTestId(id)).toBeVisible();
              for (const id of ['ask-family-cta', 'nudge-family-cta', 'close-voting-btn'].filter(
                (id) => !expectedActions.includes(id)
              ))
                await expect(page.getByTestId(id)).toHaveCount(0);
              // Measure the settled Planner, rather than its initial spring's translated frame.
              await expect
                .poll(() =>
                  page
                    .getByTestId('portions-mode-strip')
                    .evaluate(
                      (strip) => getComputedStyle(strip.parentElement!.parentElement!).transform
                    )
                )
                .toBe('none');
              const result = await page.evaluate(() => {
                const strip = document.querySelector('[data-testid="portions-mode-strip"]')!;
                const actions = document.querySelector('[data-testid="planner-action-row"]');
                const controls = [
                  ...document.querySelectorAll(
                    '[data-testid="portions-mode-strip"] button,[data-testid="portions-editor"] button,[data-testid="portions-editor"] input,[data-testid="planner-action-row"] button,[data-testid="prev-week"],[data-testid="next-week"]'
                  ),
                ].map((el) => {
                  const b = el.getBoundingClientRect();
                  return {
                    id:
                      el.getAttribute('data-testid') ??
                      el.getAttribute('aria-label') ??
                      el.textContent,
                    width: b.width,
                    height: b.height,
                    left: b.left,
                    right: b.right,
                    clipped:
                      el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1,
                  };
                });
                return {
                  viewport: innerWidth,
                  overflow: document.documentElement.scrollWidth > innerWidth,
                  stripClearOfActions: (() => {
                    if (!actions) return true;
                    const a = strip.getBoundingClientRect();
                    const b = actions.getBoundingClientRect();
                    return a.bottom <= b.top + 1 || a.right <= b.left + 1;
                  })(),
                  controls,
                };
              });
              metrics.push({ width, height, scale, mode, ...result });
              await info.attach(`metrics-${width}-${scale}-${mode}`, {
                body: JSON.stringify(result),
                contentType: 'application/json',
              });
              expect(result.overflow).toBe(false);
              expect(result.stripClearOfActions).toBe(true);
              for (const c of result.controls) {
                expect(c.height, JSON.stringify(c)).toBeGreaterThanOrEqual(48);
                expect(c.width, JSON.stringify(c)).toBeGreaterThanOrEqual(48);
                expect(c.left, JSON.stringify(c)).toBeGreaterThanOrEqual(0);
                expect(c.right, JSON.stringify(c)).toBeLessThanOrEqual(width);
                expect(c.clipped, JSON.stringify(c)).toBe(false);
              }
              await page.screenshot({
                path: info.outputPath(`${locale}-${status}-${width}-${scale}-${mode}.png`),
                fullPage: true,
                animations: 'disabled',
                style: 'nextjs-portal{visibility:hidden}',
              });
            }
          }
        expect(bodies).toHaveLength(0);
        await info.attach('render-matrix.json', {
          body: JSON.stringify(metrics, null, 2),
          contentType: 'application/json',
        });
      });
  });

test('past and Cooked portions retain their saved values while usual portions change', async ({
  page,
}) => {
  const { schedule, bodies, control } = await draftFixture(page);
  await page.getByTestId('save-portions').click();
  control.restoreSnapshot({ ...control.captureSnapshot(), savedUsual: 5 });
  schedule.calendar.today = '2026-05-05';
  schedule.days[6].status = 2;
  await page.getByTestId('at-the-table-mode').click();
  await expect(page.getByTestId('portion-input-2026-05-04')).toBeDisabled();
  await expect(page.getByTestId('portion-input-2026-05-10')).toBeDisabled();
  await expect(page.getByTestId('portion-input-2026-05-04')).toHaveValue('');
  await expect(page.getByTestId('portion-input-2026-05-10')).toHaveValue('');
  await expect(page.getByTestId('portion-input-2026-05-06')).toHaveValue('5');
  expect(bodies).toHaveLength(0);
});

test('Ask, Nudge and Close voting remain operational without erasing the portions draft', async ({
  page,
}) => {
  const { bodies, schedule } = await draftFixture(page);
  await page.getByTestId('portion-input-2026-05-06').fill('6');
  await page.getByTestId('ask-family-cta').click();
  await expect(page.getByTestId('close-voting-btn')).toBeVisible();
  expect(schedule.status).toBe(1);
  await expect(page.getByTestId('portion-input-2026-05-06')).toHaveValue('6');
  await page.getByTestId('nudge-family-cta').click();
  await expect(page.getByTestId('planner-nudge-dialog')).toBeVisible();
  await page.getByTestId('planner-nudge-close').click();
  await expect(page.getByTestId('portion-input-2026-05-06')).toHaveValue('6');
  await page.getByTestId('close-voting-btn').click();
  await expect(page.getByTestId('close-voting-btn')).toHaveCount(0);
  expect(schedule.status).toBe(2);
  await expect(page.getByTestId('portion-input-2026-05-06')).toHaveValue('6');
  expect(bodies).toHaveLength(0);
  await page.getByTestId('save-portions').click();
  await expect(page.getByTestId('at-the-table-mode')).toBeVisible();
  expect(bodies).toHaveLength(1);
  expect(schedule.status).toBe(2);
});

test('conflict review exposes newer saved values before explicitly keeping local edits', async ({
  page,
}, info) => {
  const { bodies } = await draftFixture(page, { usual: 4 });
  await page.getByTestId('portion-input-2026-05-06').fill('6');
  await page.evaluate(async () => {
    const state = (await (await fetch('/api/schedule/servings?weekOffset=0')).json()).data;
    const response = await fetch('/api/schedule/servings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        referenceWeekStartDate: state.referenceWeekStartDate,
        weekOffset: 0,
        expectedVersion: state.version,
        defaultServings: 5,
        days: [{ date: '2026-05-06', servings: 9 }],
      }),
    });
    if (!response.ok) throw new Error('Remote fixture save failed');
  });
  const remoteVersion = await page.evaluate(
    async () => (await (await fetch('/api/schedule/servings?weekOffset=0')).json()).data.version
  );
  await page.getByTestId('save-portions').click();
  await page.getByTestId('portions-review').click();
  await expect(page.getByTestId('portions-saved-review')).toContainText('2026-05-06');
  await expect(page.getByTestId('portions-saved-review')).toContainText('Saved: 9');
  await expect(page.getByTestId('portions-saved-review')).toContainText('Your edits: 6');
  await expect(page.getByTestId('usual-portions')).toHaveCount(0);
  await expect(page.getByTestId('portion-input-2026-05-05')).toHaveValue('5');
  await expect(page.getByTestId('save-portions')).toBeDisabled();
  await expect(page.getByTestId('portion-input-2026-05-06')).toHaveValue('6');
  await page.setViewportSize({ width: 320, height: 740 });
  await page.evaluate(() => (document.documentElement.style.fontSize = '32px'));
  const recovery = page.getByTestId('portions-saved-review');
  await recovery.scrollIntoViewIfNeeded();
  expect(await recovery.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(false);
  await page.screenshot({
    path: info.outputPath('conflict-review-320-200.png'),
    fullPage: true,
    animations: 'disabled',
    style: 'nextjs-portal{visibility:hidden}',
  });
  await page.getByTestId('portions-keep-draft').click();
  await page.getByTestId('save-portions').click();
  await expect(page.getByTestId('at-the-table-mode')).toBeVisible();
  expect(bodies[2]).toMatchObject({
    expectedVersion: remoteVersion,
    days: [{ date: '2026-05-06', servings: 6 }],
  });
});

test('future-week return control retains a 48px actionable target', async ({ page }) => {
  await draftFixture(page);
  await page.getByTestId('save-portions').click();
  await page.getByTestId('next-week').click();
  const control = page.getByTestId('planner-this-week-pill');
  await expect(control).toBeVisible();
  const box = (await control.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(48);
  expect(box.width).toBeGreaterThanOrEqual(48);
  await control.click();
  await expect(page).not.toHaveURL(/weekOffset=1/);
});

for (const locale of ['en', 'fr'] as const)
  test.describe(`configured portions ${locale}`, () => {
    test.use({ appLocale: locale });
    test('four usual and Wednesday six stay compact on a phone and reflow with large text', async ({
      page,
    }, info) => {
      await draftFixture(page, { photo: true, usual: 4 });
      await page.getByTestId('portion-input-2026-05-06').fill('6');
      await page.getByTestId('save-portions').click();
      await expect(page.getByTestId('at-the-table-mode')).toBeVisible();
      await page.getByTestId('at-the-table-mode').click();
      await expect(page.getByTestId('portion-input-2026-05-06')).toHaveValue('6');
      await expect(page.getByTestId('portion-input-2026-05-05')).toHaveValue('4');
      await expect(page.getByTestId('usual-portions')).toHaveCount(0);
      const measurements: unknown[] = [];
      for (const [width, height, scale] of [
        [390, 844, 1],
        [320, 740, 2],
        [834, 1112, 1],
      ]) {
        await page.setViewportSize({ width, height });
        await page.evaluate(
          (scale) => (document.documentElement.style.fontSize = `${16 * scale}px`),
          scale
        );
        const row = page.getByTestId('portion-row-2026-05-06');
        const measure = await row.evaluate((row) => {
          const date = row.querySelector('time')!;
          const photo = row.children[1];
          const stepper = row.children[2];
          const d = date.getBoundingClientRect(),
            p = photo.getBoundingClientRect(),
            s = stepper.getBoundingClientRect();
          return {
            date: date.textContent,
            absoluteDate: date.dateTime,
            fullLabel: date.getAttribute('aria-label'),
            sameLine: Math.abs(p.top - s.top) < 30,
            ordered: d.left <= p.left && p.right <= s.left + 1,
            controls: [...row.querySelectorAll('button,input')].map((el) => {
              const b = el.getBoundingClientRect();
              return {
                left: b.left,
                right: b.right,
                width: b.width,
                height: b.height,
                clipped: el.scrollWidth > el.clientWidth + 1,
              };
            }),
          };
        });
        measurements.push({ width, height, scale, ...measure });
        expect(measure.absoluteDate).toBe('2026-05-06');
        expect(measure.fullLabel).toContain('2026-05-06');
        if (width === 390) {
          expect(measure.sameLine).toBe(true);
          expect(measure.ordered).toBe(true);
        }
        for (const c of measure.controls) {
          expect(c.width).toBeGreaterThanOrEqual(48);
          expect(c.height).toBeGreaterThanOrEqual(48);
          expect(c.left).toBeGreaterThanOrEqual(0);
          expect(c.right).toBeLessThanOrEqual(width);
          expect(c.clipped).toBe(false);
        }
        await page.screenshot({
          path: info.outputPath(`${locale}-configured-${width}-${scale}.png`),
          fullPage: true,
          animations: 'disabled',
          style: 'nextjs-portal{visibility:hidden}',
        });
      }
      await info.attach('configured-layout.json', {
        body: JSON.stringify(measurements, null, 2),
        contentType: 'application/json',
      });
    });
    test('future-week return remains reachable with 48px targets at large text', async ({
      page,
    }, info) => {
      await draftFixture(page);
      await page.getByTestId('save-portions').click();
      for (const scale of [1, 2]) {
        await page.setViewportSize({ width: 320, height: 740 });
        await page.evaluate(
          (scale) => (document.documentElement.style.fontSize = `${16 * scale}px`),
          scale
        );
        await page.getByTestId('next-week').click();
        const pill = page.getByTestId('planner-this-week-pill');
        await expect(pill).toBeVisible();
        await pill.focus();
        await expect(pill).toBeInViewport();
        const b = (await pill.boundingBox())!;
        expect(b.height).toBeGreaterThanOrEqual(48);
        expect(b.width).toBeGreaterThanOrEqual(48);
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.x + b.width).toBeLessThanOrEqual(320);
        expect(await pill.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(false);
        await page.screenshot({
          path: info.outputPath(`${locale}-return-320-${scale}.png`),
          animations: 'disabled',
          style: 'nextjs-portal{visibility:hidden}',
        });
        await page.keyboard.press('Enter');
        await expect(page).not.toHaveURL(/weekOffset=1/);
      }
    });
  });

test('proposed dated detail uses saved portions and Change day remains read-only', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const style = document.createElement('style');
    style.textContent = 'nextjs-portal{display:none}';
    document.addEventListener('DOMContentLoaded', () => document.head.append(style), {
      once: true,
    });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.context().addCookies([
    {
      name: 'x-family-member-id',
      value: MOCK_IDS.MEMBER_ALEX,
      url: process.env.BASE_URL || 'http://127.0.0.1:3000',
    },
  ]);
  const common = await setupCommonRoutes(page);
  await mockNonCookingSchedule(page, builders.scheduleDays() as any);
  await mockSupperServings(
    page,
    (offset, reference) =>
      builders.scheduleDays(
        offset,
        builders.deploymentCalendar({ referenceWeekStartDate: reference })
      ),
    {
      readFamilyCount: common.readFamilyCount,
      knownRecipe: {
        id: MOCK_IDS.RECIPE_CARBONARA,
        basis: 2,
        quantity: 200,
        ingredient: 'pasta',
        unit: 'g',
      },
    }
  );
  await page.route(`**/api/recipes/${MOCK_IDS.RECIPE_CARBONARA}`, async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    await route.fulfill({
      json: {
        recipe: builders.recipe({
          id: MOCK_IDS.RECIPE_CARBONARA,
          servings: 2,
          ingredients: ['200 g pasta'],
        }),
        updatedAt: new Date().toISOString(),
      },
    });
  });
  await page.goto('/planner');
  await configureUsualInSettings(page, 4);
  await page.goto('/planner');
  await page.getByTestId('at-the-table-mode').click();
  await page.getByTestId('portion-input-2026-05-08').fill('6');
  await page.getByTestId('save-portions').click();
  await expect(page.getByTestId('at-the-table-mode')).toBeVisible();
  const writes: string[] = [];
  page.on('request', (request) => {
    if (
      !['GET', 'HEAD'].includes(request.method()) &&
      /\/api\/(schedule|recipes)/.test(new URL(request.url()).pathname) &&
      !new URL(request.url()).pathname.endsWith('/search')
    )
      writes.push(request.url());
  });
  await page.goto(
    `/recipes?open=${MOCK_IDS.RECIPE_CARBONARA}&addToDay=2&weekOffset=0&referenceWeekStartDate=2026-05-04`
  );
  await expect(page.getByTestId('recipe-servings')).toHaveText('4 servings');
  await expect(page.getByTestId('recipe-ingredient-projection')).toContainText('400 g pasta');
  await expect(page.getByTestId('recipe-portion-context')).toHaveCount(0);
  await expect(page.getByTestId('action-add-to-day')).toContainText('May 6');
  await page.getByTestId('action-change-day').click();
  await page.getByTestId('planning-day-4').click();
  await expect(page.getByTestId('recipe-servings')).toHaveText('6 servings');
  await expect(page.getByTestId('recipe-ingredient-projection')).toContainText('600 g pasta');
  await expect(page.getByTestId('recipe-portion-context')).toHaveCount(0);
  await expect(page.getByTestId('action-add-to-day')).toContainText('May 8');
  await expect(page.getByTestId('recipe-detail-sheet').getByRole('spinbutton')).toHaveCount(0);
  await page.getByTestId('action-gear-menu').click();
  await expect(page.getByTestId('action-original-quantities')).toHaveAccessibleName(
    'View original ingredients'
  );
  await page.getByTestId('action-original-quantities').click();
  await expect(page.getByText('Original recipe: 2 servings', { exact: true })).toBeVisible();
  await expect(page.getByText('200 g pasta', { exact: true })).toBeVisible();
  expect(writes).toEqual([]);
});

test('legacy portions routes save and return without a recipe editing shortcut', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const style = document.createElement('style');
    style.textContent = 'nextjs-portal{display:none}';
    document.addEventListener('DOMContentLoaded', () => document.head.append(style), {
      once: true,
    });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.context().addCookies([
    {
      name: 'x-family-member-id',
      value: MOCK_IDS.MEMBER_ALEX,
      url: process.env.BASE_URL || 'http://127.0.0.1:3000',
    },
  ]);
  const common = await setupCommonRoutes(page);
  await mockNonCookingSchedule(page, builders.scheduleDays() as any);
  await mockSupperServings(
    page,
    (offset, reference) =>
      builders.scheduleDays(
        offset,
        builders.deploymentCalendar({ referenceWeekStartDate: reference })
      ),
    {
      readFamilyCount: common.readFamilyCount,
      knownRecipe: {
        id: MOCK_IDS.RECIPE_CARBONARA,
        basis: 2,
        quantity: 200,
        ingredient: 'pasta',
        unit: 'g',
      },
    }
  );
  await page.route(`**/api/recipes/${MOCK_IDS.RECIPE_CARBONARA}`, async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    await route.fulfill({
      json: {
        recipe: builders.recipe({
          id: MOCK_IDS.RECIPE_CARBONARA,
          servings: 2,
          ingredients: ['200 g pasta'],
        }),
        updatedAt: new Date().toISOString(),
      },
    });
  });
  await page.goto('/planner');
  await configureUsualInSettings(page, 4);
  await page.goto('/planner');
  await page.getByTestId('at-the-table-mode').click();
  await page.getByTestId('portion-input-2026-05-08').fill('6');
  await page.getByTestId('save-portions').click();
  await expect(page.getByTestId('at-the-table-mode')).toBeVisible();
  const writes: string[] = [];
  page.on('request', (request) => {
    if (
      !['GET', 'HEAD'].includes(request.method()) &&
      /\/api\/(schedule|recipes)/.test(new URL(request.url()).pathname) &&
      !new URL(request.url()).pathname.endsWith('/search')
    )
      writes.push(request.url());
  });
  await page.goto(
    `/recipes?open=${MOCK_IDS.RECIPE_CARBONARA}&addToDay=2&weekOffset=0&referenceWeekStartDate=2026-05-04`
  );
  await expect(page.getByRole('button', { name: 'Adjust portions', exact: true })).toHaveCount(0);
  await page.goto(
    `/planner?${new URLSearchParams({ planDate: '2026-05-06', weekOffset: '0', referenceWeekStartDate: '2026-05-04', portions: 'true', returnTo: `/recipes?open=${MOCK_IDS.RECIPE_CARBONARA}&addToDay=2&weekOffset=0&referenceWeekStartDate=2026-05-04` })}`
  );
  await expect(page.getByTestId('portions-editor')).toBeVisible();
  await page.getByTestId('save-portions').click();
  await expect(page.getByTestId('recipe-ingredient-projection')).toContainText('400 g pasta');
  await expect(page.getByTestId('action-add-to-day')).toContainText('May 6');
  await expect(page.getByRole('button', { name: 'Adjust portions', exact: true })).toHaveCount(0);
  await page.goto(
    `/planner?${new URLSearchParams({ planDate: '2026-05-06', weekOffset: '0', referenceWeekStartDate: '2026-05-04', portions: 'true', returnTo: `/recipes?open=${MOCK_IDS.RECIPE_CARBONARA}&addToDay=2&weekOffset=0&referenceWeekStartDate=2026-05-04` })}`
  );
  await page.getByTestId('portion-input-2026-05-06').fill('6');
  await page.getByTestId('save-portions').click();
  await expect(page.getByTestId('recipe-ingredient-projection')).toContainText('600 g pasta');
  await expect(page.getByTestId('action-add-to-day')).toContainText('May 6');
  expect(writes.filter((url) => !url.includes('/schedule/servings'))).toEqual([]);
});

test('grocery quantities identify incomplete known subtotals without warning on to-taste content', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const style = document.createElement('style');
    style.textContent = 'nextjs-portal{display:none}';
    document.addEventListener('DOMContentLoaded', () => document.head.append(style), {
      once: true,
    });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.context().addCookies([
    {
      name: 'x-family-member-id',
      value: MOCK_IDS.MEMBER_ALEX,
      url: process.env.BASE_URL || 'http://127.0.0.1:3000',
    },
  ]);
  await setupCommonRoutes(page);
  const schedule = builders.scheduleDays() as any;
  schedule.groceryItems = [
    {
      displayName: 'pasta',
      normalizedKey: 'pasta',
      section: 'Pantry',
      quantity: 400,
      unitText: 'g',
      quantityComplete: false,
      recipeIds: [MOCK_IDS.RECIPE_CARBONARA],
    },
    {
      displayName: 'current sauce',
      normalizedKey: 'current sauce',
      section: 'Pantry',
      quantity: null,
      unitText: null,
      quantityComplete: false,
      recipeIds: [MOCK_IDS.RECIPE_CARBONARA],
    },
    {
      displayName: 'salt to taste',
      normalizedKey: 'salt to taste',
      section: 'Pantry',
      quantity: null,
      unitText: null,
      quantityComplete: true,
      recipeIds: [MOCK_IDS.RECIPE_CARBONARA],
    },
  ];
  await mockNonCookingSchedule(page, schedule);
  await page.goto('/planner');
  await page.getByTestId('grocery-tab').click();
  const section = page.getByRole('button', { name: /Pantry/ });
  if ((await section.getAttribute('aria-expanded')) === 'false') await section.click();
  await expect(
    page.getByTestId('grocery-item-quantity-hint').filter({ hasText: '400 g known' })
  ).toHaveText('400 g known');
  await expect(page.getByText('Review amounts', { exact: true })).toHaveCount(0);
  await expect(page.getByTestId('grocery-amount-review')).toHaveCount(0);
  await expect(
    page.getByTestId('grocery-item-checkbox').filter({ hasText: 'salt to taste' })
  ).not.toContainText('Review amounts');
  await expect(page.getByTestId('at-the-table-mode')).toHaveCount(0);
  await expect(page.getByTestId('grocery-checklist')).toBeInViewport();
  await expect(page.getByTestId('grocery-checklist').locator('..')).toHaveCSS('opacity', '1');
  const contrast = await page
    .getByTestId('grocery-item-quantity-hint')
    .first()
    .evaluate((el) => {
      const channels = (color: string) => color.match(/[\d.]+/g)!.map(Number);
      const over = (front: number[], back: number[]) =>
        front.slice(0, 3).map((v, i) => v * (front[3] ?? 1) + back[i] * (1 - (front[3] ?? 1)));
      let background = [255, 255, 255];
      const chain: Element[] = [];
      for (let node: Element | null = el; node; node = node.parentElement) chain.unshift(node);
      for (const node of chain)
        background = over(channels(getComputedStyle(node).backgroundColor), background);
      const foreground = over(channels(getComputedStyle(el).color), background);
      const lum = (rgb: number[]) =>
        rgb
          .map((v) => {
            const c = v / 255;
            return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
          })
          .reduce((n, v, i) => n + v * [0.2126, 0.7152, 0.0722][i], 0);
      const a = lum(foreground),
        b = lum(background);
      return { foreground, background, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
    });
  expect(contrast.ratio).toBeGreaterThanOrEqual(4.5);
  fs.writeFileSync(
    test.info().outputPath('dated-review-contrast.json'),
    JSON.stringify(contrast, null, 2)
  );
  await page.getByRole('button', { name: 'Source recipes for pasta', exact: true }).click();
  const sourceLink = page.getByTestId('grocery-recipe-sources-region').getByRole('link');
  await expect(sourceLink).not.toContainText('Review recipe');
  await expect(sourceLink).toHaveAttribute(
    'href',
    `/recipes?open=${MOCK_IDS.RECIPE_CARBONARA}&reviewAmounts=true&sourceGroceryWeekOffset=0&sourceGroceryReferenceWeekStartDate=2026-05-04`
  );
  await page.screenshot({
    path: test.info().outputPath('dated-grocery-phone.png'),
  });
  await page.route(`**/api/recipes/${MOCK_IDS.RECIPE_CARBONARA}`, (route) =>
    route.fulfill({
      json: {
        recipe: builders.recipe({
          id: MOCK_IDS.RECIPE_CARBONARA,
          servings: 2,
          sourceType: 'url' as any,
          sourceUrl: 'https://example.com/pasta',
        }),
        updatedAt: '2026-05-04T12:00:00Z',
      },
    })
  );
  await sourceLink.click();
  await expect(page.getByTestId('recipe-detail-sheet')).toBeVisible();
  await expect(page.getByTestId('recipe-ingredient-projection')).toHaveCount(0);
  await expect(page.getByTestId('action-view-original')).toBeVisible();
});

test('lost portions reply survives reload and reconciles committed intent without another PUT', async ({
  page,
}) => {
  const { bodies, control } = await draftFixture(page, { usual: 4 });
  await page.getByTestId('portion-input-2026-05-06').fill('6');
  control.loseNextSaveReply();
  await page.getByTestId('save-portions').click();
  await expect(page.getByTestId('portions-review')).toBeVisible();
  expect(bodies).toHaveLength(1);
  page.once('dialog', (dialog) => dialog.accept());
  await page.reload();
  await expect(page.getByTestId('portions-restored')).toBeVisible();
  await expect(page.getByTestId('save-portions')).toBeDisabled();
  await page.getByTestId('portions-review').click();
  await expect(page.getByTestId('at-the-table-mode')).toBeVisible();
  expect(bodies).toHaveLength(1);
  const saved = await page.evaluate(
    async () =>
      (
        await (
          await fetch('/api/schedule/servings?weekOffset=0&referenceWeekStartDate=2026-05-04')
        ).json()
      ).data
  );
  expect(saved.days[2]).toMatchObject({ servings: 6, overrideServings: 6 });
  expect(saved.defaultServings).toBe(4);
  await page.getByTestId('at-the-table-mode').click();
  await expect(page.getByTestId('portion-input-2026-05-06')).toHaveValue('6');
  await page.getByTestId('save-portions').click();
  expect(bodies).toHaveLength(1);
});

for (const completeness of ['absent', 'null', 'false'] as const) {
  test(`unknown prior checked amount (${completeness}) keeps truthful review through reload and unchanged refresh`, async ({
    page,
  }) => {
    const { schedule, control, writes } = await fixture(page, false, completeness);
    await expect(page.getByTestId('grocery-portions-updating')).not.toBeVisible({ timeout: 10000 });
    expect(schedule.groceryState.pasta).toBe(true);
    expect(schedule.groceryItems[0]).toMatchObject({
      quantity: 600,
      quantityComplete: true,
      checkReviewReason: 'prior_amount_unknown',
    });
    await expect(page.getByTestId('grocery-portions-summary')).toHaveCount(0);
    const show = async () => {
      const aisle = page.getByRole('button', { name: /Pantry/ });
      if ((await aisle.getAttribute('aria-expanded')) === 'false') await aisle.click();
      await expect(page.getByTestId('grocery-item-quantity-hint')).toContainText('600');
      await expect(page.getByTestId('grocery-check-review')).toContainText(
        'Review previously checked amounts.'
      );
      await expect(page.getByText(/600.*known/)).toHaveCount(0);
    };
    await show();
    control.finishRefresh();
    await page.reload();
    await page.getByTestId('grocery-tab').click();
    await show();
    await page.getByRole('button', { name: 'Source recipes for pasta', exact: true }).click();
    await expect(page.getByTestId('grocery-recipe-sources-region').getByRole('link')).toBeVisible();
    const checkBox = await page.getByTestId('grocery-item-checkbox').boundingBox();
    const reviewBox = await page.getByTestId('grocery-amount-review').boundingBox();
    expect(checkBox!.width).toBeGreaterThanOrEqual(48);
    expect(checkBox!.height).toBeGreaterThanOrEqual(48);
    expect(reviewBox!.y).toBeGreaterThanOrEqual(checkBox!.y + checkBox!.height);
    await page.getByTestId('grocery-item-checkbox').click();
    await expect(page.getByTestId('grocery-amount-review')).toBeVisible();
    await page.getByTestId('grocery-item-checkbox').click();
    await expect(page.getByTestId('grocery-amount-review')).toHaveCount(0);
    control.finishRefresh();
    expect(schedule.groceryState).toMatchObject({ pasta: true, unrelated: true });
    expect(writes()).toBe(1);
  });
}

test('dismissed grocery notices stay quiet across two absolute weeks and remounts', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.context().addCookies([
    {
      name: 'x-family-member-id',
      value: MOCK_IDS.MEMBER_ALEX,
      url: process.env.BASE_URL || 'http://127.0.0.1:3000',
    },
  ]);
  await setupCommonRoutes(page);
  const schedules = [0, 1].map((offset) => ({
    ...builders.scheduleDays(offset),
    groceryItems: [
      {
        displayName: 'pasta',
        normalizedKey: 'pasta',
        section: 'Pantry',
        quantity: 600,
        quantityComplete: true,
        unitText: 'g',
        recipeIds: [MOCK_IDS.RECIPE_CARBONARA],
      },
    ],
    groceryState: { pasta: false },
    groceryRefresh: {
      status: 'current',
      version: `week-${offset}`,
      appliedVersion: `week-${offset}`,
      resetSummaryVersion: `reset-${offset}`,
    },
  }));
  const requestedWeeks: string[] = [];
  await page.route(
    (url) => url.pathname === '/api/schedule',
    async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      const offset = Number(new URL(route.request().url()).searchParams.get('weekOffset') ?? 0);
      const schedule = schedules[offset];
      requestedWeeks.push(schedule.weekStartDate);
      await route.fulfill({ json: { data: schedule } });
    }
  );
  const summary = page.getByTestId('grocery-portions-summary');
  const open = async () => {
    await expect(page.getByTestId('at-the-table-mode')).toBeVisible();
    await page.getByTestId('grocery-tab').click();
  };
  const dismiss = async () => {
    await expect(summary).toBeVisible();
    await summary.getByRole('button', { name: 'Dismiss' }).click();
    await expect(summary).toHaveCount(0);
  };
  await page.goto('/planner');
  await open();
  await dismiss();
  await page.getByRole('button', { name: 'Close grocery list', exact: true }).click();
  await page.getByTestId('next-week').click();
  await expect(page).toHaveURL(/weekOffset=1/);
  await open();
  await dismiss();
  await page.getByRole('button', { name: 'Close grocery list', exact: true }).click();
  await page.getByTestId('prev-week').click();
  await expect(page).toHaveURL(/\/planner$/);
  await expect(page.getByRole('heading', { name: 'May 4 — 10', exact: true })).toBeVisible();
  await open();
  await expect(summary).toHaveCount(0);
  await page.reload();
  await open();
  await expect(summary).toHaveCount(0);
  schedules[0].groceryRefresh.resetSummaryVersion = 'reset-0-new';
  await page.reload();
  await open();
  await dismiss();
  await page.reload();
  await open();
  await expect(summary).toHaveCount(0);
  expect(requestedWeeks).toEqual(expect.arrayContaining(['2026-05-04', '2026-05-11']));
});

test('actual reset events stay quiet on replay and return after a repeated input cycle', async ({
  page,
}) => {
  const { schedule, control } = await fixture(page);
  const summary = page.getByTestId('grocery-portions-summary');
  await expect(summary).toBeVisible();
  const first = schedule.groceryRefresh.resetSummaryVersion;
  await summary.getByRole('button', { name: 'Dismiss' }).click();
  await expect(summary).toHaveCount(0);
  const aisle = page.getByRole('button', { name: /Pantry/ });
  if ((await aisle.getAttribute('aria-expanded')) === 'false') await aisle.click();
  await page.getByTestId('grocery-item-checkbox').click();
  await expect.poll(() => schedule.groceryState.pasta).toBe(true);
  control.finishRefresh();
  await expect(summary).toHaveCount(0);
  const change = async (count: string) => {
    await page.getByRole('button', { name: 'Close grocery list' }).click();
    await page.getByTestId('at-the-table-mode').click();
    await page.getByTestId('portion-input-2026-05-06').fill(count);
    await page.getByTestId('save-portions').click();
    await expect(page.getByTestId('at-the-table-mode')).toBeVisible();
    await page.getByTestId('grocery-tab').click();
    control.finishRefresh();
    await expect(page.getByTestId('grocery-portions-updating')).not.toBeVisible({ timeout: 10000 });
  };
  await change('2');
  expect(schedule.groceryState.pasta).toBe(true);
  expect(schedule.groceryRefresh.resetSummaryVersion).toBeNull();
  await expect(summary).toHaveCount(0);
  await change('6');
  expect(schedule.groceryState.pasta).toBe(false);
  expect(schedule.groceryRefresh.resetSummaryVersion).not.toBe(first);
  await expect(summary).toBeVisible();
});

test.describe('prior amount review in French', () => {
  test.use({ appLocale: 'fr' });
  test('one quiet cue and complete quantity remain usable at 320 px and enlarged text', async ({
    page,
  }, info) => {
    await fixture(page, false, 'null');
    await expect(page.getByTestId('grocery-portions-updating')).not.toBeVisible({ timeout: 10000 });
    await page.setViewportSize({ width: 320, height: 844 });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '32px';
    });
    const cue = page.getByTestId('grocery-check-review');
    await expect(cue).toHaveCount(1);
    await expect(cue).toContainText('Vérifiez les quantités cochées auparavant.');
    const header = page.getByTestId('aisle-section-Pantry').getByRole('button').first();
    if ((await header.getAttribute('aria-expanded')) === 'false') await header.click();
    await expect(page.getByTestId('grocery-item-quantity-hint')).toContainText('600');
    await page.getByRole('button', { name: 'Recettes sources pour pasta', exact: true }).click();
    const checkbox = page.getByTestId('grocery-item-checkbox');
    const link = page.getByTestId('grocery-recipe-sources-region').getByRole('link');
    await link.scrollIntoViewIfNeeded();
    await expect(link).toBeInViewport({ ratio: 1 });
    await page.screenshot({ path: info.outputPath('prior-review-fr-source-320-enlarged.png') });
    await checkbox.scrollIntoViewIfNeeded();
    const viewport = await checkbox.evaluate((el) => {
      let scroll = el.parentElement;
      while (scroll && !['auto', 'scroll'].includes(getComputedStyle(scroll).overflowY))
        scroll = scroll.parentElement;
      const area = scroll!.getBoundingClientRect(),
        box = el.getBoundingClientRect();
      const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return {
        top: box.top,
        bottom: box.bottom,
        scrollTop: area.top,
        scrollBottom: area.bottom,
        ownsHit: hit === el || el.contains(hit),
      };
    });
    const measureText = () =>
      page.getByTestId('grocery-item-checkbox').evaluate((el) => {
        const measure = (selector: string) => {
          const text = el.querySelector(selector)!;
          const box = text.getBoundingClientRect();
          const range = document.createRange();
          range.selectNodeContents(text);
          const lines = Array.from(range.getClientRects()).map((r) => ({
            left: r.left,
            right: r.right,
            top: r.top,
            bottom: r.bottom,
          }));
          return {
            text: text.textContent,
            left: box.left,
            right: box.right,
            width: text.clientWidth,
            scrollWidth: text.scrollWidth,
            lines,
          };
        };
        return {
          label: measure('[data-testid="grocery-item-label"]'),
          quantity: measure('[data-testid="grocery-item-quantity-hint"]'),
        };
      });
    const textMetrics = await measureText();
    fs.writeFileSync(
      info.outputPath('prior-review-text.json'),
      JSON.stringify(textMetrics, null, 2)
    );
    const expectReadable = (metrics: typeof textMetrics) => {
      for (const text of [metrics.label, metrics.quantity]) {
        expect(text.scrollWidth).toBeLessThanOrEqual(text.width + 1);
        for (const line of text.lines) {
          expect(line.left).toBeGreaterThanOrEqual(text.left - 1);
          expect(line.right).toBeLessThanOrEqual(text.right + 1);
        }
      }
      expect(metrics.label.text).toBe('pasta');
      expect(metrics.quantity.text).toContain('600 g');
      expect(metrics.quantity.lines).toHaveLength(1);
    };
    expectReadable(textMetrics);
    const sourceText = await link.evaluate((el) => ({
      width: el.clientWidth,
      scrollWidth: el.scrollWidth,
    }));
    expect(sourceText.scrollWidth).toBeLessThanOrEqual(sourceText.width + 1);
    const footer = await page.getByTestId('grocery-extra-composer').boundingBox();
    fs.writeFileSync(
      info.outputPath('prior-review-viewport.json'),
      JSON.stringify({ viewport, footer }, null, 2)
    );
    expect(viewport.top).toBeGreaterThanOrEqual(viewport.scrollTop);
    expect(viewport.bottom).toBeLessThanOrEqual(Math.min(viewport.scrollBottom, footer!.y));
    expect(viewport.ownsHit).toBe(true);
    await expect(checkbox).toBeInViewport({ ratio: 1 });
    const check = await checkbox.boundingBox();
    const review = await page.getByTestId('grocery-amount-review').boundingBox();
    expect(check!.width).toBeGreaterThanOrEqual(48);
    expect(check!.height).toBeGreaterThanOrEqual(48);
    expect(review!.y).toBeGreaterThanOrEqual(check!.y + check!.height);
    expect(check!.x).toBeGreaterThanOrEqual(0);
    expect(check!.x + check!.width).toBeLessThanOrEqual(320);
    await page.screenshot({ path: info.outputPath('prior-review-fr-320-enlarged.png') });
    await checkbox.click();
    await expect(checkbox).toHaveAttribute('aria-checked', 'false');
    const uncheckedText = await measureText();
    expectReadable(uncheckedText);
    await checkbox.click();
    await expect(page.getByTestId('grocery-check-review')).toHaveCount(0);
    await checkbox.scrollIntoViewIfNeeded();
    await expect(checkbox).toHaveAttribute('aria-checked', 'true');
    await expect(checkbox).toBeInViewport({ ratio: 1 });
    const acknowledgedText = await measureText();
    fs.writeFileSync(
      info.outputPath('prior-review-postack-text.json'),
      JSON.stringify({ uncheckedText, acknowledgedText }, null, 2)
    );
    await page.screenshot({ path: info.outputPath('prior-review-fr-postack-320-enlarged.png') });
    expectReadable(acknowledgedText);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '16px';
    });
    const readWideStyle = () =>
      checkbox.evaluate((el) => ({
        rowPadding: getComputedStyle(el.parentElement!).paddingLeft,
        flexGrow: getComputedStyle(el).flexGrow,
        containerType: getComputedStyle(el.closest('[data-testid^="aisle-section"]')!)
          .containerType,
      }));
    await expect
      .poll(readWideStyle)
      .toEqual({ rowPadding: '16px', flexGrow: '1', containerType: 'inline-size' });
    const wideStyle = await readWideStyle();
    expectReadable(await measureText());
    fs.writeFileSync(
      info.outputPath('prior-review-wide-style.json'),
      JSON.stringify(wideStyle, null, 2)
    );
  });
});

// One continuous user journey; shared schedule/recipe/serving owners retain all writes.
for (const appLocale of ['en', 'fr'] as const) {
  test.describe(`combined supper journey ${appLocale}`, () => {
    test.use({ appLocale, reducedMotion: 'reduce' });
    for (const [width, height, enlarged, configured] of [
      [390, 844, false, true],
      [820, 1180, false, false],
      [320, 844, true, false],
    ] as const) {
      test(`${configured ? 'usual four' : 'automatic unavailable'} ${width}px ${enlarged ? '200 percent' : 'normal'} Search to prepared Friday`, async ({
        page,
      }, info) => {
        info.setTimeout(90_000);
        // Keep development tooling out of product geometry and pointer acceptance.
        await page.addInitScript(() => {
          const style = document.createElement('style');
          style.textContent = 'nextjs-portal{display:none}';
          document.addEventListener('DOMContentLoaded', () => document.head.append(style), {
            once: true,
          });
        });
        await page.setViewportSize({ width, height });
        const id = MOCK_IDS.RECIPE_SPAGHETTI;
        const reference = '2026-05-04';
        const calendar = builders.deploymentCalendar({
          today: '2026-05-05',
          capturedAtUtc: '2026-05-05T12:00:00Z',
          nextDayAtUtc: '2026-05-06T00:00:00Z',
        });
        const options = {
          delayed: false,
          knownRecipe: { id, basis: 2, quantity: 200, ingredient: 'pasta', unit: 'g' },
        };
        const control = await setupCommonRoutes(page, calendar, { supperServings: options });
        await page.context().addCookies([
          {
            name: 'x-family-member-id',
            value: MOCK_IDS.MEMBER_ALEX,
            url: process.env.BASE_URL || 'http://127.0.0.1:3000',
          },
        ]);
        await page.goto('/planner');
        if (!configured) {
          // Original/unavailable quantities require an honestly empty persisted roster now.
          // Retain the existing identity cookie, as a client can after the last member is deleted.
          const membersLeft = await page.evaluate(async () => {
            const members = (await (await fetch('/api/family')).json()).data;
            for (const member of members) {
              const response = await fetch(`/api/family/${member.id}`, { method: 'DELETE' });
              if (!response.ok) throw new Error('Could not establish empty-family fixture');
            }
            return (await (await fetch('/api/family')).json()).data;
          });
          expect(membersLeft).toEqual([]);
          await page.reload();
        }
        const candidate = builders.recipe({
          id,
          servings: 2,
          ingredients: ['200 g pasta'],
          recipeInstructions: ['Add 200 g pasta. Serve.'] as any,
          notes: 'Save some for lunch.',
          sourceType: 'url' as any,
          sourceUrl: 'https://example.com/spaghetti',
        });
        await page.evaluate(
          async ({ id, other, candidate, reference }) => {
            await fetch(`/api/recipes/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(candidate),
            });
            await fetch(`/api/schedule/assign?referenceWeekStartDate=${reference}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ weekOffset: 0, dayIndex: 1, recipeId: other }),
            });
          },
          { id, other: MOCK_IDS.RECIPE_CHICKEN, candidate, reference }
        );
        if (configured) {
          await page.reload();
          await configureUsualInSettings(page, 4);
          await page.goto('/planner');
        }
        const read = () =>
          page.evaluate(
            async (reference) =>
              (await (await fetch(`/api/schedule?referenceWeekStartDate=${reference}`)).json())
                .data,
            reference
          );
        const before = await read();
        const writes: { path: string; method: string; body: any }[] = [];
        page.on('request', (request) => {
          const pathname = new URL(request.url()).pathname;
          if (
            !['GET', 'HEAD'].includes(request.method()) &&
            /\/api\/(schedule|recipes)/.test(pathname) &&
            pathname !== '/api/recipes/search'
          )
            writes.push({ path: pathname, method: request.method(), body: request.postDataJSON() });
        });
        // Search is a read-only boundary fixture; recipe detail and all mutations use shared owners.
        await page.route('**/api/recipes/search', (route) =>
          route.fulfill({
            json: {
              data: {
                topPick: { ...candidate, isPromotionEligible: false, reasons: [] },
                results: [],
                appliedFilters: {},
                searchMode: 'explicit',
                resultPath: 'lexical-only',
                nextCursor: null,
              },
            },
          })
        );
        await page.goto(
          `/recipes?focus=search&addToDay=4&weekOffset=0&referenceWeekStartDate=${reference}`
        );
        await page.getByTestId('recipe-search-input').fill('spaghetti');
        await page.getByTestId('recipe-search-input').press('Enter');
        const card = page.getByTestId('stack-card-front');
        await expect(card).toHaveAttribute('data-recipe-id', id);
        await card.focus();
        await card.press('Enter');
        await expect(page.getByTestId('recipe-portion-context')).toHaveCount(0);
        await expect(page.getByTestId('action-add-to-day')).toContainText(
          appLocale === 'fr' ? '8 mai' : 'May 8'
        );
        await expect(page.getByTestId('recipe-ingredient-projection')).toContainText(
          configured ? '400 g pasta' : '200 g pasta'
        );
        expect(writes).toEqual([]);
        expect((await read()).days[4].recipe).toBeNull();
        await page.getByTestId('action-add-to-day').click();
        await expect(page).toHaveURL(/planner\?(?:success=1&)?dayIndex=4/);
        await expect(page.getByTestId('day-card-4')).toContainText(candidate.name!);
        expect(writes.filter((write) => write.path.endsWith('/assign'))).toHaveLength(1);
        await page.getByTestId('grocery-tab').click();
        const openPantry = async () => {
          const section = page.getByRole('button', { name: /Pantry|Épicerie/ });
          if ((await section.count()) && (await section.getAttribute('aria-expanded')) === 'false')
            await section.click();
        };
        await openPantry();
        await page.getByTestId('grocery-item-checkbox').filter({ hasText: 'pasta' }).click();
        await page.evaluate(async (reference) => {
          await fetch(`/api/schedule/0/grocery/item?referenceWeekStartDate=${reference}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ingredientName: 'unrelated', checked: true }),
          });
        }, reference);
        await page
          .getByRole('button', {
            name: appLocale === 'fr' ? 'Fermer la liste de courses' : 'Close grocery list',
            exact: true,
          })
          .click();

        const directory = test.info().outputPath('combined');
        fs.mkdirSync(directory, { recursive: true });
        const prefix = `${appLocale}-${width}-${enlarged ? '200' : '100'}`;
        const evidence: any[] = [];
        async function capture(surface: string, testid: string, labels: string, target?: string) {
          const root =
            surface === 'normal'
              ? page.getByTestId('planner-action-row').locator('..')
              : page.getByTestId(testid);
          await expect(root).toBeVisible();
          if (surface === 'normal')
            await expect
              .poll(() =>
                root.locator('..').evaluate((element) => {
                  const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform);
                  return Math.abs(matrix.m41) + Math.abs(matrix.m42);
                })
              )
              .toBeLessThan(0.1);
          if (enlarged) {
            await root.evaluate((element) => {
              const nodes = [
                element,
                ...element.querySelectorAll<HTMLElement>('*'),
              ] as HTMLElement[];
              const values = nodes.map((node) => [
                parseFloat(getComputedStyle(node).fontSize),
                parseFloat(getComputedStyle(node).lineHeight),
              ]);
              nodes.forEach((node, index) => {
                node.style.fontSize = `${values[index][0] * 2}px`;
                if (Number.isFinite(values[index][1]))
                  node.style.lineHeight = `${values[index][1] * 2}px`;
              });
            });
            // transition-all can interpolate the newly applied font sizes. Measure the final text.
            await expect
              .poll(() =>
                root.evaluate((element) =>
                  [element, ...element.querySelectorAll<HTMLElement>('*')].every((value) => {
                    const node = value as HTMLElement;
                    const computed = getComputedStyle(node);
                    return (['fontSize', 'lineHeight'] as const).every(
                      (property) =>
                        !node.style[property] ||
                        Math.abs(
                          parseFloat(computed[property]) - parseFloat(node.style[property])
                        ) < 0.1
                    );
                  })
                )
              )
              .toBe(true);
          }
          if (surface === 'partial') {
            // Quiet detail keeps the unresolved ingredient itself as ordinary reading content.
            const ingredient = root
              .getByTestId('recipe-ingredient-projection')
              .getByText('current sauce', { exact: true });
            await ingredient.evaluate((element) => element.scrollIntoView({ block: 'center' }));
            await expect
              .poll(async () => {
                const area = await root.getByTestId('recipe-detail-reading').boundingBox();
                const box = await ingredient.boundingBox();
                return (
                  area != null &&
                  box != null &&
                  box.y >= area.y &&
                  box.y + box.height <= area.y + area.height
                );
              })
              .toBe(true);
          } else if (surface === 'normal') {
            await root
              .getByTestId('portions-mode-strip')
              .evaluate((element) => element.scrollIntoView({ block: 'center' }));
          } else if (target)
            await page
              .getByTestId(target)
              .first()
              .evaluate((element) => element.scrollIntoView({ block: 'center' }));
          const dock =
            surface === 'normal' || surface === 'prepared'
              ? await page.getByTestId('app-bottom-navigation').boundingBox()
              : null;
          const metrics = await root.evaluate(
            (element, selector) => ({
              documentWidth: document.documentElement.scrollWidth,
              width: innerWidth,
              height: innerHeight,
              surfaceWidth: element.clientWidth,
              surfaceScrollWidth: element.scrollWidth,
              labels: [...element.querySelectorAll<HTMLElement>(selector)].map((label) => {
                const box = label.getBoundingClientRect();
                const range = document.createRange();
                const walker = document.createTreeWalker(label, NodeFilter.SHOW_TEXT);
                const rects: any[] = [];
                let node;
                while ((node = walker.nextNode())) {
                  if (!node.textContent?.trim()) continue;
                  range.selectNodeContents(node);
                  for (const rect of range.getClientRects())
                    rects.push({
                      left: rect.left,
                      right: rect.right,
                      top: rect.top,
                      bottom: rect.bottom,
                    });
                }
                return {
                  text: label.textContent,
                  fontSize: getComputedStyle(label).fontSize,
                  inlineFontSize: label.style.fontSize,
                  lineHeight: getComputedStyle(label).lineHeight,
                  inlineLineHeight: label.style.lineHeight,
                  left: box.left,
                  right: box.right,
                  top: box.top,
                  bottom: box.bottom,
                  clientWidth: label.clientWidth,
                  scrollWidth: label.scrollWidth,
                  clientHeight: label.clientHeight,
                  scrollHeight: label.scrollHeight,
                  rects,
                };
              }),
              scrollers: [...element.querySelectorAll<HTMLElement>('*')]
                .filter(
                  (node) =>
                    ['auto', 'scroll'].includes(getComputedStyle(node).overflowY) &&
                    node.scrollHeight > node.clientHeight
                )
                .map((node) => {
                  const original = node.scrollTop;
                  node.scrollTop = node.scrollHeight;
                  const bottom = node.scrollTop;
                  node.scrollTop = 0;
                  const top = node.scrollTop;
                  node.scrollTop = original;
                  return {
                    testid: node.dataset.testid,
                    clientHeight: node.clientHeight,
                    scrollHeight: node.scrollHeight,
                    top,
                    bottom,
                    reachedBottom: Math.abs(bottom + node.clientHeight - node.scrollHeight) <= 2,
                  };
                }),
            }),
            labels
          );
          fs.writeFileSync(
            path.join(directory, `${prefix}-${surface}-metrics.json`),
            JSON.stringify(metrics, null, 2)
          );
          expect(metrics.documentWidth).toBeLessThanOrEqual(width);
          expect(metrics.surfaceScrollWidth).toBeLessThanOrEqual(metrics.surfaceWidth + 1);
          expect(metrics.labels.length).toBeGreaterThan(0);
          for (const label of metrics.labels) {
            expect(label.rects.length, `${surface}: ${JSON.stringify(label)}`).toBeGreaterThan(0);
            expect(label.scrollWidth).toBeLessThanOrEqual(label.clientWidth + 1);
            expect(label.scrollHeight).toBeLessThanOrEqual(label.clientHeight + 1);
            for (const rect of label.rects) {
              expect(rect.left).toBeGreaterThanOrEqual(Math.max(0, label.left) - 1);
              expect(rect.right).toBeLessThanOrEqual(Math.min(label.right, width) + 1);
              expect(rect.top).toBeGreaterThanOrEqual(label.top - 1);
              expect(rect.bottom).toBeLessThanOrEqual(label.bottom + 1);
              if (surface === 'prepared' || surface === 'normal') {
                expect(rect.top).toBeGreaterThanOrEqual(0);
                expect(rect.bottom).toBeLessThanOrEqual(dock?.y ?? height);
              }
            }
          }
          for (const scroller of metrics.scrollers) {
            expect(scroller.clientHeight).toBeGreaterThan(0);
            expect(scroller.top).toBe(0);
            expect(scroller.reachedBottom).toBe(true);
          }
          evidence.push({ surface, ...metrics, dock });
          await page.screenshot({
            path: path.join(directory, `${prefix}-${surface}.png`),
            animations: 'disabled',
          });
          if (surface === 'partial') {
            await expect(root.getByTestId('recipe-instruction-limitation')).toHaveCount(0);
            const instructions = root.getByText('Add 200 g pasta. Serve.', { exact: true });
            await instructions.evaluate((element) => element.scrollIntoView({ block: 'center' }));
            const area = await root.getByTestId('recipe-detail-reading').boundingBox();
            const box = await instructions.boundingBox();
            expect(box!.y).toBeGreaterThanOrEqual(area!.y);
            expect(box!.y + box!.height).toBeLessThanOrEqual(area!.y + area!.height);
            evidence.push({ surface: 'partial-steps', area, instructions: box });
            await page.screenshot({
              path: path.join(directory, `${prefix}-partial-steps.png`),
              animations: 'disabled',
            });
          }
        }
        await expect(page.getByTestId('recipe-detail-sheet')).toHaveCount(0);
        await expect(page.getByTestId('ask-family-cta')).toBeVisible();
        await capture(
          'normal',
          'planner-page',
          '[data-testid="ask-family-cta"], [data-testid="portions-mode-strip"]'
        );
        options.delayed = true;
        await page.getByTestId('at-the-table-mode').click();
        if (!configured) await expect(page.getByTestId('portion-input-2026-05-06')).toHaveValue('');
        await page.getByTestId('portion-input-2026-05-08').fill('6');
        await expect(page.getByTestId('portions-editor')).not.toContainText(candidate.name!);
        await page.getByTestId('save-portions').click();
        await expect(page.getByTestId('portions-editor')).toHaveCount(0);
        await page.getByTestId('grocery-tab').click();
        await expect(page.getByTestId('grocery-portions-updating')).toBeVisible();
        options.delayed = false;
        control.finishRefresh();
        await expect(page.getByTestId('grocery-portions-updating')).toHaveCount(0, {
          timeout: 10000,
        });
        await openPantry();
        await expect(
          page.getByTestId('grocery-item-quantity-hint').filter({ hasText: '600' })
        ).toContainText('600 g');
        await expect(
          page.getByTestId('grocery-item-quantity-hint').filter({ hasText: '600' })
        ).toBeVisible();
        await expect(page.getByTestId('grocery-portions-summary')).toHaveCount(1);
        const scaled = await read();
        expect(scaled.groceryState.pasta).toBe(false);
        expect(scaled.groceryState.unrelated).toBe(true);
        await capture(
          'shopping',
          'grocery-checklist',
          '[data-testid="grocery-portions-summary"], [data-testid="grocery-item-quantity-hint"]',
          'grocery-item-quantity-hint'
        );
        await page
          .getByRole('button', {
            name: appLocale === 'fr' ? 'Fermer la liste de courses' : 'Close grocery list',
            exact: true,
          })
          .click();
        await page.getByTestId('day-card-4').getByTestId('edit-recipe-button').click();
        await page.getByTestId('action-cooks-mode').click();
        await expect(page.getByTestId('cooking-portion-context')).toContainText('6 portions');
        await expect(page.getByTestId('cooks-mode-overlay')).toContainText('600 g pasta');
        await page.getByTestId('cooks-mode-step-next').click();
        await expect(page.getByTestId('cooks-mode-overlay')).toContainText(
          'Add 200 g pasta. Serve.'
        );
        await expect(page.getByTestId('cooking-instruction-limitation')).toHaveCount(1);
        await page
          .getByRole('button', {
            name:
              appLocale === 'fr' ? 'Marquer la recette comme cuisinée' : 'Mark recipe as cooked',
          })
          .click();
        await expect(page.getByTestId('cooks-mode-overlay')).toHaveCount(0);
        const prepared = await read();
        expect(prepared.days[1]).toEqual(before.days[1]);
        expect(prepared.days[4].preparation).toMatchObject({
          preparedOn: '2026-05-05',
          servings: 6,
          originalServings: 2,
        });
        expect(writes.filter((write) => write.path.endsWith('/prepare'))).toHaveLength(1);
        Object.assign(calendar, {
          today: '2026-05-08',
          capturedAtUtc: '2026-05-08T12:00:00Z',
          nextDayAtUtc: '2026-05-09T00:00:00Z',
        });
        await page.goto('/planner');
        await expect(page.getByTestId('recipe-detail-sheet')).toHaveCount(0);
        await expect(page.getByTestId('day-card-4')).toContainText(
          appLocale === 'fr' ? 'Déjà préparé' : 'Already prepared'
        );
        await capture(
          'prepared',
          'day-card-4',
          '[data-testid="preparation-status"]',
          'preparation-status'
        );
        await page.getByTestId('day-card-4').getByTestId('edit-recipe-button').click();
        await page.getByTestId('action-cooks-mode').click();
        await expect(page.getByTestId('cooking-portion-context')).toContainText('6 portions');
        await expect(
          page.getByTestId('cooks-mode-overlay').getByTestId('preparation-status')
        ).toContainText(appLocale === 'fr' ? 'mardi' : 'Tuesday');
        await page.getByTestId('cooks-mode-step-next').click();
        await expect(
          page.getByRole('button', {
            name:
              appLocale === 'fr' ? 'Marquer la recette comme cuisinée' : 'Mark recipe as cooked',
          })
        ).toHaveCount(0);
        await page.getByTestId('close-cooks-mode').click();
        // Presentation-only partial response; real amount/coherence math is separately covered by API/PostgreSQL.
        const projectionPattern = `**/api/recipes/${id}/ingredient-projection*`;
        const partial = await page.evaluate(
          async ({ id, occurrence }) =>
            (
              await fetch(
                `/api/recipes/${id}/ingredient-projection?supperDate=2026-05-08&context=assigned&occurrenceId=${occurrence}`
              )
            ).json(),
          { id, occurrence: prepared.days[4].occurrenceId }
        );
        partial.status = 'partial';
        partial.lines.push({
          originalText: 'current sauce',
          name: 'current sauce',
          quantity: null,
          unitText: null,
          status: 'unresolved',
          issues: ['unreliable_amount'],
        });
        await page.route(projectionPattern, (route) => route.fulfill({ json: partial }));
        await page.getByTestId('action-close-sheet').click();
        await page.getByTestId('day-card-4').getByTestId('edit-recipe-button').click();
        await expect(page.getByTestId('recipe-ingredient-projection')).toContainText(
          'current sauce'
        );
        await expect(page.getByTestId('recipe-ingredient-projection')).toContainText('600 g pasta');
        await expect(page.getByTestId('recipe-detail-sheet')).not.toContainText(
          appLocale === 'fr' ? 'Certaines quantités' : 'Some amounts need review'
        );
        for (const affordance of [
          'action-set-goto',
          'recipe-family-notes-shortcut',
          'action-view-original',
        ]) {
          const action = page.getByTestId('recipe-detail-sheet').getByTestId(affordance);
          await action.evaluate((element) => element.scrollIntoView({ block: 'center' }));
          await expect(action).toBeInViewport();
        }
        await capture(
          'partial',
          'recipe-detail-sheet',
          '[data-testid="recipe-ingredient-projection"], #recipe-instructions-heading',
          'recipe-ingredient-projection'
        );
        await page.unroute(projectionPattern);
        const final = await page.evaluate(
          async ({ id, reference }) => ({
            recipe: (await (await fetch(`/api/recipes/${id}`)).json()).recipe,
            servings: (
              await (
                await fetch(`/api/schedule/servings?referenceWeekStartDate=${reference}`)
              ).json()
            ).data,
          }),
          { id, reference }
        );
        expect(final.recipe.servings).toBe(2);
        expect(final.recipe.ingredients).toEqual(['200 g pasta']);
        expect(final.servings.defaultServings).toBe(configured ? 4 : null);
        expect(final.servings.defaultServingsSource).toBe(configured ? 'explicit' : 'family');
        expect(writes.filter((write) => write.path.endsWith('/assign'))).toHaveLength(1);
        expect(writes.filter((write) => write.path.endsWith('/prepare'))).toHaveLength(1);
        fs.writeFileSync(
          path.join(directory, `${prefix}-metrics.json`),
          JSON.stringify({ configured, evidence, writes, final }, null, 2)
        );
      });
    }
  });
}
