import { test, expect, type Page } from '@playwright/test';
import { generateSecretToken } from './auth-utils';
import { pinCivilDate } from './date-only-clock';
import en from '../src/locales/en/common.json';
import fr from '../src/locales/fr/common.json';

const locale = process.env.CANONICAL_PACKAGE_LOCALE === 'fr' ? 'fr' : 'en';
const copy = locale === 'fr' ? fr : en;
test.skip(
  !process.env.CANONICAL_PACKAGE_LOCALE ||
    !process.env.CANONICAL_RECIPE_ID ||
    !process.env.CANONICAL_MEMBERS,
  'Requires the isolated canonical package editor API/PostgreSQL composition and built PWA.'
);

test(`declared package ${locale} uses ordinary Save and fixed capacity across portions`, async ({
  browser,
  request,
  baseURL,
}, info) => {
  test.setTimeout(180_000);
  const id = process.env.CANONICAL_RECIPE_ID!;
  const secret = process.env.HEARTH_SECRET!;
  const headers = { 'X-Hearth-Secret': secret };
  const members = process.env.CANONICAL_MEMBERS!.split(',');
  const planner = '/planner?weekOffset=1&referenceWeekStartDate=2026-10-05';
  const recipePath = `/api/recipes/${id}`;
  const scalar = (n: string, d = '1') => ({ kind: 'scalar', value: { n, d } });
  const read = async () => {
    const response = await request.get(`${baseURL}${recipePath}`, { headers });
    expect(response.status()).toBe(200);
    return (await response.json()).recipe;
  };
  const schedule = async () => {
    const response = await request.get(
      `${baseURL}/api/schedule?weekOffset=1&referenceWeekStartDate=2026-10-05`,
      { headers }
    );
    expect(response.status()).toBe(200);
    return (await response.json()).data;
  };
  const recompute = async () => {
    // Existing native consumer driver, invoking the actual recompute owner; not worker/DV qualification.
    expect((await request.post(`${baseURL}/_test/canonical/recompute`, { headers })).status()).toBe(
      200
    );
  };
  const initial = await read();
  expect(initial).toMatchObject({ servings: 4, ingredients: ['200 g pasta', '100 ml sauce'] });
  expect(initial.ingredientLines).toHaveLength(2);
  const family = (await (await request.get(`${baseURL}/api/family`, { headers })).json()).data;
  expect(members).toHaveLength(2);
  const contexts = await Promise.all(
    members.map(() =>
      browser.newContext({
        viewport: { width: 390, height: 844 },
        timezoneId: 'America/Toronto',
      })
    )
  );
  try {
    for (const [index, context] of contexts.entries()) {
      await context.addCookies([
        { name: 'h_access', value: await generateSecretToken(secret), url: baseURL! },
        { name: 'x-family-member-id', value: members[index], url: baseURL! },
      ]);
      await context.addInitScript(
        ({ language, member, family }) => {
          localStorage.setItem('locale', language);
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
        { language: locale, member: members[index], family }
      );
      // No application response is mocked. The deliberate lost reply below is forwarded to the actual API first.
      await context.route('**/*', (route) => {
        const url = new URL(route.request().url());
        return ['127.0.0.1', 'localhost'].includes(url.hostname) ||
          ['data:', 'blob:'].includes(url.protocol)
          ? route.continue()
          : route.abort('blockedbyclient');
      });
    }
    const [editor, shopper] = await Promise.all(contexts.map((context) => context.newPage()));
    for (const page of [editor, shopper]) {
      page.setDefaultTimeout(15_000);
      await pinCivilDate(page, '2026-10-12T01:30:00Z');
    }
    const writes: any[] = [];
    editor.on('request', (entry) => {
      if (entry.method() === 'PATCH' && new URL(entry.url()).pathname === recipePath)
        writes.push(entry.postDataJSON());
    });
    const edit = async (page: Page) => {
      await page.goto(`/recipes?open=${id}`);
      await expect(page.getByTestId('recipe-detail-name')).toHaveText(initial.name);
      await page.getByTestId('action-gear-menu').click();
      await page.getByTestId('action-edit-recipe').click();
      await expect(page.getByTestId('recipe-edit-amount-0')).toHaveValue('200');
    };
    const options = async (page: Page) => {
      const details = page
        .locator('details')
        .filter({ has: page.getByTestId('recipe-edit-package-enabled-2') });
      if (!(await details.evaluate((node) => (node as HTMLDetailsElement).open)))
        await details.locator('summary').click();
    };
    const save = async (page: Page, status = 200) => {
      const pending = page.waitForResponse(
        (response) =>
          response.request().method() === 'PATCH' && new URL(response.url()).pathname === recipePath
      );
      await page.getByTestId('recipe-save-edits').click();
      const response = await pending;
      expect(response.status(), await response.text()).toBe(status);
      const result = await response.json();
      if (status === 200) await expect(page.getByTestId('recipe-save-edits')).toHaveCount(0);
      return { result, input: response.request().postDataJSON() };
    };
    const assertOriginals = (recipe: any) => {
      expect(recipe.servings).toBe(initial.servings);
      expect(recipe.ingredientLines.slice(0, 2)).toEqual(initial.ingredientLines);
      expect(recipe.instructionSections).toEqual(initial.instructionSections);
    };
    const groceryCheck = (page: Page, row: any) =>
      page.locator(`[data-testid="grocery-item-checkbox"][data-row-id="${row.rowId}"]`);
    const openGroceries = async (page: Page) => {
      await page.goto(planner);
      await page.getByTestId('grocery-tab').click();
      for (const header of await page
        .locator('[data-testid^="aisle-header-"][aria-expanded="false"]')
        .all())
        await header.click();
    };
    const demand = async (n: string, d = '1', suffix = ' (400 g / cans; net)') => {
      const state = await schedule();
      const rows = state.groceryItems.filter(
        (row: any) => row.normalizedKey === 'tomato' && row.recipeIds.includes(id)
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        displayName: `tomato${suffix}`,
        quantity: scalar(n, d),
        quantityComplete: true,
      });
      expect(
        state.groceryItems.filter(
          (row: any) => row.recipeIds.includes(id) && row.normalizedKey === 'tomato'
        )
      ).toHaveLength(1);
      return { state, row: rows[0] };
    };
    const setUsual = async (count: number) => {
      await editor.goto('/profile/settings');
      const automatic = editor.getByTestId('usual-portions-automatic');
      await expect(automatic).toBeVisible();
      const input = editor.getByTestId('usual-portions-input');
      if (!(await automatic.isChecked()) && (await input.inputValue()) === String(count)) return;
      await automatic.uncheck();
      await input.fill(String(count));
      const pending = editor.waitForResponse(
        (response) =>
          response.request().method() === 'PUT' &&
          new URL(response.url()).pathname === '/api/schedule/servings'
      );
      await editor.getByTestId('save-usual-portions').click();
      expect((await pending).status()).toBe(200);
      await expect(editor.getByTestId('save-usual-portions')).toBeDisabled();
    };

    // Small complete tracer: only the ordinary generated-client editor produces this package.
    await edit(editor);
    await editor.getByTestId('recipe-add-ingredient').click();
    await editor.getByTestId('recipe-edit-amount-2').fill('2');
    await editor.getByTestId('recipe-edit-unit-2').fill('cans');
    await editor.getByTestId('recipe-edit-ingredient-2').fill('tomatoes');
    await options(editor);
    await editor.getByTestId('recipe-edit-package-enabled-2').check();
    await expect(editor.getByTestId('recipe-edit-package-count-unit-2')).toHaveValue('cans');
    await editor.getByTestId('recipe-edit-package-capacity-2').fill('400');
    await editor.getByTestId('recipe-edit-package-unit-2').fill('g');
    await editor.getByTestId('recipe-edit-package-basis-2').selectOption('net');
    for (const field of ['count-unit', 'capacity', 'unit', 'basis'])
      await expect(editor.getByTestId(`recipe-edit-package-${field}-2`)).toHaveAccessibleName(/\S/);
    const created = await save(editor);
    expect(created.input.expectedContentRevision).toBe(initial.contentRevision);
    expect(created.input).not.toHaveProperty('ingredients');
    expect(created.input.ingredientLines[2]).toMatchObject({
      clientId: expect.any(String),
      unit: { text: 'cans', definitionId: null },
      package: {
        countUnit: { text: 'cans', definitionId: null },
        capacity: { amount: scalar('400'), unit: { text: 'g', definitionId: null } },
        basis: 'net',
      },
    });
    const packageId = created.result.recipe.ingredientLines[2].id;
    expect(created.result.createdIds[created.input.ingredientLines[2].clientId]).toBe(packageId);
    expect(created.result.recipe.ingredientLines[2].provenance).toMatchObject({
      origin: 'human',
      sourceRef: null,
    });
    expect(created.result.recipe.ingredientLines[2].provenance.protectedFields).toContain(
      'package'
    );
    assertOriginals(created.result.recipe);
    await recompute();
    const first = await demand('4');
    const pasta = first.state.groceryItems.find((row: any) => row.normalizedKey === 'pasta');
    const sauce = first.state.groceryItems.find((row: any) => row.normalizedKey === 'sauce');
    await openGroceries(editor);
    await groceryCheck(editor, pasta).click();
    await openGroceries(shopper);
    await groceryCheck(shopper, sauce).click();
    await expect
      .poll(async () => {
        const current = await schedule();
        return [current.groceryState[pasta.rowId], current.groceryState[sauce.rowId]];
      })
      .toEqual([true, true]);

    // Profile writes use ordinary portion controls, so current Home Sunday and next-week Thursday share the chosen inherited count.
    for (const [portions, count, n, d] of [
      [4, '2', '2', '1'],
      [8, '4', '4', '1'],
      [2, '1', '1', '1'],
      [1, '1/2', '1', '2'],
      [8, '4', '4', '1'],
    ] as const) {
      await setUsual(portions);
      await recompute();
      const state = await demand(n, d);
      expect(state.row.rowId).toBe(first.row.rowId);
      expect(state.state.groceryState[pasta.rowId]).toBe(true);
      expect(state.state.groceryState[sauce.rowId]).toBe(true);
      await editor.goto(`/recipes?open=${id}`);
      await expect(editor.getByTestId('recipe-ingredient-projection')).toContainText(
        `${count} cans tomatoes (400 g / cans; net)`
      );
      await editor.getByTestId('action-gear-menu').click();
      await editor.getByTestId('action-original-quantities').click();
      await expect(
        editor.getByText('2 cans tomatoes (400 g / cans; net)', { exact: true })
      ).toBeVisible();
      await editor.getByTestId('action-gear-menu').click();
      await editor.getByTestId('action-reset-view').click();
      await expect(editor.getByTestId('recipe-ingredient-projection')).toContainText(
        `${count} cans tomatoes (400 g / cans; net)`
      );
      await editor.goto('/home');
      await editor.getByTestId('tonight-ingredients-toggle').click();
      await expect(editor.getByTestId('tonight-menu-card')).toContainText(
        `${count} cans tomatoes (400 g / cans; net)`
      );
      await editor.getByTestId('cook-mode-btn').click();
      await expect(
        editor
          .getByTestId('ingredient-toggle')
          .filter({ hasText: `${count} cans tomatoes (400 g / cans; net)` })
      ).toBeVisible();
      await editor.getByTestId('close-cooks-mode').click();
      await openGroceries(editor);
      await expect(groceryCheck(editor, state.row)).toContainText('tomatoes (400 g / cans; net)');
      await expect(
        groceryCheck(editor, state.row).getByTestId('grocery-item-quantity-hint')
      ).toContainText(portions === 1 ? '0.5 cans' : `${count} cans`);
      assertOriginals(await read());
    }
    await editor.setViewportSize({ width: 320, height: 844 });
    await edit(editor);
    await options(editor);
    await editor.getByTestId('recipe-edit-package-capacity-2').scrollIntoViewIfNeeded();
    await expect(editor.getByTestId('recipe-edit-package-capacity-2')).toBeInViewport();
    expect(
      await editor.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    ).toBe(true);
    await editor.getByTestId('recipe-cancel-edits').click();
    await editor.screenshot({
      path: info.outputPath('ordinary-package-phone.png'),
      fullPage: true,
    });

    // Active Cook keeps a coherent old ingredient snapshot until explicit refresh after the other tab's package edit.
    await shopper.goto('/home');
    await shopper.getByTestId('cook-mode-btn').click();
    await shopper.getByTestId('cooking-view-step-by-step').click();
    const sauceIngredient = shopper
      .getByTestId('ingredient-toggle')
      .filter({ hasText: '200 ml sauce' });
    await sauceIngredient.click();
    await shopper.getByTestId('cooks-mode-step-next').click();
    await expect(shopper.getByTestId('cooks-mode-step-text')).toContainText('Mix pasta and sauce.');
    const oldStep = await shopper.getByTestId('cooks-mode-step-indicator').textContent();
    await edit(editor);
    await options(editor);
    await editor.getByTestId('recipe-edit-package-capacity-2').fill('800');
    await editor.getByTestId('recipe-edit-package-basis-2').selectOption('drained');
    await save(editor);
    // Use the existing resume/read trigger; this consumer assertion does not claim SSE transport qualification.
    await shopper.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(shopper.getByTestId('cooking-quantities-available')).toBeVisible();
    await shopper.getByTestId('cooks-mode-step-prev').click();
    await expect(
      shopper
        .getByTestId('ingredient-toggle')
        .filter({ hasText: '4 cans tomatoes (400 g / cans; net)' })
    ).toBeVisible();
    await shopper.getByRole('button', { name: copy.cook.refreshQuantities, exact: true }).click();
    await expect(
      shopper
        .getByTestId('ingredient-toggle')
        .filter({ hasText: '4 cans tomatoes (800 g / cans; drained)' })
    ).toBeVisible();
    await expect(sauceIngredient).toHaveAttribute('aria-checked', 'true');
    await shopper.getByTestId('cooks-mode-step-next').click();
    await expect(shopper.getByTestId('cooks-mode-step-indicator')).toHaveText(oldStep!);
    await expect(shopper.getByTestId('cooks-mode-step-text')).toContainText('Mix pasta and sauce.');
    await shopper.getByTestId('close-cooks-mode').click();
    await recompute();
    const changedMeaning = await demand('4', '1', ' (800 g / cans; drained)');
    expect(changedMeaning.row.rowId).not.toBe(first.row.rowId);
    expect(changedMeaning.state.groceryState[changedMeaning.row.rowId]).toBe(false);
    expect(changedMeaning.state.groceryState[pasta.rowId]).toBe(true);
    expect(changedMeaning.state.groceryState[sauce.rowId]).toBe(true);

    const reconcile = async (page: Page) => {
      await page.getByRole('button', { name: copy.recipes.checkSavedRecipe, exact: true }).click();
      await page.getByRole('button', { name: copy.recipes.reconcileDraft, exact: true }).click();
      return page.getByRole('group', { name: copy.recipes.ingredients, exact: true });
    };
    const adoptCurrent = async (page: Page) => {
      await page
        .getByRole('button', {
          name: `${copy.recipes.useCurrentSaved}: ${copy.recipes.ingredients}`,
          exact: true,
        })
        .click();
      await page
        .getByRole('button', { name: copy.recipes.applyReviewedDraft, exact: true })
        .click();
      await page.getByTestId('recipe-cancel-edits').click();
    };
    // Restore400/net ordinarily, then make a package-only conflict: local400/tins/net versus remote800/cans/drained.
    await edit(editor);
    await options(editor);
    await editor.getByTestId('recipe-edit-package-capacity-2').fill('400');
    await editor.getByTestId('recipe-edit-package-basis-2').selectOption('net');
    await save(editor);
    await edit(editor);
    await options(editor);
    await editor.getByTestId('recipe-edit-package-count-unit-2').fill('tins');
    await edit(shopper);
    await options(shopper);
    await shopper.getByTestId('recipe-edit-package-capacity-2').fill('800');
    await shopper.getByTestId('recipe-edit-package-basis-2').selectOption('drained');
    const remote = (await save(shopper)).result.recipe;
    const stale = await save(editor, 409);
    expect(stale.result.code).toBe('recipe_content_conflict');
    expect((await read()).contentRevision).toBe(remote.contentRevision);
    const beforeReviewWrites = writes.length;
    const review = await reconcile(editor);
    const choices = review.locator('p.whitespace-pre-wrap');
    await expect(choices.nth(0)).toContainText(`400 g / tins · ${copy.recipes.packageBasisNet}`);
    await expect(choices.nth(1)).toContainText(
      `800 g / cans · ${copy.recipes.packageBasisDrained}`
    );
    expect(writes).toHaveLength(beforeReviewWrites);
    await editor.screenshot({
      path: info.outputPath('package-conflict-phone.png'),
      fullPage: true,
    });
    await adoptCurrent(editor);
    expect((await read()).ingredientLines[2].package.capacity.amount).toEqual(scalar('800'));

    // A remote clear remains an explicit visible choice against a retained local declaration.
    await edit(editor);
    await options(editor);
    await editor.getByTestId('recipe-edit-package-count-unit-2').fill('tins');
    await edit(shopper);
    await options(shopper);
    await shopper.getByTestId('recipe-edit-package-enabled-2').uncheck();
    await save(shopper);
    await save(editor, 409);
    const clearedReview = await reconcile(editor);
    const clearedChoices = clearedReview.locator('p.whitespace-pre-wrap');
    await expect(clearedChoices.nth(0)).toContainText(
      `800 g / tins · ${copy.recipes.packageBasisDrained}`
    );
    const currentClearedText = await clearedChoices.nth(1).textContent();
    const currentClearedTomatoes = currentClearedText!
      .split('\n')
      .find((line) => line.includes('tomatoes'));
    expect(currentClearedTomatoes).toBe(
      `2 · cans · tomatoes · tomatoes · ${copy.recipes.noPackageDetails}`
    );
    await adoptCurrent(editor);
    expect((await read()).ingredientLines[2].package).toBeNull();

    // Explicitly redeclare and independently clear row.unit. No unit fallback or source-revision claim.
    await edit(editor);
    await options(editor);
    await editor.getByTestId('recipe-edit-package-enabled-2').check();
    await editor.getByTestId('recipe-edit-package-count-unit-2').fill('tins');
    await editor.getByTestId('recipe-edit-package-capacity-2').fill('400');
    await editor.getByTestId('recipe-edit-package-unit-2').fill('g');
    await editor.getByTestId('recipe-edit-package-basis-2').selectOption('net');
    await editor.getByTestId('recipe-edit-unit-2').fill('');
    await save(editor);
    const independent = await read();
    expect(independent.ingredientLines[2]).toMatchObject({
      id: packageId,
      unit: null,
      package: { countUnit: { text: 'tins', definitionId: null } },
    });
    await expect(editor.getByTestId('recipe-ingredient-projection')).toContainText(
      '4 tomatoes (400 g / tins; net)'
    );

    // All package fields survive a refresh. Cancel alone discards the unsaved declaration changes.
    await edit(editor);
    await options(editor);
    await editor.getByTestId('recipe-edit-package-capacity-2').fill('⅓–½');
    await editor.getByTestId('recipe-edit-package-unit-2').fill('kg');
    await editor.getByTestId('recipe-edit-package-basis-2').selectOption('drained');
    await editor.reload();
    await options(editor);
    await expect(editor.getByTestId('recipe-edit-package-capacity-2')).toHaveValue('⅓–½');
    await expect(editor.getByTestId('recipe-edit-package-count-unit-2')).toHaveValue('tins');
    await expect(editor.getByTestId('recipe-edit-package-unit-2')).toHaveValue('kg');
    await expect(editor.getByTestId('recipe-edit-package-basis-2')).toHaveValue('drained');
    await expect(editor.getByTestId('recipe-save-edits')).toBeDisabled();
    expect((await read()).contentRevision).toBe(independent.contentRevision);
    await editor.getByTestId('recipe-cancel-edits').click();
    expect((await read()).contentRevision).toBe(independent.contentRevision);

    // Real commit, lost successful transport reply, authoritative reread and explicit adoption; no blind PATCH replay.
    await edit(editor);
    await options(editor);
    await editor.getByTestId('recipe-edit-package-capacity-2').fill('⅓–½');
    await editor.getByTestId('recipe-edit-package-unit-2').fill('kg');
    await editor.getByTestId('recipe-edit-package-basis-2').selectOption('drained');
    let committed: any;
    await editor.route(
      `**${recipePath}`,
      async (route) => {
        if (route.request().method() !== 'PATCH') return route.fallback();
        const response = await route.fetch();
        expect(response.status()).toBe(200);
        committed = await response.json();
        await route.abort('connectionfailed');
      },
      { times: 1 }
    );
    const beforeLost = writes.length;
    await editor.getByTestId('recipe-save-edits').click();
    await expect(editor.getByText(copy.recipes.editFailed, { exact: true })).toBeVisible();
    expect(committed.recipe.ingredientLines[2].package.capacity.amount).toEqual({
      kind: 'range',
      min: { n: '1', d: '3' },
      max: { n: '1', d: '2' },
    });
    await expect(editor.getByTestId('recipe-edit-package-capacity-2')).toHaveValue('⅓–½');
    await expect(editor.getByTestId('recipe-save-edits')).toBeDisabled();
    await editor.reload();
    await options(editor);
    await expect(editor.getByTestId('recipe-edit-package-enabled-2')).toBeChecked();
    await expect(editor.getByTestId('recipe-edit-package-count-unit-2')).toHaveValue('tins');
    await expect(editor.getByTestId('recipe-edit-package-capacity-2')).toHaveValue('⅓–½');
    await expect(editor.getByTestId('recipe-edit-package-unit-2')).toHaveValue('kg');
    await expect(editor.getByTestId('recipe-edit-package-basis-2')).toHaveValue('drained');
    await editor.getByRole('button', { name: copy.recipes.checkSavedRecipe, exact: true }).click();
    await expect(
      editor.getByRole('button', { name: copy.recipes.reconcileDraft, exact: true })
    ).toBeVisible();
    await editor.getByTestId('recipe-cancel-edits').click();
    expect(writes).toHaveLength(beforeLost + 1);
    expect((await read()).contentRevision).toBe(committed.recipe.contentRevision);

    await edit(editor);
    await options(editor);
    await editor.getByTestId('recipe-edit-package-enabled-2').uncheck();
    await save(editor);
    await edit(editor);
    await editor.getByTestId('recipe-edit-amount-2').fill('3');
    await save(editor);
    const final = await read();
    assertOriginals(final);
    expect(final.ingredientLines[2]).toMatchObject({
      id: packageId,
      amount: scalar('3'),
      unit: null,
      package: null,
    });
    expect(final.ingredients[2]).toBe('3 tomatoes');
    await recompute();
    const finalDemand = await demand('6', '1', '');
    expect(finalDemand.row.unitText).toBeNull();
    expect(finalDemand.state.groceryState[pasta.rowId]).toBe(true);
    expect(finalDemand.state.groceryState[sauce.rowId]).toBe(true);
    const projectionRows = editor.getByTestId('recipe-ingredient-projection').getByRole('listitem');
    await expect(projectionRows).toHaveCount(final.ingredientLines.length);
    expect(final.ingredientLines.filter((row: any) => row.id === packageId)).toHaveLength(1);
    const packageIndex = final.ingredientLines.findIndex((row: any) => row.id === packageId);
    expect(packageIndex).toBeGreaterThanOrEqual(0);
    // The projection preserves canonical row order; select by its saved identity's position, never by matching display text.
    const packageRow = projectionRows.nth(packageIndex);
    await expect(packageRow).toHaveText('6 tomatoes');
    await expect(packageRow).not.toContainText('400 g');
    await expect(packageRow).not.toContainText('800 g');
    const pastaIndex = final.ingredientLines.findIndex(
      (row: any) => row.id === initial.ingredientLines[0].id
    );
    await expect(projectionRows.nth(pastaIndex)).toHaveText('400 g pasta');

    // Two saved lines share the legacy tomato member, but represent distinct purchases.
    // Clearing one package must preserve the other size's acknowledged demand.
    await edit(editor);
    await editor.getByTestId('recipe-edit-unit-2').fill('cans');
    await options(editor);
    await editor.getByTestId('recipe-edit-package-enabled-2').check();
    await editor.getByTestId('recipe-edit-package-count-unit-2').fill('cans');
    await editor.getByTestId('recipe-edit-package-capacity-2').fill('400');
    await editor.getByTestId('recipe-edit-package-unit-2').fill('g');
    await editor.getByTestId('recipe-edit-package-basis-2').selectOption('net');
    await editor.getByTestId('recipe-add-ingredient').click();
    await editor.getByTestId('recipe-edit-amount-3').fill('2');
    await editor.getByTestId('recipe-edit-unit-3').fill('cans');
    await editor.getByTestId('recipe-edit-ingredient-3').fill('tomatoes');
    const siblingOptions = editor.locator('details').filter({
      has: editor.getByTestId('recipe-edit-package-enabled-3'),
    });
    if (!(await siblingOptions.evaluate((node) => (node as HTMLDetailsElement).open)))
      await siblingOptions.locator('summary').click();
    await editor.getByTestId('recipe-edit-package-enabled-3').check();
    await editor.getByTestId('recipe-edit-package-count-unit-3').fill('cans');
    await editor.getByTestId('recipe-edit-package-capacity-3').fill('800');
    await editor.getByTestId('recipe-edit-package-unit-3').fill('g');
    await editor.getByTestId('recipe-edit-package-basis-3').selectOption('net');
    const siblingSaved = (await save(editor)).result.recipe;
    assertOriginals(siblingSaved);
    expect(siblingSaved.ingredientLines[2].id).toBe(packageId);
    const siblingId = siblingSaved.ingredientLines[3].id;
    expect(siblingId).not.toBe(packageId);
    await recompute();
    const packageRows = (state: any) =>
      state.groceryItems.filter(
        (row: any) => row.normalizedKey === 'tomato' && row.recipeIds.includes(id)
      );
    const twoSizes = packageRows(await schedule());
    expect(twoSizes).toHaveLength(2);
    const small = twoSizes.find((row: any) => row.displayName === 'tomato (400 g / cans; net)');
    const large = twoSizes.find((row: any) => row.displayName === 'tomato (800 g / cans; net)');
    expect(small).toBeDefined();
    expect(large).toBeDefined();
    expect(small.quantity).toEqual(scalar('6'));
    expect(large.quantity).toEqual(scalar('4'));
    expect(small.rowId).not.toBe(large.rowId);
    await openGroceries(shopper);
    await groceryCheck(shopper, small).click();
    await groceryCheck(shopper, large).click();
    await expect
      .poll(async () => {
        const state = await schedule();
        return [state.groceryState[small.rowId], state.groceryState[large.rowId]];
      })
      .toEqual([true, true]);
    const checkedLarge = packageRows(await schedule()).find(
      (row: any) => row.rowId === large.rowId
    );
    expect(checkedLarge).toBeDefined();

    await edit(editor);
    await options(editor);
    await editor.getByTestId('recipe-edit-package-enabled-2').uncheck();
    const clearedOne = (await save(editor)).result.recipe;
    expect(clearedOne.ingredientLines[3]).toEqual(siblingSaved.ingredientLines[3]);
    await recompute();
    const clearState = await schedule();
    const clearRows = packageRows(clearState);
    expect(clearRows).toHaveLength(2);
    const unqualified = clearRows.find((row: any) => row.displayName === 'tomato');
    expect(unqualified).toMatchObject({ quantity: scalar('6'), unitText: 'cans' });
    expect(unqualified.rowId).not.toBe(small.rowId);
    expect(clearState.groceryState[unqualified.rowId]).toBe(false);
    expect(clearRows.find((row: any) => row.displayName === checkedLarge.displayName)).toEqual(
      checkedLarge
    );
    expect(clearState.groceryState[checkedLarge.rowId]).toBe(true);

    await edit(editor);
    await editor.getByTestId('recipe-edit-amount-2').fill('4');
    const followingSave = (await save(editor)).result.recipe;
    assertOriginals(followingSave);
    expect(followingSave.ingredientLines[2]).toMatchObject({
      id: packageId,
      amount: scalar('4'),
      unit: { text: 'cans', definitionId: null },
      package: null,
    });
    expect(followingSave.ingredientLines[3]).toEqual(siblingSaved.ingredientLines[3]);
    expect(followingSave.ingredientLines[3].id).toBe(siblingId);
    await recompute();
    const followingState = await schedule();
    const followingRows = packageRows(followingState);
    expect(followingRows).toHaveLength(2);
    const followingUnqualified = followingRows.find((row: any) => row.displayName === 'tomato');
    expect(followingUnqualified).toMatchObject({ rowId: unqualified.rowId, quantity: scalar('8') });
    expect(followingRows.find((row: any) => row.displayName === checkedLarge.displayName)).toEqual(
      checkedLarge
    );
    expect(followingState.groceryState[checkedLarge.rowId]).toBe(true);
    expect(followingState.groceryState[unqualified.rowId]).toBe(false);
    expect(followingState.groceryState[pasta.rowId]).toBe(true);
    expect(followingState.groceryState[sauce.rowId]).toBe(true);
    await openGroceries(shopper);
    await expect(groceryCheck(shopper, checkedLarge)).toHaveAttribute('aria-checked', 'true');
    await expect(groceryCheck(shopper, followingUnqualified)).toHaveAttribute(
      'aria-checked',
      'false'
    );
    await editor.goto(`/recipes?open=${id}`);
    const finalProjection = editor
      .getByTestId('recipe-ingredient-projection')
      .getByRole('listitem');
    await expect(finalProjection).toHaveCount(4);
    await expect(finalProjection.nth(2)).toHaveText('8 cans tomatoes');
    await expect(finalProjection.nth(3)).toHaveText('4 cans tomatoes (800 g / cans; net)');
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});
