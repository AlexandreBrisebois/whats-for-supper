import { test, expect } from '@playwright/test';

test.describe('Planner Social Coordination', () => {
  test.beforeEach(async ({ page }) => {
    // Mock identity to bypass onboarding redirect
    await page.addInitScript(() => {
      document.cookie = 'x-family-member-id=550e8400-e29b-41d4-a716-446655440001; path=/';
    });

    // Mock family members API for IdentityValidator
    await page.route('**/api/family', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [{ id: '550e8400-e29b-41d4-a716-446655440001', name: 'Test Member' }],
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Setup: Intercept API calls to mock schedule and voting status
    await page.route('**/api/schedule*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            weekOffset: 0,
            locked: false,
            status: 0, // Draft
            days: [
              {
                day: 'Mon',
                date: '2026-04-20',
                recipe: {
                  id: 'recipe-1',
                  name: 'Pasta Carbonara',
                  image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
                  voteCount: 2,
                },
              },
              { day: 'Tue', date: '2026-04-21' },
              { day: 'Wed', date: '2026-04-22' },
              { day: 'Thu', date: '2026-04-23' },
              { day: 'Fri', date: '2026-04-24' },
              { day: 'Sat', date: '2026-04-25' },
              { day: 'Sun', date: '2026-04-26' },
            ],
          },
        }),
      });
    });

    await page.goto('/planner');
  });

  test('Verify Nudge Family button triggers Web Share', async ({ page }) => {
    // 1. Open voting first
    await page.route('**/api/schedule/voting/open*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { message: 'Voting opened' } }),
      });
    });

    // Mock the updated schedule with status: 1 (VotingOpen)
    await page.route('**/api/schedule*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            data: {
              weekOffset: 0,
              locked: false,
              status: 1, // VotingOpen
              days: [
                {
                  day: 'Mon',
                  date: '2026-04-20',
                  recipe: { id: 'recipe-1', name: 'Pasta Carbonara', image: '...', voteCount: 2 },
                },
                { day: 'Tue', date: '2026-04-21' },
                { day: 'Wed', date: '2026-04-22' },
                { day: 'Thu', date: '2026-04-23' },
                { day: 'Fri', date: '2026-04-24' },
                { day: 'Sat', date: '2026-04-25' },
                { day: 'Sun', date: '2026-04-26' },
              ],
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.click('[data-testid="ask-family-cta"]');

    // 2. Open Pivot Sheet for a day
    await page.click('[data-testid="day-card-0"]');

    // 3. Check for Nudge button
    const nudgeButton = page.locator('[data-testid="pivot-nudge-family"]');
    await expect(nudgeButton).toBeVisible();

    // 4. Mock navigator.share and verify it's called
    await page.evaluate(() => {
      (window.navigator as any).share = async (data: any) => {
        (window as any).shareData = data;
      };
    });

    await nudgeButton.click();

    const shareData = await page.evaluate(() => (window as any).shareData);
    expect(shareData.text).toContain("Help us choose what's for supper!");
  });

  test('Verify Remove action updates grid immediately', async ({ page }) => {
    await page.route('**/api/schedule/day/*/remove', async (route) => {
      await route.fulfill({ status: 204 });
    });

    // 1. Open Pivot Sheet for the day with a recipe
    await page.click('[data-testid="day-card-0"]');

    // 2. Click Remove
    const removeButton = page.locator('[data-testid="pivot-remove-recipe"]');
    await expect(removeButton).toBeVisible();
    await removeButton.click();

    // 3. Verify grid is updated (recipe name should be gone or replaced by placeholder)
    const cardContent = page.locator('[data-testid="day-card-0"]');
    await expect(cardContent).not.toContainText('Pasta Carbonara');

    // 4. Verify success ring animation triggered
    const successRing = page.locator('[data-testid="success-ring"]');
    await expect(successRing).toBeVisible();
  });
});
