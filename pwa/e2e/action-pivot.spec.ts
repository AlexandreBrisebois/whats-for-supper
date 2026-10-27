import { test, expect } from './fixtures';
import { MOCK_IDS, builders, setupCommonRoutes } from './mock-api';

test.describe('Recipe Action Pivot', () => {
  test.beforeEach(async ({ page, baseURL }, testInfo) => {
    page.on('console', (msg) => {
      console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`);
    });
    const calendar = testInfo.title.includes('skips past')
      ? builders.deploymentCalendar({
          today: '2026-05-13',
          capturedAtUtc: '2026-05-13T12:00:00Z',
          currentWeekStartDate: '2026-05-11',
          referenceWeekStartDate: '2026-05-11',
          nextDayAtUtc: '2026-05-14T00:00:00Z',
        })
      : undefined;
    await setupCommonRoutes(page, calendar);

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
              },
              results: [],
              appliedFilters: {},
              searchMode: 'explicit',
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

  test('Search flow: shows "Cook This" and then the pivot', async ({ page }) => {
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

  test('Search flow: "Cook it tonight" navigates home', async ({ page }) => {
    await page.goto('/recipes');
    await page.getByTestId('recipe-search-input').fill('lasagna');
    await page.getByTestId('recipe-search-input').press('Enter');
    await page.getByTestId('recipe-card-top-pick').click();
    await page.getByTestId('action-cook-this').click();

    await page.getByTestId('action-cook-tonight').click();
    await expect(page).toHaveURL(/\/home/);
  });

  test('Search flow: "Cook Tonight" reveals recovery when today is occupied', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-05-13T12:00:00Z'));
    const todayIndex = 2;

    await page.route(
      (url) => url.pathname === '/api/schedule' && url.searchParams.get('weekOffset') === '0',
      async (route) => {
        const days = Array.from({ length: 7 }, (_, dayIndex) => ({
          day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][dayIndex],
          date: `2026-05-${String(11 + dayIndex).padStart(2, '0')}`,
          recipe:
            dayIndex === todayIndex
              ? builders.scheduleRecipe({ id: MOCK_IDS.RECIPE_CHICKEN })
              : null,
          status: 0,
        }));

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              weekOffset: 0,
              weekStartDate: '2026-05-11',
              calendar: builders.deploymentCalendar({
                today: '2026-05-13',
                capturedAtUtc: '2026-05-13T12:00:00Z',
                currentWeekStartDate: '2026-05-11',
                referenceWeekStartDate: '2026-05-11',
                nextDayAtUtc: '2026-05-14T00:00:00Z',
              }),
              locked: false,
              status: 0,
              days,
            },
          }),
        });
      }
    );

    await page.goto('/recipes');
    await page.getByTestId('recipe-search-input').fill('lasagna');
    await page.getByTestId('recipe-search-input').press('Enter');
    await page.getByTestId('recipe-card-top-pick').click();
    await page.getByTestId('action-cook-this').click();
    await page.getByTestId('action-cook-tonight').click();

    await expect(page.getByTestId('recipe-detail-sheet')).not.toBeVisible();
    await expect(page.getByTestId('recovery-dialog-title')).toBeVisible();
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

  test('Quick Replace in Planner: Search retains the selected date through assignment', async ({
    page,
  }) => {
    // Five observed animated transitions plus Search and replacement reconciliation.
    test.setTimeout(60_000);
    const suggestions = [
      MOCK_IDS.RECIPE_LIST_01,
      MOCK_IDS.RECIPE_LIST_02,
      MOCK_IDS.RECIPE_LIST_03,
      MOCK_IDS.RECIPE_LIST_04,
      MOCK_IDS.RECIPE_LIST_05,
    ].map((id, index) => builders.scheduleRecipe({ id, name: `Suggestion ${index + 1}` }));
    await page.route('**/api/schedule/fill-the-gap**', async (route) => {
      expect(new URL(route.request().url()).searchParams.get('referenceWeekStartDate')).toBe(
        '2026-05-04'
      );
      await route.fulfill({ json: { data: suggestions } });
    });

    // Seed an occupied Tuesday in the following week through the stateful mock.
    await page.goto('/onboarding');
    await page.evaluate(async (recipeId) => {
      const response = await fetch('/api/schedule/assign?referenceWeekStartDate=2026-05-04', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekOffset: 1, dayIndex: 1, recipeId }),
      });
      if (!response.ok) throw new Error('Could not seed replacement slot');
    }, MOCK_IDS.RECIPE_CHICKEN);
    await page.goto('/planner?weekOffset=1&referenceWeekStartDate=2026-05-04');
    await expect(page.getByTestId('day-card-1')).toContainText('Chicken');
    await page.getByTestId('day-card-1').getByTestId('change-recipe-button').click();
    await expect(page.getByTestId('pivot-sheet').getByRole('time')).toHaveAttribute(
      'datetime',
      '2026-05-12'
    );
    await page.getByTestId('pivot-quick-find').click();

    const modal = page.getByTestId('quick-find-modal');
    await expect(modal).toBeVisible();
    // Observe each completed card transition; the footer remains visible during exits.
    for (const recipe of suggestions) {
      await expect(modal.getByRole('heading', { name: recipe.name!, exact: true })).toBeVisible();
      await page.getByTestId('quick-find-next').click();
    }
    const searchLibraryLink = page.getByTestId('quick-find-search-library');
    await expect(searchLibraryLink).toHaveAttribute(
      'href',
      '/recipes?addToDay=1&weekOffset=1&referenceWeekStartDate=2026-05-04'
    );
    await expect(page.getByTestId('quick-find-select')).toBeDisabled();
    await searchLibraryLink.click();
    await expect(page).toHaveURL(
      /\/recipes\?addToDay=1&weekOffset=1&referenceWeekStartDate=2026-05-04/
    );
    await expect(page.getByTestId('planning-mode-banner')).toBeVisible();
    await expect(page.getByTestId('planning-mode-banner')).toContainText(/Planning for Tuesday/i);
    await page.getByTestId('recipe-search-input').fill('lasagna');
    await page.getByTestId('recipe-search-input').press('Enter');
    await page.getByTestId('recipe-card-top-pick').click();
    await expect(page.getByTestId('action-add-to-day')).toHaveText(/Plan for Tuesday/);
    await page.getByTestId('action-add-to-day').click();
    await expect(page.getByTestId('recovery-dialog-title')).toBeVisible();
    const assignment = page.waitForRequest(
      (request) =>
        request.method() === 'POST' && new URL(request.url()).pathname === '/api/schedule/assign'
    );
    await page.getByTestId('recovery-action-drop').click();
    const request = await assignment;
    expect(request.postDataJSON()).toMatchObject({
      weekOffset: 1,
      dayIndex: 1,
      recipeId: MOCK_IDS.RECIPE_LASAGNA,
    });
    expect(new URL(request.url()).searchParams.get('referenceWeekStartDate')).toBe('2026-05-04');
    await expect(page).toHaveURL(
      /\/planner\?success=1&dayIndex=1&weekOffset=1&referenceWeekStartDate=2026-05-04/
    );
    await expect(page.getByTestId('day-card-1')).toContainText(
      builders.scheduleRecipe({ id: MOCK_IDS.RECIPE_LASAGNA }).name!
    );
  });

  test('Search flow: "Plan for Later" skips past and current day', async ({ page }) => {
    // Set fixed time to Wednesday May 13, 2026
    const wednesday = new Date('2026-05-13T12:00:00Z');
    await page.clock.setFixedTime(wednesday);

    // Search owns Plan for Later; Discovery remains a voting-only journey.
    await page.goto('/recipes');
    await page.getByTestId('recipe-search-input').fill('lasagna');
    await page.getByTestId('recipe-search-input').press('Enter');
    await expect(page.getByTestId('recipe-loader')).not.toBeVisible();
    await page.getByTestId('recipe-card-top-pick').click();
    await page.getByTestId('action-cook-this').click();

    const assignment = page.waitForRequest(
      (request) =>
        request.method() === 'POST' && new URL(request.url()).pathname === '/api/schedule/assign'
    );
    await page.getByTestId('action-plan-later').click();
    const request = await assignment;
    expect(request.postDataJSON()).toMatchObject({
      weekOffset: 0,
      dayIndex: 3,
      recipeId: MOCK_IDS.RECIPE_LASAGNA,
    });
    expect(new URL(request.url()).searchParams.get('referenceWeekStartDate')).toBe('2026-05-11');

    // Today is Wed (index 2), Tomorrow is Thu (index 3).
    // It should skip index 0 (Mon), 1 (Tue), 2 (Wed).
    await expect(page).toHaveURL(/\/planner\?success=1/);
    await expect(page).toHaveURL(/dayIndex=3/);
    await expect(page).toHaveURL(/weekOffset=0/);
  });
});
