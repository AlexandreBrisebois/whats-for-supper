import { test, expect } from './fixtures';
import { MOCK_IDS, setupCommonRoutes, builders } from './mock-api';

for (const locale of ['en', 'fr'] as const) {
  test.describe(`demo reset ${locale}`, () => {
    test.use({ appLocale: locale, hasTouch: true });
    for (const [device, width, height] of [
      ['iPhone', 390, 844],
      ['Pixel Phone', 412, 915],
      ['iPad portrait', 820, 1180],
      ['iPad landscape', 1180, 820],
    ] as const) {
      test(`${device}: reconnect clears old search draft and preserves acknowledgement`, async ({
        page,
        baseURL,
      }) => {
        const origin = new URL(baseURL || 'http://127.0.0.1:3000').origin;
        if (!['127.0.0.1', 'localhost'].includes(new URL(origin).hostname))
          throw new Error('Loopback required');
        await page.route(/^https?:\/\//, (route) =>
          new URL(route.request().url()).origin === origin ? route.fallback() : route.abort()
        );
        let generation = MOCK_IDS.RECIPE_LASAGNA;
        await setupCommonRoutes(page, undefined, {
          demoMode: true,
          demoGeneration: () => generation,
        });
        await page.route('**/api/family', (route) =>
          route.fulfill({
            headers: { 'X-Demo-Generation': generation },
            json: {
              data: [
                builders.familyMember({ id: MOCK_IDS.MEMBER_ALEX, preferredLanguage: locale }),
              ],
            },
          })
        );
        await page.route('**/api/family/me', (route) =>
          route.fulfill({
            headers: { 'X-Demo-Generation': generation },
            json: {
              data: builders.familyMember({ id: MOCK_IDS.MEMBER_ALEX, preferredLanguage: locale }),
            },
          })
        );
        await page
          .context()
          .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: origin }]);
        await page.addInitScript(() =>
          localStorage.setItem('wfs:mode-info:demo:dismissed', 'true')
        );
        await page.setViewportSize({ width, height });
        await page.goto('/recipes');
        await expect(page.getByTestId('recipe-search-input')).toBeVisible();
        await page.getByTestId('recipe-search-input').fill('old visitor search');
        generation = MOCK_IDS.MEMBER_ALEX;
        // The mock stream closes and EventSource reconnects, covering a missed reset event.
        await expect(page.getByTestId('demo-reset-notice')).toBeVisible({ timeout: 15000 });
        await expect(page.getByTestId('recipe-search-input')).toHaveCount(0);
        const action = page.getByTestId('demo-reset-continue');
        await expect(action).toBeFocused();
        await page.screenshot({
          path: `test-results/demo-reset-${locale}-${device.replaceAll(' ', '-')}.png`,
        });
        await expect(action).toHaveText(
          locale === 'fr' ? 'Continuer avec la démo réinitialisée' : 'Continue with the reset demo'
        );
        const box = await action.boundingBox();
        expect(box!.height).toBeGreaterThanOrEqual(44);
        await action.click();
        await expect(page.getByTestId('recipe-search-input')).toBeVisible();
        await expect(page.getByTestId('recipe-search-input')).toHaveValue('');
        expect(
          await page.evaluate(() => localStorage.getItem('wfs:mode-info:demo:dismissed'))
        ).toBe('true');
        expect(await page.evaluate(() => localStorage.getItem('locale'))).toBe(locale);
      });
    }
  });
}

