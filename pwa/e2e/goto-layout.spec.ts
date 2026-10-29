import { test, expect } from './fixtures';
import { devices } from '@playwright/test';
import { MOCK_IDS, builders, setupCommonRoutes } from './mock-api';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const evidence = resolve('../.task/goto-revision');
const browserName = process.env.WFS_LAYOUT_WEBKIT === '1' ? 'webkit' : 'chromium';
test.use({
  browserName,
  userAgent: devices[browserName === 'webkit' ? 'iPhone 13' : 'Pixel 5'].userAgent,
  isMobile: true,
  hasTouch: true,
});
for (const locale of ['en', 'fr'] as const) {
  test.describe(`Go-To layout ${locale}`, () => {
    test.use({ appLocale: locale });
    test('normal phone preserves stack and photo geometry', async ({ page, baseURL }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await setupCommonRoutes(page);
      await page.route('**/api/recipes/*/hero', (route) =>
        route.fulfill({ path: 'e2e/fixtures/cookbook-light.jpg', contentType: 'image/jpeg' })
      );
      await page
        .context()
        .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseURL! }]);
      await page.addInitScript(
        (id) =>
          localStorage.setItem(
            'family-storage',
            JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 })
          ),
        MOCK_IDS.MEMBER_ALEX
      );
      await page.goto('/browse-all-stack');
      const card = page.getByTestId('stack-card-front');
      await expect(card).toBeVisible();
      await expect(card.locator('img')).toBeVisible();
      await expect(page.getByTestId('stack-action-bar')).toHaveCSS('opacity', '1');
      await page.evaluate(() => document.fonts.ready);
      const geometry = await card.evaluate((el) => {
        const box = (node: Element) => {
          const { width, height, x, y } = node.getBoundingClientRect();
          return { width, height, x, y };
        };
        return {
          card: box(el),
          image: box(el.querySelector('img')!),
          stack: box(el.parentElement!.parentElement!),
        };
      });
      mkdirSync(evidence, { recursive: true });
      if (process.env.WFS_CAPTURE_BASELINE === '1') {
        writeFileSync(
          resolve(evidence, `${locale}-baseline.json`),
          JSON.stringify(geometry, null, 2)
        );
        await page.screenshot({ path: resolve(evidence, `${locale}-browse-before.png`) });
      } else {
        // Recorded from the pre-change local baseline; independent of generated .task files.
        const before = {
          stack: { width: 342, height: 740 },
          card: { width: 342, height: locale === 'en' ? 537.5 : 534 },
          image: { width: 342, height: 213.75 },
        };
        for (const part of ['card', 'image', 'stack'] as const) {
          for (const dimension of ['width', 'height'] as const)
            expect(
              Math.abs(geometry[part][dimension] - before[part][dimension])
            ).toBeLessThanOrEqual(1);
        }
        writeFileSync(resolve(evidence, `${locale}-after.json`), JSON.stringify(geometry, null, 2));
        await page.screenshot({ path: resolve(evidence, `${locale}-browse-after.png`) });
      }
    });
  });
}

