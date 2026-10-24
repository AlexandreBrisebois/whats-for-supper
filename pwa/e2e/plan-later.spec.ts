import { test, expect } from './fixtures';
import { builders, MOCK_IDS, setupCommonRoutes } from './mock-api';

test('Plan later mock preserves the moved result, both week events and authoritative reads', async ({
  page,
}) => {
  const calendar = builders.deploymentCalendar({
    today: '2026-10-12',
    capturedAtUtc: '2026-10-12T12:00:00Z',
    currentWeekStartDate: '2026-10-12',
    referenceWeekStartDate: '2026-10-12',
    nextDayAtUtc: '2026-10-13T00:00:00Z',
  });
  await setupCommonRoutes(page, calendar);
  await page.goto('/onboarding');
  const result = await page.evaluate(async (recipeId) => {
    const events: string[] = [];
    (window as any).__planLaterEvents = events;
    (window as any).__sseSource = {
      dispatchEvent: (event: MessageEvent) => {
        if (event.type === 'week_updated')
          events.push(JSON.parse(event.data).schedule.weekStartDate);
      },
    };
    await fetch('/api/schedule/assign?referenceWeekStartDate=2026-10-12', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekOffset: 0, dayIndex: 0, recipeId }),
    });
    events.length = 0;
    const move = await (
      await fetch('/api/schedule/move?referenceWeekStartDate=2026-10-12', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekOffset: 0,
          fromIndex: 0,
          toIndex: 0,
          targetWeekOffset: 1,
          intent: 'push',
          recipeId,
        }),
      })
    ).json();
    const source = await (
      await fetch('/api/schedule?weekOffset=0&referenceWeekStartDate=2026-10-12')
    ).json();
    const target = await (
      await fetch('/api/schedule?weekOffset=1&referenceWeekStartDate=2026-10-12')
    ).json();
    return { move, source, target, events };
  }, MOCK_IDS.RECIPE_CHICKEN);
  expect(result.move.data).toMatchObject({
    moved: true,
    refreshComplete: true,
    sourceDate: '2026-10-12',
    affectedWeekStartDates: ['2026-10-12', '2026-10-19'],
  });
  await expect
    .poll(() => page.evaluate(() => (window as any).__planLaterEvents.slice(-2)))
    .toEqual(['2026-10-12', '2026-10-19']);
  expect(
    result.source.data.days.some((day: any) => day.recipe?.id === MOCK_IDS.RECIPE_CHICKEN)
  ).toBe(false);
  expect(
    result.target.data.days.some((day: any) => day.recipe?.id === MOCK_IDS.RECIPE_CHICKEN)
  ).toBe(true);
});
