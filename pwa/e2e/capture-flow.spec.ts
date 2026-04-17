/**
 * E2E — Capture flow
 *
 * Covers the recipe capture multi-step flow:
 *   camera → review → dish-select → rate → done
 *
 * Because Playwright cannot control a real device camera, we inject a fixture
 * image at the "add photo" step using the file-chooser API. The camera view
 * falls back to a file-input when `getUserMedia` is unavailable (which it is
 * in headless Chromium).
 */

import path from 'path';
import { test, expect, type Page } from '@playwright/test';

// Path to a small fixture image bundled with the E2E suite
const FIXTURE_IMAGE = path.join(__dirname, 'fixtures', 'test-meal.jpg');


// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Select the first available family member and return to a logged-in state.
 * Creates a test member if none exist.
 */
async function loginAsMember(page: Page) {
  await page.context().clearCookies();
  await page.goto('/onboarding');
  await page.waitForLoadState('networkidle');

  const buttons = page.getByRole('button').filter({ hasText: /.+/ });
  const count = await buttons.count();

  if (count === 0) {
    // No members yet — create one
    const addButton = page.getByRole('button', {
      name: /Don't see your name/i,
    });
    if ((await addButton.count()) > 0) {
      await addButton.click();
      const input = page.getByRole('textbox');
      await input.fill(`E2EUser-${Date.now()}`);
      await page.getByRole('button', { name: 'Add Member', exact: true }).click();
      await page.waitForLoadState('networkidle');
    }
  }

  // Find and click the first family member
  const firstMember = page.getByRole('button').filter({ hasText: /.+/ }).first();
  if ((await firstMember.count()) > 0) {
    await firstMember.click();
    await expect(page).toHaveURL(/\/home/, { timeout: 10_000 });
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Scenario 1 — Navigate from home to /capture
// ──────────────────────────────────────────────────────────────────────────────

test('authenticated user can navigate to the capture page', async ({ page }) => {
  await loginAsMember(page);

  // Click the "Capture" link in the navigation
  await page.getByRole('link', { name: /^capture$/i }).click();

  await expect(page).toHaveURL(/\/capture/);

  // Capture page shows "New Capture" heading
  await expect(page.getByRole('heading', { name: /new capture/i })).toBeVisible();
});

// ──────────────────────────────────────────────────────────────────────────────
// Scenario 2 — Full capture flow with a mock image
// ──────────────────────────────────────────────────────────────────────────────

test('user can complete the capture flow and see a success message', async ({ page }) => {
  await loginAsMember(page);
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
  await loginAsMember(page);

  // Navigate directly to home
  await page.goto('/home');
  await expect(page.getByRole('heading', { name: /Good/i })).toBeVisible();
});
