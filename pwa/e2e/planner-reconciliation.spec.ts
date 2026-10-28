import { test, expect } from './fixtures';
import { MOCK_IDS, builders, setupCommonRoutes, mockNonCookingSchedule } from './mock-api';

test('remote move sequence applies through the schedule stream without a local move', async ({
  page,
  baseURL,
}) => {
  await setupCommonRoutes(page);
  const schedule = builders.scheduleDays();
  schedule.days = schedule.days!.map((day, index) => ({
    ...day,
    status: 0,
    nonCooking: null,
    recipe:
      index < 2
        ? builders.scheduleRecipe({
            id: index === 0 ? MOCK_IDS.RECIPE_LASAGNA : MOCK_IDS.RECIPE_TACOS,
            name: index === 0 ? 'Monday Lasagna' : 'Tuesday Tacos',
          })
        : null,
  }));
  await mockNonCookingSchedule(
    page,
    schedule as unknown as Parameters<typeof mockNonCookingSchedule>[1]
  );
  await page.context().addCookies([
    {
      name: 'x-family-member-id',
      value: MOCK_IDS.MEMBER_ALEX,
      url: baseURL || 'http://127.0.0.1:3000',
    },
  ]);
  await page.addInitScript((id) => {
    localStorage.setItem(
      'family-storage',
      JSON.stringify({
        state: { selectedFamilyMemberId: id },
        version: 0,
      })
    );
  }, MOCK_IDS.MEMBER_ALEX);
  const moves: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/schedule/move') moves.push(request.url());
  });
  await page.goto('/planner');
  await expect(page.getByTestId('day-card-0')).toContainText('Monday Lasagna');
  await expect(page.getByTestId('day-card-1')).toContainText('Tuesday Tacos');

  // Another connection's committed move arrives as a push, with its own sequence.
  // Do not call the mock move endpoint: its automatic events would hide this seam.
  const remote = structuredClone(schedule);
  [remote.days![0].recipe, remote.days![1].recipe] = [
    remote.days![1].recipe,
    remote.days![0].recipe,
  ];
  await page.evaluate((schedule) => {
    (window as any).__sseSource.dispatchEvent(
      new MessageEvent('week_updated', {
        data: JSON.stringify({ schedule, echoSeq: 42 }),
      })
    );
  }, remote);
  await expect(page.getByTestId('day-card-0')).toContainText('Tuesday Tacos');
  await expect(page.getByTestId('day-card-1')).toContainText('Monday Lasagna');
  expect(moves).toEqual([]);
  schedule.days = remote.days;
  await page.reload();
  await expect(page.getByTestId('day-card-0')).toContainText('Tuesday Tacos');
  await expect(page.getByTestId('day-card-1')).toContainText('Monday Lasagna');
  expect(moves).toEqual([]);
});

for (const event of ['week_updated', 'connected'] as const) {
  test(`an authoritative empty ${event} snapshot removes the last saved meal`, async ({
    page,
    baseURL,
  }) => {
    await setupCommonRoutes(page);
    const schedule = builders.scheduleDays();
    schedule.days = schedule.days!.map((day, index) => ({
      ...day,
      status: 0,
      nonCooking: null,
      recipe:
        index === 0
          ? builders.scheduleRecipe({
              id: MOCK_IDS.RECIPE_LASAGNA,
              name: 'Last saved supper',
            })
          : null,
    }));
    await mockNonCookingSchedule(
      page,
      schedule as unknown as Parameters<typeof mockNonCookingSchedule>[1]
    );
    await page.context().addCookies([
      {
        name: 'x-family-member-id',
        value: MOCK_IDS.MEMBER_ALEX,
        url: baseURL || 'http://127.0.0.1:3000',
      },
    ]);
    await page.addInitScript((id) => {
      localStorage.setItem(
        'family-storage',
        JSON.stringify({
          state: { selectedFamilyMemberId: id },
          version: 0,
        })
      );
    }, MOCK_IDS.MEMBER_ALEX);
    await page.goto('/planner');
    const monday = page.getByTestId('day-card-0');
    await expect(monday).toContainText('Last saved supper');

    // The other device commits removal before its snapshot reaches this Planner.
    const empty = await page.evaluate(async (date) => {
      const removed = await fetch(`/api/schedule/day/${date}/remove`, { method: 'DELETE' });
      if (!removed.ok) throw new Error('Mock removal failed');
      return (await (await fetch('/api/schedule?weekOffset=0')).json()).data;
    }, schedule.days![0].date!);
    expect(empty.days.every((day: { recipe: unknown }) => !day.recipe)).toBe(true);
    await expect(monday).toContainText('Last saved supper');

    await page.evaluate(
      ({ event, schedule }) => {
        (window as any).__sseSource.dispatchEvent(
          new MessageEvent(event, {
            data: JSON.stringify({ schedule }),
          })
        );
      },
      { event, schedule: empty }
    );
    await expect(monday).not.toContainText('Last saved supper');
    await expect(monday.getByTestId('plan-meal-button')).toBeVisible();

    // Verify persisted mock state separately from the immediate pushed UI state.
    const persisted = await page.evaluate(
      async () => (await (await fetch('/api/schedule?weekOffset=0')).json()).data
    );
    expect(persisted.days.every((day: { recipe: unknown }) => !day.recipe)).toBe(true);
  });
}

