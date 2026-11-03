import { expect, test, type Page } from './fixtures';
import { builders, MOCK_IDS, mockSseWithWeekUpdate, setupCommonRoutes } from './mock-api';

async function setup(page: Page) {
  await page.context().addCookies([
    {
      name: 'x-family-member-id',
      value: MOCK_IDS.MEMBER_ALEX,
      url: process.env.BASE_URL || 'http://127.0.0.1:3000',
    },
  ]);
  await page.addInitScript((id) => {
    localStorage.setItem(
      'family-storage',
      JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 })
    );
  }, MOCK_IDS.MEMBER_ALEX);
  await setupCommonRoutes(page);
  return mockSseWithWeekUpdate(
    page,
    builders.scheduleDays() as unknown as Parameters<typeof mockSseWithWeekUpdate>[1]
  );
}

function results(name: string, path = 'lexical-only', searchMode = 'explicit') {
  return {
    data: {
      topPick: null,
      results: [
        {
          id: MOCK_IDS.RECIPE_LASAGNA,
          name,
          imageUrl: null,
          totalTime: '30 min',
          rating: 3,
          isDiscoverable: true,
          notes: null,
          reasons: [],
          isPromotionEligible: false,
        },
      ],
      appliedFilters: {},
      searchMode,
      resultPath: path,
      nextCursor: null,
    },
  };
}

for (const mode of ['browse', 'typed', 'similar'] as const) {
  test(`${mode} refreshes its active source on week_updated and retries a failed read`, async ({
    page,
  }) => {
    const { triggerWeekUpdated } = await setup(page);
    const requests: Array<{ method: string; context?: Record<string, unknown> }> = [];
    let fail = false;
    let label = 'Before update';
    await page.route('**/api/recipes?**', async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      requests.push({ method: 'GET' });
      if (fail) return route.fulfill({ status: 503, json: { message: 'Temporarily unavailable' } });
      return route.fulfill({
        json: {
          recipes: [builders.recipe({ id: MOCK_IDS.RECIPE_LASAGNA, name: label })],
          pagination: { page: 1, limit: 20, total: 1 },
          historyGeneration: 'generation-1',
        },
      });
    });
    await page.route('**/api/recipes/search', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      requests.push({ method: 'POST', context: route.request().postDataJSON() });
      if (fail) return route.fulfill({ status: 503, json: { message: 'Temporarily unavailable' } });
      return route.fulfill({
        json: results(
          label,
          mode === 'similar' ? 'similar' : 'lexical-only',
          mode === 'similar' ? 'similar' : 'explicit'
        ),
      });
    });
    await page.goto(
      `/recipes?addToDay=2&weekOffset=1${mode === 'similar' ? `&similarTo=${MOCK_IDS.RECIPE_TACOS}` : ''}`
    );
    if (mode === 'typed') {
      await page.getByTestId('recipe-search-input').fill('chicken');
      await page.getByTestId('recipe-search-input').press('Enter');
    }
    const card = page.getByTestId('stack-card-front');
    await expect(card).toContainText('Before update');
    if (mode !== 'browse') await page.getByTestId('recipes-search-disclosure').click();
    const current = requests.at(-1)!;
    const before = requests.length;
    label = 'After update';
    await triggerWeekUpdated();
    await expect(card).toContainText('After update');
    expect(requests.length).toBe(before + 1);
    expect(requests.at(-1)).toMatchObject(current);
    fail = true;
    await triggerWeekUpdated();
    await expect(
      page.getByTestId(mode === 'browse' ? 'browse-request-error' : 'search-request-error')
    ).toBeVisible({ timeout: 20_000 });
    await expect(card).toContainText('After update');
    await expect(page.getByTestId('search-empty-state')).toHaveCount(0);
    if (mode !== 'browse') {
      await expect(page.getByTestId('recipe-search-input')).toHaveCount(0);
      await expect(page.getByTestId('recipes-search-disclosure')).toHaveAttribute(
        'aria-expanded',
        'false'
      );
    }
    fail = false;
    label = 'After retry';
    await page
      .getByTestId(mode === 'browse' ? 'browse-request-retry' : 'search-request-retry')
      .click();
    await expect(card).toContainText('After retry');
    expect(requests.at(-1)).toMatchObject(current);
  });
}

test('week_updated supersedes a pending Search first response', async ({ page }) => {
  const { triggerWeekUpdated } = await setup(page);
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let count = 0;
  let invalidated = false;
  let completedOld = 0;
  await page.route('**/api/recipes/search', async (route) => {
    count += 1;
    const old = !invalidated;
    if (old) await held;
    await route.fulfill({ json: results(old ? 'Obsolete response' : 'Current response') });
    if (old) completedOld += 1;
  });
  await page.goto('/recipes?focus=search');
  await page.getByTestId('recipe-search-input').fill('chicken');
  await page.getByTestId('recipe-search-input').press('Enter');
  await expect.poll(() => count).toBe(1);
  await expect(page.getByTestId('browse-all-loader')).toBeVisible();
  invalidated = true;
  await triggerWeekUpdated();
  const card = page.getByTestId('stack-card-front');
  await expect(card).toContainText('Current response');
  release();
  await expect.poll(() => completedOld).toBe(1);
  await expect(card).toContainText('Current response');
  expect(count).toBe(2);
});
