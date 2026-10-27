import { test, expect, type Page } from '@playwright/test';
import { setupCommonRoutes, MOCK_IDS, builders } from './mock-api';
import { validateSecretToken } from '../src/lib/auth-utils';

const demo =
  (process.env.WFS_WELCOME_DEMO ?? process.env.DEMO_MODE ?? 'false').trim().toLowerCase() ===
  'true';
const secret = process.env.WFS_WELCOME_SECRET ?? 'Paris-Montreal';
const prefill = demo && secret === 'Swipe-Match-Cook';
const ACK = 'wfs:mode-info:demo:dismissed';
// This matrix uses the baked Beta artifact, selected by the existing isolated channel fixture.
const beta = process.env.WFS_WELCOME_CHANNEL === 'beta' && !demo;

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

test.describe('Beta context', () => {
  test.skip(!beta, 'Requires the dedicated baked Beta/non-demo Welcome fixture');
  const betaAck = 'wfs:mode-info:beta:dismissed';
  test.beforeEach(async ({ page, context, baseURL }) => {
    const origin = new URL(baseURL!).origin;
    await context.route(/^https?:\/\//, (route) =>
      new URL(route.request().url()).origin === origin ? route.fallback() : route.abort()
    );
    await setupCommonRoutes(page, undefined, { demoMode: false });
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  for (const locale of ['en', 'fr'] as const) {
    for (const [device, width, height] of [
      ['iphone-portrait', 390, 844],
      ['iphone-landscape', 844, 390],
      ['pixel-portrait', 412, 915],
      ['pixel-landscape', 915, 412],
      ['ipad-portrait', 820, 1180],
      ['ipad-landscape', 1180, 820],
    ] as const) {
      test(`${locale} ${device}: Beta login, dialog and Home`, async ({ page }, info) => {
        await page.setViewportSize({ width, height });
        await page.addInitScript((language) => localStorage.setItem('locale', language), locale);
        // Match the selected member's effective locale, rather than only browser storage.
        await page.route('**/api/family', (route) =>
          route.request().method() === 'GET'
            ? route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                  data: [
                    builders.familyMember({ name: 'Alex', preferredLanguage: locale }),
                    builders.familyMember({
                      id: MOCK_IDS.MEMBER_JORDAN,
                      name: 'Jordan',
                      preferredLanguage: locale,
                    }),
                  ],
                }),
              })
            : route.fallback()
        );
        await page.goto('/welcome');
        const title =
          locale === 'en' ? 'Beta · Better with your ideas' : 'Bêta · Meilleure grâce à vos idées';
        const start = locale === 'en' ? 'Start exploring' : 'Commencer à explorer';
        const band = page.getByTestId('beta-context-band');
        const input = page.getByTestId('passphrase-input');
        await expect(input).toHaveValue('');
        await expect(page.getByTestId('welcome-title')).toHaveText('Whats for Supper?');
        await expect(page.getByTestId('identity-hint')).toHaveCount(0);
        await expect(page.getByRole('dialog')).toHaveCount(0);
        await expect(band).toHaveText(title);
        expect((await band.boundingBox())!.height).toBeGreaterThanOrEqual(32);
        await input.fill('preserved family draft');
        const screenshot = async (state: string) => {
          // Beta CI publishes textual results only; preserve local visual inspection.
          if (!process.env.CI)
            await page.screenshot({
              path: info.outputPath(`${locale}-${device}-${state}.png`),
              fullPage: true,
            });
        };
        await screenshot('login');
        await band.click();
        const dialog = page.getByRole('dialog');
        await expect(dialog).toHaveAccessibleName(title);
        await expect(dialog.getByRole('heading')).toBeFocused();
        const link = dialog.getByRole('link', {
          name: locale === 'en' ? 'Share feedback on GitHub' : 'Donner votre avis sur GitHub',
        });
        await expect(link).toHaveAttribute(
          'href',
          'https://github.com/AlexandreBrisebois/whats-for-supper/issues'
        );
        await expect(link).toHaveAttribute('target', '_blank');
        await expect(link).toHaveAttribute('rel', 'noreferrer');
        expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true
        );
        await screenshot('dialog');
        await dialog.getByRole('button', { name: start, exact: true }).click();
        await expect(input).toHaveValue('preserved family draft');
        await expect(band).toBeFocused();
        await enter(page);
        await home(page);
        await expect(dialog).toHaveCount(0);
        await expect(band).toHaveCount(1);
        await expect(band).toHaveText(title);
        expect(await page.evaluate((key) => localStorage.getItem(key), betaAck)).toBe('true');
        expect(await page.evaluate((key) => localStorage.getItem(key), ACK)).toBeNull();
        await screenshot('home');
      });
    }
  }

  test('typing and onboarding leave the first Home introduction eligible; dismissal survives reload', async ({
    page,
  }) => {
    await page.goto('/welcome');
    await page.getByTestId('passphrase-input').fill('some typing');
    await page.getByTestId('passphrase-input').fill('');
    await enter(page);
    await home(page);
    await expect(page.getByRole('dialog')).toHaveAccessibleName('Beta · Better with your ideas');
    await page.keyboard.press('Escape');
    await page.reload();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByTestId('beta-context-band').click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('runtime Demo takes precedence in the app while Welcome uses installation identity', async ({
    page,
  }) => {
    await setupCommonRoutes(page, undefined, { demoMode: true });
    await page.goto('/welcome');
    await expect(page.getByTestId('beta-context-band')).toBeVisible();
    await enter(page);
    await home(page);
    await expect(page.getByTestId('beta-context-band')).toHaveCount(0);
    await expect(page.getByRole('dialog')).toHaveAccessibleName('Demo · What to know');
    await expect(page.getByRole('note', { name: 'Demo', exact: true })).toHaveAccessibleDescription(
      'Beta release channel'
    );
    await page.keyboard.press('Escape');
    expect(await page.evaluate((key) => localStorage.getItem(key), ACK)).toBe('true');
    expect(await page.evaluate((key) => localStorage.getItem(key), betaAck)).toBeNull();
  });

  test('Welcome dismissal shares memory with Home when Beta storage reads and writes fail', async ({
    page,
  }) => {
    await page.addInitScript((key) => {
      const get = Storage.prototype.getItem,
        set = Storage.prototype.setItem;
      Storage.prototype.getItem = function (name) {
        if (name === key) throw new Error('denied');
        return get.call(this, name);
      };
      Storage.prototype.setItem = function (name, value) {
        if (name === key) throw new Error('denied');
        set.call(this, name, value);
      };
    }, betaAck);
    await page.goto('/welcome');
    await page.getByTestId('beta-context-band').click();
    await page.keyboard.press('Escape');
    await enter(page);
    await home(page);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByTestId('beta-context-band').click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('feedback activation is optional and leaves the explanation and input intact', async ({
    page,
  }) => {
    await page.goto('/welcome');
    await page.getByTestId('passphrase-input').fill('kept input');
    await page.getByTestId('beta-context-band').click();
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.getByRole('link', { name: 'Share feedback on GitHub' }).click(),
    ]);
    await popup.close();
    await expect(page).toHaveURL(/\/welcome$/);
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(await page.evaluate((key) => localStorage.getItem(key), betaAck)).toBeNull();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('passphrase-input')).toHaveValue('kept input');
  });

  test('short phone large text, modal keyboard order, reachable actions and measured contrast', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/welcome');
    const band = page.getByTestId('beta-context-band'),
      strip = page.getByTestId('beta-context-strip');
    const contrast = () =>
      strip.evaluate((node) => {
        const rgb = (s: string) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
        const lum = (v: number[]) =>
          v
            .map((x) => {
              const c = x / 255;
              return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
            })
            .reduce((a, x, i) => a + x * [0.2126, 0.7152, 0.0722][i], 0);
        const s = getComputedStyle(node),
          a = lum(rgb(s.color)),
          b = lum(rgb(s.backgroundColor));
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      });
    expect(await contrast()).toBeGreaterThanOrEqual(4.5);
    await band.hover();
    expect(await contrast()).toBeGreaterThanOrEqual(4.5);
    await page.mouse.down();
    expect(await contrast()).toBeGreaterThanOrEqual(4.5);
    await page.mouse.up();
    const dialog = page.getByRole('dialog'),
      start = dialog.getByRole('button', { name: 'Start exploring' }),
      close = dialog.getByRole('button', { name: 'Close', exact: true });
    await page.keyboard.press('Shift+Tab');
    await expect(start).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(close).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('link')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(band).toBeFocused();
    await page.evaluate(() => (document.documentElement.style.fontSize = '32px'));
    await band.click();
    await start.scrollIntoViewIfNeeded();
    await expect(start).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    await start.click();
  });
});
