import { test, expect } from './fixtures';
import {
  setupCommonRoutes,
  builders,
  MOCK_IDS,
  mockNonCookingSchedule,
  mockSupperServings,
} from './mock-api';

async function surfaceContrast(locator: import('@playwright/test').Locator) {
  return locator.evaluate((el) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const paint = canvas.getContext('2d')!;
    const rgba = (value: string) => {
      paint.clearRect(0, 0, 1, 1);
      paint.fillStyle = value;
      paint.fillRect(0, 0, 1, 1);
      const pixel = Array.from(paint.getImageData(0, 0, 1, 1).data);
      return [pixel[0], pixel[1], pixel[2], pixel[3] / 255];
    };
    const blend = (top: number[], bottom: number[]) =>
      top.slice(0, 3).map((c, i) => c * (top[3] ?? 1) + bottom[i] * (1 - (top[3] ?? 1)));
    const parents: Element[] = [];
    for (let node: Element | null = el; node; node = node.parentElement) parents.unshift(node);
    let background = [255, 255, 255];
    for (const node of parents)
      background = blend(rgba(getComputedStyle(node).backgroundColor), background);
    const text = blend(rgba(getComputedStyle(el).color), background);
    const luminance = (rgb: number[]) =>
      rgb
        .map((c) => {
          const v = c / 255;
          return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        })
        .reduce((total, value, i) => total + value * [0.2126, 0.7152, 0.0722][i], 0);
    const a = luminance(text),
      b = luminance(background);
    return { text, background, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
  });
}

async function contextFixture(page: import('@playwright/test').Page, configured = true) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.context().addCookies([
    {
      name: 'x-family-member-id',
      value: MOCK_IDS.MEMBER_ALEX,
      url: process.env.BASE_URL || 'http://127.0.0.1:3000',
    },
  ]);
  await page.addInitScript(() =>
    document.addEventListener(
      'DOMContentLoaded',
      () => {
        const style = document.createElement('style');
        style.textContent = 'nextjs-portal{display:none}';
        document.head.append(style);
      },
      { once: true }
    )
  );
  const common = await setupCommonRoutes(page);
  const schedule = builders.scheduleDays() as any;
  for (const i of [2, 4])
    schedule.days[i].recipe = builders.scheduleRecipe({
      id: MOCK_IDS.RECIPE_CARBONARA,
      name: 'Pasta for two',
      image: '',
    });
  await mockNonCookingSchedule(page, schedule);
  const control = await mockSupperServings(page, () => schedule, {
    readFamilyCount: common.readFamilyCount,
    delayed: true,
    knownRecipe: {
      id: MOCK_IDS.RECIPE_CARBONARA,
      basis: 2,
      quantity: 200,
      unit: 'g',
      ingredient: 'pasta',
    },
  });
  await page.route(`**/api/recipes/${MOCK_IDS.RECIPE_CARBONARA}`, (route) =>
    route.request().method() === 'GET'
      ? route.fulfill({
          json: {
            recipe: builders.recipe({
              id: MOCK_IDS.RECIPE_CARBONARA,
              name: 'Pasta for two',
              imageUrl: null,
              servings: 2,
              notes: 'Family note: keep the sauce for serving.',
              sourceType: 'url',
              sourceUrl: 'https://example.test/original-pasta',
              ingredients: ['200 g pasta'],
              recipeInstructions: [
                {
                  '@type': 'HowToSection',
                  name: 'Pasta',
                  itemListElement: [
                    { '@type': 'HowToStep', text: 'Add 200 g pasta.' },
                    { '@type': 'HowToStep', text: 'Serve.' },
                  ],
                },
              ] as any,
            }),
            updatedAt: '2026-05-04T12:00:00Z',
          },
        })
      : route.fallback()
  );
  await page.goto('/planner');
  if (!configured) {
    await expect(page.getByTestId('day-card-2')).toContainText('Pasta for two');
    return { schedule, control };
  }
  await page.goto('/profile/settings');
  await page.getByTestId('usual-portions-automatic').uncheck();
  await page.getByTestId('usual-portions-input').fill('4');
  await page.getByTestId('save-usual-portions').click();
  await expect(page.getByTestId('save-usual-portions')).toBeDisabled();
  await page.goto('/planner');
  await page.getByTestId('at-the-table-mode').click();
  await page.getByTestId('portion-input-2026-05-08').fill('6');
  await page.getByTestId('save-portions').click();
  await expect(page.getByTestId('at-the-table-mode')).toBeVisible();
  return { schedule, control };
}

