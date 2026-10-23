import { test, expect } from './fixtures';
import { generateSecretToken } from './auth-utils';
import { builders, MOCK_IDS, setupCommonRoutes } from './mock-api';

test.use({ timezoneId: 'Asia/Tokyo' });

test('Tonight uses Toronto Sunday in a Tokyo browser and pins assignment', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-12T01:30:00Z'));
  await setupCommonRoutes(page);
  await page.context().addCookies([
    {
      name: 'x-family-member-id',
      value: MOCK_IDS.MEMBER_ALEX,
      url: process.env.BASE_URL || 'http://127.0.0.1:3000',
    },
  ]);
  const calendar = {
    timeZone: 'America/Toronto',
    capturedAtUtc: '2026-10-12T01:30:00Z',
    today: '2026-10-11',
    currentWeekStartDate: '2026-10-05',
    referenceWeekStartDate: '2026-10-05',
    nextDayAtUtc: '2026-10-12T04:00:00Z',
  };
  let assignedId: string | null = null;
  await page.route(
    (url) => url.pathname === '/api/schedule',
    async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      await route.fulfill({
        json: {
          data: {
            weekOffset: 0,
            weekStartDate: '2026-10-05',
            calendar,
            locked: false,
            status: 0,
            days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => ({
              day,
              date: `2026-10-${String(5 + index).padStart(2, '0')}`,
              status: 0,
              recipe:
                index === 6 && assignedId ? builders.scheduleRecipe({ id: assignedId }) : null,
            })),
          },
        },
      });
    }
  );
  await page.route(
    (url) => url.pathname === '/api/schedule/fill-the-gap',
    async (route) => {
      await route.fulfill({
        json: {
          data: [builders.scheduleRecipe({ id: MOCK_IDS.RECIPE_CHICKEN, name: 'Sunday Chicken' })],
        },
      });
    }
  );
  await page.route(
    (url) => url.pathname === '/api/schedule/assign',
    async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      assignedId = route.request().postDataJSON().recipeId;
      await route.fulfill({ json: { data: { message: 'Recipe assigned' } } });
    }
  );
  await page.goto('/onboarding');
  await page.evaluate(
    (id) =>
      localStorage.setItem(
        'family-storage',
        JSON.stringify({
          state: {
            selectedFamilyMemberId: id,
            familyMembers: [{ id, name: 'Alex' }],
            _hasHydrated: true,
            hasLoaded: true,
          },
          version: 0,
        })
      ),
    MOCK_IDS.MEMBER_ALEX
  );
  await page.goto('/home');
  await expect(page.getByTestId('tonight-pivot-card')).toBeVisible();
  await page.getByTestId('discover-btn').click();
  await expect(page.getByText('Sunday Chicken').first()).toBeVisible();
  const assignment = page.waitForRequest(
    (request) =>
      request.method() === 'POST' && new URL(request.url()).pathname === '/api/schedule/assign'
  );
  await page.getByTestId('quick-find-select').click();
  const request = await assignment;
  expect(request.postDataJSON()).toMatchObject({
    weekOffset: 0,
    dayIndex: 6,
    recipeId: MOCK_IDS.RECIPE_CHICKEN,
  });
  expect(new URL(request.url()).searchParams.get('referenceWeekStartDate')).toBe('2026-10-05');
  await expect(page.getByTestId('tonight-menu-card')).toBeVisible();
});

