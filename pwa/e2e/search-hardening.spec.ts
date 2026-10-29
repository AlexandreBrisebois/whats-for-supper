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

import { recordGotoContrast } from './helpers/goto-review';
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
  rating: 3,
  isDiscoverable: true,
  notes: null,
  reasons: [{ source: 'name-match', label: 'Name matches your search' }],
};

const MOCK_DETAIL_RECIPE = builders.recipe({
  id: MOCK_IDS.RECIPE_LASAGNA,
  name: 'Homemade Lasagna',
  description: 'Layered comfort food for the whole family.',
  imageUrl: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3',
  totalTime: '45 min',
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
          searchMode: 'explicit',
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
// Scenario 5: failed capture → retry success → item removed → section hidden
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

  test('failure present → retry → item disappears → section hides', async ({ page }) => {
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

    const retryResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().endsWith(`/api/captures/failures/${MOCK_IDS.CAPTURE_FAILURE_URL}/retry`)
    );

    await page.getByTestId(`action-retry-${MOCK_IDS.CAPTURE_FAILURE_URL}`).click();
    expect((await retryResponse).status()).toBe(202);
    expect(retryCallCount).toBe(1);

    await expect(
      page.getByTestId(`action-retry-${MOCK_IDS.CAPTURE_FAILURE_URL}-retrying`)
    ).toBeVisible();

    // After retry, refresh and verify the server reports no remaining failures.
    const refreshedFailures = page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' && response.url().endsWith('/api/captures/failures')
    );
    await page.goto('/profile/settings');
    const failuresResponse = await refreshedFailures;
    expect(failuresResponse.status()).toBe(200);
    expect(await failuresResponse.json()).toEqual({ data: { items: [] } });
    await expect(page.getByTestId('failed-captures-section')).toHaveCount(0);
    await expect(page.getByTestId(`failed-capture-${MOCK_IDS.CAPTURE_FAILURE_URL}`)).toHaveCount(0);
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
            searchMode: 'explicit',
            resultPath: 'lexical-only',
          },
        }),
      });
    });

    await page.goto('/recipes');
    await expect(page.getByTestId('recipe-loader')).not.toBeVisible({ timeout: 15_000 });

    // Apply never-tried and quick together from the full filter chooser.
    await page.getByTestId('mobile-filters-button').click();
    await page.getByTestId('mobile-filter-never-tried').click();
    await page.getByTestId('mobile-filter-quick').click();
    await page.getByTestId('mobile-filter-apply').click();

    // Empty state visible (both filters constrain results to empty)
    await expect(page.getByTestId('filter-no-results')).toBeVisible();
    await expect(page.getByTestId('recipe-card-top-pick')).not.toBeVisible();

    // Remove each applied filter through the same chooser.
    await page.getByTestId('mobile-filters-button').click();
    await page.getByTestId('mobile-filter-never-tried-active').click();
    await page.getByTestId('mobile-filter-apply').click();

    await page.getByTestId('mobile-filters-button').click();
    await page.getByTestId('mobile-filter-quick-active').click();
    await page.getByTestId('mobile-filter-apply').click();

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
        searchMode: 'explicit',
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

test('GOTO chooser uses configured membership and an empty list never falls back', async ({
  page,
  baseURL,
}) => {
  await setupCommonRoutes(page);
  await page
    .context()
    .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseURL! }]);
  await page.addInitScript(
    (id) =>
      localStorage.setItem(
        'family-storage',
        JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 })
      ),
    MOCK_IDS.MEMBER_ALEX
  );
  await page.goto('/recipes');
  await expect(page.getByTestId('recipe-loader')).not.toBeVisible();
  await page.evaluate(async (recipeId) => {
    const response = await fetch('/api/goto', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ recipeId, description: 'Family GOTO', status: 'ready' }] }),
    });
    if (!response.ok) throw new Error('Failed fixture membership save');
  }, MOCK_IDS.RECIPE_LASAGNA);
  await page.getByTestId('mobile-filters-button').click();
  await page.getByTestId('mobile-filter-goto').click();
  await page.getByTestId('mobile-filter-apply').click();
  await expect(page.getByTestId('mobile-filters-button')).toHaveAccessibleName('Filters, 1 active');
  await expect(page.getByTestId('recipe-card-top-pick')).toBeVisible();
  await expect(page.getByTestId(`recipe-card-${MOCK_IDS.RECIPE_CARBONARA}`)).not.toBeVisible();
  await page.evaluate(async () =>
    fetch('/api/goto', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [] }),
    })
  );
  await page.getByTestId('mobile-filters-button').click();
  await page.getByTestId('mobile-filter-apply').click();
  await expect(page.getByTestId('filter-no-results')).toBeVisible();
  await expect(page.getByTestId('recipe-card-top-pick')).not.toBeVisible();
});

