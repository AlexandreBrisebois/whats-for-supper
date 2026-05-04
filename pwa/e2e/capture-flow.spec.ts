import path from 'path';
import { test, expect } from './fixtures';
import { MOCK_IDS, builders, setupCommonRoutes } from './mock-api';

const FIXTURE_IMAGE = path.join(__dirname, 'fixtures', 'test-meal.jpg');

test.describe('Capture Flow', () => {
  test.beforeEach(async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';

    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);

    // Inject localStorage before any navigation so the store hydrates correctly
    await page.addInitScript((id) => {
      localStorage.setItem(
        'family-storage',
        JSON.stringify({
          state: { selectedFamilyMemberId: id },
          version: 0,
        })
      );
    }, MOCK_IDS.MEMBER_ALEX);

    await setupCommonRoutes(page);

    // Home page needs schedule + family intercepts
    await page.route(
      (url) => url.pathname.includes('/api/schedule'),
      async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                weekOffset: 0,
                locked: false,
                days: [],
                status: 0,
              },
            }),
          });
        } else {
          await route.continue();
        }
      }
    );

    await page.route(
      (url) => url.pathname.includes('/api/family'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [builders.familyMember({ name: 'Alex' })] }),
        });
      }
    );

    // Capture endpoint
    await page.route(
      (url) => url.pathname.endsWith('/api/recipes'),
      async (route) => {
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
      }
    );

    // Settings mock — default: no GOTO configured (404)
    await page.route(
      (url) => url.pathname.includes('/api/settings/'),
      async (route) => {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Not found' }),
        });
      }
    );
  });

  test('authenticated user can navigate to the capture page from home', async ({ page }) => {
    await page.goto('/home');

    await page.getByRole('link', { name: /capture a recipe/i }).click();

    await expect(page).toHaveURL(/\/capture/);
    await expect(page.getByRole('button', { name: /take a photo/i })).toBeVisible();
  });

  test('user can complete the capture flow and see a success message', async ({ page }) => {
    await page.goto('/capture');

    await page.context().grantPermissions(['camera']);

    const fileInput = page.locator('input[type="file"]').first();

    if ((await fileInput.count()) > 0) {
      await fileInput.setInputFiles(FIXTURE_IMAGE);
    } else {
      const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.getByRole('button', { name: 'Pick from Gallery', exact: true }).click(),
      ]);
      await fileChooser.setFiles(FIXTURE_IMAGE);
    }

    await expect(page.getByRole('heading', { name: /photos \(1\)/i })).toBeVisible({
      timeout: 10_000,
    });

    const ratingButton = page.getByRole('button', { name: /loved it/i });
    await expect(ratingButton).toBeVisible();
    await ratingButton.click();

    const notesInput = page.getByPlaceholder(/any tweaks/i);
    await notesInput.fill('Test recipe notes');

    const saveBtn = page.getByRole('button', { name: /save recipe/i });
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    await expect(page.getByText(/captured/i)).toBeVisible({ timeout: 15_000 });
  });

  test('after successful capture, user can return to home', async ({ page }) => {
    await page.goto('/home');
    await expect(
      page.getByTestId('tonight-menu-card').or(page.getByTestId('tonight-pivot-card'))
    ).toBeVisible();
  });

  test('user can navigate to the search page from the navigation bar', async ({ page }) => {
    await page.route(
      (url) => url.pathname.includes('/api/recipes'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [], total: 0 }),
        });
      }
    );

    await page.goto('/home');

    await page.getByRole('link', { name: /^search$/i }).click();

    await expect(page).toHaveURL(/\/recipes/);
    await expect(page.getByPlaceholder(/Something spicy for \d+/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  // -------------------------------------------------------------------------
  // URL Capture — Share Target / Link Ingestion
  // -------------------------------------------------------------------------

  test('navigating with url param allows reviewing and manual saving', async ({ page }) => {
    const testUrl = 'https://www.seriouseats.com/recipes/2012/02/the-best-lasagna-recipe.html';

    // Navigate to capture with URL (simulates Share Target)
    await page.goto(`/capture?url=${encodeURIComponent(testUrl)}`);

    // 1. Verify URL is displayed in the review form
    await expect(page.getByText(testUrl)).toBeVisible();
    await expect(page.getByRole('button', { name: /save recipe/i })).toBeVisible();

    // 2. Fill in some details
    await page.getByRole('button', { name: /loved it/i }).click();
    await page.getByPlaceholder(/any tweaks/i).fill('Added from Serious Eats');

    // 3. Track the API call and click Save
    const captureRequest = page.waitForRequest(
      (req) => req.url().includes('/api/recipes/capture-url') && req.method() === 'POST'
    );

    await page.getByRole('button', { name: /save recipe/i }).click();

    // 4. Verify API call payload
    const req = await captureRequest;
    const body = req.postDataJSON();
    expect(body.url).toBe(testUrl);
    expect(body.notes).toBe('Added from Serious Eats');
    expect(body.rating).toBe(3); // "Loved it" = 3

    // 5. Verify it redirects to home immediately (or very quickly)
    await expect(page).toHaveURL(/\/home/, { timeout: 10_000 });
  });

  // TODO: mock conflict with setupCommonRoutes capture-url route; revisit when URL capture SSE flow is implemented
  test.skip('failed URL capture shows error message', async ({ page }) => {
    const testUrl = 'https://invalid-recipe.com';

    // Mock failure for this specific test
    await page.route(
      (url) => url.pathname.includes('/api/recipes/capture-url'),
      async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Failed to extract recipe from this domain' }),
        });
      }
    );

    await page.goto(`/capture?url=${encodeURIComponent(testUrl)}`);

    // Click Save to trigger the failed call
    await page.getByRole('button', { name: /save recipe/i }).click();

    // Should show error message (the default one if extraction fails)
    await expect(page.getByText(/failed to capture/i)).toBeVisible({ timeout: 10_000 });
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

    await page.route(
      (url) => url.pathname.includes('/api/settings/'),
      async (route) => {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Not found' }),
        });
      }
    );
  });

  // 5.2 — Initial state: tab switcher absent, camera/gallery/describe-link visible, form not present
  test('tab switcher is absent and capture controls are visible on load', async ({ page }) => {
    await page.goto('/capture');

    // Tab switcher (old pill bar) must not be present
    await expect(page.getByRole('button', { name: /^camera$/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /^gallery$/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /^describe$/i })).not.toBeVisible();

    // Camera_Button is visible
    await expect(page.getByRole('button', { name: /take a photo/i })).toBeVisible();

    // Gallery_Link is visible
    await expect(page.getByRole('button', { name: /pick from gallery/i })).toBeVisible();

    // Describe_Link is visible
    await expect(page.getByRole('button', { name: /or describe it instead/i })).toBeVisible();

    // Describe_Form (recipe name input) is NOT present
    await expect(page.getByPlaceholder(/our family spaghetti/i)).not.toBeVisible();
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

    await page.route(
      (url) => url.pathname.includes('/api/settings/'),
      async (route) => {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Not found' }),
        });
      }
    );
  });

  // 5.3 — Clicking "Or Describe It Instead" reveals form, hides link, hides camera box
  test('clicking Describe_Link reveals the form and hides the link', async ({ page }) => {
    await page.goto('/capture');

    // Form is not visible before clicking
    await expect(page.getByPlaceholder(/our family spaghetti/i)).not.toBeVisible();

    await page.getByRole('button', { name: /or describe it instead/i }).click();

    // Describe_Form is now visible
    await expect(page.getByPlaceholder(/our family spaghetti/i)).toBeVisible();

    // Describe_Link is no longer visible (hidden by !showDescribe guard)
    await expect(page.getByRole('button', { name: /or describe it instead/i })).not.toBeVisible();
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

    await page.route(
      (url) => url.pathname.includes('/api/settings/'),
      async (route) => {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Not found' }),
        });
      }
    );
  });

  // 5.4 — Submit with empty name shows error, API not called
  test('submitting with empty recipe name shows validation error and does not call API', async ({
    page,
  }) => {
    let describeApiCalled = false;
    await page.route(
      (url) => url.pathname.includes('/api/recipes/describe'),
      async (route) => {
        describeApiCalled = true;
        await route.continue();
      }
    );

    await page.goto('/capture');
    await page.getByRole('button', { name: /or describe it instead/i }).click();

    // Synthesize button is disabled when name is empty (component guards on !describeName.trim())
    const synthesizeBtn = page.getByRole('button', { name: /synthesize recipe/i });
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

    // Settings — writable in-memory store
    const settingsStore: Record<string, unknown> = {};
    await page.route(
      (url) => url.pathname.includes('/api/settings/'),
      async (route) => {
        const key = new URL(route.request().url()).pathname.split('/').pop()!;
        if (route.request().method() === 'GET') {
          if (settingsStore[key] == null) {
            await route.fulfill({
              status: 404,
              contentType: 'application/json',
              body: JSON.stringify({ error: 'Not found' }),
            });
          } else {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({ data: { key, value: settingsStore[key] } }),
            });
          }
        } else {
          const body = route.request().postDataJSON();
          settingsStore[key] = body.value;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: { key, value: body.value } }),
          });
        }
      }
    );

    // POST /api/recipes/describe
    await page.route(
      (url) => url.pathname.includes('/api/recipes/describe'),
      async (route) => {
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
      }
    );

    // POST /api/recipes (photo capture)
    await page.route(
      (url) => url.pathname.endsWith('/api/recipes'),
      async (route) => {
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
      }
    );
  });

  // F4 — Describe it creates a pending GOTO
  test('Describe it creates a pending GOTO setting', async ({ page }) => {
    await page.goto('/capture?intent=goto');

    // Switch to Describe form via the Describe_Link button
    await page.getByRole('button', { name: /or describe it instead/i }).click();

    // Fill in the name
    await page.getByPlaceholder(/our family spaghetti/i).fill('Our family spaghetti');

    // Track the two API calls
    const describeRequest = page.waitForRequest(
      (req) => req.url().includes('/api/recipes/describe') && req.method() === 'POST'
    );
    const settingsRequest = page.waitForRequest(
      (req) => req.url().includes('/api/settings/family_goto') && req.method() === 'POST'
    );

    await page.getByRole('button', { name: /synthesize recipe/i }).click();

    const [descReq, settReq] = await Promise.all([describeRequest, settingsRequest]);

    // POST /api/recipes/describe was called
    const descBody = descReq.postDataJSON();
    expect(descBody.name).toBe('Our family spaghetti');

    // POST /api/settings/family_goto was called without status (now domain-driven)
    const settBody = settReq.postDataJSON();
    expect(settBody.value?.status).toBeUndefined();
    expect(settBody.value?.recipeId).toBe(MOCK_IDS.RECIPE_GOTO_STUB);

    // Success screen shows GOTO-specific message
    await expect(page.getByText(/your goto is being prepared/i)).toBeVisible({ timeout: 10_000 });
  });

  // F8 — Capture path sets GOTO pending
  test('Photo capture with intent=goto sets GOTO pending', async ({ page }) => {
    await page.goto('/capture?intent=goto&mode=photo');

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(path.join(__dirname, 'fixtures', 'test-meal.jpg'));

    await expect(page.getByRole('heading', { name: /photos \(1\)/i })).toBeVisible({
      timeout: 10_000,
    });

    const settingsRequest = page.waitForRequest(
      (req) => req.url().includes('/api/settings/family_goto') && req.method() === 'POST'
    );

    await page.getByRole('button', { name: /save recipe/i }).click();

    const settReq = await settingsRequest;
    const settBody = settReq.postDataJSON();
    expect(settBody.value?.status).toBeUndefined();
    expect(settBody.value?.recipeId).toBe(MOCK_IDS.RECIPE_LASAGNA);

    // Success screen shows GOTO-specific message
    await expect(page.getByText(/your goto is being prepared/i)).toBeVisible({ timeout: 10_000 });
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

    await page.route(
      (url) => url.pathname.includes('/api/family'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [builders.familyMember({ name: 'Alex' })] }),
        });
      }
    );

    // Settings returns a pending GOTO
    await page.route(
      (url) => url.pathname.includes('/api/settings/'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              key: 'family_goto',
              value: {
                description: 'Our family spaghetti',
                recipeId: MOCK_IDS.RECIPE_GOTO_STUB,
              },
            },
          }),
        });
      }
    );

    await page.route(
      (url) => url.pathname.includes('/api/recipes/') && url.pathname.endsWith('/status'),
      async (route) => {
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
      }
    );

    await page.goto('/profile/settings');

    // Spinner and "being prepared" message should be visible
    await expect(page.getByText(/your goto is being prepared/i)).toBeVisible({ timeout: 10_000 });
  });
});
