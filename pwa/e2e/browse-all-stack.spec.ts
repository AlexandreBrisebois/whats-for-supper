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
  const box = await card.boundingBox();
  if (!box) throw new Error('stack-card-front has no bounding box');

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 200, startY, { steps: 10 });
  await page.mouse.up();
}

/**
 * Simulate a swipe-left gesture on the front card.
 * Drags from the card centre leftward by 200px — well beyond the 80px threshold.
 */
async function swipeLeft(page: Page): Promise<void> {
  const card = page.getByTestId('stack-card-front');
  await card.waitFor({ state: 'visible' });
  const box = await card.boundingBox();
  if (!box) throw new Error('stack-card-front has no bounding box');

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX - 200, startY, { steps: 10 });
  await page.mouse.up();
}

/**
 * Simulate a swipe-right gesture on the End Card.
 */
async function swipeRightEndCard(page: Page): Promise<void> {
  const card = page.getByTestId('browse-all-end-card');
  await card.waitFor({ state: 'visible' });
  const box = await card.boundingBox();
  if (!box) throw new Error('browse-all-end-card has no bounding box');

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 200, startY, { steps: 10 });
  await page.mouse.up();
}

/**
 * Simulate a swipe-left gesture on the End Card.
 */
async function swipeLeftEndCard(page: Page): Promise<void> {
  const card = page.getByTestId('browse-all-end-card');
  await card.waitFor({ state: 'visible' });
  const box = await card.boundingBox();
  if (!box) throw new Error('browse-all-end-card has no bounding box');

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX - 200, startY, { steps: 10 });
  await page.mouse.up();
}

// ---------------------------------------------------------------------------
// Common beforeEach setup
// ---------------------------------------------------------------------------

