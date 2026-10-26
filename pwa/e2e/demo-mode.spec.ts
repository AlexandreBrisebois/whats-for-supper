import { test, expect, type Page } from './fixtures';
import type { Locator } from '@playwright/test';
import { MOCK_IDS, setupCommonRoutes, builders } from './mock-api';

async function textContrast(surface: Locator) {
  return surface.evaluate((node) => {
    const rgb = (value: string) => (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
    const luminance = (channels: number[]) =>
      channels
        .map((value) => {
          const c = value / 255;
          return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        })
        .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
    const style = getComputedStyle(node);
    const a = luminance(rgb(style.color)),
      b = luminance(rgb(style.backgroundColor));
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  });
}

function fixtureOrigins(baseURL?: string) {
  const app = new URL(baseURL || 'http://127.0.0.1:3000').origin;
  const api = new URL(
    process.env.NEXT_PUBLIC_API_BASE_URL || (process.env.CI ? 'http://127.0.0.1:5001' : app)
  ).origin;
  if ([app, api].some((value) => !['127.0.0.1', 'localhost'].includes(new URL(value).hostname)))
    throw new Error('Demo tests require explicitly configured loopback app/API origins.');
  return { app, api };
}

async function restrictDemoTraffic(page: Page, baseURL?: string) {
  const origins = fixtureOrigins(baseURL);
  await page.route(/^https?:\/\//, (route) => {
    const url = new URL(route.request().url());
    return url.origin === origins.app ||
      (url.origin === origins.api && url.pathname.startsWith('/api/'))
      ? route.fallback()
      : route.abort();
  });
}

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
    await restrictDemoTraffic(page, baseURL);
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
          const cta = dialog.getByRole('button', { name: start, exact: true });
          await expect(cta).toHaveCSS('background-color', 'rgb(82, 91, 55)');
          expect(await textContrast(cta)).toBeGreaterThanOrEqual(4.5);
          await cta.hover();
          await expect(cta).toHaveCSS(
            'background-color',
            (await page.evaluate(() => matchMedia('(hover: hover)').matches))
              ? 'rgb(55, 61, 37)'
              : 'rgb(82, 91, 55)'
          );
          expect(await textContrast(cta)).toBeGreaterThanOrEqual(4.5);
          await cta.focus();
          await expect(cta).toHaveCSS('outline-color', 'rgb(31, 41, 55)');
          expect(
            await cta.evaluate((node) => parseFloat(getComputedStyle(node).outlineWidth))
          ).toBeGreaterThanOrEqual(2);
          await page.keyboard.down('Space');
          await expect(cta).toHaveCSS('background-color', 'rgb(27, 30, 18)');
          expect(await textContrast(cta)).toBeGreaterThanOrEqual(4.5);
          await page.keyboard.press('Escape');
          await page.keyboard.up('Space');
          await page.getByTestId('demo-context-band').click();
          await page.screenshot({ path: info.outputPath('context.png') });
          await dialog.getByRole('button', { name: start, exact: true }).click();
          const band = page.getByTestId('demo-context-band');
          await expect(band).toBeFocused();
          await expect(band).toHaveCSS('outline-color', 'rgb(31, 41, 55)');
          expect(
            await band.evaluate((node) => parseFloat(getComputedStyle(node).outlineWidth))
          ).toBeGreaterThanOrEqual(2);
          expect((await band.boundingBox())!.height).toBeGreaterThanOrEqual(44);
          expect((await page.getByTestId('demo-context').boundingBox())!.y).toBeGreaterThanOrEqual(
            0
          );
          expect(await page.evaluate((key) => localStorage.getItem(key), ACK)).toBe('true');
          const strip = page.getByTestId('demo-context-strip');
          expect((await strip.boundingBox())!.height).toBe(28);
          await expect(strip).toHaveCSS('font-size', '13px');
          await expect(strip).toHaveCSS('line-height', '18px');
          await expect(strip).toHaveCSS('font-weight', '500');
          await expect(strip).toHaveCSS('background-color', 'rgb(227, 231, 215)');
          await expect(strip.locator('svg')).toHaveAttribute('width', '16');
          expect((await band.boundingBox())!.width).toBe(width);
          expect(await textContrast(strip)).toBeGreaterThanOrEqual(4.5);
          await band.hover();
          await expect(strip).toHaveCSS(
            'background-color',
            (await page.evaluate(() => matchMedia('(hover: hover)').matches))
              ? 'rgb(199, 207, 176)'
              : 'rgb(227, 231, 215)'
          );
          expect(await textContrast(strip)).toBeGreaterThanOrEqual(4.5);
          await band.focus();
          await page.keyboard.down('Space');
          await expect(strip).toHaveCSS('background-color', 'rgb(171, 183, 137)');
          expect(await textContrast(strip)).toBeGreaterThanOrEqual(4.5);
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

  test('pointer hover uses contrasting sage surfaces', async ({ page }) => {
    await page.goto('/home');
    const dialog = page.getByRole('dialog', { name: 'Demo · What to know' });
    const cta = dialog.getByRole('button', { name: 'Start exploring', exact: true });
    await expect(cta).toBeVisible();
    expect(await page.evaluate(() => matchMedia('(hover: hover)').matches)).toBe(true);
    await cta.hover();
    await expect(cta).toHaveCSS('background-color', 'rgb(55, 61, 37)');
    expect(await textContrast(cta)).toBeGreaterThanOrEqual(4.5);
    await cta.click();
    const band = page.getByTestId('demo-context-band');
    const strip = page.getByTestId('demo-context-strip');
    await band.hover();
    await expect(strip).toHaveCSS('background-color', 'rgb(199, 207, 176)');
    expect(await textContrast(strip)).toBeGreaterThanOrEqual(4.5);
  });

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
    const band = page.getByTestId('demo-context-band');
    const strip = page.getByTestId('demo-context-strip');
    await strip.locator('span').evaluate((node) => {
      node.textContent = 'Démo · À savoir — explication du foyer de démonstration partagé';
    });
    expect(await band.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
    expect((await strip.boundingBox())!.height).toBeGreaterThan(28);
    expect((await band.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: test.info().outputPath('expanded-band.png') });
  });

  test('deep-link entry reaches its task and stays quiet after client navigation Home', async ({
    page,
  }) => {
    await page.goto('/recipes?open=' + MOCK_IDS.RECIPE_LASAGNA);
    await expect(page.getByTestId('demo-context-band')).toBeVisible();
    await expect(page.getByTestId('recipe-detail-sheet')).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Demo · What to know' })).not.toBeVisible();
    await page.getByTestId('action-close-sheet').click();
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
    await restrictDemoTraffic(page, baseURL);
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
    await expect(page.locator('input[type=file]')).toHaveCount(1);
    await expect(page.getByTestId('import-prepared-file-input')).toHaveAttribute(
      'accept',
      '.txt,.recipe,.json,text/plain,application/json'
    );
    await expect(page.getByTestId('capture-gallery-input')).toHaveCount(0);
    await expect(page.getByTestId('capture-pdf-input')).toHaveCount(0);
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await page.getByRole('link', { name: 'Explore prepared recipes' }).click();
    await expect(page.getByTestId('recipe-search-input')).toBeVisible();
    expect(posts).toEqual([]);
  });

  test('permits only the configured mock API and blocks unmatched/provider/other origins', async ({
    page,
    baseURL,
  }) => {
    await page.goto('/recipes');
    const { api } = fixtureOrigins(baseURL);
    const outcomes = await page.evaluate(
      async ({ api }) => {
        const request = async (url: string) => {
          try {
            return (await fetch(url)).status;
          } catch {
            return 'blocked';
          }
        };
        return {
          health: await request(`${api}/api/health`),
          unmatched: await request(`${api}/api/unregistered-demo-fixture`),
          provider: await request('https://generativelanguage.googleapis.com/api/health'),
          openai: await request('https://api.openai.com/api/health'),
          production: await request('https://demo.example.invalid/api/health'),
          otherLoopback: await request('http://127.0.0.1:65530/api/health'),
        };
      },
      { api }
    );
    expect(outcomes).toEqual({
      health: 200,
      unmatched: 403,
      provider: 'blocked',
      openai: 'blocked',
      production: 'blocked',
      otherLoopback: 'blocked',
    });
  });

  test('reviews and imports a prepared text bundle while genuine AI entry remains absent', async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const posts: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'POST' && new URL(request.url()).pathname.startsWith('/api/'))
        posts.push(new URL(request.url()).pathname);
    });
    await page.goto('/capture');
    await expect(page.getByTestId('import-prepared-file-input')).toHaveAttribute(
      'accept',
      '.txt,.recipe,.json,text/plain,application/json'
    );
    await page.screenshot({ path: info.outputPath('prepared-only-capture.png') });
    await page.getByTestId('import-prepared-file-input').setInputFiles({
      name: 'synthetic.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(
        JSON.stringify({
          version: '1.0',
          recipe: {
            name: 'Synthetic lentil soup',
            ingredients: ['lentils'],
            instructions: [{ name: 'Steps', itemListElement: [{ text: 'Simmer.' }] }],
            isSynthesized: true,
          },
          info: {
            exportedAtUtc: '2026-05-04T12:00:00Z',
            bundleSource: 'wfs-share',
            appVersion: 'test',
          },
          hero: null,
          originals: [],
        })
      ),
    });
    await expect(page.getByTestId('bundle-preview-card')).toBeVisible();
    expect(posts).toEqual([]);
    await page.getByTestId('accept-bundle-btn').click();
    await expect(page.getByTestId('bundle-import-success')).toBeVisible();
    expect(posts).toEqual(['/api/recipes/import-bundle']);
    await expect(page.getByTestId('capture-gallery-input')).toHaveCount(0);
  });

  test('resolves an existing issue locally without exposing AI submission', async ({
    page,
    baseURL,
  }, info) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const recipe = builders.recipe({
      id: MOCK_IDS.RECIPE_LASAGNA,
      importIssue: {
        reasons: ['ingredients'],
        note: 'Synthetic missing amount',
        status: 'readyToReview',
      },
    });
    await page.route(`**/api/recipes/${MOCK_IDS.RECIPE_LASAGNA}`, (route) =>
      route.request().method() === 'GET'
        ? route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ recipe }),
          })
        : route.fallback()
    );
    await restrictDemoTraffic(page, baseURL);
    const mutations: string[] = [];
    page.on('request', (request) => {
      const path = new URL(request.url()).pathname;
      if (
        path.startsWith('/api/') &&
        ['POST', 'DELETE'].includes(request.method()) &&
        !path.endsWith('/search')
      )
        mutations.push(`${request.method()} ${path}`);
    });
    await page.goto(`/recipes?open=${MOCK_IDS.RECIPE_LASAGNA}`);
    await expect(page.getByTestId('demo-context-band')).toBeVisible();
    await expect(page.getByTestId('recipe-detail-sheet')).toBeVisible();
    await page.getByTestId('action-gear-menu').click();
    await page.getByTestId('action-report-import-issue').click();
    await expect(page.getByTestId('import-issue-note')).toBeDisabled();
    await expect(page.getByTestId('import-issue-save')).toHaveCount(0);
    await page.screenshot({ path: info.outputPath('local-resolution.png') });
    await page.getByTestId('import-issue-resolve').click();
    await expect(page.getByRole('dialog', { name: 'Review issue' })).not.toBeVisible();
    expect(mutations).toEqual([`DELETE /api/recipes/${MOCK_IDS.RECIPE_LASAGNA}/import-report`]);
  });

  test('preserves a local bundle draft while unknown mode resolves to non-demo', async ({
    page,
    baseURL,
  }) => {
    let release!: () => void;
    const ready = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/api/health', async (route) => {
      await ready;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'Healthy', demoMode: false }),
      });
    });
    await restrictDemoTraffic(page, baseURL);
    try {
      await page.goto('/capture');
      await expect(page.getByTestId('demo-ai-unavailable')).toContainText('Checking');
      await page.getByTestId('import-prepared-file-input').setInputFiles({
        name: 'synthetic.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from(
          JSON.stringify({
            version: '1.0',
            recipe: {
              name: 'Synthetic draft',
              ingredients: ['lentils'],
              instructions: [{ name: 'Steps', itemListElement: [{ text: 'Simmer.' }] }],
              isSynthesized: true,
            },
            info: {
              exportedAtUtc: '2026-05-04T12:00:00Z',
              bundleSource: 'wfs-share',
              appVersion: 'test',
            },
            hero: null,
            originals: [],
          })
        ),
      });
      await expect(page.getByTestId('bundle-preview-card')).toBeVisible();
      release();
      await expect(page.getByTestId('demo-ai-unavailable')).not.toBeVisible();
      await expect(page.getByTestId('bundle-preview-card')).toBeVisible();
      await page.getByTestId('accept-bundle-btn').click();
      await expect(page.getByTestId('bundle-import-success')).toBeVisible();
    } finally {
      release();
    }
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

  test('ordinary non-demo capture remains available', async ({ page, baseURL }) => {
    await setupCommonRoutes(page);
    await restrictDemoTraffic(page, baseURL);
    await page.goto('/capture');
    await expect(page.getByTestId('demo-ai-unavailable')).not.toBeVisible();
    await expect(page.locator('input[type=file]').first()).toBeAttached();
    await expect(page.getByTestId('demo-context-band')).not.toBeVisible();
  });
});
