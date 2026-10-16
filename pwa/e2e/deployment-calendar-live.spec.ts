import { test, expect } from '@playwright/test';
import { generateSecretToken } from './auth-utils';
import { MOCK_IDS } from '../src/testing/mock-ids';

test.use({ timezoneId: 'Asia/Tokyo' });
test.skip(
  !process.env.CALENDAR_API_URL,
  'Requires the isolated DeploymentCalendarPostgresTests live host.'
);

test('real Home assigns deployment Sunday and persists the correct groceries on reload', async ({
  page,
  request,
  baseURL,
}) => {
  const api = process.env.CALENDAR_API_URL!;
  const secret = process.env.HEARTH_SECRET!;
  const headers = { 'X-Hearth-Secret': secret };
  const family = await (await request.get(`${api}/api/family`, { headers })).json();
  const member = family.data[0];
  await page.clock.setFixedTime(new Date('2026-10-12T01:30:00Z'));
  await page.context().addCookies([
    { name: 'h_access', value: await generateSecretToken(secret), url: baseURL! },
    { name: 'x-family-member-id', value: member.id, url: baseURL! },
    // An old SSR cookie must not override the API's Toronto calendar.
    { name: 'wfs-test-date', value: '2026-10-12T12:00:00Z', url: baseURL! },
  ]);
  await page.addInitScript((member) => {
    localStorage.setItem('locale', 'en');
    localStorage.setItem(
      'family-storage',
      JSON.stringify({
        state: {
          selectedFamilyMemberId: member.id,
          familyMembers: [member],
          _hasHydrated: true,
          hasLoaded: true,
        },
        version: 0,
      })
    );
  }, member);
  page.on('pageerror', (error) => console.log('PAGE ERROR', error.message));
  page.on('requestfailed', (request) =>
    console.log('REQUEST FAILED', new URL(request.url()).pathname, request.failure()?.errorText)
  );
  page.on('response', (response) => {
    if (response.status() >= 400)
      console.log('HTTP ERROR', response.status(), new URL(response.url()).pathname);
  });
  await page.goto('/home');
  await expect(page.getByTestId('tonight-pivot-card')).toBeVisible();
  await page.getByTestId('discover-btn').click();
  await expect(page.getByText('Sunday Chicken').first()).toBeVisible();
  const assigned = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === '/api/schedule/assign'
  );
  await page.getByTestId('quick-find-select').click();
  const response = await assigned;
  expect(response.status()).toBe(200);
  expect(response.request().postDataJSON()).toMatchObject({
    weekOffset: 0,
    dayIndex: 6,
    recipeId: MOCK_IDS.RECIPE_CHICKEN,
  });
  expect(new URL(response.url()).searchParams.get('referenceWeekStartDate')).toBe('2026-10-05');
  const schedule = await (
    await request.get(`${api}/api/schedule?weekOffset=0&referenceWeekStartDate=2026-10-05`, {
      headers,
    })
  ).json();
  expect(schedule.data.weekStartDate).toBe('2026-10-05');
  expect(schedule.data.days.map((day: { date: string }) => day.date)).toEqual([
    '2026-10-05',
    '2026-10-06',
    '2026-10-07',
    '2026-10-08',
    '2026-10-09',
    '2026-10-10',
    '2026-10-11',
  ]);
  expect(schedule.data.days[6].recipe.id).toBe(MOCK_IDS.RECIPE_CHICKEN);
  expect(JSON.stringify(schedule.data.groceryItems)).toContain('carrot');
  expect(JSON.stringify(schedule.data.groceryItems)).not.toContain('potato');
  const next = await (
    await request.get(`${api}/api/schedule?weekOffset=1&referenceWeekStartDate=2026-10-05`, {
      headers,
    })
  ).json();
  expect(next.data.days[6]).toMatchObject({
    date: '2026-10-18',
    recipe: { id: MOCK_IDS.RECIPE_LASAGNA },
  });
  await page.reload();
  await expect(page.getByTestId('tonight-menu-card')).toBeVisible();
  await expect(page.getByText('Sunday Chicken').first()).toBeVisible();
});

// Cases share the task-owned database and reset only their own target dates.
test.describe.configure({ mode: 'serial' });

