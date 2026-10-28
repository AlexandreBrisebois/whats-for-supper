import { writeFile } from 'node:fs/promises';
import { expectTonightLayout, recordTonightControlStates } from './helpers/tonight-card-layout';
import { test, expect, type Page } from './fixtures';
import type { NonCookingPlanDto, ScheduleDays } from '../src/lib/api/generated/models';
import {
  MOCK_IDS,
  builders,
  setupCommonRoutes,
  currentMonday,
  toDateStr,
  mockSseWithSlotUpdate,
  mockSseWithConnectedSchedule,
} from './mock-api';

/** Use the existing browser schedule/SSE seams, leaving Home SSR reconciliation intact. */
async function prepareAdaptiveTonight(page: Page, name: string, image = 'loaded') {
  const source = `/api/recipes/${MOCK_IDS.RECIPE_LASAGNA}/hero`;
  await page.route(
    (url) => url.pathname.endsWith('/hero'),
    (route) =>
      image === 'failed'
        ? route.fulfill({ status: 404, body: '' })
        : route.fulfill({ path: 'e2e/fixtures/cookbook-light.jpg', contentType: 'image/jpeg' })
  );
  const schedule = builders.scheduleDays();
  schedule.days.find((day) => day.date === toDateStr(currentMonday()))!.recipe =
    builders.scheduleRecipe({
      id: MOCK_IDS.RECIPE_LASAGNA,
      name,
      image: image === 'missing' ? '' : source,
      totalTime: 'PT25M',
      ingredients: ['Salmon', 'Green beans'],
    });
  await mockSseWithConnectedSchedule(page, schedule as unknown as ScheduleDays);
  await page.route(
    (url) => url.pathname.endsWith('/api/schedule'),
    async (route) => {
      if (route.request().method() === 'GET') await route.fulfill({ json: { data: schedule } });
      else await route.fallback();
    }
  );
  // Closed/unowned session is the ordinary settled fixture, without intervening notices.
  await page.route('**/api/discovery/session', (route) =>
    route.request().method() === 'GET'
      ? route.fulfill({
          json: {
            data: {
              incarnationId: MOCK_IDS.MEMBER_TEST,
              revision: 1,
              roundId: null,
              weekStartDate: null,
              phase: 'unowned',
              requiredSlots: null,
              coveredSlots: null,
              candidateCount: null,
              smartDefaults: null,
            },
          },
        })
      : route.fallback()
  );
  await page.goto('/home');
  const card = page.getByTestId('tonight-menu-card');
  await expect(card.getByRole('heading', { name, exact: true })).toBeVisible();
  await expect(page.getByTestId('voting-nudge-card')).toHaveCount(0);
  await expect(page.getByTestId('home-voting-status')).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  if (image === 'loaded')
    await expect
      .poll(() =>
        card.locator('img').evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)
      )
      .toBe(true);
  else await expect(card.locator('img')).toHaveCount(0);
}

async function measureAdaptiveTonight(page: Page) {
  return page.getByTestId('tonight-menu-card').evaluate((card) => {
    const rect = (el: Element) => {
      const r = el.getBoundingClientRect();
      return {
        top: r.top,
        bottom: r.bottom,
        left: r.left,
        right: r.right,
        width: r.width,
        height: r.height,
      };
    };
    const image = card.querySelector('img')!;
    const title = card.querySelector('h3')!;
    const shell = card.firstElementChild!;
    const css = getComputedStyle(shell);
    return {
      scrollY,
      photo: rect(image),
      card: rect(card),
      nav: rect(document.querySelector('nav')!),
      innerWidth: shell.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight),
      titleLines: Math.round(
        title.getBoundingClientRect().height / parseFloat(getComputedStyle(title).lineHeight)
      ),
      labels: ['quick-capture-trigger', 'home-browse-all-trigger'].map((id) => {
        const tile = document.querySelector(`[data-testid="${id}"]`)!;
        const label = tile.querySelector('span')!;
        const r = label.getBoundingClientRect();
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return {
          ...rect(label),
          text: label.textContent,
          hit: hit === label || label.contains(hit),
        };
      }),
    };
  });
}

