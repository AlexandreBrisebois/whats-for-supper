import { test, expect } from '@playwright/test';
import { generateSecretToken } from './auth-utils';
test.skip(
  !process.env.TONIGHT_API_URL,
  'Requires the isolated TonightReplacement PostgreSQL live host.'
);
test.use({ timezoneId: 'Asia/Tokyo' });

test('real Home retries only replacement and two clients receive its saved state', async ({
  page,
  browser,
  request,
  baseURL,
}) => {
  const api = process.env.TONIGHT_API_URL!;
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
  await page.getByTestId('tonight-menu-card').click();
  await page.getByTestId('skip-tonight-btn').dispatchEvent('click');
  await page.getByTestId('recovery-action-pick-else').click();
  await expect(page.getByTestId('quick-find-select')).toBeEnabled();
  const selected = page.waitForRequest(
    (r) => r.method() === 'POST' && new URL(r.url()).pathname === '/api/schedule/assign'
  );
  await page.getByTestId('quick-find-select').click();
  await page.getByTestId('recovery-action-tomorrow').click();
  const save = await selected;
  expect(save.postDataJSON()).toMatchObject({ requireEmpty: true, weekOffset: 0, dayIndex: 6 });
  expect(new URL(save.url()).searchParams.get('referenceWeekStartDate')).toBe('2026-10-05');
  const recipeId = save.postDataJSON().recipeId;
  await expect(page.getByTestId('recovery-retry-save')).toBeVisible();
  await page.getByTestId('recovery-retry-save').click();
  await expect(page.getByTestId('recovery-dialog-title')).not.toBeVisible();
  expect(
    await (await request.get(`${api}/_test/tonight/requests`, { headers })).json()
  ).toMatchObject({ moves: 1, assignments: 2 });
  for (const { context, observer } of observers) {
    await expect
      .poll(() =>
        observer.evaluate(
          (id) =>
            (window as any).__tomorrowEvents.some(
              (e: any) => e.week === '2026-10-05' && e.days[6].recipe?.id === id
            ),
          recipeId
        )
      )
      .toBe(true);
    const events = await observer.evaluate(() => (window as any).__tomorrowEvents);
    expect(JSON.stringify(events.at(-1).groceryItems)).toContain('potato');
    await context.close();
  }
  const read = async (offset: number) =>
    (
      await (
        await request.get(
          `${api}/api/schedule?weekOffset=${offset}&referenceWeekStartDate=2026-10-05`,
          { headers }
        )
      ).json()
    ).data;
  expect((await read(0)).days[6].recipe.id).toBe(recipeId);
  expect((await read(1)).days[0].recipe.id).toBe('660e8400-e29b-41d4-a716-446655440011');
  await page.goto('/home');
  await page.reload();
  await expect(page.getByTestId('tonight-menu-card')).toBeVisible();
  // Same session keeps its Sunday target after both server and browser roll into Monday.
  await request.post(`${api}/_test/tonight/reject-next`, { headers });
  await page.getByTestId('tonight-menu-card').click();
  await page.getByTestId('skip-tonight-btn').dispatchEvent('click');
  await page.getByTestId('recovery-action-pick-else').click();
  await page.getByTestId('quick-find-select').click();
  await page.getByTestId('recovery-action-tomorrow').click();
  await expect(page.getByTestId('recovery-retry-save')).toBeVisible();
  await request.post(`${api}/_test/tonight/clock`, {
    headers,
    data: { instant: '2026-10-12T05:00:00Z' },
  });
  await page.clock.setFixedTime(new Date('2026-10-12T05:00:00Z'));
  const rolloverSave = page.waitForRequest(
    (r) => r.method() === 'POST' && new URL(r.url()).pathname === '/api/schedule/assign'
  );
  await page.getByTestId('recovery-retry-save').click();
  const rollover = await rolloverSave;
  expect(new URL(rollover.url()).searchParams.get('referenceWeekStartDate')).toBe('2026-10-05');
  expect(rollover.postDataJSON().dayIndex).toBe(6);
  await expect(page.getByTestId('recovery-dialog-title')).not.toBeVisible();
  const mondayRecipe = (await read(1)).days[0].recipe;
  await page.goto('/home');
  await expect(page.getByTestId('tonight-menu-card')).toBeVisible();
  // The new Monday view must show its persisted meal, never Sunday's late replacement.
  await expect(page.getByTestId('tonight-menu-card')).toContainText(mondayRecipe.name);
  expect(
    (await (await request.get(`${api}/api/schedule`, { headers })).json()).data.days[0].recipe.id
  ).toBe(mondayRecipe.id);

  // Return test clock to Sunday. A remote insertion between move and retry wins the slot.
  await request.post(`${api}/_test/tonight/clock`, {
    headers,
    data: { instant: '2026-10-12T01:30:00Z' },
  });
  await page.clock.setFixedTime(new Date('2026-10-12T01:30:00Z'));
  await page.goto('/home');
  await request.post(`${api}/_test/tonight/reject-next`, { headers });
  await page.getByTestId('tonight-menu-card').click();
  await page.getByTestId('skip-tonight-btn').dispatchEvent('click');
  await page.getByTestId('recovery-action-pick-else').click();
  await page.getByTestId('quick-find-select').click();
  await page.getByTestId('recovery-action-tomorrow').click();
  await expect(page.getByTestId('recovery-retry-save')).toBeVisible();
  const remoteRecipe = '660e8400-e29b-41d4-a716-446655440011';
  await request.post(`${api}/api/schedule/assign?referenceWeekStartDate=2026-10-05`, {
    headers,
    data: { weekOffset: 0, dayIndex: 6, recipeId: remoteRecipe, requireEmpty: true },
  });
  await page.getByTestId('recovery-retry-save').click();
  await expect(page.getByTestId('recovery-review-plan')).toBeVisible();
  expect((await read(0)).days[6].recipe.id).toBe(remoteRecipe);

  await page.getByTestId('recovery-close').click();
  await page.getByTestId('recovery-abandon').click();
  // Lost response after a real commit: reconciliation must close without a second POST.
  await page.goto('/home');
  await page.getByTestId('tonight-menu-card').click();
  await page.getByTestId('skip-tonight-btn').dispatchEvent('click');
  await page.getByTestId('recovery-action-pick-else').click();
  await page.getByTestId('quick-find-select').click();
  const beforeLoss = await (await request.get(`${api}/_test/tonight/requests`, { headers })).json();
  await request.post(`${api}/_test/tonight/drop-next`, { headers });
  await page.getByTestId('recovery-action-tomorrow').click();
  await expect(page.getByTestId('recovery-dialog-title')).not.toBeVisible();
  const afterLoss = await (await request.get(`${api}/_test/tonight/requests`, { headers })).json();
  expect(afterLoss.assignments).toBe(beforeLoss.assignments + 1);
  expect(afterLoss.moves).toBe(beforeLoss.moves + 1);
  expect((await read(0)).days[6].recipe.id).toBe('660e8400-e29b-41d4-a716-446655440012');

  // Fail a real grocery follow-up after the replacement calendar row commits.
  await page.goto('/home');
  await page.getByTestId('tonight-menu-card').click();
  await page.getByTestId('skip-tonight-btn').dispatchEvent('click');
  await page.getByTestId('recovery-action-pick-else').click();
  await page.getByTestId('quick-find-select').click();
  const beforeFollowup = await (
    await request.get(`${api}/_test/tonight/requests`, { headers })
  ).json();
  // Drop completes before installing the fault, so only assignment's postcommit adjunct fails.
  // Gate the actual generated assignment at the browser boundary; still send it to the real API.
  await page.route('**/api/schedule/assign**', async (route) => {
    await request.post(`${api}/_test/tonight/fail-groceries`, { headers });
    await route.continue();
  });
  await page.getByTestId('recovery-action-drop').click();
  await expect(
    page
      .getByTestId('toast')
      .filter({ hasText: /plan updates could not be confirmed/i })
      .first()
  ).toBeVisible();
  expect((await read(0)).days[6].recipe.id).toBe('660e8400-e29b-41d4-a716-446655440011');
  const afterFollowup = await (
    await request.get(`${api}/_test/tonight/requests`, { headers })
  ).json();
  expect(afterFollowup.assignments).toBe(beforeFollowup.assignments + 1);
  await request.post(`${api}/_test/tonight/restore-groceries`, { headers });
});
