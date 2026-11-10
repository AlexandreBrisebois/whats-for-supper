import {
  scalarQuantity,
  fixtureGroceryId,
  fixtureGroceryChecks,
} from '../src/testing/grocery-fixtures';
/**
 * E2E — Grocery List: PATCH failure behaviour
 *
 * Verifies that a PATCH failure on a grocery toggle:
 *   1. Reverts only the single toggled item (not all items)
 *   2. Shows a per-item error indicator (AlertCircle) on the reverted item
 *   3. Does NOT show a global spinner blocking all items
 */

import { test, expect } from './fixtures';
import {
  MOCK_IDS,
  builders,
  currentMonday,
  toDateStr,
  setupCommonRoutes,
  mockSseWithConnectedSchedule,
  mockSseWithGroceryUpdated,
  mockSseWithWeekUpdate,
} from './mock-api';

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
});

test('known unitless amounts preserve shopping rows and source disclosure without writes', async ({
  page,
  baseURL,
}) => {
  const { groceryRows } = await setupCommonRoutes(page);
  await page
    .context()
    .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseURL! }]);
  const snapshot = {
    ...builders.scheduleDays(),
    groceryItems: builders.groceryItems(['Garlic', 'Salt']).map((row, index) => ({
      ...row,
      quantity: scalarQuantity(index === 0 ? 0 : 2),
      unitText: index === 0 ? null : '   ',
      quantityComplete: index === 0,
      recipeIds: [MOCK_IDS.RECIPE_LASAGNA],
    })),
  };
  snapshot.days[0].recipe = builders.scheduleRecipe({
    id: MOCK_IDS.RECIPE_LASAGNA,
    name: 'Family lasagna',
  });
  groceryRows.decorate(snapshot);
  // Seed an accepted check through the existing row owner; decoration alone
  // intentionally starts new rows unchecked.
  const checked = groceryRows.mutate(snapshot.weekStartDate, 'item', {
    rowId: snapshot.groceryItems[1].rowId,
    weekStartDate: snapshot.weekStartDate,
    expectedRowVersion: snapshot.groceryItems[1].rowVersion,
    checked: true,
    clientMutationId: '04000000-0000-4000-8000-000000000099',
  });
  expect(checked.status).toBe(200);
  Object.assign(snapshot, groceryRows.snapshot(snapshot.weekStartDate));
  const before = structuredClone(snapshot);
  const writes: string[] = [];
  page.on('request', (request) => {
    if (
      new URL(request.url()).pathname.startsWith('/api/') &&
      !['GET', 'HEAD'].includes(request.method())
    )
      writes.push(`${request.method()} ${new URL(request.url()).pathname}`);
  });
  await page.route(
    (url) => url.pathname === '/api/schedule',
    (route) => route.fulfill({ json: { data: snapshot } })
  );
  await mockSseWithConnectedSchedule(
    page,
    snapshot as unknown as Parameters<typeof mockSseWithConnectedSchedule>[1]
  );
  await page.goto('/planner?tab=grocery');
  await page.getByTestId('grocery-tab').click();
  await expect(page.getByTestId('grocery-item-checkbox')).toHaveCount(2);
  const salt = page.locator(`[data-row-id="${snapshot.groceryItems[1].rowId}"]`);
  await expect(salt).toHaveAttribute('aria-checked', 'true');
  await expect(
    page.getByTestId('grocery-item-quantity-hint').filter({ hasText: /^\(0\)$/ })
  ).toHaveCount(1);
  await expect(
    page.getByTestId('grocery-item-quantity-hint').filter({ hasText: /^2 known$/ })
  ).toHaveCount(1);
  await page.getByRole('button', { name: 'Source recipes for Salt', exact: true }).click();
  await expect(
    page.getByTestId('grocery-recipe-sources-region').getByRole('link', { name: 'Family lasagna' })
  ).toBeVisible();
  await expect(salt).toHaveAttribute('aria-checked', 'true');
  await expect(
    page.getByTestId('aisle-section-Pantry').getByTestId('grocery-item-checkbox')
  ).toHaveCount(2);
  expect(snapshot).toEqual(before);
  expect(writes).toEqual([]);
});

test('opaque water row controls remain independent from other buckets and the extra', async ({
  page,
}) => {
  const { groceryRows } = await setupCommonRoutes(page);
  const ids = [
    '04000000-0000-4000-8000-000000000001',
    '04000000-0000-4000-8000-000000000002',
    '04000000-0000-4000-8000-000000000003',
  ];
  const week = '2026-05-04';
  const snapshot = {
    ...builders.scheduleDays(),
    groceryListVersion: '1',
    groceryState: {},
    groceryItems: ids.map((rowId, index) => ({
      rowId,
      rowVersion: '1',
      weekStartDate: week,
      source: 'recipe',
      displayName: 'Water',
      normalizedKey: 'water',
      section: 'Produce',
      demandIdentity: `legacy-water-${index}`,
      quantity: null,
      quantityComplete: false,
      unitText: ['g', 'ml', 'bottle'][index],
      recipeIds: [MOCK_IDS.RECIPE_LASAGNA],
    })),
    groceryExtras: [
      {
        id: '04000000-0000-4000-8000-000000000004',
        lineageId: '04000000-0000-4000-8000-000000000005',
        occurrenceWeekStartDate: week,
        name: 'Water',
        normalizedKey: 'water',
        grocerySection: 'Produce',
        checked: false,
        version: 1,
        source: 'extra',
        readOnly: false,
      },
    ],
  };
  await page.context().addCookies([
    {
      name: 'x-family-member-id',
      value: MOCK_IDS.MEMBER_ALEX,
      url: process.env.BASE_URL || 'http://127.0.0.1:3000',
    },
  ]);
  await page.route(
    (url) => url.pathname === '/api/schedule',
    (route) => route.fulfill({ json: { data: snapshot } })
  );
  groceryRows.decorate(snapshot);
  let submitted: Record<string, unknown> | undefined;
  await page.route('**/api/schedule/*/grocery/item**', async (route) => {
    submitted = route.request().postDataJSON();
    const result = groceryRows.mutate(week, 'item', submitted);
    Object.assign(snapshot, groceryRows.snapshot(week));
    await route.fulfill(result);
  });
  await mockSseWithConnectedSchedule(page, snapshot as any);
  await page.goto('/planner?tab=grocery');
  await page.getByTestId('grocery-tab').click();
  const recipeControls = page.getByTestId('grocery-item-checkbox');
  await expect(recipeControls).toHaveCount(3);
  await expect(page.getByRole('checkbox', { name: /Water/ })).toHaveCount(4);
  await recipeControls.nth(1).click();
  await expect.poll(() => submitted?.rowId).toBe(ids[1]);
  await expect(page.getByRole('checkbox', { name: /Water/, checked: true })).toHaveCount(1);
  await expect(page.getByTestId('grocery-extra-checkbox')).toHaveAttribute('aria-checked', 'false');
  await expect.poll(() => groceryRows.snapshot(week).groceryState[ids[1]]).toBe(true);
  const checked = structuredClone(groceryRows.snapshot(week));
  const selected = page.locator(`[data-row-id="${ids[1]}"]`);
  await selected.click();
  await expect.poll(() => groceryRows.snapshot(week).groceryState[ids[1]]).toBe(false);
  await expect(selected).toHaveAttribute('aria-checked', 'false');
  const reread = page.waitForResponse(
    (response) => new URL(response.url()).pathname === '/api/schedule'
  );
  await page.evaluate((older) => {
    (window as any).__sseSource?.dispatchEvent(
      new MessageEvent('grocery_updated', {
        data: JSON.stringify({ type: 'grocery_updated', weekOffset: 0, ...older }),
      })
    );
  }, checked);
  await reread;
  await expect(selected).toHaveAttribute('aria-checked', 'false');
  await page.reload();
  await page.getByTestId('grocery-tab').click();
  await expect(page.locator(`[data-row-id="${ids[1]}"]`)).toHaveAttribute('aria-checked', 'false');
});

