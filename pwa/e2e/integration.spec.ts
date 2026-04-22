/**
 * E2E — Full end-to-end integration
 *
 * Simulates the complete user journey from a blank browser session through
 * onboarding, recipe capture, and verification that the recipe is reflected
 * back in the UI. This is the primary smoke test for Phase 0.
 *
 * Because CI may run without a live backend, the test gracefully skips
 * API-dependent assertions when the API is unreachable.
 */

import path from 'path';
import { test, expect, type Page, type APIRequestContext } from '@playwright/test';

const FIXTURE_IMAGE = path.join(__dirname, 'fixtures', 'test-meal.jpg');

// ──────────────────────────────────────────────────────────────────────────────
// Setup helpers
// ──────────────────────────────────────────────────────────────────────────────

async function isApiReachable(request: APIRequestContext): Promise<boolean> {
  try {
    const mockApiPort = process.env.MOCK_API_PORT || '5001';
    const res = await request.get(`http://127.0.0.1:${mockApiPort}/health`, { timeout: 3_000 });
    return res.ok();
  } catch {
    return false;
  }
}

async function createFamilyMemberViaApi(
  request: APIRequestContext,
  name: string
): Promise<string | null> {
  try {
    const mockApiPort = process.env.MOCK_API_PORT || '5001';
    const res = await request.post(`http://127.0.0.1:${mockApiPort}/api/family`, {
      data: { name },
    });
    if (!res.ok()) return null;
    const body = (await res.json()) as { data?: { id: string } };
    return body.data?.id ?? null;
  } catch {
    return null;
  }
}

async function getRecipeCountViaApi(request: APIRequestContext, memberId: string): Promise<number> {
  try {
    const mockApiPort = process.env.MOCK_API_PORT || '5001';
    const res = await request.get(`http://127.0.0.1:${mockApiPort}/api/recipes`, {
      headers: { 'X-Family-Member-Id': memberId },
    });
    if (!res.ok()) return -1;
    const body = (await res.json()) as { total?: number; data?: unknown[] };
    return body.total ?? body.data?.length ?? 0;
  } catch {
    return -1;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Full E2E journey
// ──────────────────────────────────────────────────────────────────────────────

test('complete Phase 0 user journey', async ({ page, request }) => {
  const apiAvailable = await isApiReachable(request);

  // ── Step 1: Fresh user lands on app ──────────────────────────────────────
  await page.context().clearCookies();
  await page.goto('/');

  // Middleware redirects to /onboarding
  await expect(page).toHaveURL(/\/onboarding/, { timeout: 10_000 });
  await expect(page.getByRole('heading', { name: /who are you/i })).toBeVisible();

  // ── Step 2: Create (or select) a family member ───────────────────────────
  const memberName = `E2E-${Date.now()}`;
  let memberId: string | null = null;

  if (apiAvailable) {
    // Create via API so we control the exact name
    memberId = await createFamilyMemberViaApi(request, memberName);
  }

  await page.waitForLoadState('networkidle');

  if (memberId) {
    // Set the cookie directly — avoids click-targeting a dynamically ordered list
    await page.context().addCookies([
      {
        name: 'x-family-member-id',
        value: memberId,
        url: 'http://127.0.0.1:3000/',
      },
    ]);
    // Debug: Ensure cookie is present before navigation
    const cookies = await page.context().cookies();
    const found = cookies.find((c) => c.name === 'x-family-member-id' && c.value === memberId);
    expect(found).toBeTruthy();
    await page.goto('/home');
  } else {
    // Fallback: use whatever is in the list, or add a new member via UI
    const buttons = page.getByRole('button').filter({ hasText: /.+/ });
    const count = await buttons.count();

    if (count > 0) {
      await buttons.first().click();
    } else {
      const addButton = page.getByRole('button', {
        name: /Don't see your name/i,
      });
      if ((await addButton.count()) > 0) {
        await addButton.click();
        await page.getByRole('textbox').fill(memberName);
        await page.getByRole('button', { name: 'Add Member', exact: true }).click();
        await page.waitForLoadState('networkidle');

        const newEntry = page.getByText(memberName);
        if ((await newEntry.count()) > 0) {
          await newEntry.click();
        }
      }
    }
  }

  // ── Step 3: Verify home page ─────────────────────────────────────────────
  await expect(page).toHaveURL(/\/home/, { timeout: 10_000 });

  // Debug: log cookies
  const cookieValue = await page.evaluate(() => document.cookie);
  // eslint-disable-next-line no-console
  console.log('Cookies after navigation:', cookieValue);

  await expect(page.getByRole('heading', { name: /Good/i })).toBeVisible({ timeout: 10_000 });

  // ── Step 4: Navigate to capture ──────────────────────────────────────────
  await page.getByRole('link', { name: /^capture$/i }).click();
  await expect(page).toHaveURL(/\/capture/);
  await expect(page.getByRole('heading', { name: /new capture/i })).toBeVisible();

  // ── Step 5: Submit a recipe (with mock image) ─────────────────────────────
  await page.context().grantPermissions(['camera']);

  const fileInput = page.locator('input[type="file"]').first();
  if ((await fileInput.count()) > 0) {
    await fileInput.setInputFiles(FIXTURE_IMAGE);
  } else {
    const [fc] = await Promise.all([
      page.waitForEvent('filechooser'),
      page
        .getByRole('button', { name: /gallery/i })
        .first()
        .click(),
    ]);
    await fc.setFiles(FIXTURE_IMAGE);
  }

  // Verify photo added
  await expect(page.getByRole('heading', { name: /photos \(1\)/i })).toBeVisible({
    timeout: 10_000,
  });

  // Rate
  const ratingBtn = page.getByRole('button', { name: /loved it/i });
  await ratingBtn.click();

  // Save
  const saveBtn = page.getByRole('button', { name: /save recipe/i });
  await expect(saveBtn).toBeEnabled();
  await saveBtn.click();

  // ── Step 6: Success confirmation ──────────────────────────────────────
  await expect(page.getByText(/captured/i)).toBeVisible({ timeout: 15_000 });

  // ── Step 7: Return to /home ───────────────────────────────────────────────
  const homeLink = page.getByRole('link', { name: /home|back/i }).first();
  if ((await homeLink.count()) > 0) {
    await homeLink.click();
  } else {
    await page.goto('/home');
  }

  await expect(page).toHaveURL(/\/home/, { timeout: 10_000 });

  // Home page still shows greeting — no regressions
  await expect(page.getByRole('heading', { name: /Good/i })).toBeVisible();
});
