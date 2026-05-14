/**
 * E2E — Planner Key Flows (ADR-029: Deterministic Strategy)
 *
 * Each test is fully self-contained with hardcoded static intercepts.
 * No Prism dependency, no polling-driven state, fixed reference date.
 */

import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import {
  MOCK_IDS,
  builders,
  currentMonday,
  toDateStr,
  setupCommonRoutes,
  mockSseWithConnectedSchedule,
  mockSseWithSlotUpdate,
} from './mock-api';

/** Returns the Monday of the week containing today (UTC). */
function thisWeekMonday() {
  return currentMonday();
}

function buildLockedDays() {
  // Use the current week's Monday so today's date is always in the mock.
  // Cook Mode button (E2) only shows on today's card, so the test must find today.
  const monday = thisWeekMonday();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    return {
      day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      date: toDateStr(d),
      recipe: builders.scheduleRecipe({
        id: MOCK_IDS.RECIPE_CARBONARA,
        name: 'Pasta Carbonara',
        voteCount: 3,
        ingredients: ['Spaghetti', 'Eggs', 'Pancetta', 'Pecorino'],
      }),
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

  await page.addInitScript((id) => {
    localStorage.setItem(
      'family-storage',
      JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 })
    );
  }, MOCK_IDS.MEMBER_ALEX);

  await setupCommonRoutes(page);

  const draftDays = buildDraftDays();
  // Use explicit MOCK_IDS to ensure uniqueness and validity
  draftDays[0].recipe = builders.scheduleRecipe({
    id: MOCK_IDS.RECIPE_CARBONARA,
    name: 'Pasta Carbonara',
  });
  draftDays[1].recipe = builders.scheduleRecipe({ id: MOCK_IDS.RECIPE_LASAGNA, name: 'Lasagna' });
  draftDays[2].recipe = builders.scheduleRecipe({ id: MOCK_IDS.RECIPE_CHICKEN, name: 'Chicken' });
  draftDays[3].recipe = builders.scheduleRecipe({ id: MOCK_IDS.RECIPE_GNOCCHI, name: 'Gnocchi' });
  draftDays[4].recipe = builders.scheduleRecipe({ id: MOCK_IDS.RECIPE_STIR_FRY, name: 'Stir Fry' });
  draftDays[5].recipe = builders.scheduleRecipe({ id: MOCK_IDS.RECIPE_TACOS, name: 'Tacos' });
  draftDays[6].recipe = builders.scheduleRecipe({
    id: '660e8400-e29b-41d4-a716-446655440099',
    name: 'Other',
  });

  // Stateful: POST/PUT (e.g. finalize) flips isLocked so the next GET reflects locked state
  let isLocked = locked;

  await page.route(
    (url) => url.pathname.includes('/api/schedule'),
    async (route) => {
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
    }
  );

  await page.goto('/planner');
  if (locked) {
    // Cook Mode button only shows on today's card (E2 constraint).
    const todayStr = toDateStr(currentMonday());
    await expect(
      page.locator(`[data-date="${todayStr}"]`).getByTestId('start-cook-mode')
    ).toBeVisible({
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

    // Cook Mode button only shows on today's card (E2 constraint).
    // Find today's card by data-date attribute rather than positional index.
    const todayStr = toDateStr(currentMonday());
    const todayCard = page.locator(`[data-date="${todayStr}"]`);
    await expect(todayCard.getByTestId('start-cook-mode')).toBeVisible({ timeout: 10_000 });
    await todayCard.getByTestId('start-cook-mode').click();

    const overlay = page.getByTestId('cooks-mode-overlay');
    await expect(overlay).toBeVisible();
    await expect(page.getByTestId('cooks-mode-step-indicator')).toContainText(/Check & Prep/i);
    await expect(page.getByTestId('cooks-mode-step-next')).toContainText(/Let's Cook/i);

    await page.getByTestId('cooks-mode-step-next').click();
    await expect(page.getByTestId('cooks-mode-step-indicator')).toContainText(/1 \/ /i);

    await page.getByTestId('cooks-mode-step-next').click();
    await expect(page.getByTestId('cooks-mode-step-indicator')).toContainText(/2 \/ /i);

    await page.getByTestId('close-cooks-mode').click();
    await expect(overlay).not.toBeVisible();
  });
});

