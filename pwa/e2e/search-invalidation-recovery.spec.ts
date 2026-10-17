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

function results(name: string, path = 'lexical-only') {
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
      searchMode: 'standard',
      resultPath: path,
      nextCursor: null,
    },
  };
}

for (const mode of ['browse', 'typed', 'similar'] as const) {
  test(`${mode} recovers from week_updated and failed refresh without losing context`, async ({
    page,
  }) => {
    const { triggerWeekUpdated } = await setup(page);
    const requests: Record<string, unknown>[] = [];
    let fail = false;
    let label = 'Before update';
    await page.route('**/api/recipes/search', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      requests.push(route.request().postDataJSON());
      if (fail) {
        await route.fulfill({ status: 503, json: { message: 'Temporarily unavailable' } });
        return;
      }
      await route.fulfill({ json: results(label, mode === 'browse' ? 'browse' : 'lexical-only') });
    });
    await page.goto(
      `/recipes?addToDay=2&weekOffset=1${mode === 'similar' ? `&similarTo=${MOCK_IDS.RECIPE_TACOS}` : ''}`
    );
    const card = page.getByTestId(`recipe-card-${MOCK_IDS.RECIPE_LASAGNA}`);
    await expect(card).toContainText('Before update');
    if (mode === 'typed') {
      await page.getByTestId('recipe-search-input').fill('chicken');
      await page.getByTestId('recipe-search-input').press('Enter');
      await expect.poll(() => requests.at(-1)?.query).toBe('chicken');
      await expect(card).toBeVisible();
    }
    const context = requests.at(-1)!;
    const before = requests.length;
    label = 'After update';
    await triggerWeekUpdated();
    await expect(card).toContainText('After update');
    expect(requests.length).toBe(before + 1);
    expect(requests.at(-1)).toMatchObject(context);
    fail = true;
    await triggerWeekUpdated();
    await expect(page.getByTestId('search-request-error')).toContainText('Could not load recipes');
    await expect(page.getByTestId('search-empty-state')).toHaveCount(0);
    await expect(card).toHaveCount(0);
    await expect(page.getByTestId('recipe-search-input')).toHaveValue(
      mode === 'typed' ? 'chicken' : ''
    );
    fail = false;
    label = 'After retry';
    await page.getByTestId('search-request-retry').click();
    await expect(card).toContainText('After retry');
    expect(requests.at(-1)).toMatchObject(context);
  });
}

test('week_updated supersedes a pending first response', async ({ page }) => {
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
  await page.goto('/recipes');
  await expect.poll(() => count).toBeGreaterThan(0);
  await expect(page.getByTestId('recipe-loader')).toBeVisible();
  const initialCount = count;
  invalidated = true;
  await triggerWeekUpdated();
  const card = page.getByTestId(`recipe-card-${MOCK_IDS.RECIPE_LASAGNA}`);
  await expect(card).toContainText('Current response');
  release();
  await expect.poll(() => completedOld).toBe(initialCount);
  await expect(card).toContainText('Current response');
  expect(count).toBe(initialCount + 1);
});
