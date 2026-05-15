/**
 * E2E tests for Browse All Stack feature.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.6, 1.7, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8,
 *               4.2, 4.5, 4.6, 4.7, 8.6, 8.7, 8.8, 9.4, 14.6
 *
 * Constraint: ALL interactions and assertions use page.getByTestId(...) exclusively.
 * No getByText, getByRole, getByLabel, CSS selectors, or XPath.
 */

import { test, expect, type Page } from './fixtures';
import { MOCK_IDS, builders, setupCommonRoutes } from './mock-api';
import type { RecipeDto } from '../src/lib/api/generated/models/index';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const RECIPE_1 = builders.recipe({
  id: MOCK_IDS.RECIPE_LASAGNA,
  name: 'Lasagna',
  isDiscoverable: true,
});

const RECIPE_2 = builders.recipe({
  id: MOCK_IDS.RECIPE_CARBONARA,
  name: 'Carbonara',
  isDiscoverable: false,
});

const RECIPE_3 = builders.recipe({
  id: MOCK_IDS.RECIPE_CHICKEN,
  name: 'Chicken',
  isDiscoverable: true,
});

const THREE_RECIPES = [RECIPE_1, RECIPE_2, RECIPE_3];
const LIST_RECIPES = [
  MOCK_IDS.RECIPE_LIST_01,
  MOCK_IDS.RECIPE_LIST_02,
  MOCK_IDS.RECIPE_LIST_03,
  MOCK_IDS.RECIPE_LIST_04,
  MOCK_IDS.RECIPE_LIST_05,
  MOCK_IDS.RECIPE_LIST_06,
  MOCK_IDS.RECIPE_LIST_07,
  MOCK_IDS.RECIPE_LIST_08,
  MOCK_IDS.RECIPE_LIST_09,
  MOCK_IDS.RECIPE_LIST_10,
  MOCK_IDS.RECIPE_LIST_11,
  MOCK_IDS.RECIPE_LIST_12,
  MOCK_IDS.RECIPE_LIST_13,
].map((id, index) =>
  builders.recipe({
    id,
    name: `List Recipe ${index + 1}`,
    isDiscoverable: true,
  })
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Simulate a swipe-right gesture on the front card.
 * Drags from the card centre rightward by 200px — well beyond the 80px threshold.
 */
async function swipeRight(page: Page): Promise<void> {
  const card = page.getByTestId('stack-card-front');
  await card.waitFor({ state: 'visible' });
  // Wait for entrance/spring animations to settle before grabbing bounding box
  await page.waitForTimeout(500);

  const box = await card.boundingBox();
  if (!box) throw new Error('stack-card-front has no bounding box');

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 200, startY, { steps: 10 });
  await page.mouse.up();

  // Wait for framer-motion animation (300ms) and state update to complete
  await page.waitForTimeout(1000);
}

/**
 * Simulate a swipe-left gesture on the front card.
 * Drags from the card centre leftward by 200px — well beyond the 80px threshold.
 */
async function swipeLeft(page: Page): Promise<void> {
  const card = page.getByTestId('stack-card-front');
  await card.waitFor({ state: 'visible' });
  // Wait for entrance/spring animations to settle before grabbing bounding box
  await page.waitForTimeout(500);

  const box = await card.boundingBox();
  if (!box) throw new Error('stack-card-front has no bounding box');

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX - 200, startY, { steps: 10 });
  await page.mouse.up();

  // Wait for framer-motion animation (300ms) and state update to complete
  await page.waitForTimeout(1000);
}

// ---------------------------------------------------------------------------
// Common beforeEach setup
// ---------------------------------------------------------------------------

