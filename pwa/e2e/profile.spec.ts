import { startUnselectedProfileFixture } from './profile-local-fixture';
import { test, expect } from './fixtures';
import { MOCK_IDS, builders, setupCommonRoutes } from './mock-api';

test.describe('Profile Page', () => {
  test.beforeEach(async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
    await page.context().addCookies([
      {
        name: 'x-family-member-id',
        value: MOCK_IDS.MEMBER_ALEX,
        url: baseUrl,
        httpOnly: true, // Matches app behavior for PWA persistence
      },
    ]);

    await page.setViewportSize({ width: 390, height: 844 });
    await setupCommonRoutes(page);
  });

  for (const width of [320, 390, 412]) {
    test(`uses the available phone width at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto('/profile');
      await expect(page.getByTestId('selected-member-name')).toHaveText('Alex');
      const chooser = await page.getByTestId('profile-dropdown-toggle').boundingBox();
      expect(chooser!.width).toBeGreaterThanOrEqual(width - 32);
      expect(chooser!.x).toBeGreaterThanOrEqual(8);
      expect(chooser!.x + chooser!.width).toBeLessThanOrEqual(width - 8);
    });
  }

  for (const locale of ['en', 'fr'] as const) {
    test.describe(locale, () => {
      test.use({ appLocale: locale });
      test(`loaded composition retains exact title and controls in ${locale}`, async ({ page }) => {
        await page.route('**/api/family', (route) =>
          route.fulfill({
            json: {
              data: [
                builders.familyMember({
                  id: MOCK_IDS.MEMBER_ALEX,
                  name: 'Alex',
                  preferredLanguage: locale,
                }),
              ],
            },
          })
        );
        await page.goto('/profile');
        await expect(page.getByTestId('selected-member-name')).toHaveText('Alex');
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(
          locale === 'en' ? "Table's Set!" : 'À table !'
        );
        await expect(
          page.getByText(
            /Pick a family member to get started\.|Choisissez un membre de la famille pour commencer\./
          )
        ).toHaveCount(0);
        await expect(page.getByTestId('continue-as-btn')).toHaveCount(0);
        await expect(page.getByTestId('settings-btn')).toBeVisible();
        await expect(page.getByTestId('locale-btn-en')).toBeEnabled();
        await expect(page.getByTestId('locale-btn-fr')).toBeEnabled();
        await expect(page).toHaveURL(/\/profile$/);
      });
    });
  }
});

// These exercise the real page/store and mocked HTTP boundary, not live cookie handoff.
test.describe('Profile member chooser', () => {
  test.beforeEach(async ({ page }) => {
    await setupCommonRoutes(page);
    await page.context().addCookies([
      {
        name: 'x-family-member-id',
        value: MOCK_IDS.MEMBER_ALEX.toUpperCase(),
        url: process.env.BASE_URL || 'http://127.0.0.1:3000',
      },
    ]);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/profile');
    await expect(page.getByTestId('selected-member-name')).toHaveText('Alex');
  });
  test('toggle, outside and Escape dismiss without selection or navigation', async ({ page }) => {
    let selections = 0;
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.headers()['next-action']) selections++;
    });
    const trigger = page.getByTestId('profile-dropdown-toggle');
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(
      page.getByTestId(`profile-dropdown-option-${MOCK_IDS.MEMBER_ALEX}`)
    ).toHaveAttribute('aria-current', 'true');
    await trigger.click();
    await expect(page.getByTestId('profile-dropdown-menu')).toHaveCount(0);
    await trigger.click();
    await page.getByRole('heading', { level: 1 }).click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await trigger.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    await expect(page.getByTestId(`profile-dropdown-option-${MOCK_IDS.MEMBER_ALEX}`)).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByTestId('selected-member-name')).toHaveText('Alex');
    await expect(page).toHaveURL(/\/profile$/);
    expect(selections).toBe(0);
  });
  for (const id of [MOCK_IDS.MEMBER_ALEX, MOCK_IDS.MEMBER_JORDAN]) {
    test(`keyboard selection requests Home for ${id}`, async ({ page }) => {
      const selection = page.waitForRequest(
        (r) => r.method() === 'POST' && !!r.headers()['next-action']
      );
      await page.getByTestId('profile-dropdown-toggle').click();
      await page.getByTestId(`profile-dropdown-option-${id}`).focus();
      await page.keyboard.press('Space');
      expect((await selection).postData()).toContain(id);
      await expect(page).toHaveURL(/\/home/);
    });
  }
  test('Settings remains reachable', async ({ page }) => {
    await page.getByTestId('settings-btn').click();
    await expect(page).toHaveURL(/\/profile\/settings/);
  });
});

test.describe('Profile language integration', () => {
  test.beforeEach(async ({ page }) => {
    await setupCommonRoutes(page);
  });
  test('member language uses the actual provider/store and preference request', async ({
    page,
  }) => {
    await page.context().addCookies([
      {
        name: 'x-family-member-id',
        value: MOCK_IDS.MEMBER_ALEX,
        url: process.env.BASE_URL || 'http://127.0.0.1:3000',
      },
    ]);
    await page.goto('/profile');
    await expect(page.getByTestId('selected-member-name')).toHaveText('Alex');
    const save = page.waitForResponse(
      (r) =>
        r.url().endsWith(`/api/family/${MOCK_IDS.MEMBER_ALEX}/preferences`) &&
        r.request().method() === 'PUT'
    );
    await page.getByTestId('locale-btn-fr').click();
    expect((await save).request().postDataJSON()).toEqual({ preferredLanguage: 'fr' });
    await expect(page.getByTestId('locale-btn-fr')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('locale-btn-fr').locator('[data-language-check]')).toBeVisible();
    await expect(page.getByRole('group', { name: 'Langue' })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('locale'))).toBe('fr');
    await expect(page.getByTestId('selected-member-name')).toHaveText('Alex');
    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByRole('status').filter({ hasText: /saved|enregistr/i })).toHaveCount(0);
  });
  test('without a selected member language is local-only', async ({ page }) => {
    test.setTimeout(60000);
    const fixture = await startUnselectedProfileFixture();
    try {
      await page.route('**/api/family/me', (route) => route.fulfill({ json: { data: null } }));
      await page.addInitScript(() => localStorage.setItem('locale', 'fr'));
      let saves = 0;
      page.on('request', (r) => {
        if (r.method() === 'PUT' && r.url().includes('/preferences')) saves++;
      });
      await page.goto(fixture.url);
      await expect(page.getByTestId('selected-member-name')).toHaveText('Choisir un membre');
      await expect(page.getByTestId('continue-as-btn')).toHaveCount(0);
      await expect(
        page.getByText('Choisissez un membre de la famille pour commencer.')
      ).toHaveCount(0);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('À table !');
      await page.getByTestId('locale-btn-en').click();
      await expect(page.getByTestId('locale-btn-en')).toHaveAttribute('aria-pressed', 'true');
      expect(await page.evaluate(() => localStorage.getItem('locale'))).toBe('en');
      expect(saves).toBe(0);
      await expect(page.getByTestId('selected-member-name')).toHaveText(
        /Select member|Choisir un membre/
      );
      await expect(page.getByTestId('continue-as-btn')).toHaveCount(0);
      // Exact titles are checked on initial render; retain the existing local-only preference behavior.
      await expect(
        page.getByText(
          /Pick a family member to get started\.|Choisissez un membre de la famille pour commencer\./
        )
      ).toHaveCount(0);
      await expect(page).toHaveURL(`${fixture.url}/`);
    } finally {
      await page.goto('about:blank');
      await fixture.stop();
    }
  });
  test('rejected preference save retains reconciliation and makes no saved claim', async ({
    page,
  }) => {
    await page.context().addCookies([
      {
        name: 'x-family-member-id',
        value: MOCK_IDS.MEMBER_ALEX,
        url: process.env.BASE_URL || 'http://127.0.0.1:3000',
      },
    ]);
    await page.route('**/api/family/*/preferences', (route) =>
      route.fulfill({ status: 500, json: { status: 500, message: 'Test rejection' } })
    );
    await page.goto('/profile');
    await expect(page.getByTestId('selected-member-name')).toHaveText('Alex');
    const rejected = page.waitForResponse(
      (r) => r.url().includes('/preferences') && r.status() === 500
    );
    await page.getByTestId('locale-btn-fr').click();
    expect((await rejected).request().postDataJSON()).toEqual({ preferredLanguage: 'fr' });
    // Backend English wins again after rollback; the browser-local choice remains French.
    await expect(page.getByTestId('locale-btn-en')).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => localStorage.getItem('locale'))).toBe('fr');
    await expect(page.getByTestId('selected-member-name')).toHaveText('Alex');
    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByRole('status').filter({ hasText: /saved|enregistr/i })).toHaveCount(0);
    await expect(page.getByRole('alert').filter({ hasText: /saved|enregistr/i })).toHaveCount(0);
  });
});

const longName = 'Alexandra Marie-Claire Tremblay du Bois';
const household = Array.from({ length: 18 }, (_, index) =>
  builders.familyMember({
    id:
      index === 0
        ? MOCK_IDS.MEMBER_ALEX
        : `${MOCK_IDS.MEMBER_TEST.slice(0, -12)}${String(100 + index).padStart(12, '0')}`,
    name: index === 0 ? longName : `Membre de la famille ${index + 1} Tremblay`,
  })
);

for (const locale of ['en', 'fr'] as const) {
  test.describe(`Profile space and motion ${locale}`, () => {
    test.use({ appLocale: locale });
    test.beforeEach(async ({ page }) => {
      await setupCommonRoutes(page);
      await page.context().addCookies([
        {
          name: 'x-family-member-id',
          value: MOCK_IDS.MEMBER_ALEX,
          url: process.env.BASE_URL || 'http://127.0.0.1:3000',
        },
      ]);
      await page.route('**/api/family', (route) =>
        route.fulfill({
          json: { data: household.map((member) => ({ ...member, preferredLanguage: locale })) },
        })
      );
    });
    for (const viewport of [
      { width: 320, height: 640 },
      { width: 390, height: 844 },
      { width: 412, height: 915 },
      { width: 768, height: 1024 },
      { width: 1024, height: 768 },
    ]) {
      test(`wraps and keeps controls reachable at ${viewport.width}x${viewport.height}`, async ({
        page,
      }) => {
        await page.setViewportSize(viewport);
        await page.goto('/profile');
        await expect(page.getByTestId('selected-member-name')).toHaveText(longName);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true
        );
        for (const id of [
          'settings-btn',
          'profile-dropdown-toggle',
          'locale-btn-en',
          'locale-btn-fr',
        ]) {
          const control = page.getByTestId(id);
          await control.scrollIntoViewIfNeeded();
          const box = await control.boundingBox();
          expect(box!.width).toBeGreaterThanOrEqual(48);
          expect(box!.height).toBeGreaterThanOrEqual(48);
          expect(box!.x).toBeGreaterThanOrEqual(0);
          expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
        }
        await page.screenshot({
          path: `../.task/profile-visual/after-${locale}-${viewport.width}.png`,
          fullPage: true,
        });
        await page.keyboard.press('Tab');
        for (const id of [
          'settings-btn',
          'profile-dropdown-toggle',
          'locale-btn-en',
          'locale-btn-fr',
        ]) {
          await page.getByTestId(id).focus();
          expect(
            await page.getByTestId(id).evaluate((el) => {
              const box = el.getBoundingClientRect();
              return (
                box.top >= 0 &&
                box.bottom <= document.querySelector('nav')!.getBoundingClientRect().top
              );
            }),
            `${id} clears fixed navigation`
          ).toBe(true);
        }
      });
    }
    test('200% text and every overflowing choice reachable with keyboard', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await page.goto('/profile');
      await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
      await expect(page.getByTestId('selected-member-name')).toHaveText(longName);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      );
      await page.getByTestId('profile-dropdown-toggle').click();
      const list = page.getByTestId('profile-dropdown-menu');
      expect(await list.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
      await page.getByTestId(`profile-dropdown-option-${household[0].id}`).focus();
      for (let index = 0; index < household.length; index++) {
        const choice = page.getByTestId(`profile-dropdown-option-${household[index].id}`);
        await expect(choice).toBeFocused();
        const visible = await choice.evaluate((el) => {
          const box = el.getBoundingClientRect();
          const list = el.closest('ul')!.getBoundingClientRect();
          return (
            box.top >= list.top &&
            box.bottom <= list.bottom + 1 &&
            box.top >= 0 &&
            box.bottom <=
              (document.querySelector('nav')?.getBoundingClientRect().top ?? innerHeight)
          );
        });
        expect(
          visible,
          JSON.stringify(
            await choice.evaluate((el) => ({
              text: el.textContent,
              choice: el.getBoundingClientRect().toJSON(),
              list: el.closest('ul')!.getBoundingClientRect().toJSON(),
              scroll: el.closest('ul')!.scrollTop,
            }))
          )
        ).toBe(true);
        if (index < household.length - 1) await page.keyboard.press('Tab');
      }
      await page.screenshot({
        path: `../.task/profile-visual/after-${locale}-200-open.png`,
        fullPage: true,
      });
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('profile-dropdown-toggle')).toBeFocused();
      await page.getByTestId('locale-btn-fr').scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `../.task/profile-visual/after-${locale}-200.png`,
        fullPage: true,
      });
    });
    test('reduced-motion loading and loaded controls have no animation or staging', async ({
      page,
    }) => {
      test.setTimeout(60000);
      const fixture = await startUnselectedProfileFixture();
      try {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.setViewportSize({ width: 390, height: 844 });
        let release!: () => void;
        const ready = new Promise<void>((resolve) => {
          release = resolve;
        });
        await page.route('**/api/family', async (route) => {
          await ready;
          await route.fallback();
        });
        // The production identity guard waits for family loading before mounting Profile.
        // Exercise this state through the existing isolated real-page fixture.
        await page.goto(fixture.url);
        await expect(page.getByRole('status')).toContainText(
          locale === 'en' ? 'Loading family members' : 'Chargement des membres'
        );
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(
          locale === 'en' ? "Table's Set!" : 'À table !'
        );
        await expect(page.getByTestId('continue-as-btn')).toHaveCount(0);
        await expect(
          page.getByText(
            /Pick a family member to get started\.|Choisissez un membre de la famille pour commencer\./
          )
        ).toHaveCount(0);
        const loadingBox = await page.getByRole('status').boundingBox();
        await expect(page.getByTestId('settings-btn')).toBeVisible();
        await expect(page.getByTestId('locale-btn-en')).toBeEnabled();
        const motion = await page
          .getByTestId('profile-page')
          .evaluate(
            (el) => [el, ...el.querySelectorAll('*')].flatMap((node) => node.getAnimations()).length
          );
        expect(motion).toBe(0);
        await page.screenshot({
          path: `../.task/profile-visual/after-${locale}-loading.png`,
          fullPage: true,
        });
        release();
        const trigger = page.getByTestId('profile-dropdown-toggle');
        await expect(trigger).toBeVisible();
        expect((await trigger.boundingBox())!.height).toBeGreaterThanOrEqual(loadingBox!.height);
        await trigger.click();
        expect(
          await trigger
            .locator('svg')
            .last()
            .evaluate((el) => getComputedStyle(el).transitionProperty)
        ).toBe('none');
        expect(
          await page
            .getByTestId('profile-page')
            .evaluate(
              (el) =>
                [el, ...el.querySelectorAll('*')].flatMap((node) => node.getAnimations()).length
            )
        ).toBe(0);
      } finally {
        await page.goto('about:blank');
        await fixture.stop();
      }
    });
  });
}