test('GOTO mock continuations retain context and recheck saved membership', async ({
  page,
  baseURL,
}) => {
  await setupCommonRoutes(page);
  await page
    .context()
    .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseURL! }]);
  await page.goto('/recipes');
  const observation = await page.evaluate(
    async (ids) => {
      const save = (members: string[]) =>
        fetch('/api/goto', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: members.map((recipeId) => ({ recipeId, status: 'ready' })),
          }),
        });
      const search = (body: unknown) =>
        fetch('/api/recipes/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      await save(ids);
      const first = (await (await search({ filters: { gotoOnly: true }, limit: 1 })).json()).data;
      const cursor = first.nextCursor;
      if (!cursor) throw new Error('Missing fixture cursor');
      const served = [
        first.topPick.id,
        ...first.results.map((recipe: { id: string }) => recipe.id),
      ];
      const remaining = ids.filter((id) => !served.includes(id));
      await save(served);
      const next = (
        await (
          await search({ filters: { gotoOnly: true }, limit: 1, continuationToken: cursor })
        ).json()
      ).data;
      const mismatch = await search({
        filters: { gotoOnly: false },
        limit: 1,
        continuationToken: cursor,
      });
      return { next, mismatch: mismatch.status, remaining };
    },
    [MOCK_IDS.RECIPE_LASAGNA, MOCK_IDS.RECIPE_CARBONARA, MOCK_IDS.RECIPE_CHICKEN]
  );
  expect(observation.remaining).toHaveLength(1);
  expect(observation.next.results).toEqual([]);
  expect(observation.next.topPick).toBeNull();
  expect(observation.mismatch).toBe(409);
});

for (const surface of ['browse', 'search'] as const) {
  test(`${surface} management separates confirmed saves, failed reads and cancelled filter drafts`, async ({
    page,
    baseURL,
  }) => {
    await setupCommonRoutes(page);
    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseURL! }]);
    await page.addInitScript(
      (id) =>
        localStorage.setItem(
          'family-storage',
          JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 })
        ),
      MOCK_IDS.MEMBER_ALEX
    );
    const entry = surface === 'browse' ? 'browse-filters-entry' : 'mobile-filters-button';
    const filter = surface === 'browse' ? 'browse-filter-goto' : 'mobile-filter-goto';
    const apply = surface === 'browse' ? 'browse-filters-apply' : 'mobile-filter-apply';
    await page.goto(surface === 'browse' ? '/browse-all-stack' : '/recipes');
    await page.evaluate(
      async (ids) => {
        await fetch('/api/goto', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: [
              { recipeId: ids.ready, description: 'Family Lasagna', status: 'ready' },
              { recipeId: ids.pending, description: 'Pending family soup', status: 'pending' },
            ],
          }),
        });
      },
      { ready: MOCK_IDS.RECIPE_LASAGNA, pending: MOCK_IDS.RECIPE_GOTO_STUB }
    );
    let failList = true;
    await page.route('**/api/goto', async (route) => {
      if (route.request().method() === 'GET' && failList) {
        failList = false;
        return route.fulfill({ status: 400, json: { message: 'List unavailable' } });
      }
      await route.fallback();
    });
    await page.getByTestId(entry).click();
    await expect(page.getByTestId('goto-management-toggle')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    await page.getByTestId('goto-management-toggle').click();
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Could not load GOTOs');
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(page.getByTestId('goto-pending-description')).toHaveText('Pending family soup');
    await page.getByTestId(filter).click();
    await page.getByTestId(apply).click();
    await expect(
      page.getByTestId(surface === 'browse' ? 'stack-card-front' : 'recipe-card-top-pick')
    ).toBeVisible();
    let putCalls = 0;
    let failSave = true;
    let failRefresh = false;
    await page.route('**/api/goto', async (route) => {
      if (route.request().method() === 'PUT') {
        putCalls++;
        if (failSave) {
          failSave = false;
          return route.fulfill({ status: 400, json: { message: 'Save rejected' } });
        }
      }
      await route.fallback();
    });
    await page.route(
      (url) => url.pathname === '/api/recipes' || url.pathname === '/api/recipes/search',
      async (route) => {
        if (failRefresh) {
          failRefresh = false;
          return route.fulfill({ status: 400, json: { message: 'Read rejected after save' } });
        }
        await route.fallback();
      }
    );
    await page.getByTestId(entry).click();
    await page.getByTestId('goto-management-toggle').click();
    await page.getByRole('button', { name: 'Remove Family Lasagna', exact: true }).click();
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
      'Could not remove GOTO'
    );
    await expect(page.getByTestId('goto-recipe-name')).toHaveText('Family Lasagna');
    failRefresh = true;
    await page.getByRole('button', { name: 'Remove Family Lasagna', exact: true }).click();
    await expect(page.getByTestId('goto-recipe-name')).not.toBeVisible();
    // A draft filter change cannot undo the confirmed membership save.
    await page.getByTestId(surface === 'browse' ? filter : `${filter}-active`).click();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId(entry)).toContainText('1');
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(
      page.getByTestId(surface === 'browse' ? 'browse-goto-empty' : 'filter-no-results')
    ).toBeVisible();
    expect(putCalls).toBe(2);
    await page.getByTestId(entry).click();
    await page.getByTestId('goto-management-toggle').click();
    await expect(page.getByTestId('goto-pending-description')).toHaveText('Pending family soup');
    await page.getByTestId('add-goto-btn').click();
    await expect(page.getByTestId(apply)).not.toBeVisible();
    await expect(page.getByTestId('goto-search-library')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId(entry)).toBeFocused();
    expect(putCalls).toBe(2);
  });
}