test('assigned detail and cooking keep separate dated quantities without completion or count writes', async ({
  page,
}, info) => {
  const { schedule } = await contextFixture(page);
  const writes: string[] = [];
  page.on('request', (req) => {
    if (req.method() !== 'GET' && /\/api\/(schedule|recipes)/.test(new URL(req.url()).pathname))
      writes.push(req.url());
  });
  for (const [index, amount, count] of [
    [2, 400, 4],
    [4, 600, 6],
  ]) {
    await page.getByTestId(`day-card-${index}`).getByTestId('edit-recipe-button').click();
    await expect(page.getByTestId('recipe-ingredient-projection')).toContainText(
      `${amount} g pasta`
    );
    await page.getByTestId('action-cooks-mode').click();
    await expect(page.getByTestId('ingredient-toggle')).toContainText(`${amount} g pasta`);
    await expect(page.getByTestId('cooking-portion-context')).toContainText(`${count} portions`);
    await expect(page.getByTestId('cooking-instruction-limitation')).toContainText(
      'step amounts remain original'
    );
    await page.screenshot({
      path: info.outputPath(`assigned-${count}-phone.png`),
      animations: 'disabled',
    });
    await page.getByTestId('cooks-mode-step-next').click();
    await expect(
      page.getByTestId('cooks-mode-overlay').getByText('Add 200 g pasta.', { exact: true })
    ).toBeVisible();
    await page.getByTestId('close-cooks-mode').click();
    await page.getByTestId('action-close-sheet').click();
  }
  expect(writes).toEqual([]);
  expect(schedule.days[2].status).toBe(0);
  expect(schedule.days[4].status).toBe(0);
});

test('saved portions announce explicit cooking refresh while grocery work is held or failed', async ({
  page,
}, info) => {
  const { control } = await contextFixture(page);
  await page.getByTestId('day-card-2').getByTestId('edit-recipe-button').click();
  await page.getByTestId('action-cooks-mode').click();
  await expect(page.getByTestId('ingredient-toggle')).toContainText('400 g pasta');
  await page.getByTestId('ingredient-toggle').click();
  await page.getByTestId('cooks-mode-step-next').click();
  const allSteps = page.getByTestId('cooking-view-all-steps');
  if ((await allSteps.getAttribute('aria-pressed')) === 'false') await allSteps.click();
  await page.getByTestId('single-page-edit-step-1').click();
  const draft = page.getByRole('textbox');
  await draft.fill('Keep my unsaved pasta instruction.');
  const reading = page.getByTestId('cooks-mode-instructions');
  await reading.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  const retainedScroll = await reading.evaluate((el) => el.scrollTop);
  const saveDate = async (date: string, count: number) =>
    page.evaluate(
      async ({ date, count }) => {
        const baseline = await (
          await fetch('/api/schedule/servings?referenceWeekStartDate=2026-05-04&weekOffset=0')
        ).json();
        const result = await fetch('/api/schedule/servings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            referenceWeekStartDate: '2026-05-04',
            weekOffset: 0,
            expectedVersion: baseline.data.version,
            days: [{ date, servings: count }],
          }),
        });
        if (!result.ok) throw new Error('Remote portions were not saved');
      },
      { date, count }
    );
  await saveDate('2026-05-09', 8);
  await expect(page.getByTestId('cooking-quantities-available')).toHaveCount(0);
  await saveDate('2026-05-06', 6);
  const quantitiesNotice = page.getByTestId('cooking-quantities-available');
  await expect(quantitiesNotice).toHaveCount(1);
  expect(await reading.evaluate((el) => el.scrollTop)).toBeGreaterThanOrEqual(retainedScroll);
  await expect(page.getByTestId('cooking-portion-context')).toContainText('4 portions');
  await expect(draft).toHaveValue('Keep my unsaved pasta instruction.');
  // Preserve the reading position until the cook explicitly reaches the notice
  // in the shared instruction scroller (including at large text sizes).
  await quantitiesNotice.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await expect(quantitiesNotice).toBeInViewport();
  control.finishRefresh(true);
  await page.getByRole('button', { name: 'Refresh quantities', exact: true }).click();
  await expect(page.getByTestId('cooking-portion-context')).toContainText('6 portions');
  await expect(draft).toHaveValue('Keep my unsaved pasta instruction.');
  await page.screenshot({
    path: info.outputPath('remote-draft-retained.png'),
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'View adjusted ingredients', exact: true }).click();
  await expect(page.getByTestId('ingredient-toggle')).toContainText('600 g pasta');
  await expect(page.getByTestId('ingredient-toggle')).toHaveAttribute('aria-checked', 'true');
});

