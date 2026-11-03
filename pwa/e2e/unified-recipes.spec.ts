import { swipeCurrentStackCard } from './helpers/stack-swipe';
import { test, expect, type Page } from './fixtures';
import { MOCK_IDS, builders, setupCommonRoutes } from './mock-api';

async function prepareNavigationMember(page: import('@playwright/test').Page) {
  const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
  await page
    .context()
    .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);
  await page.addInitScript(
    (id) =>
      localStorage.setItem(
        'family-storage',
        JSON.stringify({
          state: {
            selectedFamilyMemberId: id,
            familyMembers: [{ id, name: 'Alex', browseViewMode: 'stack' }],
            hasLoaded: true,
          },
          version: 0,
        })
      ),
    MOCK_IDS.MEMBER_ALEX
  );
  await setupCommonRoutes(page);
}

// A single passing frame can precede the dock's finite CSS transitions and the
// ResizeObserver update. Observe stable layout after those animations finish.
async function settledListGeometry(page: Page) {
  const samples = await page.evaluate(async () => {
    await document.fonts.ready;
    const root = document.querySelector<HTMLElement>('[data-testid="browse-all-stack-container"]')!;
    const list = document.querySelector<HTMLElement>(
      '[data-testid="browse-list-scroll-container"]'
    )!;
    const dock = document.querySelector<HTMLElement>('[data-testid="app-bottom-navigation"]')!;
    const frames = [];
    let previous = '';
    let stable = 0;
    const start = performance.now();
    while (performance.now() - start < 5000) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const listBox = list.getBoundingClientRect();
      const dockBox = dock.getBoundingClientRect();
      const rootBox = root.getBoundingClientRect();
      const geometry = {
        gap: dockBox.top - listBox.bottom,
        overlap: listBox.bottom > dockBox.top,
        listTop: listBox.top,
        listBottom: listBox.bottom,
        listHeight: listBox.height,
        dockTop: dockBox.top,
        rootBottom: rootBox.bottom,
        rootScrollTop: root.scrollTop,
      };
      const active = [
        ...root.getAnimations({ subtree: true }),
        ...dock.getAnimations({ subtree: true }),
      ].some(
        (animation) =>
          animation.playState !== 'finished' &&
          animation.playState !== 'idle' &&
          Number.isFinite(animation.effect?.getComputedTiming().endTime)
      );
      const signature = JSON.stringify(geometry);
      const canvasMeasured = Math.abs(rootBox.bottom - dockBox.top) <= 1;
      stable = !active && canvasMeasured && signature === previous ? stable + 1 : 0;
      frames.push({ time: performance.now() - start, active, ...geometry });
      previous = signature;
      if (stable >= 4) return { settled: true, geometry, frames };
    }
    return { settled: false, geometry: frames.at(-1)!, frames };
  });
  await test.info().attach('list-layout-frames', {
    body: JSON.stringify(samples),
    contentType: 'application/json',
  });
  expect(samples.settled, 'dock transitions and observer layout settle').toBe(true);
  return samples.geometry;
}

