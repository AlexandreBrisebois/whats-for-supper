import { test, expect, type BrowserContext } from '@playwright/test';
import { generateSecretToken } from './auth-utils';

test.skip(
  !process.env.CALENDAR_API_URL || !process.env.UX_LIVE_MEMBERS,
  'Requires the isolated PlanLaterPostgresTests live fixture.'
);

test('reconnect reconciles raw grocery checks and Plan later refreshes the other viewer destination', async ({
  browser,
  request,
  baseURL,
}) => {
  test.setTimeout(120_000);
  const api = process.env.CALENDAR_API_URL!;
  const secret = process.env.HEARTH_SECRET!;
  const headers = { 'X-Hearth-Secret': secret };
  const members = process.env.UX_LIVE_MEMBERS!.split(',');
  const allMembers = (await (await request.get(`${api}/api/family`, { headers })).json()).data;
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
  const stream = async (online: boolean) => {
    console.log('[ux-live] Set stream online:', online);
    expect(
      (
        await request.post(`${api}/_test/ux/stream`, { headers, data: { online }, timeout: 15_000 })
      ).status()
    ).toBe(200);
  };
  const checks = async (state: Record<string, boolean>) => {
    console.log('[ux-live] Save missed checks:', state);
    expect(
      (
        await request.patch(`${api}/api/schedule/0/grocery`, {
          headers,
          data: state,
          timeout: 15_000,
        })
      ).status()
    ).toBe(200);
  };
  const firstContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const secondContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    await prepare(firstContext, members[0]);
    await prepare(secondContext, members[1]);
    const first = await firstContext.newPage();
    const second = await secondContext.newPage();
    first.setDefaultTimeout(15_000);
    second.setDefaultTimeout(15_000);
    for (const page of [first, second])
      await page.clock.setFixedTime(new Date('2026-10-14T12:00:00Z'));
    await first.goto('/planner?weekOffset=0&referenceWeekStartDate=2026-10-12');
    await second.goto('/planner?weekOffset=1&referenceWeekStartDate=2026-10-12');
    await expect(first.getByTestId('day-card-0')).toContainText('Live carrot supper');
    await expect(second.getByTestId('day-card-0')).not.toContainText('Live carrot supper');
    await first.getByTestId('grocery-tab').click();
    const carrot = first.locator('[data-testid="grocery-item-checkbox"][data-item-name="carrots"]');
    await expect(carrot).toHaveAttribute('aria-checked', 'false');

    // Miss the dedicated grocery event, then reconcile only the native raw connected snapshot.
    await stream(false);
    await checks({ carrots: true });
    await expect(carrot).toHaveAttribute('aria-checked', 'false');
    await stream(true);
    await expect(carrot).toHaveAttribute('aria-checked', 'true', { timeout: 15_000 });
    await stream(false);
    await checks({});
    await expect(carrot).toHaveAttribute('aria-checked', 'true');
    await stream(true);
    await expect(carrot).toHaveAttribute('aria-checked', 'false', { timeout: 15_000 });
    await expect
      .poll(() =>
        second.evaluate(
          () => (window as Window & { __sseSource?: EventSource }).__sseSource?.readyState
        )
      )
      .toBe(1);

    await first.getByRole('button', { name: 'Close grocery list' }).click();
    await first.getByTestId('day-card-0').getByTestId('change-recipe-button').click();
    const moved = first.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/schedule/move' &&
        response.request().method() === 'POST'
    );
    await first.getByTestId('pivot-plan-later').click();
    const response = await moved;
    expect(response.status()).toBe(200);
    expect((await response.json()).data.moved).toBe(true);
    await expect(first.getByTestId('day-card-0')).not.toContainText('Live carrot supper');
    await expect(second.getByTestId('day-card-0')).toContainText('Live carrot supper');
    await second.getByTestId('grocery-tab').click();
    await expect(second.getByTestId('grocery-item-label')).toContainText('carrots');
    await first.getByTestId('grocery-tab').click();
    await expect(first.getByTestId('grocery-item-label')).toHaveCount(0);
    const read = await request.get(
      `${api}/api/schedule?weekOffset=1&referenceWeekStartDate=2026-10-12`,
      { headers }
    );
    const destination = (await read.json()).data;
    expect(destination.weekStartDate).toBe('2026-10-19');
    expect(destination.days[0].recipe.name).toBe('Live carrot supper');
    expect(destination.groceryItems[0].displayName).toBe('carrots');

    // A new round revises future choices without changing recorded meals or reviving a removed recipe.
    const recipeId = (index: number) =>
      `79000000-0000-0000-0000-${String(index).padStart(12, '0')}`;
    for (const [dayIndex, index] of [
      [0, 2],
      [3, 4],
      [4, 3],
    ]) {
      expect(
        (
          await request.post(`${api}/api/schedule/assign?referenceWeekStartDate=2026-10-12`, {
            headers,
            data: { weekOffset: 0, dayIndex, recipeId: recipeId(index) },
          })
        ).status()
      ).toBe(200);
    }
    expect(
      (
        await request.post(`${api}/api/schedule/day/2026-10-12/validate`, {
          headers,
          data: { status: 2, recipeId: recipeId(2) },
        })
      ).status()
    ).toBe(200);
    await first.getByRole('button', { name: 'Close grocery list' }).click();
    await second.goto('/planner?weekOffset=0&referenceWeekStartDate=2026-10-12');
    await expect(first.getByTestId('day-card-0')).toContainText('Live outcome 2');
    await expect(second.getByTestId('day-card-0')).toContainText('Live outcome 2');
    for (const page of [first, second]) {
      await expect
        .poll(() =>
          page.evaluate(
            () => (window as Window & { __sseSource?: EventSource }).__sseSource?.readyState
          )
        )
        .toBe(1);
      await page.evaluate(() => {
        const target = window as Window & { __sseSource?: EventSource; __uxSnapshots?: unknown[] };
        target.__uxSnapshots = [];
        target.__sseSource!.addEventListener('week_updated', (event) => {
          target.__uxSnapshots!.push(JSON.parse((event as MessageEvent).data).schedule);
        });
      });
    }
    await first.getByTestId('ask-family-cta').click();
    await first.getByTestId('close-voting-btn').click();
    await expect(first.getByTestId('ask-family-cta')).toBeVisible();
    await first.getByTestId('day-card-4').getByTestId('change-recipe-button').click();
    const removed = first.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/schedule/day/2026-10-16/remove' &&
        response.request().method() === 'DELETE'
    );
    await first.getByTestId('pivot-remove-recipe').click();
    expect((await removed).status()).toBe(204);
    await expect(second.getByTestId('day-card-4').getByTestId('plan-meal-button')).toBeVisible();
    await first.getByTestId('ask-family-cta').click();
    await first.getByTestId('close-voting-btn').click();
    for (const page of [first, second]) {
      await expect(page.getByTestId('day-card-0')).toContainText('Live outcome 2');
      await expect(page.getByTestId('day-card-4').getByTestId('plan-meal-button')).toBeVisible();
    }
    // Local mutations exclude their initiating SSE connection; the other member receives the snapshot.
    await expect
      .poll(() =>
        second.evaluate(() => {
          const snapshots = (
            window as Window & {
              __uxSnapshots?: { status: number; days: { status: number; recipe?: unknown }[] }[];
            }
          ).__uxSnapshots;
          const schedule = snapshots?.at(-1);
          return (
            schedule && [
              schedule.status,
              schedule.days[0].status,
              schedule.days[3].status,
              schedule.days[4].recipe ?? null,
            ]
          );
        })
      )
      .toEqual([2, 2, 1, null]);
  } finally {
    await Promise.allSettled([firstContext.close(), secondContext.close()]);
  }
});
