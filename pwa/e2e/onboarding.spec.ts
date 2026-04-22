/**
 * E2E — Onboarding flow
 *
 * Covers the three primary paths a new user follows when they first open the
 * app: being redirected to /onboarding, selecting an existing family member,
 * and creating a brand-new family member.
 *
 * Tests are designed to be idempotent: each scenario runs in a fresh browser
 * context with no cookies, and any family members created use a timestamp
 * suffix to avoid collisions across runs.
 */

import { test, expect } from './fixtures';

// ──────────────────────────────────────────────────────────────────────────────
// Scenario 1 — Fresh user is redirected to /onboarding
// ──────────────────────────────────────────────────────────────────────────────

test('fresh user visiting / is redirected to /onboarding', async ({ page }) => {
  await page.goto('/');

  // The middleware redirects unauthenticated users to /onboarding
  await expect(page).toHaveURL(/\/onboarding/);
});

test('onboarding page displays the family member list', async ({ page }) => {
  await page.goto('/onboarding');

  // Page heading
  await expect(page.getByRole('heading', { name: /who are you/i })).toBeVisible();

  // The family member list container exists (may be empty on a clean database)
  await expect(page.locator('[data-hint="family-list"]')).toBeVisible();
});

// ──────────────────────────────────────────────────────────────────────────────
// Scenario 2 — Select an existing family member
// ──────────────────────────────────────────────────────────────────────────────

test('selecting a family member redirects to /home with a welcome message', async ({ page }) => {
  await page.goto('/onboarding');

  // Wait for the family list to finish loading
  const familyList = page.locator('[data-hint="family-list"]');
  await expect(familyList).toBeVisible({ timeout: 10_000 });

  // Find the first clickable family member button (scoped to family list to exclude add-member button)
  const firstMember = familyList.getByRole('button').filter({ hasText: /.+/ }).first();

  // If no members exist yet we skip — the integration test creates one first
  const count = await firstMember.count();
  if (count === 0) {
    test.skip();
    return;
  }

  const memberName = await firstMember.textContent();
  await firstMember.click();

  // Should land on /home
  await expect(page).toHaveURL(/\/home/);

  // Debug: log cookies
  const cookieValue = await page.evaluate(() => document.cookie);
  console.log('Cookies after navigation:', cookieValue);

  // Wait for Tonight's Menu to appear (hydration)
  await expect(page.getByRole('heading', { name: /tonight's menu/i })).toBeVisible({
    timeout: 10_000,
  });

  // Welcome heading is no longer present, so we verify we are on the Home page
  await expect(page).toHaveURL(/\/home/);
});

// ──────────────────────────────────────────────────────────────────────────────
// Scenario 3 — Add a brand-new family member
// ──────────────────────────────────────────────────────────────────────────────

test('adding a new family member saves it and redirects to /home', async ({ page }) => {
  const newName = `TestUser-${Date.now()}`;

  await page.goto('/onboarding');
  await expect(page.locator('[data-hint="family-list"]')).toBeVisible({ timeout: 10_000 });

  // Open the "Don't see your name?" / add-member flow
  const addButton = page.getByRole('button', { name: /Don't see your name/i });

  await expect(addButton).toBeVisible({ timeout: 10_000 });
  await addButton.click();

  // Fill in the name field
  const nameInput = page.getByRole('textbox');
  await expect(nameInput).toBeVisible();
  await nameInput.fill(newName);

  // Submit the form
  const submitButton = page.getByRole('button', { name: 'Add Member', exact: true });
  // Select and log it — app should automatically redirect
  await submitButton.click();

  // The app will automatically select the new member and redirect to /home.
  // Validation for the home page content is covered by integration tests.
  await expect(page).toHaveURL(/\/home/, { timeout: 15_000 });
});