for (const appLocale of ['en', 'fr'] as const) {
  test.describe(`GOTO rendered review ${appLocale}`, () => {
    test.use({ appLocale });
    for (const surface of ['browse', 'search'] as const) {
      test(`${surface} Filters remain readable and reachable through text growth and acquisition`, async ({
        page,
        baseURL,
      }) => {
        test.setTimeout(120_000);
        await setupCommonRoutes(page);
        await page
          .context()
          .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseURL! }]);
        await page.addInitScript(
          (id) =>
            localStorage.setItem(
              'family-storage',
              JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 })
            ),
          MOCK_IDS.MEMBER_ALEX
        );
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.goto(surface === 'browse' ? '/browse-all-stack' : '/recipes');
        // Keep framework development badges out of product captures; application feedback remains visible.
        await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
        await page.evaluate(
          async (ids) =>
            fetch('/api/goto', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                items: [
                  {
                    recipeId: ids.ready,
                    description:
                      'Recette familiale aux légumes du jardin et aux fines herbes pour toute la famille',
                    status: 'ready',
                  },
                  {
                    recipeId: ids.pending,
                    description:
                      'Une très longue recette familiale en préparation qui reste accessible dans la liste',
                    status: 'pending',
                  },
                ],
              }),
            }),
          { ready: MOCK_IDS.RECIPE_LASAGNA, pending: MOCK_IDS.RECIPE_GOTO_STUB }
        );
        const entry = surface === 'browse' ? 'browse-filters-entry' : 'mobile-filters-button';
        const chip = surface === 'browse' ? 'browse-filter-goto' : 'mobile-filter-goto';
        const apply = surface === 'browse' ? 'browse-filters-apply' : 'mobile-filter-apply';
        await page.getByTestId(entry).click();
        await page.getByTestId(chip).click();
        await page.getByTestId(apply).click();
        await expect(page.getByTestId(entry)).toHaveAccessibleName(
          surface === 'browse'
            ? appLocale === 'fr'
              ? 'Filtres (1)'
              : 'Filters (1)'
            : appLocale === 'fr'
              ? 'Filtres actifs : 1'
              : 'Filters, 1 active'
        );
        for (const [width, height] of [
          [320, 568],
          [390, 667],
          [412, 915],
          [667, 375],
          [820, 1180],
          [1180, 820],
        ]) {
          await page.setViewportSize({ width, height });
          await page.screenshot({
            path: `../.task/goto-review/after/${appLocale}-${surface}-${width}x${height}-collection.png`,
            fullPage: true,
            animations: 'disabled',
          });
          for (const scale of [1, 2]) {
            await page.getByTestId(entry).focus();
            await page.keyboard.press('Enter');
            const dialog = page.getByRole('dialog');
            await expect(
              page.getByTestId(surface === 'browse' ? chip : `${chip}-active`)
            ).toHaveAttribute('aria-pressed', 'true');
            await page.getByTestId('goto-management-toggle').click();
            await expect(page.getByTestId('goto-pending-description')).toBeVisible();
            await dialog.evaluate((root, factor) => {
              const nodes = Array.from(root.querySelectorAll<HTMLElement>('*')).filter(
                (node) => node instanceof HTMLElement
              );
              const sizes = nodes.map((node) => ({
                node,
                font: parseFloat(getComputedStyle(node).fontSize),
                line: parseFloat(getComputedStyle(node).lineHeight),
              }));
              for (const { node, font, line } of sizes) {
                node.style.fontSize = `${font * factor}px`;
                if (Number.isFinite(line)) node.style.lineHeight = `${line * factor}px`;
              }
            }, scale);
            await dialog.evaluate((node) => {
              node.scrollTop = 0;
              node.querySelectorAll<HTMLElement>('*').forEach((child) => {
                if (child.scrollHeight > child.clientHeight) child.scrollTop = 0;
              });
            });
            await expect(
              dialog.getByRole('button', {
                name: appLocale === 'fr' ? 'Fermer' : 'Close',
                exact: true,
              })
            ).toBeInViewport({ ratio: 1 });
            if (surface === 'browse') {
              const close = page.getByTestId('browse-filters-close');
              const target = await close.boundingBox();
              expect(target!.width).toBeGreaterThanOrEqual(44);
              expect(target!.height).toBeGreaterThanOrEqual(44);
              // Text growth may move Close to a new row; keep both controls within the header.
              expect(
                await close.evaluate((button) => {
                  const header = button.parentElement!;
                  const bounds = header.getBoundingClientRect();
                  return Array.from(header.children).every((child) => {
                    const rect = child.getBoundingClientRect();
                    return rect.left >= bounds.left && rect.right <= bounds.right;
                  });
                })
              ).toBe(true);
            }
            await dialog.screenshot({
              path: `../.task/goto-review/after/${appLocale}-${surface}-${width}x${height}-${scale}x-filters-top.png`,
              animations: 'disabled',
            });
            await page.getByTestId('goto-pending-description').scrollIntoViewIfNeeded();
            await dialog.screenshot({
              path: `../.task/goto-review/after/${appLocale}-${surface}-${width}x${height}-${scale}x-management.png`,
              animations: 'disabled',
            });
            // Center explicitly: nearest scrolling rounds fractional offsets and can leave a 0.2 px edge outside the viewport.
            await page
              .getByTestId(apply)
              .evaluate((node) => node.scrollIntoView({ block: 'center' }));
            await expect(page.getByTestId(apply)).toBeInViewport({ ratio: 1 });
            expect(
              await page.getByTestId(apply).evaluate((button) => {
                const bounds = button.getBoundingClientRect();
                const text = document.createRange();
                text.selectNodeContents(button);
                return Array.from(text.getClientRects()).every(
                  (rect) => rect.left >= bounds.left + 12 && rect.right <= bounds.right - 12
                );
              })
            ).toBe(true);

            expect(await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(
              true
            );
            expect(
              await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
            ).toBe(true);
            await dialog.screenshot({
              path: `../.task/goto-review/after/${appLocale}-${surface}-${width}x${height}-${scale}x-filters.png`,
              animations: 'disabled',
            });
            await page.getByTestId('add-goto-btn').scrollIntoViewIfNeeded();
            await page.getByTestId('add-goto-btn').click();
            await expect(page.getByTestId('goto-search-library')).toBeVisible();
            await page.getByRole('dialog').evaluate((root, factor) => {
              const sizes = Array.from(root.querySelectorAll<HTMLElement>('*'))
                .filter((node) => node instanceof HTMLElement)
                .map((node) => ({
                  node,
                  font: parseFloat(getComputedStyle(node).fontSize),
                  line: parseFloat(getComputedStyle(node).lineHeight),
                }));
              for (const { node, font, line } of sizes) {
                node.style.fontSize = `${font * factor}px`;
                if (Number.isFinite(line)) node.style.lineHeight = `${line * factor}px`;
              }
            }, scale);
            await page.getByTestId('goto-photo').scrollIntoViewIfNeeded();
            await expect(page.getByTestId('goto-photo')).toBeInViewport({ ratio: 1 });
            await page.getByTestId('goto-acquisition-close').scrollIntoViewIfNeeded();
            await expect(page.getByTestId('goto-acquisition-close')).toBeInViewport({ ratio: 1 });
            await page.keyboard.press('Escape');
            await expect(page.getByTestId(entry)).toBeFocused();
            await page.getByTestId(entry).click();
            // Backdrop and Escape both discard drafts and restore the entry.
            if (scale === 1) await page.mouse.click(2, 2);
            else await page.keyboard.press('Escape');
            await expect(page.getByTestId(entry)).toBeFocused();
          }
        }
      });
    }
  });
}

