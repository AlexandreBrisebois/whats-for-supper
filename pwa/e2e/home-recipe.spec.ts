import { test, expect } from './fixtures';
import { MOCK_IDS, builders, setupCommonRoutes } from './mock-api';

test.describe('Home Command Center — Planned Recipe Flow', () => {
  test.beforeEach(async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);

    await setupCommonRoutes(page);

    // Hydrate store
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
  });

  test('Shows tonight menu card when recipe is planned', async ({ page }) => {
    // 1. Mock schedule with a planned recipe for today
    await page.route(/\/(?:backend\/)?api\/schedule\?weekOffset=0/, async (route) => {
      if (route.request().method() === 'GET') {
        const today = new Date().toISOString().split('T')[0];
        // Use builders to ensure contract compliance
        const days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          // Monday offset logic matching mock-api.ts
          const day = d.getUTCDay();
          const offset = day === 0 ? -6 : 1 - day;
          d.setUTCDate(d.getUTCDate() + offset + i);
          const dateStr = d.toISOString().split('T')[0];

          return {
            date: dateStr,
            status: 0,
            recipe: {
              data: builders.scheduleRecipe({
                id: MOCK_IDS.RECIPE_LASAGNA,
                name: 'Test Lasagna',
                image: `/api/recipes/${MOCK_IDS.RECIPE_LASAGNA}/hero`,
              }),
            },
          };
        });

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { weekOffset: 0, days } }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/home');

    // Wait for loader to disappear
    await expect(page.getByTestId('home-loader')).not.toBeVisible();

    // Verify Menu Card is shown
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Test Lasagna' }).first()).toBeVisible();
  });

  test('Completing Cook Mode marks meal as cooked', async ({ page }) => {
    // 1. Mock schedule with planned recipe
    await page.route(/\/api\/schedule/, async (route) => {
      if (route.request().method() === 'GET') {
        const today = new Date().toISOString().split('T')[0];
        const days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          const day = d.getUTCDay();
          const offset = day === 0 ? -6 : 1 - day;
          d.setUTCDate(d.getUTCDate() + offset + i);
          const dateStr = d.toISOString().split('T')[0];

          return {
            date: dateStr,
            status: 0,
            recipe: {
              data: builders.scheduleRecipe({
                id: MOCK_IDS.RECIPE_LASAGNA,
                name: 'Test Lasagna',
              }),
            },
          };
        });

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { weekOffset: 0, days } }),
        });
      } else {
        await route.continue();
      }
    });

    // 2. Mock validation API
    let validateCalled = false;
    await page.route(/\/(?:backend\/)?api\/schedule\/day\/.*\/validate/, async (route) => {
      validateCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto('/home');
    await page.getByTestId('tonight-menu-card').click();
    await page.getByTestId('cook-mode-btn').click();

    // Step through Cook's Mode
    const nextBtn = page.getByTestId('cooks-mode-step-next');

    // Click Next until "Done"
    for (let i = 0; i < 5; i++) {
      const text = await nextBtn.textContent();
      if (text?.toLowerCase().includes('done')) break;
      await nextBtn.click();
    }

    await nextBtn.click(); // Click "Done"

    // Verify implicit cooked call
    await expect.poll(() => validateCalled).toBe(true);

    // Verify Success Card
    await expect(page.getByTestId('cooked-success-card')).toBeVisible();
  });
});