test.describe('Home Command Center — Planned Recipe Flow', () => {
  test.beforeEach(async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);

    await setupCommonRoutes(page);

    // Hydrate store
    await page.goto('/onboarding');
    await page.evaluate((id) => {
      localStorage.setItem(
        'family-storage',
        JSON.stringify({
          state: {
            selectedFamilyMemberId: id,
            familyMembers: [{ id, name: 'Alex' }],
            _hasHydrated: true,
            hasLoaded: true,
          },
          version: 0,
        })
      );
    }, MOCK_IDS.MEMBER_ALEX);
  });

  test('Tonight pivot choices: saved non-Mystery context hands off to Planner without mutation', async ({
    page,
  }) => {
    const schedule = builders.scheduleDays();
    const day = schedule.days.find((day) => day.date === toDateStr(currentMonday()))!;
    day.status = 3;
    Object.assign(day, {
      nonCooking: { kind: 'eating_out', customLabel: 'Try Luigi’s' } satisfies NonCookingPlanDto,
    });
    await mockSseWithConnectedSchedule(page, schedule as unknown as ScheduleDays);
    await page.route(
      (url) => url.pathname.endsWith('/api/schedule'),
      async (route) => {
        if (route.request().method() === 'GET') await route.fulfill({ json: { data: schedule } });
        else await route.fallback();
      }
    );
    const mutations: string[] = [];
    page.on('request', (request) => {
      if (/\/api\/schedule/.test(request.url()) && request.method() !== 'GET')
        mutations.push(request.method());
    });
    await page.goto('/home');
    await expect(page.getByTestId('today-non-cooking-note')).toHaveText('Try Luigi’s');
    await expect(page.getByTestId('tonight-pivot-card')).not.toBeVisible();
    await page.getByTestId('today-non-cooking-plan').click();
    await expect(page).toHaveURL(/\/planner/);
    expect(mutations).toEqual([]);
  });

  test('Tonight direct actions: initial actions and keyboard disclosure do not mutate the plan', async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const schedule = builders.scheduleDays();
    const recipe = builders.scheduleRecipe({
      id: MOCK_IDS.RECIPE_LASAGNA,
      name: 'Direct garden supper',
      description: 'Garden vegetables',
      ingredients: ['Carrot'],
      image: '',
    });
    schedule.days.find((day) => day.date === toDateStr(currentMonday()))!.recipe = recipe;
    await mockSseWithConnectedSchedule(page, schedule as unknown as ScheduleDays);
    await page.route(
      (url) => url.pathname.endsWith('/api/schedule') && url.searchParams.get('weekOffset') === '0',
      async (route) => {
        if (route.request().method() === 'GET') await route.fulfill({ json: { data: schedule } });
        else await route.fallback();
      }
    );
    await page.route(
      (url) => url.pathname.endsWith(`/api/recipes/${MOCK_IDS.RECIPE_LASAGNA}`),
      async (route) => {
        await route.fulfill({
          json: {
            recipe: builders.recipe({
              id: MOCK_IDS.RECIPE_LASAGNA,
              name: recipe.name!,
              description: 'Garden vegetables',
              ingredients: ['Carrot'],
            }),
            updatedAt: new Date().toISOString(),
          },
        });
      }
    );
    const mutations: string[] = [];
    page.on('request', (request) => {
      if (/\/api\/schedule/.test(request.url()) && request.method() !== 'GET')
        mutations.push(request.method() + ' ' + request.url());
    });
    await page.goto('/home');
    const card = page.getByTestId('tonight-menu-card');
    await expect(card.getByRole('heading', { name: recipe.name! })).toBeVisible();
    await expect(page.getByTestId('cook-mode-btn')).toBeVisible();
    await expect(page.getByTestId('skip-tonight-btn')).toBeVisible();
    await card.getByRole('heading', { name: recipe.name! }).click();
    const toggle = page.getByTestId('tonight-ingredients-toggle');
    await expect(toggle).toHaveAccessibleName('View ingredients');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await page.getByTestId('cook-mode-btn').focus();
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('skip-tonight-btn')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(toggle).toBeFocused();
    expect(
      await toggle.evaluate((el) => parseFloat(getComputedStyle(el).outlineWidth))
    ).toBeGreaterThanOrEqual(2);
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(card.getByText('Carrot', { exact: true })).toBeVisible();
    await testInfo.attach('expanded-keyboard-reduced-motion', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
    await page.keyboard.press('Space');
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(card.getByText('Carrot', { exact: true })).toHaveCount(0);
    await page.keyboard.press('Tab');
    await expect(toggle).not.toBeFocused();
    expect(await card.locator(':focus').count()).toBe(0);
    await toggle.click();
    const replacement = builders.scheduleRecipe({
      id: MOCK_IDS.RECIPE_TACOS,
      name: 'Replacement supper',
      ingredients: ['Peas'],
    });
    await page.evaluate(
      (slot) => {
        (window as any).__sseSource.dispatchEvent(
          new MessageEvent('slot_updated', { data: JSON.stringify(slot) })
        );
      },
      { date: toDateStr(currentMonday()), recipe: replacement, status: 0 }
    );
    await expect(card.getByRole('heading', { name: 'Replacement supper' })).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(card.getByText('Carrot', { exact: true })).toHaveCount(0);
    await page.evaluate(
      (slot) => {
        (window as any).__sseSource.dispatchEvent(
          new MessageEvent('slot_updated', { data: JSON.stringify(slot) })
        );
      },
      { date: toDateStr(currentMonday()), recipe, status: 0 }
    );
    await expect(card.getByRole('heading', { name: recipe.name! })).toBeVisible();
    await page.getByTestId('skip-tonight-btn').click();
    await expect(page.getByTestId('recovery-action-order-in')).toBeVisible();
    expect(mutations).toEqual([]);
    await page.getByTestId('recovery-close').click();
    await expect(card.getByRole('heading', { name: recipe.name! })).toBeVisible();
    await page.getByTestId('cook-mode-btn').click();
    await expect(page.getByTestId('cooks-mode-step-next')).toBeVisible();
    await expect(page.getByTestId('cooks-mode-recipe-name')).toHaveText(recipe.name!);
    expect(mutations).toEqual([]);
  });

  for (const appLocale of ['en', 'fr'] as const) {
    test.describe(`adaptive planned Tonight (${appLocale})`, () => {
      test.use({ appLocale });
      test('long text, disclosure and viewport changes preserve photo and reachability', async ({
        page,
      }, testInfo) => {
        test.setTimeout(90_000);
        const name =
          appLocale === 'fr'
            ? 'Saumon rôti avec une généreuse portion de légumes du jardin et pommes de terre aux herbes pour toute la famille'
            : 'Roast salmon with a generous helping of garden vegetables and herb potatoes for the whole family';
        await prepareAdaptiveTonight(page, name);
        const card = page.getByTestId('tonight-menu-card');
        for (const [width, height] of [
          [390, 844],
          [412, 800],
          [320, 640],
          [820, 1180],
          [1180, 820],
        ]) {
          await page.setViewportSize({ width, height });
          for (const growth of [1, 2]) {
            const scaleText = () =>
              card.evaluate((node, scale) => {
                node.querySelectorAll<HTMLElement>('*').forEach((el) => {
                  el.dataset.layoutFont ??= getComputedStyle(el).fontSize;
                  el.style.fontSize = `${parseFloat(el.dataset.layoutFont) * scale}px`;
                });
              }, growth);
            await scaleText();
            for (const expanded of [false, true]) {
              if (expanded) {
                await page.getByTestId('tonight-ingredients-toggle').click();
                await scaleText();
                await expect(card.getByText('Green beans', { exact: true })).toBeVisible();
              }
              const geometry = await measureAdaptiveTonight(page);
              expect(geometry.photo.height).toBeGreaterThanOrEqual(160);
              expect(geometry.photo.width).toBeGreaterThan(geometry.photo.height);
              expect(geometry.card.width).toBeLessThanOrEqual(432);
              await expect(card.getByRole('heading', { name, exact: true })).toBeVisible();
              const label = `${width}-${height}-${growth}-${expanded}`;
              await testInfo.attach(`${label}-geometry`, {
                body: JSON.stringify(geometry),
                contentType: 'application/json',
              });
              await expectTonightLayout(page, card, testInfo, label);
              for (const id of ['quick-capture-trigger', 'home-browse-all-trigger']) {
                const tile = page.getByTestId(id);
                await tile.evaluate((el) => el.scrollIntoView({ block: 'center' }));
                const visible = await tile.evaluate((el) => {
                  const r = el.getBoundingClientRect();
                  const nav = document.querySelector('nav')!.getBoundingClientRect();
                  const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
                  return r.top >= 0 && r.bottom <= nav.top && (hit === el || el.contains(hit));
                });
                expect(visible).toBe(true);
              }
            }
            await page.getByTestId('tonight-ingredients-toggle').click();
            await expect(page.getByTestId('tonight-ingredients-toggle')).toHaveAttribute(
              'aria-expanded',
              'false'
            );
          }
        }
        // Same content and width: reducing viewport height makes the photo shallower, then floors it.
        await page.setViewportSize({ width: 412, height: 915 });
        const tall = await measureAdaptiveTonight(page);
        await page.setViewportSize({ width: 412, height: 640 });
        const short = await measureAdaptiveTonight(page);
        expect(short.photo.height).toBe(160);
        expect(short.photo.height).toBeLessThan(tall.photo.height);
      });
      for (const image of ['missing', 'failed']) {
        test(`${image} photo retains modest fallback`, async ({ page }, testInfo) => {
          await page.setViewportSize({ width: 320, height: 640 });
          await prepareAdaptiveTonight(
            page,
            appLocale === 'fr' ? 'Saumon rôti' : 'Roast salmon',
            image
          );
          const card = page.getByTestId('tonight-menu-card');
          const fallback = card
            .locator('[aria-hidden="true"]')
            .filter({ has: page.locator('svg') })
            .first();
          expect((await fallback.boundingBox())!.height).toBeLessThan(160);
          await expectTonightLayout(page, card, testInfo, `${image}-fallback`);
        });
      }
      for (const lines of [1, 2]) {
        test(`initial ${lines}-line title reveals both handoffs`, async ({ page }, testInfo) => {
          await page.setViewportSize({ width: 412, height: 915 });
          await page.emulateMedia({ reducedMotion: 'reduce' });
          const name =
            lines === 1
              ? appLocale === 'fr'
                ? 'Saumon rôti'
                : 'Roast salmon'
              : appLocale === 'fr'
                ? 'Saumon et légumes du jardin'
                : 'Salmon with garden vegetables';
          await prepareAdaptiveTonight(page, name);
          const card = page.getByTestId('tonight-menu-card');
          const geometry = await measureAdaptiveTonight(page);
          await writeFile(
            testInfo.outputPath('initial-geometry.json'),
            JSON.stringify(geometry, null, 2)
          );
          await testInfo.attach('initial-geometry', {
            body: JSON.stringify(geometry, null, 2),
            contentType: 'application/json',
          });
          await page.screenshot({
            path: testInfo.outputPath('initial-viewport.png'),
            animations: 'disabled',
          });
          expect(geometry.scrollY).toBe(0);
          expect(geometry.photo.height).toBeGreaterThanOrEqual(160);
          expect(geometry.photo.width).toBeGreaterThan(geometry.photo.height);
          expect(geometry.photo.width).toBeCloseTo(geometry.innerWidth, 0);
          expect(geometry.titleLines).toBe(lines);
          expect(geometry.card.top).toBeGreaterThanOrEqual(0);
          expect(geometry.card.bottom).toBeLessThanOrEqual(geometry.nav.top);
          for (const label of geometry.labels) {
            expect(label.top).toBeGreaterThanOrEqual(0);
            expect(label.bottom).toBeLessThanOrEqual(geometry.nav.top);
            expect(label.hit).toBe(true);
          }
          // Reachability checks scroll; initial geometry must precede them.
          await expectTonightLayout(page, card, testInfo, 'initial-controls');
        });
      }
    });
  }

  for (const appLocale of ['en', 'fr'] as const) {
    test.describe(`Cookbook planned (${appLocale})`, () => {
      test.use({ appLocale });
      for (const photo of ['light', 'dark', 'failed'] as const) {
        test(`${photo} photograph and image recovery`, async ({ page }, testInfo) => {
          test.setTimeout(90_000);
          await page.setViewportSize({ width: 390, height: 844 });
          const name =
            appLocale === 'fr' ? 'Saumon et légumes du jardin' : 'Salmon with garden vegetables';
          const source = `/api/recipes/${MOCK_IDS.RECIPE_LASAGNA}/hero`;
          await page.route(
            (url) => url.pathname.endsWith('/hero'),
            async (route) => {
              if (photo === 'failed' && !route.request().url().includes('renewed'))
                await route.fulfill({ status: 404, body: '' });
              else
                await route.fulfill({
                  path: `e2e/fixtures/cookbook-${photo === 'dark' ? 'dark' : 'light'}.jpg`,
                  contentType: 'image/jpeg',
                });
            }
          );
          const schedule = builders.scheduleDays();
          const recipe = builders.scheduleRecipe({
            id: MOCK_IDS.RECIPE_LASAGNA,
            name,
            image: source,
            totalTime: 'PT25M',
            ingredients: ['Salmon', 'Green beans'],
          });
          schedule.days.find((day) => day.date === toDateStr(currentMonday()))!.recipe = recipe;
          await mockSseWithConnectedSchedule(page, schedule as unknown as ScheduleDays);
          await page.route(
            (url) => url.pathname.endsWith('/api/schedule'),
            async (route) => {
              if (route.request().method() === 'GET')
                await route.fulfill({ json: { data: schedule } });
              else await route.fallback();
            }
          );
          await page.goto('/home');
          const card = page.getByTestId('tonight-menu-card');
          await expect(card.getByRole('heading', { name })).toBeVisible();
          if (photo === 'failed') {
            await expect(card.locator('img')).toHaveCount(0);
            await expect(page.getByTestId('cook-mode-btn')).toBeVisible();
            await page.screenshot({
              path: testInfo.outputPath('failed-image.png'),
              fullPage: true,
            });
            await page.evaluate(
              (slot) => {
                (window as any).__sseSource.dispatchEvent(
                  new MessageEvent('slot_updated', { data: JSON.stringify(slot) })
                );
              },
              {
                date: toDateStr(currentMonday()),
                recipe: builders.scheduleRecipe({
                  id: MOCK_IDS.RECIPE_TACOS,
                  name: 'Fresh supper',
                  image: `/api/recipes/${MOCK_IDS.RECIPE_TACOS}/hero?renewed`,
                }),
                status: 0,
              }
            );
            await expect(card.locator('img')).toBeVisible();
          } else {
            await expect
              .poll(() => card.locator('img').evaluate((img: HTMLImageElement) => img.naturalWidth))
              .toBeGreaterThan(100);
            for (const [width, height] of [
              [320, 844],
              [390, 844],
              [412, 915],
              [820, 1180],
              [1180, 820],
            ]) {
              await page.setViewportSize({ width, height });
              for (const growth of [1, 2]) {
                await card.evaluate(
                  (node, scale) =>
                    node.querySelectorAll<HTMLElement>('*').forEach((el) => {
                      el.dataset.layoutFont ??= getComputedStyle(el).fontSize;
                      el.style.fontSize = `${parseFloat(el.dataset.layoutFont) * scale}px`;
                    }),
                  growth
                );
                await expectTonightLayout(
                  page,
                  card,
                  testInfo,
                  `photo-${photo}-${width}-${growth}`
                );
              }
            }
          }
        });
      }
    });
  }

  for (const appLocale of ['en', 'fr'] as const) {
    test.describe(`duration units (${appLocale})`, () => {
      test.use({ appLocale });
      for (const [device, viewport] of [
        ['iPad', { width: 820, height: 1180 }],
        ['iPhone', { width: 390, height: 844 }],
        ['Pixel', { width: 412, height: 915 }],
      ] as const) {
        test(`preserves six hours on ${device}`, async ({ page }, testInfo) => {
          await page.setViewportSize(viewport);
          const recipe = builders.scheduleRecipe({
            id: MOCK_IDS.RECIPE_LASAGNA,
            name: 'Synthetic slow supper',
            image: '',
            totalTime: 'PT6H',
          });
          await mockSseWithSlotUpdate(page, {
            date: toDateStr(currentMonday()),
            recipe,
            status: 0,
          });
          await page.goto('/home');
          const card = page.getByTestId('tonight-menu-card');
          const badge = card.getByText(`${appLocale === 'fr' ? 'PRÊT EN' : 'READY IN'} 6H`, {
            exact: true,
          });
          await expect(badge).toBeVisible();
          await page.evaluate(() => document.fonts.ready);
          const bounds = await badge.boundingBox();
          expect(bounds).not.toBeNull();
          expect(bounds!.x).toBeGreaterThanOrEqual(0);
          expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
          await testInfo.attach(`${device}-${appLocale}-duration`, {
            body: await page.screenshot({ animations: 'disabled' }),
            contentType: 'image/png',
          });
        });
      }
    });
  }

  for (const appLocale of ['en', 'fr'] as const) {
    test.describe(`Tonight card layout (${appLocale})`, () => {
      test.use({ appLocale });
      for (const details of ['long', 'empty'] as const) {
        test(`planned ${details} front and details reflow and reachability`, async ({
          page,
        }, testInfo) => {
          test.setTimeout(90_000);
          const name =
            appLocale === 'fr'
              ? 'Gratin familial de légumes rôtis avec pommes de terre et sauce crémeuse aux fines herbes'
              : 'Family roasted vegetable supper with potatoes and a creamy garden herb sauce';
          await page.route(
            (url) => url.pathname.endsWith(`/api/recipes/${MOCK_IDS.RECIPE_LASAGNA}`),
            async (route) => {
              await route.fulfill({
                json: {
                  recipe: builders.recipe({
                    id: MOCK_IDS.RECIPE_LASAGNA,
                    name,
                    imageUrl: '',
                    description: details === 'long' ? name.repeat(3) : '',
                    ingredients: details === 'long' ? [name, name] : [],
                  }),
                  updatedAt: new Date().toISOString(),
                },
              });
            }
          );
          const schedule = builders.scheduleDays();
          schedule.days.find((day) => day.date === toDateStr(currentMonday()))!.recipe =
            builders.scheduleRecipe({
              id: MOCK_IDS.RECIPE_LASAGNA,
              name,
              image: '',
              totalTime: 'PT6H',
              description: details === 'long' ? name.repeat(3) : '',
              ingredients: details === 'long' ? [name, name] : [],
            });
          await mockSseWithConnectedSchedule(page, schedule as unknown as ScheduleDays);
          await page.route(
            (url) =>
              url.pathname.endsWith('/api/schedule') && url.searchParams.get('weekOffset') === '0',
            async (route) => {
              if (route.request().method() === 'GET')
                await route.fulfill({ json: { data: schedule } });
              else await route.fallback();
            }
          );
          await page.goto('/home');
          const card = page.getByTestId('tonight-menu-card');
          await expect(card).toBeVisible();
          await page.evaluate(() => document.fonts.ready);
          const sizes = [
            [320, 844],
            [390, 844],
            [412, 915],
            [820, 1180],
            [1180, 820],
          ];
          for (const [width, height] of sizes) {
            await page.setViewportSize({ width, height });
            for (const growth of [1, 2]) {
              // Change text only in this fixture; preserve app zoom policy and image geometry.
              await card.evaluate((node, scale) => {
                node.querySelectorAll<HTMLElement>('*').forEach((el) => {
                  const initial = el.dataset.layoutFont ?? getComputedStyle(el).fontSize;
                  el.dataset.layoutFont = initial;
                  el.style.fontSize = `${parseFloat(initial) * scale}px`;
                });
              }, growth);
              for (const face of ['front', 'details']) {
                if (face === 'details') {
                  await page.getByTestId('tonight-ingredients-toggle').click();
                  await card.evaluate((node, scale) => {
                    node.querySelectorAll<HTMLElement>('*').forEach((el) => {
                      const initial = el.dataset.layoutFont ?? getComputedStyle(el).fontSize;
                      el.dataset.layoutFont = initial;
                      el.style.fontSize = `${parseFloat(initial) * scale}px`;
                    });
                  }, growth);
                }
                await expectTonightLayout(page, card, testInfo, `card-${width}-${growth}-${face}`);
                if (width === 320 && growth === 1 && face === 'details')
                  await recordTonightControlStates(page, card, testInfo);
              }
              await page.getByTestId('tonight-ingredients-toggle').click(); // Collapse before the next case.
            }
          }
        });
      }
    });
  }

  test('Shows tonight menu card when recipe is planned', async ({ page }) => {
    const monday = currentMonday();
    const today = toDateStr(monday);
    const lasagnaRecipe = builders.scheduleRecipe({
      id: MOCK_IDS.RECIPE_LASAGNA,
      name: 'Test Lasagna',
      image: `/api/recipes/${MOCK_IDS.RECIPE_LASAGNA}/hero`,
    });

    // Override SSE to seed todayStore with the recipe deterministically.
    // Without this, the SSE `connected` (empty schedule) races against sync() (GET schedule)
    // and can reset todayStore.currentRecipe to null, hiding the menu card.
    await mockSseWithSlotUpdate(page, { date: today, recipe: lasagnaRecipe, status: 0 });

    // 1. Mock schedule with a planned recipe for today
    await page.route(
      (url) => url.pathname.includes('/api/schedule') && url.searchParams.get('weekOffset') === '0',
      async (route) => {
        if (route.request().method() === 'GET') {
          // Use builders to ensure contract compliance
          const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(monday);
            d.setUTCDate(monday.getUTCDate() + i);
            const dateStr = toDateStr(d);

            return {
              date: dateStr,
              status: 0,
              recipe: lasagnaRecipe,
            };
          });

          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: { ...builders.scheduleDays(), weekOffset: 0, days } }),
          });
        } else {
          await route.continue();
        }
      }
    );

    await page.goto('/home');

    // Wait for loader to disappear
    await expect(page.getByTestId('home-loader')).not.toBeVisible();

    // Verify Menu Card is shown
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Test Lasagna' }).first()).toBeVisible();
  });

  // SSE-16: slot_updated → TonightMenuCard appears without navigation or poll
  // The schedule REST endpoint returns an EMPTY schedule (no recipe for today) so the
  // store loads with no recipe. The SSE `slot_updated` push then assigns the recipe.
  // The card must appear from the SSE event — not from a poll or a second REST fetch.
  // Proof: the REST endpoint is a one-shot empty response; no subsequent GET is mocked
  // to return a recipe, so any TonightMenuCard that appears must come from SSE alone.
  test('SSE slot_updated for today → TonightMenuCard appears without navigation or poll', async ({
    page,
  }) => {
    const monday = currentMonday();
    const today = toDateStr(monday); // fixed test Monday: 2026-05-04

    const recipe = builders.scheduleRecipe({
      id: MOCK_IDS.RECIPE_LASAGNA,
      name: 'SSE Lasagna',
      image: `/api/recipes/${MOCK_IDS.RECIPE_LASAGNA}/hero`,
    });

    // Override the SSE stream to emit connected (empty schedule) + slot_updated for today.
    // Registered before setupCommonRoutes so LIFO gives this mock priority.
    await mockSseWithSlotUpdate(page, { date: today, recipe, status: 0 });

    // Return an empty schedule from REST — no recipe for today.
    // This means the loader clears (isLoading → false) but TonightPivotCard renders,
    // not TonightMenuCard. The SSE slot_updated then pushes the recipe, which must
    // flip the card to TonightMenuCard without any further REST fetch.
    await page.route(
      (url) => url.pathname === '/api/schedule',
      async (route) => {
        if (route.request().method() === 'GET') {
          const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(monday);
            d.setUTCDate(monday.getUTCDate() + i);
            return {
              day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
              date: toDateStr(d),
              recipe: null,
              status: 0,
            };
          });
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: { ...builders.scheduleDays(), weekOffset: 0, locked: false, status: 0, days },
            }),
          });
        } else {
          await route.continue();
        }
      }
    );

    await page.goto('/home');

    // Wait for the loader to clear — REST returned empty schedule, so isLoading → false.
    await expect(page.getByTestId('home-loader')).not.toBeVisible({ timeout: 5_000 });

    // At this point TonightPivotCard is visible (no recipe from REST).
    // The SSE slot_updated event fires and applyServerUpdate sets currentRecipe.
    // TonightMenuCard must appear — driven by SSE, not by a poll or second REST fetch.
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('heading', { name: 'SSE Lasagna' }).first()).toBeVisible();
  });

  // B5: "Order In" with no recipe writes status:3 to backend and hides pivot card
  test('Tonight pivot choices: Order In with no recipe writes status:3 and hides pivot card', async ({
    page,
  }) => {
    // Empty schedule — no recipe for today
    await page.route(
      (url) => url.pathname.includes('/api/schedule'),
      async (route) => {
        const reqUrl = new URL(route.request().url());
        if (reqUrl.searchParams.get('weekOffset') === '0' && route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: { ...builders.scheduleDays(), weekOffset: 0, days: [] } }),
          });
        } else {
          await route.continue();
        }
      }
    );

    // Capture validate call
    let validateBody: unknown = null;
    await page.route(
      (url) => url.pathname.includes('/api/schedule/day/') && url.pathname.endsWith('/validate'),
      async (route) => {
        validateBody = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
    );

    await page.goto('/home');

    // Pivot card is visible with no recipe
    await expect(page.getByTestId('tonight-pivot-card')).toBeVisible();

    // Tap "Order In"
    await page.getByTestId('order-in-btn').click();

    // Backend write must have fired with status: 3
    await expect.poll(() => validateBody).toEqual({ status: 3 });

    // Pivot card must disappear for the session
    await expect(page.getByTestId('tonight-pivot-card')).not.toBeVisible({ timeout: 3000 });
  });

  // B6: "Order In" with a recipe opens SkipRecoveryDialog before any state change
  test('"Order In" with recipe opens SkipRecoveryDialog before committing', async ({ page }) => {
    // Schedule with a planned recipe for today
    const monday = currentMonday();
    const today = toDateStr(monday);
    const lasagnaRecipe = builders.scheduleRecipe({
      id: MOCK_IDS.RECIPE_LASAGNA,
      name: 'Test Lasagna',
    });
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setUTCDate(monday.getUTCDate() + i);
      const dateStr = toDateStr(d);
      return {
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
        date: dateStr,
        status: 0,
        recipe: dateStr === today ? lasagnaRecipe : null,
      };
    });

    // Override SSE to send the recipe for today so todayStore.currentRecipe is set
    // deterministically — avoids a race between SSE (empty schedule) and sync() (GET schedule).
    await mockSseWithSlotUpdate(page, { date: today, recipe: lasagnaRecipe, status: 0 });

    await page.route(
      (url) => url.pathname.includes('/api/schedule'),
      async (route) => {
        const reqUrl = new URL(route.request().url());
        if (reqUrl.searchParams.get('weekOffset') === '0' && route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: { ...builders.scheduleDays(), weekOffset: 0, days } }),
          });
        } else {
          await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
        }
      }
    );

    // Ensure validate is NOT called before dialog confirmation
    let validateCalled = false;
    await page.route(
      (url) => url.pathname.includes('/api/schedule/day/') && url.pathname.endsWith('/validate'),
      async (route) => {
        validateCalled = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
    );

    await page.goto('/home');

    // Wait for loader to clear and menu card to appear (recipe is planned)
    await expect(page.getByTestId('home-loader')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible();

    await expect(page.getByTestId('skip-tonight-btn')).toBeVisible();
    await page.getByTestId('skip-tonight-btn').click();

    // Recovery dialog must open
    await expect(page.getByTestId('recovery-dialog-title')).toBeVisible();

    // No backend write yet
    expect(validateCalled).toBe(false);
  });

  test('"Pick Something Else" flow opens Quick Find then Step 2', async ({ page }) => {
    const monday = currentMonday();
    const today = toDateStr(monday);
    const lasagnaRecipe = builders.scheduleRecipe({
      id: MOCK_IDS.RECIPE_LASAGNA,
      name: 'Test Lasagna',
      image: `/api/recipes/${MOCK_IDS.RECIPE_LASAGNA}/hero`,
    });

    let moveCalled = false;
    let moveRecipeId: string | null = null;
    let assignCalled = false;

    await mockSseWithSlotUpdate(page, { date: today, recipe: lasagnaRecipe, status: 0 });

    // Mock schedule with a planned recipe for today
    await page.route(
      (url) => url.pathname.includes('/api/schedule'),
      async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        const method = request.method();

        if (url.pathname.endsWith('/fill-the-gap')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: [
                builders.scheduleRecipe({
                  id: MOCK_IDS.RECIPE_CHICKEN,
                  name: 'Test Chicken',
                  image: '/chicken.jpg',
                }),
              ],
            }),
          });
        } else if (url.pathname.endsWith('/move') && method === 'POST') {
          moveCalled = true;
          const body = request.postDataJSON();
          moveRecipeId = body?.recipeId ?? null;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: { message: 'Recipe moved', moved: true, refreshComplete: true },
            }),
          });
        } else if (url.pathname.endsWith('/assign') && method === 'POST') {
          assignCalled = true;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true }),
          });
        } else if (url.pathname.endsWith('/api/schedule') && method === 'GET') {
          const monday = currentMonday();
          const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(monday);
            d.setUTCDate(monday.getUTCDate() + i);
            const dateStr = toDateStr(d);
            return {
              date: dateStr,
              status: 0,
              recipe: dateStr === today ? lasagnaRecipe : null,
            };
          });
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: { ...builders.scheduleDays(), weekOffset: 0, days } }),
          });
        } else {
          await route.continue();
        }
      }
    );

    await page.goto('/home');
    await expect(page.getByTestId('home-loader')).not.toBeVisible();
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible();

    await expect(page.getByTestId('skip-tonight-btn')).toBeVisible();
    await page.getByTestId('skip-tonight-btn').click();

    // Click "Pick Something Else"
    await page.getByTestId('recovery-action-pick-else').click();

    // Dialog should close, Quick Find should open
    await expect(page.getByTestId('recovery-dialog-title')).not.toBeVisible();
    await expect(page.getByTestId('quick-find-modal')).toBeVisible();

    // Select the recipe
    await page.getByTestId('quick-find-select').click();

    // Quick Find should close, Recovery Dialog should re-open at Step 2
    await expect(page.getByTestId('quick-find-modal')).not.toBeVisible();
    await expect(page.getByTestId('recovery-dialog-title')).toBeVisible();
    await expect(page.getByText("What about tonight's recipe?")).toBeVisible();

    // Click "Move to Tomorrow"
    await page.getByTestId('recovery-action-tomorrow').click();

    // Verify both APIs called and move sent the correct recipeId (regression: BS-10)
    await expect.poll(() => moveCalled).toBe(true);
    await expect.poll(() => assignCalled).toBe(true);
    expect(moveRecipeId).toBe(MOCK_IDS.RECIPE_LASAGNA);

    // Dialog should be closed
    await expect(page.getByTestId('recovery-dialog-title')).not.toBeVisible();
  });

  test('"Order In → Move to Tomorrow" sends recipeId and closes dialog', async ({ page }) => {
    const monday = currentMonday();
    const today = toDateStr(monday);
    const lasagnaRecipe = builders.scheduleRecipe({
      id: MOCK_IDS.RECIPE_LASAGNA,
      name: 'Test Lasagna',
      image: `/api/recipes/${MOCK_IDS.RECIPE_LASAGNA}/hero`,
    });

    let moveCalled = false;
    let moveRecipeId: string | null = null;

    await mockSseWithSlotUpdate(page, { date: today, recipe: lasagnaRecipe, status: 0 });

    await page.route(
      (url) => url.pathname.includes('/api/schedule'),
      async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        const method = request.method();

        if (url.pathname.endsWith('/move') && method === 'POST') {
          moveCalled = true;
          const body = request.postDataJSON();
          moveRecipeId = body?.recipeId ?? null;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: { message: 'Recipe moved', moved: true, refreshComplete: true },
            }),
          });
        } else if (url.pathname.endsWith('/api/schedule') && method === 'GET') {
          const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(monday);
            d.setUTCDate(monday.getUTCDate() + i);
            const dateStr = toDateStr(d);
            return { date: dateStr, status: 0, recipe: dateStr === today ? lasagnaRecipe : null };
          });
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: { ...builders.scheduleDays(), weekOffset: 0, days } }),
          });
        } else {
          await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
        }
      }
    );

    await page.goto('/home');
    await expect(page.getByTestId('home-loader')).not.toBeVisible();
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible();

    await expect(page.getByTestId('skip-tonight-btn')).toBeVisible();
    await page.getByTestId('skip-tonight-btn').click();

    await expect(page.getByTestId('recovery-dialog-title')).toBeVisible();

    // Click "Order In" → step 2
    await page.getByTestId('recovery-action-order-in').click();
    await expect(page.getByText("What about tonight's recipe?")).toBeVisible();

    // Click "Move to Tomorrow"
    await page.getByTestId('recovery-action-tomorrow').click();

    // Move must be called with the original recipe's ID (regression: BS-10)
    await expect.poll(() => moveCalled).toBe(true);
    expect(moveRecipeId).toBe(MOCK_IDS.RECIPE_LASAGNA);

    // Dialog must be closed
    await expect(page.getByTestId('recovery-dialog-title')).not.toBeVisible();
  });

  test('"Order In → Drop Tonight" marks tonight ordered in and navigates to planner', async ({
    page,
  }) => {
    const monday = currentMonday();
    const today = toDateStr(monday);
    const lasagnaRecipe = builders.scheduleRecipe({
      id: MOCK_IDS.RECIPE_LASAGNA,
      name: 'Test Lasagna',
      image: `/api/recipes/${MOCK_IDS.RECIPE_LASAGNA}/hero`,
    });

    let validateCalled = false;

    // The EventSource mock reconnects after every fulfilled response. Replay the
    // current server state so a stale planned-slot event cannot overwrite the
    // completed order-in validation while the planner initializes.
    await page.route(/\/(?:backend\/)?api\/stream/, async (route) => {
      const isOrderedIn = validateCalled;
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setUTCDate(monday.getUTCDate() + i);
        const dateStr = toDateStr(d);
        return {
          day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
          date: dateStr,
          status: dateStr === today && isOrderedIn ? 3 : 0,
          recipe: dateStr === today && !isOrderedIn ? lasagnaRecipe : null,
        };
      });
      const schedule = {
        ...builders.scheduleDays(),
        weekOffset: 0,
        locked: false,
        status: 0,
        days,
      };
      const slotUpdate = {
        type: 'slot_updated',
        date: today,
        recipe: isOrderedIn ? null : lasagnaRecipe,
        status: isOrderedIn ? 3 : 0,
      };

      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        headers: { 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
        body: `event: connected\ndata: ${JSON.stringify({ type: 'connected', schedule })}\n\nevent: slot_updated\ndata: ${JSON.stringify(slotUpdate)}\n\n`,
      });
    });

    await page.route(
      (url) => url.pathname.includes('/api/schedule'),
      async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        const method = request.method();

        if (url.pathname.endsWith('/fill-the-gap')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: [
                builders.scheduleRecipe({
                  id: MOCK_IDS.RECIPE_CHICKEN,
                  name: 'Test Chicken',
                  image: '/chicken.jpg',
                }),
              ],
            }),
          });
        } else if (
          url.pathname.includes('/day/') &&
          url.pathname.endsWith('/validate') &&
          method === 'POST'
        ) {
          validateCalled = true;
          await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
        } else if (url.pathname.endsWith('/api/schedule') && method === 'GET') {
          const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(monday);
            d.setUTCDate(monday.getUTCDate() + i);
            const dateStr = toDateStr(d);
            return {
              date: dateStr,
              status: dateStr === today && validateCalled ? 3 : 0,
              recipe: dateStr === today && !validateCalled ? lasagnaRecipe : null,
            };
          });
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: { ...builders.scheduleDays(), weekOffset: 0, days } }),
          });
        } else {
          await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
        }
      }
    );

    await page.goto('/home');
    await expect(page.getByTestId('home-loader')).not.toBeVisible();
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible();

    await expect(page.getByTestId('skip-tonight-btn')).toBeVisible();
    await page.getByTestId('skip-tonight-btn').click();

    await expect(page.getByTestId('recovery-dialog-title')).toBeVisible();

    // Click "Order In" → step 2
    await page.getByTestId('recovery-action-order-in').click();
    await expect(page.getByText("What about tonight's recipe?")).toBeVisible();

    // Click "Just Drop Tonight"
    await page.getByText('Just Drop Tonight').click();

    // Ordered-in validation must be called
    await expect.poll(() => validateCalled).toBe(true);

    // Dialog must be closed
    await expect(page.getByTestId('recovery-dialog-title')).not.toBeVisible();

    // Flow exits to planner with tonight marked ordered in
    await expect(page).toHaveURL(/\/planner/);
    const tonightCard = page.locator(`[data-date="${today}"]`);
    await expect(tonightCard).toBeVisible({ timeout: 10_000 });
    await expect(tonightCard.getByTestId('ordered-in-indicator')).toBeVisible();
  });

  test('Closing Quick Find after "Pick Something Else" exits without changing tonight', async ({
    page,
  }) => {
    const monday = currentMonday();
    const today = toDateStr(monday);

    const lasagnaRecipe = builders.scheduleRecipe({
      id: MOCK_IDS.RECIPE_LASAGNA,
      name: 'Test Lasagna',
      image: `/api/recipes/${MOCK_IDS.RECIPE_LASAGNA}/hero`,
    });

    let moveCalled = false;
    let assignCalled = false;

    await mockSseWithSlotUpdate(page, { date: today, recipe: lasagnaRecipe, status: 0 });

    await page.route(
      (url) => url.pathname.includes('/api/schedule'),
      async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        const method = request.method();

        if (url.pathname.endsWith('/fill-the-gap')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: [
                builders.scheduleRecipe({
                  id: MOCK_IDS.RECIPE_CHICKEN,
                  name: 'Test Chicken',
                  image: '/chicken.jpg',
                }),
              ],
            }),
          });
        } else if (url.pathname.endsWith('/move') && method === 'POST') {
          moveCalled = true;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: { message: 'Recipe moved', moved: true, refreshComplete: true },
            }),
          });
        } else if (url.pathname.endsWith('/assign') && method === 'POST') {
          assignCalled = true;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true }),
          });
        } else if (url.pathname.endsWith('/api/schedule') && method === 'GET') {
          const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(monday);
            d.setUTCDate(monday.getUTCDate() + i);
            const dateStr = toDateStr(d);
            return {
              date: dateStr,
              status: 0,
              recipe: dateStr === today ? lasagnaRecipe : null,
            };
          });
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: { ...builders.scheduleDays(), weekOffset: 0, days } }),
          });
        } else {
          await route.continue();
        }
      }
    );

    await page.goto('/home');
    await expect(page.getByTestId('home-loader')).not.toBeVisible();
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Test Lasagna' }).first()).toBeVisible();

    await expect(page.getByTestId('skip-tonight-btn')).toBeVisible();
    await page.getByTestId('skip-tonight-btn').click();

    await page.getByTestId('recovery-action-pick-else').click();

    await expect(page.getByTestId('recovery-dialog-title')).not.toBeVisible();
    await expect(page.getByTestId('quick-find-modal')).toBeVisible();

    await page.getByTestId('quick-find-close').click();

    await expect(page.getByTestId('quick-find-modal')).not.toBeVisible();
    await expect(page.getByTestId('recovery-dialog-title')).not.toBeVisible();
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Test Lasagna' }).first()).toBeVisible();
    expect(moveCalled).toBe(false);
    expect(assignCalled).toBe(false);
  });

  // B5 + reload: page reload after "Order In" (no recipe) does not show pivot card
  test('Page reload after "Order In" (no recipe) does not show pivot card', async ({ page }) => {
    const monday = currentMonday();
    const today = toDateStr(monday);

    // Track whether "Order In" has been tapped so we can switch the schedule response
    let orderInDone = false;

    await page.route(
      (url) => url.pathname.includes('/api/schedule'),
      async (route) => {
        const reqUrl = new URL(route.request().url());
        if (reqUrl.searchParams.get('weekOffset') === '0' && route.request().method() === 'GET') {
          if (!orderInDone) {
            // Before "Order In": empty schedule
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                data: { ...builders.scheduleDays(), weekOffset: 0, days: [] },
              }),
            });
          } else {
            // After "Order In": return status:3 for today (simulates server state after write)
            const days = Array.from({ length: 7 }, (_, i) => {
              const d = new Date(monday);
              d.setUTCDate(monday.getUTCDate() + i);
              const dateStr = toDateStr(d);
              return { date: dateStr, status: dateStr === today ? 3 : 0, recipe: null };
            });
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({ data: { ...builders.scheduleDays(), weekOffset: 0, days } }),
            });
          }
        } else {
          await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
        }
      }
    );

    await page.route(
      (url) => url.pathname.includes('/api/schedule/day/') && url.pathname.endsWith('/validate'),
      async (route) => {
        orderInDone = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
    );

    await page.goto('/home');

    // Wait for loader to clear, then pivot card should be visible (empty schedule, no recipe)
    await expect(page.getByTestId('home-loader')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('tonight-pivot-card')).toBeVisible();

    // Tap "Order In" with no recipe
    await page.getByTestId('order-in-btn').click();
    await expect(page.getByTestId('tonight-pivot-card')).not.toBeVisible({ timeout: 3000 });

    // Override the SSE route to send status:3 for today before reload.
    // Without this, the SSE `connected` event fires with status:0 on reconnect,
    // racing against the schedule GET (which returns status:3) and potentially
    // resetting todayStore.status back to 0 — causing the pivot card to reappear.
    await page.route(/\/(?:backend\/)?api\/stream/, async (route) => {
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setUTCDate(monday.getUTCDate() + i);
        const dateStr = toDateStr(d);
        return {
          day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
          date: dateStr,
          recipe: null,
          status: dateStr === today ? 3 : 0,
        };
      });
      const body = `event: connected\ndata: ${JSON.stringify({ type: 'connected', schedule: { ...builders.scheduleDays(), weekOffset: 0, locked: false, status: 0, days } })}\n\n`;
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        headers: {
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
        body,
      });
    });

    // Reload — server now returns status:3 for today
    await page.reload();
    await expect(page.getByTestId('home-loader')).not.toBeVisible({ timeout: 5000 });

    // Pivot card must NOT reappear after reload
    await expect(page.getByTestId('tonight-pivot-card')).not.toBeVisible();
  });

  test('Quick Find from pivot card shows TonightMenuCard immediately and calls assign API', async ({
    page,
  }) => {
    // Override fill-the-gap to return one recipe
    await page.route(
      (url) => url.pathname.includes('/api/schedule/fill-the-gap'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [{ id: MOCK_IDS.RECIPE_LASAGNA, name: 'Test Lasagna', image: '' }],
          }),
        });
      }
    );

    // 2. Track assign call
    let assignCalled = false;
    await page.route(
      (url) => url.pathname.includes('/api/schedule/assign'),
      async (route) => {
        assignCalled = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
    );

    // 3. Mock recipe detail fetch (triggered by eager hydration)
    let recipeFetched = false;
    await page.route(
      (url) => url.pathname.endsWith(`/api/recipes/${MOCK_IDS.RECIPE_LASAGNA}`),
      async (route) => {
        if (route.request().method() !== 'GET') {
          return route.continue();
        }
        recipeFetched = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            updatedAt: new Date().toISOString(),
            recipe: builders.recipe({
              id: MOCK_IDS.RECIPE_LASAGNA,
              name: 'Test Lasagna',
              description: 'Quick Hydrated Description',
              ingredients: ['Pasta'],
            }),
          }),
        });
      }
    );

    await page.goto('/home');
    await expect(page.getByTestId('tonight-pivot-card')).toBeVisible({ timeout: 5000 });

    // Click Quick Find (discover-btn)
    await page.getByTestId('discover-btn').click();

    // Wait for quick-find-modal
    await expect(page.getByTestId('quick-find-modal')).toBeVisible({ timeout: 3000 });

    // Click the first recipe (quick-find-select)
    await page.getByTestId('quick-find-select').first().click();

    // TonightMenuCard must appear immediately (optimistic — within 300ms)
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible({ timeout: 300 });

    // Assign API must have been called
    await expect.poll(() => assignCalled).toBe(true);

    // Verify hydration through explicit inline disclosure
    await page.getByTestId('tonight-ingredients-toggle').click();
    await expect(page.getByText('Quick Hydrated Description')).toBeVisible({ timeout: 5000 });
    expect(recipeFetched).toBe(true);
  });

  test('Completing Cook Mode marks meal as cooked', async ({ page }) => {
    const monday = currentMonday();
    const today = toDateStr(monday);
    const lasagnaRecipe = builders.scheduleRecipe({
      id: MOCK_IDS.RECIPE_LASAGNA,
      name: 'Test Lasagna',
    });

    let todayStatus = 0;
    let validateCalled = false;
    let cookedReconnects = 0;
    const schedule = () => ({
      ...builders.scheduleDays(),
      weekOffset: 0,
      days: Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setUTCDate(monday.getUTCDate() + i);
        return {
          date: toDateStr(d),
          status: i === 0 ? todayStatus : 0,
          recipe: lasagnaRecipe,
        };
      }),
    });

    // REST and every SSE reconnect read the same persisted mock state. Replaying
    // status 0 after accepting validation would incorrectly undo the cooked UI.
    await page.route(/\/(?:backend\/)?api\/stream/, async (route) => {
      const snapshot = schedule();
      if (todayStatus === 2) cookedReconnects += 1;
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        headers: { 'Cache-Control': 'no-cache' },
        body: `event: connected\ndata: ${JSON.stringify({ type: 'connected', schedule: snapshot })}\n\n`,
      });
    });
    await page.route(
      (url) => url.pathname.endsWith('/api/schedule'),
      async (route) => {
        if (route.request().method() !== 'GET') return route.fallback();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: schedule() }),
        });
      }
    );
    await page.route(
      (url) => url.pathname.endsWith(`/api/schedule/day/${today}/validate`),
      async (route) => {
        if (route.request().method() !== 'POST') return route.fallback();
        expect(route.request().postDataJSON()).toEqual({
          status: 2,
          recipeId: MOCK_IDS.RECIPE_LASAGNA,
        });
        todayStatus = 2;
        validateCalled = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { message: 'Day validated', mealMarkedCooked: true } }),
        });
      }
    );

    await page.goto('/home');
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('cook-mode-btn').click();

    // Step through Cook's Mode
    const nextBtn = page.getByTestId('cooks-mode-step-next');
    await expect(nextBtn).toBeVisible({ timeout: 15_000 });

    // Stop at completion so it is clicked exactly once.
    for (let i = 0; i < 5; i++) {
      if ((await nextBtn.getAttribute('aria-label')) === 'Mark recipe as cooked') break;
      await nextBtn.click();
    }

    await expect(nextBtn).toHaveText('Cooked');
    await expect(nextBtn).toHaveAccessibleName('Mark recipe as cooked');
    await nextBtn.click();

    // Verify implicit cooked call
    await expect.poll(() => validateCalled).toBe(true);

    // Verify both optimistic completion and persistence across an SSE reconnect.
    await expect(page.getByTestId('cooked-success-card')).toBeVisible();
    await expect.poll(() => cookedReconnects, { timeout: 10_000 }).toBeGreaterThan(0);
    await expect(page.getByTestId('cooked-success-card')).toBeVisible();
    await page.reload();
    await expect(page.getByTestId('cooked-success-card')).toBeVisible();
    await expect(page.getByTestId('cooked-success-title')).toHaveText('Enjoy your meal!');
    await expect(page.getByTestId('cooked-success-card')).toContainText('Recipe marked as cooked');
    await page.getByTestId('cooked-success-dismiss').click();
    await expect(page.getByTestId('cooked-success-card')).toHaveCount(0);
    await expect(page).toHaveURL(/\/home$/);
  });
});