async function signIn(
  page: import('@playwright/test').Page,
  request: import('@playwright/test').APIRequestContext,
  baseURL: string
) {
  const api = process.env.CALENDAR_API_URL!;
  const secret = process.env.HEARTH_SECRET!;
  const headers = { 'X-Hearth-Secret': secret };
  await request.post(`${api}/_test/calendar/availability`, { headers, data: { available: true } });
  await request.post(`${api}/_test/calendar/instant`, {
    headers,
    data: { instant: '2026-10-12T01:30:00Z' },
  });
  for (const date of ['2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14'])
    expect(
      (await request.delete(`${api}/api/schedule/day/${date}/remove`, { headers })).status()
    ).toBe(204);
  const member = (await (await request.get(`${api}/api/family`, { headers })).json()).data[0];
  await page.clock.setFixedTime(new Date('2026-10-12T01:30:00Z'));
  await page.context().addCookies([
    { name: 'h_access', value: await generateSecretToken(secret), url: baseURL },
    { name: 'x-family-member-id', value: member.id, url: baseURL },
  ]);
  await page.addInitScript((member) => {
    localStorage.setItem('locale', 'en');
    localStorage.setItem(
      'family-storage',
      JSON.stringify({
        state: {
          selectedFamilyMemberId: member.id,
          familyMembers: [member],
          _hasHydrated: true,
          hasLoaded: true,
        },
        version: 0,
      })
    );
  }, member);
}

async function assertTarget(
  request: import('@playwright/test').APIRequestContext,
  index: number,
  offset: number
) {
  const api = process.env.CALENDAR_API_URL!;
  const headers = { 'X-Hearth-Secret': process.env.HEARTH_SECRET! };
  const schedule = (
    await (
      await request.get(
        `${api}/api/schedule?weekOffset=${offset}&referenceWeekStartDate=2026-10-05`,
        { headers }
      )
    ).json()
  ).data;
  expect(schedule.days[index].recipe.id).toBe(MOCK_IDS.RECIPE_CHICKEN);
  const next = (
    await (
      await request.get(`${api}/api/schedule?weekOffset=1&referenceWeekStartDate=2026-10-05`, {
        headers,
      })
    ).json()
  ).data;
  expect(next.days[6].recipe.id).toBe(MOCK_IDS.RECIPE_LASAGNA);
}

test('real Planner Quick Find and Search keep their loaded October reference', async ({
  page,
  request,
  baseURL,
}) => {
  await signIn(page, request, baseURL!);
  await page.goto('/planner?weekOffset=1&referenceWeekStartDate=2026-10-05');
  await page.getByTestId('day-card-0').getByTestId('plan-meal-button').click();
  await page.getByTestId('pivot-quick-find').click();
  await expect(page.getByText('Sunday Chicken').first()).toBeVisible();
  const first = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === '/api/schedule/assign'
  );
  await page.getByTestId('quick-find-select').click();
  expect((await first).status()).toBe(200);
  await assertTarget(request, 0, 1);
  await page.getByTestId('day-card-2').getByTestId('plan-meal-button').click();
  await page.getByTestId('pivot-search-library').click();
  await expect(page).toHaveURL(/referenceWeekStartDate=2026-10-05/);
  await page.getByTestId('recipe-search-input').fill('Sunday Chicken');
  await page.getByTestId('recipe-search-input').press('Enter');
  await page.getByTestId('recipe-card-top-pick').click();
  const second = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === '/api/schedule/assign'
  );
  await page.getByTestId('action-add-to-day').click();
  expect((await second).status()).toBe(200);
  await assertTarget(request, 2, 1);
});