for (const locale of ['en', 'fr'] as const) {
  test.describe(`adaptive ${browserName} ${locale}`, () => {
    test.use({ appLocale: locale });
    test('Browse and empty Home retain useful controls across viewport and text changes', async ({
      page,
      baseURL,
    }) => {
      test.setTimeout(120_000);
      await setupCommonRoutes(page);
      await page.route('**/api/recipes/*/hero', (route) =>
        route.fulfill({ path: 'e2e/fixtures/cookbook-light.jpg', contentType: 'image/jpeg' })
      );
      await page
        .context()
        .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseURL! }]);
      await page.addInitScript(
        (id) =>
          localStorage.setItem(
            'family-storage',
            JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 })
          ),
        MOCK_IDS.MEMBER_ALEX
      );
      await page.emulateMedia({ reducedMotion: 'reduce' });
      for (const [width, height] of [
        [320, 568],
        [390, 667],
        [412, 915],
        [667, 375],
        [820, 1180],
        [1180, 820],
      ]) {
        await page.setViewportSize({ width, height });
        if (width === 320 && height === 568) {
          await page.route('**/api/recipes?*', async (route) => {
            if (new URL(route.request().url()).searchParams.get('gotoOnly') === 'true')
              return route.fallback();
            await route.fulfill({
              json: {
                recipes: [
                  builders.recipe({
                    id: MOCK_IDS.RECIPE_LASAGNA,
                    name:
                      locale === 'fr'
                        ? 'Recette familiale aux légumes du jardin et aux herbes'
                        : 'A family supper with garden vegetables and fresh herbs',
                  }),
                ],
                pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
                updatedAt: '2026-05-04T12:00:00Z',
                historyGeneration: 'mock-history',
              },
            });
          });
        }

        for (const route of ['/browse-all-stack', '/home']) {
          await page.goto(route);
          const browse = route === '/browse-all-stack';
          const control = page.getByTestId(browse ? 'browse-filter-goto' : 'discover-btn');
          await expect(control).toBeVisible();
          await page.evaluate(() => document.fonts.ready);
          await page.addStyleTag({ content: 'nextjs-portal { display:none !important; }' });
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
          ).toBe(true);
          if (browse) {
            const starBox = (await control.boundingBox())!;
            expect(starBox.width).toBeGreaterThanOrEqual(48);
            expect(starBox.height).toBeGreaterThanOrEqual(48);
            const close = page.getByTestId('browse-all-exit');
            await expect(close).toBeInViewport({ ratio: 1 });
            await expect(page.getByTestId('stack-depth-indicator')).toBeInViewport({ ratio: 1 });
            if (height >= 568) {
              await expect(page.getByTestId('stack-card-front').locator('h2')).toBeInViewport({
                ratio: 1,
              });
              const imageBox = (await page
                .getByTestId('stack-card-front')
                .locator('img')
                .boundingBox())!;
              expect(imageBox.y).toBeGreaterThanOrEqual(0);
              expect(imageBox.y + imageBox.height).toBeLessThanOrEqual(height + 1);
              expect(imageBox.x).toBeGreaterThanOrEqual(0);
              expect(imageBox.x + imageBox.width).toBeLessThanOrEqual(width + 1);
            }
            if (width === 320 && height === 568) {
              const front = page.getByTestId('stack-card-front');
              await front.focus();
              await page.keyboard.press('Enter');
              await expect(page.getByTestId('recipe-detail-sheet')).toBeVisible();
              await page.getByTestId('action-close-sheet').click();
            }
            if (width === 390 && height === 667) {
              // Simulated inset padding is separate from physical-device evidence.
              await page.getByTestId('browse-all-stack-container').evaluate((node) => {
                node.style.paddingTop = '20px';
                node.style.paddingBottom = '24px';
              });
              expect(
                (await page.getByTestId('browse-all-exit').boundingBox())!.y
              ).toBeGreaterThanOrEqual(20);
              await page.getByTestId('stack-action-bar').scrollIntoViewIfNeeded();
              await expect(page.getByTestId('stack-action-bar')).toBeInViewport();
            }
            await control.focus();
            await page.keyboard.press('Space');
            await expect(control).toHaveAttribute('aria-pressed', 'true');
            await page.keyboard.press('Space');
            await expect(control).toHaveAttribute('aria-pressed', 'false');
          } else {
            await expect(page.getByTestId('empty-pivot-illustration')).toBeVisible();
            if (height >= 568) {
              await expect(control).toBeInViewport({ ratio: 1 });
              await expect(page.getByTestId('order-in-btn')).toBeInViewport({ ratio: 1 });
            }
            await expect(page.getByTestId('add-goto-btn')).toHaveCount(0);
          }
          mkdirSync(evidence, { recursive: true });
          await page.screenshot({
            path: resolve(
              evidence,
              `${browserName}-${locale}-${browse ? 'browse' : 'empty'}-${width}x${height}.png`
            ),
          });
          await page.evaluate(() => {
            document.documentElement.style.fontSize = '200%';
          });
          await control.scrollIntoViewIfNeeded();
          await expect(control).toBeInViewport({ ratio: 1 });
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
          ).toBe(true);
        }
      }
    });
  });
}

