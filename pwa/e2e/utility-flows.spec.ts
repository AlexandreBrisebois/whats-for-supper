import { test, expect } from './fixtures';
import { MOCK_IDS, builders, currentMonday, toDateStr, setupCommonRoutes } from './mock-api';

/**
 * ADR 029: Deterministic E2E Testing Strategy
 * - Fixed reference date: 2026-04-27 (Monday)
 * - regex-based matching for intercepts
 * - page.reload() for state sync
 */

test.describe("Cook's Mode and Grocery Flows", () => {
  // Use today's date so the Cook Mode button (E2: today-only) is visible on the right card.
  const TODAY = new Date().toISOString().split('T')[0];
  // Derive the Monday of the current week for building the full 7-day mock.
  const getThisWeekMonday = () => {
    const now = new Date();
    const day = now.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() + diff);
    return monday.toISOString().split('T')[0];
  };

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

    await setupCommonRoutes(page);

    const thisMonday = getThisWeekMonday();

    // Hardened Intercepts (ADR 029)
    await page.route(/\/(?:backend\/)?api\/schedule(?:\?|$|.*)/, async (route) => {
      if (route.request().method() === 'GET' && !route.request().url().includes('smart-defaults')) {
        // Build 7 days from this week's Monday; put the recipe on today's date.
        const days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(thisMonday);
          d.setUTCDate(d.getUTCDate() + i);
          const dateStr = d.toISOString().split('T')[0];
          const isToday = dateStr === TODAY;
          return {
            day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
            date: dateStr,
            recipe: isToday
              ? builders.scheduleRecipe({
                  id: MOCK_IDS.RECIPE_LASAGNA,
                  name: 'Test Lasagna',
                  ingredients: ['Pasta Sheets', 'Ground Beef', 'Tomato Sauce', 'Ricotta'],
                })
              : null,
          };
        });
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              weekOffset: 0,
              locked: true,
              status: 2,
              days,
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
    // Cook Mode button only shows on today's card (E2 constraint).
    const todayCard = page.locator(`[data-date="${TODAY}"]`);
    await expect(todayCard.getByTestId('start-cook-mode')).toBeVisible();

    await todayCard.getByTestId('start-cook-mode').click();

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
                  date: TODAY,
                  recipe: builders.scheduleRecipe({
                    id: MOCK_IDS.RECIPE_LASAGNA,
                    name: 'T1',
                    ingredients: [itemName],
                  }),
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
    await expect(page.locator(`[data-date="${TODAY}"]`)).toBeVisible({ timeout: 15_000 });
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
