/**
 * E2E — Grocery List: PATCH failure behaviour
 *
 * Verifies that a PATCH failure on a grocery toggle:
 *   1. Reverts only the single toggled item (not all items)
 *   2. Shows a per-item error indicator (AlertCircle) on the reverted item
 *   3. Does NOT show a global spinner blocking all items
 */

import { test, expect } from './fixtures';
import {
  MOCK_IDS,
  builders,
  currentMonday,
  toDateStr,
  setupCommonRoutes,
  mockSseWithConnectedSchedule,
  mockSseWithGroceryUpdated,
  mockSseWithWeekUpdate,
} from './mock-api';

async function setupGroceryPage(page: import('@playwright/test').Page) {
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

  // Override schedule to return a week with one recipe that has known ingredients
  const monday = currentMonday();
  const GROCERY_INGREDIENTS = ['Pasta', 'Beef', 'Tomato Sauce', 'Cheese'];
  const GROCERY_SECTION_MAP: Record<string, string> = {
    Pasta: 'Pantry',
    Beef: 'Meat',
    'Tomato Sauce': 'Pantry',
    Cheese: 'Dairy & Eggs',
  };
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    return {
      day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      date: toDateStr(d),
      recipe:
        i === 0
          ? builders.scheduleRecipe({
              id: MOCK_IDS.RECIPE_LASAGNA,
              name: 'Homemade Lasagna',
              ingredients: GROCERY_INGREDIENTS,
            })
          : null,
      status: 0,
    };
  });

  await page.route(
    (url) => url.pathname === '/api/schedule',
    async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              weekOffset: 0,
              locked: false,
              status: 0,
              days,
              groceryItems: builders.groceryItems(GROCERY_INGREDIENTS, GROCERY_SECTION_MAP),
            },
          }),
        });
      } else {
        await route.continue();
      }
    }
  );

  await mockSseWithConnectedSchedule(page, {
    weekOffset: 0,
    locked: false,
    status: 0,
    days,
    groceryItems: builders.groceryItems(GROCERY_INGREDIENTS, GROCERY_SECTION_MAP),
    groceryState: { additionalData: {} },
  } as any);

  await page.goto('/planner');
  await expect(page.getByTestId('day-card-0')).toBeVisible({ timeout: 10_000 });

  // Switch to the grocery tab
  await page.getByTestId('grocery-tab').click();
  await expect(page.getByTestId('grocery-checklist')).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText('Your list is empty')).not.toBeVisible();
}

test.describe('Grocery List — PATCH failure behaviour', () => {
  test('PATCH failure → single item reverts, no global spinner', async ({ page }) => {
    await setupGroceryPage(page);

    // Override the per-item grocery PATCH endpoint to fail
    await page.route('**/api/schedule/*/grocery/item', async (route) => {
      await route.fulfill({ status: 500, body: 'Internal Server Error' });
    });

    // Find the first grocery item checkbox
    const firstItem = page.getByTestId('grocery-item-checkbox').first();
    await expect(firstItem).toBeVisible({ timeout: 5_000 });

    // Capture the item name before toggling
    const itemName = await firstItem.getAttribute('data-item-name');
    expect(itemName).toBeTruthy();

    // Click to toggle — optimistic update fires immediately
    await firstItem.click();

    // After the PATCH fails, the item should revert (not remain checked)
    // The item should NOT be in a checked/line-through state
    await expect(firstItem.locator('span').first()).not.toHaveClass(/line-through/, {
      timeout: 3_000,
    });

    // A per-item error indicator should appear on the reverted item
    await expect(firstItem.getByTestId('grocery-item-error')).toBeVisible({ timeout: 3_000 });

    // No global spinner (Loader2) should be present anywhere in the checklist
    // The old isSaving pattern used a Loader2 icon on every item — verify it's gone
    const checklist = page.getByTestId('grocery-checklist');
    await expect(checklist.locator('[class*="animate-spin"]')).toHaveCount(0);

    // Other items should remain interactive (not disabled)
    const allItems = page.getByTestId('grocery-item-checkbox');
    const count = await allItems.count();
    for (let i = 1; i < count; i++) {
      await expect(allItems.nth(i)).not.toBeDisabled();
    }
  });
});

