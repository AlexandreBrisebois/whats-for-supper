import { test, expect } from './fixtures';
import { MOCK_IDS, builders, setupCommonRoutes } from './mock-api';

const MOCK_SEARCH_RESULTS = {
  topPick: {
    id: MOCK_IDS.RECIPE_LASAGNA,
    name: 'Homemade Lasagna',
    imageUrl: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3',
    totalTime: '45 min',
    difficulty: 'Medium',
    rating: 3,
    isDiscoverable: true,
    notes: null,
    reasons: [{ source: 'name-match', label: 'Name matches your search' }],
    plannerFitNote: null,
  },
  secondary: [
    {
      id: MOCK_IDS.RECIPE_STIR_FRY,
      name: 'Chicken Stir Fry',
      imageUrl: 'https://images.unsplash.com/photo-1559847844-5315695dadae',
      totalTime: '20 min',
      difficulty: 'Easy',
      rating: 2,
      isDiscoverable: true,
      notes: null,
      reasons: [{ source: 'name-match', label: 'Name matches your search' }],
      plannerFitNote: null,
    },
    {
      id: MOCK_IDS.RECIPE_TACOS,
      name: 'Beef Tacos',
      imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47',
      totalTime: '25 min',
      difficulty: 'Easy',
      rating: 2,
      isDiscoverable: true,
      notes: null,
      reasons: [{ source: 'name-match', label: 'Name matches your search' }],
      plannerFitNote: null,
    },
  ],
};

test.describe('Recipes Search Page', () => {
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

    await page.route('**/api/recipes/search', async (route) => {
      const body = route.request().postDataJSON() as { query?: string };
      const query = body?.query ?? '';

      const response =
        query === 'chicken'
          ? {
              topPick: MOCK_SEARCH_RESULTS.topPick,
              results: MOCK_SEARCH_RESULTS.secondary,
              appliedFilters: {},
              searchMode: 'standard',
              resultPath: 'lexical-only',
            }
          : {
              topPick: null,
              results: [],
              appliedFilters: {},
              searchMode: 'standard',
              resultPath: 'lexical-only',
            };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: response }),
      });
    });

    await page.route('**/api/recipes', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            builders.recipe({ id: MOCK_IDS.RECIPE_LASAGNA, name: 'Homemade Lasagna' }),
            builders.recipe({ id: MOCK_IDS.RECIPE_STIR_FRY, name: 'Chicken Stir Fry' }),
            builders.recipe({ id: MOCK_IDS.RECIPE_TACOS, name: 'Beef Tacos' }),
          ],
          total: 3,
        }),
      });
    });
  });

  test('searches on Enter and shows the top pick result', async ({ page }) => {
    await page.goto('/recipes');

    await expect(page.getByTestId('recipe-loader')).not.toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('recipe-search-input')).toBeVisible();

    await page.getByTestId('recipe-search-input').fill('chicken');
    await page.getByTestId('recipe-search-input').press('Enter');

    await expect(page.getByTestId('recipe-card-top-pick')).toBeVisible();
    await expect(page.getByTestId('recipe-card-top-pick')).toContainText(/Homemade Lasagna/i);

    await expect(page.getByTestId(`recipe-card-${MOCK_IDS.RECIPE_STIR_FRY}`)).toBeVisible();
  });

  test('planning mode can be cancelled back to the planner', async ({ page }) => {
    await page.goto('/recipes?addToDay=2&weekOffset=0');

    await expect(page.getByTestId('planning-mode-banner')).toBeVisible();
    await page.getByTestId('planning-mode-cancel').click();

    await expect(page).toHaveURL(/\/planner/);
  });

  test('shows the empty state when search returns no matches', async ({ page }) => {
    await page.goto('/recipes');

    await expect(page.getByTestId('recipe-loader')).not.toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('search-empty-state')).toBeVisible();
  });
});