for (const surface of ['browse', 'search'] as const) {
  test(`${surface} recipe stars separate rejected saves from saved removal and read retry`, async ({
    page,
    baseURL,
  }) => {
    await setupCommonRoutes(page);
    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseURL! }]);
    await page.addInitScript(
      (id) =>
        localStorage.setItem(
          'family-storage',
          JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 })
        ),
      MOCK_IDS.MEMBER_ALEX
    );
    await page.goto(`/recipes?open=${MOCK_IDS.RECIPE_LASAGNA}`);
    await page.getByTestId('action-set-goto').click();
    await expect(page.getByTestId('action-current-goto')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('action-close-sheet').click();
    await page.goto(surface === 'browse' ? '/browse-all-stack?gotoOnly=true' : '/recipes');
    if (surface === 'search') {
      await page.getByTestId('mobile-filters-button').click();
      await page.getByTestId('mobile-filter-goto').click();
      await page.getByTestId('mobile-filter-apply').click();
    }
    await page
      .getByTestId(surface === 'browse' ? 'stack-card-front' : 'recipe-card-top-pick')
      .click();
    let rejectSave = true;
    let puts = 0;
    await page.route('**/api/goto', async (route) => {
      if (route.request().method() === 'PUT') {
        puts++;
        if (rejectSave) {
          rejectSave = false;
          await route.fulfill({ status: 400, json: { message: 'Save rejected' } });
          return;
        }
      }
      await route.fallback();
    });
    await page.getByTestId('action-current-goto').click();
    await expect(page.getByTestId('action-current-goto')).toBeEnabled();
    await expect(page.getByTestId('action-current-goto')).toHaveAttribute('aria-pressed', 'true');
    let rejectRead = true;
    await page.route(
      surface === 'browse' ? '**/api/recipes?*' : '**/api/recipes/search',
      async (route) => {
        if (rejectRead) {
          rejectRead = false;
          await route.fulfill({ status: 400, json: { message: 'Read rejected after save' } });
          return;
        }
        await route.fallback();
      }
    );
    await page.getByTestId('action-current-goto').click();
    await expect(page.getByTestId('action-set-goto')).toHaveAttribute('aria-pressed', 'false');
    await page.getByTestId('action-close-sheet').click();
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(
      page.getByTestId(surface === 'browse' ? 'browse-goto-empty' : 'filter-no-results')
    ).toBeVisible();
    expect(puts).toBe(2);
  });
}

test('Home Search selects today through planner and cancellation submits no meal', async ({
  page,
  baseURL,
}) => {
  await setupCommonRoutes(page);
  // The shared mock intentionally supplies only Go-To-filtered candidates; give
  // this ordinary planner entry one schema-shaped result at the API boundary.
  await page.route('**/api/recipes/search', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    expect(route.request().postDataJSON()).toMatchObject({ dayIndex: 0, weekOffset: 0 });
    await route.fulfill({
      json: {
        data: {
          topPick: {
            ...builders.recipe({ id: MOCK_IDS.RECIPE_LASAGNA, name: 'Garden supper' }),
            reasons: [],
          },
          results: [],
          appliedFilters: {},
          searchMode: 'discovery',
          resultPath: 'browse',
          nextCursor: null,
        },
      },
    });
  });
  await page
    .context()
    .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseURL! }]);
  await page.addInitScript(
    (id) =>
      localStorage.setItem(
        'family-storage',
        JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 })
      ),
    MOCK_IDS.MEMBER_ALEX
  );
  const assignments: unknown[] = [];
  page.on('request', (req) => {
    if (new URL(req.url()).pathname === '/api/schedule/assign' && req.method() === 'POST')
      assignments.push(req.postDataJSON());
  });
  await page.goto('/home');
  await page.getByTestId('discover-btn').click();
  await expect(page).toHaveURL(
    /\/recipes\?addToDay=0&weekOffset=0&referenceWeekStartDate=2026-05-04/
  );
  await page.getByTestId('planning-mode-cancel').click();
  await expect(page).toHaveURL(/\/planner/);
  expect(assignments).toEqual([]);
  await page.goto('/home');
  await page.getByTestId('discover-btn').click();
  await page
    .getByTestId(/^recipe-card-/)
    .first()
    .click();
  await page.getByTestId('action-add-to-day').click();
  await expect(page).toHaveURL(
    /\/planner\?success=1&dayIndex=0&weekOffset=0&referenceWeekStartDate=2026-05-04/
  );
  expect(assignments).toHaveLength(1);
  expect(assignments[0]).toMatchObject({ dayIndex: 0, weekOffset: 0 });
});
