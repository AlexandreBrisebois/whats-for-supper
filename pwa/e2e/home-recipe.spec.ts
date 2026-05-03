import { test, expect } from './fixtures';
import { MOCK_IDS, builders, setupCommonRoutes, toDateStr } from './mock-api';

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

  // B5: "Order In" with no recipe writes status:3 to backend and hides pivot card
  test('"Order In" with no recipe writes status:3 and hides pivot card', async ({ page }) => {
    // Empty schedule — no recipe for today
    await page.route(/\/(?:backend\/)?api\/schedule(?:\?.*)?$/, async (route) => {
      if (route.request().url().includes('weekOffset=0') && route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { weekOffset: 0, days: [] } }),
        });
      } else {
        await route.continue();
      }
    });

    // Capture validate call
    let validateBody: unknown = null;
    await page.route(/\/(?:backend\/)?api\/schedule\/day\/.*\/validate/, async (route) => {
      validateBody = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto('/home');

    // Pivot card is visible with no recipe
    await expect(page.getByTestId('tonight-pivot-card')).toBeVisible();

    // Tap "Order In"
    await page.getByTestId('order-in-btn').click();

    // Backend write must have fired with status: 3
    await expect.poll(() => validateBody).toMatchObject({ status: 3 });

    // Pivot card must disappear for the session
    await expect(page.getByTestId('tonight-pivot-card')).not.toBeVisible({ timeout: 3000 });
  });

  // B6: "Order In" with a recipe opens SkipRecoveryDialog before any state change
  test('"Order In" with recipe opens SkipRecoveryDialog before committing', async ({ page }) => {
    // Schedule with a planned recipe for today
    const today = new Date().toISOString().split('T')[0];
    await page.route(/\/(?:backend\/)?api\/schedule(?:\?.*)?$/, async (route) => {
      if (route.request().url().includes('weekOffset=0') && route.request().method() === 'GET') {
        const days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          const day = d.getUTCDay();
          const offset = day === 0 ? -6 : 1 - day;
          d.setUTCDate(d.getUTCDate() + offset + i);
          const dateStr = d.toISOString().split('T')[0];
          return {
            date: dateStr,
            status: 0,
            recipe:
              dateStr === today
                ? {
                    data: builders.scheduleRecipe({
                      id: MOCK_IDS.RECIPE_LASAGNA,
                      name: 'Test Lasagna',
                    }),
                  }
                : null,
          };
        });
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { weekOffset: 0, days } }),
        });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      }
    });

    // Ensure validate is NOT called before dialog confirmation
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

    // Wait for loader to clear and menu card to appear (recipe is planned)
    await expect(page.getByTestId('home-loader')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible();

    // Flip the card to reveal the back face (skip button is on the back)
    await page.getByTestId('tonight-menu-card').click();

    // Wait for flip animation to complete, then click skip
    await page.waitForTimeout(600);
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="skip-tonight-btn"]') as HTMLElement;
      btn?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    // Recovery dialog must open
    await expect(page.getByTestId('recovery-dialog-title')).toBeVisible();

    // No backend write yet
    expect(validateCalled).toBe(false);
  });

  // B5 + reload: page reload after "Order In" (no recipe) does not show pivot card
  test('Page reload after "Order In" (no recipe) does not show pivot card', async ({ page }) => {
    const today = new Date().toISOString().split('T')[0];

    // Track whether "Order In" has been tapped so we can switch the schedule response
    let orderInDone = false;

    await page.route(/\/(?:backend\/)?api\/schedule(?:\?.*)?$/, async (route) => {
      if (route.request().url().includes('weekOffset=0') && route.request().method() === 'GET') {
        if (!orderInDone) {
          // Before "Order In": empty schedule
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: { weekOffset: 0, days: [] } }),
          });
        } else {
          // After "Order In": return status:3 for today (simulates server state after write)
          const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            const day = d.getUTCDay();
            const offset = day === 0 ? -6 : 1 - day;
            d.setUTCDate(d.getUTCDate() + offset + i);
            const dateStr = d.toISOString().split('T')[0];
            return { date: dateStr, status: dateStr === today ? 3 : 0, recipe: null };
          });
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: { weekOffset: 0, days } }),
          });
        }
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      }
    });

    await page.route(/\/(?:backend\/)?api\/schedule\/day\/.*\/validate/, async (route) => {
      orderInDone = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto('/home');

    // Wait for loader to clear, then pivot card should be visible (empty schedule, no recipe)
    await expect(page.getByTestId('home-loader')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('tonight-pivot-card')).toBeVisible();

    // Tap "Order In" with no recipe
    await page.getByTestId('order-in-btn').click();
    await expect(page.getByTestId('tonight-pivot-card')).not.toBeVisible({ timeout: 3000 });

    // Reload — server now returns status:3 for today
    await page.reload();
    await expect(page.getByTestId('home-loader')).not.toBeVisible({ timeout: 5000 });

    // Pivot card must NOT reappear after reload
    await expect(page.getByTestId('tonight-pivot-card')).not.toBeVisible();
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
