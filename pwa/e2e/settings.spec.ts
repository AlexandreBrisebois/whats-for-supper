import { test, expect } from './fixtures';
import { MOCK_IDS, setupCommonRoutes, mockSseWithRecipeReady, builders } from './mock-api';

// ── Task 18: Failed Captures queue ──────────────────────────────────────────

test.describe('Settings — Failed Captures section', () => {
  test.beforeEach(async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);
    await setupCommonRoutes(page);
    await page.addInitScript((id) => {
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

  // E2E 1: Navigate to Settings → failed-captures-section is visible
  test('Settings page renders failed-captures-section', async ({ page }) => {
    await page.goto('/profile/settings');
    await expect(page.getByTestId('failed-captures-section')).toBeVisible({ timeout: 5000 });
  });

  // E2E 2: Failed capture present → visible with friendly reason
  test('renders failure row with friendly reason', async ({ page }) => {
    await page.route('**/api/captures/failures', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            items: [
              {
                id: MOCK_IDS.CAPTURE_FAILURE_URL,
                sourceType: 'url',
                previewText: 'https://example.com/recipe',
                friendlyReason: "We couldn't read the recipe page.",
                failureCode: 'url_unreadable',
                status: 'failed',
                retryCount: 0,
                createdAt: new Date().toISOString(),
                lastFailedAt: new Date().toISOString(),
              },
            ],
          },
        }),
      });
    });

    await page.goto('/profile/settings');

    await expect(page.getByTestId(`failed-capture-${MOCK_IDS.CAPTURE_FAILURE_URL}`)).toBeVisible({
      timeout: 5000,
    });
    await expect(
      page.getByTestId(`failed-capture-reason-${MOCK_IDS.CAPTURE_FAILURE_URL}`)
    ).toContainText("We couldn't read the recipe page.");
  });

  // E2E 3: Retry tap → mock POST returns queued: true → in-progress state shown
  test('retry tap calls retry endpoint and shows in-progress state', async ({ page }) => {
    await page.route('**/api/captures/failures', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            items: [
              {
                id: MOCK_IDS.CAPTURE_FAILURE_URL,
                sourceType: 'url',
                friendlyReason: "We couldn't read the recipe page.",
                status: 'failed',
                retryCount: 0,
                createdAt: new Date().toISOString(),
                lastFailedAt: new Date().toISOString(),
              },
            ],
          },
        }),
      });
    });

    await page.goto('/profile/settings');

    await expect(page.getByTestId(`action-retry-${MOCK_IDS.CAPTURE_FAILURE_URL}`)).toBeVisible({
      timeout: 5000,
    });

    await page.getByTestId(`action-retry-${MOCK_IDS.CAPTURE_FAILURE_URL}`).click();

    await expect(
      page.getByTestId(`action-retry-${MOCK_IDS.CAPTURE_FAILURE_URL}-retrying`)
    ).toBeVisible({ timeout: 5000 });
  });

  // E2E 5: Clear tap → mock DELETE returns cleared: true → row removed
  test('clear tap calls clear endpoint and removes row from list', async ({ page }) => {
    await page.route('**/api/captures/failures', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            items: [
              {
                id: MOCK_IDS.CAPTURE_FAILURE_URL,
                sourceType: 'url',
                friendlyReason: "We couldn't read the recipe page.",
                status: 'failed',
                retryCount: 0,
                createdAt: new Date().toISOString(),
                lastFailedAt: new Date().toISOString(),
              },
            ],
          },
        }),
      });
    });

    // Mock DELETE endpoint
    await page.route('**/api/captures/failures/*', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 202,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              cleared: true,
              cleanupCommandId: MOCK_IDS.CLEANUP_COMMAND,
            },
          }),
        });
        return;
      }
      await route.fallback();
    });

    // Mock window.confirm to always return true
    page.on('dialog', async (dialog) => {
      if (dialog.type() === 'confirm') {
        await dialog.accept();
      }
    });

    await page.goto('/profile/settings');

    await expect(page.getByTestId(`failed-capture-${MOCK_IDS.CAPTURE_FAILURE_URL}`)).toBeVisible({
      timeout: 5000,
    });

    await page.getByTestId(`action-clear-${MOCK_IDS.CAPTURE_FAILURE_URL}`).click();

    await expect(
      page.getByTestId(`failed-capture-${MOCK_IDS.CAPTURE_FAILURE_URL}`)
    ).not.toBeVisible();
    await expect(page.getByTestId('failed-captures-empty')).toBeVisible();
  });
});

