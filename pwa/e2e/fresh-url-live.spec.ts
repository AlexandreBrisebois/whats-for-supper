import { test, expect } from '@playwright/test';
import { generateSecretToken } from './auth-utils';

test.skip(!process.env.FRESH_URL_RECIPE_ID, 'Requires producer-backed live API and built PWA.');

test('fresh URL canonical edit reaches two shoppers and dated groceries', async ({
  browser,
  request,
  baseURL,
}, info) => {
  test.setTimeout(180_000);
  const id = process.env.FRESH_URL_RECIPE_ID!;
  const secret = process.env.HEARTH_SECRET!;
  const members = process.env.FRESH_URL_MEMBERS!.split(',');
  const headers = { 'X-Hearth-Secret': secret };
  const initial = (await (await request.get(`${baseURL}/api/recipes/${id}`, { headers })).json())
    .recipe;
  expect(initial).toMatchObject({ servings: 4, ingredients: ['200 g pasta', '100 ml sauce'] });
  expect(initial.ingredientLines[0].provenance.origin).toBe('source');
  expect(initial.instructionSections[0].steps[0].bindings).toHaveLength(1);
  expect(initial.instructionSections[0].steps[0].bindings[0].role).toBe('whole');
  expect(initial.sourceUrl).toBe('https://example.test/live-pasta');
  const family = (await (await request.get(`${baseURL}/api/family`, { headers })).json()).data;
  const contexts = await Promise.all(
    members.map(() => browser.newContext({ viewport: { width: 390, height: 844 } }))
  );
  try {
    for (const [index, context] of contexts.entries()) {
      await context.addCookies([
        { name: 'h_access', value: await generateSecretToken(secret), url: baseURL! },
        { name: 'x-family-member-id', value: members[index], url: baseURL! },
      ]);
      await context.addInitScript(
        ({ member, familyMembers }) => {
          localStorage.setItem('locale', 'en');
          localStorage.setItem(
            'family-storage',
            JSON.stringify({
              state: {
                selectedFamilyMemberId: member,
                familyMembers,
                _hasHydrated: true,
                hasLoaded: true,
              },
              version: 0,
            })
          );
        },
        { member: members[index], familyMembers: family }
      );
      await context.route('**/*', (route) => {
        const url = new URL(route.request().url());
        return ['127.0.0.1', 'localhost'].includes(url.hostname) ||
          ['data:', 'blob:'].includes(url.protocol)
          ? route.continue()
          : route.abort('blockedbyclient');
      });
    }
    const [editor, shopper] = await Promise.all(contexts.map((context) => context.newPage()));
    for (const page of [editor, shopper])
      await page.clock.setFixedTime(new Date('2026-10-12T16:00:00Z'));
    // Keep another cook mounted across ordinary original-content saves.
    await shopper.goto('/home');
    await shopper.getByTestId('cook-mode-btn').click();
    const sauce = shopper.getByTestId('ingredient-toggle').filter({ hasText: '200 ml sauce' });
    await expect(sauce).toBeVisible();
    await sauce.click();
    await shopper.getByTestId('cooking-view-step-by-step').click();
    await shopper.getByTestId('cooks-mode-step-next').click();
    await expect(shopper.getByTestId('cooks-mode-instructions')).toContainText(
      'Add all 400 g pasta.'
    );
    await editor.goto(`/recipes?open=${id}`);
    await editor.getByTestId('action-gear-menu').click();
    await editor.getByRole('button', { name: 'Edit', exact: true }).click();
    await expect(editor.getByTestId('recipe-edit-amount-0')).toHaveValue('200');
    await editor.getByTestId('recipe-edit-amount-0').fill('250');
    const saving = editor.waitForResponse(
      (response) =>
        response.request().method() === 'PATCH' &&
        new URL(response.url()).pathname === `/api/recipes/${id}`
    );
    await editor.getByTestId('recipe-save-edits').click();
    const reply = await saving;
    expect(reply.status(), await reply.text()).toBe(200);
    const saved = (await reply.json()).recipe;
    expect(saved.ingredientLines[0].id).toBe(initial.ingredientLines[0].id);
    expect(saved.ingredientLines[1]).toEqual(initial.ingredientLines[1]);
    expect(saved.instructionSections[0].steps[0].id).toBe(
      initial.instructionSections[0].steps[0].id
    );
    const projection = await request.get(
      `${baseURL}/api/recipes/${id}/ingredient-projection?context=proposed&supperDate=2026-10-12`,
      { headers }
    );
    expect(projection.status()).toBe(200);
    expect((await projection.json()).lines[0].quantity).toBe(500);
    expect(saved.instructionSections[0].steps[0].text).toBe('Add all 200 g pasta.');
    await shopper.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(shopper.getByTestId('cooking-quantities-available')).toBeVisible();
    await expect(shopper.getByTestId('cooks-mode-instructions')).toContainText(
      'Add all 400 g pasta.'
    );
    await shopper.getByRole('button', { name: 'Refresh quantities', exact: true }).click();
    await expect(shopper.getByTestId('cooks-mode-instructions')).toContainText(
      'Add all 500 g pasta.'
    );
    await shopper.getByTestId('cooks-mode-step-prev').click();
    await expect(sauce).toHaveAttribute('aria-checked', 'true');
    await shopper.getByTestId('cooks-mode-step-next').click();

    // The existing generated-client step editor saves original wording and
    // discovers the replacement relationship through the same canonical owner.
    await editor.goto('/home');
    await editor.getByTestId('cook-mode-btn').click();
    await editor.getByTestId('cooking-view-step-by-step').click();
    await editor.getByTestId('cooks-mode-step-next').click();
    await editor.getByTestId('cooks-mode-edit-step').click();
    await expect(editor.getByRole('textbox')).toHaveValue('Add all 200 g pasta.');
    await editor.getByRole('textbox').fill('Add all 250 g pasta.');
    const stepSaving = editor.waitForResponse(
      (response) =>
        response.request().method() === 'PATCH' &&
        new URL(response.url()).pathname === `/api/recipes/${id}`
    );
    await editor.getByTestId('cooks-mode-save-edit').click();
    const stepReply = await stepSaving;
    expect(stepReply.status(), await stepReply.text()).toBe(200);
    const stepSaved = (await stepReply.json()).recipe;
    expect(stepSaved.instructionSections[0].steps[0].text).toBe('Add all 250 g pasta.');
    expect(stepSaved.instructionSections[0].steps[0].bindings).toHaveLength(1);
    expect(stepSaved.instructionSections[0].steps[1].text).toBe('Simmer 20 minutes at 180 °C.');
    expect(stepSaved.ingredientLines).toEqual(saved.ingredientLines);
    await shopper.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(shopper.getByTestId('cooking-quantities-available')).toBeVisible();
    await shopper.getByRole('button', { name: 'Refresh quantities', exact: true }).click();
    await expect(shopper.getByTestId('cooks-mode-instructions')).toContainText(
      'Add all 500 g pasta.'
    );
    await expect(shopper.getByTestId('cooking-step-uncertainty')).toHaveCount(0);
    await expect(shopper.getByTestId('cooks-mode-overlay')).toHaveCSS('opacity', '1');
    await shopper.getByTestId('cooks-mode-instructions').screenshot({
      path: info.outputPath('ordinary-whole-use-refreshed.png'),
      animations: 'disabled',
    });
    await shopper.getByTestId('cooks-mode-step-prev').click();
    await expect(sauce).toHaveAttribute('aria-checked', 'true');

    expect((await request.post(`${baseURL}/_test/fresh-url/recompute`, { headers })).status()).toBe(
      200
    );
    for (const page of [editor, shopper]) {
      await page.goto('/planner?weekOffset=1&referenceWeekStartDate=2026-10-05');
      await page.getByTestId('grocery-tab').click();
      await expect(
        page.getByRole('checkbox', { name: 'pasta (500 g)', exact: true })
      ).toBeVisible();
    }
    const schedule = (
      await (
        await request.get(
          `${baseURL}/api/schedule?weekOffset=1&referenceWeekStartDate=2026-10-05`,
          { headers }
        )
      ).json()
    ).data;
    const pasta = schedule.groceryItems.filter((row: any) => row.normalizedKey === 'pasta');
    expect(pasta).toHaveLength(1);
    expect(pasta[0].quantity).toEqual({ kind: 'scalar', value: { n: '500', d: '1' } });
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});

test('fresh photo canonical edit keeps original media and reaches dated groceries', async ({
  browser,
  request,
  baseURL,
}) => {
  test.setTimeout(180_000);
  const id = process.env.FRESH_PHOTO_RECIPE_ID!;
  const secret = process.env.HEARTH_SECRET!;
  const members = process.env.FRESH_URL_MEMBERS!.split(',');
  const headers = { 'X-Hearth-Secret': secret };
  const original = (await (await request.get(`${baseURL}/api/recipes/${id}`, { headers })).json())
    .recipe;
  expect(original).toMatchObject({
    isReady: true,
    servings: 4,
    ingredients: ['200 g photo pasta', '100 ml sauce'],
    sourceUrl: null,
  });
  expect(original.ingredientLines[0].provenance.origin).toBe('source');
  const family = (await (await request.get(`${baseURL}/api/family`, { headers })).json()).data;
  const contexts = await Promise.all(
    members.map(() => browser.newContext({ viewport: { width: 390, height: 844 } }))
  );
  try {
    for (const [index, context] of contexts.entries()) {
      await context.addCookies([
        { name: 'h_access', value: await generateSecretToken(secret), url: baseURL! },
        { name: 'x-family-member-id', value: members[index], url: baseURL! },
      ]);
      await context.addInitScript(
        ({ member, familyMembers }) => {
          localStorage.setItem('locale', 'en');
          localStorage.setItem(
            'family-storage',
            JSON.stringify({
              state: {
                selectedFamilyMemberId: member,
                familyMembers,
                _hasHydrated: true,
                hasLoaded: true,
              },
              version: 0,
            })
          );
        },
        { member: members[index], familyMembers: family }
      );
      await context.route('**/*', (route) => {
        const url = new URL(route.request().url());
        return ['127.0.0.1', 'localhost'].includes(url.hostname) ||
          ['data:', 'blob:'].includes(url.protocol)
          ? route.continue()
          : route.abort('blockedbyclient');
      });
    }
    const [editor, shopper] = await Promise.all(contexts.map((context) => context.newPage()));
    for (const page of [editor, shopper])
      await page.clock.setFixedTime(new Date('2026-10-25T01:30:00Z'));
    await editor.goto(`/recipes?open=${id}`);
    await editor.getByTestId('action-gear-menu').click();
    await editor.getByRole('button', { name: 'Edit', exact: true }).click();
    await expect(editor.getByTestId('recipe-edit-amount-0')).toHaveValue('200');
    await editor.getByTestId('recipe-edit-amount-0').fill('250');
    const saving = editor.waitForResponse(
      (response) =>
        response.request().method() === 'PATCH' &&
        new URL(response.url()).pathname === `/api/recipes/${id}`
    );
    await editor.getByTestId('recipe-save-edits').click();
    const reply = await saving;
    expect(reply.status(), await reply.text()).toBe(200);
    const saved = (await reply.json()).recipe;
    expect(saved.ingredientLines[0].id).toBe(original.ingredientLines[0].id);
    expect(saved.ingredientLines[1]).toEqual(original.ingredientLines[1]);
    expect(saved.instructionSections[0].steps[0].id).toBe(
      original.instructionSections[0].steps[0].id
    );
    expect(saved.ingredientLines[0].provenance.origin).toBe('human');
    const projection = await request.get(
      `${baseURL}/api/recipes/${id}/ingredient-projection?context=proposed&supperDate=2026-10-25`,
      { headers }
    );
    expect(projection.status()).toBe(200);
    expect((await projection.json()).lines[0].quantity).toBe(500);
    expect(
      (await request.post(`${baseURL}/_test/fresh-url/recompute-photo`, { headers })).status()
    ).toBe(200);
    for (const page of [editor, shopper]) {
      await page.goto('/planner?weekOffset=2&referenceWeekStartDate=2026-10-05');
      await page.getByTestId('grocery-tab').click();
      await expect(
        page.getByRole('checkbox', { name: 'photo pasta (500 g)', exact: true })
      ).toBeVisible();
    }
    const schedule = (
      await (
        await request.get(
          `${baseURL}/api/schedule?weekOffset=2&referenceWeekStartDate=2026-10-05`,
          { headers }
        )
      ).json()
    ).data;
    const pasta = schedule.groceryItems.filter((row: any) => row.normalizedKey === 'photo pasta');
    expect(pasta).toHaveLength(1);
    expect(pasta[0].quantity).toEqual({ kind: 'scalar', value: { n: '500', d: '1' } });
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});

test('retained URL material becomes Ready after browser correction and reviewed import', async ({
  browser,
  request,
  baseURL,
}) => {
  test.setTimeout(180_000);
  const id = process.env.REVIEW_URL_RECIPE_ID!;
  const secret = process.env.HEARTH_SECRET!;
  const member = process.env.FRESH_URL_MEMBERS!.split(',')[0];
  const headers = { 'X-Hearth-Secret': secret };
  const original = (await (await request.get(`${baseURL}/api/recipes/${id}`, { headers })).json())
    .recipe;
  expect(original).toMatchObject({
    isReady: false,
    ingredients: ['200 g pasta, diced', '100 ml sauce'],
    sourceUrl: 'https://example.test/reviewed-pasta',
    importIssue: { status: 'readyToReview', isReimporting: false },
  });
  const family = (await (await request.get(`${baseURL}/api/family`, { headers })).json()).data;
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    await context.addCookies([
      { name: 'h_access', value: await generateSecretToken(secret), url: baseURL! },
      { name: 'x-family-member-id', value: member, url: baseURL! },
    ]);
    await context.addInitScript(
      ({ memberId, familyMembers }) => {
        localStorage.setItem('locale', 'en');
        localStorage.setItem(
          'family-storage',
          JSON.stringify({
            state: {
              selectedFamilyMemberId: memberId,
              familyMembers,
              _hasHydrated: true,
              hasLoaded: true,
            },
            version: 0,
          })
        );
      },
      { memberId: member, familyMembers: family }
    );
    await context.route('**/*', (route) => {
      const url = new URL(route.request().url());
      return ['127.0.0.1', 'localhost'].includes(url.hostname) ||
        ['data:', 'blob:'].includes(url.protocol)
        ? route.continue()
        : route.abort('blockedbyclient');
    });
    const editor = await context.newPage();
    await editor.clock.setFixedTime(new Date('2026-10-12T01:30:00Z'));
    await editor.goto(`/recipes?open=${id}`);
    await editor.getByTestId('action-gear-menu').click();
    await editor.getByTestId('action-edit-recipe').click();
    await editor.getByTestId('recipe-edit-ingredient-0').fill('250 g pasta');
    await editor.getByRole('textbox', { name: 'Step 1 instructions' }).fill('Cook gently.');
    await editor.getByTestId('recipe-save-edits').click();
    await expect(editor.getByTestId('recipe-save-edits')).toHaveCount(0);
    const corrected = (
      await (await request.get(`${baseURL}/api/recipes/${id}`, { headers })).json()
    ).recipe;
    expect(corrected).toMatchObject({
      isReady: false,
      ingredients: ['250 g pasta', '100 ml sauce'],
    });
    expect(corrected.importIssue.status).toBe('readyToReview');
    await editor.getByTestId('action-gear-menu').click();
    await editor.getByTestId('action-report-import-issue').click();
    await editor
      .getByTestId('import-issue-note')
      .fill('I corrected the pasta to 250 g and the cooking step.');
    const submitted = editor.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().endsWith(`/api/recipes/${id}/import-report`)
    );
    await editor.getByTestId('import-issue-save').click();
    const report = await (await submitted).json();
    expect(report.reimportStarted).toBe(true);
    expect(
      (
        await request.post(`${baseURL}/_test/fresh-url/complete-review/${report.importId}`, {
          headers,
        })
      ).status()
    ).toBe(200);
    const ready = (await (await request.get(`${baseURL}/api/recipes/${id}`, { headers })).json())
      .recipe;
    expect(ready).toMatchObject({
      isReady: true,
      ingredients: ['250 g pasta', '100 ml sauce'],
      sourceUrl: original.sourceUrl,
      importIssue: { status: 'readyToReview', isReimporting: false },
    });
    expect(ready.ingredientLines[0].provenance.origin).toBe('human');
    expect(ready.instructionSections[0].steps[0].text).toBe('Cook gently.');
    const projection = await request.get(
      `${baseURL}/api/recipes/${id}/ingredient-projection?context=proposed&supperDate=2026-10-19`,
      { headers }
    );
    expect(projection.status()).toBe(200);
    expect((await projection.json()).lines[0].quantity).toBe(500);
    await editor.goto('/planner?weekOffset=2&referenceWeekStartDate=2026-10-05');
    await editor.getByTestId('grocery-tab').click();
    await expect(
      editor.getByRole('checkbox', { name: 'pasta (500 g)', exact: true })
    ).toBeVisible();
    const schedule = (
      await (
        await request.get(
          `${baseURL}/api/schedule?weekOffset=2&referenceWeekStartDate=2026-10-05`,
          { headers }
        )
      ).json()
    ).data;
    expect(schedule.groceryItems.filter((row: any) => row.normalizedKey === 'pasta')).toHaveLength(
      1
    );
  } finally {
    await context.close();
  }
});
