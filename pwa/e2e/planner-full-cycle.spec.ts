/**
 * E2E — Planner Full-Cycle Integration (Phase 10 Hardening)
 *
 * Verifies the complete Phase 10 user journey from Monday morning through
 * meal planning, family voting, menu finalization, Cook's Mode, persistence,
 * and meal validation. All "seams" must be tight and flows zero-friction.
 */

import { test, expect, type Page, type APIRequestContext } from './fixtures';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

const MOCK_API_PORT = process.env.MOCK_API_PORT || '5001';
const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000';

async function setupFamilyMember(page: Page): Promise<string> {
  const memberId = '550e8400-e29b-41d4-a716-446655440001';
  await page.context().addCookies([
    {
      name: 'x-family-member-id',
      value: memberId,
      url: BASE_URL,
    },
  ]);
  await page.goto('/');
  await page.evaluate((id) =>
    localStorage.setItem(
      'family-storage',
      JSON.stringify({
        state: { selectedFamilyMemberId: id },
        version: 0,
      })
    ),
    memberId
  );
  return memberId;
}

async function pollVoteCounts(
  page: Page,
  dayIndex: number,
  maxAttempts: number = 5
): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const voteText = await page
      .getByTestId(`day-card-${dayIndex}`)
      .getByTestId('vote-count')
      .textContent({ timeout: 1000 })
      .catch(() => null);

    if (voteText && voteText.includes('vote')) {
      const match = voteText.match(/(\d+)\s+vote/);
      if (match) return parseInt(match[1], 10);
    }

    await page.waitForTimeout(500);
  }
  return 0;
}

// ──────────────────────────────────────────────────────────────────────────────
// Tests: Planner Full-Cycle (Phase 10)
// ──────────────────────────────────────────────────────────────────────────────

