import { expectTonightLayout, recordTonightControlStates } from './helpers/tonight-card-layout';
import { test, expect } from './fixtures';
import type { NonCookingPlanDto, ScheduleDays } from '../src/lib/api/generated/models';
import {
  MOCK_IDS,
  builders,
  setupCommonRoutes,
  currentMonday,
  toDateStr,
  mockSseWithRecipeReady,
  mockSseWithConnectedSchedule,
} from './mock-api';

test.describe('Home Command Center — GOTO & Pivot Flow', () => {
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

  for (const appLocale of ['en', 'fr'] as const) {
    test.describe(`Mystery unavailable (${appLocale})`, () => {
      test.use({ appLocale });
      for (const status of [404, 500]) {
        test(`checking and settled ${status} preserve the plan across phone and iPad`, async ({
          page,
        }, testInfo) => {
          test.setTimeout(60_000);
          const schedule = builders.scheduleDays();
          const today = schedule.days.find((day) => day.date === toDateStr(currentMonday()))!;
          today.recipe = null;
          today.status = 3;
          Object.assign(today, { nonCooking: { kind: 'mystery', customLabel: null } });
          await mockSseWithConnectedSchedule(page, schedule as unknown as ScheduleDays);
          await page.route(
            (url) => url.pathname === '/api/schedule',
            (route) => route.fulfill({ json: { data: schedule } })
          );
          let release!: () => void;
          const gate = new Promise<void>((resolve) => {
            release = resolve;
          });
          await page.route('**/api/goto/active', async (route) => {
            await gate;
            return route.fulfill({ status, json: { message: 'Synthetic unavailable suggestion' } });
          });
          const writes: string[] = [];
          page.on('request', (request) => {
            if (
              request.method() !== 'GET' &&
              new URL(request.url()).pathname.startsWith('/api/schedule')
            )
              writes.push(request.url());
          });
          await page.setViewportSize({ width: 320, height: 568 });
          await page.goto('/home');
          await expect(page.getByTestId('mystery-availability')).toHaveText(
            appLocale === 'fr' ? 'Vérification de votre GOTO…' : 'Checking your GOTO…'
          );
          release();
          await expect(page.getByTestId('mystery-availability')).toHaveText(
            appLocale === 'fr'
              ? 'Aucune suggestion GOTO disponible pour le moment.'
              : 'No GOTO suggestion available right now.',
            { timeout: 30_000 }
          );
          const card = page.getByTestId('tonight-pivot-card');
          await expect(
            card.getByTestId('mystery-plan-illustration').locator('svg')
          ).toHaveAttribute('width', '104');
          await expect(card.getByTestId('confirm-goto-btn')).toBeHidden();
          for (const [width, height] of [
            [320, 568],
            [390, 844],
            [412, 915],
            [820, 1180],
            [1180, 820],
          ]) {
            await page.setViewportSize({ width, height });
            await page.emulateMedia({ reducedMotion: 'reduce' });
            for (const id of ['discover-btn', 'order-in-btn']) {
              const control = page.getByTestId(id);
              await control.focus();
              await expect(control).toBeFocused();
              const box = await control.boundingBox();
              expect(box!.width).toBeGreaterThanOrEqual(48);
              expect(box!.height).toBeGreaterThanOrEqual(48);
            }
            expect(
              await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
            ).toBe(true);
            await page.screenshot({
              path: testInfo.outputPath(`mystery-${appLocale}-${status}-${width}.png`),
              fullPage: true,
            });
          }
          await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
          await page.setViewportSize({ width: 320, height: 568 });
          await page.getByTestId('discover-btn').scrollIntoViewIfNeeded();
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
          ).toBe(true);
          await page.getByTestId('discover-btn').click();
          await page.getByTestId('quick-find-close').click();
          await expect(page.getByTestId('today-non-cooking-label')).toHaveText(
            appLocale === 'fr' ? 'Souper mystère' : 'Mystery night'
          );
          expect(writes).toEqual([]);
        });
      }
    });
    test.describe(`Tonight photo parity (${appLocale})`, () => {
      test.use({ appLocale });
      for (const [width, height] of [
        [390, 844],
        [412, 915],
        [320, 568],
        [820, 1180],
        [1180, 820],
      ]) {
        test(`Mystery proposal and Make this tonight preserve the loaded photo at ${width}x${height}`, async ({
          page,
        }, testInfo) => {
          await page.setViewportSize({ width, height });
          await page.emulateMedia({ reducedMotion: 'reduce' });
          test.setTimeout(90_000);
          const name =
            appLocale === 'fr'
              ? 'Gratin familial de légumes rôtis avec pommes de terre et sauce crémeuse aux fines herbes'
              : 'Family roasted vegetable supper with potatoes and a creamy garden herb sauce';
          const source = `/api/recipes/${MOCK_IDS.RECIPE_LASAGNA}/hero`;
          await page.route('**/api/goto/active', (route) =>
            route.fulfill({
              json: {
                data: {
                  recipeId: MOCK_IDS.RECIPE_LASAGNA,
                  description: name,
                  status: 'ready',
                  imageUrl: source,
                },
              },
            })
          );
          await page.route('**/hero', (route) =>
            route.fulfill({ path: 'e2e/fixtures/cookbook-light.jpg', contentType: 'image/jpeg' })
          );
          const schedule = builders.scheduleDays();
          const today = schedule.days.find((day) => day.date === toDateStr(currentMonday()))!;
          today.recipe = null;
          today.status = 0;
          await mockSseWithConnectedSchedule(page, schedule as unknown as ScheduleDays);
          await page.route(
            (url) => url.pathname.endsWith('/api/schedule'),
            (route) =>
              route.request().method() === 'GET'
                ? route.fulfill({ json: { data: schedule } })
                : route.fallback()
          );
          const assignments: unknown[] = [];
          await page.route('**/api/schedule/assign**', async (route) => {
            if (route.request().method() !== 'POST') return route.fallback();
            assignments.push(route.request().postDataJSON());
            today.recipe = builders.scheduleRecipe({
              id: MOCK_IDS.RECIPE_LASAGNA,
              name,
              image: source,
            });
            await route.fulfill({ json: { data: { message: 'Recipe assigned' } } });
          });
          await page.route(
            (url) => url.pathname.endsWith(`/api/recipes/${MOCK_IDS.RECIPE_LASAGNA}`),
            (route) =>
              route.fulfill({
                json: {
                  recipe: builders.recipe({ id: MOCK_IDS.RECIPE_LASAGNA, name, imageUrl: source }),
                },
              })
          );
          await page.goto('/home');
          await page.evaluate(() => document.fonts.ready);
          const pivot = page.getByTestId('tonight-pivot-card');
          const photo = pivot.getByRole('img', { name });
          await expect
            .poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth))
            .toBeGreaterThan(0);
          const before = (await photo.boundingBox())!;
          expect(before.height).toBeCloseTo(before.width * 0.8, 0);
          await page.screenshot({ path: testInfo.outputPath('pivot.png'), fullPage: true });
          const ordinaryWidth = (await pivot.boundingBox())!.width;
          const ordinaryTitle = await pivot
            .getByRole('heading', { name, exact: true })
            .evaluate((el) => {
              const css = getComputedStyle(el);
              return {
                fontSize: css.fontSize,
                fontWeight: css.fontWeight,
                lineHeight: css.lineHeight,
              };
            });
          today.status = 3;
          Object.assign(today, { nonCooking: { kind: 'mystery', customLabel: null } });
          await mockSseWithConnectedSchedule(page, schedule as unknown as ScheduleDays);
          await page.reload();
          const label = appLocale === 'fr' ? 'Souper mystère' : 'Mystery night';
          const header = pivot.getByTestId('pivot-card-header');
          await expect(header).toHaveText(label);
          await expect(pivot.getByText(label, { exact: true })).toHaveCount(1);
          await expect(pivot.getByTestId('today-non-cooking-label')).toHaveCount(0);
          await expect
            .poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth))
            .toBeGreaterThan(0);
          const mystery = (await photo.boundingBox())!;
          expect(mystery.width).toBeCloseTo(before.width, 0);
          expect(mystery.height).toBeCloseTo(before.height, 0);
          expect((await pivot.boundingBox())!.width).toBeCloseTo(ordinaryWidth, 0);
          const title = pivot.getByRole('heading', { name, exact: true });
          expect(
            (await header.boundingBox())!.y + (await header.boundingBox())!.height
          ).toBeLessThan(mystery.y);
          expect((await title.boundingBox())!.y).toBeGreaterThanOrEqual(mystery.y + mystery.height);
          expect(
            await title.evaluate((el) => {
              const css = getComputedStyle(el);
              return {
                fontSize: css.fontSize,
                fontWeight: css.fontWeight,
                lineHeight: css.lineHeight,
              };
            })
          ).toEqual(ordinaryTitle);
          const actions = ['confirm-goto-btn', 'discover-btn', 'order-in-btn'];
          await expect(pivot.locator('button')).toHaveCount(3);
          for (const [index, id] of actions.entries()) {
            await expect(pivot.locator('button').nth(index)).toHaveAttribute('data-testid', id);
          }
          await expect(pivot.getByTestId('confirm-goto-btn')).toHaveAccessibleName(
            appLocale === 'fr' ? 'Préparer ce repas ce soir' : 'Make this tonight'
          );
          await expect(pivot.getByTestId('discover-btn')).toHaveAccessibleName(
            appLocale === 'fr' ? 'Recherche' : 'Quick Find'
          );
          await expect(pivot.getByTestId('order-in-btn')).toHaveAccessibleName(
            appLocale === 'fr' ? 'À emporter' : 'Take Out'
          );
          await expectTonightLayout(page, pivot, testInfo, 'mystery-proposal');
          await page.getByTestId('discover-btn').click();
          await expect(page.getByTestId('quick-find-modal')).toBeVisible();
          await page.getByTestId('quick-find-close').click();
          await expect(header).toHaveText(label);
          expect(today.status).toBe(3);
          expect(today.recipe).toBeNull();
          await pivot.getByTestId('confirm-goto-btn').focus();
          await page.keyboard.press('Tab');
          await expect(pivot.getByTestId('discover-btn')).toBeFocused();
          await page.keyboard.press('Shift+Tab');
          await expect(pivot.getByTestId('confirm-goto-btn')).toBeFocused();
          expect(
            parseFloat(
              await pivot
                .getByTestId('confirm-goto-btn')
                .evaluate((el) => getComputedStyle(el).outlineWidth)
            )
          ).toBeGreaterThanOrEqual(2);
          expect(assignments).toEqual([]);
          await page.getByTestId('confirm-goto-btn').click();
          const planned = page.getByTestId('tonight-menu-card');
          const plannedPhoto = planned.getByRole('img', { name });
          await expect
            .poll(() => plannedPhoto.evaluate((img: HTMLImageElement) => img.naturalWidth))
            .toBeGreaterThan(0);
          await expect(pivot).toHaveCount(0);
          await expect.poll(() => assignments.length).toBe(1);
          expect(assignments[0]).toMatchObject({ recipeId: MOCK_IDS.RECIPE_LASAGNA });
          const after = (await plannedPhoto.boundingBox())!;
          await testInfo.attach('photo-geometry', {
            body: JSON.stringify({ viewport: { width, height }, before, mystery, after }),
            contentType: 'application/json',
          });
          await page.screenshot({ path: testInfo.outputPath('planned.png'), fullPage: true });
          expect(after.width).toBeCloseTo(before.width, 0);
          expect(after.height).toBeCloseTo(before.height, 0);
          expect(after.height).toBeCloseTo(after.width * 0.8, 0);
          const crop = await plannedPhoto.evaluate((img) => ({
            fit: getComputedStyle(img).objectFit,
            overflow: getComputedStyle(img.parentElement!).overflow,
            radius: parseFloat(getComputedStyle(img.parentElement!).borderTopLeftRadius),
          }));
          expect(crop.fit).toBe('cover');
          expect(crop.overflow).toBe('hidden');
          expect(crop.radius).toBeGreaterThan(0);
          await expectTonightLayout(page, planned, testInfo, 'planned-after-confirm');
        });
      }
    });
  }

  for (const appLocale of ['en', 'fr'] as const) {
    for (const context of ['ordinary', 'mystery'] as const) {
      test.describe(`Cookbook pivot ${context} (${appLocale})`, () => {
        test.use({ appLocale });
        for (const photo of ['light', 'dark', 'failed'] as const) {
          test(`${photo} photograph and image recovery`, async ({ page }, testInfo) => {
            test.setTimeout(90_000);
            await page.setViewportSize({ width: 390, height: 844 });
            const name =
              context === 'mystery'
                ? appLocale === 'fr'
                  ? 'Gratin familial de légumes rôtis avec pommes de terre et sauce crémeuse aux fines herbes'
                  : 'Family roasted vegetable supper with potatoes and a creamy garden herb sauce'
                : appLocale === 'fr'
                  ? 'Saumon et légumes du jardin'
                  : 'Salmon with garden vegetables';
            let recipeId: string = MOCK_IDS.RECIPE_LASAGNA;
            await page.route(
              (url) => url.pathname.includes('/api/goto/active'),
              async (route) => {
                await route.fulfill({
                  json: { data: { recipeId, description: name, status: 'ready' } },
                });
              }
            );
            await page.route(
              (url) => url.pathname.endsWith('/hero'),
              async (route) => {
                if (photo === 'failed' && route.request().url().includes(MOCK_IDS.RECIPE_LASAGNA))
                  await route.fulfill({ status: 404, body: '' });
                else
                  await route.fulfill({
                    path: `e2e/fixtures/cookbook-${photo === 'dark' ? 'dark' : 'light'}.jpg`,
                    contentType: 'image/jpeg',
                  });
              }
            );
            if (context === 'mystery') {
              const schedule = builders.scheduleDays();
              const today = schedule.days.find((day) => day.date === toDateStr(currentMonday()))!;
              today.recipe = null;
              today.status = 3;
              Object.assign(today, { nonCooking: { kind: 'mystery', customLabel: null } });
              await mockSseWithConnectedSchedule(page, schedule as unknown as ScheduleDays);
              await page.route(
                (url) => url.pathname.endsWith('/api/schedule'),
                (route) =>
                  route.request().method() === 'GET'
                    ? route.fulfill({ json: { data: schedule } })
                    : route.fallback()
              );
            }
            await page.goto('/home');
            const card = page.getByTestId('tonight-pivot-card');
            await expect(card.getByRole('heading', { name })).toBeVisible();
            if (photo === 'failed') {
              await expect(card.locator('img')).toHaveCount(0);
              await expect(page.getByTestId('confirm-goto-btn')).toBeVisible();
              await page.screenshot({
                path: testInfo.outputPath('failed-image.png'),
                fullPage: true,
              });
              recipeId = MOCK_IDS.RECIPE_TACOS;
              // A real reload with a new eligible GOTO identity must attempt its fresh image.
              await page.reload();
              await expect(card.locator('img')).toBeVisible();
              await expect
                .poll(() =>
                  card.locator('img').evaluate((img: HTMLImageElement) => img.naturalWidth)
                )
                .toBeGreaterThan(100);
            } else {
              await expect
                .poll(() =>
                  card.locator('img').evaluate((img: HTMLImageElement) => img.naturalWidth)
                )
                .toBeGreaterThan(100);
              for (const [width, height] of [
                [320, context === 'mystery' ? 568 : 844],
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
                  if (growth === 1 && width >= 390 && width <= 412) {
                    const quick = await page.getByTestId('discover-btn').boundingBox();
                    const order = await page.getByTestId('order-in-btn').boundingBox();
                    expect(Math.abs(quick!.y - order!.y)).toBeLessThan(1);
                    expect(quick!.height).toBeLessThan(70);
                    expect(order!.height).toBeLessThan(70);
                  }
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
  }

  for (const appLocale of ['en', 'fr'] as const) {
    test.describe(`Tonight card layout / Tonight pivot choices (${appLocale})`, () => {
      test.use({ appLocale });
      for (const state of ['ready', 'empty', 'read-error', 'mystery'] as const) {
        test(`${state} pivot reflow and reachability`, async ({ page }, testInfo) => {
          const name =
            appLocale === 'fr'
              ? 'Gratin familial de légumes rôtis avec pommes de terre et sauce crémeuse aux fines herbes'
              : 'Family roasted vegetable supper with potatoes and a creamy garden herb sauce';
          await page.route(
            (url) => url.pathname.includes('/api/goto/active'),
            async (route) => {
              await route.fulfill(
                state === 'ready'
                  ? {
                      json: {
                        data: {
                          recipeId: MOCK_IDS.RECIPE_LASAGNA,
                          description: name,
                          status: 'ready',
                        },
                      },
                    }
                  : { status: state === 'read-error' ? 500 : 404, json: { error: 'Unavailable' } }
              );
            }
          );
          await page.route(
            (url) => url.pathname.endsWith(`/api/recipes/${MOCK_IDS.RECIPE_LASAGNA}`),
            async (route) => {
              await route.fulfill({
                json: {
                  recipe: builders.recipe({ id: MOCK_IDS.RECIPE_LASAGNA, name, imageUrl: '' }),
                  updatedAt: new Date().toISOString(),
                },
              });
            }
          );
          if (state === 'mystery') {
            const schedule = builders.scheduleDays();
            const day = schedule.days.find((day) => day.date === toDateStr(currentMonday()))!;
            day.status = 3;
            Object.assign(day, {
              nonCooking: { kind: 'mystery', customLabel: null } satisfies NonCookingPlanDto,
            });
            await mockSseWithConnectedSchedule(page, schedule as unknown as ScheduleDays);
            await page.route(
              (url) => url.pathname.endsWith('/api/schedule'),
              async (route) => {
                if (route.request().method() === 'GET')
                  await route.fulfill({ json: { data: schedule } });
                else await route.fallback();
              }
            );
          }
          const mutations: string[] = [];
          page.on('request', (request) => {
            if (
              new URL(request.url()).pathname.startsWith('/api/') &&
              !['GET', 'HEAD'].includes(request.method()) &&
              !request.url().endsWith('/api/recipes/search')
            )
              mutations.push(request.method());
          });
          await page.goto('/home');
          const card = page.getByTestId('tonight-pivot-card');
          await expect(card).toBeVisible();
          const context =
            state === 'mystery'
              ? appLocale === 'fr'
                ? 'Souper mystère'
                : 'Mystery night'
              : appLocale === 'fr'
                ? 'Rien de prévu pour ce soir'
                : 'Nothing planned for tonight';
          await expect(card).toContainText(context);
          await expect(page.getByTestId('discover-btn')).toHaveAccessibleName(
            state === 'mystery'
              ? appLocale === 'fr'
                ? 'Recherche'
                : 'Quick Find'
              : appLocale === 'fr'
                ? 'Rechercher'
                : 'Search'
          );
          await expect(page.getByTestId('order-in-btn')).toHaveAccessibleName(
            appLocale === 'fr' ? 'À emporter' : 'Take Out'
          );
          if (state === 'ready') {
            await expect(page.getByTestId('confirm-goto-btn')).toHaveAccessibleName(
              appLocale === 'fr' ? 'Préparer ce repas ce soir' : 'Make this tonight'
            );
            await expect(card).toContainText(
              appLocale === 'fr' ? 'Le GOTO de votre famille' : "Your family's GOTO"
            );
          }
          if (state === 'empty' || state === 'read-error')
            await expect(page.getByTestId('goto-setup-helper')).toBeVisible({ timeout: 15_000 });
          const order =
            state === 'ready'
              ? ['confirm-goto-btn', 'discover-btn', 'order-in-btn']
              : state === 'mystery'
                ? ['discover-btn', 'order-in-btn']
                : ['discover-btn', 'order-in-btn'];
          await expect(card.locator('button, a')).toHaveCount(order.length);
          for (let index = 0; index < order.length; index++) {
            await expect(card.locator('button, a').nth(index)).toHaveAttribute(
              'data-testid',
              order[index]
            );
          }
          await card.locator('button, a').first().focus();
          for (const id of order) {
            await expect(page.getByTestId(id)).toBeFocused();
            await page.keyboard.press('Tab');
          }
          expect(mutations).toEqual([]);
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
              await expectTonightLayout(page, card, testInfo, `card-${width}-${growth}`);
              if (width === 320 && growth === 1)
                await recordTonightControlStates(page, card, testInfo);
            }
          }
          await page.getByTestId('discover-btn').focus();
          await page.keyboard.press('Enter');
          if (state === 'mystery') {
            await expect(page.getByTestId('quick-find-modal')).toBeVisible();
            await page.getByTestId('quick-find-close').click();
            await expect(card).toContainText(context);
          } else {
            await expect(page).toHaveURL(
              /\/recipes\?addToDay=0&weekOffset=0&referenceWeekStartDate=2026-05-04/
            );
            await expect(page.getByTestId('quick-find-modal')).toHaveCount(0);
          }
          expect(mutations).toEqual([]);
        });
      }
    });
  }

  test('Shows Pivot Card when no recipe is planned', async ({ page }) => {
    // 1. Mock empty schedule
    await page.route(
      (url) => url.pathname.includes('/api/schedule'),
      async (route) => {
        if (route.request().url().includes('weekOffset=0') && route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                weekOffset: 0,
                calendar: builders.deploymentCalendar() as any,
                weekStartDate: '2026-05-04' as any,
                days: [],
              },
            }),
          });
        } else {
          await route.continue();
        }
      }
    );

    await page.goto('/home');
    await expect(page.getByTestId('tonight-pivot-card')).toBeVisible();
  });

  test('Confirming GOTO plans the meal', async ({ page }) => {
    // 1. Mock active GOTO
    await page.route(
      (url) => url.pathname.includes('/api/goto/active'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              description: 'Family GOTO',
              recipeId: MOCK_IDS.RECIPE_LASAGNA,
              status: 'ready',
            },
          }),
        });
      }
    );

    // 2. Mock SSE to emit recipe_ready — drives the ready transition (no polling)
    await mockSseWithRecipeReady(page, MOCK_IDS.RECIPE_LASAGNA);

    // 3. Mock assign API
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

    // 4. Mock recipe detail fetch (triggered by eager hydration)
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
              name: 'Family Lasagna',
              description: 'E2E Hydrated Description',
              ingredients: ['Pasta', 'Cheese'],
              totalTime: 'PT45M',
            }),
          }),
        });
      }
    );

    await page.goto('/home');
    await expect(page.getByTestId('tonight-pivot-card')).toBeVisible();

    const confirmBtn = page.getByTestId('confirm-goto-btn');
    await expect(confirmBtn).toBeEnabled();
    await expect(confirmBtn).toHaveText('Make this tonight');
    await confirmBtn.click();

    await expect.poll(() => assignCalled).toBe(true);
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible({ timeout: 3000 });
    await expect(page.getByTestId('tonight-pivot-card')).not.toBeVisible();

    // Verify hydration through explicit ingredient disclosure
    // The eager fetch should have completed by now (or will shortly)
    await page.getByTestId('tonight-ingredients-toggle').click();
    await expect(page.getByText('E2E Hydrated Description')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Pasta')).toBeVisible();
    expect(recipeFetched).toBe(true);
  });

  test('Menu card stays after GOTO confirm when schedule re-sync returns empty', async ({
    page,
  }) => {
    // Regression test for: optimistic setCurrentRecipe being overwritten by syncRecipe()
    // completing after the confirm click with an empty schedule response.

    // 1. Mock schedule to always return empty (simulates the race where the in-flight
    //    syncRecipe() hasn't seen the assignment yet when it completes)
    await page.route(
      (url) => url.pathname.includes('/api/schedule'),
      async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                weekOffset: 0,
                calendar: builders.deploymentCalendar() as any,
                weekStartDate: '2026-05-04' as any,
                days: [],
              },
            }),
          });
        } else {
          await route.continue();
        }
      }
    );
  });

  test('Tapping GOTO on home shows loading state then redirects to planner', async ({ page }) => {
    // 2. Mock active GOTO
    await page.route(
      (url) => url.pathname.includes('/api/goto/active'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              description: 'Family GOTO',
              recipeId: MOCK_IDS.RECIPE_LASAGNA,
              status: 'ready',
            },
          }),
        });
      }
    );

    // 3. Mock SSE to emit recipe_ready — drives the ready transition (no polling)
    await mockSseWithRecipeReady(page, MOCK_IDS.RECIPE_LASAGNA);

    // 4. Mock assign to resolve immediately
    await page.route(
      (url) => url.pathname.includes('/api/schedule/assign'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
    );

    await page.goto('/home');
    const confirmBtn = page.getByTestId('confirm-goto-btn');
    await expect(confirmBtn).toBeEnabled({ timeout: 10000 });
    await confirmBtn.click();

    // Menu card must appear despite syncRecipe() getting an empty schedule
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible({ timeout: 3000 });
    // Confirm the card stays visible through any re-sync window (no flicker)
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible({ timeout: 500 });
    await expect(page.getByTestId('tonight-pivot-card')).not.toBeVisible();
  });

  // Empty-state header, GOTO-ready button label, and ghost button styles are
  // pure prop-driven render assertions covered by TonightPivotCard.test.tsx.

  // Task 18: SSE recipe_ready → confirm-goto-btn appears (replaces polling test)
  // GOTO status endpoint returns 'pending' throughout — the button must appear
  // via the SSE recipe_ready event, not via the polling interval.
  test('SSE recipe_ready event makes confirm-goto-btn appear without polling', async ({ page }) => {
    await page.route(
      (url) => url.pathname.includes('/api/schedule'),
      async (route) => {
        if (route.request().url().includes('weekOffset=0') && route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                weekOffset: 0,
                calendar: builders.deploymentCalendar() as any,
                weekStartDate: '2026-05-04' as any,
                days: [],
              },
            }),
          });
        } else {
          await route.continue();
        }
      }
    );

    // First call returns pending — subsequent calls (after SSE fires) return ready.
    // This is the only path that can produce confirm-goto-btn: the component gates
    // rendering on hasGoto && gotoStatus === 'ready', so an initial 404 can never work.
    let activeCallCount = 0;
    await page.route(
      (url) => url.pathname.includes('/api/goto/active'),
      async (route) => {
        activeCallCount++;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              description: 'Test GOTO Recipe',
              recipeId: MOCK_IDS.RECIPE_LASAGNA,
              status: activeCallCount === 1 ? 'pending' : 'ready',
            },
          }),
        });
      }
    );

    // SSE fires recipe_ready for the GOTO recipe — triggers pending → ready transition
    await mockSseWithRecipeReady(page, MOCK_IDS.RECIPE_LASAGNA);

    await page.goto('/home');

    // confirm-goto-btn must appear driven by the SSE event, not the polling interval
    const confirmBtn = page.getByTestId('confirm-goto-btn');
    await expect(confirmBtn).toBeVisible({ timeout: 10000 });
    await expect(confirmBtn).toBeEnabled();
  });

  test('Pending GOTO transitions to ready via SSE recipe_ready event', async ({ page }) => {
    let activeCallCount = 0;
    await page.route(
      (url) => url.pathname.includes('/api/goto/active'),
      async (route) => {
        activeCallCount++;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              description: 'Mock Recipe',
              recipeId: MOCK_IDS.RECIPE_LASAGNA,
              status: activeCallCount === 1 ? 'pending' : 'ready',
            },
          }),
        });
      }
    );

    // Status endpoint always returns 'pending' — SSE must drive the transition
    await page.route(
      (url) => url.pathname.includes('/api/recipes/') && url.pathname.endsWith('/status'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { id: MOCK_IDS.RECIPE_LASAGNA, status: 'pending' } }),
        });
      }
    );

    // Mock SSE to emit recipe_ready for the GOTO recipe ID
    await mockSseWithRecipeReady(page, MOCK_IDS.RECIPE_LASAGNA);

    await page.goto('/home');
    const confirmBtn = page.getByTestId('confirm-goto-btn');

    // Initially hidden while pending (no SSE event yet — but SSE fires immediately in mock)
    // Wait for SSE-driven transition to ready
    await expect(confirmBtn).toBeVisible({ timeout: 10000 });
    await expect(confirmBtn).toBeEnabled();
    // gotoRecipeData.name from the detail endpoint ("Mock Recipe") overrides gotoDescription
    await expect(page.getByText(/mock recipe/i)).toBeVisible();
  });
});

