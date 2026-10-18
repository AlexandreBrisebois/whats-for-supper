import { test, expect } from '@playwright/test';
import { generateSecretToken } from './auth-utils';

test.skip(
  !process.env.CALENDAR_API_URL,
  'Requires the isolated weekly-interest PostgreSQL live host.'
);

test('real Quick Find ranks early live likes before history and closes the captured round', async ({
  page,
  request,
  baseURL,
}) => {
  const api = process.env.CALENDAR_API_URL!;
  const secret = process.env.HEARTH_SECRET!;
  const headers = { 'X-Hearth-Secret': secret };
  const member = (await (await request.get(`${api}/api/family`, { headers })).json()).data[0];
  await page.clock.setFixedTime(new Date('2026-10-12T12:00:00Z'));
  await page.context().addCookies([
    { name: 'h_access', value: await generateSecretToken(secret), url: baseURL! },
    { name: 'x-family-member-id', value: member.id, url: baseURL! },
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
  await page.goto('/planner?weekOffset=0&referenceWeekStartDate=2026-10-12');
  await page.getByTestId('day-card-0').getByTestId('plan-meal-button').click();
  await page.getByTestId('pivot-quick-find').click();
  await expect(page.getByText('Live family supper').first()).toBeVisible();
  const assigned = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === '/api/schedule/assign'
  );
  await page.getByTestId('quick-find-select').click();
  expect((await assigned).status()).toBe(200);
  await page.getByTestId('day-card-1').getByTestId('plan-meal-button').click();
  await page.getByTestId('pivot-quick-find').click();
  await expect(page.getByText('Historical family supper').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await page.goto('/planner?weekOffset=0&referenceWeekStartDate=2026-10-12');
  await page.getByTestId('ask-family-cta').click();
  await expect(page.getByTestId('close-voting-btn')).toBeVisible();
  const close = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === '/api/schedule/lock'
  );
  await page.getByTestId('close-voting-btn').click();
  const response = await close;
  expect(response.status()).toBe(200);
  expect(new URL(response.url()).searchParams.get('votingRoundId')).toMatch(/^[0-9a-f-]{36}$/i);
  await expect(page.getByTestId('ask-family-cta')).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('day-card-0')).toContainText('Live family supper');
});
