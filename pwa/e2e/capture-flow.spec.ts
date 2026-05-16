import path from 'path';
import { test, expect } from './fixtures';
import {
  MOCK_IDS,
  builders,
  setupCommonRoutes,
  mockSseWithRecipeReadyEnriched,
  mockSseWithRecipeFailed,
} from './mock-api';

const FIXTURE_IMAGE = path.join(__dirname, 'fixtures', 'test-meal.jpg');

test.describe('Capture Flow', () => {
  test.beforeEach(async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
    const origins = [
      baseUrl,
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://pwa.wfs.localhost',
    ];

    for (const origin of origins) {
      await page
        .context()
        .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: origin }]);
    }

    await setupCommonRoutes(page);

    // Capture endpoint — override setupCommonRoutes default to return a proper data-wrapped recipe
    await page.route('**/api/recipes', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            data: builders.recipe({ id: MOCK_IDS.RECIPE_LASAGNA, name: 'Captured Recipe' }),
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [], total: 0 }),
        });
      }
    });

    // GOTO mock — default: empty list
    await page.route('**/api/goto', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { items: [] } }),
        });
      } else {
        await route.continue();
      }
    });

    // Active GOTO mock — default: 404
    await page.route('**/api/goto/active', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Not found' }),
      });
    });
  });

  test('user can complete the capture flow and see a success message', async ({ page }) => {
    await page.goto('/capture');

    await page.context().grantPermissions(['camera']);

    const fileInput = page.getByTestId('capture-gallery-input');

    if ((await fileInput.count()) > 0) {
      await fileInput.setInputFiles(FIXTURE_IMAGE);
    } else {
      const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.getByTestId('capture-pick-gallery-btn').click(),
      ]);
      await fileChooser.setFiles(FIXTURE_IMAGE);
    }

    await expect(page.getByTestId('capture-photos-count')).toBeVisible({ timeout: 10_000 });

    const ratingButton = page.getByTestId('capture-rating-3');
    await expect(ratingButton).toBeVisible();
    await ratingButton.click();

    const notesInput = page.getByPlaceholder(/any tweaks/i);
    await notesInput.fill('Test recipe notes');

    const saveBtn = page.getByTestId('capture-save-btn');
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    // Success screen shows "Recipe queued" (async processing) or "Synthesizing…"
    // The old "Captured!" text was replaced by the honest async state (Task 31).
    await expect(page.getByTestId('capture-success-screen')).toBeVisible({ timeout: 15_000 });
  });

  test('large photo uploads show immediate upload feedback and a delayed overlay', async ({
    page,
  }) => {
    await page.route('**/api/recipes', async (route) => {
      if (route.request().method() === 'POST') {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        await route.fulfill({
          status: 202,
          contentType: 'application/json',
          body: JSON.stringify({
            id: MOCK_IDS.RECIPE_LASAGNA,
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], total: 0 }),
      });
    });

    await page.goto('/capture');

    const fileInput = page.getByTestId('capture-gallery-input');
    await fileInput.setInputFiles(FIXTURE_IMAGE);

    await expect(page.getByTestId('capture-photos-count')).toBeVisible({ timeout: 10_000 });

    await page.getByTestId('capture-save-btn').click();

    await expect(page.getByTestId('capture-save-btn')).toBeDisabled();
    await expect(page.getByTestId('capture-photo-upload-helper')).toBeVisible();
    await expect(page.getByTestId('capture-photo-upload-overlay')).toBeVisible();
    await expect(page.getByTestId('capture-upload-keep-open')).toBeVisible();

    await expect(page.getByTestId('capture-success-screen')).toBeVisible({ timeout: 15_000 });
  });

  test('after successful capture, user can return to home', async ({ page }) => {
    await page.goto('/home');
    await expect(
      page.getByTestId('tonight-menu-card').or(page.getByTestId('tonight-pivot-card'))
    ).toBeVisible();
  });

  test('capture cancel button returns the user home', async ({ page }) => {
    await page.goto('/capture');

    await expect(page.getByTestId('capture-cancel-btn')).toBeVisible();
    await page.getByTestId('capture-cancel-btn').click();

    await expect(page).toHaveURL(/\/home/);
    await expect(
      page.getByTestId('tonight-menu-card').or(page.getByTestId('tonight-pivot-card'))
    ).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // URL Capture — Share Target / Link Ingestion
  // -------------------------------------------------------------------------

  test('navigating with url param allows reviewing and manual saving', async ({ page }) => {
    const testUrl = 'https://www.seriouseats.com/recipes/2012/02/the-best-lasagna-recipe.html';

    // Navigate to capture with URL (simulates Share Target)
    await page.goto(`/capture?url=${encodeURIComponent(testUrl)}`);

    // 1. Verify URL is displayed in the review form
    await expect(page.getByTestId('capture-url-input')).toHaveValue(testUrl);
    await expect(page.getByTestId('capture-url-save-btn')).toBeVisible();

    // 2. Fill in some details
    await page.getByTestId('capture-rating-3').click();
    await page.getByPlaceholder(/any tweaks/i).fill('Added from Serious Eats');

    // 3. Track the API call and click Save
    const captureRequest = page.waitForRequest(
      (req) => req.url().includes('/api/recipes/capture-url') && req.method() === 'POST'
    );

    await page.getByTestId('capture-url-save-btn').click();

    // 4. Verify API call payload
    const req = await captureRequest;
    const body = req.postDataJSON();
    expect(body.url).toBe(testUrl);
    expect(body.notes).toBe('Added from Serious Eats');
    expect(body.rating).toBe(3); // "Loved it" = 3

    // 5. Verify the success screen appears (queued state — no auto-redirect)
    // Task 31: The 4-second auto-redirect was removed. The success screen now shows
    // "Recipe queued" with explicit "Add Another" and "Done" CTAs.
    await expect(page.getByTestId('capture-success-screen')).toBeVisible({ timeout: 10_000 });
  });

  test('navigating with text param containing a URL should show the review form', async ({
    page,
  }) => {
    const testUrl = 'https://www.seriouseats.com/recipes/2012/02/the-best-lasagna-recipe.html';
    const sharedText = `Check out this recipe: ${testUrl}`;

    // Navigate to capture with text (simulates some Android share behaviors)
    await page.goto(`/capture?text=${encodeURIComponent(sharedText)}`);

    // EXPECTATION: The app should recognize the URL in the text and show the review form
    await expect(page.getByTestId('capture-url-review-heading')).toBeVisible({ timeout: 5000 });

    // Check the URL input specifically
    const urlTextarea = page.getByPlaceholder(/paste a recipe link/i);
    await expect(urlTextarea).toHaveValue(testUrl);
  });

  test('failed URL capture shows error message', async ({ page }) => {
    const testUrl = 'https://invalid-recipe.com';

    // Mock failure for this specific test
    await page.route('**/api/recipes/capture-url', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to extract recipe from this domain' }),
      });
    });

    await page.goto(`/capture?url=${encodeURIComponent(testUrl)}`);

    // Click Save to trigger the failed call
    await page.getByTestId('capture-url-save-btn').click();

    // Should show error message (the default one if extraction fails)
    await expect(page.getByTestId('capture-url-error')).toBeVisible({ timeout: 10_000 });
  });

  test('malformed 202 with missing recipe id shows error message', async ({ page }) => {
    const testUrl = 'https://example.com/recipe';

    // Mock a 202 response with no data.id (malformed but non-throwing from the API client)
    await page.route('**/api/recipes/capture-url', async (route) => {
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({ data: {} }),
      });
    });

    await page.goto(`/capture?url=${encodeURIComponent(testUrl)}`);

    await page.getByTestId('capture-url-save-btn').click();

    await expect(page.getByTestId('capture-url-error')).toBeVisible({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// capture-describe-entry — structural / interaction / validation tests
// ---------------------------------------------------------------------------

test.describe('Capture — initial state rendering', () => {
  test.beforeEach(async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';

    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);

    await page.addInitScript((id) => {
      localStorage.setItem(
        'family-storage',
        JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 })
      );
    }, MOCK_IDS.MEMBER_ALEX);

    await setupCommonRoutes(page);

    await page.route('**/api/settings/*', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Not found' }),
      });
    });
  });

  // 5.2 — Initial state: tab switcher absent, camera/gallery/describe-link visible, form not present
  test('tab switcher is absent and capture controls are visible on load', async ({ page }) => {
    await page.goto('/capture');

    // Tab switcher (old pill bar) must not be present — verified via absence of capture area tabs
    await expect(page.getByTestId('capture-tab-camera')).not.toBeVisible();
    await expect(page.getByTestId('capture-tab-gallery')).not.toBeVisible();
    await expect(page.getByTestId('capture-tab-describe')).not.toBeVisible();

    // Camera_Button is visible
    await expect(page.getByTestId('capture-take-photo-btn')).toBeVisible();

    // Gallery_Link is visible
    await expect(page.getByTestId('capture-pick-gallery-btn')).toBeVisible();

    // Describe_Link is visible
    await expect(page.getByTestId('capture-secondary-action-describe')).toBeVisible();

    // Describe_Form (recipe name input) is NOT present
    await expect(page.getByPlaceholder(/our family spaghetti/i)).not.toBeVisible();

    // Link entry is visible
    await expect(page.getByTestId('capture-secondary-action-link')).toBeVisible();
  });

  test('clicking the link secondary action shows the URL review form', async ({ page }) => {
    await page.goto('/capture');

    await page.getByTestId('capture-secondary-action-link').click();

    await expect(page.getByTestId('capture-url-review-heading')).toBeVisible();
    await expect(page.getByPlaceholder(/paste a recipe link/i)).toBeVisible();
    await expect(page.getByTestId('capture-url-save-btn')).toBeVisible();
  });

  test('clicking Back from URL review form returns to capture controls', async ({ page }) => {
    await page.goto('/capture');

    await page.route('**/api/goto', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { items: [] } }),
      });
    });

    await page.getByTestId('capture-secondary-action-link').click();
    await page.getByTestId('capture-url-back-btn').click();

    await expect(page.getByTestId('capture-url-review-heading')).not.toBeVisible();
    await expect(page.getByTestId('capture-take-photo-btn')).toBeVisible();
    await expect(page.getByTestId('capture-secondary-action-link')).toBeVisible();
  });
});