for (const scenario of ['pending batch', 'later remote event', 'out-of-order reads'] as const) {
  test(`delayed movement reconciliation preserves ${scenario}`, async ({ page, baseURL }) => {
    await setupCommonRoutes(page);
    const schedule = builders.scheduleDays();
    schedule.days = schedule.days!.map((day, i) => ({
      ...day,
      status: 0,
      nonCooking: null,
      recipe:
        i < 4
          ? builders.scheduleRecipe({
              id: [
                MOCK_IDS.RECIPE_LASAGNA,
                MOCK_IDS.RECIPE_TACOS,
                MOCK_IDS.RECIPE_CHICKEN,
                MOCK_IDS.RECIPE_GNOCCHI,
              ][i],
              name: ['First supper', 'Second supper', 'Third supper', 'Fourth supper'][i],
            })
          : null,
    }));
    await mockNonCookingSchedule(
      page,
      schedule as unknown as Parameters<typeof mockNonCookingSchedule>[1]
    );
    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseURL! }]);
    await page.addInitScript(
      (id) =>
        localStorage.setItem(
          'family-storage',
          JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 })
        ),
      MOCK_IDS.MEMBER_ALEX
    );
    await page.goto('/planner');
    await expect(page.getByTestId('day-card-0')).toContainText('First supper');
    const moves: import('@playwright/test').Route[] = [];
    const reads: { route: import('@playwright/test').Route; snapshot: typeof schedule }[] = [];
    await page.route(
      (url) => url.pathname === '/api/schedule/move',
      (route) => {
        moves.push(route);
      }
    );
    await page.route(
      (url) => url.pathname === '/api/schedule',
      (route) => {
        reads.push({ route, snapshot: structuredClone(schedule) });
      }
    );
    const move = async (from: number) => {
      await page.getByTestId(`day-card-${from}`).getByTestId('planner-drag-handle').focus();
      await page.keyboard.press('ArrowDown');
    };
    const finish = async (index: number) => {
      const body = moves[index].request().postDataJSON();
      [schedule.days![body.fromIndex], schedule.days![body.toIndex]] = [
        {
          ...schedule.days![body.fromIndex],
          ...schedule.days![body.toIndex],
          date: schedule.days![body.fromIndex].date,
          day: schedule.days![body.fromIndex].day,
        },
        {
          ...schedule.days![body.toIndex],
          ...schedule.days![body.fromIndex],
          date: schedule.days![body.toIndex].date,
          day: schedule.days![body.toIndex].day,
        },
      ];
      const done = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === '/api/schedule/move' &&
          response.request() === moves[index].request()
      );
      await moves[index].fulfill({ json: { data: schedule } });
      await done;
    };
    await move(0);
    await expect.poll(() => moves.length).toBe(1);
    if (scenario === 'pending batch') {
      await move(2);
      await expect.poll(() => moves.length).toBe(2);
      await finish(0);
      // Allow the HTTP completion's promise continuations to run in the browser.
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
          )
      );
      expect(reads).toHaveLength(0);
      await finish(1);
      await expect.poll(() => reads.length).toBe(1);
      await reads[0].route.fulfill({ json: { data: reads[0].snapshot } });
      await expect(page.getByTestId('day-card-3')).toContainText('Third supper');
      await expect(page.getByTestId('day-card-1')).toContainText('First supper');
    } else if (scenario === 'out-of-order reads') {
      await finish(0);
      await expect.poll(() => reads.length).toBe(1);
      await move(2);
      await expect.poll(() => moves.length).toBe(2);
      await finish(1);
      await expect.poll(() => reads.length).toBe(2);
      await reads[1].route.fulfill({ json: { data: reads[1].snapshot } });
      await expect(page.getByTestId('day-card-3')).toContainText('Third supper');
      await reads[0].route.fulfill({ json: { data: reads[0].snapshot } });
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
          )
      );
      await expect(page.getByTestId('day-card-3')).toContainText('Third supper');
      expect(moves).toHaveLength(2);
    } else {
      await finish(0);
      await expect.poll(() => reads.length).toBe(1);
      const remote = structuredClone(schedule);
      remote.days![4].recipe = builders.scheduleRecipe({
        id: MOCK_IDS.RECIPE_LASAGNA,
        name: 'Remote family supper',
      });
      await page.evaluate(
        (schedule) =>
          (window as any).__sseSource.dispatchEvent(
            new MessageEvent('week_updated', { data: JSON.stringify({ schedule, echoSeq: 97 }) })
          ),
        remote
      );
      await expect(page.getByTestId('day-card-4')).toContainText('Remote family supper');
      await reads[0].route.fulfill({ json: { data: reads[0].snapshot } });
      // A second browser turn observes the actual response/store integration.
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
          )
      );
      await expect(page.getByTestId('day-card-4')).toContainText('Remote family supper');
    }
  });
}

