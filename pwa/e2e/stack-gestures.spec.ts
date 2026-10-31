import { test, expect, type Page } from './fixtures';
import { MOCK_IDS, builders, setupCommonRoutes } from './mock-api';

async function openStack(page: Page, baseURL: string, title?: string) {
  await setupCommonRoutes(page);
  await page.route('https://images.unsplash.com/**', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg"/>',
    })
  );
  await page.route(
    (url) => url.pathname === '/api/recipes/library-summary',
    (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          data: { total: 3, neverCooked: 3, ratings: { love: 0, like: 0, dislike: 0, unrated: 3 } },
        }),
      })
  );
  await page.route(
    (url) => url.pathname === '/api/recipes',
    (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          recipes: [
            MOCK_IDS.RECIPE_LASAGNA,
            MOCK_IDS.RECIPE_CARBONARA,
            MOCK_IDS.RECIPE_CHICKEN,
          ].map((id, index) =>
            builders.recipe({
              id,
              name: title ?? `Recipe ${index + 1}`,
              description: 'A family recipe with a readable description.',
            })
          ),
          pagination: { page: 1, limit: 20, total: 3 },
          updatedAt: '2026-05-04T12:00:00Z',
        }),
      })
  );
  await page
    .context()
    .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseURL }]);
  await page.addInitScript((id) => {
    localStorage.setItem(
      'family-storage',
      JSON.stringify({
        state: { selectedFamilyMemberId: id },
        version: 0,
      })
    );
  }, MOCK_IDS.MEMBER_ALEX);
  await page.goto('/browse-all-stack');
  await expect(page.getByTestId('stack-card-front')).toHaveCount(1);
  await page.getByTestId('stack-card-front').click({ trial: true });
}

async function shortMouseDrag(page: Page, distance: number) {
  const card = page.getByTestId('stack-card-front');
  const box = await card.boundingBox();
  if (!box) throw new Error('Missing front card');
  const x = box.x + box.width / 2;
  const y = box.y + 80;
  await page.mouse.move(x, y);
  await page.mouse.down();
  // Sample a deliberately slow gesture so velocity cannot turn it into navigation.
  for (let step = 1; step <= 6; step++) {
    await page.mouse.move(x + (distance * step) / 6, y);
    await page.waitForTimeout(30);
  }
  await page.waitForTimeout(150);
  await page.mouse.up();
  await expect
    .poll(() =>
      card.evaluate((node) => new DOMMatrixReadOnly(getComputedStyle(node).transform).m41)
    )
    .toBeCloseTo(0, 0);
}

test('first fresh tap after repeated incomplete drags opens the same recipe', async ({
  page,
  baseURL,
}) => {
  await openStack(page, baseURL!);
  const id = await page.getByTestId('stack-card-front').getAttribute('data-recipe-id');
  const position = await page.getByTestId('stack-depth-indicator').textContent();
  await shortMouseDrag(page, 12);
  await shortMouseDrag(page, -12);
  await expect(page.getByTestId('recipe-detail-sheet')).not.toBeVisible();
  await page.getByTestId('stack-card-front').click();
  await expect(page.getByTestId('recipe-detail-sheet')).toBeVisible();
  await page.getByTestId('action-close-sheet').click();
  await expect(page.getByTestId('stack-card-front')).toHaveAttribute('data-recipe-id', id!);
  await expect(page.getByTestId('stack-depth-indicator')).toHaveText(position!);
});

for (const input of ['mouse', 'touch'] as const) {
  test.describe(`${input} direct manipulation`, () => {
    test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
    test('Browse follows the held displacement directly', async ({ page, baseURL }) => {
      await openStack(page, baseURL!);
      const card = page.getByTestId('stack-card-front');
      const box = await card.boundingBox();
      if (!box) throw new Error('Missing front card');
      const x = box.x + box.width / 2;
      const y = box.y + 80;
      const touch = input === 'touch' ? await page.context().newCDPSession(page) : null;
      if (touch)
        await touch.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [{ x, y }],
        });
      else {
        await page.mouse.move(x, y);
        await page.mouse.down();
      }
      for (let step = 1; step <= 10; step++) {
        if (touch)
          await touch.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x: x + step * 6, y }],
          });
        else await page.mouse.move(x + step * 6, y);
        await page.waitForTimeout(25);
      }
      await expect
        .poll(() =>
          card.evaluate((node) => new DOMMatrixReadOnly(getComputedStyle(node).transform).m41)
        )
        .toBeCloseTo(60, 0);
      if (touch) {
        await touch.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
        await touch.detach();
      } else await page.mouse.up();
    });
  });
}