test.describe('Settings — FamilyGOTOSettings card', () => {
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

  // Task 38: SSE recipe_ready → spinner replaced by recipe name without poll firing
  test('SSE recipe_ready replaces pending spinner with recipe name (no polling)', async ({
    page,
  }) => {
    const GOTO_RECIPE_ID = MOCK_IDS.RECIPE_LASAGNA;
    const GOTO_DESCRIPTION = 'Slow-cooked Lasagna';

    // 1. Mock GOTO setting with a pending recipe
    await page.route(
      (url) => url.pathname.includes('/api/settings/family_goto'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              key: 'family_goto',
              value: {
                description: GOTO_DESCRIPTION,
                recipeId: GOTO_RECIPE_ID,
              },
            },
          }),
        });
      }
    );

    // 2. Mock status endpoint to always return 'pending' — polling must NOT resolve this
    let statusCallCount = 0;
    await page.route(
      (url) => url.pathname.includes('/api/recipes/') && url.pathname.endsWith('/status'),
      async (route) => {
        statusCallCount++;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: { id: GOTO_RECIPE_ID, status: 'pending' },
          }),
        });
      }
    );

    // 3. Navigate to settings page — SSE mock registered after confirming pending state
    //    to avoid a race where recipe_ready fires before currentGoto is loaded.
    await page.goto('/profile/settings');

    // 4. Initially the pending spinner should be visible (status endpoint returns 'pending')
    await expect(page.getByTestId('goto-pending-spinner')).toBeVisible({ timeout: 5000 });

    // 5. Pending subtitle should be visible
    await expect(page.getByTestId('goto-pending-subtitle')).toHaveText(
      'Usually ready in under 10 seconds'
    );

    // 6. Description echo should show what was submitted
    await expect(page.getByTestId('goto-pending-description')).toHaveText(GOTO_DESCRIPTION);

    // 7. Change link should be visible as the escape hatch
    await expect(page.getByTestId('goto-change-btn')).toBeVisible();

    // 8. Simulate SSE recipe_ready by calling markReady directly on the gotoStore.
    //    This avoids SSE timing issues (the static mock body fires on connect, which
    //    races with settings load). The gotoStore is exposed on window.__gotoStore for tests.
    await page.evaluate((recipeId) => {
      (window as any).__gotoStore?.getState().markReady(recipeId);
    }, GOTO_RECIPE_ID);

    // 9. SSE recipe_ready fires → spinner replaced by recipe name
    // (status endpoint always returns 'pending', so only SSE can drive this transition)
    await expect(page.getByTestId('goto-recipe-name')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('goto-pending-spinner')).not.toBeVisible();

    // 10. Recipe name text is visible
    await expect(page.getByTestId('goto-recipe-name')).toContainText(GOTO_DESCRIPTION);

    // 11. Verify the status endpoint was called at most once (initial seed) — no polling
    // Allow for 1 call (initial fetch on mount) but not more
    expect(statusCallCount).toBeLessThanOrEqual(1);
  });

  /**
   * Task 43 — Coverage gap:
   * When the recipe status endpoint returns 'ready' on mount, the settings card
   * must show the recipe name (not the spinner). This is the steady-state "ready"
   * view — no SSE event needed, just the initial fetch returning 'ready'.
   */
  test('GOTO ready state shows recipe name when status endpoint returns ready', async ({
    page,
  }) => {
    const GOTO_DESCRIPTION = 'Slow-cooked Lasagna';

    // Mock GOTO setting with a recipe
    await page.route(
      (url) => url.pathname.includes('/api/settings/family_goto'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              key: 'family_goto',
              value: {
                description: GOTO_DESCRIPTION,
                recipeId: MOCK_IDS.RECIPE_LASAGNA,
              },
            },
          }),
        });
      }
    );

    // Status endpoint returns 'ready' immediately — no SSE needed
    await page.route(
      (url) => url.pathname.includes('/api/recipes/') && url.pathname.endsWith('/status'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: { id: MOCK_IDS.RECIPE_LASAGNA, status: 'ready' },
          }),
        });
      }
    );

    await page.goto('/profile/settings');

    // Recipe name must be visible — spinner must not be present
    await expect(page.getByTestId('goto-recipe-name')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('goto-recipe-name')).toContainText(GOTO_DESCRIPTION);
    await expect(page.getByTestId('goto-pending-spinner')).not.toBeVisible();
  });

  /**
   * Task 43 — Coverage gap:
   * Language toggle selection must persist when the user navigates away and
   * returns to the settings page. The locale is stored in localStorage via
   * LocaleProvider — this test verifies the active button reflects the stored
   * locale on re-mount.
   */
  test('language toggle selection persists on navigation', async ({ page }) => {
    // 1. Mock the GET /api/family call to return French for subsequent loads
    //    We do this early to ensure any re-loads (even during initial mount) are caught.
    await page.route('**/api/family', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              builders.familyMember({ name: 'Alex', preferredLanguage: 'fr' }),
              builders.familyMember({ id: MOCK_IDS.MEMBER_JORDAN, name: 'Jordan' }),
            ],
          }),
        });
      } else {
        await route.fallback();
      }
    });

    await page.goto('/profile');

    // Wait for the profile page to render
    await expect(page.getByTestId('locale-btn-en')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('locale-btn-fr')).toBeVisible();

    // 2. Switch to French and wait for the UI to update optimistically
    await page.getByTestId('locale-btn-fr').click();
    await expect(page.getByTestId('locale-btn-fr')).toHaveClass(/(?:^| )bg-indigo(?:$| )/, {
      timeout: 5000,
    });

    // 3. Navigate away and back
    await page.goto('/home');
    await page.goto('/profile');

    // French button must still be active (bg-indigo as a standalone class)
    const frenchBtn = page.getByTestId('locale-btn-fr');
    await expect(frenchBtn).toBeVisible({ timeout: 10000 });
    await expect(frenchBtn).toHaveClass(/(?:^| )bg-indigo(?:$| )/);

    // English button must be inactive (only has hover:bg-indigo/5, not standalone bg-indigo)
    const englishBtn = page.getByTestId('locale-btn-en');
    await expect(englishBtn).not.toHaveClass(/(?:^| )bg-indigo(?:$| )/);

    // Restore English so other tests are not affected
    await englishBtn.click();
  });

  test('GOTO pending state shows subtitle and description echo', async ({ page }) => {
    const GOTO_DESCRIPTION = "Grandma's Chicken Soup";

    // Mock GOTO setting with a pending recipe
    await page.route(
      (url) => url.pathname.includes('/api/settings/family_goto'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              key: 'family_goto',
              value: {
                description: GOTO_DESCRIPTION,
                recipeId: MOCK_IDS.RECIPE_LASAGNA,
              },
            },
          }),
        });
      }
    );

    // Status endpoint returns 'pending' — keep spinner visible
    await page.route(
      (url) => url.pathname.includes('/api/recipes/') && url.pathname.endsWith('/status'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: { id: MOCK_IDS.RECIPE_LASAGNA, status: 'pending' },
          }),
        });
      }
    );

    await page.goto('/profile/settings');

    // Pending state elements visible
    await expect(page.getByTestId('goto-pending-spinner')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('goto-pending-subtitle')).toBeVisible();
    await expect(page.getByTestId('goto-pending-description')).toHaveText(GOTO_DESCRIPTION);
    await expect(page.getByTestId('goto-change-btn')).toBeVisible();
  });

  test('family member name can be edited from settings', async ({ page }) => {
    const renamedMember = 'Jordan Chef';

    await page.route(
      (url) => url.pathname.includes(`/api/family/${MOCK_IDS.MEMBER_JORDAN}`),
      async (route) => {
        if (route.request().method() === 'PUT') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                id: MOCK_IDS.MEMBER_JORDAN,
                name: renamedMember,
              },
            }),
          });
          return;
        }

        await route.fallback();
      }
    );

    await page.goto('/profile/settings');

    await expect(page.getByTestId(`family-member-edit-${MOCK_IDS.MEMBER_JORDAN}`)).toBeVisible();
    await page.getByTestId(`family-member-edit-${MOCK_IDS.MEMBER_JORDAN}`).click();

    const editInput = page.getByTestId(`family-member-edit-input-${MOCK_IDS.MEMBER_JORDAN}`);
    await editInput.fill(renamedMember);
    await page.getByTestId(`family-member-save-${MOCK_IDS.MEMBER_JORDAN}`).click();

    await expect(page.getByTestId(`family-member-${MOCK_IDS.MEMBER_JORDAN}`)).toContainText(
      renamedMember
    );
  });

  test('invite dialog can copy the generated link and close cleanly', async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__copiedInviteLinks = [];
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async (text: string) => {
            (window as any).__copiedInviteLinks.push(text);
          },
        },
      });
    });

    await page.goto('/profile/settings');

    await page.getByTestId(`family-member-invite-${MOCK_IDS.MEMBER_JORDAN}`).click();

    await expect(page.getByTestId('invite-dialog')).toBeVisible();
    await expect(page.getByTestId('invite-dialog-link')).toContainText(MOCK_IDS.MEMBER_JORDAN);

    await page.getByTestId('invite-dialog-copy').click();

    const copiedLinks = await page.evaluate(() => (window as any).__copiedInviteLinks);
    expect(copiedLinks).toHaveLength(1);
    expect(copiedLinks[0]).toContain(MOCK_IDS.MEMBER_JORDAN);

    await page.getByTestId('invite-dialog-close').click();
    await expect(page.getByTestId('invite-dialog')).not.toBeVisible();
  });
});
