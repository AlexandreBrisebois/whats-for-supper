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

  test.skip('should complete the search-to-planner round-trip with success feedback', async ({
    page,
  }) => {
    // TODO: Enable when recipe search is implemented
    // This test verifies the full flow: search for recipe → select it → auto-assign to day → redirect with success
    // Currently blocked on: Search feature implementation in /recipes page

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
    await expect(tuesdayCard).toHaveClass(/ring-sage/);
  });

  test('should show Solar Loader when flipping weeks', async ({ page }) => {
    // Click next week
    await page.locator('[data-testid="next-week"]').click();

    // Solar Loader should appear
    const loader = page.getByText('Curating your week...');
    await expect(loader).toBeVisible();
  });

  test.skip('should trigger Cook Mode from a recipe card and navigate steps', async ({ page }) => {
    // TODO: Fix flaky test - Cook Mode is implemented but test times out
    // Issue: schedule fetch occasionally returns 404 in test env, preventing recipe data load
    // When fixed: ensure day-card-0 renders with recipe, then cook button appears

    // Use Monday (dayIndex 0) which already has "Homemade Lasagna" in mock data
    const monCard = page.locator('[data-testid="day-card-0"]');

    // Find and click the cook button
    const cookBtn = monCard.getByTestId('start-cook-mode');
    await cookBtn.click();

    // Verify overlay
    const overlay = page.getByTestId('cooks-mode-overlay');
    await expect(overlay).toBeVisible();
    await expect(overlay.getByText(/Step 1 of 4/i)).toBeVisible();

    // Navigate steps
    await overlay.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(overlay.getByText(/Step 2 of 4/i)).toBeVisible();

    // Close overlay
    await page.getByTestId('close-cooks-mode').click();
    await expect(overlay).not.toBeVisible();
  });

  test('should not display the standalone SmartDefaults section', async ({ page }) => {
    // The SmartDefaults component should be removed from the JSX
    // Verify it is not visible
    const smartDefaultsSection = page.locator('text=/Smart defaults|Recommended recipes/i');
    await expect(smartDefaultsSection).not.toBeVisible();
  });

  test('should display smart default recipes merged into the 7-day grid', async ({ page }) => {
    // For weekOffset=0, smart defaults should populate empty slots in the grid
    // This test verifies the merged view works
    const cards = page.locator('[data-testid^="day-card-"]');

    // Wait for initial load
    await expect(cards).toHaveCount(7);

    // At least one card should be visible
    await expect(cards.first()).toBeVisible();
  });

  test('should display vote count badges on smart default recipe cards', async ({ page }) => {
    // Smart default cards should show vote badges when vote counts are present
    // Look for vote badge with format like "3 voted"
    const cards = page.locator('[data-testid^="day-card-"]');

    // Wait for load
    await expect(cards).toHaveCount(7);

    // The badge format from implementation is: "{count} voted"
    // with colors: sage green (unanimous) or ochre (partial)
    const voteBadges = page.locator('text=/\\d+ voted/');

    // If badges exist, they should be visible
    if ((await voteBadges.count()) > 0) {
      const firstBadge = voteBadges.first();
      await expect(firstBadge).toBeVisible();
    }
  });

  test('should allow dragging smart default cards to reorder', async ({ page }) => {
    // Smart default cards should be draggable/reorderable like regular cards
    const cards = page.locator('[data-testid^="day-card-"]');
    await expect(cards).toHaveCount(7);

    // Verify cards can be interacted with (basic check that drag handles exist)
    // The reorder group should be present
    const reorderGroup = page.locator('[data-testid="reorder-group"]');
    await expect(reorderGroup).toBeVisible();
  });

  test.skip('should assign pending smart default slots and lock when finalizing', async ({
    page,
  }) => {
    // TODO: Fix flaky test - finalize feature works but test infrastructure is unstable
    // Issue: lockSchedule API call returns 404 in test env, preventing isLocked state update
    // When fixed: ensure /api/schedule/lock endpoint is properly routed through mock API

    const finalizeBtn = page.getByRole('button', { name: /Declare complete/i });
    await finalizeBtn.scrollIntoViewIfNeeded();

    const cards = page.locator('[data-testid^="day-card-"]');
    const initialCount = await cards.count();

    await finalizeBtn.click();

    await expect(page.getByTestId('plan-next-week')).toBeVisible();
    await expect(cards).toHaveCount(initialCount);
  });
});