test('recreated assigned occurrence exposes changed-plan feedback instead of stale quantities', async ({
  page,
}) => {
  const { schedule } = await contextFixture(page);
  const original = schedule.days[2].occurrenceId;
  schedule.days[2].occurrenceId = MOCK_IDS.RECOVERY_SNAPSHOT;
  await page.goto(
    `/planner?weekOffset=0&referenceWeekStartDate=2026-05-04&planDate=2026-05-06&detailRecipe=${MOCK_IDS.RECIPE_CARBONARA}&detailOccurrence=${original}`
  );
  await expect(page.getByTestId('recipe-detail-reading').getByRole('alert')).toContainText(
    'Could not confirm ingredients'
  );
  await expect(page.getByTestId('recipe-planning-actions').getByRole('alert')).toContainText(
    'Your plan changed'
  );
  await expect(page.getByTestId('recipe-ingredient-projection')).not.toContainText('400 g');
  await expect(page.getByTestId('recipe-servings')).toHaveCount(0);
});

test('pending Planner candidate reads the proposed date portions without a saved occurrence', async ({
  page,
}) => {
  const { schedule } = await contextFixture(page);
  schedule.days[2].recipe = null;
  schedule.days[2].occurrenceId = null;
  schedule.status = 1;
  schedule.votingRoundId = MOCK_IDS.VOTING_ROUND;
  const defaults = {
    weekOffset: 0,
    weekStartDate: '2026-05-04',
    familySize: 3,
    consensusThreshold: 2,
    preSelectedRecipes: [
      {
        dayIndex: 2,
        recipeId: MOCK_IDS.RECIPE_CARBONARA,
        name: 'Pasta candidate',
        heroImageUrl: '',
        voteCount: 3,
        unanimousVote: true,
      },
    ],
  };
  await page.route('**/api/discovery/session', (route) =>
    route.fulfill({
      json: {
        data: {
          incarnationId: MOCK_IDS.MEMBER_TEST,
          revision: 5,
          roundId: MOCK_IDS.VOTING_ROUND,
          weekStartDate: '2026-05-04',
          phase: 'collecting',
          requiredSlots: 6,
          coveredSlots: 1,
          candidateCount: 1,
          smartDefaults: defaults,
        },
      },
    })
  );
  await page.route('**/api/schedule/*/smart-defaults*', (route) =>
    route.fulfill({
      json: {
        data: {
          weekOffset: 0,
          weekStartDate: '2026-05-04',
          familySize: 3,
          consensusThreshold: 2,
          preSelectedRecipes: [
            {
              dayIndex: 2,
              recipeId: MOCK_IDS.RECIPE_CARBONARA,
              name: 'Pasta candidate',
              heroImageUrl: '',
              voteCount: 3,
              unanimousVote: true,
            },
          ],
        },
      },
    })
  );
  await page.reload();
  await expect(page.getByTestId('day-card-2').getByTestId('recipe-name')).toHaveText(
    'Pasta candidate'
  );
  await page.getByTestId('day-card-2').getByTestId('edit-recipe-button').click();
  await expect(page.getByTestId('recipe-ingredient-projection')).toContainText('400 g pasta');
  await expect(page.getByTestId('recipe-portion-context')).toHaveCount(0);
  await expect(page.getByTestId('recipe-servings')).toHaveText('4 servings');
  expect(schedule.days[2].recipe).toBeNull();
});

