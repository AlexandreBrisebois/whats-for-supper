import { test, expect } from '@playwright/test';

test.describe('Discovery Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Bypass onboarding by setting x-family-member-id cookie
    await page.context().addCookies([
      {
        name: 'x-family-member-id',
        value: '1',
        url: 'http://127.0.0.1:3000',
      },
    ]);
  });

  test('should fetch categories and then fetch the first category stack', async ({ page }) => {
    // Intercept category call - use /backend prefix since API_BASE_URL defaults to /backend
    await page.route(
      (url) => url.pathname.includes('/backend/api/discovery/categories'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: ['Gourmet Discovery', 'Quick Bites'] }),
        });
      }
    );

    // Intercept stack call for the first category
    await page.route(
      (url) =>
        url.pathname.includes('/backend/api/discovery') &&
        url.searchParams.get('category') === 'Gourmet Discovery',
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: 'recipe-1',
                name: 'Tuscan Pasta',
                description: 'Delicious pasta',
                imageUrl: '/api/recipes/recipe-1/hero',
                totalTime: '20 Min',
                difficulty: 'Easy',
                category: 'Gourmet Discovery',
              },
            ],
          }),
        });
      }
    );

    await page.goto('/discovery');

    // Verify it loads the recipe from the first category
    await expect(page.getByText('Tuscan Pasta')).toBeVisible();
  });

  test('should show empty state when no categories are available', async ({ page }) => {
    await page.route(
      (url) => url.pathname.includes('/backend/api/discovery/categories'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [] }),
        });
      }
    );

    await page.goto('/discovery');

    await expect(page.getByText(/You've seen all the inspirations for today!/)).toBeVisible();
  });

  test('should send a vote to API when swiping right', async ({ page }) => {
    let voteSent = false;

    await page.route(
      (url) => url.pathname.includes('/backend/api/discovery/categories'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: ['Gourmet Discovery'] }),
        });
      }
    );

    await page.route(
      (url) =>
        url.pathname.includes('/backend/api/discovery') &&
        url.searchParams.get('category') === 'Gourmet Discovery',
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: 'recipe-1',
                name: 'Tuscan Pasta',
                description: 'desc',
                imageUrl: '',
                totalTime: '20 Min',
                difficulty: 'Easy',
                category: 'Gourmet Discovery',
              },
            ],
          }),
        });
      }
    );

    await page.route(
      (url) => url.pathname.includes('/backend/api/discovery/recipe-1/vote'),
      async (route) => {
        const postData = route.request().postDataJSON();
        if (postData.vote === 1) {
          voteSent = true;
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
    );

    await page.goto('/discovery');

    // Wait for the card to be visible
    await expect(page.getByText('Tuscan Pasta')).toBeVisible();

    // Trigger swipe right (Like) via UI button
    await page.locator('button').filter({ hasText: '♥' }).click();

    await expect(async () => {
      expect(voteSent).toBe(true);
    }).toPass();

    // Verify stack update (should show empty state since only 1 recipe)
    await expect(page.getByText(/You've seen all the inspirations for today!/)).toBeVisible();
  });
});
