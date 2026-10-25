import { test, expect } from './fixtures';
import { MOCK_IDS, setupCommonRoutes } from './mock-api';

test.describe('Demo Mode', () => {
  test.beforeEach(async ({ page }) => {
    await setupCommonRoutes(page);

    // Override health check to enable demo mode
    await page.route('**/api/health', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'Healthy',
          timestamp: '2026-05-04T12:00:00.000Z',
          checks: {},
          demoMode: true,
          demoModeRawValue: 'true',
          demoRestoreCronValid: true,
        }),
      });
    });
  });

  // pre-populates the passphrase on the welcome page is covered by welcome/page.test.tsx

  test('keeps standard search available in demo mode', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://127.0.0.1:3000';

    // Simulate being logged in
    await page.context().addCookies([
      { name: 'x-hearth-secret', value: 'Swipe-Match-Cook', url: baseUrl },
      { name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl },
    ]);
    await page.addInitScript((id) => {
      localStorage.setItem(
        'family-storage',
        JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 })
      );
    }, MOCK_IDS.MEMBER_ALEX);

    await page.goto('/recipes');

    await expect(page.getByTestId('recipe-search-input')).toBeVisible();

    await expect(page.getByTestId('recipe-search-input')).toBeVisible();
  });
});

test.describe('Demo context explanation', () => {
  const ACK = 'wfs:mode-info:demo:dismissed';

  test.beforeEach(async ({ page, baseURL }) => {
    const origin = baseURL || 'http://127.0.0.1:3000';
    if (!['127.0.0.1', 'localhost'].includes(new URL(origin).hostname))
      throw new Error('Demo tests require disposable loopback hosting.');
    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: origin }]);
    await setupCommonRoutes(page, undefined, { demoMode: true });
    await page.route('**/_next/image?**', (route) =>
      route.fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="#eee"/></svg>',
      })
    );
    await page.route(/^https?:\/\//, (route) =>
      new URL(route.request().url()).origin === new URL(origin).origin
        ? route.fallback()
        : route.abort()
    );
  });

  for (const locale of ['en', 'fr'] as const) {
    test.describe(`context in ${locale}`, () => {
      test.use({ appLocale: locale, hasTouch: true });
      for (const [device, width, height] of [
        ['iPhone', 390, 844],
        ['Pixel', 412, 915],
        ['iPad portrait', 820, 1180],
        ['iPad landscape', 1180, 820],
      ] as const) {
        test(`${device}: readable first visit, keyboard dismissal and persistent reopen`, async ({
          page,
        }, info) => {
          await page.setViewportSize({ width, height });
          await page.emulateMedia({ reducedMotion: 'reduce' });
          await page.goto('/home');
          const label = locale === 'fr' ? 'Démo · À savoir' : 'Demo · What to know';
          const start = locale === 'fr' ? 'Commencer l’exploration' : 'Start exploring';
          const dialog = page.getByRole('dialog', { name: label });
          await expect(dialog).toBeVisible();
          await expect(dialog.getByRole('heading', { name: label })).toBeFocused();
          const box = await dialog.boundingBox();
          expect(box).not.toBeNull();
          expect(box!.width).toBeLessThanOrEqual(width);
          expect(box!.height).toBeLessThanOrEqual(height);
          if (width >= 640) {
            expect(box!.width).toBeLessThanOrEqual(450);
            expect(box!.x).toBeGreaterThan(0);
          }
          for (const button of await dialog.getByRole('button').all()) {
            expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
          }
          await page.keyboard.press('Tab');
          await page.keyboard.press('Shift+Tab');
          expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);
          await page.screenshot({ path: info.outputPath('context.png') });
          await dialog.getByRole('button', { name: start, exact: true }).click();
          const band = page.getByTestId('demo-context-band');
          await expect(band).toBeFocused();
          expect((await band.boundingBox())!.height).toBeGreaterThanOrEqual(44);
          expect((await page.getByTestId('demo-context').boundingBox())!.y).toBeGreaterThanOrEqual(
            0
          );
          expect(await page.evaluate((key) => localStorage.getItem(key), ACK)).toBe('true');
          const measureContrast = () =>
            band.evaluate((node) => {
              const rgb = (value: string) => (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
              const luminance = (channels: number[]) =>
                channels
                  .map((value) => {
                    const c = value / 255;
                    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
                  })
                  .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
              const style = getComputedStyle(node);
              const background =
                style.backgroundColor === 'rgba(0, 0, 0, 0)'
                  ? getComputedStyle(node.parentElement!).backgroundColor
                  : style.backgroundColor;
              const a = luminance(rgb(style.color)),
                b = luminance(rgb(background));
              return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
            });
          expect(await measureContrast()).toBeGreaterThanOrEqual(4.5);
          await band.hover();
          expect(await measureContrast()).toBeGreaterThanOrEqual(4.5);
          await band.focus();
          await page.keyboard.down('Space');
          expect(await measureContrast()).toBeGreaterThanOrEqual(4.5);
          await page.keyboard.up('Space');
          await page.keyboard.press('Escape');
          await page.reload();
          await expect(band).toBeVisible();
          await expect(dialog).not.toBeVisible();
          await band.click();
          await expect(dialog).toBeVisible();
          await page.keyboard.press('Escape');
          await expect(dialog).not.toBeVisible();
          await expect(band).toBeFocused();
          await page.screenshot({ path: info.outputPath('band.png') });
        });
      }
    });
  }

  test('expanded French text remains readable with reachable actions on a short phone', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.addInitScript(() => localStorage.setItem('locale', 'fr'));
    await page.goto('/home');
    const dialog = page.getByRole('dialog', { name: 'Démo · À savoir' });
    await expect(dialog).toBeVisible();
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '32px';
    });
    expect(await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
    const start = dialog.getByRole('button', { name: 'Commencer l’exploration' });
    await start.scrollIntoViewIfNeeded();
    await expect(start).toBeInViewport();
    await start.click();
    await expect(dialog).not.toBeVisible();
  });

  test('deep-link entry reaches its task and stays quiet after client navigation Home', async ({
    page,
  }) => {
    await page.goto('/recipes?recipeId=' + MOCK_IDS.RECIPE_LASAGNA);
    await expect(page.getByTestId('demo-context-band')).toBeVisible();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await page.getByTestId('nav-item-home').first().click();
    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await page.getByTestId('demo-context-band').click();
    await expect(page.getByRole('dialog', { name: 'Demo · What to know' })).toBeVisible();
  });

  test('unavailable storage uses visit memory without blocking exploration', async ({ page }) => {
    await page.addInitScript(() => {
      Storage.prototype.getItem = () => {
        throw new DOMException('Storage denied');
      };
      Storage.prototype.setItem = () => {
        throw new DOMException('Storage denied');
      };
    });
    await page.goto('/home');
    const dialog = page.getByRole('dialog', { name: 'Demo · What to know' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Start exploring' }).click();
    await page.getByTestId('nav-item-recipes').first().click();
    await page.getByTestId('nav-item-home').first().click();
    await expect(dialog).not.toBeVisible();
    await page.getByTestId('demo-context-band').click();
    await expect(dialog).toBeVisible();
  });
});