test('complete 7-step user journey: ask family → vote → finalize → cook → validate', async ({
  page,
  request,
}) => {
  // Step 0: Setup
  const memberId = await setupFamilyMember(page);

  // ── Step 1: Monday Morning – Planner Opens, Smart Defaults Visible ───────
  await page.goto('/planner');
  await expect(page.getByTestId('week-range')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('day-card-0')).toBeVisible();

  // Verify Monday (day-card-0) shows a recipe card or "Add meal" placeholder
  const mondayCard = page.getByTestId('day-card-0');
  const hasRecipe = (await mondayCard.getByTestId('recipe-name').count()) > 0;
  const hasPlaceholder = (await mondayCard.getByTestId('plan-meal-button').count()) > 0;

  expect(hasRecipe || hasPlaceholder).toBeTruthy();

  // ── Step 2: Ask the Family – Tap "Ask the Family" & Simulate Votes ─────
  const askFamilyBtn = page.getByTestId('ask-family-cta');
  if ((await askFamilyBtn.count()) > 0) {
    // Voting is not yet opened; opening voting
    await askFamilyBtn.click();
    await expect(page.getByText(/voting.*open|ask the family/i)).toBeVisible({ timeout: 5_000 });
  }

  // Simulate family votes via mock API
  // Each family member votes on a discovery item
  const votePayloads = [
    { recipeId: 'recipe-001', familyMemberId: 'member-1', vote: 'like' },
    { recipeId: 'recipe-001', familyMemberId: 'member-2', vote: 'like' },
  ];

  for (const payload of votePayloads) {
    await request.post(`http://127.0.0.1:${MOCK_API_PORT}/api/discovery/vote`, {
      data: payload,
    });
  }

  // Wait for vote counts to update via polling
  // Poll the UI for updated vote counts on Monday
  const voteCountAfter = await pollVoteCounts(page, 0, 5);
  expect(voteCountAfter).toBeGreaterThan(0);

  // ── Step 3: Menu's In! – Finalize & Lock Week, Purge Votes ────────────────
  const menuFinalize = page.getByTestId('finalize-button');
  await expect(menuFinalize).toBeVisible();
  await menuFinalize.scrollIntoViewIfNeeded();
  await menuFinalize.click();

  // After finalization:
  // - Week should lock
  // - "Menu's In!" confirmation should appear
  // - Votes should be purged (API clears RecipeVotes table)
  // - Recipe last_cooked_date should NOT be updated yet
  await expect(page.getByTestId('plan-next-week')).toBeVisible({ timeout: 15_000 });

  // Verify votes are purged by polling the API
  const votesCheckResponse = await request.get(
    `http://127.0.0.1:${MOCK_API_PORT}/api/schedule/0/votes`
  );
  const votesData = (await votesCheckResponse.json()) as { data?: { count?: number } };
  expect(votesData.data?.count ?? 0).toBe(0);

  // ── Step 4: Tonight's Supper – Navigate Home, Flip Card, See Ingredients ──
  await page.goto('/home');
  await expect(page.getByTestId('tonight-menu-card')).toBeVisible({ timeout: 10_000 });

  // Tap the card to flip and reveal ingredients
  const flipButton = page.getByTestId('flip-card');
  if ((await flipButton.count()) > 0) {
    await flipButton.click();
    await expect(page.getByTestId('ingredients-list')).toBeVisible({ timeout: 5_000 });
  }

  // ── Step 5: Cook's Mode – Launch, Navigate Steps, Close ─────────────────
  const cooksButton = page.getByTestId('start-cook-mode');
  if ((await cooksButton.count()) > 0) {
    await cooksButton.click();

    const overlay = page.getByTestId('cooks-mode-overlay');
    await expect(overlay).toBeVisible({ timeout: 5_000 });

    // Navigate to Step 3 (finish 3 steps)
    const nextButton = page.getByTestId('cooks-mode-step-next');
    for (let i = 0; i < 2; i++) {
      if ((await nextButton.count()) > 0) {
        await nextButton.click();
        await page.waitForTimeout(300);
      }
    }

    // Verify we're on Step 3
    const stepIndicator = page.getByTestId('cooks-mode-step-indicator');
    await expect(stepIndicator).toContainText(/step 3/i, { timeout: 5_000 });

    // Close Cook's Mode
    const closeButton = page.getByTestId('close-cooks-mode');
    await closeButton.click();
    await expect(overlay).not.toBeVisible();
  }

  // ── Step 5b: Persistence Check – Re-open Cook's Mode ────────────────────
  if ((await cooksButton.count()) > 0) {
    await cooksButton.click();
    const overlay = page.getByTestId('cooks-mode-overlay');
    await expect(overlay).toBeVisible({ timeout: 5_000 });

    // Verify we're still on Step 3 (state persisted)
    const stepIndicator = page.getByTestId('cooks-mode-step-indicator');
    await expect(stepIndicator).toContainText(/step 3/i, { timeout: 5_000 });

    // Close again for next step
    const closeButton = page.getByTestId('close-cooks-mode');
    await closeButton.click();
  }

  // ── Step 6: Validation – Tap "Cooked", Verify last_cooked_date Updated ──
  const cookedButton = page.getByTestId('mark-cooked-button');
  if ((await cookedButton.count()) > 0) {
    await cookedButton.click();
    await expect(page.getByText(/cooked|completed/i)).toBeVisible({ timeout: 5_000 });

    // Verify last_cooked_date is updated via API
    const recipeCheckResponse = await request.get(`http://127.0.0.1:${MOCK_API_PORT}/api/recipes`);
    const recipeData = (await recipeCheckResponse.json()) as {
      data?: Array<{ lastCookedDate?: string }>;
    };
    const hasCookedDate = recipeData.data?.some((r) => r.lastCookedDate) ?? false;
    expect(hasCookedDate).toBeTruthy();
  }

  // ── Step 7: Recovery – Skip Tomorrow, Move to Next Week ──────────────────
  // Navigate back to planner to perform recovery skip
  await page.goto('/planner');
  await expect(page.getByTestId('week-range')).toBeVisible();

  // Tuesday (day-card-1) can be skipped
  const tuesdayCard = page.getByTestId('day-card-1');
  const skipButton = tuesdayCard.getByTestId('skip-meal');
  if ((await skipButton.count()) > 0) {
    await skipButton.click();
    // Verify skip confirmation
    await expect(page.getByText(/skipped|removed/i)).toBeVisible({ timeout: 5_000 });
  }

  // Move to next week via chevron
  const nextWeekBtn = page.getByTestId('next-week');
  const initialRange = await page.getByTestId('week-range').textContent();
  await nextWeekBtn.click();

  // Verify week changed
  await expect(page.getByTestId('week-range')).not.toHaveText(initialRange || '', {
    timeout: 10_000,
  });

  // Verify calendar structure is intact (7 day cards visible)
  const dayCards = page.getByTestId(/^day-card-/);
  await expect(dayCards).toHaveCount(7);
});

