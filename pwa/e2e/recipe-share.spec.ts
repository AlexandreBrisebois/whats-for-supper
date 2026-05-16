import path from 'path';
import { test, expect } from './fixtures';
import { MOCK_IDS, builders, setupCommonRoutes } from './mock-api';

const SHARED_RECIPE_FIXTURE = path.join(__dirname, 'fixtures', 'shared-lasagna.recipe');

test.describe('Recipe Share And Capture', () => {
  test.beforeEach(async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';

    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);

    await page.addInitScript((id) => {
      localStorage.setItem(
        'family-storage',
        JSON.stringify({
          state: { selectedFamilyMemberId: id },
          version: 0,
        })
      );
    }, MOCK_IDS.MEMBER_ALEX);

    await setupCommonRoutes(page);
  });

  test('detail share uses the visible action slot while edit stays in overflow', async ({
    page,
  }) => {
    await page.route('**/api/recipes/search', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            topPick: {
              id: MOCK_IDS.RECIPE_LASAGNA,
              name: 'Homemade Lasagna',
              imageUrl: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3',
              totalTime: 'PT45M',
              rating: 3,
              isDiscoverable: true,
              notes: null,
              reasons: [{ source: 'name-match', label: 'Name matches your search' }],
              plannerFitNote: null,
            },
            results: [],
            appliedFilters: {},
            searchMode: 'standard',
            resultPath: 'lexical-only',
          },
        }),
      });
    });

    await page.route(`**/api/recipes/${MOCK_IDS.RECIPE_LASAGNA}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          recipe: builders.recipe({
            id: MOCK_IDS.RECIPE_LASAGNA,
            name: 'Homemade Lasagna',
            sourceType: 'url',
            sourceUrl: 'https://example.com/lasagna',
            canReimport: true,
            imageCount: 1,
          }),
        }),
      });
    });

    await page.goto('/recipes');
    await expect(page.getByTestId('recipe-loader')).not.toBeVisible({ timeout: 15_000 });
    await page.getByTestId('recipe-search-input').fill('lasagna');
    await page.getByTestId('recipe-search-input').press('Enter');
    await page.getByTestId('recipe-card-top-pick').click();

    await expect(page.getByTestId('recipe-detail-sheet')).toBeVisible();
    await expect(page.getByTestId('recipe-share-btn')).toBeVisible();
    await expect(page.getByTestId('action-view-original')).toBeVisible();
    await expect(page.getByTestId('action-edit-recipe')).not.toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('recipe-share-btn').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.recipe$/);

    await page.getByTestId('action-gear-menu').click();
    await expect(page.getByTestId('action-edit-recipe')).toBeVisible();
  });

  test('share button is hidden if hero image is missing or recipe is not ready', async ({
    page,
  }) => {
    await page.route(`**/api/recipes/${MOCK_IDS.RECIPE_LASAGNA}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          recipe: builders.recipe({
            id: MOCK_IDS.RECIPE_LASAGNA,
            name: 'Incomplete Recipe',
            imageUrl: '', // Missing hero
            isReady: true,
          }),
        }),
      });
    });

    await page.goto(`/recipes?open=${MOCK_IDS.RECIPE_LASAGNA}`);
    await expect(page.getByTestId('recipe-detail-sheet')).toBeVisible();
    await expect(page.getByTestId('recipe-share-btn')).not.toBeVisible();
  });

  test('share button is hidden if recipe is not ready', async ({ page }) => {
    await page.route(`**/api/recipes/${MOCK_IDS.RECIPE_LASAGNA}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          recipe: builders.recipe({
            id: MOCK_IDS.RECIPE_LASAGNA,
            name: 'Pending Recipe',
            imageUrl: 'https://example.com/hero.jpg',
            isReady: false,
          }),
        }),
      });
    });

    await page.goto(`/recipes?open=${MOCK_IDS.RECIPE_LASAGNA}`);
    await expect(page.getByTestId('recipe-detail-sheet')).toBeVisible();
    await expect(page.getByTestId('recipe-share-btn')).not.toBeVisible();
  });

  test('share button is hidden if imageUrl is a placeholder', async ({ page }) => {
    await page.route(`**/api/recipes/${MOCK_IDS.RECIPE_LASAGNA}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          recipe: builders.recipe({
            id: MOCK_IDS.RECIPE_LASAGNA,
            name: 'Placeholder Recipe',
            imageUrl: '/placeholder-recipe.jpg',
            isReady: true,
          }),
        }),
      });
    });

    await page.goto(`/recipes?open=${MOCK_IDS.RECIPE_LASAGNA}`);
    await expect(page.getByTestId('recipe-detail-sheet')).toBeVisible();
    await expect(page.getByTestId('recipe-share-btn')).not.toBeVisible();
  });

  test('manual .recipe import starts on capture, shows review, and exits back home', async ({
    page,
  }) => {
    await page.goto('/capture');

    await expect(page.getByTestId('import-recipe-file-btn')).toBeVisible();
    await page.getByTestId('import-recipe-file-input').setInputFiles(SHARED_RECIPE_FIXTURE);

    await expect(page.getByTestId('bundle-preview-card')).toBeVisible();
    await expect(page.getByTestId('bundle-preview-name')).toContainText('Shared Lasagna');
    await expect(page.getByTestId('bundle-preview-source-url')).toContainText(
      'https://example.com/shared-lasagna'
    );

    await page.getByTestId('accept-bundle-btn').click();

    await expect(page.getByTestId('bundle-import-success')).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('bundle-import-done-btn').click();

    await expect(page).toHaveURL(/\/home/);
  });
});