async function setupBrowseAllStack(
  page: Page,
  options?: {
    recipes?: typeof THREE_RECIPES;
    total?: number;
  }
) {
  const recipes = options?.recipes ?? THREE_RECIPES;
  const total = options?.total ?? recipes.length;
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
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        updatedAt: new Date().toISOString(),
        recipes,
        pagination: { page: 1, limit: 20, total },
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

  // Requirement 1.2, 1.3
  test('Recipes page trigger opens Browse All Stack overlay', async ({ page }) => {
    await setupBrowseAllStack(page);
    await page.goto('/recipes');

    await expect(page.getByTestId('recipe-loader')).not.toBeVisible({ timeout: 15_000 });
    await page.getByTestId('browse-all-stack-trigger').click();

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

  // Requirement 1.7
  test('search escape button is visible', async ({ page }) => {
    await expect(page.getByTestId('browse-all-search-trigger')).toBeVisible();
  });

  // Requirement 4.2
  test('stack action bar is visible with depth indicator', async ({ page }) => {
    await expect(page.getByTestId('stack-action-bar')).toBeVisible();
    await expect(page.getByTestId('stack-depth-indicator')).toBeVisible();
  });
});

test.describe('Browse All Stack — Exit and Search Escape', () => {
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

  // Requirement 1.7
  test('search escape button navigates to /recipes', async ({ page }) => {
    await page.getByTestId('browse-all-search-trigger').click();

    await expect(page).toHaveURL(/\/recipes/, { timeout: 5_000 });
  });
});

test.describe('Browse All Stack — Card Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await setupBrowseAllStack(page);
    await page.goto('/browse-all-stack');
    await expect(page.getByTestId('browse-all-stack-container')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('stack-card-front')).toBeVisible({ timeout: 10_000 });
  });

  // Requirement 2.1
  test('swipe right advances to next card', async ({ page }) => {
    // First card should be visible
    await expect(page.getByTestId(`stack-card-${MOCK_IDS.RECIPE_LASAGNA}`)).toBeVisible();

    await swipeRight(page);

    // After swipe right, the second card should become the front card
    await expect(page.getByTestId(`stack-card-${MOCK_IDS.RECIPE_CARBONARA}`)).toBeVisible({
      timeout: 5_000,
    });
  });

  // Requirement 2.2
  test('swipe left returns to previous card', async ({ page }) => {
    // Advance to second card first
    await swipeRight(page);
    await expect(page.getByTestId(`stack-card-${MOCK_IDS.RECIPE_CARBONARA}`)).toBeVisible({
      timeout: 5_000,
    });

    // Now swipe left to go back
    await swipeLeft(page);

    await expect(page.getByTestId(`stack-card-${MOCK_IDS.RECIPE_LASAGNA}`)).toBeVisible({
      timeout: 5_000,
    });
  });

  // Requirement 2.3
  test('first card does not wrap on swipe left', async ({ page }) => {
    // On first card — swipe left should stay on first card
    await expect(page.getByTestId(`stack-card-${MOCK_IDS.RECIPE_LASAGNA}`)).toBeVisible();

    await swipeLeft(page);

    // Should still be on first card
    await expect(page.getByTestId(`stack-card-${MOCK_IDS.RECIPE_LASAGNA}`)).toBeVisible({
      timeout: 3_000,
    });
    // End card should NOT appear
    await expect(page.getByTestId('browse-all-end-card')).not.toBeVisible();
  });

  // Requirement 2.4
  test('swiping right on last card shows End Card', async ({ page }) => {
    // Swipe through all 3 recipes
    await swipeRight(page);
    await expect(page.getByTestId(`stack-card-${MOCK_IDS.RECIPE_CARBONARA}`)).toBeVisible({
      timeout: 5_000,
    });

    await swipeRight(page);
    await expect(page.getByTestId(`stack-card-${MOCK_IDS.RECIPE_CHICKEN}`)).toBeVisible({
      timeout: 5_000,
    });

    // Swipe right on last card → End Card
    await swipeRight(page);

    await expect(page.getByTestId('browse-all-end-card')).toBeVisible({ timeout: 5_000 });
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

    await swipeRight(page);
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
    await swipeRight(page);
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

test.describe('Browse All Stack — End Card', () => {
  test.beforeEach(async ({ page }) => {
    await setupBrowseAllStack(page);
    await page.goto('/browse-all-stack');
    await expect(page.getByTestId('browse-all-stack-container')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('stack-card-front')).toBeVisible({ timeout: 10_000 });

    // Swipe through all 3 recipes to reach End Card
    await swipeRight(page);
    await expect(page.getByTestId(`stack-card-${MOCK_IDS.RECIPE_CARBONARA}`)).toBeVisible({
      timeout: 5_000,
    });

    await swipeRight(page);
    await expect(page.getByTestId(`stack-card-${MOCK_IDS.RECIPE_CHICKEN}`)).toBeVisible({
      timeout: 5_000,
    });

    await swipeRight(page);
    await expect(page.getByTestId('browse-all-end-card')).toBeVisible({ timeout: 5_000 });
  });

  // Requirement 8.1
  test('End Card is shown after last recipe', async ({ page }) => {
    await expect(page.getByTestId('browse-all-end-card')).toBeVisible();
  });

  // Requirement 8.6
  test('End Card CTA navigates to /capture', async ({ page }) => {
    await page.getByTestId('end-card-capture-cta').click();

    await expect(page).toHaveURL(/\/capture/, { timeout: 5_000 });
  });

  // Requirement 8.7
  test('swiping right on End Card wraps to first recipe', async ({ page }) => {
    await swipeRightEndCard(page);

    // Should wrap back to first card
    await expect(page.getByTestId('stack-card-front')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId(`stack-card-${MOCK_IDS.RECIPE_LASAGNA}`)).toBeVisible({
      timeout: 5_000,
    });

    // Depth indicator should reset to 1
    await expect(page.getByTestId('stack-depth-indicator')).toContainText('1');
  });

  // Requirement 8.8
  test('swiping left on End Card returns to last recipe', async ({ page }) => {
    await swipeLeftEndCard(page);

    // Should return to last recipe card
    await expect(page.getByTestId('stack-card-front')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId(`stack-card-${MOCK_IDS.RECIPE_CHICKEN}`)).toBeVisible({
      timeout: 5_000,
    });
  });

  // Requirement 1.8 — exit and search buttons visible on End Card
  test('exit and search buttons are visible on End Card', async ({ page }) => {
    await expect(page.getByTestId('browse-all-exit')).toBeVisible();
    await expect(page.getByTestId('browse-all-search-trigger')).toBeVisible();
  });
});
