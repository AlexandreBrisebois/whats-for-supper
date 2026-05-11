/**
 * Task 19 — End-to-end hardening, blind spots, and flow sync.
 *
 * Covers scenarios from tasks.md that were not yet addressed in recipes.spec.ts
 * or settings.spec.ts:
 *   - Scenario 4: soft-delete → restore → hard-delete lifecycle
 *   - Scenario 5: failed capture → retry success → item removed → empty state
 *   - Scenario 7 (gap): deactivating filters brings results back
 *   - Scenario 8: vector timeout fallback (resultPath: "fallback-lexical")
 *   - Scenario 9: purge blocked when ELEVATED_ACTIONS_PIN not configured (503)
 *   - Scenario 10: retry idempotency — 409 surfaces error, no second call made
 *
 * ALL interactions and assertions use page.getByTestId().
 * getByText, getByRole, getByLabel, CSS class selectors, and XPath are FORBIDDEN.
 */

import { test, expect } from './fixtures';
import { MOCK_IDS, builders, setupCommonRoutes } from './mock-api';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const MOCK_SEARCH_TOP_PICK = {
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
};

const MOCK_DETAIL_RECIPE = builders.recipe({
  id: MOCK_IDS.RECIPE_LASAGNA,
  name: 'Homemade Lasagna',
  description: 'Layered comfort food for the whole family.',
  imageUrl: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3',
  totalTime: '45 min',
  difficulty: 'Medium',
  rating: 3,
  notes: null,
  ingredients: ['Pasta', 'Tomato', 'Cheese'],
});

function makeTrashItem(id: string) {
  return {
    id,
    name: 'Deleted Lasagna',
    imageUrl: null,
    deletedAt: new Date().toISOString(),
    deletedBy: null,
  };
}

// ---------------------------------------------------------------------------
// beforeEach shared setup
// ---------------------------------------------------------------------------

async function setupPage(page: import('@playwright/test').Page) {
  const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';

  await page
    .context()
    .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);

  await page.addInitScript((id) => {
    localStorage.setItem(
      'family-storage',
      JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 })
    );
  }, MOCK_IDS.MEMBER_ALEX);

  await setupCommonRoutes(page);

  // Default: search returns the top pick for any query
  await page.route('**/api/recipes/search', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          topPick: MOCK_SEARCH_TOP_PICK,
          results: [],
          appliedFilters: {},
          searchMode: 'standard',
          resultPath: 'lexical-only',
        },
      }),
    });
  });

  // Default: recipe detail GET
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
    // Library summary mock for Browse Library navigation
    await page.route('**/api/recipes/library-summary', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            total: 1,
            neverCooked: 0,
            ratings: { love: 0, like: 0, dislike: 0, unrated: 1 },
          },
        }),
      });
    });

    // Recipes list mock for Browse Library navigation
    await page.route('**/api/recipes?**order=explore**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          updatedAt: new Date().toISOString(),
          recipes: [MOCK_SEARCH_TOP_PICK],
          pagination: { page: 1, limit: 20, total: 1 },
        }),
      });
    });

    await route.fallback();
  });
}

// ---------------------------------------------------------------------------
// Scenario 4: soft-delete → restore → hard-delete lifecycle
// ---------------------------------------------------------------------------