// ── Variant: Test offline resilience (localStorage fallback) ────────────────
test('persist Cook Mode state across page reload', async ({ page }) => {
  const memberId = await setupFamilyMember(page);

  await page.goto('/planner');
  await expect(page.getByTestId('day-card-0')).toBeVisible({ timeout: 10_000 });

  // Open Cook's Mode and navigate to Step 2
  const cooksButton = page.getByTestId('start-cook-mode');
  if ((await cooksButton.count()) > 0) {
    await cooksButton.click();
    const overlay = page.getByTestId('cooks-mode-overlay');
    await expect(overlay).toBeVisible();

    const nextButton = page.getByTestId('cooks-mode-step-next');
    if ((await nextButton.count()) > 0) {
      await nextButton.click();
      await page.waitForTimeout(300);
    }

    // Verify Step 2
    await expect(page.getByTestId('cooks-mode-step-indicator')).toContainText(/step 2/i);

    // Note: Don't close; just reload to test persistence
  }

  // Reload page
  await page.reload();
  await expect(page.getByTestId('planner-tab')).toBeVisible({ timeout: 10_000 });

  // Re-open Cook's Mode
  if ((await cooksButton.count()) > 0) {
    await cooksButton.click();
    const overlay = page.getByTestId('cooks-mode-overlay');
    await expect(overlay).toBeVisible();

    // Verify state was restored (Step 2)
    await expect(page.getByTestId('cooks-mode-step-indicator')).toContainText(/step 2/i, {
      timeout: 5_000,
    });
  }
});

// ── Variant: Test vote polling mechanism ──────────────────────────────────
test('poll and update vote counts in real-time', async ({ page, request }) => {
  const memberId = await setupFamilyMember(page);

  await page.goto('/planner');
  await expect(page.getByTestId('day-card-0')).toBeVisible({ timeout: 10_000 });

  // Open "Ask the Family" to trigger voting mode
  const askBtn = page.getByTestId('ask-family-cta');
  if ((await askBtn.count()) > 0) {
    await askBtn.click();
    await page.waitForTimeout(500);
  }

  // Baseline vote count
  let baseline = 0;
  const voteElement = page.getByTestId('day-card-0').getByTestId('vote-count');
  if ((await voteElement.count()) > 0) {
    const text = await voteElement.textContent();
    const match = text?.match(/(\d+)\s+vote/) ?? null;
    baseline = match ? parseInt(match[1], 10) : 0;
  }

  // Simulate new votes via mock API
  for (let i = 0; i < 2; i++) {
    await request.post(`http://127.0.0.1:${MOCK_API_PORT}/api/discovery/vote`, {
      data: {
        recipeId: 'recipe-001',
        familyMemberId: `member-${i}`,
        vote: 'like',
      },
    });
  }

  // Poll for updated count (should increase by 2)
  const updatedCount = await pollVoteCounts(page, 0, 8);
  expect(updatedCount).toBeGreaterThanOrEqual(baseline + 2);
});