test('common check mocks guard rows, replay retries and fence stale bulk on reread', async ({
  page,
}) => {
  await setupGroceryPage(page);
  const observed = await page.evaluate(async () => {
    const read = async () => (await (await fetch('/api/schedule?weekOffset=0')).json()).data;
    const initial = await read();
    const ids = initial.groceryItems.slice(0, 2).map((row: any) => row.rowId);
    const item = (body: any) =>
      fetch('/api/schedule/0/grocery/item', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    const request = (id: string) => ({
      rowId: id,
      weekStartDate: initial.weekStartDate,
      expectedRowVersion: '1',
      checked: true,
      clientMutationId: crypto.randomUUID(),
    });
    const first = request(ids[0]);
    const statuses = (await Promise.all([item(first), item(request(ids[1]))])).map(
      (response) => response.status
    );
    const after = await read();
    const replay = await (await item(first)).json();
    const staleItem = (
      await item({ ...first, checked: false, clientMutationId: crypto.randomUUID() })
    ).status;
    const named = (await item({ ingredientName: 'Pasta', checked: true })).status;
    const bulk = (version: string) =>
      fetch('/api/schedule/0/grocery', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekStartDate: initial.weekStartDate,
          expectedListVersion: version,
          checks: {},
          clientMutationId: crypto.randomUUID(),
        }),
      });
    const staleBulk = (await bulk(initial.groceryListVersion)).status;
    const clear = await bulk(after.groceryListVersion);
    const final = await read();
    return {
      statuses,
      both: ids.every((id: string) => after.groceryState[id]),
      replayed: replay.rowId === first.rowId,
      staleItem,
      staleBulk,
      named,
      clear: clear.status,
      cleared: Object.values(final.groceryState).every((value) => value === false),
      count: final.groceryItems.length,
    };
  });
  expect(observed).toEqual({
    statuses: [200, 200],
    both: true,
    replayed: true,
    staleItem: 409,
    staleBulk: 409,
    named: 409,
    clear: 200,
    cleared: true,
    count: 4,
  });
});

test('a held item save leaves another row usable and failure reverts only that item', async ({
  page,
}) => {
  await setupGroceryPage(page);
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let started!: () => void;
  const pending = new Promise<void>((resolve) => {
    started = resolve;
  });
  await page.route('**/api/schedule/*/grocery/item**', async (route) => {
    if (route.request().method() !== 'PATCH') return route.fallback();
    if (route.request().postDataJSON().rowId === fixtureGroceryId('Pasta')) {
      started();
      await held;
      await route.fulfill({ status: 500, json: { message: 'Save failed' } });
    } else await route.fallback();
  });
  const pasta = page.getByTestId('grocery-item-checkbox').filter({ hasText: 'Pasta' });
  const beef = page.getByTestId('grocery-item-checkbox').filter({ hasText: 'Beef' });
  await pasta.click();
  await pending;
  await expect(pasta).toHaveAttribute('aria-checked', 'true');
  await beef.click();
  await expect(beef).toHaveAttribute('aria-checked', 'true');
  release();
  await expect(pasta).toHaveAttribute('aria-checked', 'false');
  await expect(pasta.getByTestId('grocery-item-error')).toBeVisible();
  await expect(beef).toHaveAttribute('aria-checked', 'true');
});

test('queued same-row intents reconcile after a lost reply without crossing navigation', async ({
  page,
}) => {
  const { groceryRows } = await setupGroceryPage(page);
  const week = '2026-05-04';
  const pastaId = fixtureGroceryId('Pasta');
  const beefId = fixtureGroceryId('Beef');
  let firstStarted!: () => void,
    secondStarted!: () => void,
    releaseFirst!: () => void,
    releaseSecond!: () => void;
  const firstPending = new Promise<void>((resolve) => {
    firstStarted = resolve;
  });
  const secondPending = new Promise<void>((resolve) => {
    secondStarted = resolve;
  });
  const firstHeld = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });
  const secondHeld = new Promise<void>((resolve) => {
    releaseSecond = resolve;
  });
  const requests: any[] = [];
  await page.route('**/api/schedule/*/grocery/item**', async (route) => {
    const body = route.request().postDataJSON();
    if (body.rowId !== pastaId) return route.fallback();
    requests.push(body);
    const result = groceryRows.mutate(week, 'item', body);
    if (requests.length === 1) {
      firstStarted();
      await firstHeld;
      await route.abort('connectionreset');
    } else {
      secondStarted();
      await secondHeld;
      await route.fulfill(result).catch(() => {});
    }
  });
  const pasta = page.locator(`[data-row-id="${pastaId}"]`);
  const beef = page.locator(`[data-row-id="${beefId}"]`);
  try {
    await pasta.click();
    await test.step('First write starts', () => firstPending, { timeout: 5000 });
    await pasta.click();
    await beef.click();
    await expect.poll(() => groceryRows.snapshot(week).groceryState[beefId]).toBe(true);
    expect(requests).toHaveLength(1);
    releaseFirst();
    await test.step('Queued write starts after reread', () => secondPending, { timeout: 5000 });
    expect(requests[1].expectedRowVersion).toBe('2');
    expect(requests[1].clientMutationId).not.toBe(requests[0].clientMutationId);
    expect(requests[1].weekStartDate).toBe(week);
    // A failed older intention is obsolete while the next intention is pending.
    await test.step(
      'Flush the optimistic render',
      () =>
        page.evaluate(
          () =>
            new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
        ),
      { timeout: 2000 }
    );
    await expect(page.getByTestId('grocery-item-error')).toHaveCount(0, { timeout: 100 });
    await test.step(
      'Navigate while the reply is held',
      async () => {
        await page.getByRole('button', { name: 'Close grocery list', exact: true }).click();
        await page.getByTestId('next-week').click();
      },
      { timeout: 5000 }
    );
    await expect(page.getByRole('heading', { name: 'May 11 — 17', exact: true })).toBeVisible();
    const reply = page.waitForResponse(
      (response) =>
        response.url().includes('/grocery/item') &&
        response.request().postDataJSON().clientMutationId === requests[1].clientMutationId
    );
    releaseSecond();
    await reply;
    await expect.poll(() => groceryRows.snapshot(week).groceryState[pastaId]).toBe(false);
    expect(
      Object.values(groceryRows.snapshot('2026-05-11').groceryState).every(
        (value) => value === false
      )
    ).toBe(true);
    await page.getByRole('button', { name: 'Previous week', exact: true }).click();
    await page.getByTestId('grocery-tab').click();
    await expect(pasta).toHaveAttribute('aria-checked', 'false');
    await expect(beef).toHaveAttribute('aria-checked', 'true');
  } finally {
    releaseFirst();
    releaseSecond();
  }
});

