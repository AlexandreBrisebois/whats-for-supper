import { test, expect } from './fixtures';
import { setupCommonRoutes, MOCK_IDS } from './mock-api';

for (const locale of ['en', 'fr'] as const)
  test.describe(`compact Portions ${locale}`, () => {
    test.use({ appLocale: locale });
    test('keeps odd counts, draft-exit choices and compact rows usable at enlarged text', async ({
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
      await expect(page.getByTestId('portions-mode-strip')).not.toContainText(
        locale === 'fr' ? 'Recettes' : 'Recipes'
      );
      await page.getByTestId('portion-input-2026-05-06').fill('5');
      await page.getByTestId('portion-input-2026-05-08').fill('7');
      await expect(page.getByTestId('portion-input-2026-05-06')).toHaveValue('5');
      await expect(page.getByTestId('portion-input-2026-05-08')).toHaveValue('7');
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '32px';
      });
      expect(
        await page.getByTestId('portions-editor').evaluate((el) => el.scrollWidth <= el.clientWidth)
      ).toBe(true);
      await page.getByTestId('grocery-tab').click();
      const choice = page.getByTestId('portions-departure');
      await expect(choice).toBeVisible();
      expect(
        await choice
          .locator('button')
          .evaluateAll((buttons) => buttons.map((button) => button.getAttribute('data-testid')))
      ).toEqual(['portions-save-continue', 'portions-keep-editing', 'portions-discard']);
      await page.getByTestId('portions-keep-editing').click();
      await expect(page.getByTestId('portion-input-2026-05-06')).toHaveValue('5');
      await page.getByTestId('grocery-tab').click();
      await page.getByTestId('portions-departure').scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `../.task/refinement-apply/renders/portions-${locale}-320-200.png`,
      });
      await page.getByTestId('portions-discard').click();
      await expect(page.getByTestId('portions-editor')).toHaveCount(0);
    });
  });

for (const locale of ['en', 'fr'] as const)
  test.describe(`date reset ${locale}`, () => {
    test.use({ appLocale: locale });
    test('resets five and equal-four with numeric action and date-only persistence', async ({
      page,
    }, info) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.context().addCookies([
        {
          name: 'x-family-member-id',
          value: MOCK_IDS.MEMBER_ALEX,
          url: process.env.BASE_URL || 'http://127.0.0.1:3000',
        },
      ]);
      await setupCommonRoutes(page);
      await page.goto('/profile/settings');
      await page.getByTestId('usual-portions-automatic').uncheck();
      await page.getByTestId('usual-portions-input').fill('4');
      await page.getByTestId('save-usual-portions').click();
      await expect(
        page
          .getByTestId('usual-portions-section')
          .getByText(locale === 'fr' ? 'Enregistré' : 'Saved', { exact: true })
      ).toBeVisible();
      await page.goto('/planner');
      const open = page.getByTestId('at-the-table-mode');
      const input = page.getByTestId('portion-input-2026-05-10');
      const reset = page.getByTestId('reset-portions-2026-05-10');
      const done = page.getByTestId('save-portions');
      const readSunday = () =>
        page.evaluate(async () => {
          const { data } = await (await fetch('/api/schedule/servings?weekOffset=0')).json();
          return data.days.find((day: { date: string }) => day.date === '2026-05-10');
        });
      await open.click();
      await expect(done).toHaveAccessibleName(locale === 'fr' ? 'Recettes' : 'Recipes');
      await expect(done.locator('svg.lucide-calendar')).toHaveCount(1);
      await expect(page.getByTestId('usual-portions')).toHaveCount(0);
      await input.fill('5');
      await page.getByTestId('portion-input-2026-05-06').fill('5');
      await done.click();
      await expect(open).toBeVisible();
      expect(await readSunday()).toMatchObject({ servings: 5, overrideServings: 5 });
      await open.click();
      await expect(reset).toHaveText('4');
      await expect(reset).toHaveAccessibleName(
        locale === 'fr'
          ? /utiliser les 4 portions habituelles.*dimanche/i
          : /use usual 4 portions.*sunday/i
      );
      // Wednesday is fully visible above the fixed navigation on this phone.
      const captureReset = page.getByTestId('reset-portions-2026-05-06');
      const captureRow = page.getByTestId('portion-row-2026-05-06');
      await captureReset.focus();
      await expect(captureReset).toBeFocused();
      await page.screenshot({
        path: info.outputPath(`planner-${locale}-saved5-reset4-focus.png`),
        animations: 'disabled',
        style: 'nextjs-portal{visibility:hidden}',
      });
      await captureRow.screenshot({
        path: info.outputPath(`planner-${locale}-saved5-reset4-row.png`),
        style: 'nextjs-portal{visibility:hidden}',
      });
      await page.keyboard.press('Enter');
      await expect(captureRow.getByRole('status')).toContainText('4');
      await expect(page.getByTestId('portion-input-2026-05-06')).toHaveValue('4');
      await page.screenshot({
        path: info.outputPath(`planner-${locale}-reset-inherited4.png`),
        animations: 'disabled',
        style: 'nextjs-portal{visibility:hidden}',
      });
      await captureRow.screenshot({
        path: info.outputPath(`planner-${locale}-inherited4-row.png`),
        style: 'nextjs-portal{visibility:hidden}',
      });
      await reset.click();
      await expect(input).toHaveValue('4');
      const write = page.waitForRequest(
        (request) =>
          request.method() === 'PUT' && new URL(request.url()).pathname === '/api/schedule/servings'
      );
      await done.click();
      const payload = (await write).postDataJSON();
      expect(payload).not.toHaveProperty('defaultServings');
      expect(payload.days).toEqual(
        expect.arrayContaining([
          { date: '2026-05-06', servings: null },
          { date: '2026-05-10', servings: null },
        ])
      );
      await expect(open).toBeVisible();
      expect(await readSunday()).toMatchObject({ servings: 4, overrideServings: null });
      await open.click();
      await input.fill('5');
      await done.click();
      await expect(open).toBeVisible();
      await open.click();
      await input.fill('4');
      await done.click();
      await expect(open).toBeVisible();
      expect(await readSunday()).toMatchObject({ servings: 4, overrideServings: 4 });
      await open.click();
      await reset.click();
      await expect(page.getByTestId('portion-row-2026-05-10').getByRole('status')).toContainText(
        '4'
      );
      await done.click();
      await expect(open).toBeVisible();
      expect(await readSunday()).toMatchObject({ servings: 4, overrideServings: null });
    });
  });

