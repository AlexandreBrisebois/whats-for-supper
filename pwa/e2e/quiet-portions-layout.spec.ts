import { writeFileSync } from 'node:fs';
import type { Page, TestInfo, Locator } from '@playwright/test';
import { test, expect } from './fixtures';
import {
  builders,
  MOCK_IDS,
  setupCommonRoutes,
  mockNonCookingSchedule,
  mockSupperServings,
} from './mock-api';

const visualEvidence = Boolean(process.env.WFS_GROUP5_RENDER_PHASE);

for (const locale of ['en', 'fr'] as const) {
  test.describe(`quiet portions geometry ${locale}`, () => {
    test.use({ appLocale: locale });
    test('default preview original and return preserve reading and focus', async ({
      page,
    }, info) => {
      test.setTimeout(60_000);
      const id = MOCK_IDS.RECIPE_SPAGHETTI;
      await page.context().addCookies([
        {
          name: 'x-family-member-id',
          value: MOCK_IDS.MEMBER_ALEX,
          url: process.env.BASE_URL || 'http://127.0.0.1:3000',
        },
      ]);
      await setupCommonRoutes(page, builders.deploymentCalendar({ today: '2026-05-04' }), {
        supperServings: {
          knownRecipe: {
            id,
            basis: 2,
            quantity: 200,
            ingredient: 'pasta',
            unit: 'g',
            source: {
              ingredients: ['200 g pasta', 'salt to taste', 'one uncertain handful of parsley'],
              supplies: [{ name: 'pasta', quantity: 200, unitText: 'g' }],
            },
          },
        },
      });
      // Geometry and keyboard activation use the HTTP snapshot. A finite mocked SSE
      // response reconnects and can disable the menu mid-keypress during a reread.
      await page.route(/\/(?:backend\/)?api\/stream/, (route) => route.fulfill({ status: 204 }));
      await page.route(`**/api/recipes/${id}`, async (route) => {
        if (route.request().method() !== 'GET') return route.fallback();
        await route.fulfill({
          json: {
            recipe: builders.recipe({
              id,
              servings: 2,
              ingredients: ['200 g pasta', 'salt to taste', 'one uncertain handful of parsley'],
              notes: 'Keep the sauce at the table.',
            }),
            updatedAt: '2026-05-04T12:00:00Z',
          },
        });
      });
      await page.goto(
        `/recipes?open=${id}&addToDay=2&weekOffset=0&referenceWeekStartDate=2026-05-04`
      );
      await page.addStyleTag({ content: 'nextjs-portal{display:none}' });
      await expect(page.getByTestId('recipe-detail-sheet')).toHaveCSS('opacity', '1');
      await expect(page.getByTestId('recipe-servings')).toBeVisible();
      const writes: string[] = [];
      page.on('request', (request) => {
        if (
          !['GET', 'HEAD'].includes(request.method()) &&
          new URL(request.url()).pathname.startsWith('/api/')
        )
          writes.push(request.method() + ' ' + new URL(request.url()).pathname);
      });
      const metrics = [];
      for (const [width, height, scale] of [
        [320, 740, 1],
        [320, 740, 2],
        [390, 844, 1],
        [834, 1112, 2],
        [844, 390, 2],
      ]) {
        await page.setViewportSize({ width, height });
        await page.evaluate((scale) => {
          document.documentElement.style.fontSize = `${scale * 16}px`;
        }, scale);
        await page.evaluate(() => document.fonts.ready);
        await expect(page.getByTestId('recipe-original-yield')).toHaveCount(0);
        await expect(page.getByTestId('recipe-portion-context')).toHaveCount(0);
        await expect(page.getByTestId('recipe-instruction-limitation')).toHaveCount(0);
        const defaultCount = await page.getByTestId('recipe-servings').innerText();
        const preview = page.getByRole('button', {
          name: locale === 'en' ? 'Preview 6 portions' : 'Aperçu pour 6 portions',
          exact: true,
        });
        await preview.scrollIntoViewIfNeeded();
        if (visualEvidence)
          await page.screenshot({
            path: info.outputPath(`${width}-${scale}-default.png`),
            animations: 'disabled',
          });
        const geometry = await page.getByTestId('recipe-detail-sheet').evaluate((el) => ({
          width: innerWidth,
          height: innerHeight,
          overflow: el.scrollWidth > el.clientWidth,
          readingHeight: document.querySelector('[data-testid="recipe-detail-reading"]')!
            .clientHeight,
        }));
        expect(geometry.overflow).toBe(false);
        expect(geometry.readingHeight).toBeGreaterThanOrEqual(80);
        for (const target of [2, 4, 6]) {
          const button = page.getByRole('button', {
            name: locale === 'en' ? `Preview ${target} portions` : `Aperçu pour ${target} portions`,
            exact: true,
          });
          const box = (await button.boundingBox())!;
          expect(box.width).toBeGreaterThanOrEqual(48);
          expect(box.height).toBeGreaterThanOrEqual(48);
        }
        await preview.click();
        await expect(preview).toHaveAttribute('aria-pressed', 'true');
        await expect(page.getByTestId('recipe-ingredient-preview')).toContainText('600 g pasta');
        await expect(page.getByTestId('recipe-ingredient-preview')).toContainText(
          'one uncertain handful of parsley'
        );
        await expect(page.getByTestId('recipe-original-yield')).toContainText('2');
        await expect(page.getByTestId('recipe-instruction-limitation')).toBeVisible();
        if (visualEvidence)
          await page.screenshot({
            path: info.outputPath(`${width}-${scale}-preview.png`),
            animations: 'disabled',
          });
        await expect(
          page.getByRole('button', {
            name: /^(Original quantities|Planned quantities|Quantités d’origine|Quantités prévues)$/,
          })
        ).toHaveCount(0);
        await expect(
          page.getByText(
            locale === 'en'
              ? 'Preview only. Your plan and shopping list stay unchanged.'
              : 'Aperçu seulement. Le menu et la liste de courses restent inchangés.',
            { exact: true }
          )
        ).toHaveCount(0);
        await page.getByTestId('action-gear-menu').click();
        const original = page.getByTestId('action-original-quantities');
        await expect(original).toHaveAccessibleName(
          locale === 'en' ? 'View original ingredients' : 'Voir les ingrédients d’origine'
        );
        const originalBox = (await original.boundingBox())!;
        expect(originalBox.width).toBeGreaterThanOrEqual(48);
        expect(originalBox.height).toBeGreaterThanOrEqual(48);
        await expect(original).toBeEnabled();
        await original.focus();
        await expect(original).toBeFocused();
        await original.press('Enter');
        await expect(page.getByText('200 g pasta', { exact: true })).toBeVisible();
        await expect(page.getByTestId('recipe-ingredient-preview')).toHaveCount(0);
        await expect(
          page.getByRole('heading', {
            name: locale === 'en' ? 'Ingredients 2 servings' : 'Ingrédients 2 portions',
            exact: true,
          })
        ).toBeFocused();
        if (visualEvidence)
          await page.screenshot({
            path: info.outputPath(`${width}-${scale}-original.png`),
            animations: 'disabled',
          });
        await expect(page.getByTestId('recipe-original-yield')).toContainText('2');
        await page.getByTestId('action-gear-menu').click();
        const back = page.getByTestId('action-reset-view');
        await expect(back).toHaveAccessibleName(
          locale === 'en' ? 'Reset view' : 'Réinitialiser la vue'
        );
        const resetBox = (await back.boundingBox())!;
        expect(resetBox.width).toBeGreaterThanOrEqual(48);
        expect(resetBox.height).toBeGreaterThanOrEqual(48);
        await expect(back).toBeEnabled();
        await back.focus();
        await back.press('Enter');
        await expect(page.getByTestId('recipe-original-yield')).toHaveCount(0);
        await expect(page.getByTestId('recipe-servings')).toHaveText(defaultCount);
        await page.getByTestId('recipe-family-notes-shortcut').click();
        await expect(page.getByTestId('recipe-notes-input')).toBeFocused();
        await expect(page.getByTestId('recipe-notes-input')).toBeInViewport();
        await expect(page.getByTestId('action-close-sheet')).toBeInViewport();
        metrics.push({ locale, scale, ...geometry });
      }
      expect(writes).toEqual([]);
      if (visualEvidence)
        writeFileSync(
          info.outputPath('quiet-portions-geometry.json'),
          JSON.stringify(metrics, null, 2)
        );
      if (visualEvidence)
        await info.attach('quiet-portions-geometry.json', {
          body: JSON.stringify(metrics, null, 2),
          contentType: 'application/json',
        });
    });
  });
}

