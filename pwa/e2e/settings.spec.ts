import { test, expect } from './fixtures';
import { MOCK_IDS, setupCommonRoutes, builders, mockFeatureFlags } from './mock-api';

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

  for (const scenario of [
    {
      label: 'ordinary names without previews',
      names: ['Alex', 'Jordan'],
      preview: false,
      locale: 'en',
    },
    {
      label: 'ordinary names with previews',
      names: ['Alex', 'Jordan'],
      preview: true,
      locale: 'en',
    },
    { label: 'French previews', names: ['Alex', 'Jordan'], preview: true, locale: 'fr' },
    {
      label: 'long names with previews',
      locale: 'en',
      names: ['Alexandertheverylongfamilymembername', 'Jordan Alexandra Montgomery'],
      preview: true,
    },
  ] as const) {
    test.describe(scenario.label, () => {
      test.use({ appLocale: scenario.locale });
      for (const width of [320, 390, 820]) {
        test(`${scenario.label} fit at ${width}px`, async ({ page }) => {
          await page.setViewportSize({ width, height: 844 });
          await page.route('**/api/family', async (route) => {
            if (route.request().method() !== 'GET') return route.fallback();
            await route.fulfill({
              json: {
                data: [
                  builders.familyMember({ name: scenario.names[0] }),
                  builders.familyMember({
                    id: MOCK_IDS.MEMBER_JORDAN,
                    name: scenario.names[1],
                  }),
                ],
              },
            });
          });
          await mockFeatureFlags(
            page,
            scenario.preview
              ? [
                  {
                    key: 'single-page-recipe-steps',
                    enabled: false,
                    mode: 'opt-in',
                    memberEnabled: false,
                    displayName: 'Recipe on one page',
                    description: 'Scroll through all the cooking steps on one page.',
                  },
                ]
              : []
          );
          await page.goto('/profile/settings');
          await expect(
            page.getByRole('heading', {
              name: scenario.locale === 'fr' ? 'Paramètres' : 'Settings',
              exact: true,
            })
          ).toBeVisible();
          const member = page.getByTestId(`family-member-${MOCK_IDS.MEMBER_ALEX}`);
          await expect(member).toContainText(scenario.names[0]);
          for (const memberId of [MOCK_IDS.MEMBER_ALEX, MOCK_IDS.MEMBER_JORDAN]) {
            const invite = page.getByTestId(`family-member-invite-${memberId}`);
            const inviteLabel = scenario.locale === 'fr' ? 'Inviter' : 'Invite';
            await expect(invite).toHaveAccessibleName(inviteLabel);
            await expect(invite.getByText(inviteLabel, { exact: true })).toBeVisible();
            const inviteBounds = await invite.boundingBox();
            expect(inviteBounds!.width).toBeGreaterThan(inviteBounds!.height);
          }
          const contentBounds = await page.getByTestId('settings-content').boundingBox();
          await expect(page.getByTestId('settings-content')).toHaveCSS('padding-left', '0px');
          await expect(page.getByTestId('settings-content')).toHaveCSS('padding-right', '0px');
          // Keep the roomy v0.1.5 layout: use the available mobile width
          // without adding a second gutter inside the shared page layout.
          if (width < 640) {
            expect(contentBounds!.width).toBeGreaterThanOrEqual(width - 32);
          } else {
            // The original content-sized layout can be exactly one GOTO card wide.
            expect(contentBounds!.width).toBeGreaterThanOrEqual(384);
          }
          const expectFits = async () => {
            await expect
              .poll(() =>
                page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
              )
              .toBe(true);
            for (const control of await page.locator('[data-testid^="family-member-"]').all()) {
              const bounds = await control.boundingBox();
              expect(bounds).not.toBeNull();
              expect(bounds!.x).toBeGreaterThanOrEqual(0);
              expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
            }
          };
          await expectFits();
          await page.getByTestId(`family-member-edit-${MOCK_IDS.MEMBER_ALEX}`).click();
          await expect(
            page.getByTestId(`family-member-edit-input-${MOCK_IDS.MEMBER_ALEX}`)
          ).toBeVisible();
          await expectFits();
          await page.getByTestId(`family-member-cancel-${MOCK_IDS.MEMBER_ALEX}`).click();
          if (scenario.preview) {
            const preview = page.getByTestId('preview-features-toggle');
            await preview.scrollIntoViewIfNeeded();
            await expect(preview).toBeInViewport();
            await preview.click();
            const toggle = page.getByTestId('feature-toggle-single-page-recipe-steps');
            await expect(toggle).toHaveAccessibleName(
              scenario.locale === 'fr' ? /Recette sur une seule page/ : /Recipe on one page/
            );
            await toggle.scrollIntoViewIfNeeded();
            await expect(toggle).toBeInViewport();
            const label = page.locator('label[for="feature-single-page-recipe-steps"]');
            const labelBounds = await label.boundingBox();
            const toggleBounds = await toggle.boundingBox();
            expect(labelBounds!.x).toBeGreaterThanOrEqual(0);
            expect(labelBounds!.x + labelBounds!.width).toBeLessThanOrEqual(width);
            expect(toggleBounds!.x + toggleBounds!.width).toBeLessThanOrEqual(width);
            if (width < 640) {
              expect(toggleBounds!.y).toBeGreaterThanOrEqual(labelBounds!.y + labelBounds!.height);
              expect(labelBounds!.width).toBeGreaterThan(160);
            }
            await expect
              .poll(() => label.evaluate((element) => element.scrollWidth <= element.clientWidth))
              .toBe(true);
          } else {
            await expect(page.getByTestId('preview-features-section')).toHaveCount(0);
          }
          await expectFits();
          await page.screenshot({
            path: `test-results/settings-${scenario.label.replaceAll(' ', '-')}-${width}px.png`,
            fullPage: true,
          });
        });
      }
    });
  }

  test('hides Preview features when no opt-in flags are available', async ({ page }) => {
    await page.goto('/profile/settings');
    await expect(page.getByTestId('preview-features-section')).toHaveCount(0);
  });

  test('shows Recipe on one page as a collapsed preview disclosure', async ({ page }) => {
    await mockFeatureFlags(page, [
      {
        key: 'single-page-recipe-steps',
        enabled: false,
        mode: 'opt-in',
        memberEnabled: false,
        displayName: 'Recipe on one page',
        description: 'After getting ready, scroll through all the cooking steps on one page.',
      },
    ]);
    await page.goto('/profile/settings');
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
    const disclosure = page.getByRole('button', { name: /Preview features/i });
    await expect(disclosure).toHaveAttribute('aria-expanded', 'false');
    await disclosure.click();
    const previewSwitch = page.getByTestId('feature-toggle-single-page-recipe-steps');
    await expect(previewSwitch).toBeVisible();
    await expect(previewSwitch).toHaveAccessibleName(/Recipe on one page/i);

    // Effective state changes only after server confirmation. Hold the response
    // so the pending state is covered independently of network timing.
    let confirmSave!: () => void;
    const saveAllowed = new Promise<void>((resolve) => {
      confirmSave = resolve;
    });
    await page.route('**/api/feature-flags/single-page-recipe-steps', async (route) => {
      if (route.request().method() === 'PATCH') await saveAllowed;
      await route.fallback();
    });
    try {
      await previewSwitch.click();
      await expect(previewSwitch).toBeDisabled();
      await expect(previewSwitch).not.toBeChecked();
    } finally {
      confirmSave();
    }
    await expect(previewSwitch).toBeChecked();
    await expect(previewSwitch).toBeEnabled();
    await page.reload();
    await page.getByRole('button', { name: /Preview features/i }).click();
    await expect(page.getByRole('switch', { name: /Recipe on one page/i })).toBeChecked();
    await page.screenshot({ path: 'test-results/settings-preview-mobile.png', fullPage: true });
  });

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
