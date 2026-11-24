import { expect, it, vi } from 'vitest';
import type { Page, Route } from '@playwright/test';
import { builders, MOCK_IDS, setupCommonRoutes } from '../../e2e/mock-api';

it('keeps preparation with swapped content and clears Sunday replacement receipts using existing date identities', async () => {
  const handlers = new Map<any, (route: Route) => Promise<unknown>>();
  const page = {
    route: vi.fn(async (key, handler) => handlers.set(key, handler)),
    evaluate: vi.fn().mockResolvedValue(undefined),
  };
  await setupCommonRoutes(
    page as unknown as Page,
    builders.deploymentCalendar({ today: '2026-05-05' }),
    {
      supperServings: {
        knownRecipe: {
          id: MOCK_IDS.RECIPE_SPAGHETTI,
          basis: 2,
          quantity: 200,
          ingredient: 'pasta',
          unit: 'g',
        },
      },
    }
  );
  async function call(key: any, method: string, path: string, body?: any) {
    const fulfill = vi.fn();
    await handlers.get(key)!({
      request: () => ({
        method: () => method,
        url: () => 'http://localhost' + path,
        postDataJSON: () => body,
      }),
      fulfill,
      fallback: vi.fn(),
    } as unknown as Route);
    return fulfill.mock.calls[0][0].json;
  }
  const scheduleKey = [...handlers.keys()].find(
    (key) => typeof key === 'function' && key(new URL('http://localhost/api/schedule'))
  );
  const read = () => call(scheduleKey, 'GET', '/api/schedule?referenceWeekStartDate=2026-05-04');
  for (const [dayIndex, recipeId] of [
    [4, MOCK_IDS.RECIPE_SPAGHETTI],
    [1, MOCK_IDS.RECIPE_CHICKEN],
  ])
    await call(
      '**/api/schedule/assign**',
      'POST',
      '/api/schedule/assign?referenceWeekStartDate=2026-05-04',
      { weekOffset: 0, dayIndex, recipeId }
    );
  const before = (await read()).data.days;
  const projectionKey = [...handlers.keys()].find(
    (key) => typeof key === 'string' && key.includes('ingredient-projection')
  );
  const projection = await call(
    projectionKey,
    'GET',
    `/api/recipes/${MOCK_IDS.RECIPE_SPAGHETTI}/ingredient-projection?supperDate=2026-05-08&context=assigned&occurrenceId=${before[4].occurrenceId}`
  );
  await call('**/api/schedule/day/*/prepare', 'POST', '/api/schedule/day/2026-05-08/prepare', {
    recipeId: MOCK_IDS.RECIPE_SPAGHETTI,
    expectedOccurrenceId: before[4].occurrenceId,
    expectedPlanToken: projection.preparationPlanToken,
    expectedServingVersion: projection.preparationServingVersion,
  });
  const receipt = (await read()).data.days[4].preparation;
  expect(receipt).toBeTruthy();
  await call(
    '**/api/schedule/move**',
    'POST',
    '/api/schedule/move?referenceWeekStartDate=2026-05-04',
    { weekOffset: 0, fromIndex: 4, toIndex: 1, recipeId: MOCK_IDS.RECIPE_SPAGHETTI }
  );
  const after = (await read()).data.days;
  expect(after[1].preparation).toEqual(receipt);
  expect(after[4].preparation).toBeFalsy();
  expect(after[1].occurrenceId).toBe(before[1].occurrenceId);
  expect(after[4].occurrenceId).toBe(before[4].occurrenceId);
  // Move the whole prepared occurrence to Sunday, then replace it: carry-forward is reopened.
  await call(
    '**/api/schedule/move**',
    'POST',
    '/api/schedule/move?referenceWeekStartDate=2026-05-04',
    { weekOffset: 0, fromIndex: 1, toIndex: 6, recipeId: MOCK_IDS.RECIPE_SPAGHETTI }
  );
  const sunday = (await read()).data.days[6];
  await call(
    '**/api/schedule/assign**',
    'POST',
    '/api/schedule/assign?referenceWeekStartDate=2026-05-04',
    { weekOffset: 0, dayIndex: 6, recipeId: MOCK_IDS.RECIPE_CHICKEN }
  );
  const replaced = (await read()).data.days[6];
  expect(replaced.occurrenceId).toBe(sunday.occurrenceId);
  expect(replaced.preparation).toBeFalsy();
  const next = (
    await call(scheduleKey, 'GET', '/api/schedule?referenceWeekStartDate=2026-05-04&weekOffset=1')
  ).data.days[0];
  expect(next.status).toBe(0);
  expect(next.preparation).toBeFalsy();
  expect(next.recipe.id).toBe(MOCK_IDS.RECIPE_SPAGHETTI);
  const deferredProjection = await call(
    projectionKey,
    'GET',
    `/api/recipes/${MOCK_IDS.RECIPE_SPAGHETTI}/ingredient-projection?supperDate=2026-05-11&context=assigned&occurrenceId=${next.occurrenceId}`
  );
  await call('**/api/schedule/day/*/prepare', 'POST', '/api/schedule/day/2026-05-11/prepare', {
    recipeId: MOCK_IDS.RECIPE_SPAGHETTI,
    expectedOccurrenceId: next.occurrenceId,
    expectedPlanToken: deferredProjection.preparationPlanToken,
    expectedServingVersion: deferredProjection.preparationServingVersion,
  });
  await call(
    '**/api/schedule/move**',
    'POST',
    '/api/schedule/move?referenceWeekStartDate=2026-05-04',
    {
      weekOffset: 1,
      sourceDate: '2026-05-11',
      recipeId: MOCK_IDS.RECIPE_SPAGHETTI,
      intent: 'defer',
      targetWeekOffset: 2,
    }
  );
  const deferred = (
    await call(scheduleKey, 'GET', '/api/schedule?referenceWeekStartDate=2026-05-04&weekOffset=2')
  ).data.days[0];
  expect(deferred.occurrenceId).toBe(next.occurrenceId);
  expect(deferred.status).toBe(0);
  expect(deferred.preparation).toBeFalsy();

  // Unified POST /api/schedule/move with intent: "defer" supports preserve and reset cookedDisposition
  const preserveProjection = await call(
    projectionKey,
    'GET',
    `/api/recipes/${MOCK_IDS.RECIPE_SPAGHETTI}/ingredient-projection?supperDate=2026-05-18&context=assigned&occurrenceId=${deferred.occurrenceId}`
  );
  await call('**/api/schedule/day/*/prepare', 'POST', '/api/schedule/day/2026-05-18/prepare', {
    recipeId: MOCK_IDS.RECIPE_SPAGHETTI,
    expectedOccurrenceId: deferred.occurrenceId,
    expectedPlanToken: preserveProjection.preparationPlanToken,
    expectedServingVersion: preserveProjection.preparationServingVersion,
  });
  const preparedReceipt = (
    await call(scheduleKey, 'GET', '/api/schedule?referenceWeekStartDate=2026-05-04&weekOffset=2')
  ).data.days[0].preparation;
  expect(preparedReceipt).toBeTruthy();

  const preservedResp = await call(
    '**/api/schedule/move**',
    'POST',
    '/api/schedule/move?referenceWeekStartDate=2026-05-04',
    {
      weekOffset: 2,
      recipeId: MOCK_IDS.RECIPE_SPAGHETTI,
      intent: 'defer',
      sourceDate: '2026-05-18',
      targetWeekOffset: 3,
      cookedDisposition: 'preserve',
    }
  );
  expect(preservedResp.data.moved).toBe(true);
  expect(preservedResp.data.destinationDate).toBe('2026-05-25');
  expect(preservedResp.data.scheduledWeekOffset).toBe(3);
  const preservedDay = (
    await call(scheduleKey, 'GET', '/api/schedule?referenceWeekStartDate=2026-05-04&weekOffset=3')
  ).data.days[0];
  expect(preservedDay.status).toBe(2);
  expect(preservedDay.preparation).toEqual(preparedReceipt);

  const resetResp = await call(
    '**/api/schedule/move**',
    'POST',
    '/api/schedule/move?referenceWeekStartDate=2026-05-04',
    {
      weekOffset: 3,
      recipeId: MOCK_IDS.RECIPE_SPAGHETTI,
      intent: 'defer',
      sourceDate: '2026-05-25',
      targetWeekOffset: 4,
      cookedDisposition: 'reset',
    }
  );
  expect(resetResp.data.moved).toBe(true);
  expect(resetResp.data.destinationDate).toBe('2026-06-01');
  expect(resetResp.data.scheduledWeekOffset).toBe(4);
  const resetDay = (
    await call(scheduleKey, 'GET', '/api/schedule?referenceWeekStartDate=2026-05-04&weekOffset=4')
  ).data.days[0];
  expect(resetDay.status).toBe(0);
  expect(resetDay.preparation).toBeFalsy();

  // Retired route and legacy move intents are rejected
  expect(handlers.has('**/api/schedule/defer**')).toBe(false);
  for (const invalid of [
    {
      weekOffset: 4,
      fromIndex: 0,
      toIndex: 1,
      recipeId: MOCK_IDS.RECIPE_SPAGHETTI,
      intent: 'push',
    },
    {
      weekOffset: 4,
      fromIndex: 0,
      toIndex: 0,
      targetWeekOffset: 5,
      recipeId: MOCK_IDS.RECIPE_SPAGHETTI,
      intent: 'swap',
    },
    {
      weekOffset: 4,
      fromIndex: 0,
      toIndex: 1,
      recipeId: MOCK_IDS.RECIPE_SPAGHETTI,
      intent: 'unknown',
    },
    {
      weekOffset: 4,
      sourceDate: '2026-06-01',
      recipeId: MOCK_IDS.RECIPE_SPAGHETTI,
      intent: 'defer',
      cookedDisposition: 'bogus',
    },
  ]) {
    const fulfill = vi.fn();
    await handlers.get('**/api/schedule/move**')!({
      request: () => ({
        method: () => 'POST',
        url: () => 'http://localhost/api/schedule/move?referenceWeekStartDate=2026-05-04',
        postDataJSON: () => invalid,
      }),
      fulfill,
      fallback: vi.fn(),
    } as unknown as Route);
    expect(fulfill.mock.calls[0][0].status).toBe(400);
  }
});
