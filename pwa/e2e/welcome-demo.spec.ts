import { test, expect, type Page } from '@playwright/test';
import { setupCommonRoutes, MOCK_IDS } from './mock-api';
import { validateSecretToken } from '../src/lib/auth-utils';

const demo =
  (process.env.WFS_WELCOME_DEMO ?? process.env.DEMO_MODE ?? 'false').trim().toLowerCase() ===
  'true';
const secret = process.env.WFS_WELCOME_SECRET ?? 'Paris-Montreal';
const prefill = demo && secret === 'Swipe-Match-Cook';
const ACK = 'wfs:mode-info:demo:dismissed';

test.beforeEach(async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  if (!['127.0.0.1', 'localhost'].includes(new URL(origin).hostname))
    throw new Error('Loopback only');
  await page.route(/^https?:\/\//, (route) => {
    const url = new URL(route.request().url());
    return url.origin === origin ? route.fallback() : route.abort();
  });
  await setupCommonRoutes(page, undefined, { demoMode: true });
});

async function enter(page: Page) {
  if (!prefill) await page.getByTestId('passphrase-input').fill(secret);
  await page.getByTestId('welcome-enter-btn').click();
  await expect(page).toHaveURL(/\/onboarding$/);
}
async function home(page: Page) {
  await page.getByTestId(`family-member-${MOCK_IDS.MEMBER_ALEX}`).click();
  await expect(page).toHaveURL(/\/home$/);
}

test('guard, actual server action, signed cookie and corrected explicit retry', async ({
  page,
  context,
}) => {
  await page.route('**/api/health', (route) => route.abort());
  await page.goto('/welcome');
  await expect(page.getByTestId('passphrase-input')).toHaveValue(prefill ? 'Swipe-Match-Cook' : '');
  expect((await context.cookies()).some((c) => c.name === 'h_access')).toBe(false);
  await page.getByTestId('passphrase-input').fill('synthetic-wrong-passphrase');
  await page.getByTestId('welcome-enter-btn').click();
  await expect(page.getByTestId('auth-error')).toBeVisible();
  await expect(page.getByTestId('passphrase-input')).toHaveValue('synthetic-wrong-passphrase');
  await page.getByTestId('passphrase-input').fill('');
  await expect(page.getByTestId('welcome-enter-btn')).toBeDisabled();
  await page.getByTestId('passphrase-input').fill(secret);
  await expect(page.getByTestId('welcome-helper')).toHaveText(
    "Enter your family's passphrase to continue"
  );
  await page.getByTestId('welcome-enter-btn').click();
  await expect(page).toHaveURL(/\/onboarding$/);
  const cookie = (await context.cookies()).find((c) => c.name === 'h_access')!;
  expect(cookie.httpOnly).toBe(true);
  expect(await validateSecretToken(cookie.value, secret)).toBe(true);
});

test('private synthetic secret never appears in HTML, RSC or client assets', async ({
  page,
  request,
}) => {
  test.skip(
    secret === 'Swipe-Match-Cook',
    'Disclosure negative control uses the custom-secret matrix case'
  );
  const html = await (await request.get('/welcome')).text();
  const rscResponse = await request.get('/welcome?_rsc=disclosure', { headers: { RSC: '1' } });
  expect(rscResponse.headers()['content-type']).toContain('text/x-component');
  const rsc = await rscResponse.text();
  for (const body of [html, rsc]) {
    for (const value of [secret, encodeURIComponent(secret), JSON.stringify(secret).slice(1, -1)])
      expect(body).not.toContain(value);
  }
  const assets = new Set<string>();
  page.on('response', (response) => {
    if (response.url().includes('/_next/static/') && response.url().split('?')[0].endsWith('.js'))
      assets.add(response.url());
  });
  await page.goto('/welcome');
  await expect(page.getByTestId('passphrase-input')).toHaveValue('');
  for (const asset of assets) expect(await (await request.get(asset)).text()).not.toContain(secret);
});

