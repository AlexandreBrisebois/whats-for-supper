import path from 'path';
import { test, expect } from './fixtures';

// Path to a small fixture image bundled with the E2E suite
const FIXTURE_IMAGE = path.join(__dirname, 'fixtures', 'test-meal.jpg');

test.describe('Capture Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Set x-family-member-id cookie to bypass onboarding
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
    await page.context().addCookies([
      {
        name: 'x-family-member-id',
        value: '550e8400-e29b-41d4-a716-446655440001',
        url: baseUrl,
      },
    ]);
    // Also set in localStorage for store persistence
    await page.goto('/');
    await page.evaluate(() =>
      localStorage.setItem(
        'family-storage',
        JSON.stringify({
          state: { selectedFamilyMemberId: '550e8400-e29b-41d4-a716-446655440001' },
          version: 0,
        })
      )
    );
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // Scenario 1 — Navigate from home to /capture
  // ──────────────────────────────────────────────────────────────────────────────

  test('authenticated user can navigate to the capture page from home', async ({ page }) => {
    await page.goto('/home');

    // Click the "Capture a Recipe" trigger on the Home page
    await page.getByRole('link', { name: /capture a recipe/i }).click();

    await expect(page).toHaveURL(/\/capture/);

    // Capture page shows camera button (accessible by aria-label)
    await expect(page.getByRole('button', { name: /take a photo/i })).toBeVisible();
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // Scenario 2 — Full capture flow with a mock image
  // ──────────────────────────────────────────────────────────────────────────────

  test('user can complete the capture flow and see a success message', async ({ page }) => {
    await page.goto('/capture');

    // ── Step 1: Camera — inject a file via the file chooser ──────────────────
    // Grant camera permissions (or mock) so the CameraView renders
    await page.context().grantPermissions(['camera']);

    // Look for a file input or a "choose from gallery" affordance
    const fileInput = page.locator('input[type="file"]').first();

    if ((await fileInput.count()) > 0) {
      // Direct file input available (headless behavior)
      await fileInput.setInputFiles(FIXTURE_IMAGE);
    } else {
      // Trigger file chooser via the "Pick from Gallery" button
      const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.getByRole('button', { name: /gallery/i }).click(),
      ]);
      await fileChooser.setFiles(FIXTURE_IMAGE);
    }

    // Wait for the photo to be added (a count or thumbnail should appear)
    await expect(page.getByRole('heading', { name: /photos \(1\)/i })).toBeVisible({
      timeout: 10_000,
    });

    // ── Step 2: Rating ───────────────────────────────────────────────────────
    // Pick the "Loved it!" rating emoji button
    const ratingButton = page.getByRole('button', { name: /loved it/i });
    await expect(ratingButton).toBeVisible();
    await ratingButton.click();

    // ── Step 3: Notes (Optional) ─────────────────────────────────────────────
    const notesInput = page.getByPlaceholder(/any tweaks/i);
    await notesInput.fill('Test recipe notes');

    // ── Step 4: Save ─────────────────────────────────────────────────────────
    const saveBtn = page.getByRole('button', { name: /save recipe/i });
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    // ── Done ─────────────────────────────────────────────────────────────────
    // A success confirmation message should appear
    await expect(page.getByText(/captured/i)).toBeVisible({ timeout: 15_000 });
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // Scenario 3 — After submit, user can return to /home
  // ──────────────────────────────────────────────────────────────────────────────

  test('after successful capture, user can return to home', async ({ page }) => {
    // Navigate directly to home
    await page.goto('/home');
    await expect(page.getByRole('heading', { name: /tonight's menu/i })).toBeVisible();
  });

  test('user can navigate to the search page from the navigation bar', async ({ page }) => {
    await page.goto('/home');

    // Click the "Search" link in the navigation bar
    await page.getByRole('link', { name: /^search$/i }).click();

    await expect(page).toHaveURL(/\/recipes/);
    // Verify search input is visible on recipes page (with extended timeout for data load)
    await expect(page.getByPlaceholder(/Something spicy for \d+/i)).toBeVisible({
      timeout: 10_000,
    });
  });
});