test.describe('Cost-safe demo exploration', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    const origin = baseURL || 'http://127.0.0.1:3000';
    if (!['127.0.0.1', 'localhost'].includes(new URL(origin).hostname))
      throw new Error('Demo tests require disposable loopback hosting.');
    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: origin }]);
    await setupCommonRoutes(page, undefined, { demoMode: true });
    await page.route(/^https?:\/\//, (route) =>
      new URL(route.request().url()).origin === new URL(origin).origin
        ? route.fallback()
        : route.abort()
    );
  });

  test('AI entry explains restriction before file selection or upload and offers prepared content', async ({
    page,
  }) => {
    const posts: string[] = [];
    page.on('request', (request) => {
      if (
        request.method() === 'POST' &&
        request.url().includes('/api/recipes') &&
        !request.url().endsWith('/search')
      )
        posts.push(request.url());
    });
    await page.goto('/capture?mode=describe');
    await expect(page.getByTestId('demo-ai-unavailable')).toContainText(
      'AI capture and generation are unavailable'
    );
    await expect(page.locator('input[type=file]')).toHaveCount(0);
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await page.getByRole('link', { name: 'Explore prepared recipes' }).click();
    await expect(page.getByTestId('recipe-search-input')).toBeVisible();
    expect(posts).toEqual([]);
  });

  test('mock contract refuses every AI-only POST without changing prepared recipe reads', async ({
    page,
  }) => {
    await page.goto('/recipes');
    await expect(page.getByTestId('demo-context-band')).toBeVisible();
    const result = await page.evaluate(async (id) => {
      const recipePath = '/api/recipes/' + id;
      const before = await (await fetch(recipePath)).json();
      const paths = [
        '/api/recipes',
        '/api/recipes/capture-pdf',
        '/api/recipes/capture-url',
        '/api/recipes/describe',
        recipePath + '/originals',
        recipePath + '/hero/regenerate',
        '/api/recipes/imports/bulk',
        recipePath + '/import-report',
        '/api/captures/failures/' + id + '/retry',
      ];
      const outcomes = [];
      for (const path of paths) {
        const response = await fetch(path, {
          method: 'POST',
          body: 'synthetic invalid content',
          headers: { 'Content-Type': 'application/json' },
        });
        outcomes.push({ status: response.status, body: await response.json() });
      }
      return { before, after: await (await fetch(recipePath)).json(), outcomes };
    }, MOCK_IDS.RECIPE_LASAGNA);
    expect(result.after).toEqual(result.before);
    for (const outcome of result.outcomes) {
      expect(outcome.status).toBe(403);
      expect(outcome.body).toMatchObject({ status: 403, code: 'DEMO_AI_UNAVAILABLE' });
      expect(Object.keys(outcome.body).sort()).toEqual(['code', 'message', 'status']);
    }
  });

  test('ordinary non-demo capture remains available', async ({ page }) => {
    await setupCommonRoutes(page);
    await page.goto('/capture');
    await expect(page.getByTestId('demo-ai-unavailable')).not.toBeVisible();
    await expect(page.locator('input[type=file]').first()).toBeAttached();
    await expect(page.getByTestId('demo-context-band')).not.toBeVisible();
  });
});