for (const dismissed of [false, true]) {
  test(`Welcome acknowledgement ${dismissed ? 'suppresses' : 'preserves'} first Home introduction`, async ({
    page,
  }) => {
    test.skip(!demo, 'Lifecycle requires the dedicated Demo server');
    await page.goto('/welcome');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    if (dismissed) {
      await page.getByTestId('demo-context-band').click();
      await expect(page.getByRole('dialog')).toHaveCount(1);
      await page.getByRole('button', { name: 'Start exploring', exact: true }).click();
      await expect(page.getByTestId('demo-context-band')).toBeFocused();
    }
    await enter(page);
    await home(page);
    if (dismissed) {
      await expect(page.getByRole('dialog')).toHaveCount(0);
      expect(await page.evaluate((key) => localStorage.getItem(key), ACK)).toBe('true');
      await page.getByTestId('demo-context-band').click();
    }
    await expect(page.getByRole('dialog')).toHaveCount(1);
  });
}

for (const locale of ['en', 'fr'] as const) {
  for (const [device, width, height] of [
    ['phone', 390, 844],
    ['pixel', 412, 915],
    ['ipad', 820, 1180],
    ['ipad-landscape', 1180, 820],
    ['short-phone', 320, 568],
  ] as const) {
    test(`${locale} ${device} login, explanation and Home`, async ({ page }, info) => {
      test.skip(!prefill, 'Public Demo visual/lifecycle matrix has its own server configuration');
      await page.setViewportSize({ width, height });
      await page.addInitScript((language) => localStorage.setItem('locale', language), locale);
      await page.goto('/');
      await expect(
        page.getByRole('heading', { level: 1, name: 'Whats for Supper?', exact: true })
      ).toBeVisible();
      await page.goto('/welcome');
      await expect(page.getByTestId('welcome-title')).toHaveText('Whats for Supper?');
      await expect(page.getByTestId('passphrase-input')).toHaveValue('Swipe-Match-Cook');
      const helper =
        locale === 'en'
          ? 'The demo passphrase is filled in for you. Tap Enter to explore.'
          : 'Le mot de passe de la démo est déjà rempli pour vous. Appuyez sur Entrer pour explorer.';
      await expect(page.getByTestId('passphrase-input')).toHaveAccessibleDescription(helper);
      const band = page.getByTestId('demo-context-band');
      expect((await band.boundingBox())!.height).toBeGreaterThanOrEqual(32);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      );
      const screenshot = async (state: string) => {
        await page.screenshot({
          path: info.outputPath(`${locale}-${device}-${state}.png`),
          fullPage: true,
        });
      };
      await screenshot('login');
      await band.focus();
      await page.keyboard.press('Enter');
      const dialog = page.getByRole('dialog');
      await expect(dialog).toHaveAccessibleName(
        locale === 'en' ? 'Demo · What to know' : 'Démo · À savoir'
      );
      await screenshot('dialog');
      await page.keyboard.press('Escape');
      await expect(band).toBeFocused();
      await expect(page).toHaveURL(/\/welcome$/);
      await enter(page);
      await home(page);
      await expect(dialog).toHaveCount(0);
      await expect(band).toHaveCount(1);
      await screenshot('home');
    });
  }
}

test('compact band and dialog retain native keyboard controls, contrast and large-text reachability', async ({
  page,
}) => {
  test.skip(!demo, 'Requires the Demo presentation');
  await page.setViewportSize({ width: 320, height: 568 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/welcome');
  const band = page.getByTestId('demo-context-band');
  const strip = page.getByTestId('demo-context-strip');
  async function contrast() {
    return strip.evaluate((node) => {
      const rgb = (value: string) => (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
      const l = (values: number[]) =>
        values
          .map((v) => {
            const c = v / 255;
            return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
          })
          .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
      const style = getComputedStyle(node),
        a = l(rgb(style.color)),
        b = l(rgb(style.backgroundColor));
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    });
  }
  expect(await contrast()).toBeGreaterThanOrEqual(4.5);
  await band.hover();
  expect(await contrast()).toBeGreaterThanOrEqual(4.5);
  await page.mouse.down();
  expect(await contrast()).toBeGreaterThanOrEqual(4.5);
  await page.mouse.up();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const close = dialog.getByRole('button', { name: 'Close', exact: true });
  const start = dialog.getByRole('button', { name: 'Start exploring', exact: true });
  await page.keyboard.press('Shift+Tab');
  await expect(start).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  expect((await close.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect((await start.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await close.click();
  await expect(band).toBeFocused();
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '32px';
  });
  await band.click();
  await start.scrollIntoViewIfNeeded();
  await expect(start).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await start.click();
  await expect(band).toBeFocused();
});
