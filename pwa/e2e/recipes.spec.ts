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

const MOCK_DETAIL_RECIPE = builders.recipe({
  id: MOCK_IDS.RECIPE_LASAGNA,
  name: 'Homemade Lasagna',
  description: 'Layered comfort food for the whole family.',
  imageUrl: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3',
  totalTime: '45 min',
  difficulty: 'Medium',
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

  test('tapping a filter pill marks it active and includes the filter in the next search request', async ({
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
    await expect(page.getByTestId('filter-never-tried')).toBeVisible();

    await page.getByTestId('filter-never-tried').click();

    await expect(page.getByTestId('filter-never-tried-active')).toBeVisible();
    await expect.poll(() => (lastSearchBody as any)?.filters).toMatchObject({ neverCooked: true });

    await expect(page.getByTestId('filter-no-results')).toBeVisible();
  });

  test('combining two filter pills sends both filters in the request', async ({ page }) => {
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

    await page.getByTestId('filter-never-tried').click();
    await expect(page.getByTestId('filter-never-tried-active')).toBeVisible();

    await page.getByTestId('filter-quick').click();
    await expect(page.getByTestId('filter-quick-active')).toBeVisible();

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
      totalTime: '20 min',
      difficulty: 'Easy',
      rating: 2,
      isDiscoverable: true,
      notes: null,
      reasons: [{ source: 'name-match', label: 'Name matches your search' }],
      plannerFitNote: null,
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

  // ── Task 12: Agent search E2E ───────────────────────────────────────────────

  test('agent search trigger opens agent input, submit fires mode:agent search and shows top pick', async ({
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
            topPick: MOCK_SEARCH_RESULTS.topPick,
            results: MOCK_SEARCH_RESULTS.secondary,
            appliedFilters: {},
            searchMode: 'agent',
            resultPath: 'lexical-only',
          },
        }),
      });
    });

    await page.goto('/recipes');
    await expect(page.getByTestId('recipe-loader')).not.toBeVisible({ timeout: 15_000 });

    await page.getByTestId('agent-search-trigger').click();
    await expect(page.getByTestId('agent-search-input')).toBeVisible();

    await page
      .getByTestId('agent-search-input')
      .fill('something fresh and quick my kids will like');
    await page.getByTestId('agent-search-submit').click();

    await expect(page.getByTestId('recipe-card-top-pick')).toBeVisible();
    await expect.poll(() => (lastSearchBody as any)?.mode).toBe('agent');

    await expect(page.locator('[data-testid="chat-response"]')).toHaveCount(0);
  });

  test('agent search close hides the agent input and keeps existing results visible', async ({
    page,
  }) => {
    await page.goto('/recipes');
    await expect(page.getByTestId('recipe-loader')).not.toBeVisible({ timeout: 15_000 });

    await page.getByTestId('recipe-search-input').fill('chicken');
    await page.getByTestId('recipe-search-input').press('Enter');
    await expect(page.getByTestId('recipe-card-top-pick')).toBeVisible();

    await page.getByTestId('agent-search-trigger').click();
    await expect(page.getByTestId('agent-search-input')).toBeVisible();

    await page.getByTestId('agent-search-close').click();
    await expect(page.getByTestId('agent-search-input')).not.toBeVisible();
    await expect(page.getByTestId('recipe-card-top-pick')).toBeVisible();
  });

  // ── Task 13: Inventory capture E2E ─────────────────────────────────────────

  test('camera trigger opens popup; submit fires inventory-captures and passes snapshotId to next search', async ({
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
            topPick: MOCK_SEARCH_RESULTS.topPick,
            results: [],
            appliedFilters: {},
            searchMode: 'pantry-assisted',
            resultPath: 'lexical-only',
          },
        }),
      });
    });

    await page.goto('/recipes');
    await expect(page.getByTestId('recipe-loader')).not.toBeVisible({ timeout: 15_000 });

    await page.getByTestId('inventory-camera-trigger').click();
    await expect(page.getByTestId('inventory-capture-popup')).toBeVisible();

    await page.getByTestId('inventory-capture-submit').click();

    await expect(page.getByTestId('recipe-card-top-pick')).toBeVisible();
    await expect
      .poll(() => (lastSearchBody as any)?.pantrySnapshotId)
      .toBe(MOCK_IDS.INVENTORY_CAPTURE);
  });

  test('camera cancel closes popup without making any inventory API call', async ({ page }) => {
    let inventoryCalled = false;
    await page.route('**/api/inventory-captures', async (route) => {
      inventoryCalled = true;
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    await page.goto('/recipes');
    await expect(page.getByTestId('recipe-loader')).not.toBeVisible({ timeout: 15_000 });

    await page.getByTestId('inventory-camera-trigger').click();
    await expect(page.getByTestId('inventory-capture-popup')).toBeVisible();

    await page.getByTestId('inventory-capture-cancel').click();
    await expect(page.getByTestId('inventory-capture-popup')).not.toBeVisible();

    expect(inventoryCalled).toBe(false);
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