for (const origin of ['search', 'browse'] as const) {
  for (const action of ['tonight', 'later'] as const) {
    test(`real ${origin} Plan ${action} uses deployment Sunday`, async ({
      page,
      request,
      baseURL,
    }) => {
      await signIn(page, request, baseURL!);
      if (origin === 'search') {
        await page.goto('/recipes');
        await page.getByTestId('recipe-search-input').fill('Sunday Chicken');
        await page.getByTestId('recipe-search-input').press('Enter');
        await page.getByTestId('recipe-card-top-pick').click();
      } else {
        await page.goto('/browse-all-stack');
        await page.getByTestId('browse-view-list').click();
        await page
          .getByTestId('browse-list-recipe-card')
          .filter({ hasText: 'Sunday Chicken' })
          .click();
      }
      await page.getByTestId('action-cook-this').click();
      const assignment = page.waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          new URL(response.url()).pathname === '/api/schedule/assign'
      );
      await page
        .getByTestId(action === 'tonight' ? 'action-cook-tonight' : 'action-plan-later')
        .click();
      const response = await assignment;
      expect(response.status()).toBe(200);
      expect(response.request().postDataJSON()).toMatchObject({
        weekOffset: action === 'later' ? 1 : 0,
        dayIndex: action === 'later' ? 0 : 6,
      });
      expect(new URL(response.url()).searchParams.get('referenceWeekStartDate')).toBe('2026-10-05');
      await assertTarget(request, action === 'later' ? 0 : 6, action === 'later' ? 1 : 0);
    });
  }
}

test('real cooking retains the viewed recipe through failed refresh and retry', async ({
  page,
  request,
  baseURL,
}) => {
  await signIn(page, request, baseURL!);
  const api = process.env.CALENDAR_API_URL!;
  const headers = { 'X-Hearth-Secret': process.env.HEARTH_SECRET! };
  expect(
    (
      await request.post(`${api}/api/schedule/assign?referenceWeekStartDate=2026-10-05`, {
        headers,
        data: { weekOffset: 0, dayIndex: 6, recipeId: MOCK_IDS.RECIPE_CHICKEN },
      })
    ).status()
  ).toBe(200);
  await page.goto('/home');
  await expect(page.getByTestId('tonight-menu-card')).toBeVisible();
  const validations: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().includes('/validate'))
      validations.push(new URL(request.url()).pathname);
  });
  await request.post(`${api}/_test/calendar/availability`, { headers, data: { available: false } });
  const rejected = await page.evaluate(async (id) => {
    try {
      await (window as any).__todayStore.getState().markCooked(id);
      return false;
    } catch {
      return true;
    }
  }, MOCK_IDS.RECIPE_LASAGNA);
  expect(rejected).toBe(true);
  expect(validations).toEqual([]);
  await expect(page.getByText('Sunday Chicken').first()).toBeVisible();
  await request.post(`${api}/_test/calendar/availability`, { headers, data: { available: true } });
  await page.evaluate(
    (id) => (window as any).__todayStore.getState().markCooked(id),
    MOCK_IDS.RECIPE_LASAGNA
  );
  const afterOther = (
    await (await request.get(`${api}/api/schedule?weekOffset=0`, { headers })).json()
  ).data;
  expect(afterOther.days[6]).toMatchObject({
    date: '2026-10-11',
    status: 0,
    recipe: { id: MOCK_IDS.RECIPE_CHICKEN },
  });
  await page.evaluate(
    (id) => (window as any).__todayStore.getState().markCooked(id),
    MOCK_IDS.RECIPE_CHICKEN
  );
  const matching = (
    await (await request.get(`${api}/api/schedule?weekOffset=0`, { headers })).json()
  ).data;
  expect(matching.days[6]).toMatchObject({
    date: '2026-10-11',
    status: 2,
    recipe: { id: MOCK_IDS.RECIPE_CHICKEN },
  });
  expect(validations).toEqual([
    '/api/schedule/day/2026-10-11/validate',
    '/api/schedule/day/2026-10-11/validate',
  ]);
});

test('real empty Order In persists its explicit deployment date', async ({
  page,
  request,
  baseURL,
}) => {
  await signIn(page, request, baseURL!);
  await page.goto('/home');
  await expect(page.getByTestId('tonight-pivot-card')).toBeVisible();
  const validation = page.waitForResponse(
    (response) => response.request().method() === 'POST' && response.url().includes('/validate')
  );
  await page.getByTestId('order-in-btn').click();
  const response = await validation;
  expect(response.status()).toBe(200);
  expect(new URL(response.url()).pathname).toBe('/api/schedule/day/2026-10-11/validate');
  expect(response.request().postDataJSON()).toEqual({ status: 3 });
  await page.reload();
  await expect(page.getByTestId('today-non-cooking-label')).toHaveText('Order In');
  const schedule = (
    await (
      await request.get(`${process.env.CALENDAR_API_URL}/api/schedule?weekOffset=0`, {
        headers: { 'X-Hearth-Secret': process.env.HEARTH_SECRET! },
      })
    ).json()
  ).data;
  expect(schedule.days[6]).toMatchObject({ date: '2026-10-11', status: 3, recipe: null });
});

