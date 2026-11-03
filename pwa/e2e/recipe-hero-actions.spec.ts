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
    test(`detail action section owns its 8px inset at ${viewport.width}x${viewport.height}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      await openRecipeDetail(page);
      const finalAction = page.getByTestId('action-toggle-discovery');
      await finalAction.scrollIntoViewIfNeeded();
      const gap = await finalAction.evaluate((button) => {
        const scroller = button.closest('.overflow-y-auto') as HTMLElement;
        scroller.scrollTop = scroller.scrollHeight;
        return {
          total: scroller.getBoundingClientRect().bottom - button.getBoundingClientRect().bottom,
          scrollerPadding: parseFloat(getComputedStyle(scroller).paddingBottom),
          actionPadding: parseFloat(getComputedStyle(button.parentElement!).paddingBottom),
        };
      });
      expect(gap.total).toBeGreaterThanOrEqual(31);
      expect(gap.total).toBeLessThanOrEqual(34);
      expect(gap.scrollerPadding).toBe(24);
      expect(gap.actionPadding).toBe(8);
      await expect(finalAction).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath(`detail-actions-${viewport.width}.png`) });
    });
  }

  test('detail edit actions stay reachable at the end of the scroller', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await openRecipeDetail(page);
    await page.getByTestId('action-gear-menu').click();
    await page.getByTestId('action-edit-recipe').click();
    const cancel = page.getByTestId('recipe-cancel-edits');
    await cancel.scrollIntoViewIfNeeded();
    await cancel.focus();
    const geometry = await cancel.evaluate((button) => {
      const scroller = button.closest('.overflow-y-auto') as HTMLElement;
      scroller.scrollTop = scroller.scrollHeight;
      const panel = document.querySelector('[data-testid="recipe-detail-sheet"]')!;
      return {
        gap: scroller.getBoundingClientRect().bottom - button.getBoundingClientRect().bottom,
        scrollerPadding: parseFloat(getComputedStyle(scroller).paddingBottom),
        actionPadding: parseFloat(getComputedStyle(button.parentElement!).paddingBottom),
        withinPanel:
          button.getBoundingClientRect().bottom + 4 <= panel.getBoundingClientRect().bottom,
      };
    });
    expect(geometry.gap).toBeGreaterThanOrEqual(31);
    expect(geometry.scrollerPadding).toBe(24);
    expect(geometry.actionPadding).toBe(24);
    expect(geometry.withinPanel).toBe(true);
    await expect(cancel).toBeFocused();
  });

  test.describe('French enlarged detail footer', () => {
    test.use({ appLocale: 'fr' });
    test('keeps the final action and focus reachable on a short phone', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      await openRecipeDetail(page);
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '32px';
      });
      const finalAction = page.getByTestId('action-toggle-discovery');
      await finalAction.scrollIntoViewIfNeeded();
      await finalAction.focus();
      const geometry = await finalAction.evaluate((button) => {
        const scroller = button.closest('.overflow-y-auto') as HTMLElement;
        scroller.scrollTop = scroller.scrollHeight;
        const panel = document.querySelector('[data-testid="recipe-detail-sheet"]')!;
        return {
          gap: scroller.getBoundingClientRect().bottom - button.getBoundingClientRect().bottom,
          withinPanel:
            button.getBoundingClientRect().bottom + 4 <= panel.getBoundingClientRect().bottom,
        };
      });
      expect(geometry.gap).toBeGreaterThanOrEqual(31);
      expect(geometry.withinPanel).toBe(true);
      await expect(finalAction).toBeFocused();
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
