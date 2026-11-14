import { test, expect } from '@playwright/test';
import { generateSecretToken } from './auth-utils';

test.skip(
  !process.env.BILINGUAL_SOURCE_IDS,
  'Requires the reviewed-release PostgreSQL producer and an isolated built PWA.'
);

for (const locale of ['en', 'fr'] as const) {
  test(`reviewed ${locale} source mapping survives a generated-client quantity Save`, async ({
    browser,
    request,
    baseURL,
  }) => {
    test.setTimeout(90_000);
    const ids = JSON.parse(process.env.BILINGUAL_SOURCE_IDS!);
    const id = ids[locale];
    const member = process.env.BILINGUAL_MEMBER_ID!;
    const secret = process.env.HEARTH_SECRET!;
    const headers = { 'X-Hearth-Secret': secret };
    const initialReply = await request.get(`${baseURL}/api/recipes/${id}`, { headers });
    expect(initialReply.status()).toBe(200);
    const initial = (await initialReply.json()).recipe;
    expect(initial.ingredientLines.map((line: any) => line.shopping.foodId)).toEqual([
      'ac9818ee-4c30-4f91-a4ea-0aa4fc7265ee',
      'd9940182-48c9-4823-a820-1c7c54869d5f',
      '031a0c4b-2d73-4a70-88aa-8ad3dd680ebb',
      null,
      null,
    ]);
    expect(initial.ingredients[0]).toBe(
      locale === 'fr' ? '25 g oignon émincé' : '25 g onion, diced'
    );
    const family = (await (await request.get(`${baseURL}/api/family`, { headers })).json()).data;
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    try {
      await context.addCookies([
        { name: 'h_access', value: await generateSecretToken(secret), url: baseURL! },
        { name: 'x-family-member-id', value: member, url: baseURL! },
      ]);
      await context.addInitScript(
        ({ locale, member, family }) => {
          localStorage.setItem('locale', locale);
          localStorage.setItem(
            'family-storage',
            JSON.stringify({
              state: {
                selectedFamilyMemberId: member,
                familyMembers: family,
                _hasHydrated: true,
                hasLoaded: true,
              },
              version: 0,
            })
          );
        },
        { locale, member, family }
      );
      await context.route('**/*', (route) => {
        const url = new URL(route.request().url());
        return ['127.0.0.1', 'localhost'].includes(url.hostname) ||
          ['data:', 'blob:'].includes(url.protocol)
          ? route.continue()
          : route.abort('blockedbyclient');
      });
      const page = await context.newPage();
      await page.clock.setFixedTime(new Date('2026-10-12T16:00:00Z'));
      await page.goto(`/recipes?open=${id}`);
      await page.getByTestId('action-gear-menu').click();
      await page.getByTestId('action-edit-recipe').click();
      await expect(page.getByTestId('recipe-edit-amount-0')).toHaveValue('25');
      await page.getByTestId('recipe-edit-amount-0').fill('50');
      const sent = page.waitForRequest(
        (request) =>
          request.method() === 'PATCH' && new URL(request.url()).pathname === `/api/recipes/${id}`
      );
      const settled = page.waitForResponse(
        (response) =>
          response.request().method() === 'PATCH' &&
          new URL(response.url()).pathname === `/api/recipes/${id}`
      );
      await page.getByTestId('recipe-save-edits').click();
      const submitted = (await sent).postDataJSON();
      expect(submitted.expectedContentRevision).toBe(initial.contentRevision);
      expect(submitted.ingredientLines.map((line: any) => line.shopping)).toEqual(
        initial.ingredientLines.map((line: any) => line.shopping)
      );
      const response = await settled;
      expect(response.status(), await response.text()).toBe(200);
      const saved = (await response.json()).recipe;
      expect(saved.contentRevision).not.toBe(initial.contentRevision);
      expect(saved.ingredientLines[0].amountText).toBe('50');
      expect(saved.ingredientLines.map((line: any) => line.shopping)).toEqual(
        initial.ingredientLines.map((line: any) => line.shopping)
      );
      expect(saved.instructionSections).toEqual(initial.instructionSections);
      expect(saved.ingredientLines.slice(1)).toEqual(initial.ingredientLines.slice(1));
      await page.reload();
      await page.getByTestId('action-gear-menu').click();
      await page.getByTestId('action-edit-recipe').click();
      await expect(page.getByTestId('recipe-edit-amount-0')).toHaveValue('50');
      const reread = (await (await request.get(`${baseURL}/api/recipes/${id}`, { headers })).json())
        .recipe;
      expect(reread.contentRevision).toBe(saved.contentRevision);
      expect(reread.ingredientLines).toEqual(saved.ingredientLines);
    } finally {
      await context.close();
    }
  });
}