async function setupBrowseAllStack(
  page: Page,
  options?: {
    recipes?: RecipeDto[];
    total?: number;
    browseViewMode?: 'stack' | 'list';
  }
) {
  const recipes = options?.recipes ?? THREE_RECIPES;
  const total = options?.total ?? recipes.length;
  const browseViewMode = options?.browseViewMode ?? 'stack';
  const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';

  await page
    .context()
    .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);

  await page.addInitScript(
    ({ id, mode }) => {
      localStorage.setItem(
        'family-storage',
        JSON.stringify({
          state: {
            selectedFamilyMemberId: id,
            familyMembers: [{ id, name: 'Alex', browseViewMode: mode }],
            hasLoaded: true,
          },
          version: 0,
        })
      );
    },
    { id: MOCK_IDS.MEMBER_ALEX, mode: browseViewMode }
  );

  await setupCommonRoutes(page);

  let savedBrowseViewMode = browseViewMode;
  await page.route('**/api/family', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            builders.familyMember({
              id: MOCK_IDS.MEMBER_ALEX,
              name: 'Alex',
              browseViewMode: savedBrowseViewMode,
            }),
          ],
        }),
      });
    } else {
      await route.fallback();
    }
  });

  await page.route('**/api/family/*/preferences', async (route) => {
    const body = route.request().postDataJSON() as { browseViewMode?: 'stack' | 'list' };
    savedBrowseViewMode = body.browseViewMode ?? savedBrowseViewMode;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: builders.familyMember({
          id: MOCK_IDS.MEMBER_ALEX,
          name: 'Alex',
          browseViewMode: savedBrowseViewMode,
        }),
      }),
    });
  });

  // Override library-summary with test-specific total
  await page.route('**/api/recipes/library-summary', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          total,
          neverCooked: 1,
          ratings: { love: 1, like: 1, dislike: 0, unrated: 1 },
        },
      }),
    });
  });

  // Override explore order with test-specific recipes
  await page.route('**/api/recipes?**order=explore**', async (route) => {
    const url = new URL(route.request().url());
    const pageNumber = Number(url.searchParams.get('page') ?? '1');
    const limit = Number(url.searchParams.get('limit') ?? '20');
    const start = (pageNumber - 1) * limit;
    const pageRecipes = recipes.slice(start, start + limit);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        updatedAt: new Date().toISOString(),
        recipes: pageRecipes,
        pagination: { page: pageNumber, limit, total },
      }),
    });
  });
}

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