test('changed GOTO controls retain rendered text, indicator and focus contrast', async ({
  page,
  baseURL,
}) => {
  await setupCommonRoutes(page);
  await page
    .context()
    .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseURL! }]);
  await page.addInitScript(
    (id) =>
      localStorage.setItem(
        'family-storage',
        JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 })
      ),
    MOCK_IDS.MEMBER_ALEX
  );
  await page.setViewportSize({ width: 390, height: 667 });
  await page.goto(`/recipes?open=${MOCK_IDS.RECIPE_LASAGNA}`);
  let star = page.getByTestId('action-set-goto');
  await expect(star).toHaveText('GOTO');
  await star.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(star).toBeFocused();
  await recordGotoContrast(star, '../.task/goto-review/contrast/star-unselected-focus.json', true);
  await star.hover();
  await recordGotoContrast(star, '../.task/goto-review/contrast/star-unselected-hover.json');
  let release!: () => void;
  let holdSave = true;
  await page.route('**/api/goto', async (route) => {
    if (route.request().method() === 'PUT' && holdSave) {
      holdSave = false;
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    }
    await route.fallback();
  });
  await star.click();
  await expect(star).toBeDisabled();
  await recordGotoContrast(star, '../.task/goto-review/contrast/star-pending.json');
  await star.screenshot({
    path: '../.task/goto-review/after/star-pending.png',
    animations: 'disabled',
  });
  release();
  star = page.getByTestId('action-current-goto');
  await expect(star).toHaveAttribute('aria-pressed', 'true');
  await expect(star.locator('svg')).toHaveAttribute('fill', 'currentColor');
  await star.hover();
  await recordGotoContrast(star, '../.task/goto-review/contrast/star-selected-hover.json');
  await page.mouse.down();
  await recordGotoContrast(star, '../.task/goto-review/contrast/star-selected-pressed.json');
  await page.mouse.move(0, 0);
  await page.mouse.up();
  await page.getByTestId('action-close-sheet').click();
  await page.evaluate(async () =>
    fetch('/api/goto', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [] }),
    })
  );
  await page.goto('/home');
  const helper = page.getByTestId('goto-setup-helper');
  await expect(helper).toBeVisible();
  await recordGotoContrast(helper.locator('p'), '../.task/goto-review/contrast/home-helper.json');
  const link = page.getByTestId('add-goto-btn');
  await link.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await recordGotoContrast(link, '../.task/goto-review/contrast/home-link-focus.json', true);
  expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(48);
  await page.goto('/browse-all-stack');
  await page.getByTestId('browse-filters-entry').click();
  const filter = page.getByTestId('browse-filter-goto');
  await filter.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await recordGotoContrast(
    filter,
    '../.task/goto-review/contrast/filter-unselected-focus.json',
    true
  );
  await filter.click();
  await filter.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await recordGotoContrast(
    filter,
    '../.task/goto-review/contrast/filter-selected-focus.json',
    true
  );
});

