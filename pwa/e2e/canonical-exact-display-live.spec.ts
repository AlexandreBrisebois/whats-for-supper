import { test, expect, type Page } from '@playwright/test';
import { generateSecretToken } from './auth-utils';
import { pinCivilDate } from './date-only-clock';
import en from '../src/locales/en/common.json';
import fr from '../src/locales/fr/common.json';

const locale = process.env.CANONICAL_EXACT_DISPLAY_LOCALE === 'fr' ? 'fr' : 'en';
const copy = locale === 'fr' ? fr : en;
test.skip(
  !process.env.CANONICAL_EXACT_DISPLAY_LOCALE ||
    !process.env.CANONICAL_RECIPE_ID ||
    !process.env.CANONICAL_MEMBERS,
  'Requires the isolated exact-display API/PostgreSQL composition and production-built PWA.'
);

test(`exact display ${locale} preserves original fractions and coherent dated refresh`, async ({
  browser,
  request,
  baseURL,
}, info) => {
  test.setTimeout(210_000);
  const id = process.env.CANONICAL_RECIPE_ID!;
  const secret = process.env.HEARTH_SECRET!;
  const headers = { 'X-Hearth-Secret': secret };
  const recipePath = `/api/recipes/${id}`;
  const planner = '/planner?weekOffset=1&referenceWeekStartDate=2026-10-05';
  const scalar = (n: string, d = '1') => ({ kind: 'scalar', value: { n, d } });
  const read = async (path: string) => {
    const response = await request.get(`${baseURL}${path}`, { headers });
    expect(response.status()).toBe(200);
    return response.json();
  };
  const recipe = async () => (await read(recipePath)).recipe;
  const schedule = async () =>
    (await read('/api/schedule?weekOffset=1&referenceWeekStartDate=2026-10-05')).data;
  const recompute = async () => {
    expect((await request.post(`${baseURL}/_test/canonical/recompute`, { headers })).status()).toBe(
      200
    );
  };
  const initial = await recipe();
  expect(initial).toMatchObject({ servings: 4, ingredients: ['200 g pasta', '100 ml sauce'] });
  const family = (await read('/api/family')).data;
  const members = process.env.CANONICAL_MEMBERS!.split(',');
  expect(members).toHaveLength(2);
  const contexts = await Promise.all(
    members.map(() =>
      browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/Toronto' })
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
      await context.route('**/*', (route) => {
        const url = new URL(route.request().url());
        return ['127.0.0.1', 'localhost'].includes(url.hostname) ||
          ['data:', 'blob:'].includes(url.protocol)
          ? route.continue()
          : route.abort('blockedbyclient');
      });
    }
    const [editor, cook] = await Promise.all(contexts.map((context) => context.newPage()));
    for (const page of [editor, cook]) {
      page.setDefaultTimeout(15_000);
      await pinCivilDate(page, '2026-10-12T01:30:00Z');
    }
    const edit = async () => {
      await editor.goto(`/recipes?open=${id}`);
      await expect(editor.getByTestId('recipe-detail-name')).toHaveText(initial.name);
      await editor.getByTestId('action-gear-menu').click();
      await editor.getByTestId('action-edit-recipe').click();
      await expect(editor.getByTestId('recipe-edit-amount-0')).toHaveValue('200');
    };
    const save = async () => {
      const pending = editor.waitForResponse(
        (response) =>
          response.request().method() === 'PATCH' && new URL(response.url()).pathname === recipePath
      );
      await editor.getByTestId('recipe-save-edits').click();
      const response = await pending;
      expect(response.status(), await response.text()).toBe(200);
      const result = await response.json();
      await expect(editor.getByTestId('recipe-save-edits')).toHaveCount(0);
      return { result, input: response.request().postDataJSON() };
    };
    const projectionRows = (page: Page, preview = false) =>
      page
        .getByTestId(preview ? 'recipe-ingredient-preview' : 'recipe-ingredient-projection')
        .getByRole('listitem');
    const exactRows = async (page: Page, values: string[], preview = false) => {
      const rows = projectionRows(page, preview);
      await expect(rows).toHaveCount(5);
      for (const [index, text] of values.entries())
        await expect(rows.nth(index + 2)).toHaveText(text);
    };
    const openGroceries = async () => {
      await editor.goto(planner);
      await editor.getByTestId('grocery-tab').click();
      for (const header of await editor
        .locator('[data-testid^="aisle-header-"][aria-expanded="false"]')
        .all())
        await header.click();
    };
    const groceryRow = (row: any) =>
      editor.locator(`[data-testid="grocery-item-checkbox"][data-row-id="${row.rowId}"]`);
    const setUsual = async (count: number) => {
      await editor.goto('/profile/settings');
      await editor.getByTestId('usual-portions-automatic').uncheck();
      await editor.getByTestId('usual-portions-input').fill(String(count));
      const pending = editor.waitForResponse(
        (response) =>
          response.request().method() === 'PUT' &&
          new URL(response.url()).pathname === '/api/schedule/servings'
      );
      await editor.getByTestId('save-usual-portions').click();
      expect((await pending).status()).toBe(200);
      await expect(editor.getByTestId('save-usual-portions')).toBeDisabled();
    };
    const mutations: string[] = [];
    let observingReads = false;
    editor.on('request', (entry) => {
      if (
        observingReads &&
        !['GET', 'HEAD'].includes(entry.method()) &&
        new URL(entry.url()).pathname.startsWith('/api/')
      )
        mutations.push(`${entry.method()} ${new URL(entry.url()).pathname}`);
    });

    // The ordinary generated-client editor is the only producer of these exact facts.
    await edit();
    await editor.getByTestId('recipe-edit-servings-input').fill('3');
    for (const [offset, amount, unit, description] of [
      [0, '⅓', 'cup', 'flour'],
      [1, '2–3', 'g', 'lentils'],
      [2, '1–2', 'g', 'lentils'],
    ] as const) {
      const index = offset + 2;
      await editor.getByTestId('recipe-add-ingredient').click();
      await editor.getByTestId(`recipe-edit-amount-${index}`).fill(amount);
      await editor.getByTestId(`recipe-edit-unit-${index}`).fill(unit);
      await editor.getByTestId(`recipe-edit-ingredient-${index}`).fill(description);
    }
    for (const [number, text] of [
      [2, 'Cook for 20 min at 180 °C in a 20 cm pan.'],
      [3, 'Serve with the sauce at the table.'],
    ] as const) {
      await editor.getByRole('button', { name: copy.recipes.addStep, exact: true }).click();
      await editor
        .getByLabel(copy.recipes.stepInstructions.replace('{{number}}', String(number)), {
          exact: true,
        })
        .fill(text);
    }
    const created = await save();
    expect(created.input.expectedContentRevision).toBe(initial.contentRevision);
    expect(created.input).not.toHaveProperty('ingredients');
    const originals = created.result.recipe;
    expect(originals.servings).toBe(3);
    expect(originals.ingredientLines.slice(0, 2)).toEqual(initial.ingredientLines);
    expect(originals.ingredientLines[2]).toMatchObject({
      amount: scalar('1', '3'),
      amountText: '⅓',
      unit: { text: 'cup', definitionId: null },
      package: null,
    });
    const savedIds = originals.ingredientLines.map((row: any) => row.id);
    expect(new Set(savedIds).size).toBe(5);
    for (let index = 2; index < 5; index++) {
      expect(created.result.createdIds[created.input.ingredientLines[index].clientId]).toBe(
        savedIds[index]
      );
      expect(originals.ingredientLines[index].provenance).toMatchObject({
        origin: 'human',
        sourceRef: null,
      });
      expect(originals.ingredientLines[index].provenance.protectedFields).toContain('amount');
    }
    await recompute();
    const firstWeek = await schedule();
    const pasta = firstWeek.groceryItems.find((row: any) => row.normalizedKey === 'pasta');
    const sauce = firstWeek.groceryItems.find((row: any) => row.normalizedKey === 'sauce');
    expect(pasta?.rowId).toBeTruthy();
    expect(sauce?.rowId).toBeTruthy();
    await openGroceries();
    for (const row of [pasta, sauce]) {
      const acknowledged = editor.waitForResponse(
        (response) =>
          response.request().method() === 'PATCH' &&
          new URL(response.url()).pathname === '/api/schedule/1/grocery/item' &&
          response.request().postDataJSON()?.rowId === row.rowId
      );
      await groceryRow(row).click();
      await expect(groceryRow(row)).toHaveAttribute('aria-checked', 'true');
      const response = await acknowledged;
      expect(response.status(), await response.text()).toBe(200);
    }
    await expect
      .poll(async () => {
        const current = await schedule();
        return [current.groceryState[pasta.rowId], current.groceryState[sauce.rowId]];
      })
      .toEqual([true, true]);
    await info.attach('acknowledged-grocery-setup', {
      body: JSON.stringify(await schedule()),
      contentType: 'application/json',
    });

    for (const target of [5, 3]) {
      await setUsual(target);
      await recompute();
      const baselineRecipe = await recipe();
      const baselineWeek = await schedule();
      expect(baselineWeek.groceryState[pasta.rowId]).toBe(true);
      expect(baselineWeek.groceryState[sauce.rowId]).toBe(true);
      const lentils = baselineWeek.groceryItems.filter(
        (row: any) => row.normalizedKey === 'lentils' && row.recipeIds.includes(id)
      );
      expect(lentils).toHaveLength(1);
      expect(lentils[0].quantity).toEqual(
        target === 3
          ? { kind: 'range', min: { n: '3', d: '1' }, max: { n: '5', d: '1' } }
          : { kind: 'range', min: { n: '5', d: '1' }, max: { n: '25', d: '3' } }
      );
      expect(lentils[0].quantityComplete).toBe(true);
      const text =
        target === 5
          ? ['5/9 cup flour', '10/3–5 g lentils', '5/3–10/3 g lentils']
          : ['1/3 cup flour', '2–3 g lentils', '1–2 g lentils'];
      observingReads = true;
      await editor.goto(`/recipes?open=${id}`);
      await exactRows(editor, text);
      for (const preview of [2, 6]) {
        await editor
          .getByRole('button', {
            name: copy.recipes.previewCountName.replace('{{count}}', String(preview)),
            exact: true,
          })
          .click();
        await exactRows(
          editor,
          preview === 2
            ? ['2/9 cup flour', '4/3–2 g lentils', '2/3–4/3 g lentils']
            : ['2/3 cup flour', '4–6 g lentils', '2–4 g lentils'],
          true
        );
        await editor.getByTestId('action-gear-menu').click();
        await editor.getByTestId('action-reset-view').click();
        await exactRows(editor, text);
      }
      await editor.getByTestId('action-gear-menu').click();
      await editor.getByTestId('action-original-quantities').click();
      await expect(editor.getByText('⅓ cup flour', { exact: true })).toBeVisible();
      await editor.getByTestId('action-gear-menu').click();
      await editor.getByTestId('action-reset-view').click();
      await exactRows(editor, text);
      const homeRead = editor.waitForResponse((response) => {
        const url = new URL(response.url());
        return (
          url.pathname === `${recipePath}/ingredient-projection` &&
          url.searchParams.get('supperDate') === '2026-10-11' &&
          url.searchParams.get('context') === 'assigned'
        );
      });
      await editor.goto('/home');
      await editor.getByTestId('tonight-ingredients-toggle').click();
      const homeProjection = await (await homeRead).json();
      expect(homeProjection.targetServings).toBe(target);
      expect(homeProjection.contentRevision).toBe(baselineRecipe.contentRevision);
      expect(homeProjection.lines.slice(2).map((row: any) => row.displayText)).toEqual(text);
      await expect(editor.getByTestId('tonight-menu-card')).toContainText(text[0]);
      await editor.getByTestId('cook-mode-btn').click();
      for (const line of text)
        await expect(
          editor.getByTestId('ingredient-toggle').filter({ hasText: line })
        ).toBeVisible();
      await editor.getByTestId('close-cooks-mode').click();
      observingReads = false;
      expect(mutations).toEqual([]);
      expect(await recipe()).toEqual(baselineRecipe);
      expect(await schedule()).toEqual(baselineWeek);
    }

    // Mode changes deliberately persist member preferences outside the read-only epochs.
    await cook.goto('/home');
    await cook.getByTestId('cook-mode-btn').click();
    const mode = async (value: 'step-by-step' | 'all-steps') => {
      await cook.getByTestId(`cooking-view-${value}`).click();
      await expect(cook.getByTestId(`cooking-view-${value}`)).toHaveAttribute(
        'aria-pressed',
        'true'
      );
      await expect
        .poll(
          async () =>
            (await read('/api/family')).data.find((member: any) => member.id === members[1])
              ?.cookingViewMode
        )
        .toBe(value);
    };
    const readingCheckpoint = async (label: string) => {
      // Observe Reading's scroll-derived bookmark independently of Refresh.
      await cook.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
          )
      );
      const observed = await cook.evaluate(() => {
        const surface = document.querySelector<HTMLElement>(
          '[data-testid="cooks-mode-instructions"]'
        )!;
        const bounds = surface.getBoundingClientRect();
        return {
          indicator: document.querySelector('[data-testid="cooks-mode-step-indicator"]')
            ?.textContent,
          nextAction: document.querySelector('[data-testid="cooks-mode-step-next"]')?.textContent,
          scrollTop: surface.scrollTop,
          clientHeight: surface.clientHeight,
          scrollHeight: surface.scrollHeight,
          readingEdge: bounds.top + 32,
          atTrackedBottom:
            surface.scrollTop > 0 &&
            surface.scrollTop + surface.clientHeight >= surface.scrollHeight - 2,
          rows: Array.from(surface.querySelectorAll<HTMLElement>('[data-cooking-step]')).map(
            (row) => ({
              step: row.dataset.cookingStep,
              top: row.getBoundingClientRect().top,
              bottom: row.getBoundingClientRect().bottom,
            })
          ),
        };
      });
      await info.attach(`reading-checkpoint-${label}`, {
        body: JSON.stringify(observed),
        contentType: 'application/json',
      });
      return observed;
    };
    await mode('step-by-step');
    const sauceIngredient = cook
      .getByTestId('ingredient-toggle')
      .filter({ hasText: '100 ml sauce' });
    await sauceIngredient.click();
    await cook.getByTestId('cooks-mode-step-next').click();
    await expect(cook.getByTestId('cooks-mode-step-text')).toContainText('Mix pasta and sauce.');
    await cook.getByTestId('cooks-mode-step-next').click();
    await expect(cook.getByTestId('cooks-mode-step-text')).toHaveText(
      'Cook for 20 min at 180 °C in a 20 cm pan.'
    );
    const bookmark = await cook.getByTestId('cooks-mode-step-indicator').textContent();
    await edit();
    await editor.getByTestId('recipe-edit-amount-2').fill('2/3');
    await save();
    await cook.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(cook.getByTestId('cooking-quantities-available')).toBeVisible();
    await expect(cook.getByTestId('cooks-mode-step-indicator')).toHaveText(bookmark!);
    await expect(cook.getByTestId('cooks-mode-step-text')).toHaveText(
      'Cook for 20 min at 180 °C in a 20 cm pan.'
    );
    await cook.getByTestId('cooks-mode-step-prev').click();
    await cook.getByTestId('cooks-mode-step-prev').click();
    await expect(
      cook.getByTestId('ingredient-toggle').filter({ hasText: '1/3 cup flour' })
    ).toBeVisible();
    await cook.getByTestId('cooks-mode-step-next').click();
    await cook.getByTestId('cooks-mode-step-next').click();
    await expect(cook.getByTestId('cooks-mode-step-indicator')).toHaveText(bookmark!);
    await cook.getByRole('button', { name: copy.cook.refreshQuantities, exact: true }).click();
    await expect(cook.getByTestId('cooking-quantities-available')).toHaveCount(0);
    // Refresh itself must retain the nonzero bookmark before any later navigation.
    await expect(cook.getByTestId('cooks-mode-step-indicator')).toHaveText(bookmark!);
    await expect(cook.getByTestId('cooks-mode-step-text')).toHaveText(
      'Cook for 20 min at 180 °C in a 20 cm pan.'
    );
    await cook.getByTestId('cooks-mode-step-prev').click();
    await cook.getByTestId('cooks-mode-step-prev').click();
    await expect(
      cook.getByTestId('ingredient-toggle').filter({ hasText: '2/3 cup flour' })
    ).toBeVisible();
    await expect(sauceIngredient).toHaveAttribute('aria-checked', 'true');
    await cook.getByTestId('cooks-mode-step-next').click();
    await cook.getByTestId('cooks-mode-step-next').click();
    await expect(cook.getByTestId('cooks-mode-step-indicator')).toHaveText(bookmark!);
    await expect(cook.getByTestId('cooks-mode-step-text')).toHaveText(
      'Cook for 20 min at 180 °C in a 20 cm pan.'
    );
    await readingCheckpoint('before-all-steps');
    await mode('all-steps');
    const readingBaseline = await readingCheckpoint('all-steps-before-ingredients');
    expect(readingBaseline.rows).toHaveLength(3);
    expect(readingBaseline.indicator).toBeTruthy();
    await expect(cook.getByTestId('cooks-mode-overlay')).toContainText(
      'Cook for 20 min at 180 °C in a 20 cm pan.'
    );
    // In the all-steps presentation, the ordinary Ingredients control opens
    // ingredients while retaining the nonzero instruction position for Resume.
    await cook.getByTestId('cooks-mode-step-prev').click();
    await readingCheckpoint('ingredients');
    await expect(
      cook.getByTestId('ingredient-toggle').filter({ hasText: '2/3 cup flour' })
    ).toBeVisible();
    await expect(sauceIngredient).toHaveAttribute('aria-checked', 'true');
    await cook.getByTestId('cooks-mode-step-next').click();
    expect(await readingCheckpoint('resumed-all-steps')).toEqual(readingBaseline);
    await mode('step-by-step');
    await readingCheckpoint('returned-step-by-step');
    await expect(cook.getByTestId('cooks-mode-step-indicator')).toHaveText(
      readingBaseline.indicator!
    );
    await cook.getByTestId('close-cooks-mode').click();
    await recompute();
    const final = await recipe();
    const finalWeek = await schedule();
    expect(final.servings).toBe(3);
    expect(final.ingredientLines.slice(0, 2)).toEqual(initial.ingredientLines);
    expect(final.ingredientLines.map((row: any) => row.id)).toEqual(savedIds);
    expect(final.ingredientLines[2]).toMatchObject({
      amount: scalar('2', '3'),
      amountText: '2/3',
      package: null,
    });
    expect(final.instructionSections).toEqual(originals.instructionSections);
    expect(finalWeek.groceryState[pasta.rowId]).toBe(true);
    expect(finalWeek.groceryState[sauce.rowId]).toBe(true);
    await editor.setViewportSize({ width: 320, height: 844 });
    await editor.goto(`/recipes?open=${id}`);
    await exactRows(editor, ['2/3 cup flour', '2–3 g lentils', '1–2 g lentils']);
    for (const index of [2, 3, 4]) {
      await projectionRows(editor).nth(index).scrollIntoViewIfNeeded();
      await expect(projectionRows(editor).nth(index)).toBeInViewport();
    }
    expect(await editor.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    await editor.screenshot({
      path: info.outputPath(`exact-display-${locale}-320.png`),
      fullPage: true,
    });
    await info.attach('exact-display-ordinary-readback', {
      body: JSON.stringify({
        locale,
        initial,
        originals,
        final,
        finalWeek,
        readEpochMutations: mutations,
      }),
      contentType: 'application/json',
    });
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});