test.describe('Planner — Ordered-In State', () => {
  test('ordered-in day shows ordered-in-indicator and hides plan-meal-button', async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);
    await page.addInitScript((id) => {
      localStorage.setItem(
        'family-storage',
        JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 })
      );
    }, MOCK_IDS.MEMBER_ALEX);

    await setupCommonRoutes(page);

    const monday = thisWeekMonday();
    const today = toDateStr(monday);

    // Build 7 days with today's slot having status:3 and no recipe
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setUTCDate(monday.getUTCDate() + i);
      const dateStr = toDateStr(d);
      return {
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
        date: dateStr,
        recipe: null,
        status: dateStr === today ? 3 : 0,
      };
    });
    const schedule = { weekOffset: 0, locked: false, status: 0, days };

    await page.route(
      (url) => url.pathname.includes('/api/schedule'),
      async (route) => {
        if (
          route.request().method() === 'GET' &&
          !route.request().url().includes('smart-defaults')
        ) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: schedule }),
          });
          return;
        }
        if (route.request().url().includes('smart-defaults')) {
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
              },
            }),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { message: 'ok' } }),
        });
      }
    );
    await mockSseWithConnectedSchedule(page, schedule);

    await page.goto('/planner');
    await expect(page.getByTestId('day-card-0')).toBeVisible({ timeout: 10_000 });

    const todayCard = page.locator(`[data-date="${today}"]`);
    // Assert ordered-in-indicator is visible
    await expect(todayCard.getByTestId('ordered-in-indicator')).toBeVisible({ timeout: 3000 });
    // Assert plan-meal-button is NOT visible
    await expect(todayCard.getByTestId('plan-meal-button')).not.toBeVisible();
  });
});

test.describe('Planner — Voting Flow', () => {
  test('Ask the Family opens voting and shows Nudge in planner action row only', async ({
    page,
  }) => {
    await setupPlanner(page, false);

    const askFamilyCta = page.getByTestId('ask-family-cta');
    await expect(askFamilyCta).toBeVisible();

    await page.route(
      (url) => url.pathname.includes('/api/schedule'),
      async (route) => {
        if (route.request().method() !== 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: { message: 'ok' } }),
          });
          return;
        }
        if (route.request().url().includes('smart-defaults')) {
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
                isVotingOpen: true,
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
              locked: false,
              status: 1,
              days: buildDraftDays(
                builders.scheduleRecipe({
                  id: MOCK_IDS.RECIPE_CARBONARA,
                  name: 'Pasta Carbonara',
                  voteCount: 3,
                })
              ),
            },
          }),
        });
      }
    );

    await askFamilyCta.click();

    await expect(page.getByTestId('nudge-family-cta')).toBeVisible({ timeout: 5_000 });
    await expect
      .poll(async () =>
        page
          .getByTestId('planner-action-row')
          .evaluate((row) => row.firstElementChild?.getAttribute('data-testid'))
      )
      .toBe('nudge-family-cta');

    await page.getByTestId('day-card-0').getByTestId('edit-recipe-button').click();
    await expect(page.getByTestId('pivot-sheet')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('pivot-nudge-family')).toHaveCount(0);
  });

  test('locked non-past week shows Ask the Family', async ({ page }) => {
    await setupPlanner(page, true);

    await expect(page.getByTestId('ask-family-cta')).toBeVisible();
  });
});

test.describe('Planner — SSE Live Updates', () => {
  test('SSE slot_updated → planner day card shows recipe name without poll', async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';

    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);

    await page.addInitScript((id) => {
      localStorage.setItem(
        'family-storage',
        JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 })
      );
    }, MOCK_IDS.MEMBER_ALEX);

    await setupCommonRoutes(page);

    // Build an initial empty week so the planner loads with no recipes assigned.
    const monday = currentMonday();
    const emptyDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setUTCDate(monday.getUTCDate() + i);
      return {
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
        date: toDateStr(d),
        recipe: null,
        status: 0,
      };
    });

    await page.route(
      (url) => url.pathname.includes('/api/schedule'),
      async (route) => {
        if (
          route.request().method() === 'GET' &&
          !route.request().url().includes('smart-defaults')
        ) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: { weekOffset: 0, locked: false, status: 0, days: emptyDays },
            }),
          });
          return;
        }
        if (route.request().url().includes('smart-defaults')) {
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
          body: JSON.stringify({ data: { message: 'ok' } }),
        });
      }
    );

    // Target Monday's slot — the first day card (index 0).
    const targetDate = toDateStr(monday);
    const pushedRecipe = builders.scheduleRecipe({
      id: MOCK_IDS.RECIPE_CARBONARA,
      name: 'Pasta Carbonara',
    });

    // Override the SSE stream to emit slot_updated for Monday after the connected snapshot.
    // BS-10: route.fulfill() closes the connection; EventSource reconnects automatically.
    // The test asserts on DOM state after the event is processed, not on connection state.
    await mockSseWithSlotUpdate(page, {
      date: targetDate,
      recipe: pushedRecipe,
      status: 0,
    });

    await page.goto('/planner');

    // Wait for the planner to render the day cards.
    await expect(page.getByTestId('day-card-0')).toBeVisible({ timeout: 10_000 });

    // Assert the recipe name appears on Monday's card via SSE push — no poll required.
    // The SSE slot_updated event is processed by weekStore.applySlotUpdate, which updates
    // the schedule in-place. The planner re-renders the card with the pushed recipe name.
    const mondayCard = page.locator(`[data-date="${targetDate}"]`);
    await expect(mondayCard.getByTestId('recipe-name')).toHaveText('Pasta Carbonara', {
      timeout: 5_000,
    });
  });
});
