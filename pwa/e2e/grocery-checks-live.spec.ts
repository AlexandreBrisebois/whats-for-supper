import { test, expect, type BrowserContext } from '@playwright/test';
import { generateSecretToken } from './auth-utils';

test.skip(
  !process.env.CALENDAR_API_URL || !process.env.GROCERY_CHECKS_LIVE_MEMBERS,
  'Requires the isolated GroceryCheckConcurrencyPostgresTests live fixture.'
);

test('overlapping checks converge and an independent older snapshot needs a fresh read', async ({
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
        const Original = window.EventSource;
        window.EventSource = class extends Original {
          constructor(url: string | URL, options?: EventSourceInit) {
            super(url, options);
            this.addEventListener('grocery_updated', (event) =>
              (window as any).__groceryEvents.push(JSON.parse((event as MessageEvent).data))
            );
          }
        };
      });
    }
    const pages = await Promise.all(contexts.map((context) => context.newPage()));
    // The item button itself carries the ingredient identity.
    const item = (page: (typeof pages)[number], name: string) =>
      page.locator(`[data-testid="grocery-item-checkbox"][data-item-name="${name}"]`);
    for (const page of pages) {
      page.setDefaultTimeout(10000);
      await page.clock.setFixedTime(new Date('2026-10-12T01:30:00Z'));
      await page.goto('/planner?weekOffset=0&referenceWeekStartDate=2026-10-05');
      await page.getByTestId('grocery-tab').click();
      await expect(item(page, 'tomato')).toHaveAttribute('aria-checked', 'false');
    }
    expect((await request.post(`${api}/_test/ux/snapshot/capture`, { headers })).ok()).toBeTruthy();
    await Promise.all([item(pages[0], 'tomato').click(), item(pages[1], 'lettuce').click()]);
    for (const page of pages) {
      await expect(item(page, 'tomato')).toHaveAttribute('aria-checked', 'true');
      await expect(item(page, 'lettuce')).toHaveAttribute('aria-checked', 'true');
      await expect.poll(() => page.evaluate(() => (window as any).__groceryEvents.length)).toBe(2);
      const events = await page.evaluate(() => (window as any).__groceryEvents);
      expect(events[1].groceryState).toEqual({ tomato: true, lettuce: true });
      console.log('Observed grocery publication order', JSON.stringify(events));
    }
    const read = async () =>
      (await (await request.get(`${api}/api/schedule?weekOffset=0`, { headers })).json()).data;
    expect((await read()).groceryState).toEqual({ tomato: true, lettuce: true });
    expect((await request.post(`${api}/_test/ux/snapshot/release`, { headers })).ok()).toBeTruthy();
    for (const page of pages) {
      await expect(item(page, 'tomato')).toHaveAttribute('aria-checked', 'false');
      await expect(item(page, 'lettuce')).toHaveAttribute('aria-checked', 'false');
    }
    // All delayed messages have settled. Navigation obtains an authoritative fresh read.
    for (const page of pages) {
      await page.reload();
      await page.getByTestId('grocery-tab').click();
      await expect(item(page, 'tomato')).toHaveAttribute('aria-checked', 'true');
      await expect(item(page, 'lettuce')).toHaveAttribute('aria-checked', 'true');
    }
    expect((await read()).groceryState).toEqual({ tomato: true, lettuce: true });
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});
