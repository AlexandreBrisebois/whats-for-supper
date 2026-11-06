import { test, expect } from './fixtures';
import { setupCommonRoutes, builders, MOCK_IDS } from './mock-api';
import path from 'node:path';
import fs from 'node:fs';

const recipe = MOCK_IDS.RECIPE_SPAGHETTI;
const reference = '2026-05-04';

async function fixture(
  page: import('@playwright/test').Page,
  options: Parameters<typeof setupCommonRoutes>[2] = {},
  generic = false
) {
  const calendar = builders.deploymentCalendar({
    today: '2026-05-05',
    capturedAtUtc: '2026-05-05T12:00:00Z',
    nextDayAtUtc: '2026-05-06T00:00:00Z',
  });
  await setupCommonRoutes(page, calendar, {
    ...options,
    supperServings: generic
      ? {}
      : {
          knownRecipe: { id: recipe, basis: 2, quantity: 200, ingredient: 'pasta', unit: 'g' },
        },
  });
  await page
    .context()
    .addCookies([
      { name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: process.env.BASE_URL! },
    ]);
  await page.goto('/planner');
  await page.evaluate(async (id) => {
    await fetch(`/api/recipes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Pasta for Friday',
        servings: 2,
        ingredients: ['200 g pasta'],
        recipeInstructions: ['Serve.'],
      }),
    });
  }, recipe);
  await page.evaluate(
    async ({ recipe, reference }) => {
      for (const [dayIndex, recipeId] of [
        [1, '550e8400-e29b-41d4-a716-446655440002'],
        [2, recipe],
        [4, recipe],
      ]) {
        await fetch(`/api/schedule/assign?referenceWeekStartDate=${reference}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ weekOffset: 0, dayIndex, recipeId }),
        });
      }
    },
    { recipe, reference }
  );
  await page.reload();
  await page.goto('/profile/settings');
  await page.getByTestId('usual-portions-automatic').uncheck();
  await page.getByTestId('usual-portions-input').fill('4');
  await page.getByTestId('save-usual-portions').click();
  await expect(page.getByTestId('save-usual-portions')).toBeDisabled();
  await page.goto('/planner');
  await page.getByTestId('at-the-table-mode').click();
  await page.getByTestId('portion-input-2026-05-08').fill('6');
  await page.getByTestId('save-portions').click();
  await expect(page.getByTestId('portions-editor')).toHaveCount(0);
  return calendar;
}

async function read(page: import('@playwright/test').Page) {
  return page.evaluate(
    async (reference) =>
      (await (await fetch(`/api/schedule?referenceWeekStartDate=${reference}`)).json()).data,
    reference
  );
}

test('prepares only captured Friday with six portions and Tuesday actual date; prepared reading offers no repeat completion', async ({
  page,
}) => {
  await fixture(page);
  const before = await read(page);
  const writes: { url: string; body: any }[] = [];
  page.on('request', (request) => {
    if (
      request.method() === 'POST' &&
      /\/(prepare|validate)$/.test(new URL(request.url()).pathname)
    )
      writes.push({ url: request.url(), body: request.postDataJSON() });
  });
  await page.getByTestId('day-card-4').getByTestId('edit-recipe-button').click();
  await page.getByTestId('action-cooks-mode').click();
  await expect(page.getByTestId('cooking-portion-context')).toContainText('6 portions');
  await page.getByTestId('cooks-mode-step-next').click();
  await page.getByRole('button', { name: 'Mark recipe as cooked' }).click();
  await expect.poll(async () => (await read(page)).days[4].status).toBe(2);
  const after = await read(page);
  expect(after.days[1]).toEqual(before.days[1]);
  expect(after.days[2]).toEqual(before.days[2]);
  expect(after.days[4].occurrenceId).toBe(before.days[4].occurrenceId);
  expect(after.days[4].preparation).toMatchObject({
    preparedOn: '2026-05-05',
    servings: 6,
    portionContext: 'dated',
  });
  expect(writes).toHaveLength(1);
  expect(writes[0].url).toContain('/day/2026-05-08/prepare');
  expect(writes[0].body.expectedOccurrenceId).toBe(before.days[4].occurrenceId);
  await expect(page.getByTestId('cooks-mode-overlay')).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId('day-card-4')).toContainText('Already prepared');
  await page.getByTestId('day-card-4').getByTestId('edit-recipe-button').click();
  await expect(page.getByTestId('recipe-detail-sheet')).toContainText('Prepared');
  await page.getByTestId('action-cooks-mode').click();
  await expect(page.getByTestId('cooks-mode-overlay')).toContainText('Already prepared');
  await page.getByTestId('cooks-mode-step-next').click();
  await expect(page.getByRole('button', { name: 'Mark recipe as cooked' })).toHaveCount(0);
});