for (const refreshFails of [false, true]) {
  test(`an earlier rejected move preserves an independent success when refresh ${refreshFails ? 'fails' : 'succeeds'}`, async ({
    page,
    baseURL,
  }) => {
    await setupCommonRoutes(page);
    const schedule = builders.scheduleDays();
    schedule.days = schedule.days!.map((day, i) => ({
      ...day,
      status: 0,
      nonCooking: null,
      recipe:
        i < 4
          ? builders.scheduleRecipe({
              id: [
                MOCK_IDS.RECIPE_LASAGNA,
                MOCK_IDS.RECIPE_TACOS,
                MOCK_IDS.RECIPE_CHICKEN,
                MOCK_IDS.RECIPE_GNOCCHI,
              ][i],
              name: ['First supper', 'Second supper', 'Third supper', 'Fourth supper'][i],
            })
          : null,
    }));
    await mockNonCookingSchedule(
      page,
      schedule as unknown as Parameters<typeof mockNonCookingSchedule>[1]
    );
    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseURL! }]);
    await page.addInitScript(
      ({ id, french }) => {
        localStorage.setItem(
          'family-storage',
          JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 })
        );
        if (french) localStorage.setItem('locale', 'fr');
      },
      { id: MOCK_IDS.MEMBER_ALEX, french: refreshFails }
    );
    // This case owns HTTP settlement/recovery ordering. A finite SSE response
    // reconnects and replays server state while the authoritative read is held.
    // Remote/reconnect behavior is exercised separately above.
    await page.route(/\/(?:backend\/)?api\/stream/, (route) => route.fulfill({ status: 204 }));
    await page.goto('/planner');
    await expect(page.getByTestId('day-card-0')).toContainText('First supper');
    const moves: import('@playwright/test').Route[] = [];
    const reads: import('@playwright/test').Route[] = [];
    await page.route(
      (url) => url.pathname === '/api/schedule/move',
      (route) => {
        moves.push(route);
      }
    );
    await page.route(
      (url) => url.pathname === '/api/schedule' && url.searchParams.has('referenceWeekStartDate'),
      (route) => {
        reads.push(route);
      }
    );
    const move = async (from: number) => {
      await page.getByTestId(`day-card-${from}`).getByTestId('planner-drag-handle').focus();
      await page.keyboard.press('ArrowDown');
      await expect(
        page.getByTestId(`day-card-${from + 1}`).getByTestId('planner-drag-handle')
      ).toBeFocused();
    };
    await move(0);
    await expect.poll(() => moves.length).toBe(1);
    await move(2);
    await expect.poll(() => moves.length).toBe(2);
    expect(moves.map((route) => route.request().postDataJSON())).toEqual([
      {
        weekOffset: 0,
        recipeId: MOCK_IDS.RECIPE_LASAGNA,
        fromIndex: 0,
        toIndex: 1,
        intent: 'swap',
      },
      {
        weekOffset: 0,
        recipeId: MOCK_IDS.RECIPE_CHICKEN,
        fromIndex: 2,
        toIndex: 3,
        intent: 'swap',
      },
    ]);
    [schedule.days![2].recipe, schedule.days![3].recipe] = [
      schedule.days![3].recipe,
      schedule.days![2].recipe,
    ];
    await moves[1].fulfill({ json: { data: schedule } });
    await expect(page.getByTestId('day-card-3')).toContainText('Third supper');
    expect(reads).toHaveLength(0);
    await moves[0].fulfill({ status: 400, json: { message: 'Move rejected' } });
    await expect.poll(() => reads.length).toBe(1);
    // Before the authoritative response, the newer optimistic schedule survives.
    await expect(page.getByTestId('day-card-3')).toContainText('Third supper');
    await expect(page.getByTestId('day-card-1')).toContainText('First supper');
    if (refreshFails) {
      await reads[0].fulfill({ status: 400, json: { message: 'Refresh unavailable' } });
      await expect(page.getByTestId('toast')).toHaveText(/Impossible d’actualiser votre planning/);
      await expect(page.getByTestId('day-card-3')).toContainText('Third supper');
      await expect(page.getByTestId('day-card-1')).toContainText('First supper');
    } else {
      await reads[0].fulfill({ json: { data: schedule } });
      await expect(page.getByTestId('day-card-0')).toContainText('First supper');
      await expect(page.getByTestId('day-card-1')).toContainText('Second supper');
      await expect(page.getByTestId('day-card-3')).toContainText('Third supper');
      await expect(page.getByTestId('toast')).toHaveCount(0);
      await page.unroute(
        (url) => url.pathname === '/api/schedule' && url.searchParams.has('referenceWeekStartDate')
      );
      await page.reload();
      await expect(page.getByTestId('day-card-3')).toContainText('Third supper');
      await expect(page.getByTestId('day-card-0')).toContainText('First supper');
    }
    expect(moves).toHaveLength(2);
    expect(reads).toHaveLength(1);
  });
}
