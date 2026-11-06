import { type Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { setupCommonRoutes, MOCK_IDS, builders } from './mock-api';

test.describe('Recipe Hero Actions', () => {
  test.beforeEach(async ({ page }) => {
    await setupCommonRoutes(page);

    // Mock getting a specific recipe
    await page.route(`**/api/recipes/${MOCK_IDS.RECIPE_LASAGNA}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          recipe: builders.recipe({
            id: MOCK_IDS.RECIPE_LASAGNA,
            name: 'Hero Test Recipe',
            imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
            sourceType: 'url',
            canReimport: true,
            imageCount: 1,
          }),
          updatedAt: new Date().toISOString(),
        }),
      });
    });

    // Mock search results to include our test recipe
    await page.route('**/api/recipes/search', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            topPick: null,
            results: [
              builders.recipe({
                id: MOCK_IDS.RECIPE_LASAGNA,
                name: 'Hero Test Recipe',
              }),
            ],
            appliedFilters: {},
            searchMode: 'explicit',
            resultPath: 'lexical-only',
          },
        }),
      });
    });

    // Mock family member Alex
    await page.route('**/api/family', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [builders.familyMember({ id: MOCK_IDS.MEMBER_ALEX, name: 'Alex' })],
        }),
      });
    });

    // Set cookie for family member
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
    await page.context().addCookies([
      {
        name: 'x-family-member-id',
        value: MOCK_IDS.MEMBER_ALEX,
        url: baseUrl,
      },
    ]);
  });

  async function openRecipeDetail(page: Page) {
    await page.goto('/recipes?focus=search');
    await page.getByTestId('recipe-search-input').fill('Hero Test Recipe');
    await page.getByTestId('recipe-search-input').press('Enter');

    // Wait for and click the recipe card
    const recipeCard = page.getByTestId('stack-card-front');
    await expect(recipeCard).toBeVisible();
    await expect(recipeCard).toHaveAttribute('data-recipe-id', MOCK_IDS.RECIPE_LASAGNA);
    await recipeCard.click();

    // Wait for the detail sheet to appear
    await expect(page.getByTestId('recipe-detail-name')).toContainText('Hero Test Recipe');
  }

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 820, height: 1180 },
  ]) {
    test(`final reading action remains reachable above planning at ${viewport.width}x${viewport.height}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      await openRecipeDetail(page);
      const finalAction = page.getByTestId('action-toggle-discovery');
      await finalAction.scrollIntoViewIfNeeded();
      await finalAction.focus();
      await expect(finalAction).toBeInViewport({ ratio: 1 });
      await expect(finalAction).toBeFocused();
      const reading = page.getByTestId('recipe-detail-reading');
      const planning = page.getByTestId('recipe-planning-actions');
      const readingBounds = await reading.boundingBox();
      const planningBounds = await planning.boundingBox();
      expect(readingBounds!.y + readingBounds!.height).toBeLessThanOrEqual(planningBounds!.y + 1);
      await expect(page.getByTestId('action-add-to-day')).toBeInViewport({ ratio: 1 });
      await expect(page.getByTestId('action-close-sheet')).toBeInViewport({ ratio: 1 });
      expect(await page.getByTestId('recipe-detail-sheet').evaluate((node) => node.scrollTop)).toBe(
        0
      );
      await page.screenshot({ path: testInfo.outputPath(`detail-actions-${viewport.width}.png`) });
    });
  }

  test('detail edit actions stay reachable while reading scrolls independently', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await openRecipeDetail(page);
    await page.getByTestId('action-gear-menu').click();
    await page.getByTestId('action-edit-recipe').click();
    await page.getByTestId('recipe-detail-reading').evaluate((node) => {
      node.scrollTop = node.scrollHeight;
    });
    for (const action of ['recipe-save-edits', 'recipe-cancel-edits']) {
      const control = page.getByTestId(action);
      await control.scrollIntoViewIfNeeded();
      await control.focus();
      await expect(control).toBeInViewport({ ratio: 1 });
      await expect(control).toBeFocused();
      const withinPanel = await control.evaluate((button) => {
        const bounds = button.getBoundingClientRect();
        const panel = document
          .querySelector('[data-testid="recipe-detail-sheet"]')!
          .getBoundingClientRect();
        return bounds.top >= panel.top && bounds.bottom + 4 <= panel.bottom;
      });
      expect(withinPanel).toBe(true);
    }
    expect(await page.getByTestId('recipe-detail-sheet').evaluate((node) => node.scrollTop)).toBe(
      0
    );
    await expect(page.getByTestId('action-close-sheet')).toBeInViewport({ ratio: 1 });
  });

  test.describe('French enlarged detail footer', () => {
    test.use({ appLocale: 'fr' });
    test('keeps the final reading action and focus reachable on a short phone', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      await openRecipeDetail(page);
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '32px';
      });
      const finalAction = page.getByTestId('action-toggle-discovery');
      await finalAction.scrollIntoViewIfNeeded();
      await finalAction.focus();
      await expect(finalAction).toBeInViewport({ ratio: 1 });
      await expect(finalAction).toBeFocused();
      await expect(page.getByTestId('action-close-sheet')).toBeInViewport({ ratio: 1 });
      expect(await page.getByTestId('recipe-detail-sheet').evaluate((node) => node.scrollTop)).toBe(
        0
      );
    });
  });

  test('hero actions are visible only in edit mode', async ({ page }) => {
    await openRecipeDetail(page);

    // Hero actions should NOT be visible initially
    await expect(page.getByTestId('hero-action-camera')).not.toBeVisible();
    await expect(page.getByTestId('hero-action-regenerate')).not.toBeVisible();

    // Click Edit from the gear menu
    await page.getByTestId('action-gear-menu').click();
    await page.getByTestId('action-edit-recipe').click();

    // Hero actions should now be visible
    await expect(page.getByTestId('hero-action-camera')).toBeVisible();
    await expect(page.getByTestId('hero-action-regenerate')).toBeVisible();
  });

  test('regenerate hero triggers API and shows toast', async ({ page }) => {
    let regenerateCalled = false;
    await page.route(`**/api/recipes/${MOCK_IDS.RECIPE_LASAGNA}/hero/regenerate`, async (route) => {
      regenerateCalled = true;
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'queued' }),
      });
    });

    await openRecipeDetail(page);
    await page.getByTestId('action-gear-menu').click();
    await page.getByTestId('action-edit-recipe').click();

    // Click regenerate
    await page.getByTestId('hero-action-regenerate').click();

    // Should show success toast
    await expect(page.getByText('Regenerating hero image...')).toBeVisible();
    expect(regenerateCalled).toBe(true);
  });

  test('camera action triggers file upload and shows toast', async ({ page }) => {
    let uploadCalled = false;
    await page.route(`**/api/recipes/${MOCK_IDS.RECIPE_LASAGNA}/originals`, async (route) => {
      uploadCalled = true;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: MOCK_IDS.PHOTO_NEW }),
      });
    });

    await openRecipeDetail(page);
    await page.getByTestId('action-gear-menu').click();
    await page.getByTestId('action-edit-recipe').click();

    // Playwright cannot easily click a hidden input, so we use setInputFiles on the hidden input directly
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByTestId('hero-action-camera').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'test-photo.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-image-data'),
    });

    // Should show uploading toast then success toast
    await expect(page.getByText('Uploading photo...')).toBeVisible();
    await expect(page.getByText('Regenerating hero image...')).toBeVisible();
    expect(uploadCalled).toBe(true);
  });
});
