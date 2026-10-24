import { test, expect } from './fixtures';
import { builders, MOCK_IDS, setupCommonRoutes } from './mock-api';

test('reopened close preserves recorded outcomes and an explicit correction can replace a cooked meal', async ({
  page,
}) => {
  await setupCommonRoutes(
    page,
    builders.deploymentCalendar({
      today: '2026-10-14',
      capturedAtUtc: '2026-10-14T12:00:00Z',
      currentWeekStartDate: '2026-10-12',
      referenceWeekStartDate: '2026-10-12',
      nextDayAtUtc: '2026-10-15T00:00:00Z',
    })
  );
  await page.goto('/onboarding');
  const result = await page.evaluate(
    async ({ original, replacement }) => {
      const post = async (path: string, body?: unknown) => {
        const response = await fetch(path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          ...(body ? { body: JSON.stringify(body) } : {}),
        });
        if (!response.ok) throw new Error(`Operation failed: ${response.status}`);
        return response.json();
      };
      const read = async () =>
        (await (await fetch('/api/schedule?weekOffset=0&referenceWeekStartDate=2026-10-12')).json())
          .data;
      await post('/api/schedule/assign?referenceWeekStartDate=2026-10-12', {
        weekOffset: 0,
        dayIndex: 0,
        recipeId: original,
      });
      await post('/api/schedule/day/2026-10-12/validate', { status: 2, recipeId: original });
      await post('/api/schedule/assign?referenceWeekStartDate=2026-10-12', {
        weekOffset: 0,
        dayIndex: 3,
        recipeId: original,
      });
      await post('/api/schedule/day/2026-10-15/validate', { status: 3, recipeId: original });
      await post('/api/schedule/day/2026-10-17/validate', {
        status: 3,
        nonCooking: { kind: 'eating_out' },
      });
      await post('/api/schedule/voting/open?weekOffset=0');
      const first = (await read()).votingRoundId;
      await post(`/api/schedule/lock?weekOffset=0&votingRoundId=${first}`);
      await post('/api/schedule/voting/open?weekOffset=0');
      const second = (await read()).votingRoundId;
      await post(`/api/schedule/lock?weekOffset=0&votingRoundId=${second}`);
      const closed = await read();
      const removed = await fetch('/api/schedule/day/2026-10-12/remove', { method: 'DELETE' });
      if (removed.status !== 204) throw new Error('Correction removal failed');
      await post('/api/schedule/voting/open?weekOffset=0');
      await post(`/api/schedule/lock?weekOffset=0&votingRoundId=${(await read()).votingRoundId}`);
      const freed = await read();
      await post('/api/schedule/assign?referenceWeekStartDate=2026-10-12', {
        weekOffset: 0,
        dayIndex: 0,
        recipeId: replacement,
      });
      await post('/api/schedule/day/2026-10-12/validate', { status: 2, recipeId: replacement });
      return { closed, freed, corrected: await read() };
    },
    { original: MOCK_IDS.RECIPE_CHICKEN, replacement: MOCK_IDS.RECIPE_LASAGNA }
  );
  expect(result.closed.days[0]).toMatchObject({
    status: 2,
    recipe: { id: MOCK_IDS.RECIPE_CHICKEN },
  });
  expect(result.closed.days[3]).toMatchObject({
    status: 3,
    recipe: { id: MOCK_IDS.RECIPE_CHICKEN },
  });
  expect(result.freed.days[0].recipe).toBeNull();
  expect(result.closed.days[5]).toMatchObject({
    status: 3,
    recipe: null,
    nonCooking: { kind: 'eating_out' },
  });
  expect(result.corrected.days[0]).toMatchObject({
    status: 2,
    recipe: { id: MOCK_IDS.RECIPE_LASAGNA },
  });
});