test('two real device zones isolate yesterday and retain the same recipe on the new Today', async ({
  browser,
  request,
  baseURL,
}) => {
  const tokyo = await browser.newContext({ timezoneId: 'Asia/Tokyo', baseURL });
  const toronto = await browser.newContext({ timezoneId: 'America/Toronto', baseURL });
  const pages = [await tokyo.newPage(), await toronto.newPage()];
  const api = process.env.CALENDAR_API_URL!;
  const headers = { 'X-Hearth-Secret': process.env.HEARTH_SECRET! };
  const control = (path: string, data: object) =>
    request.post(`${api}/_test/calendar/${path}`, { headers, data });
  try {
    await signIn(pages[0], request, baseURL!);
    // Authenticate the second device without resetting the shared household again.
    await toronto.addCookies(await tokyo.cookies());
    const member = (await (await request.get(`${api}/api/family`, { headers })).json()).data[0];
    await pages[1].addInitScript((member) => {
      localStorage.setItem('locale', 'en');
      localStorage.setItem(
        'family-storage',
        JSON.stringify({
          state: {
            selectedFamilyMemberId: member.id,
            familyMembers: [member],
            _hasHydrated: true,
            hasLoaded: true,
          },
          version: 0,
        })
      );
    }, member);
    for (const [weekOffset, dayIndex] of [
      [0, 6],
      [1, 0],
    ])
      expect(
        (
          await request.post(`${api}/api/schedule/assign?referenceWeekStartDate=2026-10-05`, {
            headers,
            data: { weekOffset, dayIndex, recipeId: MOCK_IDS.RECIPE_CHICKEN },
          })
        ).status()
      ).toBe(200);
    await control('snapshot', { capture: true });
    for (const page of pages) {
      await page.goto('/planner?weekOffset=1&referenceWeekStartDate=2026-10-05');
      await expect(page.getByTestId('day-card-0')).toContainText('Sunday Chicken');
      await page.goto('/home');
      await expect(page.getByTestId('tonight-menu-card')).toBeVisible();
      await expect.poll(() => page.evaluate(() => (window as any).__sseSource?.readyState)).toBe(1);
      await page.evaluate(() => {
        (window as any).__calendarFrames = [];
        for (const type of ['week_updated', 'grocery_updated', 'fill_the_gap_invalidated'])
          (window as any).__sseSource.addEventListener(type, (event: MessageEvent) =>
            (window as any).__calendarFrames.push({ type, data: JSON.parse(event.data) })
          );
      });
      expect(
        await page.evaluate(() => (window as any).__todayStore.getState().calendar.today)
      ).toBe('2026-10-11');
    }
    const planners = await Promise.all([tokyo.newPage(), toronto.newPage()]);
    for (const planner of planners) {
      await planner.goto('/planner?weekOffset=1&referenceWeekStartDate=2026-10-05');
      await expect(planner.getByTestId('day-card-0')).toHaveAttribute('data-date', '2026-10-12');
      await expect(planner.getByTestId('day-card-0')).toContainText('Sunday Chicken');
      await expect
        .poll(() => planner.evaluate(() => (window as any).__sseSource?.readyState))
        .toBe(1);
    }
    await control('completion-gate', { hold: true });
    await pages[0].evaluate((id) => {
      (window as any).__completion = (window as any).__todayStore.getState().markCooked(id);
    }, MOCK_IDS.RECIPE_CHICKEN);
    await expect
      .poll(
        async () =>
          (await (await request.get(`${api}/_test/calendar/completion-gate`, { headers })).json())
            .held
      )
      .toBe(true);
    await control('instant', { instant: '2026-10-12T04:30:00Z' });
    for (const page of pages) {
      await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
      await expect
        .poll(() =>
          page.evaluate(() => {
            const state = (window as any).__todayStore.getState();
            return {
              date: state.calendar?.today,
              id: state.currentRecipe?.id,
              status: state.status,
            };
          })
        )
        .toEqual({ date: '2026-10-12', id: MOCK_IDS.RECIPE_CHICKEN, status: 0 });
    }
    await control('completion-gate', { hold: false });
    await pages[0].evaluate(() => (window as any).__completion);
    for (const page of pages)
      expect(await page.evaluate(() => (window as any).__todayStore.getState().status)).toBe(0);
    const assigned = pages[0].waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname === '/api/schedule/assign'
    );
    await pages[0].evaluate(
      (id) =>
        (window as any).__todayStore
          .getState()
          .assignRecipe({ id, name: 'Sunday Chicken', image: '' }),
      MOCK_IDS.RECIPE_CHICKEN
    );
    const response = await assigned;
    expect(response.request().postDataJSON()).toMatchObject({
      weekOffset: 0,
      dayIndex: 0,
      recipeId: MOCK_IDS.RECIPE_CHICKEN,
    });
    expect(new URL(response.url()).searchParams.get('referenceWeekStartDate')).toBe('2026-10-12');
    expect(
      (
        await request.patch(`${api}/api/schedule/0/grocery`, { headers, data: { carrot: true } })
      ).status()
    ).toBe(200);
    await control('snapshot', { capture: false });
    for (const planner of planners) {
      await expect(planner.getByTestId('day-card-0')).toHaveAttribute('data-date', '2026-10-12');
      await expect(planner.getByTestId('day-card-0')).toContainText('Sunday Chicken');
    }
    for (const page of pages) {
      await expect
        .poll(() =>
          page.evaluate(() =>
            (window as any).__calendarFrames.some(
              (frame: any) =>
                frame.type === 'week_updated' && frame.data.schedule.weekStartDate === '2026-10-05'
            )
          )
        )
        .toBe(true);
      await expect
        .poll(() =>
          page.evaluate(() =>
            (window as any).__calendarFrames.some(
              (frame: any) =>
                frame.type === 'grocery_updated' &&
                frame.data.weekStartDate === '2026-10-12' &&
                frame.data.weekOffset === 0 &&
                frame.data.groceryState.carrot === true
            )
          )
        )
        .toBe(true);
      expect(
        await page.evaluate(() => {
          const state = (window as any).__todayStore.getState();
          return { date: state.calendar.today, id: state.currentRecipe.id, status: state.status };
        })
      ).toEqual({ date: '2026-10-12', id: MOCK_IDS.RECIPE_CHICKEN, status: 0 });
      console.log(
        'REAL CALENDAR FRAMES',
        await page.evaluate(() => JSON.stringify((window as any).__calendarFrames))
      );
      await page.goto('/planner?weekOffset=0&referenceWeekStartDate=2026-10-12');
      await expect(page.getByTestId('day-card-0')).toContainText('Sunday Chicken');
      await expect(page.getByTestId('day-card-0')).toHaveAttribute('data-date', '2026-10-12');
    }
    const yesterday = (
      await (
        await request.get(`${api}/api/schedule?weekOffset=0&referenceWeekStartDate=2026-10-05`, {
          headers,
        })
      ).json()
    ).data;
    expect(yesterday.days[6]).toMatchObject({
      date: '2026-10-11',
      status: 2,
      recipe: { id: MOCK_IDS.RECIPE_CHICKEN },
    });
    const today = (
      await (await request.get(`${api}/api/schedule?weekOffset=0`, { headers })).json()
    ).data;
    expect(today.days[0]).toMatchObject({
      date: '2026-10-12',
      status: 0,
      recipe: { id: MOCK_IDS.RECIPE_CHICKEN },
    });
    expect(JSON.stringify(today.groceryItems)).toContain('carrot');
    expect(today.days[6].recipe.id).toBe(MOCK_IDS.RECIPE_LASAGNA);
  } finally {
    await control('completion-gate', { hold: false });
    await tokyo.close();
    await toronto.close();
  }
});
