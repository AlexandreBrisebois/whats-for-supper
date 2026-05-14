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
            searchMode: 'standard',
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
    await page.goto('/recipes');

    // Wait for and click the recipe card
    const recipeCard = page.getByTestId(`recipe-card-${MOCK_IDS.RECIPE_LASAGNA}`);
    await expect(recipeCard).toBeVisible();
    await recipeCard.click();

    // Wait for the detail sheet to appear
    await expect(page.getByTestId('recipe-detail-name')).toContainText('Hero Test Recipe');
  }

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