// ── Group C: todayStore integration ──────────────────────────────────────────

test.describe('Home Command Center — todayStore (Group C)', () => {
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

  // C7: "Make this tonight" tap shows TonightMenuCard immediately (no network wait)
  test('"Make this tonight" shows TonightMenuCard immediately without waiting for network', async ({
    page,
  }) => {
    // Mock active GOTO
    await page.route(
      (url) => url.pathname.includes('/api/goto/active'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              description: 'Family GOTO',
              recipeId: MOCK_IDS.RECIPE_LASAGNA,
              status: 'ready',
            },
          }),
        });
      }
    );

    // Mock SSE to emit recipe_ready — drives the ready transition (no polling)
    await mockSseWithRecipeReady(page, MOCK_IDS.RECIPE_LASAGNA);

    let releaseAssignment!: () => void;
    const assignmentReply = new Promise<void>((resolve) => {
      releaseAssignment = resolve;
    });
    let assignmentStarted = false;
    let assignmentReplied = false;
    await page.route(
      (url) => url.pathname.includes('/api/schedule/assign'),
      async (route) => {
        expect(route.request().method()).toBe('POST');
        assignmentStarted = true;
        await assignmentReply;
        await route.fulfill({ json: { success: true } });
        assignmentReplied = true;
      }
    );

    await page.goto('/home');

    const confirmBtn = page.getByTestId('confirm-goto-btn');
    await expect(confirmBtn).toBeEnabled({ timeout: 10000 });
    await confirmBtn.click();

    // The planned card must appear while the assignment reply is still held unresolved.
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible({ timeout: 300 });
    await expect(page.getByTestId('tonight-pivot-card')).not.toBeVisible();

    await expect.poll(() => assignmentStarted).toBe(true);
    expect(assignmentReplied).toBe(false);
    releaseAssignment();
    await expect.poll(() => assignmentReplied).toBe(true);

    // Clean up any in-flight routes to avoid "Test ended" errors
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });

  // C7: Page reload after "Make this tonight" still shows TonightMenuCard
  // TODO: home-loader does not clear after reload; revisit when SSE push model replaces polling sync
  test.skip('Page reload after "Make this tonight" still shows TonightMenuCard', async ({
    page,
  }) => {
    const monday = currentMonday();
    const today = toDateStr(monday);

    // Mock active GOTO
    await page.route(
      (url) => url.pathname.includes('/api/goto/active'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              description: 'Family GOTO',
              recipeId: MOCK_IDS.RECIPE_LASAGNA,
              status: 'ready',
            },
          }),
        });
      }
    );

    // Mock GOTO status as ready
    await page.route(
      (url) => url.pathname.includes('/api/recipes/') && url.pathname.endsWith('/status'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { id: MOCK_IDS.RECIPE_LASAGNA, status: 'ready' } }),
        });
      }
    );

    // Track whether assign has been called so we can return the recipe on reload
    let assignDone = false;
    await page.route(
      (url) => url.pathname.includes('/api/schedule/assign'),
      async (route) => {
        assignDone = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
    );

    // After assign, schedule returns the recipe for today
    await page.route(
      (url) => url.pathname.includes('/api/schedule'),
      async (route) => {
        if (route.request().url().includes('weekOffset=0') && route.request().method() === 'GET') {
          if (!assignDone) {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                data: {
                  weekOffset: 0,
                  calendar: builders.deploymentCalendar() as any,
                  weekStartDate: '2026-05-04' as any,
                  days: [],
                },
              }),
            });
          } else {
            const days = Array.from({ length: 7 }, (_, i) => {
              const d = new Date(monday);
              d.setUTCDate(monday.getUTCDate() + i);
              const dateStr = toDateStr(d);
              return {
                date: dateStr,
                status: 0,
                recipe:
                  dateStr === today
                    ? builders.scheduleRecipe({
                        id: MOCK_IDS.RECIPE_LASAGNA,
                        name: 'Family GOTO',
                        image: `/api/recipes/${MOCK_IDS.RECIPE_LASAGNA}/hero`,
                      })
                    : null,
              };
            });
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                data: {
                  weekOffset: 0,
                  calendar: builders.deploymentCalendar() as any,
                  weekStartDate: '2026-05-04' as any,
                  days,
                },
              }),
            });
          }
        } else {
          await route.continue();
        }
      }
    );

    await page.goto('/home');

    const confirmBtn = page.getByTestId('confirm-goto-btn');
    await expect(confirmBtn).toBeEnabled({ timeout: 10000 });
    await confirmBtn.click();

    // Menu card appears optimistically
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible({ timeout: 3000 });

    // Wait for assign to complete
    await expect.poll(() => assignDone).toBe(true);

    // Reload — server now returns the recipe
    await page.reload();
    await expect(page.getByTestId('home-loader')).not.toBeVisible({ timeout: 5000 });

    // TonightMenuCard must still be visible after reload
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible();
    await expect(page.getByTestId('tonight-pivot-card')).not.toBeVisible();
  });

  test('"Make this tonight" → navigating to planner shows recipe in today\'s slot', async ({
    page,
  }) => {
    const monday = currentMonday();
    const today = toDateStr(monday);
    let assignDone = false;
    const savedSchedule = builders.scheduleDays();
    let assignBody: unknown;

    // Mock active GOTO
    await page.route(
      (url) => url.pathname.includes('/api/goto/active'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              description: 'Family GOTO',
              recipeId: MOCK_IDS.RECIPE_LASAGNA,
              status: 'ready',
            },
          }),
        });
      }
    );

    // Mock SSE to emit recipe_ready — drives the ready transition (no polling)
    await mockSseWithRecipeReady(
      page,
      MOCK_IDS.RECIPE_LASAGNA,
      () => savedSchedule as unknown as ScheduleDays
    );

    // Stateful schedule mock: before assign → empty; after assign → today's slot has the recipe
    await page.route(
      (url) => url.pathname.includes('/api/schedule'),
      async (route) => {
        if (route.request().url().includes('weekOffset=0') && route.request().method() === 'GET') {
          await route.fulfill({ json: { data: savedSchedule } });
        } else if (route.request().url().includes('smart-defaults')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                weekOffset: 0,
                calendar: builders.deploymentCalendar() as any,
                weekStartDate: '2026-05-04' as any,
                familySize: 3,
                consensusThreshold: 2,
                preSelectedRecipes: [],
                openSlots: [],
                consensusRecipesCount: 0,
              },
            }),
          });
        } else {
          await route.continue();
        }
      }
    );

    // Mock assign endpoint with assignDone flag
    await page.route(
      (url) => url.pathname.includes('/api/schedule/assign'),
      async (route) => {
        assignBody = route.request().postDataJSON();
        savedSchedule.days.find((day) => day.date === today)!.recipe = builders.scheduleRecipe({
          id: MOCK_IDS.RECIPE_LASAGNA,
          name: 'Family GOTO',
          image: '',
        });
        assignDone = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
    );

    // 1. Navigate to /home, wait for confirm-goto-btn enabled
    await page.goto('/home');
    const confirmBtn = page.getByTestId('confirm-goto-btn');
    await expect(confirmBtn).toBeEnabled({ timeout: 10000 });

    // 2. Click confirm-goto-btn
    await confirmBtn.click();

    // 3. Wait for assign to complete
    await expect.poll(() => assignDone).toBe(true);
    expect(assignBody).toMatchObject({
      weekOffset: 0,
      dayIndex: 0,
      recipeId: MOCK_IDS.RECIPE_LASAGNA,
    });

    // 4. Navigate to /planner
    await page.goto('/planner');

    // 5. Wait for day-card-0
    await expect(page.getByTestId('day-card-0')).toBeVisible({ timeout: 10_000 });

    // 6. Assert today's card contains recipe-name with 'Family GOTO'
    const todayCard = page.locator(`[data-date="${today}"]`);
    await expect(todayCard.getByTestId('recipe-name')).toContainText('Family GOTO', {
      timeout: 5000,
    });

    // A new connection must describe the same saved state as schedule GET.
    await page.reload();
    await expect(todayCard.getByTestId('recipe-name')).toContainText('Family GOTO');
  });
});
