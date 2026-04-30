import { test, expect } from './fixtures';
import { MOCK_IDS, builders } from './mock-api';

test.describe('Home Command Center — Recovery Flow', () => {
  test.beforeEach(async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';

    // x-family-member-id is still needed for store persistence
    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);

    // Mock API responses BEFORE goto
    await page.route(/\/(?:backend\/)?api\/family/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [builders.familyMember({ name: 'Alex' })] }),
      });
    });

    // Visit a page to initialize the domain context for localStorage
    await page.goto('/onboarding');
    await page.evaluate((id) => {
      localStorage.setItem(
        'family-storage',
        JSON.stringify({
          state: {
            selectedFamilyMemberId: id,
            familyMembers: [{ id, name: 'Alex' }],
            _hasHydrated: true,
            hasLoaded: true,
          },
          version: 0,
        })
      );
    }, MOCK_IDS.MEMBER_ALEX);

    let currentStatus = 0; // Planned

    await page.route(/\/(?:backend\/)?api\/schedule\?weekOffset=0/, async (route) => {
      const today = new Date().toISOString().split('T')[0];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            weekOffset: 0,
            locked: false,
            days: [
              {
                date: today,
                status: currentStatus,
                recipe: builders.scheduleRecipe({
                  id: MOCK_IDS.RECIPE_LASAGNA,
                  name: 'Test Lasagna',
                  image: `/api/recipes/${MOCK_IDS.RECIPE_LASAGNA}/hero`,
                  ingredients: ['Pasta', 'Cheese', 'Sauce'],
                }),
              },
            ],
          },
        }),
      });
    });

    await page.route(/\/(?:backend\/)?api\/schedule\/day\/.*\/validate/, async (route) => {
      const body = route.request().postDataJSON();
      currentStatus = body.status;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.route(/\/(?:backend\/)?api\/schedule\/move/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto('/home');
  });

  test('Flip card reveals ingredients', async ({ page }) => {
    const card = page.getByTestId('tonight-menu-card');
    await expect(card).toBeVisible();

    // Click and wait for rotation
    await card.click();
    await page.waitForTimeout(500); // Wait for spring animation

    // Use a more relaxed check if backface-visibility is causing issues
    await expect(page.getByTestId('ingredients-info-title')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('skip-tonight-btn')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('cooked-btn')).toBeVisible({ timeout: 5000 });
  });

  test('Skip tonight -> Tomorrow shifts calendar', async ({ page }) => {
    const card = page.getByTestId('tonight-menu-card');
    await card.click();

    await page.getByTestId('skip-tonight-btn').click();
    await expect(page.getByTestId('recovery-dialog-title')).toBeVisible();

    await page.getByTestId('recovery-action-order-in').click();
    await expect(page.getByTestId('recovery-dialog-title')).toBeVisible();

    const moveResponse = page.waitForResponse(
      (resp) => resp.url().includes('/api/schedule/move') && resp.request().method() === 'POST'
    );
    await page.getByTestId('recovery-action-tomorrow').click();
    await moveResponse;

    await expect(page.getByTestId('smart-pivot-card')).toBeVisible();
  });

  test('Skip tonight -> Next Week moves recipe', async ({ page }) => {
    const card = page.getByTestId('tonight-menu-card');
    await card.click();

    await page.getByTestId('skip-tonight-btn').click();
    await page.getByTestId('recovery-action-order-in').click();

    await expect(page.getByTestId('recovery-dialog-title')).toBeVisible();

    const moveResponse = page.waitForResponse((resp) => {
      if (!resp.url().includes('/api/schedule/move') || resp.request().method() !== 'POST')
        return false;
      const body = resp.request().postDataJSON();
      return body.intent === 'push' && body.targetWeekOffset === 1;
    });

    await page.getByTestId('recovery-action-next-week').click();
    await moveResponse;

    await expect(page.getByTestId('smart-pivot-card')).toBeVisible();
  });

  test('Mark as cooked shows success card', async ({ page }) => {
    const card = page.getByTestId('tonight-menu-card');
    await card.click();

    const validateResponse = page.waitForResponse(
      (resp) => resp.url().includes('/validate') && resp.request().method() === 'POST'
    );
    await page.getByTestId('cooked-btn').click();
    await validateResponse;

    await expect(page.getByTestId('cooked-success-card')).toBeVisible();
    await expect(page.getByTestId('cooked-success-title')).toBeVisible();

    await page.getByTestId('cooked-success-dismiss').click();
    await expect(page.getByTestId('cooked-success-card')).not.toBeVisible();
    await expect(page.getByTestId('smart-pivot-card')).toBeVisible();
  });
});
