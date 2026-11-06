import { test, expect } from './fixtures';
import { setupCommonRoutes, builders, MOCK_IDS } from './mock-api';

test('legacy four-portion shells preview scales reliable lines despite omitted seasonings', async ({
  page,
}) => {
  const id = MOCK_IDS.RECIPE_SPAGHETTI;
  await page.context().addCookies([
    {
      name: 'x-family-member-id',
      value: MOCK_IDS.MEMBER_ALEX,
      url: process.env.BASE_URL || 'http://127.0.0.1:3000',
    },
  ]);
  await setupCommonRoutes(page, builders.deploymentCalendar({ today: '2026-05-04' }), {
    supperServings: {
      knownRecipe: {
        id,
        basis: 4,
        quantity: 12,
        ingredient: 'coquilles géantes',
        unit: '',
        source: {
          ingredients: [
            '12 coquilles géantes',
            '1 oignon haché',
            '450 g Bœuf haché mi-maigre',
            '500 ml Sauce marinara',
            'sel',
            'poivre',
          ],
          supplies: [
            { name: 'coquilles géantes', quantity: 12, unitText: null },
            { name: 'oignon haché', quantity: 1, unitText: null },
            { name: 'Bœuf haché mi-maigre', quantity: 450, unitText: 'g' },
            { name: 'Sauce marinara', quantity: 500, unitText: 'ml' },
          ],
        },
      },
    },
  });
  await page.goto(`/recipes?open=${id}&reviewAmounts=true`);
  for (const target of [2, 6]) {
    await page.getByRole('button', { name: `Preview ${target} portions`, exact: true }).click();
    const list = page.getByTestId('recipe-ingredient-preview');
    await expect(list).toContainText(`${(12 * target) / 4} coquilles géantes`);
    await expect(list).toContainText(`${target / 4} oignon haché`);
    await expect(list).toContainText(`${(450 * target) / 4} g Bœuf haché mi-maigre`);
    await expect(list).toContainText(`${(500 * target) / 4} ml Sauce marinara`);
    await expect(list.locator('li').nth(4)).toHaveText('sel');
    await expect(list.locator('li').nth(5)).toHaveText('poivre');
    await expect(
      page.getByText('Some amounts need review. Consult the original recipe.', { exact: true })
    ).toHaveCount(0);
  }
});

test('four-portion preview keeps five saved portions and groceries unchanged', async ({ page }) => {
  const id = MOCK_IDS.RECIPE_SPAGHETTI;
  await page.context().addCookies([
    {
      name: 'x-family-member-id',
      value: MOCK_IDS.MEMBER_ALEX,
      url: process.env.BASE_URL || 'http://127.0.0.1:3000',
    },
  ]);
  await setupCommonRoutes(page, builders.deploymentCalendar({ today: '2026-05-04' }), {
    supperServings: {
      knownRecipe: { id, basis: 2, quantity: 200, ingredient: 'pasta', unit: 'g' },
    },
  });
  await page.goto('/profile/settings');
  await page.getByTestId('usual-portions-automatic').uncheck();
  await page.getByTestId('usual-portions-input').fill('5');
  await page.getByTestId('save-usual-portions').click();
  await expect(
    page.getByTestId('usual-portions-section').getByText('Saved', { exact: true })
  ).toBeVisible();
  await page.goto(`/recipes?open=${id}&addToDay=2&weekOffset=0&referenceWeekStartDate=2026-05-04`);
  await expect(page.getByTestId('recipe-ingredient-projection')).toContainText('500 g pasta');
  const saved = () =>
    page.evaluate(async () => ({
      portions: await (
        await fetch('/api/schedule/servings?weekOffset=0&referenceWeekStartDate=2026-05-04')
      ).json(),
      schedule: await (
        await fetch('/api/schedule?weekOffset=0&referenceWeekStartDate=2026-05-04')
      ).json(),
    }));
  const before = await saved();
  const writes: string[] = [];
  page.on('request', (request) => {
    if (!['GET', 'HEAD'].includes(request.method()))
      writes.push(request.method() + ' ' + new URL(request.url()).pathname);
  });
  await page.getByRole('button', { name: 'Preview 4 portions', exact: true }).click();
  await expect(page.getByTestId('recipe-ingredient-preview')).toContainText('400 g pasta');
  await expect(page.getByTestId('recipe-portion-context')).toHaveCount(0);
  await expect(page.getByTestId('recipe-servings')).toContainText('4 servings');
  expect(await saved()).toEqual(before);
  expect(writes).toEqual([]);
  await expect(page.getByTestId('recipe-original-yield')).toContainText('2');
  await expect(page.getByRole('button', { name: 'Original quantities', exact: true })).toHaveCount(
    0
  );
  await expect(page.getByRole('button', { name: 'Planned quantities', exact: true })).toHaveCount(
    0
  );
  await expect(
    page.getByText('Preview only. Your plan and shopping list stay unchanged.', { exact: true })
  ).toHaveCount(0);
  await page.getByTestId('action-gear-menu').click();
  await expect(page.getByTestId('action-reset-view')).toHaveAccessibleName('Reset view');
  await page.getByTestId('action-reset-view').click();
  await expect(page.getByTestId('recipe-ingredient-projection')).toContainText('500 g pasta');
  await expect(page.getByTestId('recipe-servings')).toHaveText('5 servings');
  await expect(page.getByTestId('recipe-original-yield')).toHaveCount(0);
  expect(await saved()).toEqual(before);
  expect(writes).toEqual([]);
});