async function identity(page: Page) {
  await page.context().addCookies([
    {
      name: 'x-family-member-id',
      value: MOCK_IDS.MEMBER_ALEX,
      url: process.env.BASE_URL || 'http://127.0.0.1:3000',
    },
  ]);
}

async function captureState(
  page: Page,
  info: TestInfo,
  name: string,
  target: Locator,
  controls: Locator[]
) {
  // These are acceptance checks, independent of optional screenshot artifacts.
  await expect(target).toBeVisible();
  await expect
    .poll(() =>
      page.getByTestId('recipe-detail-sheet').evaluate((sheet) => {
        const reading = sheet.querySelector<HTMLElement>('[data-testid="recipe-detail-reading"]')!;
        return sheet.scrollWidth <= sheet.clientWidth && reading.scrollWidth <= reading.clientWidth;
      })
    )
    .toBe(true);
  for (const control of controls) {
    const box = (await control.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(48);
    expect(box.height).toBeGreaterThanOrEqual(48);
  }
  if (!visualEvidence) return;
  await page.evaluate(() => document.fonts.ready);
  await target.scrollIntoViewIfNeeded();
  await expect(target).toBeInViewport();
  const measure = await page.getByTestId('recipe-detail-sheet').evaluate((sheet) => {
    const read = sheet.querySelector<HTMLElement>('[data-testid="recipe-detail-reading"]')!;
    const header = sheet
      .querySelector('[data-testid="recipe-detail-toolbar"]')!
      .getBoundingClientRect();
    const footer = sheet
      .querySelector('[data-testid="recipe-planning-actions"]')
      ?.getBoundingClientRect();
    return {
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
      rootFontPx: getComputedStyle(document.documentElement).fontSize,
      overflow: sheet.scrollWidth > sheet.clientWidth,
      readingOverflow: read.scrollWidth > read.clientWidth,
      readingHeight: read.clientHeight,
      headerBottom: header.bottom,
      footerTop: footer?.top ?? innerHeight,
    };
  });
  expect(measure.overflow).toBe(false);
  expect(measure.readingOverflow).toBe(false);
  expect(measure.readingHeight).toBeGreaterThanOrEqual(80);
  const targetBox = (await target.boundingBox())!;
  expect(targetBox.y).toBeGreaterThanOrEqual(measure.headerBottom - 1);
  expect(targetBox.y + targetBox.height).toBeLessThanOrEqual(measure.footerTop + 1);
  const targets = [];
  for (const control of controls) {
    const box = (await control.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(48);
    expect(box.width).toBeGreaterThanOrEqual(48);
    targets.push({ label: await control.innerText(), ...box });
  }
  if (visualEvidence)
    await page.screenshot({ path: info.outputPath(`${name}.png`), animations: 'disabled' });
  const record = { name, ...measure, target: targetBox, controls: targets };
  writeFileSync(info.outputPath(`${name}-geometry.json`), JSON.stringify(record, null, 2));
}

for (const locale of ['en', 'fr'] as const) {
  test.describe(`quiet exceptional states ${locale}`, () => {
    test.use({ appLocale: locale });
    test('frozen prepared seven and genuine dated read failure retain honest context', async ({
      page,
    }, info) => {
      await identity(page);
      await page.setViewportSize({ width: 390, height: 844 });
      const id = MOCK_IDS.RECIPE_SPAGHETTI;
      const common = await setupCommonRoutes(page);
      const schedule = builders.scheduleDays() as any;
      schedule.days[2].recipe = builders.scheduleRecipe({ id, name: 'Prepared pasta' });
      schedule.days[2].status = 2;
      schedule.days[2].occurrenceId = MOCK_IDS.SUPPER_OCCURRENCE;
      schedule.days[2].preparation = {
        servings: 7,
        originalServings: 2,
        preparedOn: '2026-05-04',
        preparedAtUtc: '2026-05-04T12:00:00Z',
        portionContext: 'dated',
        planToken: 'prepared-plan',
        servingVersion: 'prepared-version',
      };
      await mockNonCookingSchedule(page, schedule);
      await mockSupperServings(page, () => schedule, {
        readFamilyCount: common.readFamilyCount,
        knownRecipe: { id, basis: 2, quantity: 200, unit: 'g', ingredient: 'pasta' },
      });
      await page.route(`**/api/recipes/${id}`, (route) =>
        route.request().method() === 'GET'
          ? route.fulfill({
              json: {
                recipe: builders.recipe({
                  id,
                  name: 'Prepared pasta',
                  servings: 2,
                  ingredients: ['200 g pasta'],
                  notes: 'Keep sauce at the table.',
                }),
                updatedAt: '2026-05-04T12:00:00Z',
              },
            })
          : route.fallback()
      );
      const url = `/planner?weekOffset=0&referenceWeekStartDate=2026-05-04&planDate=2026-05-06&detailRecipe=${id}&detailOccurrence=${MOCK_IDS.SUPPER_OCCURRENCE}`;
      await page.goto(url);
      await expect(page.getByTestId('recipe-detail-sheet')).toHaveCSS('opacity', '1');
      const frozen = page.getByTestId('recipe-prepared-portions');
      await expect(frozen).toContainText('7');
      await expect(page.getByTestId('recipe-ingredient-projection')).toContainText('700 g pasta');
      await expect(page.getByTestId('recipe-servings')).toHaveText(
        locale === 'en' ? '7 servings' : '7 portions'
      );
      await expect(page.getByTestId('recipe-portion-context')).toHaveCount(0);
      await captureState(page, info, 'prepared-seven-390', frozen, [
        page.getByTestId('action-gear-menu'),
      ]);
      const preview = page.getByRole('button', {
        name: locale === 'en' ? 'Preview 6 portions' : 'Aperçu pour 6 portions',
        exact: true,
      });
      await preview.click();
      await expect(page.getByTestId('recipe-ingredient-preview')).toContainText('600 g pasta');
      await expect(frozen).toContainText('7');
      await captureState(page, info, 'prepared-seven-preview-six-390', frozen, [preview]);
      await expect(page.getByTestId('recipe-original-yield')).toContainText('2');
      await page.getByTestId('action-gear-menu').click();
      await expect(page.getByTestId('action-reset-view')).toHaveAccessibleName(
        locale === 'en' ? 'Reset view' : 'Réinitialiser la vue'
      );
      await page.getByTestId('action-reset-view').click();
      await expect(page.getByTestId('recipe-ingredient-projection')).toContainText('700 g pasta');
      await page.getByTestId('action-close-sheet').click();
      let fail = true;
      await page.route(`**/api/recipes/${id}/ingredient-projection*`, (route) =>
        route.request().method() === 'GET' && fail
          ? route.fulfill({ status: 409, json: { message: 'That supper plan changed.' } })
          : route.fallback()
      );
      await page.goto(url);
      await page.setViewportSize({ width: 320, height: 740 });
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '32px';
      });
      const error = page.getByTestId('recipe-detail-reading').getByRole('alert');
      await expect(error).toContainText(
        locale === 'en'
          ? 'Could not confirm ingredients'
          : 'Impossible de confirmer les ingrédients'
      );
      await expect(page.getByTestId('recipe-servings')).toHaveCount(0);
      await expect(page.getByText('700 g pasta', { exact: true })).toHaveCount(0);
      const retry = error.getByRole('button');
      await retry.focus();
      await expect(retry).toBeFocused();
      await captureState(page, info, 'projection-error-320-200', error, [retry]);
      fail = false;
      await retry.click();
      await expect(page.getByTestId('recipe-ingredient-projection')).toContainText('700 g pasta');
      expect(schedule.days[2].preparation.servings).toBe(7);
    });

    test('preview read failure and unknown basis editor retain recoverable drafts', async ({
      page,
    }, info) => {
      await identity(page);
      await setupCommonRoutes(page, undefined, {
        supperServings: {
          knownRecipe: {
            id: MOCK_IDS.RECIPE_SPAGHETTI,
            basis: 2,
            quantity: 200,
            unit: 'g',
            ingredient: 'pasta',
          },
        },
      });
      await page.setViewportSize({ width: 320, height: 740 });
      await page.goto(`/recipes?open=${MOCK_IDS.RECIPE_SPAGHETTI}&reviewAmounts=true`);
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '32px';
      });
      let fail = true;
      await page.route(
        `**/api/recipes/${MOCK_IDS.RECIPE_SPAGHETTI}/ingredient-preview*`,
        (route) =>
          route.request().method() === 'GET' && fail
            ? route.abort('connectionreset')
            : route.fallback()
      );
      await page
        .getByRole('button', {
          name: locale === 'en' ? 'Preview 6 portions' : 'Aperçu pour 6 portions',
          exact: true,
        })
        .click();
      const error = page.getByTestId('recipe-detail-reading').getByRole('alert');
      await expect(error).toContainText(
        locale === 'en' ? 'Preview could not load.' : 'Impossible de charger l’aperçu.'
      );
      const retry = error.getByRole('button');
      await retry.focus();
      await expect(retry).toBeFocused();
      await captureState(page, info, 'preview-error-320-200', error, [retry]);
      const writes: string[] = [];
      page.on('request', (request) => {
        if (
          !['GET', 'HEAD'].includes(request.method()) &&
          new URL(request.url()).pathname.startsWith('/api/')
        )
          writes.push(request.method() + ' ' + new URL(request.url()).pathname);
      });
      await page.getByTestId('action-gear-menu').click();
      const reset = page.getByTestId('action-reset-view');
      await expect(reset).toHaveAccessibleName(
        locale === 'en' ? 'Reset view' : 'Réinitialiser la vue'
      );
      const resetBox = (await reset.boundingBox())!;
      expect(resetBox.width).toBeGreaterThanOrEqual(48);
      expect(resetBox.height).toBeGreaterThanOrEqual(48);
      await reset.focus();
      await reset.press('Enter');
      await expect(error).toHaveCount(0);
      await expect(page.getByTestId('recipe-ingredient-preview')).toHaveCount(0);
      await expect(page.getByTestId('recipe-servings')).toHaveText(
        locale === 'en' ? '2 servings' : '2 portions'
      );
      await expect(page.getByText('200 g pasta', { exact: true })).toBeVisible();
      await page
        .getByRole('button', {
          name: locale === 'en' ? 'Preview 6 portions' : 'Aperçu pour 6 portions',
          exact: true,
        })
        .click();
      await expect(error).toBeVisible();
      fail = false;
      await retry.click();
      await expect(page.getByTestId('recipe-ingredient-preview')).toContainText('600 g pasta');
      expect(writes).toEqual([]);
      const unknown = MOCK_IDS.RECIPE_CARBONARA;
      await page.goto(`/recipes?open=${unknown}&reviewAmounts=true`);
      await page.setViewportSize({ width: 834, height: 1112 });
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '32px';
      });
      const set = page.getByRole('button', {
        name: locale === 'en' ? 'Set recipe portions' : 'Définir les portions de la recette',
        exact: true,
      });
      await expect(set).toBeVisible();
      await expect(page.getByTestId('recipe-servings')).toHaveCount(0);
      await captureState(page, info, 'unknown-basis-834-200', set, [set]);
      await set.click();
      const input = page.getByTestId('recipe-edit-servings-input');
      await expect(input).toBeFocused();
      await input.fill('0');
      await expect(input).toHaveAttribute('aria-invalid', 'true');
      await expect(page.getByTestId('recipe-save-edits')).toBeDisabled();
      await captureState(page, info, 'basis-editor-invalid-834-200', input, [input]);
      await input.fill('4');
      await page.route(`**/api/recipes/${unknown}`, (route) =>
        route.request().method() === 'PATCH'
          ? route.fulfill({ status: 500, json: { message: 'Save unavailable.' } })
          : route.fallback()
      );
      await page.getByTestId('recipe-save-edits').click();
      const saveError = page.getByText(
        locale === 'en'
          ? 'Could not save changes. Try again.'
          : "Impossible d'enregistrer les changements. Réessayez.",
        { exact: true }
      );
      await expect(saveError).toBeVisible();
      await expect(input).toHaveValue('4');
      await captureState(page, info, 'basis-editor-failed-834-200', saveError, [
        page.getByTestId('recipe-cancel-edits'),
      ]);
      await page.getByTestId('recipe-cancel-edits').click();
      await expect(page.getByTestId('recipe-servings')).toHaveCount(0);
      await set.click();
      await expect(input).toHaveValue('');
    });

    test('grocery original review stays readable without automatic planning authority', async ({
      page,
    }, info) => {
      await identity(page);
      const id = MOCK_IDS.RECIPE_SPAGHETTI;
      await setupCommonRoutes(page, undefined, {
        supperServings: {
          knownRecipe: { id, basis: 2, quantity: 200, unit: 'g', ingredient: 'pasta' },
        },
      });
      await page.setViewportSize({ width: 320, height: 740 });
      await page.goto(
        `/recipes?open=${id}&reviewAmounts=true&sourceGroceryWeekOffset=0&sourceGroceryReferenceWeekStartDate=2026-05-04`
      );
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '32px';
      });
      await expect(page.getByTestId('recipe-detail-sheet')).toHaveCSS('opacity', '1');
      await expect(page.getByText('200 g pasta', { exact: true })).toBeVisible();
      await expect(page.getByTestId('action-add-to-day')).toHaveCount(0);
      await expect(page.getByTestId('action-begin-planning')).toHaveAccessibleName(
        locale === 'en' ? 'Plan' : 'Planifier'
      );
      await page.getByTestId('action-gear-menu').click();
      const original = page.getByTestId('action-original-quantities');
      await expect(original).toHaveAccessibleName(
        locale === 'en' ? 'View original ingredients' : 'Voir les ingrédients d’origine'
      );
      await original.focus();
      await original.press('Enter');
      await expect(page.getByTestId('recipe-original-yield')).toContainText('2');
      await captureState(
        page,
        info,
        'grocery-original-320-200',
        page.getByTestId('recipe-original-yield'),
        [page.getByTestId('action-begin-planning')]
      );
      await expect(page.getByTestId('recipe-ingredient-projection')).toHaveCount(0);
      // This URL carries a source week, not a source day: do not fabricate a date.
      await expect(page.getByTestId('recipe-portion-context')).toHaveCount(0);
    });
  });
}