test('saved Planner detail previews quantities without editing dated portions', async ({
  page,
}) => {
  await contextFixture(page);
  await page.getByTestId('day-card-2').getByTestId('edit-recipe-button').click();
  await expect(page.getByRole('button', { name: 'Adjust portions', exact: true })).toHaveCount(0);
  const writes: string[] = [];
  page.on('request', (request) => {
    if (!['GET', 'HEAD'].includes(request.method())) writes.push(request.url());
  });
  for (const count of [2, 6]) {
    await page.getByRole('button', { name: `Preview ${count} portions`, exact: true }).click();
    await expect(page.getByTestId('recipe-ingredient-preview')).toContainText(
      `${count * 100} g pasta`
    );
    await expect(page.getByTestId('recipe-portion-context')).toHaveCount(0);
    await expect(page.getByTestId('recipe-servings')).toHaveText(`${count} servings`);
  }
  await page.getByRole('button', { name: 'Preview 4 portions', exact: true }).click();
  await expect(page.getByTestId('recipe-ingredient-preview')).toHaveCount(0);
  await expect(page.getByTestId('recipe-original-yield')).toHaveCount(0);
  await expect(page.getByTestId('recipe-ingredient-projection')).toContainText('400 g pasta');
  await page.getByRole('button', { name: 'Preview 2 portions', exact: true }).click();
  await expect(page.getByTestId('recipe-ingredient-preview')).toContainText('200 g pasta');
  await page.getByRole('button', { name: 'Planned quantities', exact: true }).click();
  await expect(page.getByTestId('recipe-ingredient-projection')).toContainText('400 g pasta');
  expect(writes).toEqual([]);
});