test('a concurrent usual change reviews the new reset target and saves null with the fresh version', async ({
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
  await page.goto('/profile/settings');
  await page.getByTestId('usual-portions-automatic').uncheck();
  await page.getByTestId('usual-portions-input').fill('4');
  await page.getByTestId('save-usual-portions').click();
  await expect(
    page.getByTestId('usual-portions-section').getByText('Saved', { exact: true })
  ).toBeVisible();
  await page.goto('/planner');
  await page.getByTestId('at-the-table-mode').click();
  await page.getByTestId('portion-input-2026-05-10').fill('5');
  await page.getByTestId('save-portions').click();
  await page.getByTestId('at-the-table-mode').click();
  await page.getByTestId('reset-portions-2026-05-10').click();
  await expect(page.getByTestId('portion-input-2026-05-10')).toHaveValue('4');
  const fresh = await page.evaluate(async () => {
    const { data } = await (await fetch('/api/schedule/servings?weekOffset=0')).json();
    const response = await fetch('/api/schedule/servings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        referenceWeekStartDate: data.referenceWeekStartDate,
        weekOffset: 0,
        expectedVersion: data.version,
        defaultServings: 7,
        days: [],
      }),
    });
    if (!response.ok) throw new Error('Concurrent fixture save failed');
    return (await response.json()).data.version;
  });
  await page.getByTestId('save-portions').click();
  await expect(page.getByTestId('save-portions')).toBeDisabled();
  await page.getByTestId('portions-review').click();
  await expect(page.getByTestId('portions-saved-review')).toContainText('Your edits: 7');
  await expect(page.getByTestId('portion-input-2026-05-10')).toHaveValue('7');
  await expect(page.getByTestId('reset-portions-2026-05-10')).toHaveText('7');
  await page.getByTestId('portions-keep-draft').click();
  const write = page.waitForRequest(
    (request) =>
      request.method() === 'PUT' && new URL(request.url()).pathname === '/api/schedule/servings'
  );
  await page.getByTestId('save-portions').click();
  const payload = (await write).postDataJSON();
  expect(payload).toMatchObject({
    expectedVersion: fresh,
    days: [{ date: '2026-05-10', servings: null }],
  });
  expect(payload).not.toHaveProperty('defaultServings');
  await expect(page.getByTestId('at-the-table-mode')).toBeVisible();
});

for (const locale of ['en', 'fr'] as const)
  test.describe(`Portions native focus ${locale}`, () => {
    test.use({ appLocale: locale });
    for (const [width, scale] of [
      [390, 1],
      [320, 2],
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
        await expect(page.getByTestId('reset-portions-2026-05-10')).toBeFocused();
        await page.screenshot({
          path: info.outputPath(`${locale}-${width}-${scale}-last-row-focus.png`),
          style: 'nextjs-portal{visibility:hidden}',
        });
        for (let index = count - 2; index >= 0; index--) {
          await page.keyboard.press('Shift+Tab');
          await expect(controls.nth(index)).toBeFocused();
          await assertVisibleFocus();
        }
        await page.getByTestId('grocery-tab').click();
        for (const id of ['portions-save-continue', 'portions-keep-editing', 'portions-discard']) {
          await page.getByTestId(id).focus();
          await assertVisibleFocus();
        }
        await page.getByTestId('portions-keep-editing').click();
        expect(await page.getByTestId('portion-input-2026-05-10').inputValue()).toBe('5');
        const finishControls = page.getByTestId('portions-mode-strip').locator('button');
        expect(await finishControls.count()).toBe(2);
        for (const button of await finishControls.all()) {
          await button.focus();
          await assertVisibleFocus();
        }
        await info.attach('native-focus-geometry.json', {
          body: JSON.stringify(metrics, null, 2),
          contentType: 'application/json',
        });
      });
  });