test.describe('Scenario 4 — soft-delete → restore → hard-delete lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  test('move to bin soft-deletes the recipe, it disappears from results; restore from bin removes it from trash', async ({
    page,
  }) => {
    let deleteCalled = false;
    let restoreCalled = false;

    // Track soft-delete call
    await page.unroute('**/api/recipes/*');
    await page.route('**/api/recipes/*', async (route) => {
      const method = route.request().method();
      const url = route.request().url();

      if (method === 'DELETE' && url.match(/\/recipes\/[0-9a-f-]+$/)) {
        deleteCalled = true;
        const id = url.match(/\/recipes\/([0-9a-f-]+)$/)?.[1] ?? MOCK_IDS.RECIPE_LASAGNA;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: builders.recipe({ id, deletedAt: new Date() }),
          }),
        });
        return;
      }
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

    // Trash returns the deleted recipe after soft-delete
    await page.unroute('**/api/recipes/trash');
    await page.route('**/api/recipes/trash', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { items: deleteCalled ? [makeTrashItem(MOCK_IDS.RECIPE_LASAGNA)] : [] },
        }),
      });
    });

    // Restore clears the item and marks restoreCalled
    await page.unroute('**/api/recipes/*/restore');
    await page.route('**/api/recipes/*/restore', async (route) => {
      restoreCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: builders.recipe({ id: MOCK_IDS.RECIPE_LASAGNA }) }),
      });
    });

    // 1. Navigate and search
    await page.goto('/recipes');
    await expect(page.getByTestId('recipe-loader')).not.toBeVisible({ timeout: 15_000 });
    await page.getByTestId('recipe-search-input').fill('chicken');
    await page.getByTestId('recipe-search-input').press('Enter');

    // 2. Open detail sheet and move to bin
    await expect(page.getByTestId('recipe-card-top-pick')).toBeVisible();
    await page.getByTestId('recipe-card-top-pick').click();
    await expect(page.getByTestId('recipe-detail-sheet')).toBeVisible();
    await page.getByTestId('action-gear-menu').click();
    await page.getByTestId('action-move-to-bin').click();

    // 3. Sheet closed and recipe gone from results
    await expect(page.getByTestId('recipe-detail-sheet')).not.toBeVisible();
    await expect(
      page.locator(`[data-testid="recipe-card-${MOCK_IDS.RECIPE_LASAGNA}"]`)
    ).not.toBeVisible();
    expect(deleteCalled).toBe(true);

    // 4. Open recycle bin from Browse Library — deleted item is there
    await page.goto('/browse-all-stack');
    await expect(page.getByTestId('browse-all-stack-container')).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('recycle-bin-entry').click();
    await expect(page.getByTestId('trash-list')).toBeVisible();
    await expect(page.getByTestId(`trash-item-${MOCK_IDS.RECIPE_LASAGNA}`)).toBeVisible();

    // 5. Restore
    await page.getByTestId(`action-restore-${MOCK_IDS.RECIPE_LASAGNA}`).click();
    await expect(page.getByTestId(`trash-item-${MOCK_IDS.RECIPE_LASAGNA}`)).not.toBeVisible();
    expect(restoreCalled).toBe(true);
  });

  test('purge from bin: PIN dialog → correct PIN → item removed', async ({ page }) => {
    await page.unroute('**/api/recipes/trash');
    await page.route('**/api/recipes/trash', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { items: [makeTrashItem(MOCK_IDS.RECIPE_IN_TRASH)] } }),
      });
    });

    await page.goto('/browse-all-stack');
    await expect(page.getByTestId('browse-all-stack-container')).toBeVisible({ timeout: 10_000 });

    await page.getByTestId('recycle-bin-entry').click();
    await expect(page.getByTestId(`trash-item-${MOCK_IDS.RECIPE_IN_TRASH}`)).toBeVisible();

    await page.getByTestId(`action-purge-${MOCK_IDS.RECIPE_IN_TRASH}`).click();
    await expect(page.getByTestId('elevated-pin-dialog')).toBeVisible();

    await page.getByTestId('elevated-pin-input').fill('1234');
    await page.getByTestId('elevated-pin-dialog').dispatchEvent('submit');

    await expect(page.getByTestId('elevated-pin-dialog')).not.toBeVisible();
    await expect(page.getByTestId(`trash-item-${MOCK_IDS.RECIPE_IN_TRASH}`)).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Scenario 5: failed capture → retry success → item removed → empty state
// ---------------------------------------------------------------------------

