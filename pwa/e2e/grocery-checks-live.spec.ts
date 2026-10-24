import { test, expect, type BrowserContext } from '@playwright/test';
import { generateSecretToken } from './auth-utils';

test.skip(
  !process.env.CALENDAR_API_URL || !process.env.GROCERY_CHECKS_LIVE_MEMBERS,
  'Requires the isolated GroceryCheckConcurrencyPostgresTests live fixture.'
);

test('two users share persisted checks and a fresh read recovers from a delayed independent snapshot', async ({
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
    await Promise.all(contexts.map((context, index) => prepare(context, members[index])));
    const pages = await Promise.all(contexts.map((context) => context.newPage()));
    const frames: Record<string, boolean>[][] = [[], []];
    for (const [index, page] of pages.entries()) {
      await page.exposeFunction('recordGrocery', (state: Record<string, boolean>) =>
        frames[index].push(state)
      );
      await page.addInitScript(() => {
        const Native = window.EventSource;
        window.EventSource = class extends Native {
          constructor(url: string | URL, options?: EventSourceInit) {
            super(url, options);
            this.addEventListener('grocery_updated', (event) => {
              void (window as any).recordGrocery(
                JSON.parse((event as MessageEvent).data).groceryState
              );
            });
          }
        };
      });
      page.setDefaultTimeout(15_000);
      await page.clock.setFixedTime(new Date('2026-10-20T12:00:00Z'));
      await page.goto('/planner?weekOffset=0&referenceWeekStartDate=2026-10-19');
      await page.getByTestId('grocery-tab').click();
      await expect(
        page.getByTestId('grocery-item-checkbox').filter({ hasText: 'Tomato' })
      ).toBeVisible();
    }
    const [first, second] = pages;
    const row = (page: typeof first, name: string) =>
      page.getByTestId('grocery-item-checkbox').filter({ hasText: name });
    expect(
      (
        await request.post(`${api}/_test/grocery/snapshot`, { headers, data: { capture: true } })
      ).ok()
    ).toBe(true);
    const settled = pages.map((page) =>
      page.waitForResponse(
        (response) =>
          response.url().endsWith('/grocery/item') && response.request().method() === 'PATCH'
      )
    );
    await Promise.all([row(first, 'Tomato').click(), row(second, 'Lettuce').click()]);
    for (const response of await Promise.all(settled)) expect(response.status()).toBe(204);
    for (const page of pages) {
      await expect(row(page, 'Tomato')).toHaveAttribute('aria-checked', 'true');
      await expect(row(page, 'Lettuce')).toHaveAttribute('aria-checked', 'true');
    }
    const read = async () =>
      (await (await request.get(`${api}/api/schedule?weekOffset=0`, { headers })).json()).data
        .groceryState;
    expect(await read()).toEqual({ Tomato: true, Lettuce: true });
    // Deliver a real earlier schedule projection after the ordered grocery events.
    expect(
      (
        await request.post(`${api}/_test/grocery/snapshot`, { headers, data: { capture: false } })
      ).ok()
    ).toBe(true);
    for (const page of pages)
      await expect(row(page, 'Tomato')).toHaveAttribute('aria-checked', 'false');
    expect(await read()).toEqual({ Tomato: true, Lettuce: true });
    for (const page of pages) {
      await page.reload();
      await page.getByTestId('grocery-tab').click();
      await expect(row(page, 'Tomato')).toHaveAttribute('aria-checked', 'true');
      await expect(row(page, 'Lettuce')).toHaveAttribute('aria-checked', 'true');
    }
    const completedAisle = first.getByTestId('aisle-header-complete');
    if ((await completedAisle.getAttribute('aria-expanded')) === 'false')
      await completedAisle.click();
    const [unchecked] = await Promise.all([
      first.waitForResponse(
        (response) =>
          response.url().endsWith('/grocery/item') && response.request().method() === 'PATCH'
      ),
      row(first, 'Tomato').click(),
    ]);
    expect(unchecked.status()).toBe(204);
    await expect(row(second, 'Tomato')).toHaveAttribute('aria-checked', 'false');
    expect(await read()).toEqual({ Tomato: false, Lettuce: true });
    console.log(JSON.stringify({ api, events: frames, persisted: await read() }));
  } finally {
    await Promise.allSettled(contexts.map((context) => context.close()));
  }
});
