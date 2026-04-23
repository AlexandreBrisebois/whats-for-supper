import { test, expect } from '@playwright/test';

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
  });

  test('should display the planner navigation and segmented control', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'Planner' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Grocery list' })).toBeVisible();
  });

  test('should display 7 daily cards', async ({ page }) => {
    const cards = page.locator('[data-testid^="day-card-"]');
    await expect(cards).toHaveCount(7);
  });

  test('should flip weeks when clicking chevrons', async ({ page }) => {
    const initialDateRange = await page.locator('[data-testid="week-range"]').textContent();
    await page.locator('[data-testid="next-week"]').click();

    // Wait for the animation/transition
    await page.waitForTimeout(500);

    const nextDateRange = await page.locator('[data-testid="week-range"]').textContent();
    expect(initialDateRange).not.toBe(nextDateRange);
  });

  test('should open the planning pivot sheet when clicking "+" on an unplanned day', async ({
    page,
  }) => {
    // Assuming Tuesday is unplanned in our mock
    const tuesdayCard = page.locator('[data-testid="day-card-1"]');
    await tuesdayCard.getByRole('button', { name: /Plan a meal/i }).click();

    await expect(page.locator('[data-testid="pivot-sheet"]')).toBeVisible();
    await expect(page.getByText('Quick find')).toBeVisible();
    await expect(page.getByText('Search library')).toBeVisible();
    await expect(page.getByText('Ask the family')).toBeVisible();
  });

  test('should finalize the weekly plan', async ({ page }) => {
    const finalizeBtn = page.getByRole('button', { name: /Declare complete/i });
    await finalizeBtn.scrollIntoViewIfNeeded();
    await finalizeBtn.click();

    // After finalizing, the button should change or show a success state
    await expect(page.getByText(/Plan next week/i)).toBeVisible();
  });

  test('should complete the search-to-planner round-trip with success feedback', async ({
    page,
  }) => {
    // 1. Open pivot sheet for Tuesday (Day 1)
    const tuesdayCard = page.locator('[data-testid="day-card-1"]');
    await tuesdayCard.getByRole('button', { name: /PLAN A MEAL/i }).click();

    // 2. Click "Search library"
    await page.getByText('Search library').click();
    await expect(page).toHaveURL(/\/recipes\?addToDay=1&weekOffset=0/);

    // 3. Verify Planning Mode banner
    await expect(page.getByText('Planning Mode')).toBeVisible();

    // 4. Select "Homemade Lasagna" (Top Pick)
    await page.getByRole('heading', { name: /Homemade Lasagna/i }).click();

    // 5. Verify redirect back to planner with success params
    await expect(page).toHaveURL(/\/planner\?success=1&dayIndex=1/);

    // 6. Verify success feedback (ring/pulse) on the card
    await expect(tuesdayCard.getByText('Homemade Lasagna')).toBeVisible();
    await expect(tuesdayCard.locator('.glass')).toHaveClass(/ring-sage/);
  });

  test('should show Solar Loader when flipping weeks', async ({ page }) => {
    // Click next week
    await page.locator('[data-testid="next-week"]').click();

    // Solar Loader should appear
    const loader = page.getByText('Curating your week...');
    await expect(loader).toBeVisible();
  });

  test('should trigger Cook Mode from today card and navigate steps', async ({ page }) => {
    // Thu 23 is Today in our mock (dayIndex 3)
    const todayCard = page.locator('[data-testid="day-card-3"]');

    // Assign a recipe first
    await todayCard.getByRole('button', { name: /Plan a meal/i }).click();
    await page.getByText('Quick find').click();
    await page.getByRole('button', { name: 'Select' }).click();

    // Trigger Cook's Mode
    const startCookingBtn = todayCard.getByRole('button', { name: /Start Cooking/i }).first();
    await startCookingBtn.click();

    // Verify overlay using the new data-testid
    const overlay = page.getByTestId('cooks-mode-overlay');
    await expect(overlay).toBeVisible();
    await expect(overlay.getByText(/Step 1 of 4/i)).toBeVisible();

    // Navigate steps - using exact: true to avoid matching "Plan next week"
    await overlay.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(overlay.getByText(/Step 2 of 4/i)).toBeVisible();

    // Close overlay
    await page.getByTestId('close-cooks-mode').click();
    await expect(overlay).not.toBeVisible();
  });
});
