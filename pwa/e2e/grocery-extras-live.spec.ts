import { test, expect, type BrowserContext } from '@playwright/test';
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
    await stream(false);
    await firstRow.getByRole('button', { name: 'Edit Ground coffee' }).click();
    await firstRow.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(firstRow).toHaveCount(0);
    await expect(secondRow).toHaveCount(1);
    await stream(true);
    await expect(secondRow).toHaveCount(0, { timeout: 15_000 });
  } finally {
    for (const context of contexts) await context.close();
  }
});
