import { test, expect } from './fixtures';
import { MOCK_IDS, builders, currentMonday, toDateStr } from './mock-api';

// ADR-029: Compute the Monday of the current week at noon UTC — avoids timezone rollback

function buildWeekDays(mondayRecipe?: object) {
  const monday = currentMonday();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    return {
      day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      date: toDateStr(d),
      ...(i === 0 && mondayRecipe ? { recipe: mondayRecipe } : {}),
    };
  });
}

const MONDAY_RECIPE = {
  data: builders.scheduleRecipe({
    id: MOCK_IDS.RECIPE_CARBONARA,
    name: 'Pasta Carbonara',
    voteCount: 2,
  }),
};

test.describe('Planner Social Coordination', () => {
  test.beforeEach(async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';

    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);

    // Inject localStorage before navigation to ensure the store is hydrated immediately (ADR-029)
    await page.addInitScript((id) => {
      localStorage.setItem(
        'family-storage',
        JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 })
      );
    }, MOCK_IDS.MEMBER_ALEX);

    await page.route(/\/(?:backend\/)?api\/family/, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [builders.familyMember({ name: 'Test Member' })] }),
        });
      } else {
        await route.continue();
      }
    });

    // Base schedule intercept — Draft, not locked
    await page.route(/\/(?:backend\/)?api\/schedule(?:\?|$)/, async (route) => {
      const url = route.request().url();
      if (route.request().method() !== 'GET') {
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
            data: { weekOffset: 0, preSelectedRecipes: [], isVotingOpen: false },
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { weekOffset: 0, locked: false, status: 0, days: buildWeekDays(MONDAY_RECIPE) },
        }),
      });
    });

    await page.goto('/planner');
    await expect(page.getByTestId('day-card-0')).toBeVisible({ timeout: 10_000 });
  });

  test('Verify Nudge Family button triggers Web Share', async ({ page }) => {
    // 1. Mock voting endpoints for this test
    await page.route(/\/(?:backend\/)?api\/schedule\/voting\/open/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: {} }),
      });
    });

    // When voting is opened, the UI will re-fetch or transition. We stub the subsequent GET to reflect status: 1
    await page.route(/\/(?:backend\/)?api\/schedule(?:\?|$)/, async (route) => {
      const url = route.request().url();
      if (route.request().method() !== 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: {} }),
        });
        return;
      }
      if (url.includes('smart-defaults')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { isVotingOpen: true } }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { weekOffset: 0, locked: false, status: 1, days: buildWeekDays(MONDAY_RECIPE) },
        }),
      });
    });

    // 2. Click header "Ask the Family"
    await expect(page.getByTestId('ask-family-cta')).toBeVisible({ timeout: 10_000 });
    await page.click('[data-testid="ask-family-cta"]');

    // 3. Open Pivot Sheet for a day
    await page.click('[data-testid="day-card-0"]');

    // 4. Verify Nudge button appears
    const nudgeButton = page.locator('[data-testid="pivot-nudge-family"]');
    await expect(nudgeButton).toBeVisible({ timeout: 5_000 });

    // 5. Mock navigator.share
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
    await page.route(/\/(?:backend\/)?api\/schedule\/day\/.*\/remove/, async (route) => {
      await route.fulfill({ status: 204 });
    });

    // 1. Open Pivot Sheet for the day with a recipe
    await page.click('[data-testid="day-card-0"]');

    // 2. Click Remove
    const removeButton = page.locator('[data-testid="pivot-remove-recipe"]');
    await expect(removeButton).toBeVisible();
    await removeButton.click();

    // 3. Verify grid is updated
    const cardContent = page.locator('[data-testid="day-card-0"]');
    await expect(cardContent).not.toContainText('Pasta Carbonara');

    // 4. Verify success ring animation triggered
    const successRing = page.locator('[data-testid="success-ring"]');
    await expect(successRing).toBeVisible();
  });
});
