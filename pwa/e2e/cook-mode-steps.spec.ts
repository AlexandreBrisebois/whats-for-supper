/**
 * E2E tests verifying Cook's Mode displays real recipe steps (not just the
 * ingredients screen) when the recipe has HowToSection[] instructions.
 *
 * Regression guard for: cook-mode-steps-display bugfix
 * Requirements: 2.2, 3.4
 *
 * Task 43 additions: ingredient checklist interactivity (Task 45), dietary
 * badge removal (Task 46), "Let's Cook →" CTA (Task 45), and Done celebration
 * moment (Task 50).
 *
 * All date logic uses currentMonday() / toDateStr() from mock-api.ts, which
 * pins to the fixed test date (2026-05-04, Monday). Never use new Date() here.
 */
import { test, expect } from './fixtures';
import {
  MOCK_IDS,
  builders,
  setupCommonRoutes,
  currentMonday,
  toDateStr,
  mockSseWithConnectedSchedule,
} from './mock-api';
import { REALISTIC_RECIPES } from '../src/testing/realistic-recipes';
import path from 'node:path';

/**
 * Build a 7-day schedule response with RECIPE_SPAGHETTI on Monday (the fixed test date).
 * Uses currentMonday() / toDateStr() — never new Date() — so the date is always stable.
 */
function buildSpaghettiSchedule() {
  const monday = currentMonday();
  // Uses the pinned test Monday (2026-05-04). Tests that use this function must
  // call page.clock.setFixedTime('2026-05-04T12:00:00Z') so getTodayString() matches.
  const todayStr = toDateStr(monday);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    const dateStr = toDateStr(d);
    return {
      day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      date: dateStr,
      recipe:
        dateStr === todayStr
          ? builders.scheduleRecipe({
              id: MOCK_IDS.RECIPE_SPAGHETTI,
              name: 'Spaghetti with Toasted Garlic Bread',
            })
          : null,
      status: 0,
    };
  });
  return {
    data: {
      weekOffset: 0,
      calendar: builders.deploymentCalendar() as any,
      weekStartDate: '2026-05-04' as any,
      locked: false,
      status: 0,
      days,
    },
  };
}

async function collapseDevelopmentBadge(page: import('@playwright/test').Page) {
  const devBadge = page.getByRole('button', { name: 'Collapse issues badge' });
  if (await devBadge.isVisible()) await devBadge.click();
}

