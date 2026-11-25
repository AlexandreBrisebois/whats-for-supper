import { test, expect } from './fixtures';
import {
  setupCommonRoutes,
  builders,
  MOCK_IDS,
  mockNonCookingSchedule,
  mockSupperServings,
} from './mock-api';
import { assertCookbookVisualA11y } from './visual-a11y-contract';
import fs from 'node:fs';
import path from 'node:path';

for (const locale of ['en', 'fr'] as const)
  test.describe(`compact Portions ${locale}`, () => {
    test.use({ appLocale: locale });
    test('keeps odd counts, invalid Hearth departure card and compact rows usable at enlarged text', async ({
      page,
    }) => {
      await page.context().addCookies([
        {
          name: 'x-family-member-id',
          value: MOCK_IDS.MEMBER_ALEX,
          url: process.env.BASE_URL || 'http://127.0.0.1:3000',
        },
      ]);
      await setupCommonRoutes(page);
      await page.setViewportSize({ width: 320, height: 740 });
      await page.goto('/planner');
      await page.getByRole('button', { name: 'Portions', exact: true }).click();
      await expect(page.getByTestId('save-portions')).toHaveAccessibleName(
        locale === 'fr' ? 'Recettes' : 'Recipes'
      );
      await page.getByTestId('portion-input-2026-05-06').fill('5');
      await page.getByTestId('portion-input-2026-05-08').fill('7');
      await expect(page.getByTestId('portion-input-2026-05-06')).toHaveValue('5');
      await expect(page.getByTestId('portion-input-2026-05-08')).toHaveValue('7');
      await page.getByTestId('portion-input-2026-05-06').fill('0');
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '32px';
      });
      expect(
        await page.getByTestId('portions-editor').evaluate((el) => el.scrollWidth <= el.clientWidth)
      ).toBe(true);
      await page.getByTestId('grocery-tab').click();
      const choice = page.getByTestId('portions-departure');
      await expect(choice).toBeVisible();
      await expect(choice).toHaveClass(/bg-terracotta-50/);
      expect(
        await choice
          .locator('button')
          .evaluateAll((buttons) => buttons.map((button) => button.getAttribute('data-testid')))
      ).toEqual(['portions-save-continue', 'portions-discard']);
      await expect(page.getByTestId('portions-save-continue')).toBeDisabled();
      await page.getByTestId('portions-departure').scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `../.task/refinement-apply/renders/portions-${locale}-320-200.png`,
      });
      await page.getByTestId('portions-discard').click();
      await expect(page.getByTestId('portions-editor')).toHaveCount(0);
    });
  });