test('an already open dated detail follows recipe corrections and rejects a replaced occurrence', async ({
  page,
}) => {
  const { schedule, control } = await contextFixture(page);
  await page.getByTestId('day-card-2').getByTestId('edit-recipe-button').click();
  await expect(page.getByTestId('recipe-ingredient-projection')).toContainText('400 g pasta');
  const patch = async (changes: object) =>
    page.evaluate(
      async ({ id, changes }) => {
        const response = await fetch(`/api/recipes/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(changes),
        });
        return response.status;
      },
      { id: MOCK_IDS.RECIPE_CARBONARA, changes }
    );
  expect(await patch({ servings: 1 })).toBe(200);
  await expect(page.getByTestId('recipe-ingredient-projection')).toContainText('800 g pasta');
  await expect(page.getByTestId('recipe-original-yield')).toHaveCount(0);
  await page.getByTestId('action-gear-menu').click();
  await page.getByRole('button', { name: 'Original quantities', exact: true }).click();
  await expect(page.getByText('Original recipe: 1 serving', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Planned quantities', exact: true }).click();
  control.finishRefresh();
  expect(schedule.groceryItems.find((line: any) => line.normalizedKey === 'pasta').quantity).toBe(
    2000
  );
  expect(await patch({ ingredients: ['current sauce'] })).toBe(200);
  await expect(page.getByTestId('recipe-ingredient-projection')).toContainText('current sauce');
  await expect(page.getByTestId('recipe-ingredient-projection')).not.toContainText('800');
  await expect(
    page.getByText('Some amounts need review. Consult the original recipe.')
  ).toHaveCount(0);
  await page.getByTestId('action-gear-menu').click();
  await page.getByTestId('action-edit-recipe').click();
  await expect(page.getByTestId('recipe-edit-servings-input')).toHaveValue('1');
  await expect(page.getByTestId('recipe-servings')).toContainText('1 serving');
  await expect(page.getByTestId('recipe-edit-ingredient-0')).toHaveValue('current sauce');
  await page.getByTestId('recipe-cancel-edits').click();
  control.finishRefresh();
  expect(schedule.groceryItems[0]).toMatchObject({ quantity: null, quantityComplete: false });
  schedule.days[2].occurrenceId = MOCK_IDS.RECIPE_LASAGNA;
  await page.evaluate(
    (schedule) =>
      (window as any).__sseSource.dispatchEvent(
        new MessageEvent('week_updated', { data: JSON.stringify({ schedule }) })
      ),
    schedule
  );
  await expect(page.getByTestId('recipe-ingredient-projection')).not.toContainText('current sauce');
  await expect(page.getByText('Could not confirm ingredients for this supper.')).toBeVisible();
});

for (const locale of ['en', 'fr'] as const)
  test.describe(`dated reading geometry ${locale}`, () => {
    test.use({ appLocale: locale });
    for (const state of ['configured', 'unconfigured', 'partial'] as const)
      test(`${state} context preserves reading, notes and controls`, async ({ page }, info) => {
        test.setTimeout(120_000);
        await contextFixture(page, state !== 'unconfigured');
        if (state === 'partial') {
          await page.evaluate(async (id) => {
            await fetch(`/api/recipes/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ingredients: ['current sauce'] }),
            });
          }, MOCK_IDS.RECIPE_CARBONARA);
        }
        await page.getByTestId('day-card-2').getByTestId('edit-recipe-button').click();
        await expect(page.getByTestId('recipe-servings')).toBeVisible();
        await expect(page.getByTestId('recipe-detail-sheet')).toHaveCSS('opacity', '1');
        const metrics: unknown[] = [];
        for (const [width, height, scale] of [
          [390, 844, 1],
          [320, 740, 2],
          [844, 390, 2],
          [834, 1112, 2],
          [1112, 834, 1],
        ]) {
          await page.setViewportSize({ width, height });
          await page.evaluate((scale) => {
            document.documentElement.style.fontSize = `${scale * 16}px`;
          }, scale);
          const reading = page.getByTestId('recipe-detail-reading');
          await reading.evaluate((el) => {
            el.scrollTop = 0;
          });
          await page.evaluate(() => document.fonts.ready);
          const measure = await page.getByTestId('recipe-detail-sheet').evaluate((el) => {
            const box = el.getBoundingClientRect();
            const read = document.querySelector('[data-testid="recipe-detail-reading"]')!;
            const footer = document.querySelector('[data-testid="recipe-planning-actions"]')!;
            return {
              width: innerWidth,
              height: innerHeight,
              readingHeight: read.clientHeight,
              overflow: el.scrollWidth > el.clientWidth,
              bottom: box.bottom,
              footerHeight: footer.getBoundingClientRect().height,
            };
          });
          expect(measure.overflow).toBe(false);
          expect(measure.bottom).toBeLessThanOrEqual(height + 1);
          expect(measure.readingHeight).toBeGreaterThanOrEqual(96);
          expect(measure.footerHeight).toBeLessThanOrEqual(height * 0.45 + 1);
          await expect(page.getByTestId('action-close-sheet')).toBeInViewport();
          const badge = page.getByTestId('recipe-servings');
          await expect(badge).toBeVisible();
          await badge.evaluate((el) => el.scrollIntoView({ block: 'nearest' }));
          await expect
            .poll(async () => {
              const box = await badge.boundingBox();
              return box != null && box.x >= 0 && box.x + box.width <= width;
            })
            .toBe(true);
          await expect(page.getByTestId('recipe-portion-context')).toHaveCount(0);
          if (width === 320) {
            await page
              .getByTestId('recipe-servings')
              .evaluate((el) => el.scrollIntoView({ block: 'center' }));
            await page.screenshot({
              path: info.outputPath(`${state}-${width}-${scale}-detail-context.png`),
              animations: 'disabled',
            });
          }
          const quantities = page.getByTestId('recipe-ingredient-projection');
          await quantities.evaluate((el) => el.scrollIntoView({ block: 'nearest' }));
          await expect(quantities).toBeInViewport();
          await expect(quantities).toContainText(
            state === 'partial'
              ? 'current sauce'
              : state === 'unconfigured'
                ? '200 g pasta'
                : '400 g pasta'
          );
          await page.screenshot({
            path: info.outputPath(`${state}-${width}-${scale}-detail.png`),
            animations: 'disabled',
          });
          await page.getByTestId('recipe-family-notes-shortcut').click();
          await expect(page.getByTestId('recipe-notes-input')).toBeFocused();
          await expect(page.getByTestId('action-close-sheet')).toBeInViewport();
          const contrast = {
            badge: await surfaceContrast(badge),
          };
          expect(contrast.badge.ratio).toBeGreaterThanOrEqual(4.5);
          metrics.push({ locale, state, scale, ...measure, contrast });
        }
        await page.evaluate(() => {
          document.documentElement.style.fontSize = '16px';
        });
        await page.getByTestId('action-cooks-mode').click();
        await expect(page.getByTestId('cooks-mode-overlay')).toHaveCSS('opacity', '1');
        for (const [width, height, scale] of [
          [320, 740, 2],
          [844, 390, 2],
          [834, 1112, 1],
        ]) {
          await page.setViewportSize({ width, height });
          await page.getByTestId('cooks-mode-overlay').evaluate((root, scale) => {
            const elements = Array.from(root.querySelectorAll<HTMLElement>('*'));
            elements.forEach((el) => {
              el.style.removeProperty('font-size');
              el.style.removeProperty('line-height');
            });
            const sizes = elements.map((el) => {
              const s = getComputedStyle(el);
              return [parseFloat(s.fontSize), parseFloat(s.lineHeight)];
            });
            elements.forEach((el, i) => {
              el.style.fontSize = `${sizes[i][0] * scale}px`;
              if (Number.isFinite(sizes[i][1])) el.style.lineHeight = `${sizes[i][1] * scale}px`;
            });
          }, scale);
          const reading = page.getByTestId('cooks-mode-instructions');
          await reading.evaluate((el) => {
            el.scrollTop = 0;
          });
          await expect
            .poll(() => reading.evaluate((el) => el.clientHeight))
            .toBeGreaterThanOrEqual(96);
          const measure = await reading.evaluate((el) => ({
            height: el.clientHeight,
            overflow: el.scrollWidth > el.clientWidth,
          }));
          expect(measure.height).toBeGreaterThanOrEqual(96);
          expect(measure.overflow).toBe(false);
          await expect(page.getByTestId('close-cooks-mode')).toBeInViewport();
          await expect(page.getByTestId('cooks-mode-step-next')).toBeInViewport();
          await expect(page.getByTestId('cooking-portion-context')).toBeInViewport();
          await page.screenshot({
            path: info.outputPath(`${state}-${width}-${scale}-cooking.png`),
            animations: 'disabled',
          });
          const contrast = await surfaceContrast(page.getByTestId('cooking-portion-context'));
          expect(contrast.ratio).toBeGreaterThanOrEqual(4.5);
          if (width === 320) {
            await page.getByTestId('ingredient-toggle').first().scrollIntoViewIfNeeded();
            await expect(page.getByTestId('ingredient-toggle').first()).toBeInViewport();
            await page.screenshot({
              path: info.outputPath(`${state}-${width}-${scale}-cooking-ingredients.png`),
              animations: 'disabled',
            });
          }
          metrics.push({ locale, state, width, scale, cooking: measure, contrast });
        }
        await info.attach('context-layout-measurements', {
          body: JSON.stringify(metrics, null, 2),
          contentType: 'application/json',
        });
      });
  });