test.describe('touch interruption', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  for (const distance of [12, 45, -45]) {
    test(`cancel after ${distance}px keeps position and the next tap works`, async ({
      page,
      baseURL,
    }) => {
      await openStack(page, baseURL!);
      const card = page.getByTestId('stack-card-front');
      const originalCard = await card.elementHandle();
      const id = await card.getAttribute('data-recipe-id');
      const position = await page.getByTestId('stack-depth-indicator').textContent();
      const box = await card.boundingBox();
      if (!box) throw new Error('Missing front card');
      const x = box.x + box.width / 2;
      const y = box.y + 80;
      const session = await page.context().newCDPSession(page);
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x, y }],
      });
      for (let step = 1; step <= 10; step++) {
        await session.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x: x + (distance * step) / 10, y }],
        });
        await page.waitForTimeout(25);
      }
      await expect
        .poll(() =>
          card.evaluate((node) => new DOMMatrixReadOnly(getComputedStyle(node).transform).m41)
        )
        .toBeCloseTo(distance, 0);
      await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
      await session.detach();
      await expect
        .poll(() =>
          card.evaluate((node) => new DOMMatrixReadOnly(getComputedStyle(node).transform).m41)
        )
        .toBeCloseTo(0, 0);
      expect(await originalCard!.evaluate((node) => node.isConnected)).toBe(true);
      await expect(card).toHaveAttribute('data-recipe-id', id!);
      await expect(page.getByTestId('stack-depth-indicator')).toHaveText(position!);
      await expect(page.getByTestId('recipe-detail-sheet')).not.toBeVisible();
      await page.touchscreen.tap(x, y);
      await expect(page.getByTestId('recipe-detail-sheet')).toBeVisible();
    });
  }
});

for (const input of ['mouse', 'touch'] as const) {
  test.describe(`${input} tap recovery`, () => {
    test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
    test('incidental motion and repeated short drags preserve detail activation', async ({
      page,
      baseURL,
    }) => {
      await openStack(page, baseURL!);
      const votes: string[] = [];
      page.on('request', (request) => {
        if (new URL(request.url()).pathname.endsWith('/vote')) votes.push(request.url());
      });
      const card = page.getByTestId('stack-card-front');
      const id = await card.getAttribute('data-recipe-id');
      const position = await page.getByTestId('stack-depth-indicator').textContent();
      const box = await card.boundingBox();
      if (!box) throw new Error('Missing front card');
      const x = box.x + box.width / 2;
      const y = box.y + 80;
      const session = input === 'touch' ? await page.context().newCDPSession(page) : null;
      const drag = async (distance: number) => {
        if (!session) return shortMouseDrag(page, distance);
        await session.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [{ x, y }],
        });
        for (let step = 1; step <= 6; step++) {
          await session.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x: x + (distance * step) / 6, y }],
          });
          await page.waitForTimeout(30);
        }
        await page.waitForTimeout(150);
        await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      };
      await drag(2);
      await expect(page.getByTestId('recipe-detail-sheet')).toBeVisible();
      await page.getByTestId('action-close-sheet').click();
      for (const distance of [12, -12, 12]) {
        await drag(distance);
        await expect
          .poll(() =>
            card.evaluate((node) => new DOMMatrixReadOnly(getComputedStyle(node).transform).m41)
          )
          .toBeCloseTo(0, 0);
        await expect(page.getByTestId('recipe-detail-sheet')).not.toBeVisible();
      }
      if (session) {
        await session.detach();
        await page.touchscreen.tap(x, y);
      } else await card.click();
      await expect(page.getByTestId('recipe-detail-sheet')).toHaveCount(1);
      await expect(page.getByTestId('recipe-detail-sheet')).toBeVisible();
      await page.getByTestId('action-close-sheet').click();
      await expect(card).toHaveAttribute('data-recipe-id', id!);
      await expect(page.getByTestId('stack-depth-indicator')).toHaveText(position!);
      expect(votes).toEqual([]);
    });
  });
}

