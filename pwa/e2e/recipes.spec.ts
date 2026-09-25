import { test, expect } from './fixtures';
import { MOCK_IDS, builders, setupCommonRoutes } from './mock-api';

const FILTER_MAIN_IDS = {
  BEEF: 'beef',
  POULTRY: 'poultry',
  PORK: 'pork',
  FISH: 'fish',
  PASTA: 'pasta',
  VEGETARIAN: 'vegetarian',
  TACO_NIGHT: 'taco-night',
} as const;

const MOCK_SEARCH_RESULTS = {
  topPick: {
    id: MOCK_IDS.RECIPE_LASAGNA,
    name: 'Homemade Lasagna',
    imageUrl: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3',
    totalTime: 'PT45M',
    rating: 3,
    isDiscoverable: true,
    notes: null,
    reasons: [{ source: 'name-match', label: 'Name matches your search' }],
    isPromotionEligible: true,
  },
  secondary: [
    {
      id: MOCK_IDS.RECIPE_STIR_FRY,
      name: 'Chicken Stir Fry',
      imageUrl: 'https://images.unsplash.com/photo-1559847844-5315695dadae',
      totalTime: 'PT20M',
      rating: 2,
      isDiscoverable: true,
      notes: null,
      reasons: [{ source: 'name-match', label: 'Name matches your search' }],
      isPromotionEligible: true,
    },
    {
      id: MOCK_IDS.RECIPE_TACOS,
      name: 'Beef Tacos',
      imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47',
      totalTime: 'PT25M',
      rating: 2,
      isDiscoverable: true,
      notes: null,
      reasons: [{ source: 'name-match', label: 'Name matches your search' }],
      isPromotionEligible: true,
    },
  ],
};

