import { test, expect } from '@playwright/test';
import { setupCommonRoutes, MOCK_IDS, builders } from './mock-api';
import { generateSecretToken } from './auth-utils';
import channelArtifact from '../src/lib/server/release-channel.json';

const demo = process.env.DEMO_MODE?.trim().toLowerCase() === 'true';
const variant =
  channelArtifact.channel === 'beta' ? (demo ? 'beta-demo' : 'beta') : demo ? 'demo' : 'production';
const prefix = variant === 'production' ? '' : `/icons/install-v1/${variant}`;
const name = "What's for Supper?";

test('public install metadata agrees in initial HTML and retains access policy', async ({
  request,
}) => {
  const response = await request.get('/manifest.json');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/manifest+json');
  expect(response.headers()['cache-control']).toContain('no-store');
  const manifest = await response.json();
  // The Web App Manifest id is an origin-relative URL, not a domain entity GUID.
  expect(manifest.id).toBe('/');
  expect(manifest).toMatchObject({
    start_url: '/',
    display: 'standalone',
    name,
    short_name: name,
    theme_color: '#CD5D45',
  });
  expect(manifest.icons.every((icon: { src: string }) => icon.src.startsWith(prefix + '/'))).toBe(
    true
  );
  expect(manifest.shortcuts.map((shortcut: { url: string }) => shortcut.url)).toEqual([
    '/discovery',
    '/capture',
  ]);
  const pdf = ['on', 'opt-in'].includes(
    process.env.WFS_FEATURE_PREVIEW_PDF_RECIPE_IMPORT?.trim().toLowerCase() ?? ''
  );
  expect(manifest.share_target.method).toBe(pdf ? 'POST' : 'GET');
  expect(manifest.share_target.action).toBe(pdf ? '/share-target' : '/capture');
  for (const icon of [
    ...manifest.icons,
    ...manifest.shortcuts.flatMap((shortcut: { icons: { src: string }[] }) => shortcut.icons),
  ]) {
    expect((await request.get(icon.src)).status()).toBe(200);
  }
  // A normal browser UA must receive metadata in head, without hydration or API access.
  for (let attempt = 0; attempt < 2; attempt++) {
    const htmlResponse = await request.get('/welcome', {
      headers: { 'User-Agent': 'Mozilla/5.0 AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15' },
    });
    expect(htmlResponse.headers()['cache-control']).toMatch(/no-store|no-cache/);
    expect(htmlResponse.headers()['cache-control']).not.toContain('s-maxage');
    const html = await htmlResponse.text();
    const head = html.split('</head>')[0];
    expect(head).toContain(
      `<title>${name.replaceAll('&', '&amp;').replaceAll("'", '&#x27;')}</title>`
    );
    expect(head).toContain(
      `name="apple-mobile-web-app-title" content="${name.replaceAll("'", '&#x27;')}"`
    );
    expect(head).toContain('rel="manifest" href="/manifest.json"');
    expect(head).toContain(`rel="icon" href="${prefix}/favicon-32x32.png"`);
    if (prefix) {
      expect(head).toContain(`rel="shortcut icon" href="${prefix}/favicon.ico"`);
      expect((await request.get(`${prefix}/favicon.ico`)).status()).toBe(200);
    }
    expect(head).toContain(`rel="apple-touch-icon" href="${manifest.icons[1].src}"`);
  }
  const protectedResponse = await request.get('/planner', { maxRedirects: 0 });
  expect(protectedResponse.status()).toBe(307);
  expect(protectedResponse.headers().location).toContain('/welcome');
});

for (const locale of ['en', 'fr'] as const) {
  test(`localized welcome and main hints preserve branding and control space: ${locale}`, async ({
    page,
    baseURL,
  }) => {
    // All browser API calls are isolated from live services; existing builders own the mock contract.
    await page.route('**/api/**', (route) =>
      route.fulfill({ status: 403, body: 'Unmocked API call' })
    );
    await setupCommonRoutes(page);
    await page.route('**/api/health', (route) => route.abort());
    const member = builders.familyMember({ id: MOCK_IDS.MEMBER_ALEX, preferredLanguage: locale });
    await page.route('**/api/family', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [member] }),
      })
    );
    await page.route('**/api/family/me', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: member }),
      })
    );
    await page.addInitScript((locale) => localStorage.setItem('locale', locale), locale);

    const label = demo ? (locale === 'fr' ? 'Démo' : 'Demo') : locale === 'fr' ? 'Bêta' : 'Beta';
    for (const width of [320, 768]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ['/welcome', '/planner', '/capture']) {
        if (route !== '/welcome') {
          await page.context().addCookies([
            { name: 'h_access', value: await generateSecretToken('Paris-Montreal'), url: baseURL! },
            { name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseURL! },
          ]);
        }
        await page.goto(route);
        await expect(page).toHaveURL(new RegExp(`${route}$`));
        if (route === '/welcome') {
          await expect(page.getByTestId('welcome-title')).toHaveText(
            locale === 'fr' ? "Qu'est-ce qu'on mange ?" : "What's For Supper?"
          );
          await expect(page.getByTestId('passphrase-input')).toHaveValue('');
          await expect(page.getByTestId('welcome-enter-btn')).toBeDisabled();
        } else if (route === '/planner') {
          await expect(page.getByTestId('planner-tab')).toBeVisible();
        } else {
          await expect(page.getByTestId('capture-cancel-btn')).toBeVisible();
        }
        const hint = page.getByTestId('identity-hint');
        if (!demo && channelArtifact.channel === 'stable') {
          await expect(hint).toHaveCount(0);
          continue;
        }
        await expect(hint).toHaveCount(1);
        await expect(hint).toBeVisible();
        await expect(hint).toHaveAccessibleName(label);
        await expect(hint).toHaveAccessibleDescription(
          demo && channelArtifact.channel === 'beta'
            ? locale === 'fr'
              ? 'Canal bêta'
              : 'Beta release channel'
            : ''
        );
        await expect(hint).not.toHaveAttribute('tabindex');
        // Geometry checks detect an informational overlay covering any reachable control.
        const geometry = await page.evaluate(() => {
          const hint = document.querySelector('[data-testid="identity-hint"]')!;
          const h = hint.getBoundingClientRect();
          const controls = Array.from(document.querySelectorAll('button,a,input,select,textarea'));
          const boxes = controls.map((element) => element.getBoundingClientRect());
          const overlaps = boxes.filter(
            (b) =>
              b.width &&
              b.height &&
              b.top < innerHeight &&
              b.bottom > 0 &&
              b.left < h.right &&
              b.right > h.left &&
              b.top < h.bottom &&
              b.bottom > h.top
          ).length;
          hint.remove();
          const moved = controls.some((element, i) => {
            const b = element.getBoundingClientRect(),
              old = boxes[i];
            return (
              b.x !== old.x || b.y !== old.y || b.width !== old.width || b.height !== old.height
            );
          });
          return {
            overlaps,
            moved,
            insideViewport: h.left >= 0 && h.top >= 0 && h.right <= innerWidth,
          };
        });
        expect(geometry).toEqual({ overlaps: 0, moved: false, insideViewport: true });
      }
    }
  });
}
