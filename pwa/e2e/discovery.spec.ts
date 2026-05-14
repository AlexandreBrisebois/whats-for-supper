import { test, expect } from './fixtures';
import {
  MOCK_IDS,
  builders,
  setupCommonRoutes,
  mockSseWithFillTheGapInvalidated,
  mockSseWithVoteUpdated,
} from './mock-api';

const MOCK_CATEGORIES = ['Italian', 'Asian', 'Mexican'];

const MOCK_STACK = [
  builders.recipe({ id: MOCK_IDS.RECIPE_LASAGNA, name: 'Mock Gourmet Discovery' }),
  builders.recipe({ id: MOCK_IDS.RECIPE_CARBONARA, name: 'Mock Comfort Classic' }),
];

test.describe('Discovery Flow', () => {
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

    await page.route(
      (url) => url.pathname.includes('/api/discovery/categories'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: MOCK_CATEGORIES }),
        });
      }
    );

    await page.route(
      (url) => url.pathname.endsWith('/api/discovery'),
      async (route) => {
        // The app might call /api/discovery or /api/discovery?category=...
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: MOCK_STACK }),
        });
      }
    );

    await page.route(
      (url) => url.pathname.includes('/api/discovery/') && url.pathname.endsWith('/vote'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
    );
  });

  test('should fetch categories and then fetch the first category stack', async ({ page }) => {
    await page.goto('/discovery');

    await expect(page.getByTestId('discovery-loader')).not.toBeVisible({ timeout: 15_000 });

    await expect(page.getByTestId('discovery-card').first()).toBeVisible();
    await expect(page.getByTestId('discovery-card').first()).toContainText(
      /Mock Gourmet Discovery/i
    );
    await expect(page.getByTestId('discovery-card').first()).toContainText(/READY IN 30 MINS/i);
  });

  test('should swipe through all categories and show summary', async ({ page }) => {
    // Each category returns MOCK_STACK on the first fetch (initial load / loadNextCategory),
    // then [] on subsequent fetches — simulating that all recipes in that category were voted.
    // Without this, the wrap-around in loadNextCategory would re-serve already-visited categories.
    const categoryServed = new Set<string>();
    await page.route(
      (url) => url.pathname.endsWith('/api/discovery') && !url.pathname.includes('/vote'),
      async (route) => {
        const category = new URL(route.request().url()).searchParams.get('category') ?? '';
        const firstTime = !categoryServed.has(category);
        categoryServed.add(category);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: firstTime ? MOCK_STACK : [] }),
        });
      }
    );

    await page.goto('/discovery');

    await expect(page.getByTestId('discovery-loader')).not.toBeVisible({ timeout: 15_000 });

    // 3 categories × 2 cards = 6 swipes total
    for (let i = 0; i < 6; i++) {
      const likeBtn = page.getByTestId('like-button');
      await expect(likeBtn).toBeEnabled({ timeout: 5_000 });
      await likeBtn.click();
    }

    await expect(page.getByTestId('discovery-empty-state')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('discovery-empty-state')).toContainText(/That's a wrap/i);
  });

  test('SSE fill_the_gap_invalidated: recipe card fades out and micro-badge appears', async ({
    page,
  }) => {
    // Arrange: SSE will emit fill_the_gap_invalidated after connected
    await mockSseWithFillTheGapInvalidated(page, 0);

    // The initial discovery stack has Lasagna + Carbonara.
    // After the SSE event fires, the API returns only Carbonara (Lasagna was planned).
    // The page should remove Lasagna from the stack and show the "Just planned ✓" badge.
    let discoveryCallCount = 0;
    await page.route(
      (url) => url.pathname.endsWith('/api/discovery'),
      async (route) => {
        const callIndex = discoveryCallCount++;
        if (callIndex === 0) {
          // First call (initial load): return both recipes
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: MOCK_STACK }),
          });
        } else {
          // Subsequent calls (silent refetch after SSE): return only Carbonara
          // Lasagna was planned — return stack without it
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: [
                builders.recipe({ id: MOCK_IDS.RECIPE_CARBONARA, name: 'Mock Comfort Classic' }),
              ],
            }),
          });
        }
      }
    );

    await page.goto('/discovery');

    // Wait for initial load to complete
    await expect(page.getByTestId('discovery-loader')).not.toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('discovery-card').first()).toBeVisible();

    // Wait for SSE fill_the_gap_invalidated to trigger the silent refetch and remove Lasagna.
    // The card for Lasagna should fade out (no longer in the DOM).
    await expect(
      page.locator('[data-testid="discovery-card"]').filter({ hasText: /Mock Gourmet Discovery/i })
    ).not.toBeVisible({ timeout: 10_000 });

    // The "Just planned ✓" micro-badge should appear (sage green, inline at top of card stack)
    await expect(page.getByTestId('just-planned-badge')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('just-planned-badge')).toContainText(/Just planned/i);

    // Badge auto-fades after 2 seconds
    await expect(page.getByTestId('just-planned-badge')).not.toBeVisible({ timeout: 5_000 });
  });

  test('should auto-advance past empty first category to next non-empty category', async ({
    page,
  }) => {
    // Italian is empty (all voted), Asian has cards — page should land on Asian, not empty state
    await page.route(
      (url) => url.pathname.endsWith('/api/discovery') && !url.pathname.includes('/vote'),
      async (route) => {
        const category = new URL(route.request().url()).searchParams.get('category');
        if (category === 'Italian') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: [] }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: MOCK_STACK }),
          });
        }
      }
    );

    await page.goto('/discovery');

    await expect(page.getByTestId('discovery-loader')).not.toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('discovery-card').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('discovery-empty-state')).not.toBeVisible();
  });

  test('should skip multiple empty categories before showing first non-empty category', async ({
    page,
  }) => {
    // Italian and Asian are empty, Mexican has cards
    await page.route(
      (url) => url.pathname.endsWith('/api/discovery') && !url.pathname.includes('/vote'),
      async (route) => {
        const category = new URL(route.request().url()).searchParams.get('category');
        if (category === 'Italian' || category === 'Asian') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: [] }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: MOCK_STACK }),
          });
        }
      }
    );

    await page.goto('/discovery');

    await expect(page.getByTestId('discovery-loader')).not.toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('discovery-card').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('discovery-empty-state')).not.toBeVisible();
  });

  test('refresh button should be hidden while voting categories are available', async ({
    page,
  }) => {
    await page.goto('/discovery');

    await expect(page.getByTestId('discovery-loader')).not.toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('discovery-card').first()).toBeVisible({ timeout: 10_000 });

    // Refresh button must not be rendered while cards are present
    await expect(page.getByTestId('refresh-button')).not.toBeVisible();
  });

  test('refresh button should appear only after all categories are exhausted', async ({ page }) => {
    // Same "first-serve only" mock as the summary test — wrap-around must not
    // re-serve already-voted categories and prevent the empty state from appearing.
    const categoryServed = new Set<string>();
    await page.route(
      (url) => url.pathname.endsWith('/api/discovery') && !url.pathname.includes('/vote'),
      async (route) => {
        const category = new URL(route.request().url()).searchParams.get('category') ?? '';
        const firstTime = !categoryServed.has(category);
        categoryServed.add(category);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: firstTime ? MOCK_STACK : [] }),
        });
      }
    );

    await page.goto('/discovery');

    await expect(page.getByTestId('discovery-loader')).not.toBeVisible({ timeout: 15_000 });

    // 3 categories × 2 cards = 6 swipes to exhaust everything
    for (let i = 0; i < 6; i++) {
      const likeBtn = page.getByTestId('like-button');
      await expect(likeBtn).toBeEnabled({ timeout: 5_000 });
      await likeBtn.click();
    }

    await expect(page.getByTestId('discovery-empty-state')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('refresh-button')).toBeVisible({ timeout: 5_000 });
  });

  test('SSE fill_the_gap empties last card in category → auto-advances to next category', async ({
    page,
  }) => {
    await mockSseWithFillTheGapInvalidated(page, 0);

    // Italian has 1 card (Lasagna). After SSE, Italian refetch returns [] — Lasagna was planned.
    // The next category (Asian/Mexican) uses a DISTINCT stack with no "Mock Gourmet Discovery"
    // so the assertion that Lasagna disappears is reliable even across SSE reconnects.
    const NEXT_STACK = [
      builders.recipe({ id: MOCK_IDS.RECIPE_CARBONARA, name: 'Mock Comfort Classic' }),
      builders.recipe({ id: MOCK_IDS.RECIPE_CHICKEN, name: 'Mock Chicken Delight' }),
    ];

    let italianCallCount = 0;
    await page.route(
      (url) => url.pathname.endsWith('/api/discovery') && !url.pathname.includes('/vote'),
      async (route) => {
        const category = new URL(route.request().url()).searchParams.get('category');
        if (category === 'Italian') {
          const idx = italianCallCount++;
          if (idx === 0) {
            // Initial load: 1 card
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                data: [
                  builders.recipe({ id: MOCK_IDS.RECIPE_LASAGNA, name: 'Mock Gourmet Discovery' }),
                ],
              }),
            });
          } else {
            // Silent refetch after SSE: Lasagna was planned
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({ data: [] }),
            });
          }
        } else {
          // Asian / Mexican — always return the distinct next-category stack
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: NEXT_STACK }),
          });
        }
      }
    );

    await page.goto('/discovery');

    await expect(page.getByTestId('discovery-loader')).not.toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('discovery-card').first()).toBeVisible();

    // After SSE fires and the refetch empties Italian, the page auto-advances.
    // Lasagna should disappear and be replaced by next-category cards.
    await expect(
      page.locator('[data-testid="discovery-card"]').filter({ hasText: /Mock Gourmet Discovery/i })
    ).not.toBeVisible({ timeout: 10_000 });

    // Empty state must NOT appear — we cycled to the next category
    await expect(page.getByTestId('discovery-empty-state')).not.toBeVisible({ timeout: 5_000 });

    // A card from the next category should be visible
    await expect(page.getByTestId('discovery-card').first()).toBeVisible({ timeout: 10_000 });
  });

  test('SSE vote_updated: ring appears on voted card; position-0 card unchanged', async ({
    page,
  }) => {
    // Arrange: 3-card stack so we have a card at position 2
    const STACK_3 = [
      builders.recipe({ id: MOCK_IDS.RECIPE_LASAGNA, name: 'Mock Gourmet Discovery' }),
      builders.recipe({ id: MOCK_IDS.RECIPE_CARBONARA, name: 'Mock Comfort Classic' }),
      builders.recipe({ id: MOCK_IDS.RECIPE_CHICKEN, name: 'Mock Chicken Delight' }),
    ];

    // Override the discovery route for this test to return 3 cards
    await page.route(
      (url) => url.pathname.endsWith('/api/discovery'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: STACK_3 }),
        });
      }
    );

    // SSE emits vote_updated for the recipe at position 2 (Chicken)
    await mockSseWithVoteUpdated(page, MOCK_IDS.RECIPE_CHICKEN, 1);

    await page.goto('/discovery');

    // Wait for initial load
    await expect(page.getByTestId('discovery-loader')).not.toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('discovery-card').first()).toBeVisible();

    // After SSE vote_updated fires, the Chicken card (originally position 2)
    // should have hasFamilyInterest=true → ring-2 ring-sage class on its inner wrapper.
    // The re-rank rule moves it from position 2 to position 1 (max 2 up, never to 0).
    // We assert the ring class is present on a discovery-card element.
    await expect(
      page
        .locator('[data-testid="discovery-card"]')
        .filter({ hasText: /Mock Chicken Delight/i })
        .locator('.ring-2.ring-sage')
    ).toBeVisible({ timeout: 10_000 });

    // Position-0 card (Lasagna) must NOT have the ring class
    await expect(
      page
        .locator('[data-testid="discovery-card"]')
        .filter({ hasText: /Mock Gourmet Discovery/i })
        .locator('.ring-2.ring-sage')
    ).not.toBeVisible({ timeout: 5_000 });
  });
});