const MOCK_DETAIL_RECIPE = builders.recipe({
  id: MOCK_IDS.RECIPE_LASAGNA,
  name: 'Homemade Lasagna',
  description: 'Layered comfort food for the whole family.',
  imageUrl: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3',
  totalTime: 'PT45M',
  rating: 3,
  notes: 'Family favorite on rainy nights.',
  ingredients: ['Pasta', 'Tomato', 'Cheese'],
});

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

    await page.route('**/api/recipes/*', async (route) => {
      const method = route.request().method();

      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ recipe: MOCK_DETAIL_RECIPE }),
        });
        return;
      }

      if (method === 'PATCH') {
        const body = route.request().postDataJSON() as Record<string, unknown>;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ recipe: { ...MOCK_DETAIL_RECIPE, ...body } }),
        });
        return;
      }

      await route.fallback();
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
    await expect(page.getByTestId('recipe-card-top-pick')).toContainText(/READY IN 45 MINS/i);

    await expect(page.getByTestId(`recipe-card-${MOCK_IDS.RECIPE_STIR_FRY}`)).toBeVisible();
    await expect(page.getByTestId(`recipe-card-${MOCK_IDS.RECIPE_STIR_FRY}`)).toContainText(
      /READY IN 20 MINS/i
    );
  });

  test('Surprise Me promotes a different server-eligible result from the current search', async ({
    page,
  }) => {
    await page.goto('/recipes');
    await page.getByTestId('recipe-search-input').fill('chicken');
    await page.getByTestId('recipe-search-input').press('Enter');

    const topPick = page.getByTestId('recipe-card-top-pick');
    await expect(topPick).toContainText('Homemade Lasagna');
    const surpriseMe = page.getByRole('button', { name: 'Surprise me — show a different pick' });
    await expect(surpriseMe).toBeEnabled();

    await surpriseMe.click();

    await expect(topPick).not.toContainText('Homemade Lasagna');
    await expect(page.getByTestId(`recipe-card-${MOCK_IDS.RECIPE_LASAGNA}`)).toBeVisible();
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

  test('groups filter discovery choices and applies Main as a semantic preference', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    let lastSearch: Record<string, unknown> | null = null;
    await page.unroute('**/api/recipes/search/filters');
    await page.route('**/api/recipes/search/filters', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          generatedAt: '2026-09-20T00:00:00Z',
          main: [
            { id: FILTER_MAIN_IDS.BEEF, concept: 'beef', label: null },
            { id: FILTER_MAIN_IDS.POULTRY, concept: 'poultry', label: null },
            { id: FILTER_MAIN_IDS.PORK, concept: 'pork', label: null },
            { id: FILTER_MAIN_IDS.FISH, concept: 'fish', label: null },
            { id: FILTER_MAIN_IDS.PASTA, concept: 'pasta', label: null },
            { id: FILTER_MAIN_IDS.VEGETARIAN, concept: 'vegetarian', label: null },
            { id: FILTER_MAIN_IDS.TACO_NIGHT, concept: 'tacos', label: 'Taco night' },
          ],
          mealTypes: ['Supper', 'Lunch', 'Breakfast', 'Dessert'],
          cuisines: { promoted: ['Japanese'], all: ['French', 'Japanese'] },
        }),
      });
    });
    await page.unroute('**/api/recipes/search');
    await page.route('**/api/recipes/search', async (route) => {
      lastSearch = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            topPick: null,
            results: [],
            appliedFilters: {},
            searchMode: 'standard',
            resultPath: 'lexical-only',
          },
        }),
      });
    });

    await page.goto('/recipes');
    await page.getByTestId('mobile-filters-button').click();
    await expect(page.getByTestId('mobile-filter-quick')).toBeVisible();
    await expect(page.getByTestId('mobile-filter-reported')).not.toBeVisible();
    await page.getByTestId('mobile-more-filters').click();
    await expect(page.getByTestId('mobile-filter-reported')).toBeVisible();
    await page.getByTestId('mobile-all-main-filters').click();
    await expect(page.getByTestId('mobile-filter-main-taco-night')).toBeVisible();
    await page.getByTestId('mobile-all-cuisines').click();
    await page.getByTestId('mobile-filter-main-taco-night').click();
    await page.getByTestId('mobile-filter-meal-Supper').click();
    await page.getByTestId('mobile-filter-cuisine-French').click();
    await page.getByTestId('mobile-filter-apply').click();

    await expect
      .poll(() => lastSearch)
      .toMatchObject({
        filters: { mealTypes: ['Supper'], cuisines: ['French'] },
        preferences: { concepts: ['tacos'] },
      });
  });

  test('opens and closes the recipe detail sheet without losing the search results', async ({
    page,
  }) => {
    await page.goto('/recipes');

    await expect(page.getByTestId('recipe-loader')).not.toBeVisible({ timeout: 15_000 });
    await page.getByTestId('recipe-search-input').fill('chicken');
    await page.getByTestId('recipe-search-input').press('Enter');

    await page.getByTestId('recipe-card-top-pick').click();

    await expect(page.getByTestId('recipe-detail-sheet')).toBeVisible();
    await expect(page.getByTestId('recipe-detail-name')).toContainText(/Homemade Lasagna/i);
    await expect(page.getByTestId('recipe-detail-sheet')).toContainText(/READY IN 45 MINS/i);

    // Verify the new COOK entry point is visible
    await expect(page.getByTestId('time-cook-btn')).toBeVisible();
    await expect(page.getByTestId('time-cook-btn')).toContainText(/STEPS/i);

    await page.getByTestId('action-close-sheet').click();

    await expect(page.getByTestId('recipe-detail-sheet')).not.toBeVisible();
    await expect(page.getByTestId('recipe-card-top-pick')).toBeVisible();
  });

  test('edits notes from the detail sheet and keeps the sheet open', async ({ page }) => {
    let lastPatchBody: Record<string, unknown> | null = null;

    await page.unroute('**/api/recipes/*');
    await page.route('**/api/recipes/*', async (route) => {
      const method = route.request().method();

      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ recipe: MOCK_DETAIL_RECIPE }),
        });
        return;
      }

      if (method === 'PATCH') {
        lastPatchBody = route.request().postDataJSON() as Record<string, unknown>;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ recipe: { ...MOCK_DETAIL_RECIPE, ...lastPatchBody } }),
        });
        return;
      }

      await route.fallback();
    });

    await page.goto('/recipes');

    await expect(page.getByTestId('recipe-loader')).not.toBeVisible({ timeout: 15_000 });
    await page.getByTestId('recipe-search-input').fill('chicken');
    await page.getByTestId('recipe-search-input').press('Enter');
    await page.getByTestId('recipe-card-top-pick').click();

    await expect(page.getByTestId('recipe-notes-input')).toBeVisible();
    await page.getByTestId('recipe-notes-input').fill('kids loved it');

    await expect.poll(() => lastPatchBody).toMatchObject({ notes: 'kids loved it' });
    await expect(page.getByTestId('recipe-detail-sheet')).toBeVisible();
  });

  test('edits recipe card fields from a single edit mode', async ({ page }) => {
    let lastPatchBody: Record<string, unknown> | null = null;

    await page.unroute('**/api/recipes/*');
    await page.route('**/api/recipes/*', async (route) => {
      const method = route.request().method();

      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ recipe: MOCK_DETAIL_RECIPE }),
        });
        return;
      }

      if (method === 'PATCH') {
        lastPatchBody = route.request().postDataJSON() as Record<string, unknown>;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ recipe: { ...MOCK_DETAIL_RECIPE, ...lastPatchBody } }),
        });
        return;
      }

      await route.fallback();
    });

    await page.goto('/recipes');

    await expect(page.getByTestId('recipe-loader')).not.toBeVisible({ timeout: 15_000 });
    await page.getByTestId('recipe-search-input').fill('chicken');
    await page.getByTestId('recipe-search-input').press('Enter');
    await page.getByTestId('recipe-card-top-pick').click();

    await page.getByTestId('action-gear-menu').click();
    await page.getByTestId('action-edit-recipe').click();
    await page.getByTestId('recipe-edit-name-input').fill('Rainy Night Lasagna');
    await page
      .getByTestId('recipe-edit-description-input')
      .fill('Layered comfort food with extra sauce.');
    await page.getByTestId('recipe-edit-ingredient-1').fill('San Marzano tomato');
    await page.getByTestId('recipe-save-edits').click();

    await expect
      .poll(() => lastPatchBody)
      .toMatchObject({
        name: 'Rainy Night Lasagna',
        description: 'Layered comfort food with extra sauce.',
        ingredients: ['Pasta', 'San Marzano tomato', 'Cheese'],
      });
    await expect(page.getByTestId('recipe-detail-name')).toContainText('Rainy Night Lasagna');
    await expect(page.getByText('San Marzano tomato')).toBeVisible();
  });

  test('uses planner mode CTA from the detail sheet and returns to the planner success state', async ({
    page,
  }) => {
    let assignRequestBody: Record<string, unknown> | null = null;

    await page.route('**/api/schedule/assign', async (route) => {
      assignRequestBody = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto('/recipes?addToDay=2&weekOffset=0');

    await expect(page.getByTestId('recipe-loader')).not.toBeVisible({ timeout: 15_000 });
    await page.getByTestId('recipe-search-input').fill('chicken');
    await page.getByTestId('recipe-search-input').press('Enter');
    await page.getByTestId('recipe-card-top-pick').click();

    await expect(page.getByTestId('action-add-to-day')).toBeVisible();
    await page.getByTestId('action-add-to-day').click();

    await expect
      .poll(() => assignRequestBody)
      .toMatchObject({
        weekOffset: 0,
        dayIndex: 2,
        recipeId: MOCK_IDS.RECIPE_LASAGNA,
      });
    await expect(page).toHaveURL(/\/planner\?success=1&dayIndex=2/);
  });

  test('applying a filter from the chooser includes it in the next search request', async ({
    page,
  }) => {
    let lastSearchBody: Record<string, unknown> | null = null;

    await page.unroute('**/api/recipes/search');
    await page.route('**/api/recipes/search', async (route) => {
      lastSearchBody = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            topPick: null,
            results: [],
            appliedFilters: { neverCooked: true },
            searchMode: 'standard',
            resultPath: 'lexical-only',
          },
        }),
      });
    });

    await page.goto('/recipes');
    await expect(page.getByTestId('recipe-loader')).not.toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('mobile-filters-button')).toBeVisible();
    await page.getByTestId('mobile-filters-button').click();
    await page.getByTestId('mobile-filter-never-tried').click();
    await page.getByTestId('mobile-filter-apply').click();
    await expect.poll(() => (lastSearchBody as any)?.filters).toMatchObject({ neverCooked: true });

    await expect(page.getByTestId('filter-no-results')).toBeVisible();
  });

  test('combining two chooser filters sends both filters in the request', async ({ page }) => {
    let lastSearchBody: Record<string, unknown> | null = null;

    await page.unroute('**/api/recipes/search');
    await page.route('**/api/recipes/search', async (route) => {
      lastSearchBody = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            topPick: null,
            results: [],
            appliedFilters: {},
            searchMode: 'standard',
            resultPath: 'lexical-only',
          },
        }),
      });
    });

    await page.goto('/recipes');
    await expect(page.getByTestId('recipe-loader')).not.toBeVisible({ timeout: 15_000 });

    await page.getByTestId('mobile-filters-button').click();
    await page.getByTestId('mobile-filter-never-tried').click();
    await page.getByTestId('mobile-filter-quick').click();
    await page.getByTestId('mobile-filter-apply').click();

    await expect
      .poll(() => (lastSearchBody as any)?.filters)
      .toMatchObject({ neverCooked: true, quickOnly: true });
  });

  test('Find Similar fires a new search with similarToRecipeId set and the source recipe excluded', async ({
    page,
  }) => {
    let lastSearchBody: Record<string, unknown> | null = null;

    const SIMILAR_TOP_PICK = {
      id: MOCK_IDS.RECIPE_STIR_FRY,
      name: 'Chicken Stir Fry',
      imageUrl: 'https://images.unsplash.com/photo-1559847844-5315695dadae',
      totalTime: 'PT20M',
      rating: 2,
      isDiscoverable: true,
      notes: null,
      reasons: [{ source: 'name-match', label: 'Name matches your search' }],
    };

    await page.unroute('**/api/recipes/search');
    await page.route('**/api/recipes/search', async (route) => {
      lastSearchBody = route.request().postDataJSON() as Record<string, unknown>;
      const similarId = (lastSearchBody as any)?.similarToRecipeId;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            topPick: similarId ? SIMILAR_TOP_PICK : MOCK_SEARCH_RESULTS.topPick,
            results: similarId ? [] : MOCK_SEARCH_RESULTS.secondary,
            appliedFilters: {},
            searchMode: similarId ? 'similar' : 'standard',
            resultPath: 'lexical-only',
          },
        }),
      });
    });

    await page.goto('/recipes');
    await expect(page.getByTestId('recipe-loader')).not.toBeVisible({ timeout: 15_000 });
    await page.getByTestId('recipe-search-input').fill('chicken');
    await page.getByTestId('recipe-search-input').press('Enter');

    await expect(page.getByTestId('recipe-card-top-pick')).toBeVisible();
    await page.getByTestId('recipe-card-top-pick').click();

    await expect(page.getByTestId('action-find-similar')).toBeVisible();
    await page.getByTestId('action-find-similar').click();

    await expect
      .poll(() => lastSearchBody)
      .toMatchObject({ similarToRecipeId: MOCK_IDS.RECIPE_LASAGNA });

    await expect(page.getByTestId('recipe-card-top-pick')).toBeVisible();
    await expect(page.getByTestId('recipe-card-top-pick')).toContainText(/Chicken Stir Fry/i);
    await expect(
      page.locator(`[data-testid="recipe-card-${MOCK_IDS.RECIPE_LASAGNA}"]`)
    ).not.toBeVisible();
  });

  // ── Discovery toggle ───────────────────────────────────────────────────────

  test('toggling discovery from the detail sheet calls PATCH with isDiscoverable without navigating', async ({
    page,
  }) => {
    let lastPatchBody: Record<string, unknown> | null = null;

    await page.unroute('**/api/recipes/*');
    await page.route('**/api/recipes/*', async (route) => {
      const method = route.request().method();

      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ recipe: MOCK_DETAIL_RECIPE }),
        });
        return;
      }

      if (method === 'PATCH') {
        lastPatchBody = route.request().postDataJSON() as Record<string, unknown>;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ recipe: { ...MOCK_DETAIL_RECIPE, ...lastPatchBody } }),
        });
        return;
      }

      await route.fallback();
    });

    await page.goto('/recipes');
    await expect(page.getByTestId('recipe-loader')).not.toBeVisible({ timeout: 15_000 });
    await page.getByTestId('recipe-search-input').fill('chicken');
    await page.getByTestId('recipe-search-input').press('Enter');
    await page.getByTestId('recipe-card-top-pick').click();

    await expect(page.getByTestId('action-toggle-discovery')).toBeVisible();
    await page.getByTestId('action-toggle-discovery').click();

    await expect.poll(() => lastPatchBody).toMatchObject({ isDiscoverable: expect.any(Boolean) });
    await expect(page.getByTestId('recipe-detail-sheet')).toBeVisible();
    await expect(page).toHaveURL(/\/recipes/);
  });
});
