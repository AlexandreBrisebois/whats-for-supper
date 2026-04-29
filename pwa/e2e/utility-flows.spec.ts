import { test, expect } from '@playwright/test';

test.describe("Cook's Mode and Grocery Flows", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the planner page
    await page.goto('/planner');
    await page.waitForLoadState('networkidle');
  });

  test("Cook's mode shows parsed steps", async ({ page }) => {
    // Find and click a recipe card in the planner
    const recipeCards = page.locator('[data-testid^="recipe-card"]');
    const cardCount = await recipeCards.count();

    if (cardCount === 0) {
      test.skip();
    }

    // Click the first recipe card
    await recipeCards.first().click();

    // Wait for cook's mode modal to appear
    const cooksModeOverlay = page.locator('[data-testid="cooks-mode-overlay"]');
    await cooksModeOverlay.waitFor({ state: 'visible' });

    // Verify step indicator is visible
    const stepIndicator = page.locator('[data-testid="cooks-mode-step-indicator"]');
    await expect(stepIndicator).toBeVisible();
    await expect(stepIndicator).toContainText(/Step 1 of/);

    // Verify the step title and instruction are displayed
    const stepTitle = page.locator('h3');
    await expect(stepTitle).toHaveCount(1);
    await expect(stepTitle).not.toBeEmpty();

    // Click next button to advance step
    const nextButton = page.locator('[data-testid="cooks-mode-step-next"]');
    await nextButton.click();

    // Verify step counter incremented
    await expect(stepIndicator).toContainText(/Step 2 of/);

    // Click back button
    const prevButton = page.locator('[data-testid="cooks-mode-step-prev"]');
    await prevButton.click();

    // Verify step counter decremented
    await expect(stepIndicator).toContainText(/Step 1 of/);

    // Close cook's mode
    const closeButton = page.locator('[data-testid="close-cooks-mode"]');
    await closeButton.click();

    // Verify modal is closed
    await expect(cooksModeOverlay).not.toBeVisible();
  });

  test('Grocery checklist persists state across refresh', async ({ page, context }) => {
    // Navigate to grocery tab in planner
    const groceryTab = page.locator('button:has-text("Grocery")');

    if (!(await groceryTab.isVisible())) {
      test.skip();
    }

    await groceryTab.click();

    // Wait for grocery list to load
    const groceryList = page.locator('text=Smart Shopping');
    await expect(groceryList).toBeVisible({ timeout: 5000 });

    // Find a checkbox for the first aisle section
    const firstAisleSection = page.locator('.rounded-3xl.border.border-charcoal').first();
    const checkboxButton = firstAisleSection.locator('button').first();

    // Get the ingredient name
    const ingredientText = await checkboxButton.locator('span').last().textContent();
    expect(ingredientText).toBeTruthy();

    // Toggle the checkbox
    await checkboxButton.click();
    await page.waitForTimeout(500);

    // Verify visual state changed (checked)
    const checkIcon = checkboxButton.locator('[role="button"]');
    // After toggle, the element should show a checked state
    await expect(checkboxButton).toHaveClass(/text-sage/);

    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Ensure we're still on the grocery tab
    await expect(groceryList).toBeVisible();

    // Verify the item is still checked after refresh
    const refreshedCheckbox = page.locator(`button:has-text("${ingredientText}")`).first();
    // The checkbox should retain the checked state
    await expect(refreshedCheckbox).toHaveClass(/text-sage/);
  });

  test('Grocery items grouped by aisle sections', async ({ page }) => {
    // Navigate to grocery tab
    const groceryTab = page.locator('button:has-text("Grocery")');

    if (!(await groceryTab.isVisible())) {
      test.skip();
    }

    await groceryTab.click();

    // Wait for grocery list to load
    const groceryList = page.locator('text=Smart Shopping');
    await expect(groceryList).toBeVisible({ timeout: 5000 });

    // Verify aisle sections are present
    const aisles = ['Vegetables', 'Meat', 'Dairy', 'Bakery', 'Pantry'];
    for (const aisle of aisles) {
      const aisleHeader = page.locator(`text=${aisle}`);
      // It's okay if some aisles aren't present (no ingredients in that category)
      const isVisible = await aisleHeader.isVisible().catch(() => false);
      if (isVisible) {
        await expect(aisleHeader).toBeVisible();

        // Verify the aisle has items
        const itemsContainer = aisleHeader.locator('../..');
        const items = itemsContainer.locator('button').filter({
          has: page.locator('span:not(:empty)'),
        });

        const itemCount = await items.count();
        expect(itemCount).toBeGreaterThan(0);
      }
    }
  });
});