async function setupGroceryPage(
  page: import('@playwright/test').Page,
  options: { empty?: boolean; milk?: boolean } = {}
) {
  const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
  await page
    .context()
    .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);

  const { groceryRows } = await setupCommonRoutes(page);

  // Override schedule to return a week with one recipe that has known ingredients
  const monday = currentMonday();
  const GROCERY_INGREDIENTS = options.empty
    ? []
    : options.milk
      ? ['Milk']
      : ['Pasta', 'Beef', 'Tomato Sauce', 'Cheese'];
  const GROCERY_SECTION_MAP: Record<string, string> = {
    Milk: 'Dairy & Eggs',
    Pasta: 'Pantry',
    Beef: 'Meat',
    'Tomato Sauce': 'Pantry',
    Cheese: 'Dairy & Eggs',
  };
  const categoryOverrides: Record<string, string> = {};
  const groceryExtras: Array<Record<string, unknown>> = [];
  const weekStartForOffset = (offset: number) => {
    const date = new Date('2026-05-04T12:00:00Z');
    date.setUTCDate(date.getUTCDate() + offset * 7);
    return toDateStr(date);
  };
  const currentGroceryItems = () =>
    builders.groceryItems(
      GROCERY_INGREDIENTS,
      Object.fromEntries(
        Object.entries(GROCERY_SECTION_MAP).map(([name, section]) => [
          name,
          categoryOverrides[name.toLowerCase().replace(/\s+/g, '_')] ?? section,
        ])
      )
    );
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    return {
      day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      date: toDateStr(d),
      recipe:
        i === 0 && !options.empty
          ? builders.scheduleRecipe({
              id: MOCK_IDS.RECIPE_LASAGNA,
              name: 'Homemade Lasagna',
              ingredients: GROCERY_INGREDIENTS,
            })
          : null,
      status: 0,
    };
  });

  await page.route(
    (url) => url.pathname === '/api/schedule',
    async (route) => {
      if (route.request().method() === 'GET') {
        const offset = Number(new URL(route.request().url()).searchParams.get('weekOffset') ?? 0);
        const selectedWeekStartDate = weekStartForOffset(offset);
        const selectedDays = days.map((day) => {
          const date = new Date(`${day.date}T12:00:00Z`);
          date.setUTCDate(date.getUTCDate() + offset * 7);
          return { ...day, date: toDateStr(date) };
        });
        const selectedExtras =
          offset === 0
            ? groceryExtras
            : offset > 0
              ? groceryExtras.filter((extra) => extra.checked !== true)
              : offset === -1
                ? [
                    {
                      id: '33333333-3333-4333-8333-333333333333',
                      lineageId: '33333333-3333-4333-8333-333333333333',
                      name: 'Toilet paper',
                      normalizedKey: 'toilet paper',
                      grocerySection: 'Grocery',
                      checked: true,
                      occurrenceWeekStartDate: selectedWeekStartDate,
                      readOnly: true,
                      source: 'extra',
                      version: 1,
                    },
                  ]
                : [];
        const data = {
          weekOffset: offset,
          calendar: builders.deploymentCalendar(),
          weekStartDate: selectedWeekStartDate,
          locked: false,
          status: 0,
          days: selectedDays,
          groceryItems: currentGroceryItems(),
          groceryExtras: selectedExtras,
        };
        groceryRows.decorate(data);
        await route.fulfill({ status: 200, json: { data } });
      } else {
        await route.fallback();
      }
    }
  );
  await page.route(
    (url) => /^\/api\/grocery-extras\/[^/]+$/.test(url.pathname),
    async (route) => {
      const id = new URL(route.request().url()).pathname.split('/').at(-1);
      const index = groceryExtras.findIndex((extra) => extra.id === id);
      if (index < 0) return route.fulfill({ status: 404 });
      if (route.request().method() === 'DELETE') {
        groceryExtras.splice(index, 1);
        return route.fulfill({ status: 204 });
      }
      if (route.request().method() !== 'PATCH') return route.fallback();
      const change = route.request().postDataJSON() as Record<string, unknown>;
      const current = groceryExtras[index];
      const updated = {
        ...current,
        ...Object.fromEntries(
          ['name', 'checked', 'grocerySection']
            .filter((key) => change[key] !== undefined)
            .map((key) => [key, change[key]])
        ),
        version: Number(current.version) + 1,
      };
      groceryExtras[index] = updated;
      await route.fulfill({ status: 200, json: updated });
    }
  );

  await page.route('**/api/ingredients/*/category', async (route) => {
    const normalizedKey = decodeURIComponent(
      new URL(route.request().url()).pathname.split('/').at(-2) ?? ''
    );
    const body = route.request().postDataJSON() as { grocerySection?: string };
    if (body.grocerySection) categoryOverrides[normalizedKey] = body.grocerySection;
    await route.fulfill({ status: 204 });
  });

  await page.route(
    (url) => url.pathname === '/api/grocery-extras',
    async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      const body = route.request().postDataJSON() as {
        clientId: string;
        name: string;
        weekStartDate: string;
      };
      const extra = {
        id: body.clientId,
        lineageId: body.clientId,
        name: body.name.trim(),
        normalizedKey: body.name.trim().toLowerCase(),
        grocerySection: 'Grocery',
        checked: false,
        occurrenceWeekStartDate: body.weekStartDate,
        readOnly: false,
        source: 'extra',
        version: 1,
      };
      groceryExtras.push(extra);
      await route.fulfill({ status: 201, json: extra });
    }
  );

  const connected = {
    weekOffset: 0,
    calendar: builders.deploymentCalendar(),
    weekStartDate: '2026-05-04',
    locked: false,
    status: 0,
    days,
    groceryItems: currentGroceryItems(),
    groceryExtras,
  };
  groceryRows.decorate(connected);
  await mockSseWithConnectedSchedule(page, connected as any);

  await page.goto('/planner');
  await expect(page.getByTestId('day-card-0')).toBeVisible({ timeout: 10_000 });

  // Switch to the grocery tab
  await page.getByTestId('grocery-tab').click();
  await expect(page.getByTestId('grocery-checklist')).toBeVisible({ timeout: 10_000 });
  if (!options.empty && !options.milk)
    await expect(page.getByTestId('aisle-section-Meat')).toBeVisible();

  return { categoryOverrides, groceryExtras, groceryRows };
}