async function openCooking(page: import('@playwright/test').Page) {
  await page.getByTestId('day-card-4').getByTestId('edit-recipe-button').click();
  await page.getByTestId('action-cooks-mode').click();
  await expect(page.getByTestId('cooking-portion-context')).toContainText('6');
  await page.getByTestId('cooks-mode-step-next').click();
}

for (const fault of ['lost reply', 'publication failure'] as const) {
  test(`reconciles ${fault} with one preparation and the original committed receipt`, async ({
    page,
  }) => {
    await fixture(
      page,
      fault === 'lost reply'
        ? { schedulePreparationReplyLost: () => true }
        : { schedulePostCommitFailure: (operation) => operation === 'prepare' }
    );
    let posts = 0;
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().endsWith('/prepare')) posts++;
    });
    await openCooking(page);
    await page.getByRole('button', { name: 'Mark recipe as cooked' }).click();
    await expect(page.getByTestId('cooks-mode-overlay')).toHaveCount(0);
    expect(posts).toBe(1);
    const day = (await read(page)).days[4];
    expect(day.preparation).toMatchObject({ preparedOn: '2026-05-05', servings: 6 });
    await expect(page.getByTestId('day-card-4')).toContainText('Already prepared');
  });
}

for (const fault of ['negative', 'known conflict', 'unavailable reread'] as const) {
  test(`keeps work through ${fault} until explicit review and a separate completion`, async ({
    page,
  }) => {
    await fixture(page);
    let writes = 0;
    let attempted = false;
    let readUnavailable = fault === 'unavailable reread';
    await page.route('**/api/schedule/day/*/prepare', async (route) => {
      writes++;
      if (!attempted) {
        attempted = true;
        return route.fulfill({
          status: fault === 'known conflict' ? 409 : 504,
          json: { message: 'Unconfirmed' },
        });
      }
      return route.fallback();
    });
    await page.route('**/api/recipes/*/ingredient-projection*', async (route) => {
      if (attempted && readUnavailable)
        return route.fulfill({ status: 500, json: { message: 'Read unavailable' } });
      return route.fallback();
    });
    await openCooking(page);
    await page.getByRole('button', { name: 'Mark recipe as cooked' }).click();
    const completionError = page.getByTestId('cooks-mode-overlay').getByRole('alert').filter({
      hasText: 'Could not save cooking completion. Please try again.',
    });
    await expect(completionError).toBeVisible();
    await expect(page.getByTestId('cooks-mode-instructions')).toContainText('Serve.');
    if (readUnavailable) {
      await page.getByRole('button', { name: 'Check preparation' }).click();
      // Keep the read fault active until this recovery attempt has finished.
      // A click acknowledgement is not the asynchronous read acknowledgement.
      await expect(completionError).toBeVisible();
      await expect(page.getByRole('button', { name: 'Check preparation' })).toBeEnabled();
      expect(writes).toBe(1);
      readUnavailable = false;
      await page.getByRole('button', { name: 'Check preparation' }).click();
    }
    await page.getByRole('button', { name: 'Review current supper' }).click();
    await expect(page.getByRole('button', { name: 'Mark recipe as cooked' })).toBeEnabled();
    expect(writes).toBe(1);
    expect((await read(page)).days[4].status).not.toBe(2);
    await page.getByRole('button', { name: 'Mark recipe as cooked' }).click();
    await expect(page.getByTestId('cooks-mode-overlay')).toHaveCount(0);
    expect(writes).toBe(2);
  });
}