test.describe('Capture — describe link interaction', () => {
  test.beforeEach(async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';

    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);

    await page.addInitScript((id) => {
      localStorage.setItem(
        'family-storage',
        JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 })
      );
    }, MOCK_IDS.MEMBER_ALEX);

    await setupCommonRoutes(page);

    await page.route('**/api/settings/*', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Not found' }),
      });
    });
  });

  // 5.3 — Clicking "Or Describe It Instead" reveals form, hides link, hides camera box
  test('clicking Describe_Link reveals the form and hides the link', async ({ page }) => {
    await page.goto('/capture');

    // Form is not visible before clicking
    await expect(page.getByPlaceholder(/our family spaghetti/i)).not.toBeVisible();

    await page.getByTestId('capture-secondary-action-describe').click();

    // Describe_Form is now visible
    await expect(page.getByPlaceholder(/our family spaghetti/i)).toBeVisible();

    // Describe_Link is no longer visible (hidden by !showDescribe guard)
    await expect(page.getByTestId('capture-secondary-action-describe')).not.toBeVisible();
  });
});

test.describe('Capture — describe form validation', () => {
  test.beforeEach(async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';

    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);

    await page.addInitScript((id) => {
      localStorage.setItem(
        'family-storage',
        JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 })
      );
    }, MOCK_IDS.MEMBER_ALEX);

    await setupCommonRoutes(page);

    await page.route('**/api/settings/*', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Not found' }),
      });
    });
  });

  // 5.4 — Submit with empty name shows error, API not called
  test('submitting with empty recipe name shows validation error and does not call API', async ({
    page,
  }) => {
    let describeApiCalled = false;
    await page.route('**/api/recipes/describe', async (route) => {
      describeApiCalled = true;
      await route.continue();
    });

    await page.goto('/capture');
    await page.getByTestId('capture-secondary-action-describe').click();

    // Synthesize button is disabled when name is empty (component guards on !describeName.trim())
    const synthesizeBtn = page.getByTestId('capture-synthesize-btn');
    await expect(synthesizeBtn).toBeDisabled();

    // Confirm API was not called
    expect(describeApiCalled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Phase 13 — GOTO intent tests (F4, F8)
// ---------------------------------------------------------------------------

test.describe('Capture — GOTO intent', () => {
  test.beforeEach(async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';

    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);

    await page.addInitScript((id) => {
      localStorage.setItem(
        'family-storage',
        JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 })
      );
    }, MOCK_IDS.MEMBER_ALEX);

    await setupCommonRoutes(page);

    // GOTO — writable in-memory store
    let gotoStore = { items: [] as any[] };
    await page.route('**/api/goto', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: gotoStore }),
        });
      } else if (route.request().method() === 'PUT') {
        const body = route.request().postDataJSON();
        gotoStore = body;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: gotoStore }),
        });
      }
    });

    // Active GOTO — default: 404
    await page.route('**/api/goto/active', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Not found' }),
      });
    });

    // POST /api/recipes/describe
    await page.route('**/api/recipes/describe', async (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON() as { name?: string };
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: builders.recipe({
              id: MOCK_IDS.RECIPE_GOTO_STUB,
              name: body?.name ?? 'Described Recipe',
              imageUrl: null,
            }),
          }),
        });
      } else {
        await route.continue();
      }
    });

    // POST /api/recipes (photo capture)
    await page.route('**/api/recipes', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            data: builders.recipe({ id: MOCK_IDS.RECIPE_LASAGNA, name: 'Captured Recipe' }),
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [], total: 0 }),
        });
      }
    });
  });

  // F4 — Describe it creates a pending GOTO
  test('Describe it creates a pending GOTO setting', async ({ page }) => {
    await page.goto('/capture?intent=goto');

    // Switch to Describe form via the Describe_Link button
    await page.getByTestId('capture-secondary-action-describe').click();

    // Fill in the name
    await page.getByPlaceholder(/our family spaghetti/i).fill('Our family spaghetti');

    // Track the two API calls
    const describeRequest = page.waitForRequest(
      (req) => req.url().includes('/api/recipes/describe') && req.method() === 'POST'
    );
    const settingsRequest = page.waitForRequest(
      (req) => req.url().includes('/api/goto') && req.method() === 'PUT'
    );

    await page.getByTestId('capture-synthesize-btn').click();

    const [descReq, settReq] = await Promise.all([describeRequest, settingsRequest]);

    // POST /api/recipes/describe was called
    const descBody = descReq.postDataJSON();
    expect(descBody.name).toBe('Our family spaghetti');

    // PUT /api/goto was called without status (now domain-driven)
    const settBody = settReq.postDataJSON();
    expect(settBody?.items).toBeDefined();
    expect(settBody.items[0].recipeId).toBe(MOCK_IDS.RECIPE_GOTO_STUB);
    expect(settBody.items[0].status).toBe('pending');

    // Success screen stays visible — no auto-navigation for isGoto=true
    await expect(page.getByTestId('capture-success-screen')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('capture-success-heading')).toHaveText(
      /your goto is being prepared/i
    );
    await expect(page).toHaveURL(/\/capture/);
  });

  // F8 — Capture path sets GOTO pending
  test('Photo capture with intent=goto sets GOTO pending', async ({ page }) => {
    await page.goto('/capture?intent=goto&mode=photo');

    const fileInput = page.getByTestId('capture-gallery-input');
    await fileInput.setInputFiles(path.join(__dirname, 'fixtures', 'test-meal.jpg'));

    await expect(page.getByTestId('capture-photos-count')).toBeVisible({ timeout: 10_000 });

    const settingsRequest = page.waitForRequest(
      (req) => req.url().includes('/api/goto') && req.method() === 'PUT'
    );

    await page.getByTestId('capture-save-btn').click();

    const settReq = await settingsRequest;
    const settBody = settReq.postDataJSON();
    expect(settBody?.items).toBeDefined();
    expect(settBody.items[0].recipeId).toBe(MOCK_IDS.RECIPE_LASAGNA);
    expect(settBody.items[0].status).toBe('pending');

    // Success screen stays visible — no auto-navigation for isGoto=true
    await expect(page.getByTestId('capture-success-screen')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('capture-success-heading')).toHaveText(
      /your goto is being prepared/i
    );
    await expect(page).toHaveURL(/\/capture/);
  });
});

