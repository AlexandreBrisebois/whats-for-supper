import { test, expect } from './fixtures';
import { MOCK_IDS, setupCommonRoutes, builders } from './mock-api';

// ── Failed Captures section ─────────────────────────────────────────────────
// Component-level behaviour (render, retry state, clear, empty state) is fully
// covered by FailedCapturesSection.test.tsx. No E2E seam needed here.
// ────────────────────────────────────────────────────────────────────────────

test.describe('Settings — FamilyGOTOSettings card', () => {
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
    await page.setViewportSize({ width: 390, height: 844 });
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

  // GOTO ready/pending rendering is covered by FamilyGOTOSettings.test.tsx.

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
    await expect(page.getByTestId('locale-btn-fr')).toHaveClass(/(?:^| )bg-terracotta(?:$| )/, {
      timeout: 5000,
    });

    // 3. Navigate away and back
    await page.goto('/home');
    await page.goto('/profile');

    // French button must still be active (bg-terracotta as a standalone class)
    const frenchBtn = page.getByTestId('locale-btn-fr');
    await expect(frenchBtn).toBeVisible({ timeout: 10000 });
    await expect(frenchBtn).toHaveClass(/(?:^| )bg-terracotta(?:$| )/);

    // English button must be inactive (only has hover:bg-white/70, not standalone bg-terracotta)
    const englishBtn = page.getByTestId('locale-btn-en');
    await expect(englishBtn).not.toHaveClass(/(?:^| )bg-terracotta(?:$| )/);

    // Restore English so other tests are not affected
    await englishBtn.click();
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
