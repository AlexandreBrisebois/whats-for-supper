import { test, expect } from './fixtures';
import { builders, MOCK_IDS, setupCommonRoutes, mockSseWithConnectedSchedule } from './mock-api';

for (const locale of ['en', 'fr'] as const) {
  test.describe(`saved food shopping in ${locale}`, () => {
    test.use({ appLocale: locale, dateOnlyClock: true });
    test('uses server labels and corrects the food category without changing checked demand', async ({
      page,
      baseURL,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      const { groceryRows } = await setupCommonRoutes(page);
      await page.route('**/api/family', (route) =>
        route.request().method() === 'GET'
          ? route.fulfill({
              json: {
                data: [
                  builders.familyMember({ id: MOCK_IDS.MEMBER_ALEX, preferredLanguage: locale }),
                ],
              },
            })
          : route.fallback()
      );
      await page
        .context()
        .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseURL! }]);
      const schedule = {
        ...builders.scheduleDays(),
        groceryItems: [
          {
            ...builders.groceryItems(['onion'])[0],
            foodId: '09000000-0000-4000-8000-000000000001',
            displayLabels: { en: 'onions', fr: 'oignons' },
            labelStatus: 'resolved',
            displayNameVariants: { en: [], fr: [] },
            categoryScope: 'food',
            categoryStatus: 'conflict',
            categoryRevision: null,
            categoryChoices: [
              { normalizedKey: 'oignon', grocerySection: 'Pantry', source: 'legacy' },
            ],
            section: 'Produce',
            recipeIds: [MOCK_IDS.RECIPE_LASAGNA],
          },
        ],
      };
      groceryRows.decorate(schedule);
      const first = groceryRows.snapshot(schedule.weekStartDate).groceryItems[0];
      expect(
        groceryRows.mutate(schedule.weekStartDate, 'item', {
          rowId: first.rowId,
          expectedRowVersion: first.rowVersion,
          weekStartDate: schedule.weekStartDate,
          checked: true,
          clientMutationId: '09000000-0000-4000-8000-000000000003',
        }).status
      ).toBe(200);
      const before = groceryRows.snapshot(schedule.weekStartDate);
      await page.route(
        (url) => url.pathname === '/api/schedule',
        (route) =>
          route.fulfill({
            json: { data: { ...schedule, ...groceryRows.snapshot(schedule.weekStartDate) } },
          })
      );
      await mockSseWithConnectedSchedule(page, { ...schedule, ...before } as any);
      const writes: Array<{ path: string; body: unknown }> = [];
      page.on('request', (request) => {
        if (request.method() === 'PATCH')
          writes.push({ path: new URL(request.url()).pathname, body: request.postDataJSON() });
      });
      await page.goto('/planner?tab=grocery');
      await page.getByTestId('grocery-tab').click();
      const label = locale === 'fr' ? 'oignons' : 'onions';
      const item = page.locator(`[data-row-id="${first.rowId}"]`);
      await expect(item).toContainText(label);
      await expect(item).toHaveAttribute('aria-checked', 'true');
      expect(writes).toEqual([]);
      const aisle = page.getByTestId('aisle-section-Produce').getByRole('button').first();
      if ((await aisle.getAttribute('aria-expanded')) !== 'true') await aisle.click();
      await page.locator(`[data-testid="reclassify-btn"][data-item-name="${label}"]`).click();
      await expect(page.getByTestId('category-prior-choices')).toBeVisible();
      await page.getByTestId('section-option-Pantry').click();
      await expect(page.getByTestId('section-picker')).toHaveCount(0);
      await expect(
        page.getByTestId('aisle-section-Pantry').locator(`[data-row-id="${first.rowId}"]`)
      ).toHaveAttribute('aria-checked', 'true');
      expect(writes).toEqual([
        {
          path: '/api/foods/09000000-0000-4000-8000-000000000001/category',
          body: { grocerySection: 'Pantry', expectedCategoryRevision: null },
        },
      ]);
      const after = groceryRows.snapshot(schedule.weekStartDate);
      expect(after.groceryState).toEqual(before.groceryState);
      expect(after.groceryItems[0]).toMatchObject({
        rowId: first.rowId,
        rowVersion: before.groceryItems[0].rowVersion,
        demandIdentity: before.groceryItems[0].demandIdentity,
        quantity: before.groceryItems[0].quantity,
      });
      expect(after.groceryItems[0].categoryChoices).toEqual(before.groceryItems[0].categoryChoices);
    });
  });
}