test('shared schedule handlers retain dated assignments and reject invalid references', async ({
  page,
}) => {
  await setupCommonRoutes(page);
  await page.goto('/onboarding');
  const result = await page.evaluate(
    async ({ selected, sentinel }) => {
      async function assign(reference: string, recipeId: string) {
        const response = await fetch(`/api/schedule/assign?referenceWeekStartDate=${reference}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ weekOffset: 0, dayIndex: 6, recipeId }),
        });
        return response.status;
      }
      const sentinelStatus = await assign('2026-10-12', sentinel);
      const selectedStatus = await assign('2026-10-05', selected);
      const invalidRead = await fetch('/api/schedule?referenceWeekStartDate=2026-10-06');
      const invalidWrite = await assign('not-a-date', sentinel);
      const read = await (
        await fetch('/api/schedule?weekOffset=0&referenceWeekStartDate=2026-10-05')
      ).json();
      const next = await (
        await fetch('/api/schedule?weekOffset=1&referenceWeekStartDate=2026-10-05')
      ).json();
      return {
        sentinelStatus,
        selectedStatus,
        invalidRead: invalidRead.status,
        invalidWrite,
        read: read.data,
        next: next.data,
      };
    },
    { selected: MOCK_IDS.RECIPE_CHICKEN, sentinel: MOCK_IDS.RECIPE_LASAGNA }
  );
  expect(result.sentinelStatus).toBe(200);
  expect(result.selectedStatus).toBe(200);
  expect(result.invalidRead).toBe(400);
  expect(result.invalidWrite).toBe(400);
  expect(result.read.weekStartDate).toBe('2026-10-05');
  expect(result.read.calendar.referenceWeekStartDate).toBe('2026-10-05');
  expect(result.read.days[6]).toMatchObject({
    date: '2026-10-11',
    recipe: { id: MOCK_IDS.RECIPE_CHICKEN },
  });
  expect(result.next.days[6]).toMatchObject({
    date: '2026-10-18',
    recipe: { id: MOCK_IDS.RECIPE_LASAGNA },
  });
});

test('Sunday Plan for Later starts at deployment next Monday in Search', async ({
  page,
  baseURL,
}) => {
  await page.clock.setFixedTime(new Date('2026-10-12T01:30:00Z'));
  await setupCommonRoutes(page);
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
  const calendar = builders.deploymentCalendar({
    timeZone: 'America/Toronto',
    capturedAtUtc: '2026-10-12T01:30:00Z',
    today: '2026-10-11',
    currentWeekStartDate: '2026-10-05',
    referenceWeekStartDate: '2026-10-05',
    nextDayAtUtc: '2026-10-12T04:00:00Z',
  });
  await page.route(
    (url) => url.pathname === '/api/schedule',
    async (route) => {
      await route.fulfill({
        json: {
          data: builders.scheduleDays(
            Number(new URL(route.request().url()).searchParams.get('weekOffset') ?? 0),
            calendar
          ),
        },
      });
    }
  );
  await page.route('**/api/recipes/search', async (route) => {
    await route.fulfill({
      json: {
        data: {
          topPick: builders.recipe({ id: MOCK_IDS.RECIPE_LASAGNA, name: 'Sunday Lasagna' }),
          results: [],
          appliedFilters: {},
          searchMode: 'explicit',
          resultPath: 'lexical-only',
        },
      },
    });
  });
  await page.goto('/recipes');
  await page.getByTestId('recipe-search-input').fill('lasagna');
  await page.getByTestId('recipe-search-input').press('Enter');
  await page.getByTestId('recipe-card-top-pick').click();
  await page.getByTestId('action-cook-this').click();
  const assignment = page.waitForRequest(
    (request) =>
      request.method() === 'POST' && new URL(request.url()).pathname === '/api/schedule/assign'
  );
  await page.getByTestId('action-plan-later').click();
  const request = await assignment;
  expect(request.postDataJSON()).toMatchObject({
    weekOffset: 1,
    dayIndex: 0,
    recipeId: MOCK_IDS.RECIPE_LASAGNA,
  });
  expect(new URL(request.url()).searchParams.get('referenceWeekStartDate')).toBe('2026-10-05');
});

test('relative mock operations share a pinned reference and state', async ({ page }) => {
  await setupCommonRoutes(page);
  await page.goto('/onboarding');
  const result = await page.evaluate(async (recipeId) => {
    const reference = 'referenceWeekStartDate=2026-10-05';
    const post = (path: string, body?: object, suffix = reference) =>
      fetch(`/api/schedule/${path}?${suffix}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
    await post('assign', { weekOffset: 0, dayIndex: 6, recipeId });
    await post('move', {
      weekOffset: 0,
      targetWeekOffset: 1,
      fromIndex: 6,
      toIndex: 0,
      recipeId,
      intent: 'push',
    });
    const moved = await (await fetch(`/api/schedule?weekOffset=1&${reference}`)).json();
    const deferred = await (await post('defer', { sourceDate: '2026-10-12', recipeId })).json();
    await post('voting/open', undefined, `weekOffset=1&${reference}`);
    const voting = await (await fetch(`/api/schedule?weekOffset=1&${reference}`)).json();
    await post('lock', undefined, `weekOffset=1&${reference}`);
    const locked = await (await fetch(`/api/schedule?weekOffset=1&${reference}`)).json();
    const invalid = [];
    for (const path of ['move', 'defer', 'voting/open', 'lock'])
      invalid.push((await post(path, {}, 'referenceWeekStartDate=2026-10-06')).status);
    for (const path of ['fill-the-gap', '0/smart-defaults'])
      invalid.push((await fetch(`/api/schedule/${path}?referenceWeekStartDate=2026-10-06`)).status);
    return {
      moved: moved.data,
      deferred: deferred.data,
      voting: voting.data,
      locked: locked.data,
      invalid,
    };
  }, MOCK_IDS.RECIPE_CHICKEN);
  expect(result.moved.days[0]).toMatchObject({
    date: '2026-10-12',
    recipe: { id: MOCK_IDS.RECIPE_CHICKEN },
  });
  expect(result.deferred).toMatchObject({ scheduledDate: '2026-10-13', scheduledWeekOffset: 1 });
  expect(result.voting.status).toBe(1);
  expect(result.locked.status).toBe(2);
  expect(result.locked.days[1]).toMatchObject({
    date: '2026-10-13',
    recipe: { id: MOCK_IDS.RECIPE_CHICKEN },
    status: 1,
  });
  expect(result.invalid).toEqual([400, 400, 400, 400, 400, 400]);
});

for (const action of ['cooked', 'order_in'] as const) {
  test(`${action} submission uses deployment Sunday in Tokyo`, async ({ page, baseURL }) => {
    await page.clock.setFixedTime(new Date('2026-10-12T01:30:00Z'));
    await setupCommonRoutes(page);
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
    const calendar = builders.deploymentCalendar({
      timeZone: 'America/Toronto',
      today: '2026-10-11',
      capturedAtUtc: '2026-10-12T01:30:00Z',
      currentWeekStartDate: '2026-10-05',
      referenceWeekStartDate: '2026-10-05',
      nextDayAtUtc: '2026-10-12T04:00:00Z',
    });
    let status = 0;
    await page.route(
      (url) => url.pathname === '/api/schedule',
      async (route) => {
        const schedule = builders.scheduleDays(0, calendar);
        if (action === 'cooked')
          schedule.days[6].recipe = builders.scheduleRecipe({ id: MOCK_IDS.RECIPE_CHICKEN });
        schedule.days[6].status = status;
        await route.fulfill({ json: { data: schedule } });
      }
    );
    await page.route(
      (url) => /^\/api\/schedule\/day\/[^/]+\/validate$/.test(url.pathname),
      async (route) => {
        status = route.request().postDataJSON().status;
        await route.fulfill({
          json: {
            data: { message: 'Cooking status updated', mealMarkedCooked: action === 'cooked' },
          },
        });
      }
    );
    await page.goto('/home');
    const validation = page.waitForRequest(
      (request) =>
        request.method() === 'POST' &&
        /\/api\/schedule\/day\/[^/]+\/validate$/.test(new URL(request.url()).pathname)
    );
    if (action === 'cooked') {
      await expect(page.getByTestId('tonight-menu-card')).toBeVisible();
      await page.evaluate(
        (id) => (window as any).__todayStore.getState().markCooked(id),
        MOCK_IDS.RECIPE_CHICKEN
      );
    } else {
      await expect(page.getByTestId('tonight-pivot-card')).toBeVisible();
      await page.getByTestId('order-in-btn').click();
    }
    const request = await validation;
    expect(new URL(request.url()).pathname).toBe('/api/schedule/day/2026-10-11/validate');
    expect(request.postDataJSON()).toMatchObject(
      action === 'cooked' ? { status: 2, recipeId: MOCK_IDS.RECIPE_CHICKEN } : { status: 3 }
    );
  });
}

test('dated validation handlers preserve viewed identity and read-back', async ({ page }) => {
  await setupCommonRoutes(
    page,
    builders.deploymentCalendar({
      timeZone: 'America/Toronto',
      today: '2026-10-11',
      capturedAtUtc: '2026-10-12T01:30:00Z',
      currentWeekStartDate: '2026-10-05',
      referenceWeekStartDate: '2026-10-05',
      nextDayAtUtc: '2026-10-12T04:00:00Z',
    })
  );
  await page.goto('/onboarding');
  const result = await page.evaluate(
    async ({ selected, other }) => {
      const post = async (path: string, body: object) =>
        (
          await fetch(path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
        ).json();
      await post('/api/schedule/assign?referenceWeekStartDate=2026-10-05', {
        weekOffset: 0,
        dayIndex: 6,
        recipeId: selected,
      });
      const unscheduled = await post('/api/schedule/day/2026-10-11/validate', {
        status: 2,
        recipeId: other,
      });
      const afterOther = await (await fetch('/api/schedule?weekOffset=0')).json();
      const matching = await post('/api/schedule/day/2026-10-11/validate', {
        status: 2,
        recipeId: selected,
      });
      const afterMatching = await (await fetch('/api/schedule?weekOffset=0')).json();
      await fetch('/api/schedule/day/2026-10-11/remove', { method: 'DELETE' });
      await post('/api/schedule/day/2026-10-11/validate', { status: 3 });
      const orderIn = await (await fetch('/api/schedule?weekOffset=0')).json();
      return {
        unscheduled: unscheduled.data,
        afterOther: afterOther.data,
        matching: matching.data,
        afterMatching: afterMatching.data,
        orderIn: orderIn.data,
      };
    },
    { selected: MOCK_IDS.RECIPE_CHICKEN, other: MOCK_IDS.RECIPE_LASAGNA }
  );
  expect(result.unscheduled.mealMarkedCooked).toBe(false);
  expect(result.afterOther.days[6]).toMatchObject({
    date: '2026-10-11',
    status: 0,
    recipe: { id: MOCK_IDS.RECIPE_CHICKEN },
  });
  expect(result.matching.mealMarkedCooked).toBe(true);
  expect(result.afterMatching.days[6]).toMatchObject({ date: '2026-10-11', status: 2 });
  expect(result.orderIn.days[6]).toMatchObject({
    date: '2026-10-11',
    status: 3,
    recipe: null,
    nonCooking: { kind: 'order_in' },
  });
});

test('a resumed new action refreshes deployment Monday before assignment', async ({
  page,
  baseURL,
}) => {
  await page.clock.setFixedTime(new Date('2026-10-12T01:30:00Z'));
  await setupCommonRoutes(page);
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
  let calendar = builders.deploymentCalendar({
    timeZone: 'America/Toronto',
    today: '2026-10-11',
    capturedAtUtc: '2026-10-12T01:30:00Z',
    currentWeekStartDate: '2026-10-05',
    referenceWeekStartDate: '2026-10-05',
    nextDayAtUtc: '2026-10-12T04:00:00Z',
  });
  await page.route(
    (url) => url.pathname === '/api/schedule',
    async (route) => route.fulfill({ json: { data: builders.scheduleDays(0, calendar) } })
  );
  await page.goto('/home');
  await expect(page.getByTestId('tonight-pivot-card')).toBeVisible();
  calendar = {
    ...calendar,
    today: '2026-10-12',
    capturedAtUtc: '2026-10-12T04:30:00Z',
    currentWeekStartDate: '2026-10-12',
    referenceWeekStartDate: '2026-10-12',
    nextDayAtUtc: '2026-10-13T04:00:00Z',
  };
  await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
  const assignment = page.waitForRequest(
    (request) =>
      request.method() === 'POST' && new URL(request.url()).pathname === '/api/schedule/assign'
  );
  await page.evaluate(
    (id) =>
      (window as any).__todayStore
        .getState()
        .assignRecipe({ id, name: 'Resumed choice', image: '' }),
    MOCK_IDS.RECIPE_CHICKEN
  );
  const request = await assignment;
  expect(request.postDataJSON()).toMatchObject({ weekOffset: 0, dayIndex: 0 });
  expect(new URL(request.url()).searchParams.get('referenceWeekStartDate')).toBe('2026-10-12');
});

test('Planner displays the literal November civil month in Toronto during fall DST', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ timezoneId: 'America/Toronto', baseURL });
  const page = await context.newPage();
  try {
    await setupCommonRoutes(
      page,
      builders.deploymentCalendar({
        timeZone: 'America/Toronto',
        today: '2026-11-01',
        capturedAtUtc: '2026-11-01T05:30:00Z',
        currentWeekStartDate: '2026-10-26',
        referenceWeekStartDate: '2026-10-26',
        nextDayAtUtc: '2026-11-02T05:00:00Z',
      })
    );
    await context.addCookies([
      {
        name: 'h_access',
        value: await generateSecretToken(process.env.HEARTH_SECRET || 'Paris-Montreal'),
        url: baseURL!,
      },
      { name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseURL! },
    ]);
    await page.addInitScript(
      (id) =>
        localStorage.setItem(
          'family-storage',
          JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 })
        ),
      MOCK_IDS.MEMBER_ALEX
    );
    await page.goto('/planner');
    await expect(page.getByTestId('day-card-6')).toContainText('Nov');
    await expect(page.getByTestId('day-card-6')).toContainText('1');
  } finally {
    await context.close();
  }
});

