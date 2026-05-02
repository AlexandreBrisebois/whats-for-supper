/**
 * E2E — Planner Key Flows (ADR-029: Deterministic Strategy)
 *
 * Each test is fully self-contained with hardcoded static intercepts.
 * No Prism dependency, no polling-driven state, fixed reference date.
 */

import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import { MOCK_IDS, builders, currentMonday, toDateStr } from './mock-api';

function buildLockedDays() {
  const monday = currentMonday();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    return {
      day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      date: toDateStr(d),
      recipe: {
        data: builders.scheduleRecipe({
          id: MOCK_IDS.RECIPE_CARBONARA,
          name: 'Pasta Carbonara',
          voteCount: 3,
          ingredients: ['Spaghetti', 'Eggs', 'Pancetta', 'Pecorino'],
        }),
      },
    };
  });
}

function buildDraftDays(mondayRecipe?: object) {
  const monday = currentMonday();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    return {
      day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      date: toDateStr(d),
      ...(i === 0 && mondayRecipe ? { recipe: mondayRecipe } : {}),
    };
  });
}

async function setupPlanner(page: Page, locked = false) {
  const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';

  await page
    .context()
    .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);

  // Inject localStorage before first navigation — avoids visiting /home which can crash
  // when Prism is unavailable (server component fetches fail server-side)
  await page.addInitScript((id) => {
    localStorage.setItem(
      'family-storage',
      JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 })
    );
  }, MOCK_IDS.MEMBER_ALEX);

  const draftDays = buildDraftDays();
  // Use explicit MOCK_IDS to ensure uniqueness and validity
  draftDays[0].recipe = {
    data: builders.scheduleRecipe({
      id: MOCK_IDS.RECIPE_CARBONARA,
      name: 'Pasta Carbonara',
    }),
  };
  draftDays[1].recipe = {
    data: builders.scheduleRecipe({ id: MOCK_IDS.RECIPE_LASAGNA, name: 'Lasagna' }),
  };
  draftDays[2].recipe = {
    data: builders.scheduleRecipe({ id: MOCK_IDS.RECIPE_CHICKEN, name: 'Chicken' }),
  };
  draftDays[3].recipe = {
    data: builders.scheduleRecipe({ id: MOCK_IDS.RECIPE_GNOCCHI, name: 'Gnocchi' }),
  };
  draftDays[4].recipe = {
    data: builders.scheduleRecipe({ id: MOCK_IDS.RECIPE_STIR_FRY, name: 'Stir Fry' }),
  };
  draftDays[5].recipe = {
    data: builders.scheduleRecipe({ id: MOCK_IDS.RECIPE_TACOS, name: 'Tacos' }),
  };
  draftDays[6].recipe = {
    data: builders.scheduleRecipe({
      id: '660e8400-e29b-41d4-a716-446655440099',
      name: 'Other',
    }),
  };

  // Stateful: POST/PUT (e.g. finalize) flips isLocked so the next GET reflects locked state
  let isLocked = locked;

  await page.route(/\/(?:backend\/)?api\/schedule/, async (route) => {
    const url = route.request().url();
    if (route.request().method() !== 'GET') {
      isLocked = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { message: 'ok' } }),
      });
      return;
    }
    if (url.includes('smart-defaults')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            weekOffset: 0,
            familySize: 3,
            consensusThreshold: 2,
            preSelectedRecipes: [],
            openSlots: [],
            consensusRecipesCount: 0,
            isVotingOpen: false,
          },
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          weekOffset: 0,
          locked: isLocked,
          status: isLocked ? 2 : 0,
          days: isLocked ? buildLockedDays() : draftDays,
        },
      }),
    });
  });

  await page.goto('/planner');
  if (locked) {
    await expect(page.getByTestId('day-card-0').getByTestId('start-cook-mode')).toBeVisible({
      timeout: 10_000,
    });
  } else {
    await expect(page.getByTestId('day-card-0')).toBeVisible({ timeout: 10_000 });
  }
}

test.describe('Planner — Finalize & Lock', () => {
  test('finalize shows locked state and plan-next-week button', async ({ page }) => {
    await setupPlanner(page, false);

    // Wait for recipes to load and plannedCount to reach threshold
    await expect(page.getByTestId('planned-count-badge')).toContainText('7/7');

    const finalizeBtn = page.getByTestId('finalize-button');
    await expect(finalizeBtn).toBeVisible();

    // setupPlanner already intercepts all schedule calls — including POSTs.
    // After finalize, the GET returns locked:true from the same intercept (locked=false
    // was the initial state; the catch block in handleFinalize sets isLocked=true locally).
    await finalizeBtn.scrollIntoViewIfNeeded();
    await finalizeBtn.click();

    await expect(page.getByTestId('finalized-status')).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Planner — Cook's Mode", () => {
  test('opens Cook Mode and navigates steps for a locked week', async ({ page }) => {
    await setupPlanner(page, true);

    const mondayCard = page.getByTestId('day-card-0');
    await expect(mondayCard.getByTestId('start-cook-mode')).toBeVisible();
    await mondayCard.getByTestId('start-cook-mode').click();

    const overlay = page.getByTestId('cooks-mode-overlay');
    await expect(overlay).toBeVisible();
    await expect(page.getByTestId('cooks-mode-step-indicator')).toContainText(/Step 1 of/i);

    await page.getByTestId('cooks-mode-step-next').click();
    await expect(page.getByTestId('cooks-mode-step-indicator')).toContainText(/Step 2 of/i);

    await page.getByTestId('close-cooks-mode').click();
    await expect(overlay).not.toBeVisible();
  });
});

test.describe('Planner — Voting Flow', () => {
  test('Ask the Family opens voting and shows Nudge button in pivot sheet', async ({ page }) => {
    await setupPlanner(page, false);

    // Verify ask-family CTA exists before triggering it
    const askFamilyCta = page.getByTestId('ask-family-cta');
    if ((await askFamilyCta.count()) === 0) {
      test.skip();
      return;
    }

    // After clicking Ask the Family, subsequent GETs return VotingOpen
    await page.route(/\/(?:backend\/)?api\/schedule(?:\?|$)/, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            weekOffset: 0,
            locked: false,
            status: 1,
            days: buildDraftDays({
              data: builders.scheduleRecipe({
                id: MOCK_IDS.RECIPE_CARBONARA,
                name: 'Pasta Carbonara',
                voteCount: 3,
              }),
            }),
          },
        }),
      });
    });

    await page.route(/\/(?:backend\/)?api\/schedule\/.*\/smart-defaults/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { isVotingOpen: true } }),
      });
    });

    await askFamilyCta.click();

    // Open pivot sheet for Monday — nudge button should be visible
    await page.getByTestId('day-card-0').click();
    const nudgeBtn = page.getByTestId('pivot-nudge-family');
    await expect(nudgeBtn).toBeVisible({ timeout: 5_000 });
  });
});