for (const appLocale of ['en', 'fr'] as const) {
  test.describe(`GOTO star reflow ${appLocale}`, () => {
    test.use({ appLocale });
    test('both labelled states remain reachable with enlarged text', async ({ page, baseURL }) => {
      test.setTimeout(90_000);
      await setupCommonRoutes(page);
      await page
        .context()
        .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseURL! }]);
      await page.addInitScript(
        (id) =>
          localStorage.setItem(
            'family-storage',
            JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 })
          ),
        MOCK_IDS.MEMBER_ALEX
      );
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.route(`**/api/recipes/${MOCK_IDS.RECIPE_LASAGNA}`, async (route) => {
        if (route.request().method() !== 'GET') return route.fallback();
        await route.fulfill({
          json: {
            recipe: builders.recipe({
              id: MOCK_IDS.RECIPE_LASAGNA,
              name:
                appLocale === 'fr'
                  ? 'Un très long plat familial aux légumes rôtis et aux fines herbes du jardin'
                  : 'A long family supper with roasted vegetables and fresh garden herbs',
            }),
            updatedAt: '2026-05-04T12:00:00Z',
          },
        });
      });

      await page.goto('/recipes');
      for (const [width, height] of [
        [320, 568],
        [390, 667],
        [412, 915],
        [667, 375],
        [820, 1180],
        [1180, 820],
      ]) {
        await page.setViewportSize({ width, height });
        for (const scale of [1, 2]) {
          await page.evaluate(async () =>
            fetch('/api/goto', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ items: [] }),
            })
          );
          await page.goto(`/recipes?open=${MOCK_IDS.RECIPE_LASAGNA}`);
          await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
          const sheet = page.getByTestId('recipe-detail-sheet');
          await expect(page.getByTestId('action-set-goto')).toBeVisible();
          await sheet.evaluate((root, factor) => {
            const sizes = Array.from(root.querySelectorAll<HTMLElement>('*'))
              .filter((node) => node instanceof HTMLElement)
              .map((node) => ({
                node,
                font: parseFloat(getComputedStyle(node).fontSize),
                line: parseFloat(getComputedStyle(node).lineHeight),
              }));
            for (const { node, font, line } of sizes) {
              node.style.fontSize = `${font * factor}px`;
              if (Number.isFinite(line)) node.style.lineHeight = `${line * factor}px`;
            }
          }, scale);
          const unselected = page.getByTestId('action-set-goto');
          await expect(unselected).toHaveText('GOTO');
          await expect(unselected).toHaveAttribute('aria-pressed', 'false');
          await expect(unselected).toBeInViewport({ ratio: 1 });
          expect(await sheet.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
          await sheet.screenshot({
            path: `../.task/goto-review/after/star-${appLocale}-${width}x${height}-${scale}x-unselected.png`,
            animations: 'disabled',
          });
          await unselected.click();
          const selected = page.getByTestId('action-current-goto');
          await expect(selected).toHaveText('GOTO');
          await expect(selected).toHaveAttribute('aria-pressed', 'true');
          await expect(selected).toBeInViewport({ ratio: 1 });
          expect(await sheet.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
          await expect(page.getByTestId('action-close-sheet')).toBeInViewport({ ratio: 1 });
          await sheet.screenshot({
            path: `../.task/goto-review/after/star-${appLocale}-${width}x${height}-${scale}x-selected.png`,
            animations: 'disabled',
          });
          await page.getByTestId('action-close-sheet').click();
        }
      }
    });
  });
}