test('defer mock validates query and exact source before mutation with explicit and legacy offsets', async ({
  page,
}) => {
  await setupCommonRoutes(
    page,
    builders.deploymentCalendar({
      referenceWeekStartDate: '2026-10-12',
      currentWeekStartDate: '2026-10-12',
      today: '2026-10-14',
      capturedAtUtc: '2026-10-14T12:00:00Z',
      nextDayAtUtc: '2026-10-15T00:00:00Z',
    })
  );
  await page.goto('/onboarding');
  const result = await page.evaluate(async (id) => {
    const post = (path: string, body: object) =>
      fetch(`/api/schedule/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    const read = async (offset: number) =>
      (await (await fetch(`/api/schedule?weekOffset=${offset}`)).json()).data;
    await post('assign', { weekOffset: 1, dayIndex: 2, recipeId: id });
    const body = { sourceDate: '2026-10-21', recipeId: id };
    const before = await read(1);
    const rejected = [];
    for (const query of [
      'targetWeekOffset=abc',
      'targetWeekOffset=1.5',
      'targetWeekOffset=2147483648',
      'targetWeekOffset=2147483647',
      'referenceWeekStartDate=2026-10-13',
    ])
      rejected.push((await post(`defer?${query}`, body)).status);
    const missing = (await post('defer?targetWeekOffset=2', { ...body, sourceDate: '2026-10-20' }))
      .status;
    await fetch('/api/schedule/defer?targetWeekOffset=2', { method: 'GET' });
    const after = await read(1);
    const explicit = await (await post('defer?targetWeekOffset=2', body)).json();
    const destination = await read(2);
    const source = await read(1);
    // Omitted target keeps the legacy reference-next-week base even for a source in week two.
    const legacy = await (await post('defer', { sourceDate: '2026-10-26', recipeId: id })).json();
    await post('assign', { weekOffset: 1, dayIndex: 2, recipeId: id });
    await post('day/2026-10-21/validate', { status: 4, recipeId: id });
    const conflictBefore = await read(1);
    const conflict = (await post('defer?targetWeekOffset=2', body)).status;
    return {
      before,
      after,
      rejected,
      missing,
      explicit: explicit.data,
      destination,
      source,
      legacy: legacy.data,
      conflict,
      conflictBefore,
      conflictAfter: await read(1),
    };
  }, MOCK_IDS.RECIPE_CHICKEN);
  expect(result.rejected).toEqual([400, 400, 400, 400, 400]);
  expect(result.missing).toBe(404);
  expect(result.after).toEqual(result.before);
  expect(result.explicit).toMatchObject({ scheduledDate: '2026-10-26', scheduledWeekOffset: 2 });
  expect(result.explicit.message).not.toContain('full');
  expect(result.destination.days[0].recipe.id).toBe(MOCK_IDS.RECIPE_CHICKEN);
  expect(result.source.days[2].recipe).toBeNull();
  expect(result.legacy).toMatchObject({ scheduledDate: '2026-10-19', scheduledWeekOffset: 1 });
  expect(result.conflict).toBe(409);
  expect(result.conflictAfter).toEqual(result.conflictBefore);
});