// ── Group C: todayStore integration ──────────────────────────────────────────

test.describe('Home Command Center — Planner → todayStore propagation (Group C)', () => {
  test.beforeEach(async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);

    await setupCommonRoutes(page);

    // Hydrate store
    await page.goto('/onboarding');
    await page.evaluate((id) => {
      localStorage.setItem(
        'family-storage',
        JSON.stringify({
          state: {
            selectedFamilyMemberId: id,
            familyMembers: [{ id, name: 'Alex' }],
            _hasHydrated: true,
            hasLoaded: true,
          },
          version: 0,
        })
      );
    }, MOCK_IDS.MEMBER_ALEX);
  });

  // C7: Page reload after "Order In" does not show pivot card (already covered in B5 reload test above)
  // This test confirms the same behaviour holds after the todayStore refactor.
  test('Page reload after "Order In" (no recipe) does not show pivot card — post-todayStore refactor', async ({
    page,
  }) => {
    const monday = currentMonday();
    const today = toDateStr(monday);
    let orderInDone = false;

    await page.route(
      (url) => url.pathname.includes('/api/schedule'),
      async (route) => {
        const reqUrl = new URL(route.request().url());
        if (reqUrl.searchParams.get('weekOffset') === '0' && route.request().method() === 'GET') {
          if (!orderInDone) {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                data: { ...builders.scheduleDays(), weekOffset: 0, days: [] },
              }),
            });
          } else {
            const days = Array.from({ length: 7 }, (_, i) => {
              const d = new Date(monday);
              d.setUTCDate(monday.getUTCDate() + i);
              const dateStr = toDateStr(d);
              return { date: dateStr, status: dateStr === today ? 3 : 0, recipe: null };
            });
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({ data: { ...builders.scheduleDays(), weekOffset: 0, days } }),
            });
          }
        } else {
          await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
        }
      }
    );

    await page.route(
      (url) => url.pathname.includes('/api/schedule/day/') && url.pathname.endsWith('/validate'),
      async (route) => {
        orderInDone = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
    );

    await page.goto('/home');
    await expect(page.getByTestId('home-loader')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('tonight-pivot-card')).toBeVisible();

    await page.getByTestId('order-in-btn').click();
    await expect(page.getByTestId('tonight-pivot-card')).not.toBeVisible({ timeout: 3000 });

    // Override the SSE route to send status:3 for today before reload.
    // Without this, the SSE `connected` event races against the GET schedule response,
    // and the status:0 from SSE can reset todayStore, causing the pivot card to reappear.
    await page.route(/\/(?:backend\/)?api\/stream/, async (route) => {
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setUTCDate(monday.getUTCDate() + i);
        const dateStr = toDateStr(d);
        return {
          day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
          date: dateStr,
          recipe: null,
          status: dateStr === today ? 3 : 0,
        };
      });
      const body = `event: connected\ndata: ${JSON.stringify({ type: 'connected', schedule: { ...builders.scheduleDays(), weekOffset: 0, locked: false, status: 0, days } })}\n\n`;
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        headers: {
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
        body,
      });
    });

    // Reload — server returns status:3 for today
    await page.reload();
    await expect(page.getByTestId('home-loader')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('tonight-pivot-card')).not.toBeVisible();
  });
});