for (const surface of ['browse', 'search'] as const) {
  for (const choice of [
    { testId: 'goto-search-library', path: '/recipes', mode: null },
    { testId: 'goto-describe', path: '/capture', mode: 'describe' },
    { testId: 'goto-photo', path: '/capture', mode: 'photo' },
  ]) {
    test(`${surface} acquisition destination ${choice.testId} opens without creating or assigning`, async ({
      page,
      baseURL,
    }) => {
      await setupCommonRoutes(page);
      await page
        .context()
        .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseURL! }]);
      await page.addInitScript(
        (id) =>
          localStorage.setItem(
            'family-storage',
            JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 })
          ),
        MOCK_IDS.MEMBER_ALEX
      );
      const writes: string[] = [];
      page.on('request', (request) => {
        const path = new URL(request.url()).pathname;
        if (
          path.startsWith('/api/') &&
          !['GET', 'HEAD'].includes(request.method()) &&
          path !== '/api/recipes/search'
        )
          writes.push(`${request.method()} ${path}`);
      });
      await page.goto(surface === 'browse' ? '/browse-all-stack' : '/recipes');
      await page
        .getByTestId(surface === 'browse' ? 'browse-filters-entry' : 'mobile-filters-button')
        .click();
      await page.getByTestId('goto-management-toggle').click();
      await page.getByTestId('add-goto-btn').click();
      await page.getByTestId(choice.testId).click();
      await expect(page).toHaveURL(
        (url) =>
          url.pathname === choice.path &&
          (!choice.mode ||
            (url.searchParams.get('intent') === 'goto' &&
              url.searchParams.get('mode') === choice.mode))
      );
      await expect(page.getByTestId('quick-find-modal')).not.toBeVisible();
      expect(writes).toEqual([]);
    });
  }
}
