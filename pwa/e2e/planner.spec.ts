import { test, expect } from './fixtures';
import { MOCK_IDS, builders, currentMonday, toDateStr, setupCommonRoutes } from './mock-api';

// Compute current week's Monday at noon UTC — avoids timezone rollback

test.describe('Supper Planner', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await setupCommonRoutes(page);

    // Override semantic search so the recipes page can render a Top Pick during planner handoff.
    await page.route('**/api/recipes/search', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            topPick: {
              id: MOCK_IDS.RECIPE_LASAGNA,
              name: 'Homemade Lasagna',
              imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
              totalTime: '45 min',
              rating: 3,
              isDiscoverable: true,
              notes: null,
              reasons: [{ source: 'name-match', label: 'Name matches your search' }],
              plannerFitNote: 'Not yet planned this week',
            },
            results: [],
            appliedFilters: {},
            searchMode: 'standard',
            resultPath: 'lexical-only',
          },
        }),
      });
    });

    await page.route('**/api/recipes/*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            recipe: builders.recipe({
              id: MOCK_IDS.RECIPE_LASAGNA,
              name: 'Homemade Lasagna',
              description: 'A classic family lasagna.',
              imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
              totalTime: '45 min',
              rating: 3,
              ingredients: ['Pasta', 'Beef', 'Tomato', 'Cheese'],
              notes: 'Family favorite.',
            }),
          }),
        });
        return;
      }

      await route.fallback();
    });

    const baseUrl = baseURL || 'http://127.0.0.1:3000';

    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);

    // Set localStorage before first navigation
    await page.addInitScript((id) => {
      localStorage.setItem(
        'family-storage',
        JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 })
      );
    }, MOCK_IDS.MEMBER_ALEX);

    const monday = currentMonday();
    const pinnedDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setUTCDate(monday.getUTCDate() + i);
      return toDateStr(d);
    });

    let isLocked = false;

    // Single intercept covering all schedule calls — zero Prism dependency
    await page.route(
      (url) => url.pathname.includes('/api/schedule'),
      async (route) => {
        const url = route.request().url();
        const method = route.request().method();

        if (method !== 'GET') {
          isLocked = true;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: { message: 'ok' } }),
          });
          return;
        }

        if (url.includes('smart-defaults')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                weekOffset: 0,
                familySize: 3,
                consensusThreshold: 2,
                preSelectedRecipes: [
                  {
                    recipeId: MOCK_IDS.RECIPE_CARBONARA,
                    name: 'Zesty Lemon Chicken',
                    heroImageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
                    voteCount: 2,
                    familySize: 3,
                    unanimousVote: false,
                    dayIndex: 3,
                    isLocked: false,
                  },
                  {
                    recipeId: MOCK_IDS.RECIPE_STIR_FRY,
                    name: 'Ginger Beef Stir Fry',
                    heroImageUrl: 'https://images.unsplash.com/photo-1559847844-5315695dadae',
                    voteCount: 3,
                    familySize: 3,
                    unanimousVote: true,
                    dayIndex: 4,
                    isLocked: false,
                  },
                  {
                    recipeId: MOCK_IDS.RECIPE_TACOS,
                    name: 'Street Tacos',
                    heroImageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47',
                    voteCount: 2,
                    familySize: 3,
                    unanimousVote: false,
                    dayIndex: 5,
                    isLocked: false,
                  },
                ],
                openSlots: [],
                consensusRecipesCount: 1,
                isVotingOpen: false,
              },
            }),
          });
          return;
        }

        // Default GET /api/schedule
        const monday = currentMonday();
        const days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(monday);
          d.setUTCDate(monday.getUTCDate() + i);
          return {
            day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
            date: toDateStr(d),
            ...(i === 0
              ? {
                  recipe: builders.scheduleRecipe({
                    id: MOCK_IDS.RECIPE_LASAGNA,
                    name: 'Homemade Lasagna',
                    voteCount: 3,
                    ingredients: ['Pasta', 'Beef', 'Tomato', 'Cheese'],
                  }),
                }
              : {}),
          };
        });

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              weekOffset: 0,
              locked: isLocked,
              status: isLocked ? 2 : 0,
              days,
            },
          }),
        });
      }
    );

    await page.goto('/planner');
    await expect(page.getByTestId('day-card-0')).toBeVisible({ timeout: 10_000 });
  });

  test('should display the planner navigation and segmented control', async ({ page }) => {
    await expect(page.getByTestId('planner-tab')).toBeVisible();
    await expect(page.getByTestId('grocery-tab')).toBeVisible();
    await expect(page.getByTestId('planner-action-row')).toBeVisible();
    await expect(
      page.getByTestId('planner-action-row').getByTestId('ask-family-cta')
    ).toBeVisible();
    await expect(
      page.getByTestId('planner-action-row').getByTestId('planned-count-badge')
    ).toBeVisible();
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

    await expect(page.getByTestId('planner-this-week-pill')).toBeVisible();
    await expect(page.getByTestId('planner-this-week-pill')).toContainText('Back to this week');
    await page.getByTestId('planner-this-week-pill').click();

    await expect(page.getByTestId('week-range')).toContainText('This week', { timeout: 10_000 });
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
    await expect(page.getByTestId('pivot-ask-family')).toHaveCount(0);
  });

  test('should complete the search-to-planner round-trip with success feedback', async ({
    page,
  }) => {
    // 1. Open pivot sheet for an unplanned day — Wednesday (index 2) has no smart default
    const targetCard = page.getByTestId('day-card-2');
    await targetCard.getByTestId('plan-meal-button').click();

    // 2. Click "Search library"
    await page.getByTestId('pivot-search-library').click();
    await expect(page).toHaveURL(/\/recipes\?addToDay=2&weekOffset=0/);

    // 3. Verify Planning Mode banner
    await expect(page.getByTestId('planning-mode-banner')).toBeVisible();

    // 4. Open the Top Pick detail sheet and confirm planner CTA
    await page.getByTestId('recipe-card-top-pick').click();
    await expect(page.getByTestId('action-add-to-day')).toBeVisible();
    await page.getByTestId('action-add-to-day').click();

    // 5. Verify redirect back to planner with success params
    await page.waitForURL(/\/planner\?success=1&dayIndex=2/);
    await expect(page).toHaveURL(/\/planner\?success=1&dayIndex=2/);

    // 6. Verify success feedback (ring) on the card
    await expect(targetCard).toHaveClass(/ring-sage/, { timeout: 10_000 });
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
    await expect(page.getByTestId('cooks-mode-step-indicator')).toContainText(/Check & Prep/i);
    await expect(page.getByTestId('cooks-mode-step-next')).toContainText(/Let's Cook/i);

    // Navigate steps
    await page.getByTestId('cooks-mode-step-next').click();
    await expect(page.getByText(/Chop the onions and mince the garlic/i).first()).toBeVisible();
    await expect(page.getByTestId('cooks-mode-step-indicator')).toContainText(/\d+ \/ \d+/i);

    await page.getByTestId('cooks-mode-step-next').click();
    await expect(page.getByText(/Saute until golden and fragrant/i).first()).toBeVisible();
    await expect(page.getByTestId('cooks-mode-step-indicator')).toContainText(/\d+ \/ \d+/i);

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
    // 1. Open voting to surface smart defaults (1 manual + 3 smart = 4 planned)
    // The finalize button requires plannedCount >= 4.
    await page.getByTestId('ask-family-cta').click();

    const finalizeBtn = page.getByTestId('finalize-button');
    await expect(finalizeBtn).toBeVisible({ timeout: 10_000 });
    await finalizeBtn.scrollIntoViewIfNeeded();
    await finalizeBtn.click();

    await expect(page.getByTestId('finalized-status')).toBeVisible({ timeout: 15_000 });
  });

  test('should SHOW Cook Mode button and OPEN even if recipe image is missing', async ({
    page,
  }) => {
    // We must use a date that matches the browser's fixed clock (2026-05-04)
    const todayStr = toDateStr(currentMonday());

    await page.route(
      (url) => url.pathname === '/api/schedule',
      async (route) => {
        const monday = currentMonday();
        const days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(monday);
          d.setUTCDate(monday.getUTCDate() + i);
          const dateStr = toDateStr(d);
          return {
            day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
            date: dateStr,
            ...(dateStr === todayStr
              ? {
                  recipe: builders.scheduleRecipe({
                    id: MOCK_IDS.RECIPE_LASAGNA,
                    name: 'No Image Lasagna',
                    image: '', // Missing image
                  }),
                }
              : {}),
          };
        });

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              weekOffset: 0,
              locked: false,
              status: 0,
              days,
            },
          }),
        });
      }
    );

    await page.goto('/planner');

    // Find today's card (might not be index 2 depending on the current day)
    const startCookButton = page.getByTestId('start-cook-mode');
    await expect(startCookButton).toBeVisible();
    await startCookButton.click();

    // Wait for loader to disappear and overlay to appear
    await expect(page.getByTestId('cooks-mode-loading')).not.toBeVisible({ timeout: 10_000 });
    const overlay = page.getByTestId('cooks-mode-overlay');
    await expect(overlay).toBeVisible();
    await expect(overlay.getByText(/No Image Lasagna/i)).toBeVisible();
  });
});
