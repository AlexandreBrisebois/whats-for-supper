import { test, expect, type BrowserContext } from '@playwright/test';
import { generateSecretToken } from './auth-utils';

test.skip(
  !process.env.CALENDAR_API_URL || !process.env.VOTING_LIVE_MEMBERS,
  'Requires the isolated voting-session PostgreSQL live fixture.'
);

test('two real members converge next week, receive late suggestions, reconnect and reopen for one slot', async ({
  browser,
  request,
  baseURL,
}) => {
  test.setTimeout(120_000);
  const api = process.env.CALENDAR_API_URL!;
  const secret = process.env.HEARTH_SECRET!;
  const headers = { 'X-Hearth-Secret': secret };
  const members = process.env.VOTING_LIVE_MEMBERS!.split(',');
  const allMembers = (await (await request.get(`${api}/api/family`, { headers })).json()).data;
  const recipeId = (index: number) => `78000000-0000-0000-0000-${String(index).padStart(12, '0')}`;
  const vote = async (member: string, recipe: string, value = 1) => {
    const response = await request.post(`${api}/api/discovery/${recipe}/vote`, {
      headers: { ...headers, 'X-Family-Member-Id': member },
      data: { vote: value },
      timeout: 15_000,
    });
    expect(response.status()).toBe(200);
  };
  const session = async () => {
    const response = await request.get(`${api}/api/discovery/session`, { headers });
    expect(response.status()).toBe(200);
    return (await response.json()).data;
  };
  const prepare = async (context: BrowserContext, member: string) => {
    await context.addCookies([
      { name: 'h_access', value: await generateSecretToken(secret), url: baseURL! },
      { name: 'x-family-member-id', value: member, url: baseURL! },
    ]);
    await context.addInitScript(
      ({ member, allMembers }) => {
        localStorage.setItem('locale', 'en');
        localStorage.setItem(
          'family-storage',
          JSON.stringify({
            state: {
              selectedFamilyMemberId: member,
              familyMembers: allMembers,
              _hasHydrated: true,
              hasLoaded: true,
            },
            version: 0,
          })
        );
      },
      { member, allMembers }
    );
  };

  const firstContext = await browser.newContext();
  const secondContext = await browser.newContext();
  try {
    await prepare(firstContext, members[0]);
    await prepare(secondContext, members[1]);
    const first = await firstContext.newPage();
    const second = await secondContext.newPage();
    const planner = await secondContext.newPage();
    for (const page of [first, second, planner])
      await page.clock.setFixedTime(new Date('2026-10-12T12:00:00Z'));
    planner.on('response', (response) => {
      const path = new URL(response.url()).pathname;
      if (
        response.request().method() === 'POST' &&
        ['/api/schedule/assign', '/api/schedule/lock'].includes(path)
      )
        console.log(`[voting-live] POST ${path}: ${response.status()}`);
    });
    await first.goto('/discovery');
    await expect(first.getByTestId('discovery-card').first()).toContainText('Live supper 4');
    await second.goto('/discovery');
    await planner.goto('/planner?weekOffset=1&referenceWeekStartDate=2026-10-12');
    await expect(planner.getByTestId('close-voting-btn')).toBeVisible();

    for (let index = 0; index < 3; index++) {
      const saved = second.waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          /\/api\/discovery\/[^/]+\/vote$/.test(new URL(response.url()).pathname)
      );
      await second.getByTestId('like-button').click();
      expect((await saved).status()).toBe(200);
    }
    await expect(first.getByTestId('discovery-converged')).toBeVisible();
    await expect(second.getByTestId('discovery-converged')).toBeVisible();
    console.log('[voting-live] both members converged');
    await expect(first.getByRole('heading', { name: "Menu's in!", exact: true })).toBeVisible();
    await expect(first.getByTestId('like-button')).toHaveCount(0);
    const converged = await session();
    expect(converged.weekStartDate).toBe('2026-10-19');
    expect(converged.requiredSlots).toBe(3);
    expect(converged.coveredSlots).toBe(3);
    const beforeClose = (
      await (await request.get(`${api}/api/schedule?weekOffset=1`, { headers })).json()
    ).data;
    expect(beforeClose.days.filter((day: { recipe?: unknown }) => day.recipe)).toHaveLength(0);

    await first.getByTestId('discovery-see-matches').click();
    await expect(first).toHaveURL('/planner?weekOffset=0&referenceWeekStartDate=2026-10-19');
    await expect(first.getByTestId('close-voting-btn')).toBeVisible();
    const afterHandoff = (
      await (
        await request.get(`${api}/api/schedule?weekOffset=0&referenceWeekStartDate=2026-10-19`, {
          headers,
        })
      ).json()
    ).data;
    expect(afterHandoff.status).toBe(1);
    expect(afterHandoff.days.filter((day: { recipe?: unknown }) => day.recipe)).toHaveLength(0);
    await first.getByTestId('nav-item-discovery').click();
    await expect(first.getByTestId('discovery-converged')).toBeVisible();

    const lastSuggestion = converged.smartDefaults.preSelectedRecipes.at(-1).recipeId;
    await vote(members[2], lastSuggestion);
    const reordered = await session();
    expect(reordered.smartDefaults.preSelectedRecipes[0].recipeId).toBe(lastSuggestion);
    await expect(planner.getByTestId('day-card-4')).toContainText(
      `Live supper ${Number(lastSuggestion.slice(-1))}`
    );
    await expect(first.getByTestId('discovery-converged')).toBeVisible();
    console.log('[voting-live] late unanimity reordered owning Planner');

    // Abort real response streams and temporarily reject reconnects, so later frames are missed.
    expect(
      (
        await request.post(`${api}/_test/voting/stream`, {
          headers,
          data: { online: false },
          timeout: 15_000,
        })
      ).status()
    ).toBe(200);
    await vote(members[0], recipeId(4));
    await vote(members[1], recipeId(4));
    const reconnected = first.waitForResponse(
      (response) => new URL(response.url()).pathname === '/api/discovery/session' && response.ok(),
      { timeout: 15_000 }
    );
    expect(
      (
        await request.post(`${api}/_test/voting/stream`, {
          headers,
          data: { online: true },
          timeout: 15_000,
        })
      ).status()
    ).toBe(200);
    expect((await reconnected).status()).toBe(200);
    await expect
      .poll(() =>
        first.evaluate(
          () => (window as Window & { __sseSource?: EventSource }).__sseSource?.readyState
        )
      )
      .toBe(1);
    await expect(first.getByTestId('discovery-converged')).toBeVisible();
    expect((await session()).candidateCount).toBe(4);
    console.log('[voting-live] native SSE reconnected and read missed extra match');

    const closed = planner.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/schedule/lock' &&
        response.request().method() === 'POST',
      { timeout: 15_000 }
    );
    await planner.getByTestId('close-voting-btn').click();
    expect((await closed).status()).toBe(200);
    console.log('[voting-live] Close Voting saved suggestions and closed round');
    expect((await session()).phase).toBe('unowned');
    const afterClose = (
      await (await request.get(`${api}/api/schedule?weekOffset=1`, { headers })).json()
    ).data;
    const assigned = afterClose.days.filter((day: { recipe?: unknown }) => day.recipe);
    expect(assigned).toHaveLength(3);
    for (const day of assigned) {
      const dayIndex = afterClose.days.findIndex(
        (candidate: { date: string }) => candidate.date === day.date
      );
      const card = planner.getByTestId(`day-card-${dayIndex}`);
      await expect(card).toContainText(day.recipe.name);
      await expect(card.getByTestId('change-recipe-button')).toBeVisible();
    }
    const removed = assigned.at(-1);
    expect(
      (await request.delete(`${api}/api/schedule/day/${removed.date}/remove`, { headers })).status()
    ).toBe(204);
    await expect(planner.getByTestId('ask-family-cta')).toBeVisible();
    await planner.getByTestId('ask-family-cta').click();
    await expect(planner.getByTestId('close-voting-btn')).toBeVisible();
    const reopened = await session();
    expect(reopened.roundId).not.toBe(converged.roundId);
    expect(reopened.requiredSlots).toBe(1);
    expect(reopened.phase).toBe('collecting');
    // Existing selected meals are excluded; the removed meal supplies exactly one new match.
    await vote(members[0], removed.recipe.id);
    await vote(members[1], removed.recipe.id);
    await expect(first.getByTestId('discovery-converged')).toBeVisible();
    await expect(second.getByTestId('discovery-converged')).toBeVisible();
    const final = await session();
    expect(final.phase).toBe('converged');
    expect(final.requiredSlots).toBe(1);
    expect(final.coveredSlots).toBe(1);
    expect(final.smartDefaults.preSelectedRecipes).toHaveLength(1);
    console.log('[voting-live] reopened round converged for exactly one slot');
  } catch (error) {
    console.error('[voting-live] first failure', error);
    throw error;
  } finally {
    await Promise.allSettled([firstContext.close(), secondContext.close()]);
  }
});
