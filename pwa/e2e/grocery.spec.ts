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

test('common check mocks retain distinct intentions, false, replacement and clear on reread', async ({
  page,
}) => {
  await page.route('**/api/schedule/*/grocery/item', (route) => route.fulfill({ status: 405 }));
  await setupCommonRoutes(page);
  await page.goto('/welcome');
  await page.evaluate(() => {
    const source = new EventTarget();
    (window as any).__sseSource = source;
    (window as any).__checkMaps = [];
    source.addEventListener('grocery_updated', (event) =>
      (window as any).__checkMaps.push(JSON.parse((event as MessageEvent).data).groceryState)
    );
  });
  const observed = await page.evaluate(async () => {
    const item = (ingredientName: string, checked: boolean) =>
      fetch('/api/schedule/0/grocery/item', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredientName, checked }),
      });
    const read = async () =>
      (await (await fetch('/api/schedule?weekOffset=0')).json()).data.groceryState;
    const statuses = await Promise.all([item('Tomato', true), item('Lettuce', true)]).then(
      (results) => results.map((r) => r.status)
    );
    const both = await read();
    await item('Tomato', false);
    const explicitFalse = await read();
    const replacement = await fetch('/api/schedule/0/grocery', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Tomato: false }),
    });
    const replacementBody = await replacement.json();
    const replaced = await read();
    await fetch('/api/schedule/0/grocery', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    return {
      statuses,
      both,
      explicitFalse,
      replacementBody,
      replaced,
      cleared: await read(),
      unsupported: (await fetch('/api/schedule/0/grocery/item')).status,
    };
  });
  expect(observed).toEqual({
    statuses: [204, 204],
    both: { Tomato: true, Lettuce: true },
    explicitFalse: { Tomato: false, Lettuce: true },
    replacementBody: { data: { Tomato: false } },
    replaced: { Tomato: false },
    cleared: {},
    unsupported: 405,
  });
  await expect.poll(() => page.evaluate(() => (window as any).__checkMaps.length)).toBe(5);
  expect(await page.evaluate(() => (window as any).__checkMaps.at(-1))).toEqual({});
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
  await page.route('**/api/schedule/*/grocery/item', async (route) => {
    if (route.request().method() !== 'PATCH') return route.fallback();
    if (route.request().postDataJSON().ingredientName === 'Pasta') {
      started();
      await held;
      await route.fulfill({ status: 500, json: { message: 'Save failed' } });
    } else await route.fulfill({ status: 204 });
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

async function setupGroceryPage(
  page: import('@playwright/test').Page,
  options: { empty?: boolean; milk?: boolean } = {}
) {
  const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
  await page
    .context()
    .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);

  await setupCommonRoutes(page);

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
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              weekOffset: offset,
              calendar: builders.deploymentCalendar() as any,
              weekStartDate: selectedWeekStartDate as any,
              locked: false,
              status: 0,
              days: selectedDays,
              groceryItems: currentGroceryItems(),
              groceryExtras: selectedExtras,
            },
          }),
        });
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

  await mockSseWithConnectedSchedule(page, {
    weekOffset: 0,
    calendar: builders.deploymentCalendar() as any,
    weekStartDate: '2026-05-04' as any,
    locked: false,
    status: 0,
    days,
    get groceryItems() {
      return currentGroceryItems();
    },
    get groceryExtras() {
      return groceryExtras;
    },
    groceryState: { additionalData: {} },
  } as any);

  await page.goto('/planner');
  await expect(page.getByTestId('day-card-0')).toBeVisible({ timeout: 10_000 });

  // Switch to the grocery tab
  await page.getByTestId('grocery-tab').click();
  await expect(page.getByTestId('grocery-checklist')).toBeVisible({ timeout: 10_000 });
  if (!options.empty && !options.milk)
    await expect(page.getByTestId('aisle-section-Meat')).toBeVisible();

  return { categoryOverrides, groceryExtras };
}

test.describe('Grocery List — everyday extras', () => {
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
    await setupGroceryPage(page, { milk: true });
    for (let index = 0; index < 2; index++) {
      await page.getByRole('combobox').fill('Milk');
      await page.getByRole('button', { name: 'Add', exact: true }).click();
      await expect(page.getByRole('combobox')).toHaveValue('');
    }
    const rows = page.getByTestId('grocery-extra-row');
    await expect(rows).toHaveCount(2);
    const first = rows.first();
    await first.getByRole('checkbox').press('Space');
    await expect(first.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true');
    await expect(rows.nth(1).getByRole('checkbox')).toHaveAttribute('aria-checked', 'false');
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
    await page.route('**/api/schedule/*/grocery/item', async (route) => {
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
    const { triggerGroceryUpdated } = await mockSseWithGroceryUpdated(page, 1, {
      Pasta: true,
      Beef: true,
      'Tomato Sauce': false,
      Cheese: false,
    });

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
                groceryState: { Pasta: false, Beef: true, 'Tomato Sauce': false, Cheese: false },
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
    await triggerGroceryUpdated();
    await received;
    await expect(pastaItem).toBeVisible();
    await expect(pastaItem).toHaveAttribute('aria-checked', 'true');
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
      locked: false,
      status: 0,
      days,
      groceryItems: builders.groceryItems(GROCERY_INGREDIENTS_WEEK, GROCERY_SECTION_MAP_WEEK),
      groceryState: {
        additionalData: { Pasta: true, Beef: false, 'Tomato Sauce': false, Cheese: false },
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