test('stale portions retain displayed quantities until explicit refresh and use new source guards', async ({
  page,
}) => {
  await fixture(page);
  let writes = 0;
  const requests: any[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/prepare')) {
      writes++;
      requests.push(request.postDataJSON());
    }
  });
  await openCooking(page);
  await page.evaluate(async () => {
    const state = (
      await (await fetch('/api/schedule/servings?referenceWeekStartDate=2026-05-04')).json()
    ).data;
    await fetch('/api/schedule/servings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        referenceWeekStartDate: '2026-05-04',
        weekOffset: 0,
        expectedVersion: state.version,
        days: [{ date: '2026-05-08', servings: 8 }],
      }),
    });
  });
  await expect(page.getByTestId('cooking-quantities-available')).toBeVisible();
  await expect(page.getByTestId('cooking-portion-context')).toContainText('6 portions');
  await page.getByRole('button', { name: 'Mark recipe as cooked' }).click();
  expect(writes).toBe(0);
  await page.getByRole('button', { name: 'Refresh quantities' }).click();
  await expect(page.getByTestId('cooking-portion-context')).toContainText('8 portions');
  await expect(page.getByTestId('cooks-mode-instructions')).toContainText('Serve.');
  await page.getByRole('button', { name: 'Mark recipe as cooked' }).click();
  await expect(page.getByTestId('cooks-mode-overlay')).toHaveCount(0);
  expect(writes).toBe(1);
  expect(requests[0].expectedServingVersion).toMatch(/^[A-F0-9]{64}$/);
  expect((await read(page)).days[4].preparation.servings).toBe(8);
});

test('recreated same-recipe occurrence cannot be adopted by recovery', async ({ page }) => {
  await fixture(page);
  let writes = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/prepare')) writes++;
  });
  const before = (await read(page)).days[4];
  await openCooking(page);
  await page.evaluate(
    async ({ recipe }) => {
      await fetch('/api/schedule/day/2026-05-08/remove', { method: 'DELETE' });
      await fetch('/api/schedule/assign?referenceWeekStartDate=2026-05-04', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekOffset: 0, dayIndex: 4, recipeId: recipe }),
      });
    },
    { recipe }
  );
  const current = (await read(page)).days[4];
  expect(current.occurrenceId).not.toBe(before.occurrenceId);
  await page.getByRole('button', { name: 'Mark recipe as cooked' }).click();
  await page.getByRole('button', { name: 'Review current supper' }).click();
  await expect(
    page.getByText('Could not review this supper. Your cooking work is kept.')
  ).toBeVisible();
  expect(writes).toBe(1);
  expect((await read(page)).days[4].preparation).toBeNull();
});

test('planned-day Home, Planner, detail and table retain frozen prepared context after usual-size changes', async ({
  page,
}) => {
  const calendar = await fixture(page);
  await openCooking(page);
  await page.getByRole('button', { name: 'Mark recipe as cooked' }).click();
  await expect(page.getByTestId('cooks-mode-overlay')).toHaveCount(0);
  await page.evaluate(async () => {
    const state = (
      await (await fetch('/api/schedule/servings?referenceWeekStartDate=2026-05-04')).json()
    ).data;
    await fetch('/api/schedule/servings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        referenceWeekStartDate: '2026-05-04',
        weekOffset: 0,
        expectedVersion: state.version,
        defaultServings: 5,
        days: [],
      }),
    });
  });
  expect(
    await page.evaluate(
      async () =>
        (await (await fetch('/api/schedule/servings?referenceWeekStartDate=2026-05-04')).json())
          .data.defaultServings
    )
  ).toBe(5);
  Object.assign(calendar, {
    today: '2026-05-08',
    capturedAtUtc: '2026-05-08T12:00:00Z',
    nextDayAtUtc: '2026-05-09T00:00:00Z',
  });
  await page.goto('/home');
  await expect(page.getByTestId('preparation-status')).toContainText('Already prepared');
  await expect(page.getByTestId('preparation-status')).toContainText('Tuesday');
  await page.getByTestId('preparation-status').click();
  await expect(page.getByTestId('cooking-portion-context')).toContainText('6 portions');
  await page.getByTestId('cooks-mode-step-next').click();
  await expect(page.getByRole('button', { name: 'Mark recipe as cooked' })).toHaveCount(0);
  await page.getByTestId('close-cooks-mode').click();
  await page.goto('/planner');
  await expect(page.getByTestId('day-card-4')).toContainText('Already prepared');
  await page.getByTestId('at-the-table-mode').click();
  await expect(page.getByTestId('portion-input-2026-05-08')).toBeDisabled();
  await expect(page.getByTestId('portion-input-2026-05-08')).toHaveValue('6');
});