for (const locale of ['en', 'fr'] as const)
  test.describe(`stable Portions geometry and Option A Cooked row ${locale}`, () => {
    // Geometry is measured in pixels, so the Planner's framer-motion entrance must run on the
    // native performance/RAF timeline; page.clock.setFixedTime can leave it mid-slide in CI.
    test.use({ appLocale: locale, dateOnlyClock: true });

    test('keeps stepper geometry stable without a default serving button when stepping portions', async ({
      page,
    }) => {
      await page.context().addCookies([
        {
          name: 'x-family-member-id',
          value: MOCK_IDS.MEMBER_ALEX,
          url: process.env.BASE_URL || 'http://127.0.0.1:3000',
        },
      ]);
      await setupCommonRoutes(page);
      await page.addInitScript(() => {
        const style = document.createElement('style');
        style.textContent = 'nextjs-portal{display:none}';
        document.addEventListener('DOMContentLoaded', () => document.head.append(style), {
          once: true,
        });
      });
      await page.goto('/profile/settings');
      await page.getByTestId('usual-portions-automatic').uncheck();
      await page.getByTestId('usual-portions-input').fill('4');
      const savedPortions = page.waitForResponse(
        (response) =>
          response.request().method() === 'PUT' &&
          new URL(response.url()).pathname === '/api/schedule/servings' &&
          response.ok()
      );
      await page.getByTestId('usual-portions-input').blur();
      await savedPortions;

      for (const [width, height] of [
        [390, 844],
        [375, 812],
      ] as const) {
        await page.setViewportSize({ width, height });
        await page.goto('/planner');
        await page.getByTestId('at-the-table-mode').click();
        const input = page.getByTestId('portion-input-2026-05-06');
        await expect(input).toHaveValue('4');
        await expect(page.getByTestId('reset-portions-2026-05-06')).toHaveCount(0);

        const stepper = page.getByTestId('portion-controls-2026-05-06').locator('[role="group"]');
        const plusBtn = page.getByRole('button', {
          name: locale === 'fr' ? 'Plus de portions 2026-05-06' : 'More portions 2026-05-06',
          exact: true,
        });
        const minusBtn = page.getByRole('button', {
          name: locale === 'fr' ? 'Moins de portions 2026-05-06' : 'Fewer portions 2026-05-06',
          exact: true,
        });
        const nextRow = page.getByTestId('portion-row-2026-05-07');

        const measure = async () => ({
          stepper: (await stepper.boundingBox())!,
          plus: (await plusBtn.boundingBox())!,
          nextRow: (await nextRow.boundingBox())!,
        });

        // Baseline only once the week view's entrance slide has settled (identical boxes on
        // consecutive frames); the stability assertions below stay at < 1 px.
        let previous = JSON.stringify(await measure());
        await expect
          .poll(async () => {
            await page.evaluate(
              () => new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
            );
            const current = JSON.stringify(await measure());
            const settled = current === previous;
            previous = current;
            return settled;
          })
          .toBe(true);
        const initial = await measure();

        await plusBtn.click();
        await expect(input).toHaveValue('5');
        await expect(page.getByTestId('reset-portions-2026-05-06')).toHaveCount(0);
        const afterPlus = await measure();
        for (const key of ['x', 'y', 'width', 'height'] as const) {
          expect(Math.abs(afterPlus.stepper[key] - initial.stepper[key])).toBeLessThan(1);
          expect(Math.abs(afterPlus.plus[key] - initial.plus[key])).toBeLessThan(1);
        }
        expect(Math.abs(afterPlus.nextRow.y - initial.nextRow.y)).toBeLessThan(1);

        await minusBtn.click();
        await expect(input).toHaveValue('4');
        await expect(page.getByTestId('reset-portions-2026-05-06')).toHaveCount(0);
        const afterMinus = await measure();
        for (const key of ['x', 'y', 'width', 'height'] as const) {
          expect(Math.abs(afterMinus.stepper[key] - initial.stepper[key])).toBeLessThan(1);
          expect(Math.abs(afterMinus.plus[key] - initial.plus[key])).toBeLessThan(1);
        }
        expect(Math.abs(afterMinus.nextRow.y - initial.nextRow.y)).toBeLessThan(1);
      }

      const open = page.getByTestId('at-the-table-mode');
      const done = page.getByTestId('save-portions');
      const input = page.getByTestId('portion-input-2026-05-06');
      await input.fill('5');
      await done.click();
      await expect(open).toBeVisible();

      await open.click();
      await expect(input).toHaveValue('5');
      await expect(page.getByTestId('reset-portions-2026-05-06')).toHaveCount(0);
      await input.fill('4');
      const write = page.waitForRequest(
        (request) =>
          request.method() === 'PUT' && new URL(request.url()).pathname === '/api/schedule/servings'
      );
      await done.click();
      const payload = (await write).postDataJSON();
      expect(payload).not.toHaveProperty('defaultServings');
      expect(payload.days).toEqual([{ date: '2026-05-06', servings: 4 }]);
      await expect(open).toBeVisible();
    });

    test('renders photo-only past rows and quiet plain-text upcoming prepared rows in Standard AA and High Contrast AAA', async ({
      page,
    }, info) => {
      await page.context().addCookies([
        {
          name: 'x-family-member-id',
          value: MOCK_IDS.MEMBER_ALEX,
          url: process.env.BASE_URL || 'http://127.0.0.1:3000',
        },
      ]);
      const common = await setupCommonRoutes(page);
      const schedule = builders.scheduleDays() as any;
      schedule.calendar.today = '2026-05-06';
      schedule.days = schedule.days.map((day: any, i: number) => ({
        ...day,
        recipe:
          i === 0 || i === 2 || i === 5
            ? builders.scheduleRecipe({
                name: 'Roasted garlic pasta',
                image: `/api/recipes/${MOCK_IDS.RECIPE_LASAGNA}/hero`,
              })
            : null,
        status: i === 0 || i === 5 ? 2 : i === 4 ? 3 : 0,
        nonCooking: i === 4 ? { kind: 'EatingOut' } : null,
        preparation:
          i === 5
            ? {
                preparedOn: '2026-05-05',
                preparedAtUtc: '2026-05-05T18:00:00Z',
                servings: 6,
                originalServings: 2,
              }
            : null,
      }));
      await page.route(`**/api/recipes/${MOCK_IDS.RECIPE_LASAGNA}/hero`, (route) =>
        route.fulfill({
          body: fs.readFileSync(path.resolve('e2e/fixtures/recipe-photos/original.webp')),
          contentType: 'image/webp',
        })
      );
      await mockNonCookingSchedule(page, schedule);
      const control = await mockSupperServings(page, () => schedule, {
        readFamilyCount: common.readFamilyCount,
      });
      control.restoreSnapshot({
        ...control.captureSnapshot(),
        savedUsual: 4,
        inherited: [['2026-05-04', 6]],
      });
      await page.addInitScript(() => {
        const style = document.createElement('style');
        style.textContent = 'nextjs-portal{display:none}';
        document.addEventListener('DOMContentLoaded', () => document.head.append(style), {
          once: true,
        });
      });

      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto('/planner');
      await page.getByTestId('at-the-table-mode').click();

      const pastCookedRow = page.getByTestId('portion-row-2026-05-04');
      await expect(pastCookedRow.getByTestId('planner-meal')).toHaveClass(/bg-cream/);
      await expect(pastCookedRow).not.toHaveClass(/grayscale/);
      await expect(pastCookedRow.getByTestId('portion-input-2026-05-04')).toHaveCount(0);
      await expect(pastCookedRow.getByTestId('portion-cooked-badge-2026-05-04')).toHaveCount(0);
      await expect(pastCookedRow.getByTestId('portion-prepared-status-2026-05-04')).toHaveCount(0);
      await expect(pastCookedRow.locator('button')).toHaveCount(0);
      await expect(pastCookedRow).not.toContainText(
        /Cooked|Cuisiné|Already prepared|Déjà préparé|\b6\b/
      );

      const pastEmptyRow = page.getByTestId('portion-row-2026-05-05');
      await expect(pastEmptyRow.getByTestId('portion-input-2026-05-05')).toHaveCount(0);
      await expect(pastEmptyRow.getByTestId('portion-prepared-status-2026-05-05')).toHaveCount(0);
      await expect(pastEmptyRow.locator('button')).toHaveCount(0);

      const activeRow = page.getByTestId('portion-row-2026-05-06');
      await expect(activeRow.locator('button')).toHaveCount(2);
      await expect(activeRow.getByTestId('portion-input-2026-05-06')).toBeVisible();
      await expect(activeRow.getByTestId('reset-portions-2026-05-06')).toHaveCount(0);

      const preparedRow = page.getByTestId('portion-row-2026-05-09');
      await expect(preparedRow.getByTestId('planner-meal')).toHaveClass(/glass/);
      const preparedStatus = preparedRow.getByTestId('portion-prepared-status-2026-05-09');
      const preparedCount = preparedRow.getByTestId('portion-prepared-count-2026-05-09');
      await expect(preparedStatus).toBeVisible();
      await expect(preparedStatus).toContainText(
        locale === 'fr' ? 'Déjà préparé' : 'Already prepared'
      );
      await expect(preparedCount).toHaveText('6 portions');
      await expect(preparedRow.getByTestId('portion-input-2026-05-09')).toHaveCount(0);
      await expect(preparedRow.locator('button')).toHaveCount(0);

      for (const [width, height] of [
        [390, 844],
        [375, 812],
      ] as const) {
        await page.setViewportSize({ width, height });
        const geometry = await preparedRow.evaluate((row) => {
          const meal = row.querySelector('[data-testid="planner-meal"]')!;
          const photo = meal.querySelector('[aria-label]')!;
          const statusEl = row.querySelector('[data-testid="portion-prepared-status-2026-05-09"]')!;
          return {
            meal: meal.getBoundingClientRect().toJSON(),
            photo: photo.getBoundingClientRect().toJSON(),
            status: statusEl.getBoundingClientRect().toJSON(),
          };
        });
        const statusCenter = geometry.status.top + geometry.status.height / 2;
        const photoCenter = geometry.photo.top + geometry.photo.height / 2;
        expect(Math.abs(statusCenter - photoCenter)).toBeLessThan(12);
        expect(geometry.photo.right).toBeLessThanOrEqual(geometry.status.left + 1);
        expect(geometry.meal.right).toBeLessThanOrEqual(width);
      }

      await page.setViewportSize({ width: 390, height: 844 });
      await assertCookbookVisualA11y(page, {
        rootSelector: '[data-testid="portions-editor"]',
        contrastLevel: 'aa',
      });
      await page.screenshot({
        path: info.outputPath(`portions-prepared-${locale}-390-aa.png`),
        animations: 'disabled',
        style: 'nextjs-portal{visibility:hidden}',
      });

      await page.evaluate(() => {
        document.documentElement.dataset.contrast = 'high';
      });
      await assertCookbookVisualA11y(page, {
        rootSelector: '[data-testid="portions-editor"]',
        contrastLevel: 'aaa',
      });
      await page.screenshot({
        path: info.outputPath(`portions-prepared-${locale}-390-aaa.png`),
        animations: 'disabled',
        style: 'nextjs-portal{visibility:hidden}',
      });

      await page.evaluate(() => {
        delete document.documentElement.dataset.contrast;
        document.documentElement.style.fontSize = '32px';
      });
      await page.setViewportSize({ width: 320, height: 740 });
      expect(
        await page.getByTestId('portions-editor').evaluate((el) => el.scrollWidth <= el.clientWidth)
      ).toBe(true);
    });
  });