test('early preview survives initial target resolution, schedule hints and resume without writes', async ({
  page,
}) => {
  const id = MOCK_IDS.RECIPE_SPAGHETTI;
  await page.context().addCookies([
    {
      name: 'x-family-member-id',
      value: MOCK_IDS.MEMBER_ALEX,
      url: process.env.BASE_URL || 'http://127.0.0.1:3000',
    },
  ]);
  await setupCommonRoutes(page, builders.deploymentCalendar({ today: '2026-05-04' }), {
    supperServings: {
      knownRecipe: { id, basis: 2, quantity: 200, ingredient: 'pasta', unit: 'g' },
    },
  });
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let scheduleReads = 0;
  await page.route(
    (url) => url.pathname === '/api/schedule',
    async (route) => {
      scheduleReads++;
      await gate;
      await route.fallback();
    }
  );
  const writes: string[] = [];
  page.on('request', (request) => {
    if (
      !['GET', 'HEAD'].includes(request.method()) &&
      new URL(request.url()).pathname.startsWith('/api/')
    )
      writes.push(request.method() + ' ' + new URL(request.url()).pathname);
  });
  await page.goto(`/recipes?open=${id}&addToDay=2&weekOffset=0&referenceWeekStartDate=2026-05-04`);
  await expect.poll(() => scheduleReads).toBeGreaterThan(0);
  const selected = page.getByRole('button', { name: 'Preview 2 portions', exact: true });
  await selected.click();
  await expect(page.getByTestId('recipe-ingredient-preview')).toContainText('200 g pasta');
  release();
  await expect(page.getByTestId('action-change-day')).toBeVisible();
  await expect(selected).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('recipe-ingredient-preview')).toContainText('200 g pasta');
  await page.evaluate(async () => {
    const schedule = (
      await (await fetch('/api/schedule?weekOffset=0&referenceWeekStartDate=2026-05-04')).json()
    ).data;
    (window as any).__sseSource.dispatchEvent(
      new MessageEvent('week_updated', { data: JSON.stringify({ schedule }) })
    );
  });
  await expect(selected).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(selected).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('recipe-ingredient-preview')).toContainText('200 g pasta');
  await page.getByTestId('action-change-day').click();
  await page.getByTestId('planning-day-3').click();
  await expect(page.getByTestId('action-add-to-day')).toContainText('May 7');
  await expect(page.getByTestId('recipe-ingredient-projection')).toContainText('200 g pasta');
  // The new confirmed default is two; its pressed control is not temporary intent.
  await expect(selected).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('recipe-ingredient-preview')).toHaveCount(0);
  await expect(page.getByTestId('recipe-original-yield')).toHaveCount(0);
  await expect(
    page.getByText('Preview only. Your plan and shopping list stay unchanged.', { exact: true })
  ).toHaveCount(0);
  expect(writes).toEqual([]);
});

test('selected preview refreshes source safely and retains intent after refresh failure', async ({
  page,
}) => {
  const id = MOCK_IDS.RECIPE_SPAGHETTI;
  await page.context().addCookies([
    {
      name: 'x-family-member-id',
      value: MOCK_IDS.MEMBER_ALEX,
      url: process.env.BASE_URL || 'http://127.0.0.1:3000',
    },
  ]);
  await setupCommonRoutes(page, builders.deploymentCalendar({ today: '2026-05-04' }), {
    supperServings: {
      knownRecipe: { id, basis: 2, quantity: 200, ingredient: 'pasta', unit: 'g' },
    },
  });
  await page.goto(`/recipes?open=${id}&reviewAmounts=true`);
  const selected = page.getByRole('button', { name: 'Preview 6 portions', exact: true });
  await selected.click();
  await expect(page.getByTestId('recipe-ingredient-preview')).toContainText('600 g pasta');
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let reads = 0;
  let failRefresh = true;
  await page.route('**/api/recipes/*/ingredient-preview*', async (route) => {
    reads++;
    if (reads === 1) {
      await gate;
      await route.fulfill({
        json: {
          recipeId: id,
          baseServings: 4,
          targetServings: 6,
          factor: 1.5,
          version: 'changed-source',
          status: 'scaled',
          lines: [
            {
              originalText: '200 g sauce',
              name: 'sauce',
              quantity: 300,
              unitText: 'g',
              status: 'scaled',
              issues: [],
            },
          ],
        },
      });
    } else if (failRefresh) await route.abort('connectionreset');
    else await route.fallback();
  });
  const writes: string[] = [];
  page.on('request', (request) => {
    if (
      !['GET', 'HEAD'].includes(request.method()) &&
      new URL(request.url()).pathname.startsWith('/api/')
    )
      writes.push(request.method() + ' ' + new URL(request.url()).pathname);
  });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect.poll(() => reads).toBe(1);
  await expect(selected).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Loading preview…', { exact: true })).toBeVisible();
  await expect(page.getByText('600 g pasta', { exact: true })).toHaveCount(0);
  release();
  await expect(page.getByTestId('recipe-ingredient-preview')).toContainText('300 g sauce');
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.getByText('Preview could not load.', { exact: false })).toBeVisible();
  await expect(selected).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('300 g sauce', { exact: true })).toHaveCount(0);
  failRefresh = false;
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByTestId('recipe-ingredient-preview')).toContainText('600 g pasta');
  await page.getByTestId('action-gear-menu').click();
  await expect(page.getByTestId('action-original-quantities')).toHaveAccessibleName(
    'View original ingredients'
  );
  await page.getByTestId('action-original-quantities').click();
  await expect(selected).toHaveAttribute('aria-pressed', 'false');
  expect(writes).toEqual([]);
});
