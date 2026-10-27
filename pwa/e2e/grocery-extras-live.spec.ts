import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { generateSecretToken } from './auth-utils';

test.skip(
  !process.env.CALENDAR_API_URL || !process.env.GROCERY_EXTRAS_LIVE_MEMBERS,
  'Requires the isolated GroceryExtraPostgresTests live fixture.'
);

test('two household shoppers observe extra mutations and reconnect recovers a missed event', async ({
  browser,
  request,
  baseURL,
}) => {
  test.setTimeout(120_000);
  const api = process.env.CALENDAR_API_URL!;
  const secret = process.env.HEARTH_SECRET!;
  const headers = { 'X-Hearth-Secret': secret };
  const members = process.env.GROCERY_EXTRAS_LIVE_MEMBERS!.split(',');
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
  const stream = async (online: boolean) =>
    expect(
      (await request.post(`${api}/_test/ux/stream`, { headers, data: { online } })).status()
    ).toBe(200);
  const contexts = await Promise.all([
    browser.newContext({ hasTouch: true, viewport: { width: 390, height: 844 } }),
    browser.newContext({ hasTouch: true, viewport: { width: 390, height: 844 } }),
  ]);
  try {
    for (let index = 0; index < contexts.length; index++)
      await prepare(contexts[index], members[index]);
    const [first, second] = await Promise.all(contexts.map((context) => context.newPage()));
    for (const page of [first, second]) {
      await page.clock.setFixedTime(new Date('2026-10-20T12:00:00Z'));
      await page.goto('/planner?weekOffset=0&referenceWeekStartDate=2026-10-19');
      await page.getByTestId('grocery-tab').click();
      await expect(page.getByTestId('grocery-extra-composer')).toBeVisible();
    }
    const input = first.getByRole('combobox', { name: 'Add an extra' });
    await input.fill('Coffee');
    // Pointer activation must never blur the field and cycle the mobile keyboard.
    await input.evaluate((element) => {
      element.addEventListener('blur', () => {
        element.setAttribute('data-blurred', 'true');
      });
    });
    await first.getByRole('button', { name: 'Add', exact: true }).tap();
    await expect(input).toBeFocused();
    await expect(input).not.toHaveAttribute('data-blurred', 'true');
    const firstRow = first.getByTestId('grocery-extra-row');
    const secondRow = second.getByTestId('grocery-extra-row');
    await expect(secondRow).toContainText('Coffee');
    await firstRow.getByTestId('grocery-extra-checkbox').click();
    await expect(secondRow.getByTestId('grocery-extra-checkbox')).toHaveAttribute(
      'aria-checked',
      'true'
    );
    await firstRow.getByRole('button', { name: 'Edit Coffee' }).click();
    await firstRow.getByRole('textbox', { name: 'Extra name' }).fill('Ground coffee');
    await firstRow.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(secondRow).toContainText('Ground coffee');
    await firstRow.getByRole('button', { name: 'Change section for Ground coffee' }).click();
    await firstRow.getByRole('button', { name: 'Pantry', exact: true }).click();
    await expect(second.getByTestId('aisle-section-Pantry')).toContainText('Ground coffee');
    const schedule = async (offset: number) => {
      const response = await request.get(
        `${api}/api/schedule?weekOffset=${offset}&referenceWeekStartDate=2026-10-19`,
        { headers }
      );
      expect(response.status()).toBe(200);
      return (await response.json()).data;
    };
    const checkedFour = (await schedule(0)).groceryExtras[0];
    expect(checkedFour).toMatchObject({ checked: true, version: 4 });
    await firstRow.getByTestId('grocery-extra-checkbox').click();
    await expect(secondRow.getByTestId('grocery-extra-checkbox')).toHaveAttribute(
      'aria-checked',
      'false'
    );
    const uncheckedFive = (await schedule(0)).groceryExtras[0];
    expect(uncheckedFive).toMatchObject({ checked: false, version: 5 });
    await second.goto('/planner?weekOffset=1&referenceWeekStartDate=2026-10-19');
    await second.getByTestId('grocery-tab').click();
    await expect(secondRow).toContainText('Ground coffee');
    await expect(second.getByTestId('grocery-extra-composer')).toHaveCount(0);

    // Observe the native EventSource after the production hook's listener; never invoke stores.
    for (const page of [first, second]) {
      await page.waitForFunction(
        () => (window as any).__sseSource?.readyState === EventSource.OPEN
      );
      await page.evaluate(() => {
        (window as any).__qualificationEvents = [];
        for (const name of ['grocery_extras_updated', 'week_updated', 'connected'])
          (window as any).__sseSource.addEventListener(name, (event: MessageEvent) => {
            (window as any).__qualificationEvents.push({ name, data: JSON.parse(event.data) });
          });
      });
    }
    const replay = async (page: Page, eventType: string, payload: unknown) => {
      const before = await page.evaluate(() => (window as any).__qualificationEvents.length);
      expect(
        (
          await request.post(`${api}/_test/ux/replay`, {
            headers,
            data: { eventType, payload },
          })
        ).status()
      ).toBe(200);
      await page.waitForFunction(
        (count) => (window as any).__qualificationEvents.length > count,
        before
      );
    };
    const eventPayload = (extra: unknown) => ({
      weekStartDate: '2026-10-19',
      groceryExtras: [extra],
    });
    const future = await schedule(1);
    expect(future.weekStartDate).toBe('2026-10-26');
    const staleFuture = { ...future, groceryExtras: [checkedFour] };
    await replay(second, 'grocery_extras_updated', eventPayload(checkedFour));
    await expect(secondRow.getByTestId('grocery-extra-checkbox')).toHaveAttribute(
      'aria-checked',
      'false'
    );
    await replay(second, 'week_updated', { schedule: staleFuture });
    await expect(secondRow.getByTestId('grocery-extra-checkbox')).toHaveAttribute(
      'aria-checked',
      'false'
    );

    // A real selected-week HTTP read reaches the browser with only the occurrence representation
    // substituted. The server normally omits checked future projections; this is an injected
    // boundary condition, not a claim that PostgreSQL produced this mixed snapshot.
    let readDelivered = false;
    await second.route('**/api/schedule?**', async (route) => {
      const response = await route.fetch();
      const body = await response.json();
      if (new URL(route.request().url()).searchParams.get('weekOffset') === '1') {
        body.data.groceryExtras = [checkedFour];
      }
      await route.fulfill({ response, json: body });
      readDelivered = true;
    });
    const readResponse = second.waitForResponse(
      (response) =>
        response.url().includes('/api/schedule?') &&
        new URL(response.url()).searchParams.get('weekOffset') === '1'
    );
    await second.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow')));
    await readResponse;
    await expect.poll(() => readDelivered).toBe(true);
    await second.unrouteAll({ behavior: 'wait' });
    await second.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        )
    );
    await expect(secondRow.getByTestId('grocery-extra-checkbox')).toHaveAttribute(
      'aria-checked',
      'false'
    );

    // Equal-version checked winners exercise both reconciliation boundaries.
    const equalChecked = { ...uncheckedFive, checked: true };
    await replay(second, 'grocery_extras_updated', eventPayload(equalChecked));
    await expect(secondRow).toHaveCount(0);
    await replay(second, 'grocery_extras_updated', eventPayload(uncheckedFive));
    await expect(secondRow).toHaveCount(1);
    await replay(second, 'week_updated', {
      schedule: { ...future, groceryExtras: [equalChecked] },
    });
    await expect(secondRow).toHaveCount(0);
    await replay(second, 'grocery_extras_updated', eventPayload(uncheckedFive));
    await expect(secondRow).toHaveCount(1);

    // Hold a future-view check before the real mutation boundary; both event and snapshot
    // collections must preserve its optimistic absence until the version-six commit.
    let releaseCheck!: () => void;
    const checkGate = new Promise<void>((resolve) => {
      releaseCheck = resolve;
    });
    let checkArrived = false;
    await second.route('**/api/grocery-extras/*', async (route) => {
      if (route.request().method() === 'PATCH') {
        checkArrived = true;
        await checkGate;
      }
      await route.continue();
    });
    await secondRow.getByTestId('grocery-extra-checkbox').click();
    await expect.poll(() => checkArrived).toBe(true);
    await expect(secondRow).toHaveCount(0);
    await replay(second, 'grocery_extras_updated', eventPayload(uncheckedFive));
    await expect(secondRow).toHaveCount(0);
    await replay(second, 'week_updated', { schedule: future });
    await expect(secondRow).toHaveCount(0);
    const checkResponse = second.waitForResponse(
      (response) =>
        response.request().method() === 'PATCH' && response.url().includes('/api/grocery-extras/')
    );
    releaseCheck();
    expect((await checkResponse).status()).toBe(200);
    await second.unrouteAll({ behavior: 'wait' });
    await expect(secondRow).toHaveCount(0);
    await expect(firstRow.getByTestId('grocery-extra-checkbox')).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect((await schedule(0)).groceryExtras[0]).toMatchObject({ checked: true, version: 6 });
    expect((await schedule(1)).groceryExtras).toEqual([]);
    await firstRow.getByTestId('grocery-extra-checkbox').click();
    await expect(secondRow).toHaveCount(1);

    // Hold deletion before the real API boundary. Stale event/snapshot receipt cannot resurrect it.
    let releaseDelete!: () => void;
    const deletionGate = new Promise<void>((resolve) => {
      releaseDelete = resolve;
    });
    let deleteArrived = false;
    await first.route('**/api/grocery-extras/*', async (route) => {
      if (route.request().method() === 'DELETE') {
        deleteArrived = true;
        await deletionGate;
      }
      await route.continue();
    });
    await firstRow.getByRole('button', { name: 'Edit Ground coffee' }).click();
    await firstRow.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect.poll(() => deleteArrived).toBe(true);
    await expect(firstRow).toHaveCount(0);
    await replay(first, 'grocery_extras_updated', eventPayload(uncheckedFive));
    await expect(firstRow).toHaveCount(0);
    await replay(first, 'week_updated', {
      schedule: { ...(await schedule(0)), groceryExtras: [uncheckedFive] },
    });
    await expect(firstRow).toHaveCount(0);
    await stream(false);
    const deletionResponse = first.waitForResponse(
      (response) =>
        response.request().method() === 'DELETE' && response.url().includes('/api/grocery-extras/')
    );
    releaseDelete();
    expect((await deletionResponse).status()).toBe(204);
    await expect(firstRow).toHaveCount(0);
    await expect(secondRow).toHaveCount(1);
    const recoveredRead = second.waitForResponse(
      (response) =>
        response.url().includes('/api/schedule?') &&
        new URL(response.url()).searchParams.get('weekOffset') === '1'
    );
    await stream(true);
    expect((await recoveredRead).status()).toBe(200);
    await expect(secondRow).toHaveCount(0, { timeout: 15_000 });
    await expect(second).toHaveURL(/weekOffset=1/);
    await expect(second.getByTestId('grocery-extra-composer')).toHaveCount(0);
    expect((await schedule(1)).groceryExtras).toEqual([]);
    // Also observe deletion through the live stream with both shoppers on the current week.
    await second.goto('/planner?weekOffset=0&referenceWeekStartDate=2026-10-19');
    await second.getByTestId('grocery-tab').click();
    await expect(second.getByTestId('grocery-extra-composer')).toBeVisible();
    await input.fill('Disposable extra');
    await first.getByRole('button', { name: 'Add', exact: true }).tap();
    await expect(secondRow).toContainText('Disposable extra');
    await firstRow.getByRole('button', { name: 'Edit Disposable extra' }).click();
    await firstRow.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(secondRow).toHaveCount(0);
    console.log(
      'QUALIFIED: current-week two-client add/check/rename/category/delete; stale event/snapshot/HTTP; equal/newer checked; pending check/delete; future-week reconnect authoritative read'
    );
  } finally {
    for (const context of contexts) await context.close();
  }
});
