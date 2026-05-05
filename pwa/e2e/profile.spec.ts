import { test, expect } from './fixtures';
import { MOCK_IDS, setupCommonRoutes } from './mock-api';

test.describe('Profile Page', () => {
  test.beforeEach(async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);

    await setupCommonRoutes(page);
  });

  /**
   * Task 43 — Coverage gap:
   * The profile page title must read "Who's Eating?" (Task 39 fix).
   * Verifies the title is visible on the page regardless of member selection state.
   */
  test('"Who\'s Eating?" title is visible on the profile page', async ({ page }) => {
    await page.goto('/profile');

    // The h2 heading must contain the updated title text
    await expect(page.getByRole('heading', { name: /who's eating/i })).toBeVisible({
      timeout: 5000,
    });
  });

  /**
   * Task 39 — Dead-end fix:
   * When a family member is already selected, the profile page must show a
   * "Continue as [name]" button. Tapping it navigates to /home without
   * changing the selected member.
   */
  test('shows "Continue as Alex" button when a member is already selected', async ({ page }) => {
    // Seed localStorage with Alex already selected
    await page.goto('/onboarding');
    await page.evaluate((id) => {
      localStorage.setItem(
        'family-storage',
        JSON.stringify({
          state: {
            selectedFamilyMemberId: id,
            familyMembers: [{ id, name: 'Alex', createdAt: new Date(), updatedAt: new Date() }],
            _hasHydrated: true,
            hasLoaded: true,
          },
          version: 0,
        })
      );
    }, MOCK_IDS.MEMBER_ALEX);

    await page.goto('/profile');

    // Button must be visible with the member's name
    const continueBtn = page.getByTestId('continue-as-member-btn');
    await expect(continueBtn).toBeVisible();
    await expect(continueBtn).toContainText('Continue as Alex');
  });

  test('tapping "Continue as Alex" navigates to /home', async ({ page }) => {
    // Seed localStorage with Alex already selected
    await page.goto('/onboarding');
    await page.evaluate((id) => {
      localStorage.setItem(
        'family-storage',
        JSON.stringify({
          state: {
            selectedFamilyMemberId: id,
            familyMembers: [{ id, name: 'Alex', createdAt: new Date(), updatedAt: new Date() }],
            _hasHydrated: true,
            hasLoaded: true,
          },
          version: 0,
        })
      );
    }, MOCK_IDS.MEMBER_ALEX);

    await page.goto('/profile');

    const continueBtn = page.getByTestId('continue-as-member-btn');
    await expect(continueBtn).toBeVisible();
    await continueBtn.click();

    // Must navigate to /home
    await expect(page).toHaveURL(/\/home/);
  });

  test('does NOT show "Continue as" button when no member is selected', async ({ page }) => {
    // Seed localStorage with no selected member
    await page.goto('/onboarding');
    await page.evaluate(() => {
      localStorage.setItem(
        'family-storage',
        JSON.stringify({
          state: {
            selectedFamilyMemberId: null,
            familyMembers: [],
            _hasHydrated: true,
            hasLoaded: true,
          },
          version: 0,
        })
      );
    });

    await page.goto('/profile');

    const continueBtn = page.getByTestId('continue-as-member-btn');
    await expect(continueBtn).not.toBeVisible();
  });
});