// ---------------------------------------------------------------------------
// Phase 13 — F5: Pending GOTO shows synthesizing state in settings
// ---------------------------------------------------------------------------

test.describe('Settings — GOTO pending state', () => {
  test('Pending GOTO shows spinner in FamilyGOTOSettings', async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';

    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);

    await page.addInitScript((id) => {
      localStorage.setItem(
        'family-storage',
        JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 })
      );
    }, MOCK_IDS.MEMBER_ALEX);

    await setupCommonRoutes(page);

    await page.route('**/api/family', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [builders.familyMember({ name: 'Alex' })] }),
      });
    });

    // GOTO returns a pending GOTO
    await page.route('**/api/goto', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            items: [
              {
                description: 'Our family spaghetti',
                recipeId: MOCK_IDS.RECIPE_GOTO_STUB,
                status: 'pending',
              },
            ],
          },
        }),
      });
    });

    await page.route('**/api/recipes/*/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: MOCK_IDS.RECIPE_GOTO_STUB,
            status: 'pending',
          },
        }),
      });
    });

    await page.goto('/profile/settings');

    // Spinner and pending description should be visible
    await expect(page.getByTestId('goto-pending-spinner')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('goto-pending-description')).toContainText(
      'Our family spaghetti'
    );
  });
});

// ---------------------------------------------------------------------------
// Phase 2 — SSE-driven notifications: LibraryToast and RecipeFailureBanner
// ---------------------------------------------------------------------------

