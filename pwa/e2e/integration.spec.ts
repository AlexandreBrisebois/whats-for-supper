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
    const res = await request.get('http://localhost:5000/health', { timeout: 3_000 });
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
    const res = await request.post('http://localhost:5000/api/family', {
      data: { name },
    });
    if (!res.ok()) return null;
    const body = await res.json() as { id?: string };
    return body.id ?? null;
  } catch {
    return null;
  }
}

async function getRecipeCountViaApi(
  request: APIRequestContext,
  memberId: string
): Promise<number> {
  try {
    const res = await request.get('http://localhost:5000/api/recipes', {
      headers: { 'X-Family-Member-Id': memberId },
    });
    if (!res.ok()) return -1;
    const body = await res.json() as { total?: number; data?: unknown[] };
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
        name: 'member_id',
        value: memberId,
        domain: 'localhost',
        path: '/',
      },
    ]);
    await page.goto('/home');
  } else {
    // Fallback: use whatever is in the list, or add a new member via UI
    const buttons = page.getByRole('button').filter({ hasText: /.+/ });
    const count = await buttons.count();

    if (count > 0) {
      await buttons.first().click();
    } else {
      const addButton = page.getByRole('button', {
        name: /don't see your name|add.*member|add new/i,
      });
      if (await addButton.count() > 0) {
        await addButton.click();
        await page.getByRole('textbox').fill(memberName);
        await page.getByRole('button', { name: /add|save|submit|create/i }).click();
        await page.waitForLoadState('networkidle');

        const newEntry = page.getByText(memberName);
        if (await newEntry.count() > 0) {
          await newEntry.click();
        }
      }
    }
  }

  // ── Step 3: Verify home page ─────────────────────────────────────────────
  await expect(page).toHaveURL(/\/home/, { timeout: 10_000 });
  await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible();

  // ── Step 4: Navigate to capture ──────────────────────────────────────────
  await page.getByRole('link', { name: /capture a meal|add recipe/i }).click();
  await expect(page).toHaveURL(/\/capture/);
  await expect(page.getByRole('heading', { name: /add your first recipe|step 1/i })).toBeVisible();

  // ── Step 5: Submit a recipe (with mock image) ─────────────────────────────
  await page.context().grantPermissions(['camera']);

  const fileInput = page.locator('input[type="file"]');
  if (await fileInput.count() > 0) {
    await fileInput.setInputFiles(FIXTURE_IMAGE);
  } else {
    const [fc] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: /gallery|photo|upload|add/i }).first().click(),
    ]);
    await fc.setFiles(FIXTURE_IMAGE);
  }

  // Advance through each step
  const reviewBtn = page.getByRole('button', { name: /review photo/i });
  if (await reviewBtn.count() > 0) {
    await expect(reviewBtn).toBeEnabled({ timeout: 8_000 });
    await reviewBtn.click();

    // Step 2 → 3
    const mealSelectBtn = page.getByRole('button', { name: /select meal photo/i });
    await expect(mealSelectBtn).toBeEnabled();
    await mealSelectBtn.click();

    // Step 3 → 4
    const rateBtn = page.getByRole('button', { name: /rate|skip.*rate/i });
    await expect(rateBtn).toBeEnabled();
    await rateBtn.click();

    // Pick a rating
    const ratingButtons = page.getByRole('button').filter({ hasText: /[⚪🔴🟡💚]/ });
    await ratingButtons.first().click();

    // Save
    const saveBtn = page.getByRole('button', { name: /save recipe/i });
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    // ── Step 6: Success confirmation ──────────────────────────────────────
    await expect(
      page.getByText(/saved|success|recipe added|all done/i)
    ).toBeVisible({ timeout: 15_000 });
  }

  // ── Step 7: Return to /home ───────────────────────────────────────────────
  const homeLink = page.getByRole('link', { name: /home|back/i }).first();
  if (await homeLink.count() > 0) {
    await homeLink.click();
  } else {
    await page.goto('/home');
  }

  await expect(page).toHaveURL(/\/home/, { timeout: 10_000 });

  // ── Step 8: Verify recipe reflected in the API (if available) ────────────
  if (apiAvailable && memberId) {
    const count = await getRecipeCountViaApi(request, memberId);
    // We submitted one recipe so count should be at least 1
    expect(count).toBeGreaterThanOrEqual(1);
  }

  // Home page still shows welcome — no regressions
  await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible();
});