for (const locale of ['en', 'fr'] as const)
  test.describe(`Portions native focus ${locale}`, () => {
    test.use({ appLocale: locale });
    for (const [width, scale] of [
      [390, 1],
      [320, 1],
    ])
      test(`${width}px ${scale}x text keeps every date control and exit choice above navigation`, async ({
        page,
      }, info) => {
        await page.setViewportSize({ width, height: 844 });
        await page.context().addCookies([
          {
            name: 'x-family-member-id',
            value: MOCK_IDS.MEMBER_ALEX,
            url: process.env.BASE_URL || 'http://127.0.0.1:3000',
          },
        ]);
        await setupCommonRoutes(page);
        await page.goto('/planner');
        await page.getByTestId('at-the-table-mode').click();
        await page.getByTestId('portion-input-2026-05-10').fill('5');
        await page.evaluate((scale) => {
          document.documentElement.style.fontSize = `${16 * scale}px`;
        }, scale);
        const editor = page.getByTestId('portions-editor');
        const controls = editor.locator('button:not(:disabled),input:not(:disabled)');
        const count = await controls.count();
        expect(count).toBeGreaterThan(20);
        const metrics: unknown[] = [];
        const assertVisibleFocus = async () => {
          const metric = await page.evaluate(() => {
            const el = document.activeElement as HTMLElement;
            const rect = el.getBoundingClientRect();
            const front = document.elementFromPoint(
              rect.x + rect.width / 2,
              rect.y + rect.height / 2
            );
            const nav = document
              .querySelector('[data-testid="app-bottom-navigation"]')!
              .getBoundingClientRect();
            return {
              testId: el.dataset.testid,
              name: el.getAttribute('aria-label'),
              rect: rect.toJSON(),
              nav: nav.toJSON(),
              visible: !!front && (el === front || el.contains(front)),
            };
          });
          metrics.push(metric);
          expect(metric.visible, JSON.stringify(metric)).toBe(true);
        };
        await controls.first().focus();
        for (let index = 0; index < count; index++) {
          await expect(controls.nth(index)).toBeFocused();
          await assertVisibleFocus();
          if (index < count - 1) await page.keyboard.press('Tab');
        }
        await expect(controls.last()).toBeFocused();
        await page.screenshot({
          path: info.outputPath(`${locale}-${width}-${scale}-last-row-focus.png`),
          style: 'nextjs-portal{visibility:hidden}',
        });
        for (let index = count - 2; index >= 0; index--) {
          await page.keyboard.press('Shift+Tab');
          await expect(controls.nth(index)).toBeFocused();
          await assertVisibleFocus();
        }
        const finishControls = page.getByTestId('portions-mode-strip').locator('button');
        await expect(finishControls).toHaveCount(1);
        await expect(page.getByTestId('save-portions')).toHaveAccessibleName(
          locale === 'fr' ? 'Recettes' : 'Recipes'
        );
        for (const button of await finishControls.all()) {
          await button.focus();
          await assertVisibleFocus();
        }
        await page.getByTestId('portion-input-2026-05-10').fill('0');
        await page.getByTestId('grocery-tab').click();
        await expect(page.getByTestId('portions-departure')).toBeVisible();
        await page.getByTestId('portion-input-2026-05-10').fill('5');
        for (const id of ['portions-save-continue', 'portions-discard']) {
          await page.getByTestId(id).focus();
          await assertVisibleFocus();
        }
        await expect(page.getByTestId('portions-save-continue')).toBeEnabled();
        // Let the shared Button finish its opacity/color transition before measuring contrast.
        await page.waitForTimeout(500);
        await assertCookbookVisualA11y(page, {
          rootSelector: '[data-testid="portions-departure"]',
          contrastLevel: 'aa',
        });
        await page.evaluate(() => {
          document.documentElement.dataset.contrast = 'high';
        });
        await assertCookbookVisualA11y(page, {
          rootSelector: '[data-testid="portions-departure"]',
          contrastLevel: 'aaa',
        });
        await page.evaluate(() => {
          delete document.documentElement.dataset.contrast;
        });
        await page.getByTestId('portions-save-continue').click();
        await expect(page.getByTestId('portions-editor')).toHaveCount(0);
        await info.attach('native-focus-geometry.json', {
          body: JSON.stringify(metrics, null, 2),
          contentType: 'application/json',
        });
      });
  });