test('shared demo matches require explicit saving, then groceries and cooking clear on reset', async ({
  page,
  baseURL,
}) => {
  page.setDefaultTimeout(5000);
  const origin = new URL(baseURL || 'http://127.0.0.1:3000').origin;
  if (!['127.0.0.1', 'localhost'].includes(new URL(origin).hostname))
    throw new Error('Loopback required');
  await page.route(/^https?:\/\//, (route) =>
    new URL(route.request().url()).origin === origin ? route.fallback() : route.abort()
  );
  let generation = MOCK_IDS.RECIPE_LASAGNA;
  await setupCommonRoutes(page, undefined, { demoMode: true, demoGeneration: () => generation });
  await page
    .context()
    .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: origin }]);
  await page.addInitScript(() => localStorage.setItem('wfs:mode-info:demo:dismissed', 'true'));
  await page.route(
    (url) => url.pathname === '/api/discovery',
    (route) =>
      route.fulfill({
        headers: { 'X-Demo-Generation': generation },
        json: {
          data: [
            builders.recipe({ id: MOCK_IDS.RECIPE_LASAGNA }),
            builders.recipe({ id: MOCK_IDS.RECIPE_CHICKEN }),
            builders.recipe({ id: MOCK_IDS.RECIPE_GNOCCHI }),
          ],
        },
      })
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/discovery');
  await expect(page.getByTestId('discovery-card').first()).toBeVisible();
  const mutate = async (path: string, method: string, body?: unknown, memberId?: string) =>
    page.evaluate(
      async (args) => {
        const response = await fetch(args.path, {
          method: args.method,
          headers: {
            'Content-Type': 'application/json',
            'X-Demo-Generation': args.generation,
            ...(args.memberId ? { 'X-Family-Member-Id': args.memberId } : {}),
          },
          ...(args.body === undefined ? {} : { body: JSON.stringify(args.body) }),
        });
        if (!response.ok) throw new Error(`${args.path}: ${response.status}`);
      },
      { path, method, body, memberId, generation }
    );
  // Other participants choose four non-cooking days and vote for three suppers.
  for (const date of ['2026-05-05', '2026-05-06', '2026-05-07', '2026-05-08'])
    await mutate(`/api/schedule/day/${date}/validate`, 'POST', {
      status: 3,
      nonCooking: { kind: 'order_in' },
    });
  await mutate('/api/schedule/voting/open?weekOffset=0', 'POST');
  for (const recipe of [MOCK_IDS.RECIPE_LASAGNA, MOCK_IDS.RECIPE_CHICKEN, MOCK_IDS.RECIPE_GNOCCHI])
    for (const member of [MOCK_IDS.MEMBER_ALEX, MOCK_IDS.MEMBER_JORDAN])
      await mutate(`/api/discovery/${recipe}/vote`, 'POST', { vote: 1 }, member);
  await expect(page.getByTestId('discovery-see-matches')).toBeVisible();
  await page.getByTestId('discovery-see-matches').click();
  await expect(page.getByTestId('close-voting-btn')).toBeVisible();
  const before = await page.evaluate(
    async () => (await (await fetch('/api/schedule?weekOffset=0')).json()).data
  );
  expect(before.days.filter((day: { recipe?: unknown }) => day.recipe)).toHaveLength(0);
  await page.getByTestId('close-voting-btn').click();
  await expect(page.getByTestId('ask-family-cta')).toBeVisible();
  await page.getByTestId('grocery-tab').click();
  const composer = page.getByTestId('grocery-extra-composer');
  await composer.getByRole('combobox').fill('Picnic napkins');
  await composer.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByTestId('grocery-extra-row')).toContainText('Picnic napkins');
  await page.getByRole('button', { name: 'Close grocery list' }).click();
  const developmentBadge = page.getByRole('button', { name: 'Collapse issues badge' });
  if (await developmentBadge.isVisible()) await developmentBadge.click();
  await page.locator('[data-testid="nav-item-home"]:visible').first().press('Enter');
  await expect(page.getByTestId('tonight-menu-card')).toBeVisible();
  await page.getByTestId('tonight-menu-card').click();
  await page.getByTestId('cook-mode-btn').dispatchEvent('click');
  const next = page.getByTestId('cooks-mode-step-next');
  await expect(next).toBeVisible();
  for (
    let step = 0;
    step < 12 && (await next.getAttribute('aria-label')) !== 'Mark recipe as cooked';
    step++
  )
    await next.click();
  await expect(next).toHaveAccessibleName('Mark recipe as cooked');
  await next.click();
  await expect(page.getByTestId('cooked-success-card')).toBeVisible();
  generation = MOCK_IDS.MEMBER_ALEX;
  await setupCommonRoutes(page, undefined, { demoMode: true, demoGeneration: () => generation });
  await expect(page.getByTestId('demo-reset-notice')).toBeVisible({ timeout: 15000 });
  await page.getByTestId('demo-reset-continue').click();
  await expect(page.getByTestId('cooked-success-card')).toHaveCount(0);
  await page.locator('[data-testid="nav-item-planner"]:visible').first().click();
  await page.getByTestId('grocery-tab').click();
  await expect(page.getByTestId('grocery-extra-row')).toHaveCount(0);
});
