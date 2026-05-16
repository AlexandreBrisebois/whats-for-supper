import path from 'path';
import fs from 'fs';
import { test, expect } from './fixtures';
import { MOCK_IDS, builders, setupCommonRoutes } from './mock-api';

test.describe('High-Fidelity Sharing Round-trip', () => {
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

  test('Backup fidelity: Export preserves structured instructions, notes, and rating during round-trip', async ({
    page,
  }) => {
    const recipeId = MOCK_IDS.RECIPE_BACKUP;
    const recipeName = 'Fidelity Backup Lasagna';

    // 1. Mock the source recipe with full metadata
    await page.route(`**/api/recipes/${recipeId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          recipe: builders.recipe({
            id: recipeId,
            name: recipeName,
            notes: 'These are secret backup notes.',
            rating: 3,
            recipeInstructions: [
              {
                '@type': 'HowToSection',
                name: 'The Base',
                itemListElement: [{ '@type': 'HowToStep', text: 'Mix the flour and eggs.' }],
              },
              {
                '@type': 'HowToSection',
                name: 'The Filling',
                itemListElement: [{ '@type': 'HowToStep', text: 'Add ricotta and spinach.' }],
              },
            ] as any,
          }),
        }),
      });
    });

    // 2. Mock the "Share" endpoint to simulate a BACKUP (preserves notes/rating)
    // In a real app, the backend handles the scrub/no-scrub logic.
    // For this E2E test, we simulate the bundle content we expect.
    await page.route(`**/api/recipes/${recipeId}/share`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          builders.recipeShareBundle({
            recipe: {
              name: recipeName,
              ingredients: ['Pasta', 'Spinach'],
              instructions: [
                {
                  name: 'The Base',
                  itemListElement: [{ text: 'Mix the flour and eggs.' }],
                },
                {
                  name: 'The Filling',
                  itemListElement: [{ text: 'Add ricotta and spinach.' }],
                },
              ],
              notes: 'These are secret backup notes.',
              rating: 3,
              isSynthesized: true,
            } as any,
          })
        ),
      });
    });

    // 3. Export the recipe
    await page.goto(`/recipes?open=${recipeId}`);
    await expect(page.getByTestId('recipe-detail-sheet')).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('recipe-share-btn').click();
    const download = await downloadPromise;
    const downloadPath = await download.path();

    // 4. Go to capture and upload the downloaded file
    await page.goto('/capture');
    await page.getByTestId('import-recipe-file-input').setInputFiles(downloadPath);

    // 5. Verify Preview Fidelity (AC 4.2)
    await expect(page.getByTestId('bundle-preview-card')).toBeVisible();
    await expect(page.getByTestId('bundle-preview-name')).toContainText(recipeName);

    // Verify sections and steps
    await expect(page.getByTestId('bundle-preview-section-title').nth(0)).toContainText('The Base');
    await expect(page.getByTestId('bundle-preview-step-text').nth(0)).toContainText(
      'Mix the flour and eggs.'
    );
    await expect(page.getByTestId('bundle-preview-section-title').nth(1)).toContainText(
      'The Filling'
    );
    await expect(page.getByTestId('bundle-preview-step-text').nth(1)).toContainText(
      'Add ricotta and spinach.'
    );

    // Verify restored metadata (AC 3.2)
    await expect(page.getByTestId('bundle-preview-notes')).toContainText(
      'These are secret backup notes.'
    );
    await expect(page.getByTestId('bundle-preview-rating')).toBeVisible();

    // 6. Complete Import
    await page.getByTestId('accept-bundle-btn').click();
    await expect(page.getByTestId('bundle-import-success')).toBeVisible();
    await page.getByTestId('bundle-import-done-btn').click();

    await expect(page).toHaveURL(/\/home/);
  });

  test('Privacy scrubbing: Share bundle excludes personal metadata', async ({ page }) => {
    const recipeId = MOCK_IDS.RECIPE_SHARED;

    // 1. Mock the "Share" endpoint to simulate a SHARING bundle (scrubbed)
    await page.route(`**/api/recipes/${recipeId}/share`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          builders.recipeShareBundle({
            recipe: {
              name: 'Shared Secret Lasagna',
              ingredients: ['Secret Sauce'],
              instructions: [
                {
                  name: 'Instructions',
                  itemListElement: [{ text: "Don't tell anyone." }],
                },
              ],
              notes: null, // Scrubbed
              rating: null, // Scrubbed
              isSynthesized: true,
            } as any,
          })
        ),
      });
    });

    // 2. Export the recipe
    await page.goto(`/recipes?open=${recipeId}`);
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('recipe-share-btn').click();
    const download = await downloadPromise;
    const downloadPath = await download.path();

    const bundleContent = JSON.parse(fs.readFileSync(downloadPath, 'utf-8'));

    // 3. Assert privacy scrubbing (AC 2.3)
    expect(bundleContent.recipe.notes).toBeNull();
    expect(bundleContent.recipe.rating).toBeNull();

    // 4. Verify preview reflects scrubbed state
    await page.goto('/capture');
    await page.getByTestId('import-recipe-file-input').setInputFiles(downloadPath);

    await expect(page.getByTestId('bundle-preview-notes')).not.toBeVisible();
    await expect(page.getByTestId('bundle-preview-rating')).not.toBeVisible();
  });
});