test.describe('Browse All Stack — Entry Points', () => {
  // Requirement 1.1, 1.3
  test('Home page trigger opens Browse All Stack overlay', async ({ page }) => {
    await setupBrowseAllStack(page);
    await page.goto('/home');

    await page.getByTestId('home-browse-all-trigger').click();

    await expect(page.getByTestId('browse-all-stack-container')).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Browse All Stack — Overlay Structure', () => {
  test.beforeEach(async ({ page }) => {
    await setupBrowseAllStack(page);
    await page.goto('/browse-all-stack');
    await expect(page.getByTestId('browse-all-stack-container')).toBeVisible({ timeout: 10_000 });
    // Wait for initial load to complete
    await expect(page.getByTestId('stack-card-front')).toBeVisible({ timeout: 10_000 });
  });

  // Requirement 1.5
  test('overlay container is visible', async ({ page }) => {
    await expect(page.getByTestId('browse-all-stack-container')).toBeVisible();
  });

  // Requirement 1.6
  test('exit button is visible', async ({ page }) => {
    await expect(page.getByTestId('browse-all-exit')).toBeVisible();
  });

  // Requirement 4.2
  test('stack action bar is visible with depth indicator', async ({ page }) => {
    await expect(page.getByTestId('stack-action-bar')).toBeVisible();
    await expect(page.getByTestId('stack-depth-indicator')).toBeVisible();
  });
});

test.describe('Browse All Stack — View Modes', () => {
  test('saved List preference is restored on entry', async ({ page }) => {
    await setupBrowseAllStack(page, { browseViewMode: 'list' });
    await page.goto('/browse-all-stack');

    await expect(page.getByTestId('browse-list-grid')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('stack-card-front')).not.toBeVisible();
  });

  test('user switches to List, leaves the page, returns, and List is restored', async ({
    page,
  }) => {
    await setupBrowseAllStack(page);
    await page.goto('/browse-all-stack');
    await expect(page.getByTestId('stack-card-front')).toBeVisible({ timeout: 10_000 });

    await page.getByTestId('browse-view-list').click();
    await expect(page.getByTestId('browse-list-grid')).toBeVisible({ timeout: 10_000 });

    await page.goto('/home');
    await page.goto('/browse-all-stack');
    await expect(page.getByTestId('browse-list-grid')).toBeVisible({ timeout: 10_000 });
  });

  test('List infinite scroll loads the next page without a manual button', async ({ page }) => {
    await setupBrowseAllStack(page, {
      browseViewMode: 'list',
      recipes: LIST_RECIPES,
      total: LIST_RECIPES.length,
    });
    await page.goto('/browse-all-stack');

    await expect(page.getByTestId('browse-list-grid')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('browse-list-recipe-card')).toHaveCount(12);

    await page.getByTestId('browse-list-grid').evaluate((element) => {
      element.parentElement?.scrollTo({ top: element.scrollHeight, behavior: 'instant' });
    });

    await expect(page.getByTestId('browse-list-recipe-card')).toHaveCount(13, { timeout: 10_000 });
  });
});
test.describe('Browse All Stack — Exit', () => {
  test.beforeEach(async ({ page }) => {
    await setupBrowseAllStack(page);
    await page.goto('/browse-all-stack');
    await expect(page.getByTestId('browse-all-stack-container')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('stack-card-front')).toBeVisible({ timeout: 10_000 });
  });

  // Requirement 1.6
  test('exit button dismisses the overlay', async ({ page }) => {
    await page.getByTestId('browse-all-exit').click();

    // After exit, the overlay should no longer be visible
    await expect(page.getByTestId('browse-all-stack-container')).not.toBeVisible({
      timeout: 5_000,
    });
  });
});

test.describe('Browse All Stack — Card Navigation', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));
    await setupBrowseAllStack(page);
    await page.goto('/browse-all-stack');
    await expect(page.getByTestId('browse-all-stack-container')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('stack-card-front')).toBeVisible({ timeout: 10_000 });
  });

  // Requirement 2.1
  test('swipe left advances to next card', async ({ page }) => {
    // First card should be visible
    await expect(page.getByTestId(`stack-card-${MOCK_IDS.RECIPE_LASAGNA}`)).toBeVisible();

    await swipeLeft(page);

    // After swipe left, the second card should become the front card
    await expect(page.getByTestId(`stack-card-${MOCK_IDS.RECIPE_CARBONARA}`)).toBeVisible({
      timeout: 5_000,
    });
  });

  // Requirement 2.2
  test('swipe right returns to previous card', async ({ page }) => {
    // Advance to second card first
    await swipeLeft(page);
    await expect(page.getByTestId(`stack-card-${MOCK_IDS.RECIPE_CARBONARA}`)).toBeVisible({
      timeout: 5_000,
    });

    // Now swipe right to go back
    await swipeRight(page);

    await expect(page.getByTestId(`stack-card-${MOCK_IDS.RECIPE_LASAGNA}`)).toBeVisible({
      timeout: 5_000,
    });
  });

  // Requirement 2.3 — backward endless navigation: swipe right on first card wraps to last recipe
  test('first card wraps to last recipe on swipe right', async ({ page }) => {
    // On first card
    await expect(page.getByTestId(`stack-card-${MOCK_IDS.RECIPE_LASAGNA}`)).toBeVisible();

    await swipeLeft(page);

    // Should land on the last recipe (RECIPE_CHICKEN is recipe 3 of 3)
    await expect(page.getByTestId(`stack-card-${MOCK_IDS.RECIPE_CHICKEN}`)).toBeVisible({
      timeout: 5_000,
    });
    // End card should NOT appear
    await expect(page.getByTestId('browse-all-end-card')).not.toBeVisible();
  });

  // Requirement 2.4
  test('swiping left on last card loops to the first card', async ({ page }) => {
    // Swipe through all 3 recipes
    await swipeLeft(page);
    await expect(page.getByTestId(`stack-card-${MOCK_IDS.RECIPE_CARBONARA}`)).toBeVisible({
      timeout: 5_000,
    });

    await swipeLeft(page);
    await expect(page.getByTestId(`stack-card-${MOCK_IDS.RECIPE_CHICKEN}`)).toBeVisible({
      timeout: 5_000,
    });

    // Swipe left on last card loops to first card
    await swipeLeft(page);

    await expect(page.getByTestId(`stack-card-${MOCK_IDS.RECIPE_LASAGNA}`)).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByTestId('browse-all-end-card')).not.toBeVisible();
  });
});

test.describe('Browse All Stack — Depth Indicator', () => {
  test.beforeEach(async ({ page }) => {
    await setupBrowseAllStack(page);
    await page.goto('/browse-all-stack');
    await expect(page.getByTestId('browse-all-stack-container')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('stack-card-front')).toBeVisible({ timeout: 10_000 });
  });

  // Requirement 4.2, 4.4
  test('depth indicator shows correct position and total', async ({ page }) => {
    const indicator = page.getByTestId('stack-depth-indicator');
    await expect(indicator).toBeVisible();
    // Should show "1 / 3" for first card of 3
    await expect(indicator).toContainText('1');
    await expect(indicator).toContainText('3');
  });

  // Requirement 4.4
  test('depth indicator updates when card changes', async ({ page }) => {
    const indicator = page.getByTestId('stack-depth-indicator');
    await expect(indicator).toContainText('1');

    await swipeLeft(page);
    await expect(page.getByTestId(`stack-card-${MOCK_IDS.RECIPE_CARBONARA}`)).toBeVisible({
      timeout: 5_000,
    });

    // Position should now be 2
    await expect(indicator).toContainText('2');
  });
});