test('generic common-fixture cooking prepares from its current source context', async ({
  page,
}) => {
  await fixture(page, {}, true);
  let posts = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/prepare')) posts++;
  });
  await openCooking(page);
  await page.getByRole('button', { name: 'Mark recipe as cooked' }).click();
  await expect(page.getByTestId('cooks-mode-overlay')).toHaveCount(0);
  expect(posts).toBe(1);
  expect((await read(page)).days[4].preparation).toMatchObject({
    servings: 6,
    originalServings: 2,
    preparedOn: '2026-05-05',
  });
});

for (const appLocale of ['en', 'fr'] as const) {
  test.describe(`prepared rendered ${appLocale}`, () => {
    test.use({ appLocale, reducedMotion: 'reduce' });
    for (const [width, height, enlarged] of [
      [390, 844, false],
      [820, 1180, false],
      [320, 844, true],
    ] as const) {
      test(`${width}px ${enlarged ? '200 percent text' : 'normal text'}`, async ({
        page,
      }, testInfo) => {
        testInfo.setTimeout(60_000);
        await page.setViewportSize({ width, height });
        await fixture(page);
        const directory = path.resolve('..', '.task/supper-servings/group5/recovery/renders');
        fs.mkdirSync(directory, { recursive: true });
        const prefix = `${appLocale}-${width}-${enlarged ? '200' : '100'}`;
        const evidence: any[] = [];
        async function capture(surface: string, testid: string) {
          console.log('Rendered capture', prefix, surface);
          const root = page.getByTestId(testid);
          await expect(root).toBeVisible();
          if (enlarged)
            await root.evaluate((element) => {
              const nodes = [
                element,
                ...element.querySelectorAll<HTMLElement>('*'),
              ] as HTMLElement[];
              const values = nodes.map((node) => {
                const style = getComputedStyle(node);
                return [parseFloat(style.fontSize), parseFloat(style.lineHeight)];
              });
              nodes.forEach((node, index) => {
                node.style.fontSize = `${values[index][0] * 2}px`;
                if (Number.isFinite(values[index][1]))
                  node.style.lineHeight = `${values[index][1] * 2}px`;
              });
            });
          if (surface === 'recovery')
            await root.getByTestId('preparation-review').scrollIntoViewIfNeeded();
          if (surface === 'planner' || surface === 'detail')
            await root
              .getByTestId('preparation-status')
              .evaluate((element) => element.scrollIntoView({ block: 'center' }));
          const dock =
            surface === 'planner' && (await page.getByTestId('app-bottom-navigation').isVisible())
              ? await page.getByTestId('app-bottom-navigation').boundingBox()
              : null;
          const measures = await root.evaluate((element) => ({
            width: innerWidth,
            height: innerHeight,
            documentWidth: document.documentElement.scrollWidth,
            surfaceWidth: element.clientWidth,
            surfaceScrollWidth: element.scrollWidth,
            text: element.textContent,
          }));
          expect(measures.documentWidth).toBeLessThanOrEqual(width);
          expect(measures.surfaceScrollWidth).toBeLessThanOrEqual(measures.surfaceWidth);
          const labels = await root
            .locator(
              '[data-testid="preparation-status"], [data-testid="preparation-review"], [data-testid="cooks-mode-controls"]'
            )
            .evaluateAll((elements) =>
              elements.map((element) => {
                const box = element.getBoundingClientRect();
                const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
                const rects: { left: number; right: number; top: number; bottom: number }[] = [];
                let node: Node | null;
                while ((node = walker.nextNode())) {
                  if (!node.textContent?.trim()) continue;
                  const range = document.createRange();
                  range.selectNodeContents(node);
                  for (const rect of range.getClientRects())
                    rects.push({
                      left: rect.left,
                      right: rect.right,
                      top: rect.top,
                      bottom: rect.bottom,
                    });
                }
                return {
                  text: element.textContent,
                  left: box.left,
                  right: box.right,
                  top: box.top,
                  bottom: box.bottom,
                  scrollWidth: element.scrollWidth,
                  clientWidth: element.clientWidth,
                  scrollHeight: element.scrollHeight,
                  clientHeight: element.clientHeight,
                  rects,
                };
              })
            );
          for (const label of labels) {
            expect(label.scrollWidth).toBeLessThanOrEqual(label.clientWidth + 1);
            expect(label.scrollHeight).toBeLessThanOrEqual(label.clientHeight + 1);
            for (const rect of label.rects) {
              expect(rect.left).toBeGreaterThanOrEqual(label.left - 1);
              expect(rect.right).toBeLessThanOrEqual(label.right + 1);
              expect(rect.right).toBeLessThanOrEqual(width + 1);
              expect(rect.top).toBeGreaterThanOrEqual(label.top - 1);
              if (surface === 'planner') {
                expect(rect.top).toBeGreaterThanOrEqual(0);
                expect(rect.bottom).toBeLessThanOrEqual(dock?.y ?? height);
              }
              expect(rect.bottom).toBeLessThanOrEqual(label.bottom + 1);
            }
          }
          evidence.push({ surface, ...measures, labels, dock });
          await page.screenshot({
            path: path.join(directory, `${prefix}-${surface}.png`),
            animations: 'disabled',
          });
        }
        await page.getByTestId('day-card-4').getByTestId('edit-recipe-button').click();
        await page.getByTestId('action-cooks-mode').click();
        await page.getByTestId('cooks-mode-step-next').click();
        let first = true;
        await page.route('**/api/schedule/day/*/prepare', async (route) => {
          if (first) {
            first = false;
            return route.fulfill({ status: 409, json: { message: 'Changed plan' } });
          }
          return route.fallback();
        });
        await page.getByTestId('cooks-mode-step-next').click();
        const review = page.getByRole('button', {
          name: appLocale === 'fr' ? 'Vérifier ce souper' : 'Review current supper',
          exact: true,
        });
        await expect(review).toBeVisible();
        await capture('recovery', 'cooks-mode-overlay');
        await expect(review).toBeInViewport();
        const reading = page.getByTestId('cooks-mode-instructions');
        expect((await reading.boundingBox())!.height).toBeGreaterThan(44);
        const cookingReach = await reading.evaluate((element) => {
          const retained = element.scrollTop;
          element.scrollTop = 0;
          const top = element.scrollTop;
          element.scrollTop = element.scrollHeight;
          const result = {
            top,
            bottom: element.scrollTop,
            height: element.clientHeight,
            scrollHeight: element.scrollHeight,
          };
          element.scrollTop = retained;
          return result;
        });
        expect(cookingReach.top).toBe(0);
        expect(cookingReach.bottom + cookingReach.height).toBeGreaterThanOrEqual(
          cookingReach.scrollHeight - 2
        );
        evidence.push({ surface: 'cooking-content-reachable', ...cookingReach });
        const controls = page.getByTestId('cooks-mode-controls');
        await expect(controls).toBeInViewport();
        const footer = await controls.boundingBox();
        expect(footer!.y + footer!.height).toBeLessThanOrEqual(height + 1);
        for (const button of await controls.getByRole('button').all()) {
          expect(
            await button.evaluate((element) => element.scrollWidth <= element.clientWidth)
          ).toBe(true);
        }
        await review.click();
        await expect(page.getByTestId('cooks-mode-step-next')).toBeEnabled();
        await page.getByTestId('cooks-mode-step-next').click();
        await expect(page.getByTestId('cooks-mode-overlay')).toHaveCount(0);
        await page.getByTestId('action-close-sheet').click();
        await expect(page.getByTestId('recipe-detail-sheet')).toHaveCount(0);
        await page.getByTestId('day-card-4').scrollIntoViewIfNeeded();
        await expect(page.getByTestId('day-card-4')).toContainText(
          appLocale === 'fr' ? 'Déjà préparé' : 'Already prepared'
        );
        await capture('planner', 'day-card-4');
        await page.getByTestId('day-card-4').getByTestId('edit-recipe-button').click();
        const sheet = page.getByTestId('recipe-detail-sheet');
        await expect(sheet.getByTestId('preparation-status')).toBeVisible();
        await sheet.getByTestId('preparation-status').scrollIntoViewIfNeeded();
        await capture('detail', 'recipe-detail-sheet');
        const detailReading = page.getByTestId('recipe-detail-reading');
        const detailReach = await detailReading.evaluate((element) => {
          element.scrollTop = element.scrollHeight;
          return {
            scrollTop: element.scrollTop,
            height: element.clientHeight,
            scrollHeight: element.scrollHeight,
          };
        });
        expect(detailReach.scrollTop + detailReach.height).toBeGreaterThanOrEqual(
          detailReach.scrollHeight - 2
        );
        await expect(page.getByTestId('action-cooks-mode')).toBeInViewport();
        evidence.push({ surface: 'detail-bottom-reachable', ...detailReach });
        await page.getByTestId('action-cooks-mode').click();
        await expect(
          page.getByTestId('cooks-mode-overlay').getByTestId('preparation-status')
        ).toBeVisible();
        await capture('prepared-reading', 'cooks-mode-overlay');
        if (await page.getByTestId('cooks-mode-step-next').count())
          await page.getByTestId('cooks-mode-step-next').click();
        await expect(page.getByTestId('cooks-mode-step-next')).toHaveCount(0);
        fs.writeFileSync(
          path.join(directory, `${prefix}-metrics.json`),
          JSON.stringify(evidence, null, 2)
        );
        await testInfo.attach('Rendered text and reflow', {
          body: JSON.stringify(evidence),
          contentType: 'application/json',
        });
      });
    }
  });
}

