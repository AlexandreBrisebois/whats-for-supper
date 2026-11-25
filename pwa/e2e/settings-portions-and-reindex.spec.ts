import { test, expect } from './fixtures';
import { assertCookbookVisualA11y } from './visual-a11y-contract';
import { setupCommonRoutes, MOCK_IDS } from './mock-api';

test.describe('Settings Portions & Search Reindex (Era 3)', () => {
  test('Usual portions auto-saves with 0px height shift and SearchIndexSection sits strictly below it', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.context().addCookies([
      {
        name: 'x-family-member-id',
        value: MOCK_IDS.MEMBER_ALEX,
        url: process.env.BASE_URL || 'http://127.0.0.1:3000',
      },
    ]);
    await setupCommonRoutes(page, undefined, {
      searchStatus: {
        totalReadyRecipes: 145,
        searchableRecipes: 142,
        enrichedRecipes: 139,
        activeIndexingJobs: 0,
        demoMode: false,
      },
    });

    await page.goto('/profile/settings');
    const portionsSection = page.getByTestId('usual-portions-section');
    const searchSection = page.getByTestId('search-index-section');

    await expect(portionsSection).toBeVisible();
    await expect(searchSection).toBeVisible();

    // No Save button and no routine Saved banner.
    await expect(portionsSection.getByTestId('save-usual-portions')).toHaveCount(0);
    await expect(portionsSection.getByText('Saved', { exact: true })).toHaveCount(0);

    // SearchIndexSection must sit strictly below UsualPortionsSection and above FailedCapturesSection.
    const portionsBox = await portionsSection.boundingBox();
    const searchBox = await searchSection.boundingBox();
    expect(portionsBox).not.toBeNull();
    expect(searchBox).not.toBeNull();
    expect(searchBox!.y).toBeGreaterThanOrEqual(portionsBox!.y + portionsBox!.height - 1);

    // 0px row/card height shift on toggling Use family size.
    const beforeHeight = portionsBox!.height;
    await portionsSection.getByTestId('usual-portions-automatic').uncheck();
    await expect(portionsSection.getByTestId('usual-portions-input')).toBeVisible();
    const afterUncheckBox = await portionsSection.boundingBox();
    expect(Math.abs(afterUncheckBox!.height - beforeHeight)).toBeLessThanOrEqual(1);

    // Invalid input stays client-side with inline role="alert" and sends no PUT.
    let puts = 0;
    page.on('request', (req) => {
      if (req.method() === 'PUT' && new URL(req.url()).pathname === '/api/schedule/servings') {
        puts++;
      }
    });
    await portionsSection.getByTestId('usual-portions-input').fill('0');
    await portionsSection.getByTestId('usual-portions-input').blur();
    await expect(portionsSection.getByRole('alert')).toBeVisible();
    expect(puts).toBe(0);

    // Valid input auto-saves silently on blur.
    const saveRes = page.waitForResponse(
      (res) =>
        res.request().method() === 'PUT' &&
        new URL(res.url()).pathname === '/api/schedule/servings' &&
        res.ok()
    );
    await portionsSection.getByTestId('usual-portions-input').fill('6');
    await portionsSection.getByTestId('usual-portions-input').blur();
    await saveRes;
    await expect(portionsSection.getByText('Saved', { exact: true })).toHaveCount(0);

    // Trigger Index missing recipes (force=false).
    await expect(searchSection).toContainText('142 of 145 searchable');
    const missingReq = page.waitForRequest(
      (req) =>
        req.method() === 'POST' && new URL(req.url()).pathname === '/api/management/backfill-search'
    );
    await searchSection.getByTestId('search-index-missing-btn').click();
    expect((await missingReq).postDataJSON()).toMatchObject({ force: false });
    await expect(searchSection.getByRole('status')).toContainText('Reindexing in background');

    // Inline Cancel / Rebuild all confirmation (never window.confirm).
    let dialogOpened = false;
    page.on('dialog', () => {
      dialogOpened = true;
    });
    await searchSection.getByTestId('search-index-rebuild-btn').click();
    await expect(searchSection.getByTestId('search-index-rebuild-confirm')).toBeVisible();
    await searchSection.getByTestId('search-index-rebuild-cancel').click();
    await expect(searchSection.getByTestId('search-index-rebuild-confirm')).toHaveCount(0);

    await searchSection.getByTestId('search-index-rebuild-btn').click();
    const forceReq = page.waitForRequest(
      (req) =>
        req.method() === 'POST' && new URL(req.url()).pathname === '/api/management/backfill-search'
    );
    await searchSection.getByTestId('search-index-rebuild-confirm-btn').click();
    expect((await forceReq).postDataJSON()).toMatchObject({ force: true });
    expect(dialogOpened).toBe(false);

    // Zero checkmarks anywhere in Settings portions/search cards.
    expect((await page.getByTestId('settings-content').textContent()) ?? '').not.toContain('✓');

    // Error path surfaces inline role="alert" without disabling actions.
    await page.route('**/api/management/backfill-search', async (route) =>
      route.fulfill({ status: 500, json: { message: 'Backfill failed' } })
    );
    await searchSection.getByTestId('search-index-missing-btn').click();
    await expect(searchSection.getByRole('alert')).toBeVisible();
    await expect(searchSection.getByTestId('search-index-missing-btn')).toBeEnabled();

    // Standard AA & High Contrast AAA audit on the changed Settings cards.
    for (const rootSelector of [
      '[data-testid="usual-portions-section"]',
      '[data-testid="search-index-section"]',
    ]) {
      await assertCookbookVisualA11y(page, { rootSelector, contrastLevel: 'aa' });
    }
    await page.evaluate(() => {
      document.documentElement.dataset.contrast = 'high';
    });
    for (const rootSelector of [
      '[data-testid="usual-portions-section"]',
      '[data-testid="search-index-section"]',
    ]) {
      await assertCookbookVisualA11y(page, { rootSelector, contrastLevel: 'aaa' });
    }
  });

  test('RecipeDetailSheet ••• menu Reindex queues single recipe and surfaces errors inline', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.context().addCookies([
      {
        name: 'x-family-member-id',
        value: MOCK_IDS.MEMBER_ALEX,
        url: process.env.BASE_URL || 'http://127.0.0.1:3000',
      },
    ]);
    await setupCommonRoutes(page);
    await page.goto(`/recipes?open=${MOCK_IDS.RECIPE_LASAGNA}`);

    await page.getByTestId('action-gear-menu').click();
    const reindexReq = page.waitForRequest(
      (req) =>
        req.method() === 'POST' &&
        new URL(req.url()).pathname === `/api/recipes/${MOCK_IDS.RECIPE_LASAGNA}/reindex`
    );
    await page.getByTestId('action-reindex-recipe').click();
    await reindexReq;

    await expect(page.getByTestId('recipe-reindex-status')).toContainText(
      'Queued for search reindex.'
    );
    expect((await page.getByTestId('recipe-reindex-status').textContent()) ?? '').not.toContain(
      '✓'
    );

    await page.route(`**/api/recipes/${MOCK_IDS.RECIPE_LASAGNA}/reindex`, async (route) =>
      route.fulfill({ status: 500, json: { message: 'Reindex failed' } })
    );
    await page.getByTestId('action-gear-menu').click();
    await page.getByTestId('action-reindex-recipe').click();
    await expect(page.getByTestId('recipe-reindex-error')).toBeVisible();
  });

  for (const locale of ['en', 'fr'] as const) {
    test.describe(`Settings 320px reflow (${locale})`, () => {
      test.use({ appLocale: locale });
      test(`Settings portions and search index fit 320px width in ${locale} with AA/AAA contrast`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: 320, height: 844 });
        await page.context().addCookies([
          {
            name: 'x-family-member-id',
            value: MOCK_IDS.MEMBER_ALEX,
            url: process.env.BASE_URL || 'http://127.0.0.1:3000',
          },
        ]);
        await setupCommonRoutes(page);
        await page.goto('/profile/settings');

        await expect(page.getByTestId('usual-portions-section')).toBeVisible();
        await expect(page.getByTestId('search-index-section')).toBeVisible();

        const noOverflow = await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth
        );
        expect(noOverflow).toBe(true);

        await assertCookbookVisualA11y(page, {
          rootSelector: '[data-testid="search-index-section"]',
          contrastLevel: 'aa',
        });
        await page.evaluate(() => {
          document.documentElement.dataset.contrast = 'high';
        });
        await assertCookbookVisualA11y(page, {
          rootSelector: '[data-testid="search-index-section"]',
          contrastLevel: 'aaa',
        });
      });
    });
  }
});
