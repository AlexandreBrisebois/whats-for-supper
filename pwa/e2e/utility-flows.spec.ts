import { test, expect } from './fixtures';
import { MOCK_IDS, builders, currentMonday, toDateStr } from './mock-api';

/**
 * ADR 029: Deterministic E2E Testing Strategy
 * - Fixed reference date: 2026-04-27 (Monday)
 * - regex-based matching for intercepts
 * - page.reload() for state sync
 */

test.describe("Cook's Mode and Grocery Flows", () => {
  const FIXED_MONDAY = '2026-04-27';

  test.beforeEach(async ({ page }) => {
    // Set identity
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
    await page.context().addCookies([
      {
        name: 'x-family-member-id',
        value: MOCK_IDS.MEMBER_ALEX,
        url: baseUrl,
      },
    ]);
    // Set localStorage before first navigation — no goto('/') needed
    await page.addInitScript((id) => {
      localStorage.setItem(
        'family-storage',
        JSON.stringify({
          state: { selectedFamilyMemberId: id },
          version: 0,
        })
      );
    }, MOCK_IDS.MEMBER_ALEX);

    // Hardened Intercepts (ADR 029)
    await page.route(/\/(?:backend\/)?api\/schedule(?:\?|$|.*)/, async (route) => {
      if (route.request().method() === 'GET' && !route.request().url().includes('smart-defaults')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              weekOffset: 0,
              locked: true,
              status: 2,
              days: [
                {
                  day: 'Mon',
                  date: FIXED_MONDAY,
                  recipe: {
                    data: builders.scheduleRecipe({
                      id: MOCK_IDS.RECIPE_LASAGNA,
                      name: 'Test Lasagna',
                      ingredients: ['Pasta Sheets', 'Ground Beef', 'Tomato Sauce', 'Ricotta'],
                    }),
                  },
                },
                ...Array.from({ length: 6 }, (_, i) => {
                  const d = new Date(FIXED_MONDAY);
                  d.setDate(d.getDate() + i + 1);
                  return {
                    day: ['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
                    date: d.toISOString().split('T')[0],
                    recipe: null,
                  };
                }),
              ],
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Specific route for smart-defaults
    await page.route(/\/(?:backend\/)?api\/schedule\/.*\/smart-defaults/, async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          data: {
            weekOffset: 0,
            familySize: 3,
            consensusThreshold: 2,
            preSelectedRecipes: [],
            openSlots: [],
            consensusRecipesCount: 0,
            isVotingOpen: false,
          },
        },
      });
    });

    await page.goto('/planner');
    await expect(page.getByTestId('day-card-0')).toBeVisible({ timeout: 15_000 });
  });

  test("Cook's mode shows parsed steps", async ({ page }) => {
    const mondayCard = page.getByTestId('day-card-0');
    await expect(mondayCard.getByTestId('start-cook-mode')).toBeVisible();

    await mondayCard.getByTestId('start-cook-mode').click();

    const overlay = page.getByTestId('cooks-mode-overlay');
    await expect(overlay).toBeVisible();
    await expect(page.getByTestId('cooks-mode-step-indicator')).toContainText(/Step 1 of/i);

    await page.getByTestId('close-cooks-mode').click();
    await expect(overlay).not.toBeVisible();
  });

  test('Grocery checklist persists state across refresh', async ({ page }) => {
    const itemName = 'Tomato Sauce';

    await page.getByTestId('grocery-tab').click();
    const checklist = page.getByTestId('grocery-checklist');
    await expect(checklist).toBeVisible();

    await expect(page.locator('[data-testid="grocery-item-checkbox"]').first()).toBeVisible({
      timeout: 10_000,
    });

    const firstItem = page.locator(
      `[data-testid="grocery-item-checkbox"][data-item-name="${itemName}"]`
    );
    await expect(firstItem).toBeVisible();

    // Mock update
    await page.route(/\/(?:backend\/)?api\/schedule\/.*\/grocery/, async (route) => {
      await route.fulfill({ status: 200, json: { success: true } });
    });

    await firstItem.click();
    await expect(firstItem).toHaveClass(/bg-sage/);

    // Update the GET mock
    await page.route(/\/(?:backend\/)?api\/schedule(?:\?|$|.*)/, async (route) => {
      if (route.request().method() === 'GET' && !route.request().url().includes('smart-defaults')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              weekOffset: 0,
              locked: true,
              status: 2,
              days: [
                {
                  day: 'Mon',
                  date: FIXED_MONDAY,
                  recipe: {
                    data: builders.scheduleRecipe({
                      id: MOCK_IDS.RECIPE_LASAGNA,
                      name: 'T1',
                      ingredients: [itemName],
                    }),
                  },
                },
              ],
              groceryState: { [itemName]: true },
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.reload();
    await expect(page.getByTestId('day-card-0')).toBeVisible({ timeout: 15_000 });
    await page.getByTestId('grocery-tab').click();
    const refreshedItem = page.locator(
      `[data-testid="grocery-item-checkbox"][data-item-name="${itemName}"]`
    );
    await expect(refreshedItem).toHaveClass(/bg-sage/);
  });

  test('Grocery items grouped by aisle sections', async ({ page }) => {
    await page.getByTestId('grocery-tab').click();
    await expect(page.getByTestId('grocery-checklist')).toBeVisible();

    // Wait for items to populate before checking sections
    await expect(page.locator('[data-testid="grocery-item-checkbox"]').first()).toBeVisible({
      timeout: 10_000,
    });

    await expect(page.getByTestId('aisle-section-Pantry')).toBeVisible();
    await expect(page.getByTestId('aisle-section-Meat')).toBeVisible();
  });
});
