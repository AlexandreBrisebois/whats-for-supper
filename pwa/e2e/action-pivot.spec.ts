import { test, expect } from './fixtures';
import { MOCK_IDS, builders, setupCommonRoutes } from './mock-api';

test.describe('Recipe Action Pivot', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    page.on('console', (msg) => {
      console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`);
    });
    await setupCommonRoutes(page);

    const baseUrl = baseURL || 'http://127.0.0.1:3000';

    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);

    // Set localStorage before first navigation
    await page.addInitScript((id) => {
      localStorage.setItem(
        'family-storage',
        JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 })
      );
    }, MOCK_IDS.MEMBER_ALEX);

    // Mock search results
    await page.route('**/api/recipes/search', async (route) => {
      const body = route.request().postDataJSON();
      if (body?.query === 'lasagna' || body?.query === '') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              topPick: {
                id: MOCK_IDS.RECIPE_LASAGNA,
                name: 'Homemade Lasagna',
                imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
                totalTime: '45 min',
                rating: 3,
                isDiscoverable: true,
                notes: null,
                reasons: [{ source: 'AI', label: 'Matches your craving' }],
                plannerFitNote: 'Matches your craving',
              },
              results: [],
              appliedFilters: {},
              searchMode: 'standard',
              resultPath: 'lexical-only',
            },
          }),
        });
      } else {
        await route.fallback();
      }
    });

    await page.route('**/api/recipes/*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            recipe: builders.recipe({
              id: MOCK_IDS.RECIPE_LASAGNA,
              name: 'Homemade Lasagna',
              description: 'A classic family lasagna.',
            }),
          }),
        });
      } else {
        await route.fallback();
      }
    });
  });

  test('Discovery flow: shows "Cook This" and then the pivot', async ({ page }) => {
    await page.goto('/recipes');
    await page.getByTestId('recipe-search-input').fill('lasagna');
    await page.getByTestId('recipe-search-input').press('Enter');
    await expect(page.getByTestId('recipe-loader')).not.toBeVisible();

    const topPick = page.getByTestId('recipe-card-top-pick');
    await expect(topPick).toBeVisible();
    await topPick.click();

    const cookBtn = page.getByTestId('action-cook-this');
    await expect(cookBtn).toBeVisible();
    await cookBtn.click();

    // Should show pivot buttons
    await expect(page.getByTestId('action-cook-tonight')).toBeVisible();
    await expect(page.getByTestId('action-plan-later')).toBeVisible();
    // Primary button should be hidden
    await expect(cookBtn).not.toBeVisible();
  });

  test('Discovery flow: "Cook it tonight" navigates home', async ({ page }) => {
    await page.goto('/recipes');
    await page.getByTestId('recipe-search-input').fill('lasagna');
    await page.getByTestId('recipe-search-input').press('Enter');
    await page.getByTestId('recipe-card-top-pick').click();
    await page.getByTestId('action-cook-this').click();

    await page.getByTestId('action-cook-tonight').click();
    await expect(page).toHaveURL(/\/home/);
  });

  test('Planner flow: shows "Plan for {day}" directly', async ({ page }) => {
    // Go to recipes with planner context (Tuesday index 1)
    await page.goto('/recipes?addToDay=1&weekOffset=0');

    await page.getByTestId('recipe-search-input').fill('lasagna');
    await page.getByTestId('recipe-search-input').press('Enter');

    await page.getByTestId('recipe-card-top-pick').click();

    const addBtn = page.getByTestId('action-add-to-day');
    await expect(addBtn).toBeVisible();
    await expect(addBtn).toHaveText(/Plan for Tuesday/);

    await addBtn.click();
    // Should navigate back to planner with success
    await expect(page).toHaveURL(/\/planner\?success=1/);
    await expect(page).toHaveURL(/dayIndex=1/);
  });

  test('Quick Find in Planner: propagates context to Search Library', async ({ page }) => {
    // Mock fill-the-gap suggestions
    await page.route('**/api/schedule/fill-the-gap**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: Array.from({ length: 5 }, (_, i) => ({
            id: `recipe-${i}`,
            name: `Recipe ${i}`,
            image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
          })),
        }),
      });
    });

    await page.goto('/planner');
    await page.getByTestId('day-card-1').click();
    await page.getByTestId('pivot-quick-find').click();

    // Verify modal is open
    await expect(page.getByTestId('quick-find-modal')).toBeVisible();

    // Go to the nudge card (5th card)
    for (let i = 0; i < 4; i++) {
      await page.getByTestId('quick-find-next').click();
      // Wait for card transition to settle
      await page.waitForTimeout(100);
    }

    const searchLibraryLink = page.getByTestId('quick-find-search-library');
    await expect(searchLibraryLink).toBeVisible();
    await expect(searchLibraryLink).toHaveAttribute('href', /\/recipes\?addToDay=1&weekOffset=0/);

    await searchLibraryLink.click();
    await expect(page).toHaveURL(/\/recipes\?addToDay=1&weekOffset=0/);
    await expect(page.getByTestId('planning-mode-banner')).toBeVisible();
    await expect(page.getByTestId('planning-mode-banner')).toContainText(/Planning for Tuesday/i);
  });

  test('Discovery flow: "Plan for Later" skips past and current day', async ({ page }) => {
    // Set fixed time to Wednesday May 13, 2026
    const wednesday = new Date('2026-05-13T12:00:00Z');
    await page.clock.setFixedTime(wednesday);

    // Mock schedule: all days empty
    await page.route('**/api/schedule?weekOffset=0', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            weekOffset: 0,
            days: Array.from({ length: 7 }, (_, i) => ({
              date: `2026-05-${11 + i}`, // Mon 11 to Sun 17
              recipe: null,
            })),
          },
        }),
      });
    });

    await page.goto('/recipes');
    await page.getByTestId('recipe-search-input').fill('lasagna');
    await page.getByTestId('recipe-search-input').press('Enter');
    await expect(page.getByTestId('recipe-loader')).not.toBeVisible();
    await page.getByTestId('recipe-card-top-pick').click();
    await page.getByTestId('action-cook-this').click();

    await page.getByTestId('action-plan-later').click();

    // Today is Wed (index 2), Tomorrow is Thu (index 3).
    // It should skip index 0 (Mon), 1 (Tue), 2 (Wed).
    await expect(page).toHaveURL(/\/planner\?success=1/);
    await expect(page).toHaveURL(/dayIndex=3/);
    await expect(page).toHaveURL(/weekOffset=0/);
  });
});
