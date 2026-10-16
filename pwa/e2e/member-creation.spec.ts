import { test, expect } from './fixtures';
import { MOCK_IDS, setupCommonRoutes } from './mock-api';

test('Settings creates members with 201 while retaining the current identity', async ({ page }) => {
  await setupCommonRoutes(page);
  const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
  await page
    .context()
    .addCookies([
      { name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl, httpOnly: true },
    ]);
  await page.addInitScript(() => {
    localStorage.setItem(
      'onboarding-storage',
      JSON.stringify({ state: { hasCompletedOnboarding: false }, version: 0 })
    );
  });
  await page.goto('/profile/settings');
  const alex = page.getByTestId(`family-member-${MOCK_IDS.MEMBER_ALEX}`);
  await expect(alex).toContainText('Selected family member');
  const identityBefore = (await page.context().cookies()).filter(
    (cookie) => cookie.name === 'x-family-member-id'
  );
  const completionBefore = await page.evaluate(() => localStorage.getItem('onboarding-storage'));
  await page.getByTestId('add-member-trigger').click();

  const createdIds: string[] = [];
  for (const name of [' cAsEy ', 'Robin']) {
    await page.getByTestId('family-name-input').fill(name);
    const responsePromise = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/family' && response.request().method() === 'POST'
    );
    await page.getByTestId('add-member-submit').click();
    const response = await responsePromise;
    expect(response.status()).toBe(201);
    expect(response.request().postDataJSON()).toEqual({ name: name.trim() });
    const { data } = await response.json();
    createdIds.push(data.id);
    await expect(page.getByTestId(`family-member-${data.id}`)).toContainText(name.trim());
    await expect(page.getByTestId(`family-member-${data.id}`)).not.toContainText(
      'Selected family member'
    );
    await expect(page.getByTestId('family-name-input')).toHaveValue('');
    await expect(alex).toContainText('Selected family member');
    await expect(page).toHaveURL(/\/profile\/settings$/);
  }
  expect(createdIds[0]).not.toBe(createdIds[1]);
  expect(
    (await page.context().cookies()).filter((cookie) => cookie.name === 'x-family-member-id')
  ).toEqual(identityBefore);
  expect(await page.evaluate(() => localStorage.getItem('onboarding-storage'))).toBe(
    completionBefore
  );

  // Exercise POST -> GET state in the mock, rather than just a local store append.
  await page.reload();
  await expect(page.getByTestId(`family-member-${createdIds[0]}`)).toContainText('cAsEy');
  await expect(page.getByTestId(`family-member-${createdIds[1]}`)).toContainText('Robin');
  await expect(alex).toContainText('Selected family member');
});

test('Settings duplicate creation returns 409 without creating duplicate member or changing selection', async ({
  page,
}) => {
  await setupCommonRoutes(page);
  const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
  await page
    .context()
    .addCookies([
      { name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl, httpOnly: true },
    ]);
  await page.goto('/profile/settings');
  const alex = page.getByTestId(`family-member-${MOCK_IDS.MEMBER_ALEX}`);
  await expect(alex).toContainText('Selected family member');

  await page.getByTestId('add-member-trigger').click();

  const input = page.getByTestId('family-name-input');
  await input.fill('  alex  ');

  const responsePromise = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/api/family' && response.request().method() === 'POST'
  );
  await page.getByTestId('add-member-submit').click();
  const response = await responsePromise;
  expect(response.status()).toBe(409);
  const body = await response.json();
  expect(body.status).toBe(409);

  await expect(alex).toContainText('Selected family member');
  await expect(page.getByTestId('family-list').locator('li')).toHaveCount(2);
});