for (const appLocale of ['en', 'fr'] as const) {
  test.describe(`shopping control continuity ${appLocale}`, () => {
    test.use({ appLocale, hasTouch: true });
    for (const width of [390, 768, 320]) {
      for (const action of ['pointer', 'touch', 'Enter', 'Space'] as const) {
        if (width === 320 && (action === 'pointer' || action === 'touch')) continue;
        test(`${action} keeps extra focus and viewport at ${width}px`, async ({ page }) => {
          const { groceryExtras } = await setupGroceryPage(page);
          await page.setViewportSize({ width, height: 700 });
          if (width === 320) await page.addStyleTag({ content: 'html { font-size: 200%; }' });
          for (let index = 0; index < 14; index++)
            groceryExtras.push({
              ...builders.groceryExtra({
                id: `05000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
                name: `Shopping extra ${index}`,
                normalizedKey: `extra-${index}`,
                grocerySection: 'Grocery',
                checked: false,
              }),
            });
          await page.reload();
          await page.getByTestId('grocery-tab').click();
          if (width === 320) await page.addStyleTag({ content: 'html { font-size: 200%; }' });
          const row = page.locator('[data-extra-id="05000000-0000-4000-8000-000000000004"]');
          const check = row.getByTestId('grocery-extra-checkbox');
          await check.scrollIntoViewIfNeeded();
          const scroll = page.getByTestId('grocery-checklist').locator('.overflow-y-auto').first();
          await check.focus();
          // Pointer actionability may scroll before activation. Capture the real
          // shopper's viewport at click dispatch, before React changes the list.
          await check.evaluate((element) =>
            element.addEventListener(
              'click',
              () => {
                (window as any).__checkStartScroll = element
                  .closest('[data-testid="grocery-checklist"]')!
                  .querySelector('.overflow-y-auto')!.scrollTop;
              },
              { capture: true, once: true }
            )
          );
          let writes = 0;
          page.on('request', (request) => {
            if (
              request.method() === 'PATCH' &&
              new URL(request.url()).pathname ===
                '/api/grocery-extras/05000000-0000-4000-8000-000000000004'
            )
              writes++;
          });
          const saved = page.waitForResponse(
            (response) =>
              response.request().method() === 'PATCH' &&
              new URL(response.url()).pathname ===
                '/api/grocery-extras/05000000-0000-4000-8000-000000000004'
          );
          if (action === 'pointer') await check.click();
          else if (action === 'touch') await check.tap();
          else await check.press(action);
          await saved;
          await expect(check).toHaveAttribute('aria-checked', 'true');
          await expect(row.getByRole('status')).toHaveCount(0);
          if (action === 'Enter' || action === 'Space') await expect(check).toBeFocused();
          await expect(row.getByRole('button').last()).not.toBeFocused();
          const before = await page.evaluate(() => (window as any).__checkStartScroll as number);
          expect(before).toEqual(expect.any(Number));
          expect(
            Math.abs((await scroll.evaluate((element) => element.scrollTop)) - before)
          ).toBeLessThanOrEqual(1);
          expect(writes).toBe(1);
          await expect(page.getByRole('group', { name: /Choose section|Choisir/ })).toHaveCount(0);

          const normal = page.getByTestId('grocery-item-checkbox').filter({ hasText: 'Pasta' });
          await normal.scrollIntoViewIfNeeded();
          await normal.focus();
          await normal.evaluate(
            (element, eventType) => {
              (window as any).__normalCheckNode = element;
              element.addEventListener(
                eventType,
                () => {
                  (window as any).__normalStartScroll = element
                    .closest('[data-testid="grocery-checklist"]')!
                    .querySelector('.overflow-y-auto')!.scrollTop;
                },
                { capture: true, once: true }
              );
            },
            action === 'Enter' || action === 'Space' ? 'keydown' : 'click'
          );
          const normalSaved = page.waitForResponse(
            (response) =>
              response.request().method() === 'PATCH' &&
              /\/grocery\/item$/.test(new URL(response.url()).pathname)
          );
          if (action === 'pointer') await normal.click();
          else if (action === 'touch') await normal.tap();
          else await normal.press(action);
          await normalSaved;
          await expect(normal).toHaveAttribute('aria-checked', 'true');
          if (action === 'Enter' || action === 'Space') await expect(normal).toBeFocused();
          expect(
            await normal.evaluate((element) => element === (window as any).__normalCheckNode)
          ).toBe(true);
          const normalBefore = await page.evaluate(
            () => (window as any).__normalStartScroll as number
          );
          expect(
            Math.abs((await scroll.evaluate((element) => element.scrollTop)) - normalBefore)
          ).toBeLessThanOrEqual(1);
          expect(
            await page
              .getByTestId('aisle-section-Pantry')
              .getByTestId('grocery-item-label')
              .allTextContents()
          ).toEqual(['Tomato Sauce', 'Pasta']);
        });
      }
    }

    test('category tags share placement while normal and extra scopes stay distinct', async ({
      page,
    }, testInfo) => {
      const { groceryExtras } = await setupGroceryPage(page);
      for (const suffix of ['31', '32'])
        groceryExtras.push({
          ...builders.groceryExtra({
            id: `05000000-0000-4000-8000-0000000000${suffix}`,
            name: 'Pasta',
            normalizedKey: 'pasta',
            grocerySection: 'Pantry',
            checked: false,
          }),
        });
      await page.reload();
      await page.getByTestId('grocery-tab').click();
      const normal = page
        .getByTestId('reclassify-btn')
        .filter({ has: page.locator('svg') })
        .and(page.locator('[data-item-name="Pasta"]'));
      const extra = page.locator('[data-extra-id="05000000-0000-4000-8000-000000000031"]');
      const other = page.locator('[data-extra-id="05000000-0000-4000-8000-000000000032"]');
      const label = appLocale === 'en' ? 'Change section for Pasta' : 'Changer le rayon pour Pasta';
      const extraTag = extra.getByRole('button', { name: label });
      await expect(normal).toHaveAccessibleName(label);
      for (const tag of [normal, extraTag]) {
        const box = await tag.evaluate((element) => {
          const button = element.getBoundingClientRect();
          const icon = element.querySelector('svg')!.getBoundingClientRect();
          const check = element
            .parentElement!.querySelector('[role="checkbox"] svg')!
            .getBoundingClientRect();
          return {
            width: icon.width,
            offset: Math.abs(icon.x + icon.width / 2 - button.x - button.width / 2),
            target: button.width,
            alignment: Math.abs(check.y + check.height / 2 - icon.y - icon.height / 2),
          };
        });
        expect(box.width).toBe(16);
        expect(box.offset).toBeLessThanOrEqual(1);
        expect(box.target).toBeGreaterThanOrEqual(44);
        expect(box.alignment).toBeLessThanOrEqual(1);
      }
      const writes: string[] = [];
      page.on('request', (request) => {
        if (request.method() === 'PATCH') writes.push(new URL(request.url()).pathname);
      });
      await normal.click();
      await page.getByTestId('section-picker').getByTestId('section-option-Pantry').click();
      await expect(page.getByTestId('section-picker')).toHaveCount(0);
      await extraTag.click();
      await page
        .getByRole('group', { name: appLocale === 'en' ? 'Choose section' : 'Choisir le rayon' })
        .getByRole('button', { name: appLocale === 'en' ? 'Pantry' : 'Épicerie', exact: true })
        .click();
      expect(writes).toHaveLength(0);
      await normal.click();
      await page.getByTestId('section-option-Produce').click();
      await expect(
        page.getByTestId('aisle-section-Produce').getByTestId('grocery-item-label')
      ).toHaveText('Pasta');
      await expect(page.getByTestId('aisle-section-Pantry').locator('[data-extra-id]')).toHaveCount(
        2
      );
      await extraTag.click();
      await page.getByRole('group').getByRole('button', { name: 'Produce', exact: true }).click();
      await expect(
        page.getByTestId('aisle-section-Produce').locator('[data-extra-id]')
      ).toHaveCount(1);
      await expect(other).toBeVisible();
      expect(writes).toEqual([
        '/api/ingredients/pasta/category',
        '/api/grocery-extras/05000000-0000-4000-8000-000000000031',
      ]);
      await page.screenshot({ path: testInfo.outputPath('category-parity.png') });
    });

    for (const empty of [false, true]) {
      for (const key of ['Enter', 'Space'] as const) {
        test(`future disappearance keeps local ${empty ? 'empty-list' : 'adjacent-row'} focus with ${key}`, async ({
          page,
        }) => {
          const { groceryExtras } = await setupGroceryPage(page, { empty });
          const coffee = builders.groceryExtra({
            id: '05000000-0000-4000-8000-000000000021',
            name: 'Coffee',
            normalizedKey: 'coffee',
            checked: false,
          });
          groceryExtras.push({ ...coffee });
          if (!empty)
            groceryExtras.push({
              ...builders.groceryExtra({
                id: '05000000-0000-4000-8000-000000000022',
                name: 'Tea',
                normalizedKey: 'tea',
                checked: false,
              }),
            });
          await page.reload();
          await page.getByTestId('grocery-tab').click();
          const checklist = page.getByTestId('grocery-checklist');
          const close = checklist.getByRole('button', {
            name: appLocale === 'en' ? 'Close grocery list' : 'Fermer la liste de courses',
          });
          await close.click();
          await expect(checklist).toHaveCount(0);
          await page.getByTestId('next-week').click();
          await expect(page).toHaveURL(/weekOffset=1/);
          await page.getByTestId('grocery-tab').click();
          const check = page.locator(`[data-extra-id="${coffee.id}"]`).getByRole('checkbox');
          await check.focus();
          const scroll = checklist.locator('.overflow-y-auto').first();
          const before = await scroll.evaluate((element) => element.scrollTop);
          const saved = page.waitForResponse(
            (response) =>
              response.request().method() === 'PATCH' &&
              new URL(response.url()).pathname === `/api/grocery-extras/${coffee.id}`
          );
          await check.press(key);
          await saved;
          await expect(check).toHaveCount(0);
          const fallback = empty
            ? checklist.getByRole('heading', { level: 2 })
            : page
                .locator('[data-extra-id="05000000-0000-4000-8000-000000000022"]')
                .getByRole('checkbox');
          await expect(fallback).toBeFocused();
          expect(
            Math.abs((await scroll.evaluate((element) => element.scrollTop)) - before)
          ).toBeLessThanOrEqual(1);
        });
      }
    }
  });
}

test.describe('Grocery List — everyday extras', () => {
  test('checked extras follow unchecked rows in their section after check, uncheck, and reload', async ({
    page,
  }) => {
    const { groceryExtras } = await setupGroceryPage(page);
    const checkedId = '11111111-1111-4111-8111-111111111111';
    const toggledId = '22222222-2222-4222-8222-222222222222';
    const extra = (id: string, name: string, checked: boolean) => ({
      id,
      lineageId: id,
      name,
      normalizedKey: name.toLowerCase(),
      grocerySection: 'Pantry',
      checked,
      occurrenceWeekStartDate: '2026-05-04',
      readOnly: false,
      source: 'extra',
      version: 1,
    });
    groceryExtras.push(extra(checkedId, 'Jam', true), extra(toggledId, 'Tea', false));
    const pantryRows = page.locator('#aisle-items-pantry > div');
    const names = () =>
      pantryRows.evaluateAll((rows) =>
        rows.map(
          (row) =>
            row.querySelector('[data-testid="grocery-extra-name"]')?.textContent ??
            row.querySelector('[data-testid="grocery-item-label"]')?.textContent
        )
      );
    const tea = page.locator(`[data-testid="grocery-extra-row"][data-extra-id="${toggledId}"]`);

    await page.reload();
    await page.getByTestId('grocery-tab').click();
    await expect.poll(names).toEqual(['Tea', 'Pasta', 'Tomato Sauce', 'Jam']);
    await tea.getByRole('checkbox').click();
    await expect(tea.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true');
    await expect.poll(names).toEqual(['Pasta', 'Tomato Sauce', 'Jam', 'Tea']);
    await expect(tea.getByRole('checkbox')).toBeEnabled();
    await page.reload();
    await page.getByTestId('grocery-tab').click();
    await expect.poll(names).toEqual(['Pasta', 'Tomato Sauce', 'Jam', 'Tea']);
    await tea.getByRole('checkbox').click();
    await expect.poll(names).toEqual(['Tea', 'Pasta', 'Tomato Sauce', 'Jam']);
  });

  test('source viewport policy survives hydration and composer refocus', async ({ page }) => {
    const documentResponse = page.waitForResponse(
      (response) =>
        response.request().isNavigationRequest() && new URL(response.url()).pathname === '/planner'
    );
    await setupGroceryPage(page);
    const html = await (await documentResponse).text();
    const viewportTags = html.match(/<meta\b[^>]*name="viewport"[^>]*>/g);
    expect(viewportTags).toHaveLength(1);
    expect(viewportTags![0]).toContain('interactive-widget=resizes-content');

    // Reaching the grocery tab exercises hydrated React controls. Desktop focus
    // cycles check metadata ownership, not physical Android keyboard geometry.
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveCount(1);
    const content = await viewport.getAttribute('content');
    expect(content).toContain('interactive-widget=resizes-content');
    const input = page.getByTestId('grocery-extra-composer').getByRole('combobox');
    await input.fill('Viewport fixture');
    await expect(input).toBeFocused();
    await input.blur();
    await input.focus();
    await expect(input).toBeFocused();
    await expect(viewport).toHaveCount(1);
    await expect(viewport).toHaveAttribute('content', content!);
    await page.reload();
    await expect(viewport).toHaveCount(1);
    await expect(viewport).toHaveAttribute('content', content!);
  });

  test('adds a distinct extra from the bottom composer and preserves it after reload', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 500 });
    await setupGroceryPage(page);
    const composer = page.getByTestId('grocery-extra-composer');
    await expect(composer).toBeVisible();
    const input = composer.getByRole('combobox');
    await input.fill('Coffee');
    await composer.getByRole('button', { name: 'Add' }).click();
    const toast = page.getByTestId('toast');
    await expect(toast).toContainText('Saved to Grocery');
    await expect(toast).toBeInViewport();
    await expect(input).toBeFocused();
    await expect
      .poll(() =>
        toast.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          const topmost = document.elementFromPoint(
            bounds.left + bounds.width / 2,
            bounds.top + bounds.height / 2
          );
          return topmost === element || element.contains(topmost);
        })
      )
      .toBe(true);
    await expect(page.getByTestId('grocery-extra-row')).toContainText('Coffee');
    await expect(page.getByTestId('grocery-extra-row').getByText('Extra')).toBeVisible();

    await page.reload();
    await expect(page.getByTestId('day-card-0')).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('grocery-tab').click();
    await expect(page.getByTestId('grocery-extra-row')).toContainText('Coffee');
  });

  test('saved-section toast follows the keyboard-panned viewport without blurring the composer', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 500 });
    await page.addInitScript(() => {
      const viewport = Object.assign(new EventTarget(), { offsetTop: 0 });
      Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });
    });
    await setupGroceryPage(page);
    const input = page.getByRole('combobox', { name: 'Add an extra' });
    await input.fill('Coffee');
    await input.evaluate((element) => {
      element.addEventListener('blur', () => element.setAttribute('data-blurred', 'true'));
      Object.assign(window.visualViewport!, { offsetTop: 160 });
      window.visualViewport!.dispatchEvent(new Event('scroll'));
    });
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    const toast = page.getByTestId('toast');
    await expect(toast).toContainText('Saved to Grocery');
    await expect.poll(async () => (await toast.boundingBox())?.y ?? 0).toBeGreaterThanOrEqual(176);
    await expect(input).toBeFocused();
    await expect(input).not.toHaveAttribute('data-blurred', 'true');
    await expect(toast).toBeInViewport();
    await page.screenshot({ path: '../.task/grocery-extras-completion/keyboard-panned-toast.png' });
  });

  test('common stateful mocks preserve explicit add, replay, suggestions and authoritative conflicts', async ({
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
    const result = await page.evaluate(async (id) => {
      const call = async (path: string, method = 'GET', body?: unknown) => {
        const response = await fetch(path, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: body ? JSON.stringify(body) : undefined,
        });
        return {
          status: response.status,
          body: response.status === 204 ? null : await response.json(),
        };
      };
      const create = { clientId: id, weekStartDate: '2026-05-04', name: 'Coffee' };
      const first = await call('/api/grocery-extras', 'POST', create);
      const replay = await call('/api/grocery-extras', 'POST', create);
      const checked = await call(`/api/grocery-extras/${id}`, 'PATCH', {
        weekStartDate: '2026-05-04',
        expectedVersion: 1,
        checked: true,
      });
      const suggestions = await call('/api/grocery-extras/suggestions?query=co');
      const stale = await call(`/api/grocery-extras/${id}`, 'PATCH', {
        weekStartDate: '2026-05-04',
        expectedVersion: 1,
        name: 'Stale',
      });
      const wrongWeek = await call(`/api/grocery-extras/${id}`, 'PATCH', {
        weekStartDate: '2026-05-11',
        expectedVersion: 2,
        name: 'Wrong week',
      });
      return { first, replay, checked, suggestions, stale, wrongWeek };
    }, MOCK_IDS.GROCERY_EXTRA);
    expect(result.first.status).toBe(201);
    expect(result.replay.status).toBe(200);
    expect(result.checked.status).toBe(200);
    expect(result.suggestions).toEqual({ status: 200, body: { names: ['Coffee'] } });
    expect(result.stale.status).toBe(409);
    expect(result.stale.body.current.version).toBe(2);
    expect(result.wrongWeek.status).toBe(409);
  });

  test('free text survives lookup and add failures and deliberate duplicates remain independent', async ({
    page,
  }) => {
    await setupGroceryPage(page);
    await page.route('**/api/grocery-extras/suggestions*', (route) =>
      route.fulfill({ status: 502 })
    );
    const input = page.getByRole('combobox', { name: 'Add an extra' });
    const add = page.getByRole('button', { name: 'Add', exact: true });
    await input.fill('Milk');
    await expect(page.getByTestId('grocery-extra-composer').getByRole('alert')).toContainText(
      'Suggestions are unavailable'
    );
    const failAdd = (route: import('@playwright/test').Route) => route.fulfill({ status: 502 });
    await page.route('**/api/grocery-extras', failAdd);
    await add.click();
    await expect(page.getByTestId('grocery-extra-composer').getByRole('alert')).toContainText(
      'Could not add'
    );
    await expect(input).toHaveValue('Milk');
    await page.unroute('**/api/grocery-extras', failAdd);
    await add.click();
    await expect(input).toHaveValue('');
    await input.fill('Milk');
    await input.press('Enter');
    await expect(input).toHaveValue('');
    await expect(page.getByTestId('grocery-extra-row')).toHaveCount(2);
  });

  test('stale suggestions cannot replace newer input and choosing a name requires explicit Add', async ({
    page,
  }) => {
    await setupGroceryPage(page);
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/api/grocery-extras/suggestions*', async (route) => {
      const query = new URL(route.request().url()).searchParams.get('query');
      if (query === 'co') await held;
      await route.fulfill({ json: { names: query === 'co' ? ['Coffee'] : ['Milk bags'] } });
    });
    const input = page.getByRole('combobox', { name: 'Add an extra' });
    await input.fill('co');
    await page.waitForRequest((request) => request.url().includes('suggestions?query=co'));
    await input.fill('mi');
    await expect(page.getByRole('option')).toHaveText('Milk bags');
    release();
    await expect(page.getByRole('option')).toHaveText('Milk bags');
    await page.getByRole('option').getByRole('button').click();
    await expect(input).toHaveValue('Milk bags');
    await expect(input).toBeFocused();
    await expect(page.getByTestId('grocery-extra-row')).toHaveCount(0);
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByTestId('grocery-extra-row')).toContainText('Milk bags');
  });

  test('adds without a meal plan and persists the extra after reload', async ({ page }) => {
    await setupGroceryPage(page, { empty: true });
    await expect(page.getByTestId('grocery-item-checkbox')).toHaveCount(0);
    await page.getByRole('combobox').fill('Coffee');
    await page.getByRole('combobox').press('Enter');
    await expect(page.getByTestId('grocery-extra-row')).toContainText('Coffee');
    await page.reload();
    await page.getByTestId('grocery-tab').click();
    await expect(page.getByTestId('grocery-extra-row')).toContainText('Coffee');
  });

  test('keyboard checks keep duplicate extras independent from recipe Milk and failed delete recovers', async ({
    page,
  }) => {
    const { groceryExtras } = await setupGroceryPage(page, { milk: true });
    for (let index = 0; index < 2; index++) {
      await page.getByRole('combobox').fill('Milk');
      await page.getByRole('button', { name: 'Add', exact: true }).click();
      await expect(page.getByRole('combobox')).toHaveValue('');
    }
    const rows = page.getByTestId('grocery-extra-row');
    await expect(rows).toHaveCount(2);
    const firstId = groceryExtras[0].id as string;
    const secondId = groceryExtras[1].id as string;
    const first = page.locator(`[data-testid="grocery-extra-row"][data-extra-id="${firstId}"]`);
    const second = page.locator(`[data-testid="grocery-extra-row"][data-extra-id="${secondId}"]`);
    await first.getByRole('checkbox').press('Space');
    await expect(first.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true');
    await expect(second.getByRole('checkbox')).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByTestId('grocery-item-checkbox')).toHaveAttribute(
      'aria-checked',
      'false'
    );
    // aria-checked is optimistic; wait for the first save before the next activation.
    await expect(first.getByRole('checkbox')).toBeEnabled();
    await first.getByRole('checkbox').press('Enter');
    await expect(first.getByRole('checkbox')).toHaveAttribute('aria-checked', 'false');
    await first.getByRole('button', { name: 'Edit Milk' }).click();
    await expect(first.getByRole('button', { name: 'Cancel' })).toHaveCount(0);
    await first.getByRole('textbox', { name: 'Extra name' }).fill('Oat milk');
    await first.getByRole('button', { name: 'Save', exact: true }).press('Enter');
    await expect(first).toContainText('Oat milk');
    await page.route('**/api/grocery-extras/*', (route) =>
      route.request().method() === 'DELETE' ? route.fulfill({ status: 502 }) : route.fallback()
    );
    await first.getByRole('button', { name: 'Edit Oat milk' }).click();
    await first.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(rows).toHaveCount(2);
    await expect(page.getByTestId('grocery-checklist').getByRole('alert')).toContainText(
      'Could not save'
    );
    await expect(page.getByTestId('grocery-item-checkbox')).toHaveAttribute(
      'aria-checked',
      'false'
    );
  });

  test('pending add leaves shopping usable and retains entry focus through completion', async ({
    page,
  }) => {
    await setupGroceryPage(page);
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/api/grocery-extras', async (route) => {
      await held;
      await route.fallback();
    });
    const input = page.getByRole('combobox');
    await input.fill('Coffee');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Adding…' })).toBeDisabled();
    await expect(input).toBeFocused();
    await expect(page.getByTestId('grocery-item-checkbox').first()).not.toBeDisabled();
    release();
    await expect(input).toHaveValue('');
    await expect(input).toBeFocused();
    await expect(page.getByTestId('grocery-extra-row')).toContainText('Coffee');
  });

  test('composer and upward tray remain reachable at the narrow supported viewport', async ({
    page,
  }) => {
    await setupGroceryPage(page);
    await page.route('**/api/grocery-extras/suggestions*', async (route) => {
      await route.fulfill({
        status: 200,
        json: { names: ['Coffee beans', 'Coffee filters', 'Coffee cream'] },
      });
    });
    await page.setViewportSize({ width: 320, height: 500 });
    const composer = page.getByTestId('grocery-extra-composer');
    const input = composer.getByRole('combobox');
    await input.focus();
    await input.evaluate((element) => {
      const inputElement = element as HTMLInputElement;
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      valueSetter?.call(inputElement, 'co');
      inputElement.dispatchEvent(
        new InputEvent('input', {
          bubbles: true,
          data: 'co',
          inputType: 'insertReplacementText',
        })
      );
    });
    const options = page.getByRole('option');
    await expect(options).toHaveCount(3);
    await expect(composer).toBeInViewport();
    await expect(composer.getByRole('button', { name: 'Add' })).toBeInViewport();
    const trayBox = await page.getByRole('listbox').boundingBox();
    const composerBox = await composer.boundingBox();
    expect(trayBox).not.toBeNull();
    expect(composerBox).not.toBeNull();
    expect(trayBox!.y + trayBox!.height).toBeLessThanOrEqual(composerBox!.y + 2);
    await input.press('ArrowDown');
    await input.press('Enter');
    await expect(input).toHaveValue('Coffee beans');
    await expect(page.getByTestId('grocery-extra-row')).toHaveCount(0);
  });

  test('shows outstanding extras in every future week and read-only snapshots in the past', async ({
    page,
  }) => {
    const { groceryExtras } = await setupGroceryPage(page);
    const checklist = page.getByTestId('grocery-checklist');
    const closeButton = checklist.getByRole('button', { name: 'Close grocery list' });
    const expectShoppingReady = async () => {
      // During entrance the transformed wrapper contains the fixed checklist.
      // Visible rows alone do not mean it has reached its viewport overlay.
      await expect
        .poll(() =>
          checklist.evaluate((element) => {
            const rect = element.getBoundingClientRect();
            return (
              rect.x === 0 &&
              rect.y === 0 &&
              rect.width === window.innerWidth &&
              rect.height === window.innerHeight
            );
          })
        )
        .toBe(true);
      // A full-size overlay can still be below the sticky header while its
      // opacity/stacking transition finishes. Observe the actual pointer target.
      await expect
        .poll(() =>
          closeButton.evaluate((button) => {
            const rect = button.getBoundingClientRect();
            return button.contains(
              document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)
            );
          })
        )
        .toBe(true);
    };
    const closeShopping = async () => {
      await expectShoppingReady();
      await closeButton.click();
      // Exit keeps the old rows mounted; do not reopen against that old view.
      await expect(checklist).toHaveCount(0);
    };
    const composer = page.getByTestId('grocery-extra-composer');
    await composer.getByRole('combobox').fill('Coffee');
    await composer.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByTestId('grocery-extra-row')).toContainText('Coffee');
    groceryExtras.push({
      ...builders.groceryExtra({ name: 'Tea', normalizedKey: 'tea', checked: true }),
    });

    await closeShopping();
    await page.getByTestId('next-week').click();
    await expect(page).toHaveURL(/weekOffset=1/);
    await expect(page.getByRole('heading', { name: 'May 11 — 17', exact: true })).toBeVisible();
    await page.getByTestId('grocery-tab').click();
    await expectShoppingReady();
    await expect(page.getByTestId('grocery-extra-composer')).toHaveCount(0);
    await expect(page.getByTestId('grocery-extra-row')).toHaveCount(1);
    await expect(page.getByTestId('grocery-extra-row').filter({ hasText: 'Tea' })).toHaveCount(0);
    await expect(page.getByTestId('grocery-extra-row')).toContainText('Coffee');
    await expect(page.getByRole('button', { name: 'Edit Coffee' })).toBeVisible();

    await closeShopping();
    await page.getByTestId('next-week').click();
    await expect(page).toHaveURL(/weekOffset=2/);
    await expect(page.getByRole('heading', { name: 'May 18 — 24', exact: true })).toBeVisible();
    await page.getByTestId('grocery-tab').click();
    await expectShoppingReady();
    await expect(page.getByTestId('grocery-extra-row')).toContainText('Coffee');
    await expect(page.getByTestId('grocery-extra-composer')).toHaveCount(0);
    await expect(page.getByTestId('grocery-extra-row')).toHaveCount(1);
    await expect(page.getByTestId('grocery-extra-row').filter({ hasText: 'Tea' })).toHaveCount(0);

    await closeShopping();
    await expect(page).toHaveURL(/weekOffset=2/);
    await expect(page.getByRole('heading', { name: 'May 18 — 24', exact: true })).toBeVisible();
    await page.getByTestId('grocery-tab').click();
    await expectShoppingReady();
    await expect(page).toHaveURL(/weekOffset=2/);
    await expect(page.getByTestId('grocery-extra-row')).toHaveCount(1);
    await expect(page.getByTestId('grocery-extra-row')).toContainText('Coffee');
    await expect(page.getByTestId('grocery-extra-composer')).toHaveCount(0);

    await closeShopping();
    await page.getByTestId('prev-week').click();
    await expect(page).toHaveURL(/weekOffset=1/);
    await expect(page.getByRole('heading', { name: 'May 11 — 17', exact: true })).toBeVisible();
    await page.getByTestId('prev-week').click();
    await expect(page).not.toHaveURL(/weekOffset=/);
    await expect(page.getByRole('heading', { name: 'May 4 — 10', exact: true })).toBeVisible();
    await page.getByTestId('prev-week').click();
    await expect(page).toHaveURL(/weekOffset=-1/);
    await expect(page.getByRole('heading', { name: 'Apr 27 — May 3', exact: true })).toBeVisible();
    await page.getByTestId('grocery-tab').click();
    await expectShoppingReady();
    const historical = page.getByTestId('grocery-extra-row');
    await expect(historical).toContainText('Toilet paper');
    await expect(historical).toContainText('Bought');
    await expect(historical.getByRole('button')).toHaveCount(0);
    await expect(historical.getByRole('checkbox')).toHaveCount(0);
    await expect(composer).toHaveCount(0);
  });

  test('checks, renames, recategorizes, and deletes only the selected occurrence', async ({
    page,
  }) => {
    await setupGroceryPage(page);
    const composer = page.getByTestId('grocery-extra-composer');
    await composer.getByRole('combobox').fill('Milk');
    await composer.getByRole('button', { name: 'Add' }).click();
    const row = page.getByTestId('grocery-extra-row');
    await row.getByRole('checkbox').click();
    await expect(row.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true');
    await row.getByRole('button', { name: 'Edit Milk' }).click();
    const editor = row.getByRole('textbox', { name: 'Extra name' });
    const save = row.getByRole('button', { name: 'Save' });
    const remove = row.getByRole('button', { name: 'Delete' });
    await expect(row.getByRole('button', { name: 'Cancel' })).toHaveCount(0);
    await expect(save).toHaveText('');
    await expect(remove).toHaveText('');
    const editorBox = await editor.boundingBox();
    const saveBox = await save.boundingBox();
    const removeBox = await remove.boundingBox();
    expect(editorBox?.width ?? 0).toBeGreaterThan((saveBox?.width ?? 0) + (removeBox?.width ?? 0));
    await editor.fill('Oat milk');
    await save.click();
    await expect(row).toContainText('Oat milk');
    await row.getByRole('button', { name: /Change section/ }).click();
    await row.getByRole('button', { name: 'Pantry' }).click();
    await row.getByRole('button', { name: 'Edit Oat milk' }).click();
    await row.getByRole('button', { name: 'Delete' }).click();
    await expect(row).toHaveCount(0);
  });
});

test.describe('Grocery List — category reclassification', () => {
  test('failed category PATCH preserves the item and a successful retry survives reconciliation', async ({
    page,
  }) => {
    const { categoryOverrides } = await setupGroceryPage(page);
    let attempts = 0;
    await page.route('**/api/ingredients/beef/category', async (route) => {
      attempts += 1;
      if (attempts === 1) {
        await route.fulfill({ status: 500 });
      } else {
        await route.fallback();
      }
    });
    const source = page.getByTestId('aisle-section-Meat');
    await source.getByTestId('reclassify-btn').click();
    await page.getByTestId('section-option-Produce').click();
    await expect(source.getByTestId('reclassify-error')).toBeVisible();
    await expect(source.getByTestId('grocery-item-checkbox')).toHaveAttribute(
      'aria-checked',
      'false'
    );
    await expect(page.getByTestId('aisle-section-Produce')).toHaveCount(0);
    expect(categoryOverrides.beef).toBeUndefined();
    await expect(page.getByTestId('section-option-Produce')).toBeEnabled();
    await page.getByTestId('section-option-Produce').click();
    await expect(source).toHaveCount(0);
    await expect(
      page.getByTestId('aisle-section-Produce').getByTestId('grocery-item-checkbox')
    ).toHaveAttribute('aria-checked', 'false');
    expect(attempts).toBe(2);
    expect(categoryOverrides.beef).toBe('Produce');

    await page.reload();
    await page.getByTestId('grocery-tab').click();
    await expect(
      page.getByTestId('aisle-section-Produce').getByTestId('grocery-item-checkbox')
    ).toBeVisible();
    await expect(source).toHaveCount(0);
  });

  test('successful PATCH moves the item and the next schedule keeps the persisted section', async ({
    page,
  }) => {
    const { categoryOverrides } = await setupGroceryPage(page);
    await page.getByTestId('aisle-section-Meat').getByTestId('reclassify-btn').click();
    await page.getByTestId('section-option-Produce').click();

    await expect(page.getByTestId('aisle-section-Meat')).toHaveCount(0);
    await expect(
      page.getByTestId('aisle-section-Produce').getByTestId('grocery-item-checkbox')
    ).toBeVisible();
    expect(categoryOverrides.beef).toBe('Produce');

    await page.reload();
    await page.getByTestId('grocery-tab').click();
    await expect(page.getByTestId('aisle-section-Produce')).toBeVisible();
  });
});

test.describe('Grocery List — PATCH failure behaviour', () => {
  test('PATCH failure → single item reverts, no global spinner', async ({ page }) => {
    await setupGroceryPage(page);

    // Override the per-item grocery PATCH endpoint to fail
    await page.route('**/api/schedule/*/grocery/item**', async (route) => {
      if (route.request().method() !== 'PATCH') return route.fallback();
      await route.fulfill({ status: 500, body: 'Internal Server Error' });
    });

    // Find the first grocery item checkbox
    const firstItem = page.getByTestId('grocery-item-checkbox').first();
    await expect(firstItem).toBeVisible({ timeout: 5_000 });

    // Capture the item name before toggling
    const itemName = await firstItem.getAttribute('data-item-name');
    expect(itemName).toBeTruthy();

    // Click to toggle — optimistic update fires immediately
    await firstItem.click();

    // After the PATCH fails, the item should revert (not remain checked)
    // The item should NOT be in a checked/line-through state
    await expect(firstItem.getByTestId('grocery-item-label')).not.toHaveClass(/line-through/, {
      timeout: 3_000,
    });

    // A per-item error indicator should appear on the reverted item
    await expect(firstItem.getByTestId('grocery-item-error')).toBeVisible({ timeout: 3_000 });

    // No global spinner (Loader2) should be present anywhere in the checklist
    // The old isSaving pattern used a Loader2 icon on every item — verify it's gone
    const checklist = page.getByTestId('grocery-checklist');
    await expect(checklist.locator('[class*="animate-spin"]')).toHaveCount(0);

    // Other items should remain interactive (not disabled)
    const allItems = page.getByTestId('grocery-item-checkbox');
    const count = await allItems.count();
    for (let i = 1; i < count; i++) {
      await expect(allItems.nth(i)).not.toBeDisabled();
    }
  });
});

test.describe('Grocery List — SSE sync', () => {
  test('grocery_updated SSE → checklist updates without navigation', async ({ page }) => {
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

    await setupCommonRoutes(page);

    // Mock SSE to emit grocery_updated with Pasta checked — registered AFTER
    // setupCommonRoutes so LIFO gives this handler priority over the default stream route.
    const groceryState = fixtureGroceryChecks({
      Pasta: false,
      Beef: true,
      'Tomato Sauce': false,
      Cheese: false,
    });
    const publishedState = { ...groceryState, [fixtureGroceryId('Pasta')]: true };
    let publishedVersion = '1';
    const { triggerGroceryUpdated } = await mockSseWithGroceryUpdated(
      page,
      1,
      publishedState,
      builders.groceryItems(['Pasta', 'Beef', 'Tomato Sauce', 'Cheese']).map((row) => ({
        ...row,
        weekStartDate: '2026-05-11' as any,
        rowVersion: row.rowId === fixtureGroceryId('Pasta') ? '2' : '1',
      }))
    );

    // Override schedule to return a week with one recipe that has known ingredients
    const monday = currentMonday();
    monday.setUTCDate(monday.getUTCDate() + 7);
    const GROCERY_INGREDIENTS_SSE = ['Pasta', 'Beef', 'Tomato Sauce', 'Cheese'];
    const GROCERY_SECTION_MAP_SSE: Record<string, string> = {
      Pasta: 'Pantry',
      Beef: 'Meat',
      'Tomato Sauce': 'Pantry',
      Cheese: 'Dairy & Eggs',
    };
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setUTCDate(monday.getUTCDate() + i);
      return {
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
        date: toDateStr(d),
        recipe:
          i === 0
            ? builders.scheduleRecipe({
                id: MOCK_IDS.RECIPE_LASAGNA,
                name: 'Homemade Lasagna',
                ingredients: GROCERY_INGREDIENTS_SSE,
              })
            : null,
        status: 0,
      };
    });

    await page.route(
      (url) => url.pathname === '/api/schedule',
      async (route) => {
        if (
          route.request().method() === 'GET' &&
          new URL(route.request().url()).searchParams.get('weekOffset') === '1'
        ) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                weekOffset: 1,
                calendar: builders.deploymentCalendar() as any,
                weekStartDate: '2026-05-11' as any,
                groceryListVersion: publishedVersion,
                groceryState,
                locked: false,
                status: 0,
                days,
                groceryItems: builders.groceryItems(
                  GROCERY_INGREDIENTS_SSE,
                  GROCERY_SECTION_MAP_SSE
                ),
              },
            }),
          });
        } else {
          await route.fallback();
        }
      }
    );

    await page.goto('/planner?weekOffset=1');
    await expect(page.getByTestId('day-card-0')).toBeVisible({ timeout: 10_000 });

    // Switch to the grocery tab
    await page.getByTestId('grocery-tab').click();
    await expect(page.getByTestId('grocery-checklist')).toBeVisible({ timeout: 10_000 });

    const pastaItem = page.getByTestId('grocery-item-checkbox').filter({ hasText: 'Pasta' });
    const beefItem = page.getByTestId('grocery-item-checkbox').filter({ hasText: 'Beef' });
    const cheeseItem = page.getByTestId('grocery-item-checkbox').filter({ hasText: 'Cheese' });
    await expect(pastaItem).toBeVisible();
    await expect(pastaItem).toHaveAttribute('aria-checked', 'false');
    await expect(beefItem).toHaveAttribute('aria-checked', 'true');
    await expect(cheeseItem).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByRole('heading', { name: 'May 11 — 17', exact: true })).toBeVisible();
    const selectedUrl = page.url();
    const navigations: string[] = [];
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) navigations.push(frame.url());
    });
    const received = page.waitForEvent('console', {
      predicate: (message) => message.text() === '[SSE] Received "grocery_updated" event',
    });
    // A committed event and subsequent reads must describe the same persisted state.
    Object.assign(groceryState, publishedState);
    publishedVersion = '2';
    await triggerGroceryUpdated();
    await received;
    await expect(pastaItem).toBeVisible();
    await expect(pastaItem).toHaveAttribute('aria-checked', 'true');
    const persisted = await page.evaluate(
      async () =>
        (await (await fetch('/api/schedule?referenceWeekStartDate=2026-05-04&weekOffset=1')).json())
          .data
    );
    expect(persisted.groceryState[fixtureGroceryId('Pasta')]).toBe(true);
    await expect(beefItem).toHaveAttribute('aria-checked', 'true');
    await expect(cheeseItem).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByTestId('grocery-item-checkbox')).toHaveCount(4);
    await expect(page).toHaveURL(selectedUrl);
    await expect(page.getByRole('heading', { name: 'May 11 — 17', exact: true })).toBeVisible();
    expect(navigations).toEqual([]);
  });

  test('week_updated SSE → grocery checkboxes do not flash (jitter regression test)', async ({
    page,
  }) => {
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
    const origins = [
      baseUrl,
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://pwa.wfs.localhost',
    ];
    for (const origin of origins) {
      await page
        .context()
        .addCookies([
          { name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: origin, httpOnly: true },
        ]);
    }
    await page.setViewportSize({ width: 390, height: 844 });

    const monday = currentMonday();
    const GROCERY_INGREDIENTS_WEEK = ['Pasta', 'Beef', 'Tomato Sauce', 'Cheese'];
    const GROCERY_SECTION_MAP_WEEK: Record<string, string> = {
      Pasta: 'Pantry',
      Beef: 'Meat',
      'Tomato Sauce': 'Pantry',
      Cheese: 'Dairy & Eggs',
    };
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setUTCDate(monday.getUTCDate() + i);
      return {
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
        date: toDateStr(d),
        recipe:
          i === 0
            ? builders.scheduleRecipe({
                id: MOCK_IDS.RECIPE_LASAGNA,
                name: 'Homemade Lasagna',
                ingredients: GROCERY_INGREDIENTS_WEEK,
              })
            : null,
        status: 0,
      };
    });

    // Build a week_updated schedule that carries groceryState with Pasta already checked.
    // groceryItems must be included so applySnapshot doesn't reset the list to [].
    // groceryState.additionalData matches the Kiota AdditionalDataHolder pattern.
    const scheduleWithGrocery = {
      weekOffset: 0,
      calendar: builders.deploymentCalendar() as any,
      weekStartDate: '2026-05-04' as any,
      groceryListVersion: '2',
      locked: false,
      status: 0,
      days,
      groceryItems: builders.groceryItems(GROCERY_INGREDIENTS_WEEK, GROCERY_SECTION_MAP_WEEK),
      groceryState: {
        additionalData: fixtureGroceryChecks({
          Pasta: true,
          Beef: false,
          'Tomato Sauce': false,
          Cheese: false,
        }),
      },
    };

    await setupCommonRoutes(page);

    // Mock SSE (connected only) — registered AFTER setupCommonRoutes so LIFO
    // gives this handler priority over the default stream route. The week_updated
    // event is dispatched manually after the page loads to avoid the mount-race
    // where the static SSE body is consumed before useScheduleStream's listener
    // is attached (was causing flaky 10s poll timeouts on CI).
    const { triggerWeekUpdated } = await mockSseWithWeekUpdate(
      page,
      scheduleWithGrocery as Parameters<typeof mockSseWithWeekUpdate>[1]
    );

    await page.route(
      (url) => url.pathname === '/api/schedule',
      async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                weekOffset: 0,
                calendar: builders.deploymentCalendar() as any,
                weekStartDate: '2026-05-04' as any,
                groceryListVersion: '2',
                groceryState: fixtureGroceryChecks({
                  Pasta: true,
                  Beef: false,
                  'Tomato Sauce': false,
                  Cheese: false,
                }),
                locked: false,
                status: 0,
                days,
                groceryItems: builders.groceryItems(
                  GROCERY_INGREDIENTS_WEEK,
                  GROCERY_SECTION_MAP_WEEK
                ),
              },
            }),
          });
        } else {
          await route.continue();
        }
      }
    );

    await page.goto('/planner');
    await expect(page.getByTestId('day-card-0')).toBeVisible({ timeout: 10_000 });

    // Fire week_updated now that useScheduleStream is mounted and __sseSource is set.
    await triggerWeekUpdated();

    // Switch to the grocery tab
    await page.getByTestId('grocery-tab').click();
    await expect(page.getByTestId('grocery-checklist')).toBeVisible({ timeout: 10_000 });

    // Pasta must be checked (set by week_updated groceryState) and Beef unchecked.
    const pastaItem = page.getByTestId('grocery-item-checkbox').filter({ hasText: 'Pasta' });
    await expect(pastaItem).toHaveAttribute('aria-checked', 'true');

    const beefItem = page.getByTestId('grocery-item-checkbox').filter({ hasText: 'Beef' });
    await expect(beefItem).toHaveAttribute('aria-checked', 'false');
  });
});