async function setupViewportRecipes(page: Page) {
  const recipes = Array.from({ length: 24 }, (_, index) => {
    const id = `a0000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
    return builders.recipe({
      id,
      name: `Meal ${index + 1}`,
      totalTime: 'PT30M',
      isDiscoverable: true,
      imageUrl: `/api/recipes/${id}/hero`,
    });
  });
  const pages: number[] = [];
  await page.route('**/api/recipes/library-summary', (route) =>
    route.fulfill({
      json: {
        data: {
          total: recipes.length,
          neverCooked: recipes.length,
          ratings: { love: 0, like: 0, dislike: 0, unrated: recipes.length },
        },
      },
    })
  );
  await page.route('**/api/recipes?**', (route) => {
    const url = new URL(route.request().url());
    const pageNumber = Number(url.searchParams.get('page'));
    const limit = Number(url.searchParams.get('limit'));
    if (limit === 12) pages.push(pageNumber);
    return route.fulfill({
      json: {
        updatedAt: '2026-05-04T12:00:00Z',
        recipes: recipes.slice((pageNumber - 1) * limit, pageNumber * limit),
        pagination: { page: pageNumber, limit, total: recipes.length },
      },
    });
  });
  await page.route('**/api/recipes/*', (route) => {
    const recipe = recipes.find((item) =>
      new URL(route.request().url()).pathname.endsWith(`/${item.id}`)
    );
    return recipe && route.request().method() === 'GET'
      ? route.fulfill({ json: { recipe, updatedAt: '2026-05-04T12:00:00Z' } })
      : route.fallback();
  });
  await page.route('**/api/recipes/*/hero', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#bcc9a8"/></svg>',
    })
  );
  return { recipes, pages };
}

async function expectLastRecipeReachable(page: Page, name: string, fittingRow = true) {
  const list = page.getByTestId('browse-list-scroll-container');
  await list.evaluate((el) => {
    const rows = el.querySelectorAll('[data-testid="browse-list-recipe-card"]');
    el.scrollTop +=
      rows[rows.length - 1].getBoundingClientRect().bottom - el.getBoundingClientRect().bottom + 4;
  });
  const last = page.getByTestId('browse-list-recipe-card').last();
  const geometry = await settledListGeometry(page);
  const row = (await last.boundingBox())!;
  if (fittingRow) {
    expect(row.height).toBeLessThan(geometry.listHeight);
    expect(row.y).toBeGreaterThanOrEqual(geometry.listTop);
    expect(row.y + row.height).toBeLessThanOrEqual(geometry.dockTop);
  } else {
    expect(row.height, 'exercise a row taller than its scrollport').toBeGreaterThan(
      geometry.listHeight
    );
  }
  expect(geometry.gap).toBeGreaterThanOrEqual(0);
  expect(geometry.gap).toBeLessThanOrEqual(8);
  expect(geometry.rootScrollTop).toBe(0);
  await last.focus();
  for (const key of ['Enter', 'Space']) {
    if (!fittingRow) {
      await list.evaluate((el) => {
        const rows = el.querySelectorAll('[data-testid="browse-list-recipe-card"]');
        const title = rows[rows.length - 1].querySelector('p')!;
        el.scrollTop +=
          title.getBoundingClientRect().bottom - el.getBoundingClientRect().bottom + 4;
      });
      const title = (await last.locator('p').first().boundingBox())!;
      expect(title.y).toBeGreaterThanOrEqual(geometry.listTop);
      expect(title.y + title.height).toBeLessThanOrEqual(geometry.dockTop);
      const target = (await last.boundingBox())!;
      expect(
        Math.min(target.y + target.height, geometry.listBottom) -
          Math.max(target.y, geometry.listTop)
      ).toBeGreaterThanOrEqual(48);
    }
    await expect(last).toBeFocused();
    await page.keyboard.press(key);
    await expect(page.getByTestId('recipe-detail-sheet')).toContainText(name);
    await page.getByTestId('action-close-sheet').click();
    await expect(last).toBeFocused();
  }
  expect((await settledListGeometry(page)).rootScrollTop).toBe(0);
}

test.describe('constrained French stack placement', () => {
  test.use({ appLocale: 'fr' });
  test('card and family action stay scroll-reachable without a dock overlap', async ({ page }) => {
    await prepareNavigationMember(page);
    for (const scenario of [
      { width: 320, height: 568, scale: 1 },
      { width: 390, height: 667, scale: 1 },
      { width: 667, height: 375, scale: 1 },
      { width: 1180, height: 820, scale: 1 },
      { width: 390, height: 844, scale: 2 },
    ]) {
      await page.setViewportSize({ width: scenario.width, height: scenario.height });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/recipes');
      await page.evaluate((scale) => {
        document.documentElement.style.fontSize = `${16 * scale}px`;
      }, scenario.scale);
      const front = page.getByTestId('stack-card-front');
      const panel = page.getByTestId('stack-action-bar');
      await expect(front).toBeVisible();
      await expect(page.getByTestId('app-bottom-navigation')).toBeVisible();
      await expect
        .poll(() =>
          page.evaluate(() => {
            const viewport = document
              .querySelector('[data-testid="browse-all-stack-container"]')!
              .getBoundingClientRect();
            const dock = document
              .querySelector('[data-testid="app-bottom-navigation"]')!
              .getBoundingClientRect();
            return Math.abs(viewport.bottom - dock.top);
          })
        )
        .toBeLessThanOrEqual(1);
      // Fonts and dock measurement can settle after the first scroll under load.
      // Keep scrolling to the final positions until the action clears the dock.
      await expect
        .poll(() =>
          panel.evaluate((node) => {
            const results = node.closest('[data-testid="browse-results-region"]') as HTMLElement;
            const viewport = document.querySelector(
              '[data-testid="browse-all-stack-container"]'
            ) as HTMLElement;
            const dock = document.querySelector('[data-testid="app-bottom-navigation"]')!;
            results.scrollTop = results.scrollHeight;
            viewport.scrollTop = viewport.scrollHeight;
            return node.getBoundingClientRect().bottom - dock.getBoundingClientRect().top;
          })
        )
        .toBeLessThanOrEqual(1);
      await expect(panel, JSON.stringify(scenario)).toBeInViewport({
        ratio: 0.98,
      });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      );
      await front.locator('h2').scrollIntoViewIfNeeded();
      await expect(front.locator('h2')).toBeInViewport({ ratio: 0.98 });
    }
  });
});

test('stack reflows on visual-viewport shrink without losing its current recipe', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await prepareNavigationMember(page);
  await page.goto('/recipes');
  const front = page.getByTestId('stack-card-front');
  await expect(front).toBeVisible();
  const originalId = await front.getAttribute('data-recipe-id');
  const originalHeight = await page.evaluate(() => window.visualViewport!.height);
  const reducedHeight = originalHeight - 240;
  await page.evaluate((height) => {
    Object.defineProperty(window.visualViewport!, 'height', { configurable: true, value: height });
    window.visualViewport!.dispatchEvent(new Event('resize'));
  }, reducedHeight);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document
            .querySelector('[data-testid="browse-all-stack-container"]')!
            .getBoundingClientRect().bottom
      )
    )
    .toBeLessThanOrEqual(reducedHeight + 1);
  await expect(front).toHaveAttribute('data-recipe-id', originalId!);
  await page.evaluate(() => {
    Reflect.deleteProperty(window.visualViewport!, 'height');
    window.visualViewport!.dispatchEvent(new Event('resize'));
  });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const root = document
          .querySelector('[data-testid="browse-all-stack-container"]')!
          .getBoundingClientRect();
        const dock = document
          .querySelector('[data-testid="app-bottom-navigation"]')!
          .getBoundingClientRect();
        return Math.abs(root.bottom - dock.top);
      })
    )
    .toBeLessThanOrEqual(1);
  await expect(front).toHaveAttribute('data-recipe-id', originalId!);
});

test('stable Search anchor across scope and disclosure', async ({ page }) => {
  await prepareNavigationMember(page);
  for (const viewport of [
    { width: 320, height: 640 },
    { width: 393, height: 852 },
    { width: 820, height: 1180 },
    { width: 1180, height: 820 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/recipes');
    const search = page.getByTestId('recipes-search-disclosure');
    const left = async () => (await search.boundingBox())!.x;
    const initial = await left();
    await page.getByTestId('stack-toggle-discoverable').click();
    expect(Math.abs((await left()) - initial)).toBeLessThanOrEqual(1);
    await search.click();
    expect(Math.abs((await left()) - initial)).toBeLessThanOrEqual(1);
    await page.getByTestId('browse-view-list').click();
    expect(Math.abs((await left()) - initial)).toBeLessThanOrEqual(1);
    await page.getByTestId('recipe-search-input').fill('chicken');
    await page.getByTestId('recipe-search-input').press('Enter');
    await search.click();
    await expect(page.getByTestId('recipes-search-active-marker')).toBeVisible();
    expect(Math.abs((await left()) - initial)).toBeLessThanOrEqual(1);
    const box = await search.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(48);
    expect(box!.height).toBeGreaterThanOrEqual(48);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
  }
});

test.describe('French Search anchor', () => {
  test.use({ appLocale: 'fr' });
  test('stable Search anchor stays left when enlarged controls wrap', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await prepareNavigationMember(page);
    await page.goto('/recipes');
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    const search = page.getByTestId('recipes-search-disclosure');
    const first = (await search.boundingBox())!.x;
    await page.getByTestId('stack-toggle-discoverable').click();
    expect(Math.abs((await search.boundingBox())!.x - first)).toBeLessThanOrEqual(1);
    await search.click();
    await page.getByTestId('browse-view-list').click();
    expect(Math.abs((await search.boundingBox())!.x - first)).toBeLessThanOrEqual(1);
    await search.focus();
    await expect(search).toBeFocused();
  });
});

test('visible result viewport follows the dock at enlarged text', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await prepareNavigationMember(page);
  await page.goto('/recipes');
  await page.getByTestId('browse-view-list').click();
  await expect(page.getByTestId('browse-list-scroll-container')).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '32px';
  });
  const geometry = await settledListGeometry(page);
  expect(geometry.overlap).toBe(false);
  expect(geometry.gap).toBeGreaterThanOrEqual(0);
  expect(geometry.gap).toBeLessThanOrEqual(8);
});

test('last recipe remains reachable after enlarged-text list append', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await prepareNavigationMember(page);
  const { recipes, pages } = await setupViewportRecipes(page);
  await page.goto('/recipes');
  await page.getByTestId('browse-view-list').click();
  const list = page.getByTestId('browse-list-scroll-container');
  await expect(list).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '32px';
  });
  const initial = await settledListGeometry(page);
  expect.soft(initial.overlap).toBe(false);
  await list.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect(page.getByTestId('browse-list-recipe-card')).toHaveCount(24);
  expect(pages).toContain(2);
  await expectLastRecipeReachable(page, recipes[23].name!);
  await page.screenshot({ path: testInfo.outputPath('last-list-recipe.png') });
});

test.describe('French list viewport with reduced motion', () => {
  test.use({ appLocale: 'fr' });
  test('last recipe remains reachable through text reflow and a pending Search continuation', async ({
    page,
  }, testInfo) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 393, height: 852 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await prepareNavigationMember(page);
    const { recipes } = await setupViewportRecipes(page);
    const requests: (string | null)[] = [];
    let release!: () => void;
    let notifyStarted!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const started = new Promise<void>((resolve) => {
      notifyStarted = resolve;
    });
    await page.route('**/api/recipes/search', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      const request = route.request().postDataJSON();
      requests.push(request.continuationToken ?? null);
      if (request.continuationToken) {
        notifyStarted();
        await held;
      }
      const items = request.continuationToken ? recipes.slice(12) : recipes.slice(0, 12);
      await route.fulfill({
        json: {
          data: {
            topPick: null,
            results: items.map((recipe) => ({
              ...recipe,
              isPromotionEligible: false,
              reasons: [],
            })),
            nextCursor: request.continuationToken ? null : 'viewport-next',
            appliedFilters: request.filters ?? {},
            searchMode: 'explicit',
            resultPath: 'lexical-only',
          },
        },
      });
    });
    await page.goto('/recipes');
    await page.getByTestId('browse-view-list').click();
    await page.getByTestId('recipes-search-disclosure').click();
    const firstSearch = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname.endsWith('/api/recipes/search') &&
        response.request().method() === 'POST' &&
        !response.request().postDataJSON().continuationToken
    );
    await page.getByTestId('recipe-search-input').fill('Meal');
    await firstSearch;
    await expect(page.getByTestId('browse-list-recipe-card')).toHaveCount(12);
    await page.getByTestId('recipes-search-disclosure').click();
    const list = page.getByTestId('browse-list-scroll-container');
    await list.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await started;
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '32px';
    });
    const pending = await settledListGeometry(page);
    expect(pending.gap).toBeGreaterThanOrEqual(0);
    expect(pending.gap).toBeLessThanOrEqual(8);
    await expect(page.getByTestId('browse-list-recipe-card')).toHaveCount(12);
    release();
    await expect(page.getByTestId('browse-list-recipe-card')).toHaveCount(24);
    await expectLastRecipeReachable(page, recipes[23].name!, false);
    const last = page.getByTestId('browse-list-recipe-card').last();
    const beforeImageFailure = (await last.boundingBox())!.height;
    await page.route('**/missing-list-hero.svg', (route) => route.abort());
    await last.locator('img').evaluate((el: HTMLImageElement) => {
      el.src = '/missing-list-hero.svg';
    });
    await expect
      .poll(() =>
        last.locator('img').evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth === 0)
      )
      .toBe(true);
    expect((await last.boundingBox())!.height).toBe(beforeImageFailure);
    await page.screenshot({ path: testInfo.outputPath('search-last-list-recipe.png') });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '16px';
    });
    const restored = await settledListGeometry(page);
    expect(restored.gap).toBeGreaterThanOrEqual(0);
    expect(restored.gap).toBeLessThanOrEqual(8);
    await expect(page.getByTestId('browse-list-recipe-card')).toHaveCount(24);
    await page.getByTestId('recipes-search-disclosure').click();
    await expect(page.getByTestId('recipe-search-input')).toHaveValue('Meal');
    expect(requests).toEqual([null, 'viewport-next']);
  });
});

test('visible result viewport keeps short enlarged Search scrollable', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await prepareNavigationMember(page);
  await page.goto('/recipes');
  await page.getByTestId('browse-view-list').click();
  await page.getByTestId('recipes-search-disclosure').click();
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const root = document
          .querySelector('[data-testid="browse-all-stack-container"]')!
          .getBoundingClientRect();
        const dock = document
          .querySelector('[data-testid="app-bottom-navigation"]')!
          .getBoundingClientRect();
        return root.bottom - dock.top;
      })
    )
    .toBeLessThanOrEqual(1);
  const scroll = await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>('[data-testid="browse-all-stack-container"]')!;
    root.scrollTop = root.scrollHeight;
    return { top: root.scrollTop, bottom: root.getBoundingClientRect().bottom };
  });
  expect(scroll.top).toBeGreaterThan(0);
  await page.getByTestId('browse-list-recipe-card').first().scrollIntoViewIfNeeded();
  await expect(page.getByTestId('browse-list-recipe-card').first()).toBeVisible();
  const visibleListHeight = await page
    .getByTestId('browse-list-scroll-container')
    .evaluate((el) => {
      const list = el.getBoundingClientRect();
      const root = el
        .closest('[data-testid="browse-all-stack-container"]')!
        .getBoundingClientRect();
      const dock = document
        .querySelector('[data-testid="app-bottom-navigation"]')!
        .getBoundingClientRect();
      return Math.min(list.bottom, root.bottom, dock.top) - Math.max(list.top, root.top);
    });
  expect(
    visibleListHeight,
    'a tall recipe retains a usable scroll/activation strip'
  ).toBeGreaterThanOrEqual(48);
  const first = page.getByTestId('browse-list-recipe-card').first();
  expect((await first.boundingBox())!.height).toBeGreaterThan(visibleListHeight);
  await first.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('recipe-detail-sheet')).toBeVisible();
  await page.getByTestId('action-close-sheet').click();
  await expect(first).toBeFocused();
  await page.getByTestId('recipe-search-input').focus();
  await expect(page.getByTestId('recipe-search-input')).toBeFocused();
  await page.getByTestId('recipes-search-disclosure').click();
  await expect(page.getByTestId('recipe-search-input')).toHaveCount(0);
});

test('visible result viewport fills to the dock in stack and list on phone and tablet', async ({
  page,
}) => {
  await prepareNavigationMember(page);
  for (const viewport of [
    { width: 393, height: 852 },
    { width: 820, height: 1180 },
    { width: 1180, height: 820 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/recipes');
    for (const mode of ['stack', 'list'] as const) {
      await page.getByTestId(mode === 'stack' ? 'browse-view-stack' : 'browse-view-list').click();
      const id = mode === 'stack' ? 'browse-stack-layout' : 'browse-list-scroll-container';
      await expect(page.getByTestId(id)).toBeVisible();
      await expect
        .poll(async () =>
          page.evaluate((testId) => {
            const result = document
              .querySelector(`[data-testid="${testId}"]`)!
              .getBoundingClientRect();
            const dock = document
              .querySelector('[data-testid="app-bottom-navigation"]')!
              .getBoundingClientRect();
            return dock.top - result.bottom;
          }, id)
        )
        .toBeLessThanOrEqual(8);
      const gap = await page.evaluate((testId) => {
        const result = document.querySelector(`[data-testid="${testId}"]`)!.getBoundingClientRect();
        const dock = document
          .querySelector('[data-testid="app-bottom-navigation"]')!
          .getBoundingClientRect();
        return dock.top - result.bottom;
      }, id);
      expect(gap).toBeGreaterThanOrEqual(0);
    }
  }
});

test('visible result viewport keeps a pending Search through hide and resize', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await prepareNavigationMember(page);
  await page.goto('/recipes');
  await page.getByTestId('browse-view-list').click();
  let startRequest!: () => void;
  let finishRequest!: () => void;
  const started = new Promise<void>((resolve) => {
    startRequest = resolve;
  });
  const held = new Promise<void>((resolve) => {
    finishRequest = resolve;
  });
  let posts = 0;
  await page.route('**/api/recipes/search', async (route) => {
    posts++;
    startRequest();
    await held;
    await route.fulfill({
      json: {
        data: {
          topPick: null,
          results: [
            {
              id: MOCK_IDS.RECIPE_CHICKEN,
              name: 'Chicken Soup',
              imageUrl: '/test-card.svg',
              totalTime: 'PT20M',
            },
          ],
          nextCursor: null,
          appliedFilters: {},
          searchMode: 'explicit',
          resultPath: 'lexical-only',
        },
      },
    });
  });
  await page.getByTestId('recipes-search-disclosure').click();
  await page.getByTestId('recipe-search-input').fill('chicken');
  await page.getByTestId('recipe-search-input').press('Enter');
  await started;
  await page.getByTestId('recipes-search-disclosure').click();
  await page.setViewportSize({ width: 393, height: 640 });
  finishRequest();
  await expect(page.getByTestId('browse-list-recipe-card').first()).toContainText('Chicken Soup');
  await page.getByTestId('recipes-search-disclosure').click();
  await expect(page.getByTestId('recipe-search-input')).toHaveValue('chicken');
  expect(posts).toBe(1);
});

test('compact planning context precedes Search without a tall banner', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await prepareNavigationMember(page);
  await page.goto('/recipes?addToDay=2&weekOffset=0&referenceWeekStartDate=2026-05-04');
  const context = page.getByTestId('planning-mode-banner');
  await expect(context).toContainText('Choosing for');
  const row = await context.boundingBox();
  const search = await page.getByTestId('recipes-search-disclosure').boundingBox();
  expect(row!.height).toBeLessThanOrEqual(52);
  expect(row!.y + row!.height).toBeLessThanOrEqual(search!.y);
  const input = await page.getByTestId('recipe-search-input').boundingBox();
  expect(input!.y).toBeGreaterThanOrEqual(search!.y + search!.height);
  await page.screenshot({ path: testInfo.outputPath('compact-planning.png') });
  await page.getByTestId('recipes-search-disclosure').click();
  await expect(context).toBeVisible();
  await page.getByTestId('planning-mode-cancel').click();
  await expect(page).toHaveURL(/\/planner/);
});

test.describe('French compact planning context', () => {
  test.use({ appLocale: 'fr' });
  test('compact planning context wraps safely at enlarged text', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await prepareNavigationMember(page);
    await page.goto('/recipes?addToDay=2&weekOffset=0&referenceWeekStartDate=2026-05-04');
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    const context = page.getByTestId('planning-mode-banner');
    await expect(context).toContainText(/Choisir pour/i);
    await context.scrollIntoViewIfNeeded();
    await expect(page.getByTestId('planning-mode-cancel')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    await page.getByTestId('recipes-search-disclosure').click();
    await expect(context).toBeVisible();
  });
});

for (const viewport of [
  { width: 820, height: 1180, gutterMin: 24, gutterMax: 32 },
  { width: 1180, height: 820, gutterMin: 24, gutterMax: 32 },
])
  test(`Recipes canvas and grid use the ${viewport.width}px width before toolbar wrapping`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await prepareNavigationMember(page);
    await page.goto('/recipes?discoverableOnly=true');
    await page.getByTestId('browse-view-list').click();
    await expect(page.getByTestId('browse-list-grid')).toBeVisible();

    const geometry = await page.evaluate(() => {
      const bounds = (selector: string) =>
        document.querySelector(selector)!.getBoundingClientRect();
      const canvas = bounds('[data-testid="browse-all-stack-container"]');
      const grid = bounds('[data-testid="browse-list-grid"]');
      const toolbar = document.querySelector(
        '[data-testid="recipes-search-disclosure"]'
      )!.parentElement!;
      const toolbarButtons = Array.from(toolbar.querySelectorAll('button'));
      return {
        canvasLeft: canvas.left,
        canvasWidth: canvas.width,
        gridLeft: grid.left,
        gridRight: grid.right,
        toolbarRows: new Set(
          toolbarButtons.map((button) => Math.round(button.getBoundingClientRect().top))
        ).size,
        toolbarTargets: toolbarButtons.map((button) => ({
          width: button.getBoundingClientRect().width,
          height: button.getBoundingClientRect().height,
        })),
      };
    });

    expect(geometry.canvasLeft).toBe(0);
    expect(geometry.canvasWidth).toBe(viewport.width);
    expect(geometry.gridLeft).toBeGreaterThanOrEqual(viewport.gutterMin);
    expect(geometry.gridLeft).toBeLessThanOrEqual(viewport.gutterMax);
    expect(viewport.width - geometry.gridRight).toBeGreaterThanOrEqual(viewport.gutterMin);
    expect(viewport.width - geometry.gridRight).toBeLessThanOrEqual(viewport.gutterMax);
    expect(geometry.toolbarRows).toBe(1);
    for (const target of geometry.toolbarTargets) {
      expect(target.width).toBeGreaterThanOrEqual(48);
      expect(target.height).toBeGreaterThanOrEqual(48);
    }
    await page.getByTestId('browse-view-stack').click();
    const stack = await page.getByTestId('stack-card-front').boundingBox();
    expect(stack).not.toBeNull();
    expect(stack!.width).toBeLessThanOrEqual(576);
    expect(Math.abs(stack!.x + stack!.width / 2 - viewport.width / 2)).toBeLessThanOrEqual(24);
  });

test('empty scoped Explore retains the viewport-wide Recipes surface on phone and iPad', async ({
  page,
}) => {
  await prepareNavigationMember(page);
  for (const viewport of [
    { width: 393, height: 852 },
    { width: 820, height: 1180 },
    { width: 1180, height: 820 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/recipes?gotoOnly=true');
    await expect(page.getByTestId('browse-goto-empty')).toBeVisible();
    const geometry = await page.getByTestId('browse-all-stack-container').boundingBox();
    expect(geometry?.x).toBe(0);
    expect(geometry?.width).toBe(viewport.width);
  }
});

test('synthetic phone safe-area insets keep Recipes controls above the dock', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await prepareNavigationMember(page);
  await page.goto('/recipes');
  await expect(page.getByTestId('stack-card-front')).toBeVisible();
  await page.addStyleTag({
    content: `
    .safe-top { padding-top: 24px !important; }
    nav { padding-bottom: calc(0.5rem + 24px) !important; }
    [data-testid="browse-all-stack-container"] {
      height: calc(100dvh - 7.25rem - 48px) !important;
      padding-bottom: 24px !important;
    }
  `,
  });
  const geometry = await page.evaluate(() => {
    const canvas = document
      .querySelector('[data-testid="browse-all-stack-container"]')!
      .getBoundingClientRect();
    const nav = document.querySelector('nav')!.getBoundingClientRect();
    const toolbar = document
      .querySelector('[data-testid="recipes-search-disclosure"]')!
      .getBoundingClientRect();
    return {
      canvasBottom: canvas.bottom,
      navTop: nav.top,
      toolbarBottom: toolbar.bottom,
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
    };
  });
  expect(geometry.canvasBottom).toBeLessThanOrEqual(geometry.navTop + 1);
  expect(geometry.toolbarBottom).toBeLessThan(geometry.navTop);
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.viewportWidth);
});

test('legacy Browse URL redirects with supported context and retires management intent', async ({
  page,
}) => {
  await prepareNavigationMember(page);
  const context = new URLSearchParams({
    gotoOnly: 'true',
    discoverableOnly: 'true',
    focus: 'search',
    similarTo: MOCK_IDS.RECIPE_LASAGNA,
    open: MOCK_IDS.RECIPE_CHICKEN,
    addToDay: '2',
    weekOffset: '1',
    referenceWeekStartDate: '2026-05-04',
    manageGoto: 'true',
    arbitrary: 'discard',
  });
  await page.goto(`/browse-all-stack?${context}`);
  await expect(page).toHaveURL(/\/recipes\?/);
  const redirected = new URL(page.url());
  for (const [key, value] of context) {
    expect(redirected.searchParams.get(key)).toBe(
      ['manageGoto', 'arbitrary'].includes(key) ? null : value
    );
  }
  await expect(page.getByTestId('browse-all-exit')).toHaveCount(0);
});

test('legacy combined scope activates both Explore predicates without a Search POST', async ({
  page,
}) => {
  await prepareNavigationMember(page);
  let searchCalls = 0;
  await page.route('**/api/recipes/search', (route) => {
    searchCalls++;
    return route.fallback();
  });
  const browseRequest = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname === '/api/recipes' && url.searchParams.get('order') === 'explore';
  });
  await page.goto('/browse-all-stack?gotoOnly=true&discoverableOnly=true&manageGoto=true');
  const url = new URL((await browseRequest).url());
  expect(url.searchParams.get('gotoOnly')).toBe('true');
  expect(url.searchParams.get('discoverableOnly')).toBe('true');
  expect(searchCalls).toBe(0);
  await expect(page).toHaveURL(/\/recipes\?gotoOnly=true&discoverableOnly=true$/);
});

test('mounted Recipes applies a new supported scope and Similar URL context', async ({ page }) => {
  await prepareNavigationMember(page);
  const searchBodies: unknown[] = [];
  await page.route('**/api/recipes/search', (route) => {
    searchBodies.push(route.request().postDataJSON());
    return route.fulfill({
      json: {
        data: {
          topPick: null,
          results: [
            {
              id: MOCK_IDS.RECIPE_CHICKEN,
              name: 'Similar Chicken',
              imageUrl: '/chicken.jpg',
              totalTime: 'PT30M',
            },
          ],
          nextCursor: null,
          appliedFilters: {},
          searchMode: 'similar',
          resultPath: 'lexical-only',
        },
      },
    });
  });
  await page.goto('/recipes');
  await expect(page.getByTestId('stack-card-front')).toBeVisible();
  const scopedGet = page.waitForRequest(
    (request) => {
      const url = new URL(request.url());
      return (
        url.pathname === '/api/recipes' &&
        url.searchParams.get('gotoOnly') === 'true' &&
        url.searchParams.get('discoverableOnly') === 'true'
      );
    },
    { timeout: 5_000 }
  );
  await page.evaluate(() =>
    history.pushState(null, '', '/recipes?gotoOnly=true&discoverableOnly=true&focus=search')
  );
  await scopedGet;
  await expect(page.getByTestId('recipe-search-input')).toBeFocused();
  expect(searchBodies).toHaveLength(0);
  await page.evaluate(
    (id) =>
      history.pushState(
        null,
        '',
        `/recipes?gotoOnly=true&discoverableOnly=true&focus=search&similarTo=${id}`
      ),
    MOCK_IDS.RECIPE_LASAGNA
  );
  await expect.poll(() => searchBodies.length).toBe(1);
  expect(searchBodies[0]).toMatchObject({
    similarToRecipeId: MOCK_IDS.RECIPE_LASAGNA,
    filters: { gotoOnly: true, discoverableOnly: true },
  });
  await expect(page.getByTestId('stack-card-front')).toContainText('Similar Chicken');
});

test('app navigation identifies Recipes and Home has no duplicate Browse tile', async ({
  page,
}) => {
  await prepareNavigationMember(page);
  await page.goto('/home');
  await expect(page.getByTestId('home-browse-all-trigger')).toHaveCount(0);
  await expect(page.getByRole('navigation').getByRole('link', { name: 'Recipes' })).toHaveAttribute(
    'href',
    '/recipes'
  );
  await page.getByRole('navigation').getByRole('link', { name: 'Recipes' }).click();
  await expect(page).toHaveURL(/\/recipes$/);
  await expect(page.getByTestId('browse-all-stack-container')).toBeVisible();
});

test('installed Search shortcut opens expanded Recipes through the existing member gate', async ({
  page,
}) => {
  const response = await page.request.get('/manifest.json');
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  const searchShortcut = manifest.shortcuts.find(
    (shortcut: { name: string }) => shortcut.name === 'Search'
  );
  expect(searchShortcut?.url).toBe('/recipes?focus=search');
  expect(
    manifest.shortcuts.find((shortcut: { name: string }) => shortcut.name === 'Capture Meal')?.url
  ).toBe('/capture');
  await page.goto(searchShortcut.url);
  await expect(page).toHaveURL(/\/onboarding/);
  await prepareNavigationMember(page);
  let searchCalls = 0;
  await page.route('**/api/recipes/search', (route) => {
    searchCalls++;
    return route.fallback();
  });
  await page.goto(searchShortcut.url);
  await expect(page.getByTestId('recipe-search-input')).toBeFocused();
  expect(searchCalls).toBe(0);
});

test.describe('French Recipes controls', () => {
  test.use({ appLocale: 'fr' });
  test('localizes scope and view controls with explicit selected state', async ({ page }) => {
    await prepareNavigationMember(page);
    await page.goto('/recipes');
    await expect(page.getByTestId('stack-toggle-discoverable')).toHaveAccessibleName(
      'Afficher toutes les recettes'
    );
    await expect(page.getByTestId('stack-toggle-discoverable')).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    await expect(page.getByTestId('browse-view-stack')).toHaveAccessibleName(
      'Afficher les fiches de recettes'
    );
    await expect(page.getByTestId('browse-view-stack')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('recycle-bin-entry')).toHaveAccessibleName('Corbeille');
    await page.getByTestId('recipes-search-disclosure').click();
    await expect(page.getByTestId('recipe-search-input')).toHaveAttribute(
      'placeholder',
      'Un truc épicé pour 4...'
    );
    await page.getByTestId('stack-toggle-discoverable').click();
    await expect(page.getByTestId('mobile-filters-button')).toHaveAccessibleName(
      'Filtres actifs : 1'
    );
  });
});

test('expanded Search restores field cues, applied count and ordinary list heading', async ({
  page,
}) => {
  await prepareNavigationMember(page);
  await page.route('**/api/recipes/search', (route) =>
    route.fulfill({
      json: {
        data: {
          topPick: {
            id: MOCK_IDS.RECIPE_LASAGNA,
            name: 'Lasagna',
            imageUrl: '/test-card.svg',
            totalTime: 'PT30M',
          },
          results: [
            {
              id: MOCK_IDS.RECIPE_STIR_FRY,
              name: 'Stir Fry',
              imageUrl: '/test-card.svg',
              totalTime: 'PT20M',
            },
          ],
          nextCursor: null,
          appliedFilters: {},
          searchMode: 'explicit',
          resultPath: 'lexical-only',
        },
      },
    })
  );
  await page.goto('/recipes');
  await page.getByTestId('browse-view-list').click();
  await expect(page.getByRole('heading', { name: 'Results' })).toHaveCount(0);
  await page.getByTestId('recipes-search-disclosure').click();
  const input = page.getByTestId('recipe-search-input');
  await expect(input).toHaveAttribute('placeholder', 'Something spicy for 4...');
  await expect(input.locator('..').locator('.lucide-search')).toBeVisible();
  await page.getByTestId('stack-toggle-discoverable').click();
  await expect(page.getByTestId('mobile-filters-button')).toHaveAccessibleName('Filters, 1 active');
  await input.fill('lasagna');
  await input.press('Enter');
  await expect(page.getByTestId('browse-list-recipe-card')).toHaveCount(2);
  await expect(page.getByRole('heading', { name: 'Results' })).toBeVisible();
  await page.getByTestId('recipes-search-disclosure').click();
  await expect(page.getByTestId('recipes-search-active-marker')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Results' })).toBeVisible();
});

test('short-screen Recipes toolbar and content stay above app navigation', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await prepareNavigationMember(page);
  await page.goto('/recipes');
  await expect(page.getByTestId('stack-card-front')).toBeVisible();
  const geometry = await page.evaluate(() => {
    const box = (testId: string) =>
      document.querySelector(`[data-testid="${testId}"]`)!.getBoundingClientRect();
    const nav = document.querySelector('nav')!.getBoundingClientRect();
    return {
      contentBottom: box('browse-all-stack-container').bottom,
      navTop: nav.top,
      targets: [
        'recipes-search-disclosure',
        'stack-toggle-discoverable',
        'browse-filter-goto',
        'browse-view-stack',
        'browse-view-list',
        'recycle-bin-entry',
      ].map((id) => ({ id, width: box(id).width, height: box(id).height })),
    };
  });
  expect(geometry.contentBottom).toBeLessThanOrEqual(geometry.navTop);
  for (const target of geometry.targets) {
    expect(target.width, target.id).toBeGreaterThanOrEqual(48);
    expect(target.height, target.id).toBeGreaterThanOrEqual(48);
  }
});

const renderedSamples = [
  { width: 320, height: 568, textScale: 1 },
  { width: 360, height: 780, textScale: 1 },
  { width: 390, height: 667, textScale: 1 },
  { width: 430, height: 932, textScale: 1 },
  { width: 667, height: 375, textScale: 1 },
  { width: 820, height: 1180, textScale: 1 },
  { width: 1180, height: 820, textScale: 1 },
  { width: 390, height: 667, textScale: 2 },
  { width: 820, height: 1180, textScale: 2 },
];

for (const locale of ['en', 'fr'] as const) {
  test.describe(`rendered Recipes ${locale}`, () => {
    test.use({ appLocale: locale });
    for (const sample of renderedSamples) {
      test(`${sample.width}x${sample.height} at ${sample.textScale * 100}% text keeps toolbar, Search and list reachable`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width: sample.width, height: sample.height });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await prepareNavigationMember(page);
        await page.goto('/recipes');
        await expect(page.getByTestId('stack-card-front')).toBeVisible();
        if (sample.textScale === 2) {
          await page.evaluate(() => {
            document.documentElement.style.fontSize = '200%';
          });
        }
        await page.evaluate(() => document.fonts.ready);
        await expect
          .poll(async () =>
            page.evaluate(() => {
              const shell = document
                .querySelector('[data-testid="browse-all-stack-container"]')!
                .getBoundingClientRect();
              const dock = document
                .querySelector('[data-testid="app-bottom-navigation"]')!
                .getBoundingClientRect();
              return Math.abs(shell.bottom - dock.top);
            })
          )
          .toBeLessThanOrEqual(1);
        const geometry = await page.evaluate(() => {
          const rect = (id: string) =>
            document.querySelector(`[data-testid="${id}"]`)!.getBoundingClientRect();
          const nav = document.querySelector('nav')!.getBoundingClientRect();
          return {
            shellBottom: rect('browse-all-stack-container').bottom,
            navTop: nav.top,
            scrollWidth: document.documentElement.scrollWidth,
            viewportWidth: innerWidth,
            targets: [
              'recipes-search-disclosure',
              'stack-toggle-discoverable',
              'browse-filter-goto',
              'browse-view-stack',
              'browse-view-list',
              'recycle-bin-entry',
            ].map((id) => ({ id, width: rect(id).width, height: rect(id).height })),
          };
        });
        await testInfo.attach('geometry', {
          body: JSON.stringify(geometry, null, 2),
          contentType: 'application/json',
        });
        expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.viewportWidth);
        await expect
          .poll(async () =>
            page.evaluate(() => {
              const shell = document
                .querySelector('[data-testid="browse-all-stack-container"]')!
                .getBoundingClientRect();
              const dock = document
                .querySelector('[data-testid="app-bottom-navigation"]')!
                .getBoundingClientRect();
              return shell.bottom - dock.top;
            })
          )
          .toBeLessThanOrEqual(1);
        for (const target of geometry.targets) {
          expect(target.width, target.id).toBeGreaterThanOrEqual(48);
          expect(target.height, target.id).toBeGreaterThanOrEqual(48);
        }
        await page.screenshot({ path: testInfo.outputPath('stack-collapsed.png') });
        await page.getByTestId('recipes-search-disclosure').click();
        await expect(page.getByTestId('recipe-search-input')).toBeFocused();
        await page.getByTestId('browse-view-list').click();
        await expect(page.getByTestId('browse-list-recipe-card').first()).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
          sample.width
        );
        await page.screenshot({ path: testInfo.outputPath('list-expanded.png') });
      });
    }
  });
}

test('keyboard disclosure and sheets return focus to their connected Recipes triggers', async ({
  page,
}) => {
  await prepareNavigationMember(page);
  await page.goto('/recipes');
  const search = page.getByTestId('recipes-search-disclosure');
  await search.focus();
  await search.press('Tab');
  await expect(page.getByTestId('stack-toggle-discoverable')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(search).toBeFocused();
  await search.press('Space');
  await expect(page.getByTestId('recipe-search-input')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(search).toBeFocused();
  await search.press('Space');
  await expect(page.getByTestId('recipe-search-input')).toBeFocused();
  const filters = page.getByTestId('mobile-filters-button');
  await filters.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(filters).toBeFocused();
  const bin = page.getByTestId('recycle-bin-entry');
  await bin.click();
  await expect(page.getByRole('dialog', { name: 'Recycle Bin' })).toBeVisible();
  await expect(
    page.getByRole('dialog', { name: 'Recycle Bin' }).getByRole('button', { name: 'Close' })
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Recycle Bin' })).toHaveCount(0);
  await expect(bin).toBeFocused();
  const card = page.getByTestId('stack-card-front');
  await card.focus();
  await card.press('Enter');
  await expect(page.getByTestId('recipe-detail-sheet')).toBeVisible();
  await expect
    .poll(() =>
      page
        .getByTestId('recipe-detail-sheet')
        .evaluate((node) => node.contains(document.activeElement))
    )
    .toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('recipe-detail-sheet')).toHaveCount(0);
  await expect(card).toBeFocused();
});

test('stack keeps detail on the card and adds no visible navigation row in Explore or Search', async ({
  page,
}) => {
  await prepareNavigationMember(page);
  await page.goto('/recipes');
  const card = page.getByTestId('stack-card-front');
  await expect(card).toBeVisible();
  await expect(page.getByTestId('stack-navigation-actions')).toHaveCount(0);
  await card.focus();
  await card.press('Enter');
  await expect(page.getByTestId('recipe-detail-sheet')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(card).toBeFocused();
  await page.getByTestId('recipes-search-disclosure').click();
  await page.getByTestId('recipe-search-input').fill('chicken');
  await page.getByTestId('recipe-search-input').press('Enter');
  await expect(page.getByTestId('stack-card-front')).toBeVisible();
  await expect(page.getByTestId('stack-navigation-actions')).toHaveCount(0);
});

test('stack keeps card-owned detail and tight backing peeks without an added action row', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await prepareNavigationMember(page);
  const recipes = [
    builders.recipe({ id: MOCK_IDS.RECIPE_LASAGNA, name: 'Short front recipe' }),
    builders.recipe({
      id: MOCK_IDS.RECIPE_CARBONARA,
      name: 'A backing recipe with a deliberately very long title that wraps through several lines on a narrow phone screen',
    }),
    builders.recipe({
      id: MOCK_IDS.RECIPE_CHICKEN,
      name: 'Another backing recipe with an even longer hidden title that must not stretch the visible stack below its front card',
    }),
  ];
  await page.route(
    (url) => url.pathname === '/api/recipes' && url.searchParams.get('order') === 'explore',
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          updatedAt: new Date().toISOString(),
          historyGeneration: 'measured-stack',
          recipes,
          pagination: { page: 1, limit: 20, total: recipes.length },
        }),
      });
    }
  );
  await page.goto('/recipes');
  const front = page.getByTestId('stack-card-front');
  await expect(front).toHaveAttribute('data-recipe-id', MOCK_IDS.RECIPE_LASAGNA);
  await expect(page.getByTestId('stack-card-back')).toHaveCount(2);
  await expect(page.getByTestId('stack-card-back').first().locator('h2')).toBeVisible();
  await expect(page.getByTestId('stack-card-back').first().locator('img')).toBeVisible();
  await expect(page.getByTestId('stack-card-back').nth(1).locator('h2')).not.toBeVisible();
  await expect(page.getByTestId('stack-navigation-actions')).toHaveCount(0);
  const readGeometry = () =>
    page.evaluate(() => {
      const frontFace = document
        .querySelector('[data-testid="stack-card-front"] > [data-testid^="stack-card-"]')!
        .getBoundingClientRect();
      const backs = [
        ...document.querySelectorAll(
          '[data-testid="stack-card-back"] > [data-testid^="stack-card-"]'
        ),
      ].map((node) => node.getBoundingClientRect());
      return {
        frontBottom: frontFace.bottom,
        backPeeks: backs.map((box) => box.bottom - frontFace.bottom),
      };
    });
  await expect
    .poll(async () => (await readGeometry()).backPeeks.some((peek) => peek > 0))
    .toBe(true);
  for (const scenario of [
    { width: 393, height: 852, scale: 1 },
    { width: 320, height: 568, scale: 1 },
    { width: 820, height: 1180, scale: 1 },
    { width: 393, height: 852, scale: 2 },
  ]) {
    await page.setViewportSize({ width: scenario.width, height: scenario.height });
    await page.evaluate((scale) => {
      document.documentElement.style.fontSize = `${scale * 16}px`;
    }, scenario.scale);
    await expect
      .poll(async () => (await readGeometry()).backPeeks.some((peek) => peek > 0))
      .toBe(true);
    const geometry = await readGeometry();
    expect(geometry.backPeeks.length).toBe(2);
    expect(
      geometry.backPeeks.every((peek) => peek > 0 && peek <= 32),
      JSON.stringify({ scenario, geometry })
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(
        `corrected-stack-${scenario.width}x${scenario.height}-${scenario.scale}x.png`
      ),
    });
  }
  await front.focus();
  await front.press('Enter');
  await expect(page.getByTestId('recipe-detail-sheet')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(front).toBeFocused();
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '16px';
  });
  await swipeCurrentStackCard(page, 'left');
  await expect(front).toHaveAttribute('data-recipe-id', MOCK_IDS.RECIPE_CARBONARA);
  await expect(front.locator('h2')).toBeVisible();
  await expect(front.locator('h2')).toContainText(
    'A backing recipe with a deliberately very long title'
  );
  await expect(page.getByTestId('recipe-detail-sheet')).toHaveCount(0);
});

test('the next real card remains visible during successive drags, including a missing hero', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await prepareNavigationMember(page);
  const recipes = [
    builders.recipe({ id: MOCK_IDS.RECIPE_LASAGNA, name: 'Short first recipe' }),
    builders.recipe({
      id: MOCK_IDS.RECIPE_CARBONARA,
      name: 'A long second recipe name that wraps but must stay inside its backing card',
    }),
    builders.recipe({ id: MOCK_IDS.RECIPE_STIR_FRY, name: 'Third recipe without a hero' }),
  ];
  await page.route(
    (url) => url.pathname === '/api/recipes' && url.searchParams.get('order') === 'explore',
    async (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          updatedAt: new Date().toISOString(),
          historyGeneration: 'visible-backing',
          recipes,
          pagination: { page: 1, limit: 20, total: recipes.length },
        }),
      })
  );
  await page.route('**/api/recipes/*/hero', async (route) => {
    if (route.request().url().includes(MOCK_IDS.RECIPE_STIR_FRY)) {
      await route.fulfill({ status: 404 });
    } else {
      await route.fulfill({ path: 'e2e/fixtures/cookbook-light.jpg', contentType: 'image/jpeg' });
    }
  });
  await page.goto('/recipes');
  const frontFor = (id: string) =>
    page.locator(`[data-testid="stack-card-front"][data-recipe-id="${id}"]`);
  const firstBack = page.getByTestId('stack-card-back').first();
  await expect(frontFor(MOCK_IDS.RECIPE_LASAGNA)).toBeVisible();
  await expect(firstBack.locator('h2')).toBeVisible();
  await expect(firstBack.locator('img')).toBeVisible();
  await expect(page.getByTestId('stack-card-back').nth(1).locator('h2')).not.toBeVisible();
  const backingTitleFits = await firstBack.evaluate((back) => {
    const face = back.firstElementChild!.getBoundingClientRect();
    const title = back.querySelector('h2')!.getBoundingClientRect();
    return title.bottom <= face.bottom + 1;
  });
  expect(backingTitleFits).toBe(true);
  await expect
    .poll(() => firstBack.locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0);

  const drag = async (id: string, screenshotName: string) => {
    const box = (await frontFor(id).boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + 140;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - 190, y, { steps: 12 });
    await page.screenshot({ path: testInfo.outputPath(screenshotName) });
    await page.mouse.up();
  };
  await drag(MOCK_IDS.RECIPE_LASAGNA, 'loaded-backing-mid-swipe.png');
  await expect(frontFor(MOCK_IDS.RECIPE_CARBONARA)).toBeVisible();
  await expect(page.getByTestId('recipe-detail-sheet')).toHaveCount(0);
  await expect(page.getByTestId('stack-card-back').first().locator('h2')).toBeVisible();
  await expect
    .poll(() =>
      page
        .getByTestId('stack-card-back')
        .first()
        .locator('img')
        .evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth === 0)
    )
    .toBe(true);
  await drag(MOCK_IDS.RECIPE_CARBONARA, 'missing-hero-backing-mid-swipe.png');
  await expect(frontFor(MOCK_IDS.RECIPE_STIR_FRY)).toBeVisible();
  await expect(frontFor(MOCK_IDS.RECIPE_STIR_FRY).locator('h2')).toContainText('Third recipe');
  await expect(page.getByTestId('recipe-detail-sheet')).toHaveCount(0);
});

test('Search keeps the next match visible beneath a swipe with controls hidden', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await prepareNavigationMember(page);
  let posts = 0;
  await page.route('**/api/recipes/search', async (route) => {
    posts++;
    await route.fulfill({
      json: {
        data: {
          topPick: {
            id: MOCK_IDS.RECIPE_LASAGNA,
            name: 'First Search match',
            imageUrl: '/test-card.svg',
            totalTime: 'PT30M',
          },
          results: [
            {
              id: MOCK_IDS.RECIPE_CARBONARA,
              name: 'Visible next Search match',
              imageUrl: '/test-card.svg',
              totalTime: 'PT45M',
            },
          ],
          nextCursor: null,
          appliedFilters: {},
          searchMode: 'explicit',
          resultPath: 'lexical-only',
        },
      },
    });
  });
  await page.route('**/test-card.svg', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#bb6655"/></svg>',
    })
  );
  await page.goto('/recipes?focus=search');
  await page.getByTestId('recipe-search-input').fill('dinner');
  await page.getByTestId('recipe-search-input').press('Enter');
  await expect(page.getByTestId('stack-card-front')).toHaveAttribute(
    'data-recipe-id',
    MOCK_IDS.RECIPE_LASAGNA
  );
  await page.getByTestId('recipes-search-disclosure').click();
  await expect(page.getByTestId('recipes-search-active-marker')).toBeVisible();
  const back = page.getByTestId('stack-card-back').first();
  await expect(back.locator('h2')).toContainText('Visible next Search match');
  await expect(back.locator('h2')).toBeVisible();
  await expect
    .poll(() => back.locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0);
  const front = page.getByTestId('stack-card-front');
  const box = (await front.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + 140);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 190, box.y + 140, { steps: 12 });
  await page.screenshot({ path: testInfo.outputPath('search-backing-mid-swipe.png') });
  await page.mouse.up();
  await expect
    .poll(() =>
      front.evaluateAll((cards) => cards.map((card) => card.getAttribute('data-recipe-id')))
    )
    .toEqual([MOCK_IDS.RECIPE_CARBONARA]);
  expect(posts).toBe(1);
  await expect(page.getByTestId('recipe-detail-sheet')).toHaveCount(0);
});

test('stack photo and time remain readable on short and enlarged screens', async ({
  page,
}, testInfo) => {
  await prepareNavigationMember(page);
  for (const scenario of [
    { width: 393, height: 852, scale: 1 },
    { width: 320, height: 568, scale: 1 },
    { width: 667, height: 375, scale: 1 },
    { width: 393, height: 852, scale: 2 },
    { width: 820, height: 1180, scale: 2 },
  ]) {
    await page.setViewportSize({ width: scenario.width, height: scenario.height });
    await page.goto('/recipes');
    if (scenario.scale === 2) {
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '32px';
      });
    }
    const badge = page.getByTestId('stack-time-badge').first();
    await expect(page.getByTestId('stack-navigation-actions')).toHaveCount(0);
    await expect(badge).toContainText('READY IN');
    const badgeGeometry = await badge.evaluate((node) => {
      const box = node.getBoundingClientRect();
      const image = node.closest('[data-testid="stack-card-image"]')!.getBoundingClientRect();
      return {
        contained:
          box.left >= image.left &&
          box.right <= image.right &&
          box.top >= image.top &&
          box.bottom <= image.bottom,
        background: getComputedStyle(node).backgroundColor,
      };
    });
    expect(badgeGeometry.contained).toBe(true);
    expect(badgeGeometry.background).toMatch(/^rgb\(/);
    const titleGeometry = await page
      .getByTestId('stack-card-front')
      .locator('h2')
      .evaluate((node) => {
        const title = node.getBoundingClientRect();
        const card = node.closest('[data-testid^="stack-card-"]')!.getBoundingClientRect();
        return {
          contained: title.top >= card.top && title.bottom <= card.bottom,
          titleTop: title.top,
          titleBottom: title.bottom,
          cardTop: card.top,
          cardBottom: card.bottom,
        };
      });
    expect(titleGeometry.contained, JSON.stringify({ scenario, titleGeometry })).toBe(true);
    const discovery = page.getByTestId('stack-toggle-discoverable');
    await discovery.scrollIntoViewIfNeeded();
    const discoveryBox = await discovery.boundingBox();
    const dockBox = await page.getByTestId('app-bottom-navigation').boundingBox();
    expect(discoveryBox!.y + discoveryBox!.height).toBeLessThanOrEqual(dockBox!.y + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    await page.screenshot({
      path: testInfo.outputPath(
        `stack-${scenario.width}x${scenario.height}-${scenario.scale}x.png`
      ),
    });
  }
});

test('direct detail context takes focus before expanded Search input', async ({ page }) => {
  await prepareNavigationMember(page);
  await page.goto(`/recipes?focus=search&open=${MOCK_IDS.RECIPE_LASAGNA}`);
  await expect(page.getByTestId('recipe-detail-sheet')).toBeVisible();
  await expect
    .poll(() =>
      page
        .getByTestId('recipe-detail-sheet')
        .evaluate((node) => node.contains(document.activeElement))
    )
    .toBe(true);
  await expect(page.getByTestId('recipe-search-input')).not.toBeFocused();
});

test('rendered toolbar and empty recovery text meet measured composite contrast', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 667 });
  await prepareNavigationMember(page);
  await page.route('**/api/recipes/search', (route) =>
    route.fulfill({
      json: {
        data: {
          topPick: null,
          results: [],
          nextCursor: null,
          appliedFilters: {},
          searchMode: 'explicit',
          resultPath: 'lexical-only',
        },
      },
    })
  );
  await page.goto('/recipes?focus=search');
  await page.getByTestId('recipe-search-input').fill('impossible supper');
  await page.getByTestId('recipe-search-input').press('Enter');
  await expect(page.getByTestId('search-empty-state')).toBeVisible();
  const ratios = await page.evaluate(() => {
    const parse = (value: string) => {
      const parts = value.match(/-?[\d.]+/g)?.map(Number) ?? [];
      if (value.startsWith('oklab(')) {
        const [L, a, b] = parts;
        const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
        const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
        const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
        const linear = [
          4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
          -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
          -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
        ];
        return [
          ...linear.map(
            (channel) =>
              255 * (channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055)
          ),
          parts[3] ?? 1,
        ];
      }
      return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, parts[3] ?? 1];
    };
    const blend = (top: number[], bottom: number[]) =>
      top.slice(0, 3).map((channel, index) => channel * top[3] + bottom[index] * (1 - top[3]));
    const luminance = (rgb: number[]) => {
      const linear = rgb.map((value) => {
        const s = value / 255;
        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
    };
    const ratio = (id: string) => {
      const element = document.querySelector(`[data-testid="${id}"]`)!;
      const chain: Element[] = [];
      for (let node: Element | null = element; node; node = node.parentElement) chain.unshift(node);
      let background = [255, 255, 255];
      for (const node of chain)
        background = blend(parse(getComputedStyle(node).backgroundColor), background);
      const text = blend(parse(getComputedStyle(element).color), background);
      const a = luminance(background),
        b = luminance(text);
      return Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100;
    };
    return {
      toolbarScope: ratio('stack-toggle-discoverable'),
      emptyClear: ratio('search-empty-clear-search'),
      rawScope: [
        getComputedStyle(document.querySelector('[data-testid="stack-toggle-discoverable"]')!)
          .color,
        getComputedStyle(document.querySelector('[data-testid="stack-toggle-discoverable"]')!)
          .backgroundColor,
      ],
      rawClear: [
        getComputedStyle(document.querySelector('[data-testid="search-empty-clear-search"]')!)
          .color,
        getComputedStyle(document.querySelector('[data-testid="search-empty-clear-search"]')!)
          .backgroundColor,
      ],
    };
  });
  await testInfo.attach('composite-contrast', {
    body: JSON.stringify(ratios, null, 2),
    contentType: 'application/json',
  });
  expect(ratios.toolbarScope).toBeGreaterThanOrEqual(4.5);
  expect(ratios.emptyClear).toBeGreaterThanOrEqual(4.5);
});

for (const mode of ['stack', 'list'] as const) {
  test(`ordinary Recipes entry uses Explore in saved ${mode} view`, async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);
    await page.addInitScript(
      ({ id, mode }) => {
        localStorage.setItem(
          'family-storage',
          JSON.stringify({
            state: {
              selectedFamilyMemberId: id,
              familyMembers: [{ id, name: 'Alex', browseViewMode: mode }],
              hasLoaded: true,
            },
            version: 0,
          })
        );
      },
      { id: MOCK_IDS.MEMBER_ALEX, mode }
    );
    await setupCommonRoutes(page);
    await page.route('**/api/family', async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            builders.familyMember({ id: MOCK_IDS.MEMBER_ALEX, name: 'Alex', browseViewMode: mode }),
          ],
        }),
      });
    });
    let searchCalls = 0;
    const calls: string[] = [];
    await page.route('**/api/recipes/search', async (route) => {
      searchCalls++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            topPick: {
              id: MOCK_IDS.RECIPE_CHICKEN,
              name: 'Chicken Soup',
              description: 'Comforting soup',
              imageUrl: '/soup.jpg',
              totalTime: 'PT30M',
            },
            results: [
              { id: MOCK_IDS.RECIPE_CHICKEN, name: 'Chicken Soup', imageUrl: '/soup.jpg' },
              {
                id: MOCK_IDS.RECIPE_STIR_FRY,
                name: 'Chicken Stir Fry',
                description: 'Fast dinner',
                imageUrl: '/stir-fry.jpg',
                totalTime: 'PT20M',
              },
            ],
            nextCursor: null,
            appliedFilters: {},
            searchMode: 'explicit',
            resultPath: 'lexical-only',
          },
        }),
      });
    });
    await page.route('**/api/recipes/library-summary', async (route) => {
      calls.push('summary');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { total: 1, neverCooked: 1, ratings: { love: 0, like: 0, dislike: 0, unrated: 1 } },
        }),
      });
    });
    await page.route('**/api/recipes?**order=explore**', async (route) => {
      calls.push('explore');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          recipes: [builders.recipe({ id: MOCK_IDS.RECIPE_LASAGNA, name: 'Lasagna' })],
          pagination: { page: 1, limit: mode === 'stack' ? 20 : 12, total: 1 },
        }),
      });
    });

    await page.goto('/recipes');
    await expect(
      page.getByTestId(mode === 'stack' ? 'stack-card-front' : 'browse-list-recipe-card')
    ).toBeVisible();
    expect(calls.filter((call) => call === 'explore')).toHaveLength(1);
    expect(calls[0]).toBe('summary');
    expect(searchCalls).toBe(0);
    await expect(page.getByTestId('recipe-search-input')).toHaveCount(0);
    await expect(page.getByTestId('browse-all-exit')).toHaveCount(0);

    await page.getByTestId('recipes-search-disclosure').click();
    await expect(page.getByTestId('recipe-search-input')).toBeFocused();
    expect(searchCalls).toBe(0);
    await page.getByTestId('recipe-search-input').fill('chicken');
    await page.getByTestId('recipe-search-input').press('Enter');
    await expect(
      page.getByTestId(mode === 'stack' ? 'stack-card-front' : 'browse-list-recipe-card').first()
    ).toContainText('Chicken Soup');
    if (mode === 'list') await expect(page.getByTestId('browse-list-recipe-card')).toHaveCount(2);
    expect(searchCalls).toBe(1);

    await page.goto(`/recipes?similarTo=${MOCK_IDS.RECIPE_LASAGNA}`);
    await expect(page.getByTestId('search-similar-chip-remove')).toBeVisible();
    await expect(
      page.getByTestId(mode === 'stack' ? 'stack-card-front' : 'browse-list-recipe-card').first()
    ).toContainText('Chicken Soup');
    expect(searchCalls).toBe(2);

    await page.goto('/recipes?addToDay=2&weekOffset=0&referenceWeekStartDate=2026-05-04');
    await expect(page.getByTestId('planning-mode-banner')).toBeVisible();
    await expect(page.getByTestId('recipe-search-input')).toBeFocused();
    await page.getByTestId('recipes-search-disclosure').click();
    await expect(page.getByTestId('recipe-search-input')).toHaveCount(0);
    await expect(page.getByTestId('planning-mode-banner')).toBeVisible();
  });

  test(`Search disclosure and departure lifecycle in ${mode} view`, async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);
    await page.addInitScript(
      ({ id, mode }) =>
        localStorage.setItem(
          'family-storage',
          JSON.stringify({
            state: {
              selectedFamilyMemberId: id,
              familyMembers: [{ id, name: 'Alex', browseViewMode: mode }],
              hasLoaded: true,
            },
            version: 0,
          })
        ),
      { id: MOCK_IDS.MEMBER_ALEX, mode }
    );
    await setupCommonRoutes(page);
    await page.route('**/api/family', (route) =>
      route.fulfill({
        json: {
          data: [
            builders.familyMember({
              id: MOCK_IDS.MEMBER_ALEX,
              name: 'Alex',
              browseViewMode: mode,
            }),
          ],
        },
      })
    );
    let searchCalls = 0;
    await page.route('**/api/recipes/search', (route) => {
      searchCalls++;
      return route.fulfill({
        json: {
          data: {
            topPick: {
              id: MOCK_IDS.RECIPE_LASAGNA,
              name: 'Lasagna',
              imageUrl: '/lasagna.jpg',
              totalTime: 'PT45M',
            },
            results: [
              {
                id: MOCK_IDS.RECIPE_STIR_FRY,
                name: 'Stir Fry',
                imageUrl: '/stir-fry.jpg',
                totalTime: 'PT20M',
              },
            ],
            nextCursor: null,
            appliedFilters: {},
            searchMode: 'explicit',
            resultPath: 'lexical-only',
          },
        },
      });
    });
    await page.goto('/recipes');
    await expect(
      page.getByTestId(mode === 'stack' ? 'stack-card-front' : 'browse-list-recipe-card').first()
    ).toBeVisible();
    await page.getByTestId('recipes-search-disclosure').click();
    const input = page.getByTestId('recipe-search-input');
    await input.fill('lasagna');
    await input.press('Enter');
    const expectStirFryFront = async () => {
      await expect
        .poll(() =>
          page
            .getByTestId('stack-card-front')
            .evaluateAll((cards) => cards.map((card) => card.getAttribute('data-recipe-id')))
        )
        .toEqual([MOCK_IDS.RECIPE_STIR_FRY]);
      await expect(page.getByTestId('stack-card-front')).toContainText('Stir Fry');
    };
    await expect(
      page.getByTestId(mode === 'stack' ? 'stack-card-front' : 'browse-list-recipe-card').first()
    ).toContainText('Lasagna');
    if (mode === 'stack') {
      await swipeCurrentStackCard(page, 'left');
      await expectStirFryFront();
    }
    await page
      .getByTestId(mode === 'stack' ? 'stack-card-front' : 'browse-list-recipe-card')
      .first()
      .click();
    await expect(page.getByTestId('recipe-detail-sheet')).toBeVisible();
    await page.getByTestId('action-close-sheet').click();
    await expect(page.getByTestId('recipe-detail-sheet')).toHaveCount(0);
    if (mode === 'stack') await expectStirFryFront();
    expect(searchCalls).toBe(1);
    await page.getByTestId('nav-item-recipes').click();
    await expect(page.getByTestId('recipe-search-input')).toHaveValue('lasagna');
    if (mode === 'stack') await expectStirFryFront();
    expect(searchCalls).toBe(1);
    await page.getByTestId('recipes-search-disclosure').click();
    await expect(page.getByTestId('recipe-search-input')).toHaveCount(0);
    await expect(page.getByTestId('recipes-search-active-marker')).toBeVisible();
    await expect(page.getByTestId('recipes-search-disclosure')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    await page.getByTestId('recipes-search-disclosure').click();
    await expect(input).toHaveValue('lasagna');
    await expect(input).toBeFocused();
    if (mode === 'stack') await expectStirFryFront();
    expect(searchCalls).toBe(1);
    await input.press('Escape');
    await expect(page.getByTestId('recipes-search-disclosure')).toBeFocused();
    await page.getByTestId('nav-item-home').click();
    await expect(page).toHaveURL(/\/home$/);
    await page.getByTestId('nav-item-recipes').click();
    await expect(page.getByTestId('recipes-search-disclosure')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    await expect(page.getByTestId('recipes-search-active-marker')).toHaveCount(0);
    await expect(page.getByTestId('recipe-search-input')).toHaveCount(0);
    await expect(
      page.getByTestId(mode === 'stack' ? 'stack-card-front' : 'browse-list-recipe-card').first()
    ).toBeVisible();
    expect(searchCalls).toBe(1);
    await page.getByTestId('recipes-search-disclosure').click();
    await page.getByTestId('recipe-search-input').fill('lasagna');
    await page.getByTestId('recipe-search-input').press('Enter');
    await expect(page.getByTestId('recipes-search-active-marker')).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId('recipes-search-disclosure')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    await expect(page.getByTestId('recipes-search-active-marker')).toHaveCount(0);
    await page.getByTestId('recipes-search-disclosure').click();
    await page.getByTestId('recipe-search-input').fill('lasagna');
    await page.getByTestId('recipe-search-input').press('Enter');
    await expect(
      page.getByTestId(mode === 'stack' ? 'stack-card-front' : 'browse-list-recipe-card').first()
    ).toContainText('Lasagna');
    await page.getByTestId('nav-item-home').click();
    await expect(page).toHaveURL(/\/home$/);
    await page.goBack();
    await expect(page.getByTestId('recipes-search-disclosure')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    await expect(page.getByTestId('recipe-search-input')).toHaveCount(0);
    await expect(page.getByTestId('recipes-search-active-marker')).toHaveCount(0);
  });
}

test('saves member list presentation through the existing preferences endpoint while Search stays transient', async ({
  page,
}) => {
  const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
  await page
    .context()
    .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);
  await page.addInitScript(
    (id) =>
      localStorage.setItem(
        'family-storage',
        JSON.stringify({
          state: { selectedFamilyMemberId: id },
          version: 0,
        })
      ),
    MOCK_IDS.MEMBER_ALEX
  );
  await setupCommonRoutes(page);
  await page.goto('/recipes');
  await expect(page.getByTestId('stack-card-front')).toBeVisible();
  const preferenceSave = page.waitForResponse(
    (response) =>
      response.url().includes('/api/family/') &&
      response.url().endsWith('/preferences') &&
      response.request().method() === 'PUT'
  );
  await page.getByTestId('browse-view-list').click();
  expect((await preferenceSave).status()).toBe(200);
  await expect(page.getByTestId('browse-list-recipe-card').first()).toBeVisible();
  await page.getByTestId('recipes-search-disclosure').click();
  await page.getByTestId('recipe-search-input').fill('Mock');
  await page.getByTestId('recipe-search-input').press('Enter');
  await expect(page.getByTestId('browse-list-recipe-card').first()).toContainText('Mock Recipe');
  await page.reload();
  await expect(page.getByTestId('browse-list-recipe-card').first()).toBeVisible();
  await expect(page.getByTestId('recipes-search-disclosure')).toHaveAttribute(
    'aria-expanded',
    'false'
  );
  await expect(page.getByTestId('recipe-search-input')).toHaveCount(0);
});

test('hiding Search preserves a scrolled list and its loaded results', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 667 });
  const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
  await page
    .context()
    .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);
  await page.addInitScript(
    (id) =>
      localStorage.setItem(
        'family-storage',
        JSON.stringify({
          state: {
            selectedFamilyMemberId: id,
            familyMembers: [{ id, name: 'Alex', browseViewMode: 'list' }],
            hasLoaded: true,
          },
          version: 0,
        })
      ),
    MOCK_IDS.MEMBER_ALEX
  );
  await setupCommonRoutes(page);
  await page.route('**/api/family', (route) =>
    route.fulfill({
      json: {
        data: [
          builders.familyMember({
            id: MOCK_IDS.MEMBER_ALEX,
            name: 'Alex',
            browseViewMode: 'list',
          }),
        ],
      },
    })
  );
  let postCount = 0;
  await page.route('**/api/recipes/search', (route) => {
    postCount++;
    return route.fulfill({
      json: {
        data: {
          topPick: null,
          results: Array.from({ length: 12 }, (_, index) => ({
            id: `660e8400-e29b-41d4-a716-${String(index + 100).padStart(12, '0')}`,
            name: `Recipe ${index + 1}`,
            imageUrl: '/test-card.svg',
            totalTime: 'PT20M',
          })),
          nextCursor: null,
          appliedFilters: {},
          searchMode: 'explicit',
          resultPath: 'lexical-only',
        },
      },
    });
  });
  await page.goto('/recipes?focus=search');
  await page.getByTestId('recipe-search-input').fill('recipe');
  await page.getByTestId('recipe-search-input').press('Enter');
  await expect(page.getByTestId('browse-list-recipe-card')).toHaveCount(12);
  const scroller = page.getByTestId('browse-list-scroll-container');
  await scroller.evaluate((node) => {
    node.scrollTop = 500;
    node.dispatchEvent(new Event('scroll'));
  });
  await expect.poll(() => scroller.evaluate((node) => node.scrollTop)).toBeGreaterThan(300);
  const before = await scroller.evaluate((node) => node.scrollTop);
  await page.setViewportSize({ width: 393, height: 600 });
  const afterResize = await scroller.evaluate((node) => node.scrollTop);
  expect(afterResize).toBeGreaterThanOrEqual(before - 30);
  expect(afterResize).toBeLessThanOrEqual(before + 30);
  await page.getByTestId('recipes-search-disclosure').click();
  await expect(page.getByTestId('browse-list-recipe-card')).toHaveCount(12);
  expect(await scroller.evaluate((node) => node.scrollTop)).toBeGreaterThanOrEqual(before - 30);
  await page.getByTestId('recipes-search-disclosure').click();
  await expect(page.getByTestId('recipe-search-input')).toHaveValue('recipe');
  await expect.poll(() => scroller.evaluate((node) => node.scrollTop)).toBe(afterResize);
  expect(postCount).toBe(1);
});

test('confirmed Go-To change retries only its failed Explore read', async ({ page }) => {
  const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
  await page
    .context()
    .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);
  await page.addInitScript(
    (id) =>
      localStorage.setItem(
        'family-storage',
        JSON.stringify({
          state: { selectedFamilyMemberId: id },
          version: 0,
        })
      ),
    MOCK_IDS.MEMBER_ALEX
  );
  await setupCommonRoutes(page);
  await page.goto('/recipes');
  await page.evaluate(async (recipeId) => {
    const response = await fetch('/api/goto', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ recipeId, description: 'Saved', status: 'ready' }] }),
    });
    if (!response.ok) throw new Error('Could not seed Go-To membership');
  }, MOCK_IDS.RECIPE_LASAGNA);
  await page.goto('/recipes?gotoOnly=true');
  await expect(page.getByTestId('stack-card-front')).toBeVisible();
  let failedReads = false;
  let allowRead = false;
  let mutationCount = 0;
  page.on('response', (response) => {
    if (
      response.url().endsWith('/api/goto') &&
      response.request().method() === 'PUT' &&
      response.status() === 200
    ) {
      mutationCount++;
      failedReads = true;
    }
  });
  await page.route('**/api/recipes?**', async (route) => {
    if (failedReads && !allowRead)
      return route.fulfill({ status: 503, json: { message: 'Read temporarily unavailable' } });
    return route.fallback();
  });
  await page.getByTestId('stack-card-front').click();
  await expect(page.getByTestId('action-current-goto')).toBeVisible();
  await page.getByTestId('action-current-goto').click();
  await expect.poll(() => mutationCount).toBe(1);
  await page.getByTestId('action-close-sheet').click();
  await expect(page.getByTestId('browse-request-error')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('stack-card-front')).toBeVisible();
  allowRead = true;
  await page.getByTestId('browse-request-retry').click();
  await expect(page.getByTestId('stack-card-front')).toHaveCount(0);
  await expect(page.getByTestId('browse-goto-empty')).toBeVisible();
  expect(mutationCount).toBe(1);
});

test('planner entry resolves an occupied target before assigning the selected recipe', async ({
  page,
}) => {
  const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
  await page
    .context()
    .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);
  await page.addInitScript(
    (id) =>
      localStorage.setItem(
        'family-storage',
        JSON.stringify({
          state: { selectedFamilyMemberId: id },
          version: 0,
        })
      ),
    MOCK_IDS.MEMBER_ALEX
  );
  await setupCommonRoutes(page);
  await page.goto('/recipes');
  await page.evaluate(async (recipeId) => {
    const response = await fetch('/api/schedule/assign?referenceWeekStartDate=2026-05-04', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekOffset: 1, dayIndex: 2, recipeId, requireEmpty: true }),
    });
    if (!response.ok) throw new Error('Could not seed occupied planner slot');
  }, MOCK_IDS.RECIPE_CHICKEN);
  let assignments = 0;
  let removals = 0;
  page.on('request', (request) => {
    if (request.url().includes('/api/schedule/assign') && request.method() === 'POST')
      assignments++;
    if (
      request.url().includes('/api/schedule/day/') &&
      request.url().endsWith('/remove') &&
      request.method() === 'DELETE'
    )
      removals++;
  });
  await page.goto('/recipes?addToDay=2&weekOffset=1&referenceWeekStartDate=2026-05-04');
  await expect(page.getByTestId('planning-mode-banner')).toBeVisible();
  await expect(page.getByTestId('recipe-search-input')).toBeFocused();
  await page.getByTestId('stack-card-front').click();
  await page.getByTestId('action-add-to-day').click();
  await expect(page.getByTestId('recovery-action-drop')).toBeVisible();
  expect(assignments).toBe(0);
  await page.getByTestId('recovery-action-drop').click();
  await expect(page).toHaveURL(
    /\/planner\?success=1&dayIndex=2&weekOffset=1&referenceWeekStartDate=2026-05-04/
  );
  expect(removals).toBe(1);
  expect(assignments).toBe(1);
});