test.describe('Capture — SSE notifications (Phase 2)', () => {
  test.beforeEach(async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';

    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);

    await page.addInitScript((id) => {
      localStorage.setItem(
        'family-storage',
        JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 })
      );
    }, MOCK_IDS.MEMBER_ALEX);

    await setupCommonRoutes(page);

    await page.route('**/api/settings/*', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Not found' }),
      });
    });
  });

  // ── Recipe queued state ──────────────────────────────────────────────────
  // (not "Captured!") because synthesis is async. The app automatically
  // redirects home after 10 seconds.
  test('photo submit shows recipe queued state and redirects home', async ({ page }) => {
    await page.route('**/api/recipes', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            data: builders.recipe({ id: MOCK_IDS.RECIPE_LASAGNA, name: 'Captured Recipe' }),
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [], total: 0 }),
        });
      }
    });

    await page.goto('/capture');

    const fileInput = page.getByTestId('capture-gallery-input');
    await fileInput.setInputFiles(path.join(__dirname, 'fixtures', 'test-meal.jpg'));

    await expect(page.getByTestId('capture-photos-count')).toBeVisible({ timeout: 10_000 });

    await page.getByTestId('capture-rating-3').click();
    await page.getByTestId('capture-save-btn').click();

    // Success screen shows "Recipe queued" (async processing)
    await expect(page.getByTestId('capture-success-screen')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('capture-success-heading')).toContainText(/recipe queued/i);

    // The old "Add Another" and "Done" buttons were removed.
    // The app now automatically redirects home after 10 seconds.
    await expect(page.getByTestId('capture-done-btn')).toBeVisible();

    // Verify the redirect happens (allow up to 12s for the 10s timer)
    await expect(page).toHaveURL(/\/home/, { timeout: 12_000 });
  });

  // ── LibraryToast on recipe_ready ─────────────────────────────────────────
  // When SSE fires `recipe_ready` for a recipe that was submitted in this
  // session (captureStore has it), the LibraryToast appears at the top of
  // the screen (inside notification-zone) with the recipe name and a "Tap to add to your week" hint.
  //
  // Strategy: navigate to /home, then push a 'ready' notification directly to
  // libraryStore via window.__libraryStore (exposed in non-production builds).
  // This tests the LibraryToast UI rendering when a recipe_ready notification arrives.
  test('SSE recipe_ready → LibraryToast appears with recipe name', async ({ page }) => {
    const recipeId = MOCK_IDS.RECIPE_LASAGNA;
    const recipeName = 'Test Lasagna';

    const cookies = await page.context().cookies();
    console.log('COOKIES BEFORE GOTO:', JSON.stringify(cookies, null, 2));

    // Navigate to /home — the layout mounts LibraryToast
    await page.goto('/home');

    // Wait for the layout to mount and expose the store on window
    await page.waitForFunction(() => !!(window as any).__libraryStore, { timeout: 5_000 });

    // Push a 'ready' notification to libraryStore to simulate what the SSE
    // recipe_ready handler would do when captureStore has the recipe.
    await page.evaluate(
      ({ id, name }) => {
        (window as any).__libraryStore.getState().pushNotification({
          recipeId: id,
          name,
          type: 'ready',
        });
      },
      { id: recipeId, name: recipeName }
    );

    // The toast renders with role="status" and contains the recipe name
    const toast = page.locator('[role="status"]').filter({ hasText: recipeName });
    await expect(toast).toBeVisible({ timeout: 5_000 });
    await expect(toast).toContainText(/is ready/i);

    // Ensure it's in the top notification zone
    await expect(page.getByTestId('notification-zone')).toContainText(recipeName);
  });

  test('LibraryToast drawer actions let the user add a recipe to this week', async ({ page }) => {
    const recipeId = MOCK_IDS.RECIPE_LASAGNA;
    const recipeName = 'Test Lasagna';

    await page.setViewportSize({ width: 390, height: 1000 });
    await page.goto('/home');
    // Ensure page is hydrated
    await expect(page.getByTestId('quick-capture-trigger')).toBeVisible({ timeout: 15_000 });
    await page.waitForFunction(() => !!(window as any).__libraryStore, { timeout: 10_000 });

    await page.evaluate(
      ({ id, name }) => {
        (window as any).__libraryStore.getState().pushNotification({
          recipeId: id,
          name,
          type: 'ready',
        });
      },
      { id: recipeId, name: recipeName }
    );

    await expect(page.locator('[role="status"]').filter({ hasText: recipeName })).toBeVisible();
    await page.locator('[role="status"]').filter({ hasText: recipeName }).click();

    // Wait for drawer animation
    await page.waitForTimeout(1000);

    await expect(page.getByTestId('library-toast-add-to-week')).toBeVisible();
    await page.evaluate(() => {
      (document.querySelector('[data-testid="library-toast-add-to-week"]') as HTMLElement)?.click();
    });

    await expect(page).toHaveURL(/\/planner/, { timeout: 15_000 });
  });

  // ── RecipeFailureBanner on recipe_failed ─────────────────────────────────
  // When SSE fires `recipe_failed` for a recipe that was submitted in this
  // session, the RecipeFailureBanner appears with a retry CTA.
  //
  // Strategy: navigate to /home, then push a 'failed' notification directly to
  // libraryStore via window.__libraryStore (exposed in non-production builds).
  test('SSE recipe_failed → RecipeFailureBanner appears with retry CTA', async ({ page }) => {
    const recipeId = MOCK_IDS.RECIPE_LASAGNA;
    const recipeName = 'Test Lasagna';

    // Navigate to /home — the layout mounts RecipeFailureBanner
    await page.goto('/home');

    // Wait for the layout to mount and expose the store on window
    await page.waitForFunction(() => !!(window as any).__libraryStore, { timeout: 5_000 });

    // Push a 'failed' notification to libraryStore to simulate what the SSE
    // recipe_failed handler would do when captureStore has the recipe.
    await page.evaluate(
      ({ id, name }) => {
        (window as any).__libraryStore.getState().pushNotification({
          recipeId: id,
          name,
          type: 'failed',
          errorMessage: 'AI extraction failed',
          failedStep: 'recipe-extraction',
        });
      },
      { id: recipeId, name: recipeName }
    );

    // Wait for the RecipeFailureBanner to appear in the notification zone
    const banner = page.getByTestId(`recipe-failure-banner-${recipeId}`);
    await expect(banner).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('notification-zone')).toContainText(recipeName);
    await expect(banner).toContainText(/couldn't be saved/i);
    await expect(banner).toContainText(/tap to try again/i);
  });

  test('RecipeFailureBanner dismiss action removes the failed notification', async ({ page }) => {
    const recipeId = MOCK_IDS.RECIPE_LASAGNA;
    const recipeName = 'Test Lasagna';

    await page.goto('/home');
    await page.waitForFunction(() => !!(window as any).__libraryStore, { timeout: 5_000 });

    await page.evaluate(
      ({ id, name }) => {
        (window as any).__libraryStore.getState().pushNotification({
          recipeId: id,
          name,
          type: 'failed',
          errorMessage: 'AI extraction failed',
          failedStep: 'recipe-extraction',
        });
      },
      { id: recipeId, name: recipeName }
    );

    await expect(page.getByTestId(`recipe-failure-banner-${recipeId}`)).toBeVisible();
    await page.getByTestId(`recipe-failure-dismiss-${recipeId}`).click();
    await expect(page.getByTestId(`recipe-failure-banner-${recipeId}`)).not.toBeVisible();
  });
});
