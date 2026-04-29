import path from 'path';
import { test, expect } from './fixtures';
import { MOCK_IDS, builders } from './mock-api';

const FIXTURE_IMAGE = path.join(__dirname, 'fixtures', 'test-meal.jpg');

test.describe('Capture Flow', () => {
  test.beforeEach(async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';

    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);

    // Inject localStorage before any navigation so the store hydrates correctly
    await page.addInitScript((id) => {
      localStorage.setItem(
        'family-storage',
        JSON.stringify({
          state: { selectedFamilyMemberId: id },
          version: 0,
        })
      );
    }, MOCK_IDS.MEMBER_ALEX);

    // Home page needs schedule + family intercepts
    await page.route(/\/(?:backend\/)?api\/schedule(?:\?|$|\/)/, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              weekOffset: 0,
              locked: false,
              days: [],
              status: 0,
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.route(/\/(?:backend\/)?api\/family/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [builders.familyMember({ name: 'Alex' })] }),
      });
    });

    // Capture endpoint
    await page.route(/\/(?:backend\/)?api\/recipes/, async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            data: builders.recipe({ id: MOCK_IDS.RECIPE_LASAGNA, name: 'Captured Recipe' }),
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [], total: 0 }),
        });
      }
    });
  });

  test('authenticated user can navigate to the capture page from home', async ({ page }) => {
    await page.goto('/home');

    await page.getByRole('link', { name: /capture a recipe/i }).click();

    await expect(page).toHaveURL(/\/capture/);
    await expect(page.getByRole('button', { name: /take a photo/i })).toBeVisible();
  });

  test('user can complete the capture flow and see a success message', async ({ page }) => {
    await page.goto('/capture');

    await page.context().grantPermissions(['camera']);

    const fileInput = page.locator('input[type="file"]').first();

    if ((await fileInput.count()) > 0) {
      await fileInput.setInputFiles(FIXTURE_IMAGE);
    } else {
      const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.getByRole('button', { name: /gallery/i }).click(),
      ]);
      await fileChooser.setFiles(FIXTURE_IMAGE);
    }

    await expect(page.getByRole('heading', { name: /photos \(1\)/i })).toBeVisible({
      timeout: 10_000,
    });

    const ratingButton = page.getByRole('button', { name: /loved it/i });
    await expect(ratingButton).toBeVisible();
    await ratingButton.click();

    const notesInput = page.getByPlaceholder(/any tweaks/i);
    await notesInput.fill('Test recipe notes');

    const saveBtn = page.getByRole('button', { name: /save recipe/i });
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    await expect(page.getByText(/captured/i)).toBeVisible({ timeout: 15_000 });
  });

  test('after successful capture, user can return to home', async ({ page }) => {
    await page.goto('/home');
    await expect(
      page.getByTestId('tonight-menu-card').or(page.getByTestId('smart-pivot-card'))
    ).toBeVisible();
  });

  test('user can navigate to the search page from the navigation bar', async ({ page }) => {
    await page.route(/\/(?:backend\/)?api\/recipes(?:\?|$|\/)/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], total: 0 }),
      });
    });

    await page.goto('/home');

    await page.getByRole('link', { name: /^search$/i }).click();

    await expect(page).toHaveURL(/\/recipes/);
    await expect(page.getByPlaceholder(/Something spicy for \d+/i)).toBeVisible({
      timeout: 10_000,
    });
  });
});
