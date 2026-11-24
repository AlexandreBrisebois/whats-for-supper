import { test, expect } from './fixtures';
import { assertCookbookVisualA11y } from './visual-a11y-contract';
import { builders, MOCK_IDS, setupCommonRoutes } from './mock-api';

test.use({ timezoneId: 'Asia/Tokyo' });
const calendar = builders.deploymentCalendar({
  timeZone: 'America/Toronto',
  today: '2026-10-11',
  capturedAtUtc: '2026-10-12T01:30:00Z',
  currentWeekStartDate: '2026-10-05',
  referenceWeekStartDate: '2026-10-05',
  nextDayAtUtc: '2026-10-12T04:00:00Z',
});

for (const action of ['tomorrow', 'next-week', 'drop'] as const) {
  test(`Home ${action}: retry saves replacement without repeating disposition`, async ({
    page,
    baseURL,
  }) => {
    await page.clock.setFixedTime(new Date(calendar.capturedAtUtc));
    await setupCommonRoutes(page, calendar);
    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseURL! }]);
    await page.addInitScript(
      (id) =>
        localStorage.setItem(
          'family-storage',
          JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 })
        ),
      MOCK_IDS.MEMBER_ALEX
    );
    await page.route('**/api/schedule/fill-the-gap**', (route) =>
      route.fulfill({
        json: {
          data: [
            builders.scheduleRecipe({
              id: MOCK_IDS.RECIPE_LASAGNA,
              name: 'Replacement Lasagna',
              description: 'Layered pasta with rich tomato sauce.',
              ingredients: ['Lasagna noodles', 'Tomato sauce'],
            }),
          ],
        },
      })
    );
    await page.goto('/onboarding');
    await page.evaluate(async (recipeId) => {
      await fetch('/api/schedule/assign?referenceWeekStartDate=2026-10-05', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekOffset: 0, dayIndex: 6, recipeId }),
      });
    }, MOCK_IDS.RECIPE_CHICKEN);
    await page.goto('/home');
    await page.getByTestId('skip-tonight-btn').click();
    await page.getByTestId('recovery-action-pick-else').click();
    const detailsToggle = page.getByTestId('quick-find-details-toggle');
    await expect(detailsToggle).toHaveAttribute('aria-expanded', 'false');
    await detailsToggle.click();
    await expect(detailsToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByText('Layered pasta with rich tomato sauce.')).toBeVisible();
    await expect(page.getByText('Lasagna noodles')).toBeVisible();
    await page.getByTestId('quick-find-select').click();
    let assignments = 0,
      dispositions = 0,
      moveIntents: string[] = [];
    page.on('request', (request) => {
      if (
        request.method() !== 'GET' &&
        /\/api\/schedule\/(move|day\/.*\/remove)/.test(request.url())
      ) {
        dispositions++;
        if (request.url().includes('/api/schedule/move')) {
          moveIntents.push(request.postDataJSON()?.intent ?? '');
        }
      }
    });
    await page.route('**/api/schedule/assign**', async (route) => {
      assignments++;
      expect(route.request().postDataJSON()).toMatchObject({
        requireEmpty: true,
        weekOffset: 0,
        dayIndex: 6,
        recipeId: MOCK_IDS.RECIPE_LASAGNA,
      });
      expect(new URL(route.request().url()).searchParams.get('referenceWeekStartDate')).toBe(
        '2026-10-05'
      );
      if (assignments === 1)
        return route.fulfill({ status: 400, json: { message: 'Injected save rejection' } });
      return route.fallback();
    });
    await page.getByTestId(`recovery-action-${action}`).click();
    await expect(page.getByTestId('recovery-retry-save')).toBeVisible();
    await expect(page.getByTestId('quick-find-close')).not.toBeVisible();
    await expect(page.getByTestId('recovery-dialog-title')).toBeVisible();
    expect(dispositions).toBe(1);
    await page.getByTestId('recovery-retry-save').click();
    await expect(page.getByTestId('recovery-dialog-title')).not.toBeVisible();
    expect(assignments).toBe(2);
    expect(dispositions).toBe(1);
    if (action === 'next-week') expect(moveIntents).toEqual(['defer']);
    if (action === 'tomorrow') expect(moveIntents).toEqual(['tomorrow']);
    const plan = await page.evaluate(
      async () =>
        (await (await fetch('/api/schedule?weekOffset=0&referenceWeekStartDate=2026-10-05')).json())
          .data
    );
    expect(plan.days[6].recipe.id).toBe(MOCK_IDS.RECIPE_LASAGNA);
    await page.reload();
    const persisted = await page.evaluate(
      async () =>
        (await (await fetch('/api/schedule?weekOffset=0&referenceWeekStartDate=2026-10-05')).json())
          .data
    );
    expect(persisted.days[6].recipe.id).toBe(MOCK_IDS.RECIPE_LASAGNA);
  });
}