// Home's shared-session handoff uses the existing Home CI suite.
test.describe('Home active voting handoff', () => {
  const round = (week = '2026-05-04', phase = 'collecting', revision = 1) => ({
    incarnationId: MOCK_IDS.MEMBER_TEST,
    revision,
    roundId: MOCK_IDS.VOTING_ROUND,
    weekStartDate: week,
    phase,
    requiredSlots: 3,
    coveredSlots: phase === 'converged' ? 3 : 1,
    candidateCount: 3,
    smartDefaults: {
      familySize: 2,
      consensusThreshold: 2,
      consensusRecipesCount: 3,
      weekOffset: 0,
      weekStartDate: week,
      preSelectedRecipes: [],
      openSlots: [{ dayIndex: 4 }, { dayIndex: 5 }, { dayIndex: 6 }],
    },
  });

  async function prepare(page: Page) {
    await page.context().addCookies([
      {
        name: 'x-family-member-id',
        value: MOCK_IDS.MEMBER_ALEX,
        url: process.env.BASE_URL || 'http://127.0.0.1:3000',
      },
    ]);
    await setupCommonRoutes(page);
    // Keep the real layout stream and store, with network delivery at the mock boundary.
    await mockSseWithConnectedSchedule(page, builders.scheduleDays(0) as unknown as ScheduleDays);
    await page.addInitScript((id) => {
      localStorage.setItem(
        'family-storage',
        JSON.stringify({
          state: {
            selectedFamilyMemberId: id,
            familyMembers: [{ id, name: 'Alex' }],
            _hasHydrated: true,
            hasLoaded: true,
          },
          version: 0,
        })
      );
    }, MOCK_IDS.MEMBER_ALEX);
  }

  async function emit(page: Page, snapshot: ReturnType<typeof round>) {
    await expect.poll(() => page.evaluate(() => !!(window as any).__sseSource)).toBe(true);
    await page.evaluate((session) => {
      (window as any).__sseSource.dispatchEvent(
        new MessageEvent('voting_session_updated', { data: JSON.stringify({ session }) })
      );
    }, snapshot);
  }

  for (const week of ['2026-05-04', '2026-05-11', '2026-06-01']) {
    test(`Home joins collecting round ${week} independently of Planner selection`, async ({
      page,
    }) => {
      await prepare(page);
      await page.route('**/api/discovery/session', (route) =>
        route.fulfill({ json: { data: round(week) } })
      );
      await page.goto('/home');
      await expect(page.getByRole('button', { name: 'Vote Now', exact: true })).toBeVisible();
      await expect(page.getByTestId('voting-nudge-dismiss')).toHaveCount(0);
      await expect(page.getByTestId('quick-capture-trigger')).toBeVisible();
      await expect(page.getByTestId('home-browse-all-trigger')).toBeVisible();
      await page.getByRole('button', { name: 'Vote Now', exact: true }).click();
      await expect(page).toHaveURL(/\/discovery$/);
    });
  }

  for (const target of [
    { name: 'iPad', width: 820, height: 1180 },
    { name: 'iPhone', width: 390, height: 844 },
    { name: 'Pixel', width: 412, height: 915 },
  ]) {
    test(`Home matches handoff preserves absolute week and Planner tab on ${target.name}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(target);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await prepare(page);
      const current = round('2026-06-01', 'converged');
      await page.route('**/api/discovery/session', (route) =>
        route.fulfill({ json: { data: current } })
      );
      await page.goto('/home');
      await expect(page.getByTestId('home-see-matches')).toBeVisible();
      await page.getByRole('link', { name: 'Planner', exact: true }).click();
      await page.getByTestId('next-week').click();
      await page.getByTestId('grocery-tab').click();
      // Mobile groceries cover shell links. Browser Back preserves the in-memory tab.
      await page.goBack();
      await expect(page.getByText("Menu's In", { exact: true })).toBeVisible();
      await expect(
        page.getByText('Your matches are ready to review and save.', { exact: true })
      ).toBeVisible();
      await expect(page.getByTestId('home-see-matches')).toBeEnabled();
      await page.getByTestId('voting-nudge-card').scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      );
      await page.screenshot({
        path: `/tmp/wfs-home-${target.name}.png`,
        fullPage: true,
        style: 'nextjs-portal { visibility: hidden; }',
      });
      await testInfo.attach(`Home ${target.name}`, {
        path: `/tmp/wfs-home-${target.name}.png`,
        contentType: 'image/png',
      });
      // Browser week rollover must not reinterpret the round's absolute Monday.
      await page.clock.setFixedTime(new Date('2026-06-08T12:00:00Z'));
      const mutations: string[] = [];
      const reads: string[] = [];
      page.on('request', (request) => {
        if (
          request.url().includes('/api/') &&
          !['GET', 'HEAD', 'OPTIONS'].includes(request.method())
        )
          mutations.push(request.url());
        if (new URL(request.url()).pathname === '/api/schedule') reads.push(request.url());
      });
      await page.getByTestId('home-see-matches').focus();
      await expect(page.getByTestId('home-see-matches')).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/\/planner\?weekOffset=0&referenceWeekStartDate=2026-06-01$/);
      await expect(page.getByTestId('planner-tab')).toHaveClass(/bg-white/);
      await expect
        .poll(() =>
          reads.some(
            (url) => new URL(url).searchParams.get('referenceWeekStartDate') === '2026-06-01'
          )
        )
        .toBe(true);
      expect(mutations).toEqual([]);
    });
  }

  test('Home reconciles live convergence, stale frames, close, reopen and resume', async ({
    page,
  }) => {
    await prepare(page);
    let current = round();
    await page.route('**/api/discovery/session', (route) =>
      route.fulfill({ json: { data: current } })
    );
    await page.goto('/home');
    await expect(page.getByTestId('voting-nudge-vote-now')).toBeVisible();
    current = round('2026-05-04', 'converged', 3);
    await emit(page, current);
    await expect(page.getByTestId('home-see-matches')).toBeVisible();
    await emit(page, round('2026-05-04', 'collecting', 2));
    await expect(page.getByTestId('home-see-matches')).toBeVisible();
    current = round('2026-05-04', 'unowned', 4);
    await emit(page, current);
    await expect(page.getByTestId('voting-nudge-card')).toHaveCount(0);
    current = { ...round('2026-05-11', 'collecting', 5), roundId: MOCK_IDS.MEMBER_JORDAN };
    // A missed reopen is recovered by the existing pageshow listener.
    await page.evaluate(() => dispatchEvent(new Event('pageshow')));
    await expect(page.getByTestId('voting-nudge-vote-now')).toBeVisible();
    current = { ...current, phase: 'converged', revision: 6, coveredSlots: 3 };
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await expect(page.getByTestId('home-see-matches')).toBeVisible();
  });

  test('Home retains confirmed navigation during recheck/failure and retries without guessing', async ({
    page,
  }) => {
    await prepare(page);
    let mode: 'failed' | 'ready' | 'pending' = 'failed';
    let release: (() => void) | undefined;
    await page.route('**/api/discovery/session', async (route) => {
      if (mode === 'pending')
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      if (mode === 'failed')
        return route.fulfill({ status: 400, json: { message: 'Unavailable' } });
      return route.fulfill({ json: { data: round('2026-05-11', 'converged') } });
    });
    await page.goto('/home');
    await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByTestId('home-see-matches')).toHaveCount(0);
    mode = 'ready';
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(page.getByTestId('home-see-matches')).toBeEnabled();
    mode = 'pending';
    await page.evaluate(() => dispatchEvent(new Event('pageshow')));
    await expect(page.getByTestId('home-voting-status')).toContainText('Checking voting');
    await expect(page.getByTestId('home-see-matches')).toBeEnabled();
    mode = 'failed';
    release?.();
    await expect(page.getByTestId('home-voting-status')).toContainText('last confirmed', {
      timeout: 20000,
    });
    await expect(page.getByTestId('home-see-matches')).toBeEnabled();
    mode = 'ready';
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(page.getByTestId('home-voting-status')).toHaveCount(0);
  });

  test.describe('French Home voting', () => {
    test.use({ appLocale: 'fr' });
    for (const target of [
      { name: 'iPad', width: 820, height: 1180 },
      { name: 'iPhone', width: 390, height: 844 },
      { name: 'Pixel', width: 412, height: 915 },
    ]) {
      test(`communicates unsaved matches on ${target.name} without changing Discovery copy`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize(target);
        await prepare(page);
        await page.route('**/api/discovery/session', (route) =>
          route.fulfill({ json: { data: round('2026-05-11', 'converged') } })
        );
        await page.goto('/home');
        await expect(page.getByText('Le menu est prêt', { exact: true })).toBeVisible();
        await expect(
          page.getByText('Vos choix communs sont prêts à être consultés et enregistrés.', {
            exact: true,
          })
        ).toBeVisible();
        await expect(
          page.getByRole('button', { name: 'Voir vos choix communs', exact: true })
        ).toBeEnabled();
        await page.screenshot({
          path: `/tmp/wfs-home-fr-${target.name}.png`,
          fullPage: true,
          style: 'nextjs-portal { visibility: hidden; }',
        });
        await testInfo.attach('Home French', {
          path: `/tmp/wfs-home-fr-${target.name}.png`,
          contentType: 'image/png',
        });
      });
    }
  });
});