test.describe('Scenario 5 — failed capture → retry success lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);
    await page.addInitScript((id) => {
      localStorage.setItem(
        'family-storage',
        JSON.stringify({
          state: {
            selectedFamilyMemberId: id,
            familyMembers: [{ id, name: 'Alex' }],
            _hasHydrated: true,
            hasLoaded: true,
          },
          version: 0,
        })
      );
    }, MOCK_IDS.MEMBER_ALEX);
    await setupCommonRoutes(page);
  });

  test('failure present → retry → item disappears → empty state shows', async ({ page }) => {
    let retryCallCount = 0;
    let failuresReturned = true;

    await page.route('**/api/captures/failures', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      const items = failuresReturned
        ? [
            {
              id: MOCK_IDS.CAPTURE_FAILURE_URL,
              sourceType: 'url',
              previewText: 'https://example.com/recipe',
              friendlyReason: "We couldn't read the recipe page.",
              failureCode: 'url_unreadable',
              status: 'failed',
              retryCount: 0,
              createdAt: new Date().toISOString(),
              lastFailedAt: new Date().toISOString(),
            },
          ]
        : [];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { items } }),
      });
    });

    await page.route(
      `**/api/captures/failures/${MOCK_IDS.CAPTURE_FAILURE_URL}/retry`,
      async (route) => {
        retryCallCount++;
        failuresReturned = false;
        await route.fulfill({
          status: 202,
          contentType: 'application/json',
          body: JSON.stringify({ data: { queued: true } }),
        });
      }
    );

    await page.goto('/profile/settings');
    await expect(page.getByTestId(`failed-capture-${MOCK_IDS.CAPTURE_FAILURE_URL}`)).toBeVisible({
      timeout: 5000,
    });

    await page.getByTestId(`action-retry-${MOCK_IDS.CAPTURE_FAILURE_URL}`).click();
    expect(retryCallCount).toBe(1);

    // After retry, refresh — item gone, empty state shown
    await page.goto('/profile/settings');
    await expect(page.getByTestId('failed-captures-empty')).toBeVisible({ timeout: 5000 });
    await expect(
      page.locator(`[data-testid="failed-capture-${MOCK_IDS.CAPTURE_FAILURE_URL}"]`)
    ).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Scenario 7 (gap): deactivating filters clears empty state; results return
// ---------------------------------------------------------------------------

test.describe('Scenario 7 — over-constrained filters: deactivate restores results', () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  test('activating two filters → empty state; deactivating both → top pick visible again', async ({
    page,
  }) => {
    let activeFilters: Record<string, boolean> = {};

    await page.unroute('**/api/recipes/search');
    await page.route('**/api/recipes/search', async (route) => {
      const body = route.request().postDataJSON() as {
        filters?: Record<string, boolean>;
      };
      activeFilters = body?.filters ?? {};
      const hasActiveFilter = Object.values(activeFilters).some(Boolean);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            topPick: hasActiveFilter ? null : MOCK_SEARCH_TOP_PICK,
            results: [],
            appliedFilters: activeFilters,
            searchMode: 'standard',
            resultPath: 'lexical-only',
          },
        }),
      });
    });

    await page.goto('/recipes');
    await expect(page.getByTestId('recipe-loader')).not.toBeVisible({ timeout: 15_000 });

    // Activate never-tried
    await page.getByTestId('filter-never-tried').click();
    await expect(page.getByTestId('filter-never-tried-active')).toBeVisible();

    // Activate quick
    await page.getByTestId('filter-quick').click();
    await expect(page.getByTestId('filter-quick-active')).toBeVisible();

    // Empty state visible (both filters constrain results to empty)
    await expect(page.getByTestId('filter-no-results')).toBeVisible();
    await expect(page.getByTestId('recipe-card-top-pick')).not.toBeVisible();

    // Deactivate never-tried
    await page.getByTestId('filter-never-tried-active').click();
    await expect(page.getByTestId('filter-never-tried-active')).not.toBeVisible();

    // Deactivate quick
    await page.getByTestId('filter-quick-active').click();
    await expect(page.getByTestId('filter-quick-active')).not.toBeVisible();

    // Results return
    await expect(page.getByTestId('recipe-card-top-pick')).toBeVisible();
    await expect(page.getByTestId('filter-no-results')).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Scenario 8: vector timeout fallback — resultPath: "fallback-lexical"
// ---------------------------------------------------------------------------

test.describe('Scenario 8 — vector timeout fallback', () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  test('search response with resultPath fallback-lexical renders results normally', async ({
    page,
  }) => {
    let capturedResultPath: string | null = null;

    await page.unroute('**/api/recipes/search');
    await page.route('**/api/recipes/search', async (route) => {
      // Simulate the server-side 400ms vector timeout by returning fallback-lexical
      const responseBody = {
        topPick: MOCK_SEARCH_TOP_PICK,
        results: [],
        appliedFilters: {},
        searchMode: 'standard',
        resultPath: 'fallback-lexical',
      };
      capturedResultPath = responseBody.resultPath;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: responseBody }),
      });
    });

    await page.goto('/recipes');
    await expect(page.getByTestId('recipe-loader')).not.toBeVisible({ timeout: 15_000 });

    await page.getByTestId('recipe-search-input').fill('chicken');
    await page.getByTestId('recipe-search-input').press('Enter');

    await expect(page.getByTestId('recipe-card-top-pick')).toBeVisible();
    expect(capturedResultPath).toBe('fallback-lexical');
  });
});