test('two members read reviewed EN/FR grocery labels and keep one shared checked demand', async ({
  browser,
  request,
  baseURL,
}) => {
  test.setTimeout(90_000);
  const headers = { 'X-Hearth-Secret': process.env.HEARTH_SECRET! };
  const members: string[] = JSON.parse(process.env.BILINGUAL_MEMBER_IDS!);
  expect(members).toHaveLength(2);
  const family = (await (await request.get(`${baseURL}/api/family`, { headers })).json()).data;
  const ids: Record<string, string> = JSON.parse(process.env.BILINGUAL_SOURCE_IDS!);
  // The fixture executes the real recompute owner after the preceding editor Saves.
  expect((await request.post(`${baseURL}/_test/bilingual/recompute`, { headers })).status()).toBe(
    204
  );
  const read = async () => {
    const response = await request.get(
      `${baseURL}/api/schedule?weekOffset=0&referenceWeekStartDate=2026-10-12`,
      { headers }
    );
    expect(response.status()).toBe(200);
    return (await response.json()).data;
  };
  const before = await read();
  const onion = before.groceryItems.find(
    (row: any) => row.foodId === 'ac9818ee-4c30-4f91-a4ea-0aa4fc7265ee'
  );
  expect(onion.quantity).toEqual({ kind: 'scalar', value: { n: '100', d: '1' } });
  expect(onion.recipeIds.sort()).toEqual(Object.values(ids).sort());
  const recipes = await Promise.all(
    Object.values(ids).map(
      async (id) =>
        (await (await request.get(`${baseURL}/api/recipes/${id}`, { headers })).json()).recipe
    )
  );
  const contexts = await Promise.all(
    ['en', 'fr'].map(async (locale, index) => {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      await context.addCookies([
        {
          name: 'h_access',
          value: await generateSecretToken(process.env.HEARTH_SECRET!),
          url: baseURL!,
        },
        { name: 'x-family-member-id', value: members[index], url: baseURL! },
      ]);
      await context.addInitScript(
        ({ locale, member, family }) => {
          localStorage.setItem('locale', locale);
          localStorage.setItem(
            'family-storage',
            JSON.stringify({
              state: {
                selectedFamilyMemberId: member,
                familyMembers: family,
                _hasHydrated: true,
                hasLoaded: true,
              },
              version: 0,
            })
          );
        },
        { locale, member: members[index], family }
      );
      await context.route('**/*', (route) => {
        const url = new URL(route.request().url());
        return ['127.0.0.1', 'localhost'].includes(url.hostname) ||
          ['data:', 'blob:'].includes(url.protocol)
          ? route.continue()
          : route.abort('blockedbyclient');
      });
      return context;
    })
  );
  try {
    const pages = await Promise.all(contexts.map((context) => context.newPage()));
    const writes: string[] = [];
    for (const page of pages) {
      page.on('request', (sent) => {
        if (['PATCH', 'POST', 'DELETE'].includes(sent.method()))
          writes.push(`${sent.method()} ${new URL(sent.url()).pathname}`);
      });
    }
    const item = (page: (typeof pages)[number]) =>
      page.locator(`[data-testid="grocery-item-checkbox"][data-row-id="${onion.rowId}"]`);
    await Promise.all(
      pages.map(async (page, index) => {
        await page.clock.setFixedTime(new Date('2026-10-12T16:00:00Z'));
        await page.goto('/planner?tab=grocery&weekOffset=0&referenceWeekStartDate=2026-10-12');
        await page.getByTestId('grocery-tab').click();
        await expect(item(page)).toHaveAttribute('aria-checked', 'false');
        await expect(item(page).getByTestId('grocery-item-label')).toHaveText(
          index === 0 ? 'Fresh bulb onion' : 'Oignon frais'
        );
      })
    );
    expect(writes).toEqual([]);
    expect((await read()).groceryItems).toEqual(before.groceryItems);
    const saved = pages[0].waitForResponse(
      (response) =>
        response.request().method() === 'PATCH' &&
        new URL(response.url()).pathname === '/api/schedule/0/grocery/item'
    );
    await item(pages[0]).focus();
    await item(pages[0]).press('Space');
    const reply = await saved;
    expect(reply.status(), await reply.text()).toBe(200);
    expect(reply.request().postDataJSON()).toMatchObject({
      rowId: onion.rowId,
      weekStartDate: '2026-10-12',
      expectedRowVersion: onion.rowVersion,
      expectedPresentationEpoch: before.presentationEpoch,
      checked: true,
    });
    await expect(item(pages[0])).toHaveAttribute('aria-checked', 'true');
    const checked = await read();
    expect(checked.groceryState[onion.rowId]).toBe(true);
    for (const row of before.groceryItems.filter((row: any) => row.rowId !== onion.rowId))
      expect(checked.groceryState[row.rowId]).toBe(before.groceryState[row.rowId]);
    await Promise.all(
      pages.map(async (page, index) => {
        await page.reload();
        await page.getByTestId('grocery-tab').click();
        await expect(item(page)).toHaveAttribute('aria-checked', 'true');
        await expect(item(page).getByTestId('grocery-item-label')).toHaveText(
          index === 0 ? 'Fresh bulb onion' : 'Oignon frais'
        );
      })
    );
    expect(writes.filter((write) => write.startsWith('PATCH'))).toEqual([
      'PATCH /api/schedule/0/grocery/item',
    ]);
    const after = await read();
    expect(after.groceryItems).toEqual(checked.groceryItems);
    expect(after.groceryState).toEqual(checked.groceryState);
    expect(after.groceryListVersion).toBe(checked.groceryListVersion);
    for (const [index, id] of Object.values(ids).entries()) {
      const current = (
        await (await request.get(`${baseURL}/api/recipes/${id}`, { headers })).json()
      ).recipe;
      expect(current.contentRevision).toBe(recipes[index].contentRevision);
      expect(current.ingredientLines).toEqual(recipes[index].ingredientLines);
    }
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});