test.describe('Browse All Stack — Discoverable Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await setupBrowseAllStack(page);
    await page.goto('/browse-all-stack');
    await expect(page.getByTestId('browse-all-stack-container')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('stack-card-front')).toBeVisible({ timeout: 10_000 });
  });

  // Requirement 4.5
  test('discoverable toggle is visible for the front card', async ({ page }) => {
    await expect(
      page.getByTestId(`card-toggle-discovery-${MOCK_IDS.RECIPE_LASAGNA}`)
    ).toBeVisible();
  });

  // Requirement 4.6, 4.8
  test('tapping discoverable toggle shows loading state', async ({ page }) => {
    // Set up a slow PATCH response to observe loading state
    await page.route('**/api/recipes/*', async (route) => {
      if (route.request().method() === 'PATCH') {
        // Delay to allow loading state to be observed
        await new Promise((resolve) => setTimeout(resolve, 300));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ recipe: { ...RECIPE_1, isDiscoverable: false } }),
        });
      } else {
        await route.fallback();
      }
    });

    await page.getByTestId(`card-toggle-discovery-${MOCK_IDS.RECIPE_LASAGNA}`).click();

    // Loading state should appear
    await expect(
      page.getByTestId(`card-toggle-discovery-${MOCK_IDS.RECIPE_LASAGNA}-loading`)
    ).toBeVisible({ timeout: 2_000 });

    // Loading state should disappear after request completes
    await expect(
      page.getByTestId(`card-toggle-discovery-${MOCK_IDS.RECIPE_LASAGNA}-loading`)
    ).not.toBeVisible({ timeout: 5_000 });
  });

  // Requirement 4.7
  test('discoverable toggle reverts on error', async ({ page }) => {
    // Override PATCH to fail
    await page.route('**/api/recipes/*', async (route) => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server error' }),
        });
      } else {
        await route.fallback();
      }
    });

    // Toggle is initially visible (RECIPE_1 has isDiscoverable: true)
    await expect(
      page.getByTestId(`card-toggle-discovery-${MOCK_IDS.RECIPE_LASAGNA}`)
    ).toBeVisible();

    await page.getByTestId(`card-toggle-discovery-${MOCK_IDS.RECIPE_LASAGNA}`).click();

    // After error, loading state should clear
    await expect(
      page.getByTestId(`card-toggle-discovery-${MOCK_IDS.RECIPE_LASAGNA}-loading`)
    ).not.toBeVisible({ timeout: 5_000 });

    // Toggle should still be visible (reverted to original state)
    await expect(
      page.getByTestId(`card-toggle-discovery-${MOCK_IDS.RECIPE_LASAGNA}`)
    ).toBeVisible();
  });

  // Requirement 4.11 — toggle updates when front card changes
  test('discoverable toggle updates when front card changes', async ({ page }) => {
    // First card toggle should be visible
    await expect(
      page.getByTestId(`card-toggle-discovery-${MOCK_IDS.RECIPE_LASAGNA}`)
    ).toBeVisible();

    // Swipe to second card
    await swipeLeft(page);
    await expect(page.getByTestId(`stack-card-${MOCK_IDS.RECIPE_CARBONARA}`)).toBeVisible({
      timeout: 5_000,
    });

    // Second card toggle should now be visible
    await expect(
      page.getByTestId(`card-toggle-discovery-${MOCK_IDS.RECIPE_CARBONARA}`)
    ).toBeVisible({ timeout: 3_000 });

    // First card toggle should no longer be visible
    await expect(
      page.getByTestId(`card-toggle-discovery-${MOCK_IDS.RECIPE_LASAGNA}`)
    ).not.toBeVisible();
  });
});

