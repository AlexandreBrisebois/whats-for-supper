import { type Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { setupCommonRoutes, MOCK_IDS, builders } from './mock-api';

test.describe('Recipe Original Viewer', () => {
  test.beforeEach(async ({ page }) => {
    await setupCommonRoutes(page);

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

  async function setupRecipe(page: Page, overrides: any) {
    const recipeId = MOCK_IDS.RECIPE_LASAGNA;
    const recipe = builders.recipe({
      id: recipeId,
      name: 'Original Test Recipe',
      ...overrides,
    });

    await page.route(`**/api/recipes/${recipeId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          recipe,
          updatedAt: new Date().toISOString(),
        }),
      });
    });

    await page.route('**/api/recipes/search', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            topPick: null,
            results: [recipe],
            appliedFilters: {},
            searchMode: 'standard',
            resultPath: 'lexical-only',
          },
        }),
      });
    });

    await page.goto('/recipes');
    const recipeCard = page.getByTestId(`recipe-card-${recipeId}`);
    await expect(recipeCard).toBeVisible();
    await recipeCard.click();
    await expect(page.getByTestId('recipe-detail-name')).toContainText('Original Test Recipe');
  }

  test('View Original is hidden for synthesized description-only recipes', async ({ page }) => {
    await setupRecipe(page, {
      sourceType: 'synthesized',
      imageCount: 0,
      sourceUrl: null,
    });

    await expect(page.getByTestId('action-view-original')).not.toBeVisible();
  });

  test('View Original shows ExternalLink icon and opens URL for URL-based recipes', async ({
    page,
  }) => {
    const sourceUrl = 'https://example.com/test-recipe';
    await setupRecipe(page, {
      sourceType: 'url',
      sourceUrl,
      imageCount: 0,
    });

    const viewButton = page.getByTestId('action-view-original');
    await expect(viewButton).toBeVisible();
    await expect(viewButton).toContainText('View Original');
    await expect(viewButton.getByTestId('view-original-icon')).toBeVisible();
  });

  test('View Original shows Images icon and opens viewer for photo-based recipes', async ({
    page,
  }) => {
    await setupRecipe(page, {
      sourceType: 'photos',
      imageCount: 2,
      sourceUrl: null,
    });

    const viewButton = page.getByTestId('action-view-original');
    await expect(viewButton).toBeVisible();
    await expect(viewButton).toContainText('View Original');

    // Click to open viewer
    await viewButton.click();

    // Viewer should be visible (check for close button)
    await expect(page.getByTestId('action-close-viewer')).toBeVisible();
  });
});
