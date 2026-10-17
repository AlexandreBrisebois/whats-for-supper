import { test, expect } from '@playwright/test';
import { generateSecretToken } from './auth-utils';
test.skip(
  !process.env.TOMORROW_API_URL,
  'Requires the isolated TomorrowPush PostgreSQL live host.'
);
test.use({ timezoneId: 'Asia/Tokyo' });

test('real Home conserves a four-week chain and two clients receive all week snapshots', async ({
  page,
  browser,
  request,
  baseURL,
}) => {
  const api = process.env.TOMORROW_API_URL!;
  const headers = { 'X-Hearth-Secret': process.env.HEARTH_SECRET! };
  const member = (await (await request.get(`${api}/api/family`, { headers })).json()).data[0];
  const cookies = [
    {
      name: 'h_access',
      value: await generateSecretToken(process.env.HEARTH_SECRET!),
      url: baseURL!,
    },
    { name: 'x-family-member-id', value: member.id, url: baseURL! },
  ];
  await page.context().addCookies(cookies);
  await page.clock.setFixedTime(new Date('2026-10-12T01:30:00Z'));
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
  const observers = [];
  for (let i = 0; i < 2; i++) {
    const context = await browser.newContext({ baseURL });
    await context.addCookies(cookies);
    const observer = await context.newPage();
    await observer.goto('/welcome');
    await observer.evaluate(() => {
      const events: { week: string; days: unknown[]; groceryItems: unknown }[] = [];
      (window as any).__tomorrowEvents = events;
      const source = new EventSource('/api/stream');
      (window as any).__tomorrowStream = source;
      source.addEventListener('connected', () => {
        (window as any).__tomorrowConnected = true;
      });
      source.addEventListener('week_updated', (event) => {
        const s = JSON.parse((event as MessageEvent).data).schedule;
        events.push({ week: s.weekStartDate, days: s.days, groceryItems: s.groceryItems });
      });
    });
    await expect
      .poll(() => observer.evaluate(() => (window as any).__tomorrowConnected))
      .toBe(true);
    observers.push({ context, observer });
  }
  await page.goto('/home');
  await expect(page.getByTestId('tonight-menu-card')).toBeVisible();
  await page.getByTestId('tonight-menu-card').click();
  await page.getByTestId('skip-tonight-btn').dispatchEvent('click');
  await page.getByTestId('recovery-action-order-in').click();
  const movement = page.waitForResponse(
    (r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/schedule/move'
  );
  await page.getByTestId('recovery-action-tomorrow').click();
  const response = await movement;
  expect(response.status()).toBe(200);
  expect(response.request().postDataJSON()).toMatchObject({
    intent: 'tomorrow',
    sourceDisposition: 'order_in',
    fromIndex: 6,
    toIndex: 0,
  });
  expect((await response.json()).data).toMatchObject({
    moved: true,
    refreshComplete: true,
    affectedWeekStartDates: ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26'],
  });
  await expect(page.getByTestId('recovery-dialog-title')).not.toBeVisible();
  for (const { context, observer } of observers) {
    await expect
      .poll(() => observer.evaluate(() => (window as any).__tomorrowEvents.map((e: any) => e.week)))
      .toEqual(['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26']);
    const events = await observer.evaluate(() => (window as any).__tomorrowEvents);
    expect(events[0].days[6]).toMatchObject({ recipe: null, status: 3 });
    expect(events[1].days[0].recipe.id).toBe('660e8400-e29b-41d4-a716-446655440011');
    expect(events[3].days[0].recipe.id).toBe('660e8400-e29b-41d4-a716-446655440012');
    expect(JSON.stringify(events[1].groceryItems)).toContain('carrot');
    expect(JSON.stringify(events[3].groceryItems)).toContain('potato');
    await context.close();
  }
  const schedules = await Promise.all(
    [0, 1, 2, 3].map(
      async (offset) =>
        (
          await (
            await request.get(
              `${api}/api/schedule?weekOffset=${offset}&referenceWeekStartDate=2026-10-05`,
              { headers }
            )
          ).json()
        ).data
    )
  );
  const ids = schedules.flatMap((s) =>
    s.days.filter((d: any) => d.recipe).map((d: any) => d.recipe.id)
  );
  expect(ids).toHaveLength(15);
  expect(ids.filter((id) => id === '660e8400-e29b-41d4-a716-446655440011')).toHaveLength(2);
  await page.goto('/home');
  await page.reload();
  await expect(page.getByTestId('today-non-cooking-label')).toHaveText('Order In');
  // Drop a reply after a second real commit. Repeated activation must only reread, never move again.
  const beforeCount = (
    await (await request.get(`${api}/_test/tomorrow/requests`, { headers })).json()
  ).count;
  await request.post(`${api}/api/schedule/assign?referenceWeekStartDate=2026-10-05`, {
    headers,
    data: { weekOffset: 0, dayIndex: 6, recipeId: '660e8400-e29b-41d4-a716-446655440012' },
  });
  await page.goto('/home');
  await expect(page.getByTestId('tonight-menu-card')).toBeVisible();
  await page.getByTestId('tonight-menu-card').click();
  await page.getByTestId('skip-tonight-btn').dispatchEvent('click');
  await page.getByTestId('recovery-action-order-in').click();
  await request.post(`${api}/_test/tomorrow/drop-next`, { headers });
  await page.getByTestId('recovery-action-tomorrow').click();
  await expect(
    page
      .getByTestId('toast')
      .filter({ hasText: /move could not be confirmed/ })
      .first()
  ).toBeVisible();
  await expect(page.getByTestId('recovery-dialog-title')).toBeVisible();
  await page.getByTestId('recovery-action-tomorrow').click();
  await expect(
    page
      .getByTestId('toast')
      .filter({ hasText: /move could not be confirmed/ })
      .first()
  ).toBeVisible();
  expect(
    (await (await request.get(`${api}/_test/tomorrow/requests`, { headers })).json()).count
  ).toBe(beforeCount + 1);
  const afterLoss = (
    await (
      await request.get(`${api}/api/schedule?weekOffset=0&referenceWeekStartDate=2026-10-05`, {
        headers,
      })
    ).json()
  ).data;
  expect(afterLoss.days[6]).toMatchObject({ status: 3, recipe: null });
});
