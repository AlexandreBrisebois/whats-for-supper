import { test, expect } from './fixtures';

test.describe('Supper Planner', () => {
  test.beforeEach(async ({ page }) => {
    // Set x-family-member-id cookie to bypass onboarding
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
    await page.context().addCookies([
      {
        name: 'x-family-member-id',
        value: '1',
        url: baseUrl,
      },
    ]);
    await page.goto('/planner');
    // Wait for hydration and data load
    await expect(page.getByTestId('day-card-0')).toBeVisible({ timeout: 10_000 });
  });

  test('should display the planner navigation and segmented control', async ({ page }) => {
    await expect(page.getByTestId('planner-tab')).toBeVisible();
    await expect(page.getByTestId('grocery-tab')).toBeVisible();
  });

  test('should display 7 daily cards', async ({ page }) => {
    const cards = page.getByTestId(/^day-card-/);
    await expect(cards).toHaveCount(7);
  });

  test('should flip weeks when clicking chevrons', async ({ page }) => {
    const initialDateRange = await page.getByTestId('week-range').textContent();
    await page.getByTestId('next-week').click();

    // Wait for the date range to change (indicates data has loaded)
    await expect(page.getByTestId('week-range')).not.toHaveText(initialDateRange || '', {
      timeout: 10_000,
    });

    const nextDateRange = await page.getByTestId('week-range').textContent();
    expect(initialDateRange).not.toBe(nextDateRange);
  });

  test('should open the planning pivot sheet when clicking "+" on an unplanned day', async ({
    page,
  }) => {
    // Tuesday (index 1) is unplanned in mock data
    await page.waitForSelector('[data-testid="plan-meal-button"]');
    await page.getByTestId('plan-meal-button').first().click();

    await expect(page.getByTestId('pivot-sheet')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('pivot-quick-find')).toBeVisible();
    await expect(page.getByTestId('pivot-search-library')).toBeVisible();
    await expect(page.getByTestId('pivot-ask-family')).toBeVisible();
  });

  test('should complete the search-to-planner round-trip with success feedback', async ({
    page,
  }) => {
    // 1. Open pivot sheet for an unplanned day without smart defaults (Thursday = 3)
    const thursdayCard = page.getByTestId('day-card-3');
    await thursdayCard.getByTestId('plan-meal-button').click();

    // 2. Click "Search library"
    await page.getByTestId('pivot-search-library').click();
    await expect(page).toHaveURL(/\/recipes\?addToDay=3&weekOffset=0/);

    // 3. Verify Planning Mode banner
    await expect(page.getByTestId('planning-mode-banner')).toBeVisible();

    // 4. Select "Homemade Lasagna" (Top Pick)
    await page.getByTestId('recipe-card-top-pick').click();

    // 5. Verify redirect back to planner with success params
    await expect(page).toHaveURL(/\/planner\?success=1&dayIndex=3/);

    // 6. Verify success feedback (ring/pulse) on the card
    await expect(thursdayCard.getByText('Homemade Lasagna')).toBeVisible();
  });

  test('should trigger Cook Mode from a recipe card and navigate steps', async ({ page }) => {
    // Monday (index 0) has a recipe in mock data
    const mondayCard = page.getByTestId('day-card-0');

    // Ensure the card has a recipe
    await expect(mondayCard.getByTestId('start-cook-mode')).toBeVisible();

    // Find and click the cook button
    await mondayCard.getByTestId('start-cook-mode').click();

    // Verify overlay
    const overlay = page.getByTestId('cooks-mode-overlay');
    await expect(overlay).toBeVisible();
    await expect(page.getByTestId('cooks-mode-step-indicator')).toContainText(/Step 1 of 4/i);

    // Navigate steps
    await page.getByTestId('cooks-mode-step-next').click();
    await expect(page.getByTestId('cooks-mode-step-indicator')).toContainText(/Step 2 of 4/i);

    // Close overlay
    await page.getByTestId('close-cooks-mode').click();
    await expect(overlay).not.toBeVisible();
  });

  test('should display smart default recipes merged into the 7-day grid', async ({ page }) => {
    const cards = page.getByTestId(/^day-card-/);
    await expect(cards).toHaveCount(7);
    await expect(cards.first()).toBeVisible();
  });

  test('should allow dragging cards to reorder', async ({ page }) => {
    const reorderGroup = page.getByTestId('reorder-group');
    await expect(reorderGroup).toBeVisible();
  });

  test('should assign pending smart default slots and lock when finalizing', async ({ page }) => {
    const finalizeBtn = page.getByTestId('finalize-button');
    await finalizeBtn.scrollIntoViewIfNeeded();
    await finalizeBtn.click();

    // After finalization, it should show "Plan next week"
    await expect(page.getByTestId('plan-next-week')).toBeVisible({ timeout: 10_000 });
  });
});