test.describe('fenced migration presentation epoch', () => {
  test.use({ dateOnlyClock: true });
  test('rejects prior requests before replay and retains fresh human checks on reread', async ({
    page,
    baseURL,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const { groceryRows } = await setupCommonRoutes(page);
    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseURL! }]);
    const schedule = { ...builders.scheduleDays(), groceryItems: builders.groceryItems(['flour']) };
    const preservedDays = structuredClone(schedule.days);
    groceryRows.decorate(schedule);
    const before = groceryRows.snapshot(schedule.weekStartDate);
    const oldItem = {
      rowId: before.groceryItems[0].rowId,
      expectedRowVersion: before.groceryItems[0].rowVersion,
      weekStartDate: before.weekStartDate,
      checked: true,
      clientMutationId: MOCK_IDS.RECIPE_CHICKEN,
      expectedPresentationEpoch: before.presentationEpoch,
    };
    expect(groceryRows.mutate(before.weekStartDate, 'item', oldItem).status).toBe(200);
    const checked = groceryRows.snapshot(before.weekStartDate);
    const oldBulk = {
      weekStartDate: before.weekStartDate,
      expectedListVersion: checked.groceryListVersion,
      checks: checked.groceryState,
      clientMutationId: MOCK_IDS.RECIPE_LASAGNA,
      expectedPresentationEpoch: before.presentationEpoch,
    };
    expect(groceryRows.mutate(before.weekStartDate, 'bulk', oldBulk).status).toBe(200);
    // Assemble the recorded server snapshot through the existing mock owner;
    // executor/atomic-reset semantics are qualified by PostgreSQL tests.
    const migrationEpoch = '09000000-0000-4000-8000-000000000055';
    groceryRows.advanceGeneration(migrationEpoch);
    const prior = groceryRows.snapshot(before.weekStartDate);
    expect(
      groceryRows.mutate(before.weekStartDate, 'item', {
        ...oldItem,
        expectedRowVersion: prior.groceryItems[0].rowVersion,
        checked: false,
        clientMutationId: MOCK_IDS.RECIPE_GNOCCHI,
        expectedPresentationEpoch: migrationEpoch,
      }).status
    ).toBe(200);
    const migrated = groceryRows.snapshot(before.weekStartDate);
    await page.route(
      (url) => url.pathname === '/api/schedule',
      (route) =>
        route.fulfill({
          json: { data: { ...schedule, ...groceryRows.snapshot(before.weekStartDate) } },
        })
    );
    await mockSseWithConnectedSchedule(page, { ...schedule, ...migrated } as any);
    await page.goto('/planner?tab=grocery');
    await page.getByTestId('grocery-tab').click();
    const item = page.locator(`[data-row-id="${oldItem.rowId}"]`);
    await expect(item).toHaveAttribute('aria-checked', 'false');
    for (const [suffix, body] of [
      ['/item', oldItem],
      ['', oldBulk],
    ] as const) {
      const refused = await page.evaluate(
        async ({ suffix, body }) => {
          const response = await fetch(`/api/schedule/0/grocery${suffix}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          return { status: response.status, body: await response.json() };
        },
        { suffix, body }
      );
      expect(refused).toMatchObject({ status: 409, body: { code: 'epoch_conflict' } });
    }
    expect(groceryRows.snapshot(before.weekStartDate)).toEqual(migrated);
    const sent = page.waitForRequest(
      (request) =>
        request.method() === 'PATCH' && new URL(request.url()).pathname.endsWith('/grocery/item')
    );
    const settled = page.waitForResponse(
      (response) =>
        response.status() === 200 &&
        response.request().method() === 'PATCH' &&
        new URL(response.url()).pathname.endsWith('/grocery/item')
    );
    await item.click();
    expect((await sent).postDataJSON().expectedPresentationEpoch).toBe(migrationEpoch);
    await settled;
    await expect(item).toHaveAttribute('aria-checked', 'true');
    const afterCheck = groceryRows.snapshot(before.weekStartDate);
    groceryRows.advanceGeneration(migrationEpoch);
    await page.reload();
    await page.getByTestId('grocery-tab').click();
    await expect(item).toHaveAttribute('aria-checked', 'true');
    expect(groceryRows.snapshot(before.weekStartDate)).toEqual(afterCheck);
    expect(schedule.days).toEqual(preservedDays);
  });
});