for (const changed of ['count', 'source', 'identity'] as const) {
  test(`actual raced ${changed} conflict retains checks, reading and instruction draft`, async ({
    page,
  }) => {
    await fixture(page);
    let writes = 0;
    await page.route('**/api/schedule/day/*/prepare', async (route) => {
      writes++;
      if (writes === 1)
        await page.evaluate(
          async ({ changed, recipe }) => {
            if (changed === 'count') {
              const state = (
                await (
                  await fetch('/api/schedule/servings?referenceWeekStartDate=2026-05-04')
                ).json()
              ).data;
              await fetch('/api/schedule/servings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  referenceWeekStartDate: '2026-05-04',
                  weekOffset: 0,
                  expectedVersion: state.version,
                  days: [{ date: '2026-05-08', servings: 8 }],
                }),
              });
            } else if (changed === 'source') {
              await fetch(`/api/recipes/${recipe}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ servings: 3 }),
              });
            } else {
              await fetch('/api/schedule/day/2026-05-08/remove', { method: 'DELETE' });
              await fetch('/api/schedule/assign?referenceWeekStartDate=2026-05-04', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ weekOffset: 0, dayIndex: 4, recipeId: recipe }),
              });
            }
          },
          { changed, recipe }
        );
      return route.fallback();
    });
    await page.getByTestId('day-card-4').getByTestId('edit-recipe-button').click();
    await page.getByTestId('action-cooks-mode').click();
    await page.getByTestId('ingredient-toggle').first().click();
    await page.getByTestId('cooks-mode-step-next').click();
    await page.getByRole('button', { name: 'Mark recipe as cooked' }).click();
    await expect(page.getByTestId('preparation-review')).toBeVisible();
    await page.getByTestId('single-page-edit-step-1').click();
    const draft = page.getByTestId('cooks-mode-overlay').getByRole('textbox');
    await draft.fill('Keep my correction while the supper changes');
    await page.getByRole('button', { name: 'Review current supper' }).click();
    if (changed === 'identity') {
      await expect(
        page.getByText('Could not review this supper. Your cooking work is kept.')
      ).toBeVisible();
    } else {
      await page.getByRole('button', { name: 'Refresh quantities' }).click();
      await expect(page.getByTestId('cooking-portion-context')).toContainText(
        changed === 'count' ? '8 portions' : '6 portions'
      );
      await expect(page.getByTestId('preparation-review')).toHaveCount(0);
    }
    await expect(draft).toHaveValue('Keep my correction while the supper changes');
    await expect(page.getByTestId('cooks-mode-step-indicator')).toContainText('1');
    expect(writes).toBe(1);
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByRole('button', { name: 'View adjusted ingredients' }).click();
    await expect(page.getByTestId('ingredient-toggle').first()).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect((await read(page)).days[4].preparation).toBeNull();
  });
}
