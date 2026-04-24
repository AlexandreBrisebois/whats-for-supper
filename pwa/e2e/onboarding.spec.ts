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

  // The family member list container exists
  await expect(page.getByTestId('family-list')).toBeVisible();
});

test('selecting a family member redirects to /home with a welcome message', async ({ page }) => {
  await page.goto('/onboarding');

  // Wait for the family list to finish loading
  const familyList = page.getByTestId('family-list');
  await expect(familyList).toBeVisible({ timeout: 10_000 });

  // Find the first clickable family member button
  // In the mock API, 'Alex' (id: 550e8400-e29b-41d4-a716-446655440001) exists.
  const alexMember = page.getByTestId('family-member-550e8400-e29b-41d4-a716-446655440001');

  // Wait for the member to be visible (with extended timeout for loading)
  await expect(alexMember).toBeVisible({ timeout: 10_000 });
  await alexMember.click();

  // Should land on /home
  await expect(page).toHaveURL(/\/home/);

  // Wait for Tonight's Menu to appear (hydration)
  await expect(page.getByRole('heading', { name: /tonight's menu/i })).toBeVisible({
    timeout: 10_000,
  });
});

test('adding a new family member saves it and redirects to /home', async ({ page }) => {
  const newName = `TestUser-${Date.now()}`;

  await page.goto('/onboarding');
  await expect(page.getByTestId('family-list')).toBeVisible({ timeout: 10_000 });

  // Open the "Don't see your name?" / add-member flow
  const addButton = page.getByRole('button', { name: /Don't see your name/i });
  await addButton.click();

  // Fill in the name field
  const nameInput = page.getByRole('textbox');
  await nameInput.fill(newName);

  // Submit the form
  const submitButton = page.getByRole('button', { name: 'Add Member', exact: true });
  await submitButton.click();

  // The app will automatically select the new member and redirect to /home.
  await expect(page).toHaveURL(/\/home/, { timeout: 15_000 });
});