test('unknown save offers Retry check, then only an explicit save; leaving retains moved original', async ({
  page,
  baseURL,
}) => {
  await page.clock.setFixedTime(new Date(calendar.capturedAtUtc));
  await setupCommonRoutes(page, calendar);
  await page
    .context()
    .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseURL! }]);
  await page.addInitScript(
    (id) =>
      localStorage.setItem(
        'family-storage',
        JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 })
      ),
    MOCK_IDS.MEMBER_ALEX
  );
  await page.route('**/api/schedule/fill-the-gap**', (route) =>
    route.fulfill({
      json: {
        data: [
          builders.scheduleRecipe({ id: MOCK_IDS.RECIPE_LASAGNA, name: 'Replacement Lasagna' }),
        ],
      },
    })
  );
  await page.goto('/onboarding');
  await page.evaluate(async (recipeId) => {
    await fetch('/api/schedule/assign?referenceWeekStartDate=2026-10-05', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekOffset: 0, dayIndex: 6, recipeId }),
    });
  }, MOCK_IDS.RECIPE_CHICKEN);
  await page.goto('/home');
  await page.getByTestId('skip-tonight-btn').click();
  await page.getByTestId('recovery-action-pick-else').click();
  await page.getByTestId('quick-find-select').click();
  let assignments = 0,
    blockReads = false;
  await page.route('**/api/schedule?*', (route) =>
    blockReads
      ? route.fulfill({ status: 503, json: { message: 'Read unavailable' } })
      : route.fallback()
  );
  await page.route('**/api/schedule/assign**', (route) => {
    assignments++;
    blockReads = true;
    return route.fulfill({ status: 504, json: { message: 'Unknown save' } });
  });
  await page.getByTestId('recovery-action-tomorrow').click();
  await expect(page.getByTestId('recovery-retry-check')).toBeVisible();
  await expect(page.getByTestId('replacement-feedback')).toBeFocused();
  await expect(page.getByTestId('recovery-retry-save')).not.toBeVisible();
  expect(assignments).toBe(1);
  blockReads = false;
  await page.getByTestId('recovery-retry-check').press('Enter');
  await expect(page.getByTestId('recovery-retry-save')).toBeVisible();
  expect(assignments).toBe(1);
  await page.getByTestId('recovery-close').click();
  await expect(page.getByTestId('recovery-keep-editing')).toBeFocused();
  await page.getByTestId('recovery-keep-editing').press('Enter');
  await expect(page.getByTestId('recovery-retry-save')).toBeVisible();
  await page.getByTestId('recovery-close').click();
  await page.getByTestId('recovery-abandon').click();
  await expect(page.getByTestId('recovery-dialog-title')).not.toBeVisible();
  expect(assignments).toBe(1);
  const weeks = await page.evaluate(async () =>
    Promise.all(
      [0, 1].map(
        async (week) =>
          (
            await (
              await fetch(`/api/schedule?weekOffset=${week}&referenceWeekStartDate=2026-10-05`)
            ).json()
          ).data
      )
    )
  );
  expect(weeks[0].days[6].recipe).toBeNull();
  expect(weeks[1].days[0].recipe.id).toBe(MOCK_IDS.RECIPE_CHICKEN);
});