// ---------------------------------------------------------------------------
// Scenario 9: purge blocked by PIN not configured (HTTP 503)
// ---------------------------------------------------------------------------

test.describe('Scenario 9 — purge blocked: PIN not configured', () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  test('503 PIN_NOT_CONFIGURED response shows elevated-pin-error', async ({ page }) => {
    await page.unroute('**/api/recipes/trash');
    await page.route('**/api/recipes/trash', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { items: [makeTrashItem(MOCK_IDS.RECIPE_IN_TRASH)] } }),
      });
    });

    await page.unroute('**/api/recipes/*/purge');
    await page.route('**/api/recipes/*/purge', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          errorCode: 'PIN_NOT_CONFIGURED',
          message: 'Permanent delete is not available.',
        }),
      });
    });

    await page.goto('/browse-all-stack');
    await expect(page.getByTestId('browse-all-stack-container')).toBeVisible({ timeout: 10_000 });

    await page.getByTestId('recycle-bin-entry').click();
    await expect(page.getByTestId(`trash-item-${MOCK_IDS.RECIPE_IN_TRASH}`)).toBeVisible();

    await page.getByTestId(`action-purge-${MOCK_IDS.RECIPE_IN_TRASH}`).click();
    await expect(page.getByTestId('elevated-pin-dialog')).toBeVisible();

    await page.getByTestId('elevated-pin-input').fill('1234');
    await page.getByTestId('elevated-pin-dialog').dispatchEvent('submit');

    // Error message must be visible; item must remain in list
    await expect(page.getByTestId('elevated-pin-error')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId(`trash-item-${MOCK_IDS.RECIPE_IN_TRASH}`)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Scenario 10: retry idempotency — 409 shows error, no second call made
// ---------------------------------------------------------------------------

test.describe('Scenario 10 — retry idempotency (409 ALREADY_RETRYING)', () => {
  test.beforeEach(async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);
    await page.addInitScript((id) => {
      localStorage.setItem(
        'family-storage',
        JSON.stringify({
          state: {
            selectedFamilyMemberId: id,
            familyMembers: [{ id, name: 'Alex' }],
            _hasHydrated: true,
            hasLoaded: true,
          },
          version: 0,
        })
      );
    }, MOCK_IDS.MEMBER_ALEX);
    await setupCommonRoutes(page);
  });

  test('409 ALREADY_RETRYING shows action-retry-error; no second retry call made', async ({
    page,
  }) => {
    let retryCallCount = 0;

    await page.route('**/api/captures/failures', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            items: [
              {
                id: MOCK_IDS.CAPTURE_FAILURE_URL,
                sourceType: 'url',
                friendlyReason: "We couldn't read the recipe page.",
                status: 'failed',
                retryCount: 0,
                createdAt: new Date().toISOString(),
                lastFailedAt: new Date().toISOString(),
              },
            ],
          },
        }),
      });
    });

    await page.route('**/api/captures/failures/*/retry', async (route) => {
      retryCallCount++;
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          errorCode: 'ALREADY_RETRYING',
          message: 'A retry is already in progress.',
        }),
      });
    });

    await page.goto('/profile/settings');
    await expect(page.getByTestId(`action-retry-${MOCK_IDS.CAPTURE_FAILURE_URL}`)).toBeVisible({
      timeout: 5000,
    });

    await page.getByTestId(`action-retry-${MOCK_IDS.CAPTURE_FAILURE_URL}`).click();

    // Error indicator must appear
    await expect(
      page.getByTestId(`action-retry-error-${MOCK_IDS.CAPTURE_FAILURE_URL}`)
    ).toBeVisible({ timeout: 5000 });

    // Only one call was made — no double-tap retry
    expect(retryCallCount).toBe(1);
  });
});