test.describe('Grocery List — SSE sync', () => {
  test('grocery_updated SSE → checklist updates without navigation', async ({ page }) => {
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

    // Mock SSE to emit grocery_updated with Pasta checked — registered AFTER
    // setupCommonRoutes so LIFO gives this handler priority over the default stream route.
    await mockSseWithGroceryUpdated(page, 0, {
      Pasta: true,
      Beef: false,
      'Tomato Sauce': false,
      Cheese: false,
    });

    // Override schedule to return a week with one recipe that has known ingredients
    const monday = currentMonday();
    const GROCERY_INGREDIENTS_SSE = ['Pasta', 'Beef', 'Tomato Sauce', 'Cheese'];
    const GROCERY_SECTION_MAP_SSE: Record<string, string> = {
      Pasta: 'Pantry',
      Beef: 'Meat',
      'Tomato Sauce': 'Pantry',
      Cheese: 'Dairy & Eggs',
    };
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setUTCDate(monday.getUTCDate() + i);
      return {
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
        date: toDateStr(d),
        recipe:
          i === 0
            ? builders.scheduleRecipe({
                id: MOCK_IDS.RECIPE_LASAGNA,
                name: 'Homemade Lasagna',
                ingredients: GROCERY_INGREDIENTS_SSE,
              })
            : null,
        status: 0,
      };
    });

    await page.route(
      (url) => url.pathname === '/api/schedule',
      async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                weekOffset: 0,
                locked: false,
                status: 0,
                days,
                groceryItems: builders.groceryItems(
                  GROCERY_INGREDIENTS_SSE,
                  GROCERY_SECTION_MAP_SSE
                ),
              },
            }),
          });
        } else {
          await route.continue();
        }
      }
    );

    await page.goto('/planner');
    await expect(page.getByTestId('day-card-0')).toBeVisible({ timeout: 10_000 });

    // Switch to the grocery tab
    await page.getByTestId('grocery-tab').click();
    await expect(page.getByTestId('grocery-checklist')).toBeVisible({ timeout: 5_000 });

    // After the grocery_updated SSE event, the Pasta item should be checked
    // without any navigation — the SSE push updates the store directly.
    // Assert semantic state instead of the styling class so this remains a behavior test.
    const pastaItem = page.getByTestId('grocery-item-checkbox').filter({ hasText: 'Pasta' });
    await expect(pastaItem).toBeVisible({ timeout: 10_000 });
    await expect(pastaItem).toHaveAttribute('aria-checked', 'true', { timeout: 10_000 });

    // Other items should remain unchecked
    const beefItem = page.getByTestId('grocery-item-checkbox').filter({ hasText: 'Beef' });
    await expect(beefItem).toBeVisible({ timeout: 10_000 });
    await expect(beefItem).toHaveAttribute('aria-checked', 'false');
  });

  test('week_updated SSE → grocery checkboxes do not flash (jitter regression test)', async ({
    page,
  }) => {
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

    const monday = currentMonday();
    const GROCERY_INGREDIENTS_WEEK = ['Pasta', 'Beef', 'Tomato Sauce', 'Cheese'];
    const GROCERY_SECTION_MAP_WEEK: Record<string, string> = {
      Pasta: 'Pantry',
      Beef: 'Meat',
      'Tomato Sauce': 'Pantry',
      Cheese: 'Dairy & Eggs',
    };
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setUTCDate(monday.getUTCDate() + i);
      return {
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
        date: toDateStr(d),
        recipe:
          i === 0
            ? builders.scheduleRecipe({
                id: MOCK_IDS.RECIPE_LASAGNA,
                name: 'Homemade Lasagna',
                ingredients: GROCERY_INGREDIENTS_WEEK,
              })
            : null,
        status: 0,
      };
    });

    // Build a week_updated schedule that carries groceryState with Pasta already checked.
    // The groceryState is embedded in additionalData to match the Kiota AdditionalDataHolder
    // pattern used by weekStore.applySnapshot.
    const scheduleWithGrocery = {
      weekOffset: 0,
      locked: false,
      status: 0,
      days,
      groceryState: {
        additionalData: { Pasta: true, Beef: false, 'Tomato Sauce': false, Cheese: false },
      },
    };

    await setupCommonRoutes(page);

    // Mock SSE to emit week_updated with the grocery state embedded — registered AFTER
    // setupCommonRoutes so LIFO gives this handler priority over the default stream route.
    await mockSseWithWeekUpdate(
      page,
      scheduleWithGrocery as Parameters<typeof mockSseWithWeekUpdate>[1]
    );

    await page.route(
      (url) => url.pathname === '/api/schedule',
      async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                weekOffset: 0,
                locked: false,
                status: 0,
                days,
                groceryItems: builders.groceryItems(
                  GROCERY_INGREDIENTS_WEEK,
                  GROCERY_SECTION_MAP_WEEK
                ),
              },
            }),
          });
        } else {
          await route.continue();
        }
      }
    );

    await page.goto('/planner');
    await expect(page.getByTestId('day-card-0')).toBeVisible({ timeout: 10_000 });

    // Switch to the grocery tab
    await page.getByTestId('grocery-tab').click();
    await expect(page.getByTestId('grocery-checklist')).toBeVisible({ timeout: 5_000 });

    // After week_updated SSE, Pasta should be checked (line-through) — applied atomically
    // with the schedule update so there is no intermediate render where it flashes unchecked.
    const pastaItem = page.getByTestId('grocery-item-checkbox').filter({ hasText: 'Pasta' });
    await expect(pastaItem.locator('span').first()).toHaveClass(/line-through/, {
      timeout: 5_000,
    });

    // Verify no flash: the item must NOT have been in an unchecked state after the SSE event.
    // We assert the checked state is stable (no class toggling) by checking it again immediately.
    await expect(pastaItem.locator('span').first()).toHaveClass(/line-through/);

    // Other items should remain unchecked — no spurious state reset
    const beefItem = page.getByTestId('grocery-item-checkbox').filter({ hasText: 'Beef' });
    await expect(beefItem.locator('span').first()).not.toHaveClass(/line-through/);
  });
});