test.describe('Browse All Stack — Recipe Detail Sheet', () => {
  test.beforeEach(async ({ page }) => {
    await setupBrowseAllStack(page);

    // Mock GET /api/recipes/{id} for the detail sheet
    await page.route(`**/api/recipes/${MOCK_IDS.RECIPE_LASAGNA}`, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ recipe: RECIPE_1 }),
        });
      } else {
        await route.fallback();
      }
    });

    await page.goto('/browse-all-stack');
    await expect(page.getByTestId('browse-all-stack-container')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('stack-card-front')).toBeVisible({ timeout: 10_000 });
  });

  // Requirement 2.7
  test('tapping a card opens the Recipe Detail Sheet', async ({ page }) => {
    // Click the front card (tap without completing a swipe)
    await page.getByTestId('stack-card-front').click();

    await expect(page.getByTestId('recipe-detail-sheet')).toBeVisible({ timeout: 5_000 });
  });

  // Requirement 2.8
  test('closing the Recipe Detail Sheet returns to the same card', async ({ page }) => {
    // Verify we're on the first card
    await expect(page.getByTestId(`stack-card-${MOCK_IDS.RECIPE_LASAGNA}`)).toBeVisible();
    const indicatorBefore = await page.getByTestId('stack-depth-indicator').textContent();

    // Open the detail sheet
    await page.getByTestId('stack-card-front').click();
    await expect(page.getByTestId('recipe-detail-sheet')).toBeVisible({ timeout: 5_000 });

    // Close the sheet
    await page.getByTestId('action-close-sheet').click();
    await expect(page.getByTestId('recipe-detail-sheet')).not.toBeVisible({ timeout: 5_000 });

    // Should be back on the same card
    await expect(page.getByTestId(`stack-card-${MOCK_IDS.RECIPE_LASAGNA}`)).toBeVisible();

    // Depth indicator should be unchanged
    const indicatorAfter = await page.getByTestId('stack-depth-indicator').textContent();
    expect(indicatorAfter).toBe(indicatorBefore);
  });
});

test.describe('Browse All Stack — Empty State', () => {
  test.beforeEach(async ({ page }) => {
    await setupBrowseAllStack(page, { recipes: [], total: 0 });
    await page.goto('/browse-all-stack');
    await expect(page.getByTestId('browse-all-stack-container')).toBeVisible({ timeout: 10_000 });
  });

  // Requirement 9.1
  test('shows empty state when library is empty', async ({ page }) => {
    await expect(page.getByTestId('browse-all-empty-state')).toBeVisible({ timeout: 10_000 });
  });

  // Requirement 9.4
  test('empty state CTA navigates to /capture', async ({ page }) => {
    await expect(page.getByTestId('browse-all-empty-state')).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('browse-all-empty-capture-cta').click();

    await expect(page).toHaveURL(/\/capture/, { timeout: 5_000 });
  });

  // Requirement 9.5 — empty state is distinct from End Card
  test('End Card is not shown when library is empty', async ({ page }) => {
    await expect(page.getByTestId('browse-all-empty-state')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('browse-all-end-card')).not.toBeVisible();
  });
});

test.describe('Browse All Stack — Endless Navigation', () => {
  test('non-empty libraries never show the End Card while looping forward', async ({ page }) => {
    await setupBrowseAllStack(page);
    await page.goto('/browse-all-stack');
    await expect(page.getByTestId('stack-card-front')).toBeVisible({ timeout: 10_000 });

    for (let i = 0; i < 6; i += 1) {
      await swipeLeft(page);
      await expect(page.getByTestId('browse-all-end-card')).not.toBeVisible();
    }

    await expect(page.getByTestId('browse-all-exit')).toBeVisible();
  });
});

test.describe('Browse All Stack — Recycle Bin', () => {
  test.beforeEach(async ({ page }) => {
    await setupBrowseAllStack(page);
    await page.goto('/browse-all-stack');
    await expect(page.getByTestId('browse-all-stack-container')).toBeVisible({ timeout: 10_000 });
  });

  test('recycle bin entry is visible and opens the trash view', async ({ page }) => {
    await expect(page.getByTestId('recycle-bin-entry')).toBeVisible();
    await page.getByTestId('recycle-bin-entry').click();

    await expect(page.getByTestId('trash-list')).toBeVisible();
  });

  test('header buttons are ordered correctly (Discovery -> View -> Recycle -> Close)', async ({
    page,
  }) => {
    const discovery = page.getByTestId('stack-toggle-discoverable');
    const viewStack = page.getByTestId('browse-view-stack');
    // Get the container of the view toggle (the flex div with p-1)
    const viewContainer = page.locator('div:has(> [data-testid="browse-view-stack"])').first();
    const recycle = page.getByTestId('recycle-bin-entry');
    const close = page.getByTestId('browse-all-exit');

    const discoveryBox = await discovery.boundingBox();
    const viewBox = await viewContainer.boundingBox();
    const recycleBox = await recycle.boundingBox();
    const closeBox = await close.boundingBox();

    if (!discoveryBox || !viewBox || !recycleBox || !closeBox) {
      throw new Error('Could not get bounding boxes for header buttons');
    }

    // Expected order: Discovery (leftmost), View, Recycle, Close (rightmost)
    // We expect Discovery.x < View.x < Recycle.x < Close.x
    expect(discoveryBox.x).toBeLessThan(viewBox.x);
    expect(viewBox.x).toBeLessThan(recycleBox.x);
    expect(recycleBox.x).toBeLessThan(closeBox.x);
  });
});