for (const viewport of [
  { width: 390, height: 844 },
  { width: 320, height: 568 },
  { width: 390, height: 700 },
  { width: 768, height: 1024 },
]) {
  test(`reachable layout and keyboard at ${viewport.width}x${viewport.height}`, async ({
    page,
    baseURL,
  }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openStack(page, baseURL!);
    const card = page.getByTestId('stack-card-front');
    await expect(card).toHaveRole('button');
    await expect(card).toHaveAccessibleName(/Open recipe details/);
    for (const key of ['Enter', 'Space']) {
      await card.focus();
      await page.keyboard.press(key);
      await expect(page.getByTestId('recipe-detail-sheet')).toBeVisible();
      await page.getByTestId('action-close-sheet').click();
    }
    await page.getByTestId('stack-action-bar').scrollIntoViewIfNeeded();
    await expect(page.getByTestId('stack-action-bar')).toBeInViewport();
    await expect(page.getByTestId('browse-all-exit')).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    // Ordinary-phone sizing and short-screen adaptations remain the release's CSS.
    await expect(page.getByTestId('browse-stack-layout')).toHaveClass(/max-w-sm/);
    await expect(card).toHaveCSS('touch-action', 'pan-y');
  });
}

for (const departure of ['filter', 'list', 'close'] as const) {
  test(`leaving by ${departure} during a swipe cannot activate old navigation`, async ({
    page,
    baseURL,
  }) => {
    await openStack(page, baseURL!);
    const card = page.getByTestId('stack-card-front');
    const box = await card.boundingBox();
    if (!box) throw new Error('Missing front card');
    const x = box.x + box.width / 2;
    const y = box.y + 80;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - 90, y, { steps: 10 });
    await page.mouse.up();
    const target =
      departure === 'filter'
        ? 'stack-toggle-discoverable'
        : departure === 'list'
          ? 'browse-view-list'
          : 'browse-all-exit';
    await page.getByTestId(target).click();
    // Sample after the old 240ms departure completion could have fired.
    await page.waitForTimeout(350);
    await expect(page.getByTestId('recipe-detail-sheet')).not.toBeVisible();
    if (departure === 'filter')
      await expect(page.getByTestId('stack-depth-indicator')).toHaveText('1 / 3');
    if (departure === 'list') {
      await expect(page.getByTestId('stack-card-front')).toHaveCount(0);
      await page.getByTestId('browse-view-stack').click();
      await expect(page.getByTestId('stack-depth-indicator')).toHaveText('1 / 3');
    }
    if (departure === 'close')
      await expect(page.getByTestId('browse-all-stack-container')).not.toBeVisible();
  });
}

for (const input of ['mouse', 'touch'] as const) {
  test.describe(`${input} card hit regions`, () => {
    test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
    test('image, title and body all grab without a hold', async ({ page, baseURL }) => {
      await openStack(page, baseURL!);
      const card = page.getByTestId('stack-card-front');
      for (const region of ['img', 'h2', 'p']) {
        const target = card.locator(region).first();
        await target.scrollIntoViewIfNeeded();
        const box = await target.boundingBox();
        if (!box) throw new Error(`Missing ${region}`);
        const x = box.x + box.width / 2;
        const y = box.y + box.height / 2;
        const session = input === 'touch' ? await page.context().newCDPSession(page) : null;
        if (session)
          await session.send('Input.dispatchTouchEvent', {
            type: 'touchStart',
            touchPoints: [{ x, y }],
          });
        else {
          await page.mouse.move(x, y);
          await page.mouse.down();
        }
        for (let step = 1; step <= 6; step++) {
          if (session)
            await session.send('Input.dispatchTouchEvent', {
              type: 'touchMove',
              touchPoints: [{ x: x + (20 * step) / 6, y }],
            });
          else await page.mouse.move(x + (20 * step) / 6, y);
          await page.waitForTimeout(25);
        }
        await expect
          .poll(() =>
            card.evaluate((node) => new DOMMatrixReadOnly(getComputedStyle(node).transform).m41)
          )
          .toBeCloseTo(20, 0);
        await page.waitForTimeout(150);
        if (session) {
          await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          await session.detach();
        } else await page.mouse.up();
        await expect
          .poll(() =>
            card.evaluate((node) => new DOMMatrixReadOnly(getComputedStyle(node).transform).m41)
          )
          .toBeCloseTo(0, 0);
        await expect(page.getByTestId('recipe-detail-sheet')).not.toBeVisible();
        await expect(page.getByTestId('stack-depth-indicator')).toHaveText('1 / 3');
      }
    });
  });
}

