import { test, expect, type BrowserContext } from '@playwright/test';
import { generateSecretToken } from './auth-utils';

test.skip(
  !process.env.CALENDAR_API_URL || !process.env.GROCERY_CHECKS_LIVE_MEMBERS,
  'Requires the isolated GroceryCheckConcurrencyPostgresTests live fixture.'
);

test('independent water checks converge and an older snapshot cannot restore stale checks', async ({
  browser,
  request,
  baseURL,
}) => {
  test.setTimeout(120_000);
  const api = process.env.CALENDAR_API_URL!;
  const secret = process.env.HEARTH_SECRET!;
  const headers = { 'X-Hearth-Secret': secret };
  const members = process.env.GROCERY_CHECKS_LIVE_MEMBERS!.split(',');
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
  const contexts = await Promise.all([
    browser.newContext({ viewport: { width: 390, height: 844 } }),
    browser.newContext({ viewport: { width: 390, height: 844 } }),
  ]);
  try {
    for (let index = 0; index < contexts.length; index++) {
      await prepare(contexts[index], members[index]);
      await contexts[index].addInitScript(() => {
        (window as any).__groceryEvents = [];
        (window as any).__groceryConnected = false;
        const Original = window.EventSource;
        window.EventSource = class extends Original {
          constructor(url: string | URL, options?: EventSourceInit) {
            super(url, options);
            this.addEventListener('connected', () => {
              (window as any).__groceryConnected = true;
            });
            this.addEventListener('grocery_updated', (event) =>
              (window as any).__groceryEvents.push(JSON.parse((event as MessageEvent).data))
            );
          }
        };
      });
    }
    const pages = await Promise.all(contexts.map((context) => context.newPage()));
    const read = async () =>
      (await (await request.get(`${api}/api/schedule?weekOffset=0`, { headers })).json()).data;
    const initial = await read();
    expect(initial.groceryItems).toHaveLength(3);
    const rowId = (unit: string) =>
      initial.groceryItems.find((row: any) => row.unitText === unit).rowId;
    const expectedChecks = Object.fromEntries(
      initial.groceryItems.map((row: any) => [row.rowId, row.unitText !== 'cup'])
    );
    const item = (page: (typeof pages)[number], unit: string) =>
      page.locator(`[data-testid="grocery-item-checkbox"][data-row-id="${rowId(unit)}"]`);
    for (const page of pages) {
      page.setDefaultTimeout(10000);
      await page.clock.setFixedTime(new Date('2026-10-12T01:30:00Z'));
      await page.goto('/planner?weekOffset=0&referenceWeekStartDate=2026-10-05');
      await page.getByTestId('grocery-tab').click();
      await expect(page.getByTestId('grocery-item-checkbox')).toHaveCount(3);
      await expect(page.getByTestId('grocery-extra-checkbox')).toHaveCount(1);
      await expect(item(page, 'g')).toHaveAttribute('aria-checked', 'false');
      await expect.poll(() => page.evaluate(() => (window as any).__groceryConnected)).toBe(true);
    }
    expect((await request.post(`${api}/_test/ux/snapshot/capture`, { headers })).ok()).toBeTruthy();
    await Promise.all([item(pages[0], 'g').click(), item(pages[1], 'ml').click()]);
    const publications: any[] = [];
    for (const [index, page] of pages.entries()) {
      await expect(item(page, 'g')).toHaveAttribute('aria-checked', 'true');
      await expect(item(page, 'ml')).toHaveAttribute('aria-checked', 'true');
      // The writer's own connection is excluded; its HTTP acknowledgement reconciles it.
      await expect.poll(() => page.evaluate(() => (window as any).__groceryEvents.length)).toBe(1);
      const events = await page.evaluate(() => (window as any).__groceryEvents);
      expect(events[0].groceryState[rowId(index === 0 ? 'ml' : 'g')]).toBe(true);
      expect(events[0].groceryState[rowId('cup')]).toBe(false);
      publications.push(events[0]);
    }
    expect(publications.map((event) => event.groceryListVersion).sort()).toEqual(
      [
        String(BigInt(initial.groceryListVersion) + 1n),
        String(BigInt(initial.groceryListVersion) + 2n),
      ].sort()
    );
    expect(
      publications.find(
        (event) => event.groceryListVersion === String(BigInt(initial.groceryListVersion) + 2n)
      ).groceryState
    ).toEqual(expectedChecks);
    console.log('Observed grocery publications', JSON.stringify(publications));
    expect((await read()).groceryState).toEqual(expectedChecks);
    expect((await request.post(`${api}/_test/ux/snapshot/release`, { headers })).ok()).toBeTruthy();
    for (const page of pages) {
      await expect(item(page, 'g')).toHaveAttribute('aria-checked', 'true');
      await expect(item(page, 'ml')).toHaveAttribute('aria-checked', 'true');
      await expect(item(page, 'cup')).toHaveAttribute('aria-checked', 'false');
      await expect(page.getByTestId('grocery-extra-checkbox')).toHaveAttribute(
        'aria-checked',
        'false'
      );
    }
    // Navigation independently rereads the same committed state.
    for (const page of pages) {
      await page.reload();
      await page.getByTestId('grocery-tab').click();
      await expect(item(page, 'g')).toHaveAttribute('aria-checked', 'true');
      await expect(item(page, 'ml')).toHaveAttribute('aria-checked', 'true');
    }
    expect((await read()).groceryState).toEqual(expectedChecks);
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});