test.describe('Cook Mode — HowToSection[] steps display', () => {
  test.beforeEach(async ({ page }) => {
    // Pin the browser clock to the fixed test Monday so getTodayString() matches
    // the date used in buildSpaghettiSchedule() — 2026-05-04 (Monday).
    await page.clock.setFixedTime(new Date('2026-05-04T12:00:00Z'));

    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseUrl }]);

    // Seed localStorage with the selected family member before any navigation
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

    await setupCommonRoutes(page);

    // Override the SSE stream to emit a slot_updated event for 2026-05-04 (today in the
    // pinned clock). This updates todayStore.currentRecipe, which the home page server
    // component cannot set (server-side fetches are not intercepted by page.route()).
    // Registered AFTER setupCommonRoutes so LIFO gives this handler priority.
    const spaghettiRecipe = builders.scheduleRecipe({
      id: MOCK_IDS.RECIPE_SPAGHETTI,
      name: 'Spaghetti with Toasted Garlic Bread',
    });
    await page.route(/\/(?:backend\/)?api\/stream/, async (route) => {
      const connected = `event: connected\ndata: ${JSON.stringify({ type: 'connected', schedule: { weekOffset: 0, calendar: builders.deploymentCalendar() as any, weekStartDate: '2026-05-04' as any, locked: false, status: 0, days: buildSpaghettiSchedule().data.days } })}\n\n`;
      const slotUpdated = `event: slot_updated\ndata: ${JSON.stringify({ type: 'slot_updated', date: '2026-05-04', recipe: spaghettiRecipe, status: 0 })}\n\n`;
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        headers: {
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
        body: connected + slotUpdated,
      });
    });

    // Register the spaghetti recipe detail override AFTER setupCommonRoutes so LIFO
    // gives this handler priority over the default **/api/recipes/* wildcard.
    await page.route('**/api/recipes/*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ recipe: REALISTIC_RECIPES[MOCK_IDS.RECIPE_SPAGHETTI] }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { message: 'ok' } }),
        });
      }
    });
  });

  async function openOriginalCooking(
    page: import('@playwright/test').Page,
    overrides: Record<string, unknown> = {},
    photo = 'cookbook-light.jpg'
  ) {
    await page.route('**/api/recipes/*', async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      await route.fulfill({
        json: {
          recipe: {
            ...REALISTIC_RECIPES[MOCK_IDS.RECIPE_SPAGHETTI],
            sourceType: 'photos',
            sourceUrl: null,
            imageCount: 3,
            finishedDishIndex: 1,
            recipeInstructions: Array.from({ length: 6 }, (_, index) => ({
              '@type': 'HowToStep',
              name: `Step ${index + 1}`,
              text: 'Stir gently and keep an eye on the pan. '.repeat(12),
            })),
            ...overrides,
          },
        },
      });
    });
    await page.route('**/api/recipes/*/original/*', (route) =>
      route.fulfill({ path: path.resolve('e2e/fixtures', photo), contentType: 'image/jpeg' })
    );
    await page.route('**/api/recipes/*/hero', (route) =>
      route.fulfill({ path: path.resolve('e2e/fixtures', photo), contentType: 'image/jpeg' })
    );
    await page.goto('/home');
    await page.getByTestId('cook-mode-btn').click();
    if (overrides.imageCount === 0 && !overrides.sourceUrl) {
      await expect(page.getByTestId('cooks-mode-original')).toHaveCount(0);
    } else {
      await expect(page.getByTestId('cooks-mode-original')).toBeVisible();
    }
    await collapseDevelopmentBadge(page);
    await expect(page.getByTestId('cooks-mode-overlay')).toHaveCSS('opacity', '1');
    await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
  }

  test('Original photo contains focus and returns the exact cooking draft and reading offset', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openOriginalCooking(page);
    await page.getByTestId('ingredient-toggle').first().click();
    await page.getByTestId('cooks-mode-step-next').click();
    const surface = page.getByTestId('cooks-mode-instructions');
    await surface.evaluate((element) => {
      element.scrollTop = 300;
      element.dispatchEvent(new Event('scroll'));
    });
    await page.getByTestId('single-page-edit-step-2').click();
    await page.getByRole('textbox').fill('Unsaved cooking correction');
    const before = await surface.evaluate((element) => element.scrollTop);
    const bookmark = await page.getByTestId('cooks-mode-step-indicator').textContent();
    const original = page.getByTestId('cooks-mode-original');
    await original.click();
    const viewer = page.getByRole('dialog');
    await expect(viewer).toBeVisible();
    await expect(page.getByTestId('cooks-mode-overlay')).toHaveAttribute('inert', '');
    await expect(viewer.getByRole('img')).toHaveAttribute('src', /original\/1$/);
    await expect(page.getByTestId('action-close-viewer')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(viewer.locator('button:visible').last()).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('action-close-viewer')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(viewer).toHaveCount(0);
    await expect(original).toBeFocused();
    await expect(page.getByRole('textbox')).toHaveValue('Unsaved cooking correction');
    await expect.poll(() => surface.evaluate((element) => element.scrollTop)).toBe(before);
    await expect(page.getByTestId('cooks-mode-step-indicator')).toHaveText(bookmark!);
    for (let repeat = 0; repeat < 2; repeat++) {
      await original.click();
      await expect(page.getByRole('dialog').getByRole('img')).toHaveAttribute(
        'src',
        /original\/1$/
      );
      await page.getByTestId('action-close-viewer').click();
    }
    await expect(page.getByRole('textbox')).toHaveValue('Unsaved cooking correction');
  });

  test('Original availability hides an unusable URL destination', async ({ page }) => {
    await openOriginalCooking(page, { sourceType: 'url', sourceUrl: null, imageCount: 0 });
    await expect(page.getByTestId('cooks-mode-original')).toHaveCount(0);
    await expect(page.getByTestId('cooks-mode-step-next')).toBeEnabled();
  });

  test('Original photo retained PDF pages and failed images remain closable', async ({ page }) => {
    // Imported PDF pages are already rasterized originals, using the same photos source metadata.
    await openOriginalCooking(page, { sourceType: 'photos', finishedDishIndex: -1 });
    await page.route('**/api/recipes/*/original/*', (route) =>
      route.fulfill({ status: 404, body: 'Unavailable page image' })
    );
    await page.getByTestId('cooks-mode-original').click();
    const image = page.getByRole('dialog').getByRole('img');
    await expect(image).toHaveAttribute('src', /original\/0$/);
    await expect
      .poll(() => image.evaluate((element) => (element as HTMLImageElement).complete))
      .toBe(true);
    expect(await image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBe(0);
    await page.getByTestId('action-close-viewer').click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByTestId('cooks-mode-original')).toBeFocused();
  });

  test('Original URL opens the source while keeping cooking mounted', async ({ page }) => {
    await page
      .context()
      .route('https://example.test/cooking-source', (route) =>
        route.fulfill({ contentType: 'text/html', body: '<title>Recipe source</title>' })
      );
    await openOriginalCooking(page, {
      sourceType: 'url',
      sourceUrl: 'https://example.test/cooking-source',
      imageCount: 0,
    });
    const popupPromise = page.context().waitForEvent('page');
    await page.getByTestId('cooks-mode-original').click();
    const popup = await popupPromise;
    await expect(popup).toHaveURL('https://example.test/cooking-source');
    await popup.close();
    await expect(page.getByTestId('cooks-mode-overlay')).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  for (const appLocale of ['en', 'fr'] as const) {
    test.describe(`Original responsive ${appLocale}`, () => {
      test.use({ appLocale });
      for (const width of [390, 820]) {
        test(`200% text ${width}`, async ({ page }, testInfo) => {
          await page.setViewportSize({ width, height: 844 });
          await openOriginalCooking(page);
          await page.getByTestId('cooks-mode-step-next').click();
          await page.getByTestId('cooks-mode-overlay').evaluate((root) => {
            const elements = Array.from(root.querySelectorAll<HTMLElement>('*'));
            const sizes = elements.map((element) => {
              const style = getComputedStyle(element);
              return [parseFloat(style.fontSize), parseFloat(style.lineHeight)];
            });
            elements.forEach((element, index) => {
              element.style.fontSize = `${sizes[index][0] * 2}px`;
              if (Number.isFinite(sizes[index][1]))
                element.style.lineHeight = `${sizes[index][1] * 2}px`;
            });
          });
          const original = page.getByTestId('cooks-mode-original');
          await expect(original).toBeInViewport();
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth)
          ).toBeLessThanOrEqual(width);
          expect(
            (await page.getByTestId('cooks-mode-instructions').boundingBox())!.height
          ).toBeGreaterThan(44);
          for (const button of await page
            .getByTestId('cooks-mode-controls')
            .getByRole('button')
            .all()) {
            const box = (await button.boundingBox())!;
            expect(box.x + box.width).toBeLessThanOrEqual(width);
            expect(
              await button.evaluate((element) => element.scrollWidth <= element.clientWidth)
            ).toBe(true);
          }
          await original.focus();
          await page.keyboard.press('Tab');
          await page.keyboard.press('Shift+Tab');
          await expect(original).toBeFocused();
          const contrast = await original.evaluate((element) => {
            const style = getComputedStyle(element);
            const rgb = (value: string) =>
              value
                .match(/[\d.]+/g)!
                .slice(0, 3)
                .map(Number);
            const luminance = (color: number[]) =>
              color
                .map((channel) => {
                  const v = channel / 255;
                  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
                })
                .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
            const foreground = luminance(rgb(style.color));
            const background = luminance(rgb(style.backgroundColor));
            return {
              color: style.color,
              background: style.backgroundColor,
              ratio:
                (Math.max(foreground, background) + 0.05) /
                (Math.min(foreground, background) + 0.05),
              shadow: style.boxShadow,
            };
          });
          expect(contrast.ratio).toBeGreaterThanOrEqual(4.5);
          expect(contrast.shadow).not.toBe('none');
          await testInfo.attach('Original enabled contrast and focus', {
            body: JSON.stringify(contrast),
            contentType: 'application/json',
          });
          await page.screenshot({ path: testInfo.outputPath('cooking-text-200.png') });
        });
      }
      for (const viewport of [
        { width: 320, height: 700 },
        { width: 375, height: 812 },
        { width: 390, height: 844 },
        { width: 640, height: 375 },
        { width: 768, height: 1024 },
        { width: 820, height: 1180 },
        { width: 1024, height: 768 },
        { width: 1180, height: 820 },
        { width: 780, height: 820 },
      ]) {
        test(`${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
          await page.setViewportSize(viewport);
          await openOriginalCooking(
            page,
            {},
            appLocale === 'fr' ? 'cookbook-dark.jpg' : 'cookbook-light.jpg'
          );
          await page.getByTestId('cooks-mode-step-next').click();
          const hero = page.getByTestId('cooks-mode-hero');
          const original = page.getByTestId('cooks-mode-original');
          const surface = page.getByTestId('cooks-mode-instructions');
          const image = hero.getByRole('img');
          await expect
            .poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth))
            .toBeGreaterThan(0);
          for (const control of [
            original,
            page.getByTestId('cooking-view-all-steps'),
            page.getByTestId('cooking-view-step-by-step'),
          ]) {
            const box = (await control.boundingBox())!;
            expect(box.width).toBeGreaterThanOrEqual(44);
            expect(box.height).toBeGreaterThanOrEqual(44);
            expect(box.x).toBeGreaterThanOrEqual(0);
            expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
          }
          await page.screenshot({ path: testInfo.outputPath('cooking-ordinary.png') });
          const title = page.getByTestId('cooks-mode-recipe-name');
          const titleBox = (await title.boundingBox())!;
          await title.evaluate((element) => {
            element.style.color = 'transparent';
            element.style.filter = 'none';
          });
          await page.screenshot({
            path: testInfo.outputPath('title-underlay.png'),
            clip: titleBox,
          });
          await title.evaluate((element) => {
            element.style.color = '';
            element.style.filter = '';
          });
          const heroBefore = await hero.boundingBox();
          const imageBefore = await image.boundingBox();
          await surface.evaluate((element) => {
            element.scrollTop = 300;
            element.dispatchEvent(new Event('scroll'));
          });
          await expect
            .poll(() => surface.evaluate((element) => element.scrollTop))
            .toBeGreaterThan(0);
          expect(await hero.boundingBox()).toEqual(heroBefore);
          expect(await image.boundingBox()).toEqual(imageBefore);
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth)
          ).toBeLessThanOrEqual(viewport.width);
          expect((await surface.boundingBox())!.height).toBeGreaterThan(44);
          if (viewport.width >= 768) {
            expect(heroBefore!.width).toBeCloseTo(viewport.width * 0.4, 0);
            const controls = (await page.getByTestId('cooks-mode-header-controls').boundingBox())!;
            expect(controls.y).toBeGreaterThan(viewport.height / 2);
          }
          await page.screenshot({ path: testInfo.outputPath('cooking.png') });
        });
      }
    });
  }

  test('changes and remembers the selected member cooking view without a preview flag', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto('/home');
    await page.getByTestId('cook-mode-btn').click();
    await collapseDevelopmentBadge(page);

    const toggle = page.getByTestId('cooking-view-toggle');
    const allStepsButton = page.getByRole('button', { name: 'All steps' });
    const stepByStepButton = page.getByRole('button', { name: 'Step by step' });
    await expect(allStepsButton).toHaveAttribute('aria-pressed', 'true');
    expect(await allStepsButton.textContent()).toBe('');
    const heroBounds = await page.getByTestId('cooks-mode-hero').boundingBox();
    const bounds = await toggle.boundingBox();
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
    expect(bounds!.y).toBeGreaterThan(heroBounds!.y + heroBounds!.height / 2);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(heroBounds!.y + heroBounds!.height);
    await expect(
      page.getByTestId('cooking-reading-context').getByTestId('cooks-mode-step-indicator')
    ).toBeVisible();
    await page.getByTestId('cooks-mode-step-next').click();
    await expect(page.getByTestId('all-steps-recipe-list')).toBeVisible();
    const allStepsHeroHeight = (await page.getByTestId('cooks-mode-hero').boundingBox())!.height;
    await expect(page.getByText('Remembered for Alex')).toHaveCount(0);
    const save = page.waitForRequest(
      (request) =>
        request.method() === 'PUT' &&
        request.url().includes('/api/family/') &&
        request.url().endsWith('/preferences')
    );
    await stepByStepButton.click();
    expect((await save).postDataJSON()).toEqual({ cookingViewMode: 'step-by-step' });
    await expect(stepByStepButton).toHaveAttribute('aria-pressed', 'true');
    await expect(allStepsButton).toHaveAttribute('aria-pressed', 'false');
    await expect(stepByStepButton).toBeFocused();
    expect((await page.getByTestId('cooks-mode-hero').boundingBox())!.height).toBe(
      allStepsHeroHeight
    );

    await page.getByTestId('close-cooks-mode').click();
    await page.getByTestId('cook-mode-btn').click();
    await collapseDevelopmentBadge(page);
    await expect(page.getByRole('button', { name: 'Step by step' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  for (const matchesSupper of [false, true]) {
    test(`recipe-details cooking completes supper only for its assigned recipe (matches: ${matchesSupper})`, async ({
      page,
    }) => {
      const recipeId = matchesSupper ? MOCK_IDS.RECIPE_SPAGHETTI : MOCK_IDS.RECIPE_LASAGNA;
      const recipe = {
        ...builders.recipe({ id: recipeId, name: 'Recipe being cooked' }),
        recipeInstructions: ['Cook this recipe.'],
      };
      const schedule = buildSpaghettiSchedule().data;
      await mockSseWithConnectedSchedule(page, schedule);
      await page.route('**/api/schedule?**', async (route) => {
        await route.fulfill({ json: { data: schedule } });
      });
      await page.route(`**/api/recipes/${recipeId}`, async (route) => {
        await route.fulfill({ json: { recipe } });
      });
      await page.route('**/api/recipes/search', async (route) => {
        await route.fulfill({
          json: {
            data: {
              topPick: null,
              results: [recipe],
              appliedFilters: {},
              searchMode: 'explicit',
              resultPath: 'lexical-only',
            },
          },
        });
      });
      let cookingRequest: unknown;
      await page.route('**/api/schedule/day/*/validate', async (route) => {
        cookingRequest = route.request().postDataJSON();
        expect(new URL(route.request().url()).pathname).toContain('/day/2026-05-04/validate');
        if (matchesSupper) schedule.days[0].status = 2;
        await route.fulfill({
          json: { data: { message: 'Cooking status updated', mealMarkedCooked: matchesSupper } },
        });
      });

      await page.goto('/recipes');
      await page.getByTestId(`recipe-card-${recipeId}`).click();
      await page.getByTestId('time-cook-btn').click();
      await page.getByTestId('cooks-mode-step-next').click();
      await expect(page.getByTestId('cooks-mode-step-next')).toHaveAccessibleName(
        'Mark recipe as cooked'
      );
      await page.getByTestId('cooks-mode-step-next').click();
      await expect(page.getByTestId('cooks-mode-overlay')).toHaveCount(0);
      expect(cookingRequest).toEqual({ status: 2, recipeId });

      await page.goto('/home');
      if (matchesSupper) {
        await expect(page.getByTestId('cooked-success-card')).toBeVisible();
      } else {
        await expect(page.getByTestId('tonight-menu-card')).toBeVisible();
        await expect(page.getByTestId('cooked-success-card')).toHaveCount(0);
        await expect(page.getByTestId('cooked-compact-badge')).toHaveCount(0);
      }
    });
  }

  for (const viewport of [
    { width: 320, height: 700 },
    { width: 375, height: 812 },
    { width: 390, height: 844 },
    { width: 1180, height: 820 },
  ]) {
    test(`single-page reading position and compact headings at ${viewport.width}px`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      await page.route('**/api/recipes/*', async (route) => {
        if (route.request().method() !== 'GET') return route.fallback();
        await route.fulfill({
          json: {
            recipe: {
              ...REALISTIC_RECIPES[MOCK_IDS.RECIPE_SPAGHETTI],
              recipeInstructions: Array.from({ length: 6 }, (_, index) => ({
                '@type': 'HowToStep',
                name: index === 1 ? 'Cook the pasta' : `Step ${index + 1}`,
                text:
                  'Stir gently and keep an eye on the pan. '.repeat(8) + '\n\nServe when ready.',
              })),
            },
          },
        });
      });
      await page.goto('/home');
      await page.getByTestId('cook-mode-btn').click();
      await expect(page.getByTestId('cooks-mode-overlay')).toBeVisible();
      await collapseDevelopmentBadge(page);
      const ingredient = page.getByTestId('ingredient-toggle').first();
      await ingredient.click();
      await page.getByTestId('cooks-mode-step-next').click();
      const list = page.getByTestId('all-steps-recipe-list');
      await expect(list).toBeVisible();
      await expect(page.getByRole('heading', { name: /^Step \d+$/ })).toHaveCount(0);
      await expect(page.getByRole('heading', { name: 'Cooking steps' })).toHaveCount(0);
      await expect(page.getByRole('heading', { name: 'Cook the pasta' })).toHaveCount(1);
      const untitledBody = page.getByTestId('single-page-step-body-1');
      await expect(untitledBody.locator('p')).toHaveCount(2);
      const pencil = page.getByTestId('single-page-edit-step-1');
      const pencilBounds = (await pencil.boundingBox())!;
      const bodyBounds = (await untitledBody.boundingBox())!;
      const cardBounds = (await page.getByTestId('single-page-step-1').boundingBox())!;
      expect(pencilBounds.width).toBeGreaterThanOrEqual(44);
      expect(pencilBounds.height).toBeGreaterThanOrEqual(44);
      expect(bodyBounds.width / cardBounds.width).toBeGreaterThan(0.75);
      expect(pencilBounds.y - bodyBounds.y).toBeLessThan(10);

      await expect(page.getByTestId('cooks-mode-step-next')).toHaveText('Cooked');
      const completion = page.getByTestId('cooks-mode-step-next');
      await expect(completion).toHaveAccessibleName('Mark recipe as cooked');
      await expect(completion.locator('svg')).toHaveCount(0);
      const buttonBounds = await completion.boundingBox();
      const footerBounds = await page.getByTestId('cooks-mode-controls').boundingBox();
      expect(buttonBounds!.height).toBeGreaterThanOrEqual(44);
      expect(footerBounds!.height).toBeLessThanOrEqual(80);
      await page.screenshot({ path: testInfo.outputPath('single-page-cooking.png') });
      const scroll = page.getByTestId('cooks-mode-instructions');
      await scroll.evaluate((surface) => {
        const row = surface.querySelector<HTMLElement>('[data-cooking-step="3"]')!;
        surface.scrollTop +=
          row.getBoundingClientRect().top - surface.getBoundingClientRect().top - 16;
      });
      await expect(page.getByTestId('cooks-mode-step-indicator')).toHaveText('3 / 6');
      await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3');
      const readingOffset = await scroll.evaluate((surface) => surface.scrollTop);
      await page.getByTestId('cooks-mode-step-prev').click();
      await expect(ingredient).toHaveAttribute('aria-checked', 'true');
      await expect(page.getByTestId('cooks-mode-step-next')).toHaveText('Resume steps');
      await page.getByTestId('cooks-mode-step-next').click();
      await expect(page.getByTestId('cooks-mode-step-indicator')).toHaveText('3 / 6');
      await expect.poll(() => scroll.evaluate((surface) => surface.scrollTop)).toBe(readingOffset);
      await page.getByTestId('close-cooks-mode').click();
      await page.getByTestId('cook-mode-btn').click();
      await collapseDevelopmentBadge(page);
      await expect(page.getByTestId('cooks-mode-step-indicator')).toHaveText('3 / 6');
      await expect
        .poll(() =>
          scroll.evaluate((surface) => {
            const row = surface.querySelector<HTMLElement>('[data-cooking-step="3"]')!;
            return Math.round(
              row.getBoundingClientRect().top - surface.getBoundingClientRect().top
            );
          })
        )
        .toBe(16);
      await scroll.evaluate((surface) => {
        surface.scrollTop = surface.scrollHeight;
      });
      await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '6');
      await expect(page.getByTestId('cooks-mode-celebration')).toHaveCount(0);
      await scroll.evaluate((surface) => {
        surface.scrollTop = 0;
      });
      await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
      await expect
        .poll(() => list.evaluate((element) => element.scrollWidth <= element.clientWidth))
        .toBe(true);
    });
  }

  // HowToSection[] step parsing (home + planner entry points) is covered by
  // CooksMode.test.tsx. Only the Done → celebration → /home navigation seam
  // requires a real browser.

  // ── Done → celebration → /home navigation seam ──────────────────────────

  test('completing all steps shows celebration overlay then navigates to /home', async ({
    page,
  }) => {
    await page.route(
      (url) => url.pathname.includes('/api/schedule') && !url.pathname.includes('smart-defaults'),
      async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(buildSpaghettiSchedule()),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: { message: 'ok' } }),
          });
        }
      }
    );

    await page.goto('/home');
    await expect(page.getByTestId('home-loader')).not.toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('tonight-menu-card')).toBeVisible({ timeout: 10_000 });

    await page.getByTestId('cook-mode-btn').click();
    await expect(page.getByTestId('cooks-mode-step-next')).toBeVisible({ timeout: 15_000 });

    // Step through all steps until Cooked appears
    let isDone = false;
    for (let i = 0; i < 20; i++) {
      const nextBtn = page.getByTestId('cooks-mode-step-next');
      const label = await nextBtn.textContent();
      if (label?.toLowerCase().includes('cooked')) {
        isDone = true;
        break;
      }
      await nextBtn.click();
      await expect(nextBtn).toBeVisible();
    }
    expect(isDone).toBe(true);

    await page.getByTestId('cooks-mode-step-next').click();

    await expect(page.getByTestId('cooks-mode-celebration')).toBeVisible({ timeout: 2_000 });
    await expect(page).toHaveURL(/\/home/, { timeout: 5_000 });
  });
});