test.describe('short-phone scrolling remains available', () => {
  test.use({ hasTouch: true, viewport: { width: 320, height: 568 } });
  test('vertical scrolling inside the card does not navigate or open detail', async ({
    page,
    baseURL,
  }) => {
    await openStack(page, baseURL!, 'A very long family recipe title '.repeat(16));
    const card = page.getByTestId('stack-card-front');
    const body = card.locator('.overflow-y-auto');
    await expect(body).toHaveCSS('touch-action', 'pan-y');
    expect(await body.evaluate((node) => node.scrollHeight > node.clientHeight)).toBe(true);
    const box = await body.boundingBox();
    if (!box) throw new Error('Missing card body');
    const x = box.x + box.width / 2;
    const y = Math.min(box.y + box.height - 20, 500);
    const session = await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let step = 1; step <= 10; step++) {
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x, y: y - step * 8 }],
      });
      await page.waitForTimeout(25);
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await session.detach();
    await expect.poll(() => body.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
    await expect(page.getByTestId('stack-depth-indicator')).toHaveText('1 / 3');
    await expect(page.getByTestId('recipe-detail-sheet')).not.toBeVisible();
    await page.getByTestId('stack-action-bar').scrollIntoViewIfNeeded();
    await expect(page.getByTestId('stack-action-bar')).toBeInViewport();
  });
});

for (const input of ['mouse', 'touch'] as const) {
  test.describe(`${input} Discovery preservation`, () => {
    test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
    test('direct movement retains separate vote thresholds and direction payloads', async ({
      page,
      baseURL,
    }) => {
      await openStack(page, baseURL!);
      const ids = [MOCK_IDS.RECIPE_LASAGNA, MOCK_IDS.RECIPE_CARBONARA];
      const votes: { id: string; vote: number }[] = [];
      let reads = 0;
      await page.route(
        (url) => url.pathname === '/api/discovery',
        (route) =>
          route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({
              data:
                reads++ === 0
                  ? ids.map((id) => builders.recipe({ id, name: 'Discovery recipe' }))
                  : [],
            }),
          })
      );
      await page.route('**/api/discovery/*/vote', async (route) => {
        votes.push({
          id: new URL(route.request().url()).pathname.split('/')[3],
          vote: route.request().postDataJSON().vote,
        });
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({ data: { message: 'Vote recorded' } }),
        });
      });
      await page.goto('/discovery');
      const front = page.getByTestId('discovery-card').and(page.locator('[data-front="true"]'));
      const drag = async (distance: number) => {
        await expect(front).toHaveCount(1);
        await front.click({ trial: true });
        const box = await front.boundingBox();
        if (!box) throw new Error('Missing Discovery front card');
        const x = box.x + box.width / 2;
        const y = box.y + 80;
        const session = input === 'touch' ? await page.context().newCDPSession(page) : null;
        if (session)
          await session.send('Input.dispatchTouchEvent', {
            type: 'touchStart',
            touchPoints: [{ x, y }],
          });
        else {
          await page.mouse.move(x, y);
          await page.mouse.down();
        }
        for (let step = 1; step <= 10; step++) {
          if (session)
            await session.send('Input.dispatchTouchEvent', {
              type: 'touchMove',
              touchPoints: [{ x: x + (distance * step) / 10, y }],
            });
          else await page.mouse.move(x + (distance * step) / 10, y);
          await page.waitForTimeout(25);
        }
        await expect
          .poll(() =>
            front.evaluate((node) => new DOMMatrixReadOnly(getComputedStyle(node).transform).m41)
          )
          .toBeCloseTo(distance, 0);
        await page.waitForTimeout(150);
        if (session) {
          await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          await session.detach();
        } else await page.mouse.up();
      };
      await drag(60); // below Discovery's 80px release threshold despite direct tracking
      await expect
        .poll(() =>
          front.evaluate((node) => new DOMMatrixReadOnly(getComputedStyle(node).transform).m41)
        )
        .toBeCloseTo(0, 0);
      expect(votes).toEqual([]);
      await drag(100);
      await expect.poll(() => votes.length).toBe(1);
      await expect(front).toHaveAttribute('data-recipe-id', ids[1]);
      await drag(-100);
      await expect.poll(() => votes.length).toBe(2);
      // Preserve the existing page/API payload mapping; browsing never imports it.
      expect(votes).toEqual([
        { id: ids[0], vote: 1 },
        { id: ids[1], vote: 2 },
      ]);
    });
  });
}
