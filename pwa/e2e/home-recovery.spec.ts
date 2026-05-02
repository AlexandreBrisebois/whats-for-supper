import { test, expect } from './fixtures';
import { MOCK_IDS, builders } from './mock-api';
import type { Page } from '@playwright/test';

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

    // Settings mock — default: no GOTO configured (404)
    await page.route(/\/(?:backend\/)?api\/settings\/(.+)/, async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Not found' }),
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
    await expect(page.getByTestId('cook-mode-btn')).toBeVisible({ timeout: 5000 });
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

    await expect(page.getByTestId('tonight-pivot-card')).toBeVisible();
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

    await expect(page.getByTestId('tonight-pivot-card')).toBeVisible();
  });

  test('Mark as cooked shows success card', async ({ page }) => {
    const card = page.getByTestId('tonight-menu-card');
    await card.click();

    // Open Cook's Mode via the Cook button on the card back
    await expect(page.getByTestId('cook-mode-btn')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('cook-mode-btn').click();
    await expect(page.getByTestId('cooks-mode-overlay')).toBeVisible({ timeout: 5000 });

    // Step through to the last step and click Done — this triggers onCooked
    const validateResponse = page.waitForResponse(
      (resp) => resp.url().includes('/validate') && resp.request().method() === 'POST'
    );

    // Click Next until Done appears, then click Done
    const nextBtn = page.getByTestId('cooks-mode-step-next');
    let isDone = false;
    for (let i = 0; i < 10; i++) {
      const label = await nextBtn.textContent();
      if (label?.toLowerCase().includes('done')) {
        isDone = true;
        break;
      }
      await nextBtn.click();
      await page.waitForTimeout(200);
    }
    if (isDone) {
      await nextBtn.click();
    }

    await validateResponse;

    await expect(page.getByTestId('cooked-success-card')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('cooked-success-title')).toBeVisible();

    await page.getByTestId('cooked-success-dismiss').click();
    await expect(page.getByTestId('cooked-success-card')).not.toBeVisible();
    await expect(page.getByTestId('tonight-pivot-card')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// TonightPivotCard — GOTO flow tests
// These tests reach the pivot card by skipping tonight's recipe (proven path),
// then test the GOTO-specific actions and UI states.
// ---------------------------------------------------------------------------

test.describe('Home Command Center — GOTO Flow', () => {
  // Shared setup: planned recipe + settings mock, lands on TonightMenuCard.
  // Call skipTonight() to reach TonightPivotCard.
  async function setupWithRecipe(
    page: Page,
    gotoValue: { description: string; recipeId: string } | null = null,
    recipeStatus: 'ready' | 'pending' = 'ready'
  ) {
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';

    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);

    await page.route(/\/(?:backend\/)?api\/family/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [builders.familyMember({ name: 'Alex' })] }),
      });
    });

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

    let currentStatus = 0;

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

    await page.route(/\/(?:backend\/)?api\/schedule\/assign/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    // Settings mock
    await page.route(/\/(?:backend\/)?api\/settings\/(.+)/, async (route) => {
      if (gotoValue != null) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { key: 'family_goto', value: gotoValue } }),
        });
      } else {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Not found' }),
        });
      }
    });

    // Status mock
    if (gotoValue?.recipeId) {
      await page.route(
        new RegExp(`/(?:backend/)?api/recipes/${gotoValue.recipeId}/status`),
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                id: gotoValue.recipeId,
                status: recipeStatus,
              },
            }),
          });
        }
      );
    }

    await page.goto('/home');
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible({ timeout: 10_000 });
  }

  // Navigate from TonightMenuCard to TonightPivotCard via the "Tomorrow" skip path
  async function skipTonight(page: Page) {
    await page.getByTestId('tonight-menu-card').click();
    await page.getByTestId('skip-tonight-btn').click();
    await expect(page.getByTestId('recovery-dialog-title')).toBeVisible();

    // Step 1: click Order In to advance to step 2
    await page.getByTestId('recovery-action-order-in').click();
    await expect(page.getByTestId('recovery-dialog-title')).toBeVisible();

    // Step 2: click Tomorrow to move the recipe and show the pivot card
    const moveResponse = page.waitForResponse(
      (resp) => resp.url().includes('/api/schedule/move') && resp.request().method() === 'POST'
    );
    await page.getByTestId('recovery-action-tomorrow').click();
    await moveResponse;

    await expect(page.getByTestId('tonight-pivot-card')).toBeVisible({ timeout: 5_000 });
  }

  test('Confirm GOTO plans a meal', async ({ page }) => {
    await setupWithRecipe(page, {
      description: 'Our Family Spaghetti',
      recipeId: MOCK_IDS.RECIPE_LASAGNA,
    });
    await skipTonight(page);

    const assignRequest = page.waitForRequest(
      (req) => req.url().includes('/api/schedule/assign') && req.method() === 'POST'
    );

    await page.getByTestId('confirm-goto-btn').click();
    const req = await assignRequest;

    const body = req.postDataJSON();
    expect(body.recipeId).toBe(MOCK_IDS.RECIPE_LASAGNA);
  });

  test('Discover opens QuickFind modal', async ({ page }) => {
    await page.route(/\/(?:backend\/)?api\/recipes(?:\?|$|\/)/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], total: 0 }),
      });
    });

    await setupWithRecipe(page);
    await skipTonight(page);

    await page.getByTestId('discover-btn').click();
    await expect(page.getByTestId('quick-find-modal')).toBeVisible({ timeout: 5_000 });
  });

  test('Order In marks day as skipped', async ({ page }) => {
    await setupWithRecipe(page);
    await skipTonight(page);

    const validateRequest = page.waitForRequest(
      (req) => req.url().includes('/validate') && req.method() === 'POST'
    );

    await page.getByTestId('order-in-btn').click();
    const req = await validateRequest;

    const body = req.postDataJSON();
    expect(body.status).toBe(3);
  });

  test('No GOTO configured shows prompt and disables Confirm GOTO', async ({ page }) => {
    await setupWithRecipe(page, null); // null = no GOTO
    await skipTonight(page);

    await expect(page.getByTestId('confirm-goto-btn')).toBeDisabled();
    await expect(page.getByRole('link', { name: /set your goto/i })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Phase 13 — GOTO status tests (F5–F7)
// ---------------------------------------------------------------------------

test.describe('Home Command Center — GOTO Status', () => {
  async function setupWithGotoStatus(
    page: Page,
    gotoValue: { description: string; recipeId: string } | null,
    recipeStatus: 'ready' | 'pending' = 'ready'
  ) {
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';

    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);

    await page.route(/\/(?:backend\/)?api\/family/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [builders.familyMember({ name: 'Alex' })] }),
      });
    });

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

    let currentStatus = 0;

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

    await page.route(/\/(?:backend\/)?api\/schedule\/assign/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    // Settings mock
    await page.route(/\/(?:backend\/)?api\/settings\/(.+)/, async (route) => {
      if (gotoValue != null) {
        const { status, ...valueWithoutStatus } = gotoValue as any;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { key: 'family_goto', value: valueWithoutStatus } }),
        });
      } else {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Not found' }),
        });
      }
    });

    // Status mock
    if (gotoValue?.recipeId) {
      await page.route(
        new RegExp(`/(?:backend/)?api/recipes/${gotoValue.recipeId}/status`),
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                id: gotoValue.recipeId,
                status: recipeStatus,
              },
            }),
          });
        }
      );
    }

    await page.goto('/home');
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible({ timeout: 10_000 });
  }

  async function skipTonight(page: Page) {
    await page.getByTestId('tonight-menu-card').click();
    await page.getByTestId('skip-tonight-btn').click();
    await expect(page.getByTestId('recovery-dialog-title')).toBeVisible();
    await page.getByTestId('recovery-action-order-in').click();
    await expect(page.getByTestId('recovery-dialog-title')).toBeVisible();
    const moveResponse = page.waitForResponse(
      (resp) => resp.url().includes('/api/schedule/move') && resp.request().method() === 'POST'
    );
    await page.getByTestId('recovery-action-tomorrow').click();
    await moveResponse;
    await expect(page.getByTestId('tonight-pivot-card')).toBeVisible({ timeout: 5_000 });
  }

  // F6 — Ready GOTO enables Confirm GOTO on home
  test('Ready GOTO enables Confirm GOTO button', async ({ page }) => {
    await setupWithGotoStatus(page, {
      description: 'Our Family Spaghetti',
      recipeId: MOCK_IDS.RECIPE_LASAGNA,
    });
    await skipTonight(page);

    const confirmBtn = page.getByTestId('confirm-goto-btn');
    await expect(confirmBtn).toBeVisible();
    await expect(confirmBtn).toBeEnabled();
    await expect(page.getByText(/our family spaghetti/i)).toBeVisible();
  });

  // F7 — Pending GOTO disables Confirm GOTO on home
  test('Pending GOTO disables Confirm GOTO button', async ({ page }) => {
    await setupWithGotoStatus(
      page,
      {
        description: 'Our Family Spaghetti',
        recipeId: MOCK_IDS.RECIPE_LASAGNA,
      } as any,
      'pending'
    );
    await skipTonight(page);

    const confirmBtn = page.getByTestId('confirm-goto-btn');
    await expect(confirmBtn).toBeVisible();
    await expect(confirmBtn).toBeDisabled();
    await expect(page.getByText(/your goto is being prepared/i)).toBeVisible();
  });
});