for (const appLocale of ['en', 'fr'] as const) {
  test.describe(`Plan B Pixel 10 zero-scroll and locked header ${appLocale}`, () => {
    test.use({ appLocale });

    test('maintains 0px Plan B title shift, zero-scroll on 412x915, AA/AAA contrast, and 320px/200% reflow', async ({
      page,
      baseURL,
    }) => {
      await page.setViewportSize({ width: 412, height: 915 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.clock.setFixedTime(new Date(calendar.capturedAtUtc));
      await setupCommonRoutes(page, calendar, {
        canonicalEditor: builders.recipe({
          id: MOCK_IDS.RECIPE_CHICKEN,
          name: 'Grilled Cilantro Lime Chicken with Mango Avocado Salsa',
          isReady: true,
          isDiscoverable: true,
        }),
      });
      await page
        .context()
        .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseURL! }]);
      await page.addInitScript(
        (id) =>
          localStorage.setItem(
            'family-storage',
            JSON.stringify({ state: { selectedFamilyMemberId: id }, version: 0 })
          ),
        MOCK_IDS.MEMBER_ALEX
      );

      // Seed the long multi-word recipe title on Sunday Oct 11 through the stateful mock API
      await page.goto('/onboarding');
      await page.evaluate(async (recipeId) => {
        await fetch('/api/schedule/assign?referenceWeekStartDate=2026-10-05', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ weekOffset: 0, dayIndex: 6, recipeId }),
        });
      }, MOCK_IDS.RECIPE_CHICKEN);

      await page.goto('/home');
      await expect(page.getByTestId('tonight-menu-card')).toBeVisible();
      await page.getByTestId('skip-tonight-btn').click();

      const panel = page.getByTestId('recovery-dialog-panel');
      const title = page.getByTestId('recovery-dialog-title');
      await expect(panel).toBeVisible();

      const measureZeroScroll = async () =>
        panel.evaluate((el) => {
          const panelScroll = el.scrollHeight <= el.clientHeight + 1;
          const body = el.lastElementChild as HTMLElement | null;
          const bodyScroll = body ? body.scrollHeight <= body.clientHeight + 1 : true;
          const backdropFilter = getComputedStyle(el).backdropFilter;
          return {
            panelScroll,
            bodyScroll,
            backdropFilter,
            height: el.getBoundingClientRect().height,
          };
        });

      const step1Box = await title.boundingBox();
      const step1Metrics = await measureZeroScroll();
      expect(step1Metrics.panelScroll).toBe(true);
      expect(step1Metrics.bodyScroll).toBe(true);
      expect(step1Metrics.backdropFilter).toBe('none');

      // AA and AAA visual a11y on Step 1
      await assertCookbookVisualA11y(page, {
        rootSelector: '[data-testid="recovery-dialog-panel"]',
        contrastLevel: 'aa',
      });
      await page.evaluate(() => {
        document.documentElement.dataset.contrast = 'high';
      });
      await expect(title).toHaveCSS('color', 'rgb(123, 56, 41)');
      await assertCookbookVisualA11y(page, {
        rootSelector: '[data-testid="recovery-dialog-panel"]',
        contrastLevel: 'aaa',
      });
      await page.evaluate(() => {
        delete document.documentElement.dataset.contrast;
      });

      // Transition to Step 2 via Eating out and verify 0px X/Y title shift and zero-scroll
      await page.getByTestId('recovery-action-eating-out').click();
      await expect(page.getByTestId('recovery-action-tomorrow')).toBeVisible();
      const step2Box = await title.boundingBox();
      expect(Math.abs(step2Box!.x - step1Box!.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(step2Box!.y - step1Box!.y)).toBeLessThanOrEqual(1);

      const step2Metrics = await measureZeroScroll();
      expect(step2Metrics.panelScroll).toBe(true);
      expect(step2Metrics.bodyScroll).toBe(true);

      const backBox = await page.getByTestId('recovery-go-back').boundingBox();
      const closeBox = await page.getByTestId('recovery-close').boundingBox();
      expect(backBox!.height).toBeGreaterThanOrEqual(48);
      expect(closeBox!.height).toBeGreaterThanOrEqual(48);
      expect(closeBox!.width).toBeGreaterThanOrEqual(48);

      // AA and AAA visual a11y on Step 2
      await assertCookbookVisualA11y(page, {
        rootSelector: '[data-testid="recovery-dialog-panel"]',
        contrastLevel: 'aa',
      });
      await page.evaluate(() => {
        document.documentElement.dataset.contrast = 'high';
      });
      await expect(title).toHaveCSS('color', 'rgb(123, 56, 41)');
      await assertCookbookVisualA11y(page, {
        rootSelector: '[data-testid="recovery-dialog-panel"]',
        contrastLevel: 'aaa',
      });
      await page.evaluate(() => {
        delete document.documentElement.dataset.contrast;
      });

      // 320px / 200% text scaling reflow check (no horizontal overflow on Step 2 or Step 1 + Made plans)
      await page.setViewportSize({ width: 320, height: 568 });
      await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
      expect(await panel.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      await page.getByTestId('recovery-go-back').click();
      await page.getByTestId('recovery-action-made-plans').click();
      await expect(page.getByTestId('recovery-custom-plan-input')).toBeVisible();
      expect(await panel.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    });
  });
}
