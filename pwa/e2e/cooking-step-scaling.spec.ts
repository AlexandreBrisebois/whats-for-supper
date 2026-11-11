import { qualifyCookingFixed } from './cooking-fixed';
import { fixedCookingRecipe } from './cooking-step-fixture';
import { qualifyCookingPerItem } from './cooking-per-item';
import { perItemCookingRecipe } from './cooking-step-fixture';
import { qualifyCookingRemainder } from './cooking-remainder';
import { remainderCookingRecipe } from './cooking-step-fixture';
import { qualifyCookingFraction } from './cooking-fraction';
import { fractionCookingRecipe } from './cooking-step-fixture';
import { qualifyCookingReportRefresh } from './cooking-report-refresh';
import { test, expect } from './fixtures';
import { setupCommonRoutes, MOCK_IDS } from './mock-api';
import {
  cookingStepRecipe,
  cookingAllocationRecipe,
  exhaustiveCookingRecipe,
} from './cooking-step-fixture';

for (const uncertain of [false, true])
  test(`corrected whole use ${uncertain ? 'keeps stale wording usable' : 'scales once across detail Cook and groceries'}`, async ({
    page,
    baseURL,
  }, info) => {
    const recipe: any = cookingStepRecipe();
    if (uncertain)
      recipe.instructionSections[0].steps[0].bindings[0].validatedTextRevision = 'stale';
    await setupCommonRoutes(page, undefined, {
      canonicalEditor: recipe,
      supperServings: {
        knownRecipe: { id: recipe.id, basis: 4, quantity: 200, ingredient: 'pasta', unit: 'g' },
      },
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseURL! }]);
    await page.goto(`/recipes?open=${recipe.id}`);
    await expect(page.getByTestId('recipe-detail-name')).toHaveText('Bound pasta');
    const seeded = await page.evaluate(async (id) => {
      const assigned = await fetch('/api/schedule/assign?referenceWeekStartDate=2026-05-04', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekOffset: 0, dayIndex: 0, recipeId: id }),
      });
      const state = (await (await fetch('/api/schedule/servings?weekOffset=0')).json()).data;
      const saved = await fetch('/api/schedule/servings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekOffset: 0,
          referenceWeekStartDate: '2026-05-04',
          expectedVersion: state.version,
          defaultServings: 8,
          days: [],
        }),
      });
      return [assigned.status, saved.status];
    }, recipe.id);
    expect(seeded).toEqual([200, 200]);
    await page.getByTestId('action-gear-menu').click();
    await page.getByTestId('action-edit-recipe').click();
    await page.getByTestId('recipe-edit-amount-0').fill('250');
    const save = page.waitForResponse(
      (response) =>
        response.request().method() === 'PATCH' &&
        new URL(response.url()).pathname === `/api/recipes/${recipe.id}`
    );
    await page.getByTestId('recipe-save-edits').click();
    expect((await save).status()).toBe(200);
    await page.goto('/planner');
    await page.getByTestId('day-card-0').getByTestId('edit-recipe-button').click();
    await expect(page.getByTestId('recipe-ingredient-projection')).toContainText('500 g pasta');
    await page.getByTestId('action-cooks-mode').click();
    await expect(page.getByTestId('ingredient-toggle')).toContainText('500 g pasta');
    await page.getByTestId('cooking-view-step-by-step').click();
    await page.getByTestId('cooks-mode-step-next').click();
    await expect(page.getByTestId('cooks-mode-instructions')).toContainText(
      `Add ${uncertain ? 200 : 500} g pasta; cook 20 minutes at 180 °C.`
    );
    await expect(page.getByTestId('cooking-step-uncertainty')).toHaveCount(0);
    await expect(
      page.getByText(
        'Some step amounts remain as written. Review the step or consult the original recipe.',
        { exact: true }
      )
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'View adjusted ingredients', exact: true })
    ).toHaveCount(0);
    await expect(page.getByTestId('cooks-mode-step-next')).toBeEnabled();
    await expect(page.getByTestId('cooks-mode-overlay')).toHaveCSS('opacity', '1');
    await page
      .getByTestId('cooks-mode-instructions')
      .screenshot({ path: info.outputPath('bound-step.png'), animations: 'disabled' });
    await page.getByTestId('cooks-mode-edit-step').click();
    await expect(page.getByRole('textbox')).toHaveValue(
      'Add 200 g pasta; cook 20 minutes at 180 °C.'
    );
    const rows = await page.evaluate(
      async () => (await (await fetch('/api/schedule?weekOffset=0')).json()).data.groceryItems
    );
    const pasta = rows.filter((row: any) => row.normalizedKey === 'pasta');
    expect(pasta).toHaveLength(1);
    expect(pasta[0].quantity).toEqual({ kind: 'scalar', value: { n: '500', d: '1' } });
  });

for (const allocation of ['split', 'partial', 'exhaustive'])
  test(`absolute allocation ${allocation}`, async ({ page, baseURL }, info) => {
    const splitOil = allocation !== 'partial';
    const uncertain = allocation === 'exhaustive';
    const recipe: any = uncertain ? exhaustiveCookingRecipe() : cookingAllocationRecipe(splitOil);
    const ingredient = splitOil ? 'oil' : 'pasta';
    const scaled = uncertain ? '2 tbsp oil' : splitOil ? '4 tbsp oil' : '375 g pasta';
    await setupCommonRoutes(page, undefined, {
      canonicalEditor: recipe,
      supperServings: {
        knownRecipe: {
          id: recipe.id,
          basis: 4,
          quantity: splitOil ? 2 : 200,
          ingredient,
          unit: splitOil ? 'tbsp' : 'g',
        },
      },
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page
      .context()
      .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseURL! }]);
    await page.goto(`/recipes?open=${recipe.id}`);
    await expect(page.getByTestId('recipe-detail-name')).toHaveText(recipe.name);
    const seeded = await page.evaluate(
      async ({ id, target }) => {
        const assigned = await fetch('/api/schedule/assign?referenceWeekStartDate=2026-05-04', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ weekOffset: 0, dayIndex: 0, recipeId: id }),
        });
        const state = (await (await fetch('/api/schedule/servings?weekOffset=0')).json()).data;
        const saved = await fetch('/api/schedule/servings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            weekOffset: 0,
            referenceWeekStartDate: '2026-05-04',
            expectedVersion: state.version,
            defaultServings: target,
            days: [],
          }),
        });
        return [assigned.status, saved.status];
      },
      { id: recipe.id, target: splitOil ? 8 : 6 }
    );
    expect(seeded).toEqual([200, 200]);
    if (!splitOil || uncertain) {
      await page.getByTestId('action-gear-menu').click();
      await page.getByTestId('action-edit-recipe').click();
      await page.getByTestId('recipe-edit-amount-0').fill(uncertain ? '1' : '250');
      const save = page.waitForResponse(
        (response) =>
          response.request().method() === 'PATCH' &&
          new URL(response.url()).pathname === `/api/recipes/${recipe.id}`
      );
      await page.getByTestId('recipe-save-edits').click();
      expect((await save).status()).toBe(200);
    }
    await page.goto('/planner');
    await page.getByTestId('day-card-0').getByTestId('edit-recipe-button').click();
    await expect(page.getByTestId('recipe-ingredient-projection')).toContainText(scaled);
    await page.getByTestId('action-cooks-mode').click();
    await expect(page.getByTestId('ingredient-toggle')).toContainText(scaled);
    await page.getByTestId('cooking-view-step-by-step').click();
    await page.getByTestId('cooks-mode-step-next').click();
    await expect(page.getByTestId('cooks-mode-instructions')).toContainText(
      splitOil
        ? uncertain
          ? 'Heat 1 tbsp oil.'
          : 'Heat 2 tbsp oil.'
        : 'Add 75 g pasta from a 400 g package; cook 20 minutes at 180 °C.'
    );
    await expect(page.getByTestId('cooking-step-uncertainty')).toHaveCount(0);
    await expect(
      page.getByText(
        'Some step amounts remain as written. Review the step or consult the original recipe.',
        { exact: true }
      )
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'View adjusted ingredients', exact: true })
    ).toHaveCount(0);
    await expect(page.getByTestId('cooks-mode-step-next')).toBeEnabled();
    await expect(page.getByTestId('cooks-mode-overlay')).toHaveCSS('opacity', '1');
    await page
      .getByTestId('cooks-mode-instructions')
      .screenshot({ path: info.outputPath('allocation-first-step.png'), animations: 'disabled' });
    if (splitOil) {
      await page.getByTestId('cooks-mode-step-next').click();
      await expect(page.getByTestId('cooks-mode-instructions')).toContainText(
        uncertain ? 'Finish with 1 tbsp oil.' : 'Finish with 2 tbsp oil.'
      );
      await page.getByTestId('cooks-mode-instructions').screenshot({
        path: info.outputPath('allocation-second-step.png'),
        animations: 'disabled',
      });
    }
    await page.getByTestId('cooks-mode-edit-step').click();
    await expect(page.getByRole('textbox')).toHaveValue(
      splitOil
        ? 'Finish with 1 tbsp oil.'
        : 'Add 50 g pasta from a 400 g package; cook 20 minutes at 180 °C.'
    );
    const rows = await page.evaluate(
      async () => (await (await fetch('/api/schedule?weekOffset=0')).json()).data.groceryItems
    );
    const pasta = rows.filter((row: any) => row.normalizedKey === ingredient);
    expect(pasta).toHaveLength(1);
    expect(pasta[0].quantity).toEqual({
      kind: 'scalar',
      value: { n: uncertain ? '2' : splitOil ? '4' : '375', d: '1' },
    });
  });

test('dated report refresh preserves coherent content until accepted', async ({
  page,
  baseURL,
}, info) => {
  const recipe = cookingStepRecipe();
  await setupCommonRoutes(page, undefined, {
    canonicalEditor: recipe,
    supperServings: {
      knownRecipe: { id: recipe.id!, basis: 4, quantity: 200, ingredient: 'pasta', unit: 'g' },
    },
  });
  await page
    .context()
    .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseURL! }]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/recipes?open=${recipe.id}`);
  expect(
    await page.evaluate(async (id) => {
      const assigned = await fetch('/api/schedule/assign?referenceWeekStartDate=2026-05-04', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekOffset: 0, dayIndex: 0, recipeId: id }),
      });
      const state = (await (await fetch('/api/schedule/servings?weekOffset=0')).json()).data;
      const saved = await fetch('/api/schedule/servings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekOffset: 0,
          referenceWeekStartDate: '2026-05-04',
          expectedVersion: state.version,
          defaultServings: 8,
          days: [],
        }),
      });
      return [assigned.status, saved.status];
    }, recipe.id)
  ).toEqual([200, 200]);
  await qualifyCookingReportRefresh(page, recipe.id!, info);
});

test('relative fraction half retains wording with mixed invalid stale and ambiguous bindings', async ({
  page,
  baseURL,
}, info) => {
  const recipe = fractionCookingRecipe();
  await setupCommonRoutes(page, undefined, {
    canonicalEditor: recipe,
    supperServings: {
      knownRecipe: { id: recipe.id, basis: 4, quantity: 200, ingredient: 'pasta', unit: 'g' },
    },
  });
  await page
    .context()
    .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseURL! }]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/recipes?open=${recipe.id}`);
  expect(
    await page.evaluate(async (id) => {
      const assigned = await fetch('/api/schedule/assign?referenceWeekStartDate=2026-05-04', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekOffset: 0, dayIndex: 0, recipeId: id }),
      });
      const state = (await (await fetch('/api/schedule/servings?weekOffset=0')).json()).data;
      const saved = await fetch('/api/schedule/servings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekOffset: 0,
          referenceWeekStartDate: '2026-05-04',
          expectedVersion: state.version,
          defaultServings: 6,
          days: [],
        }),
      });
      return [assigned.status, saved.status];
    }, recipe.id)
  ).toEqual([200, 200]);
  await qualifyCookingFraction(page, recipe.id, info);
  const rows = await page.evaluate(
    async () => (await (await fetch('/api/schedule?weekOffset=0')).json()).data.groceryItems
  );
  const pasta = rows.filter((row: any) => row.normalizedKey === 'pasta');
  expect(pasta).toHaveLength(1);
  expect(pasta[0].quantity).toEqual({ kind: 'scalar', value: { n: '375', d: '1' } });
});

test('remaining follows corrected total and safely retains prose after reduction', async ({
  page,
  baseURL,
}, info) => {
  const recipe = remainderCookingRecipe();
  await setupCommonRoutes(page, undefined, {
    canonicalEditor: recipe,
    supperServings: {
      knownRecipe: { id: recipe.id, basis: 4, quantity: 2, ingredient: 'oil', unit: 'tbsp' },
    },
  });
  await page
    .context()
    .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseURL! }]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/recipes?open=${recipe.id}`);
  expect(
    await page.evaluate(async (id) => {
      const assigned = await fetch('/api/schedule/assign?referenceWeekStartDate=2026-05-04', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekOffset: 0, dayIndex: 0, recipeId: id }),
      });
      const state = (await (await fetch('/api/schedule/servings?weekOffset=0')).json()).data;
      const saved = await fetch('/api/schedule/servings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekOffset: 0,
          referenceWeekStartDate: '2026-05-04',
          expectedVersion: state.version,
          defaultServings: 8,
          days: [],
        }),
      });
      return [assigned.status, saved.status];
    }, recipe.id)
  ).toEqual([200, 200]);
  await qualifyCookingRemainder(page, recipe.id, info);
});

test('per-item dose stays fixed while count scales and stale proof retains prose', async ({
  page,
  baseURL,
}, info) => {
  const recipe = perItemCookingRecipe();
  await setupCommonRoutes(page, undefined, {
    canonicalEditor: recipe,
    supperServings: {
      knownRecipe: { id: recipe.id, basis: 4, quantity: 4, ingredient: 'pieces', unit: 'pieces' },
    },
  });
  await page
    .context()
    .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseURL! }]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/recipes?open=${recipe.id}`);
  expect(
    await page.evaluate(async (id) => {
      const assigned = await fetch('/api/schedule/assign?referenceWeekStartDate=2026-05-04', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekOffset: 0, dayIndex: 0, recipeId: id }),
      });
      const state = (await (await fetch('/api/schedule/servings?weekOffset=0')).json()).data;
      const saved = await fetch('/api/schedule/servings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekOffset: 0,
          referenceWeekStartDate: '2026-05-04',
          expectedVersion: state.version,
          defaultServings: 8,
          days: [],
        }),
      });
      return [assigned.status, saved.status];
    }, recipe.id)
  ).toEqual([200, 200]);
  await qualifyCookingPerItem(page, recipe.id, info);
});

test('standalone fixed use retains wording beside proportional use and guarded total edits', async ({
  page,
  baseURL,
}, info) => {
  const recipe = fixedCookingRecipe();
  await setupCommonRoutes(page, undefined, {
    canonicalEditor: recipe,
    supperServings: {
      knownRecipe: { id: recipe.id, basis: 4, quantity: 2, ingredient: 'oil', unit: 'tbsp' },
    },
  });
  await page
    .context()
    .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseURL! }]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/recipes?open=${recipe.id}`);
  expect(
    await page.evaluate(async (id) => {
      const assigned = await fetch('/api/schedule/assign?referenceWeekStartDate=2026-05-04', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekOffset: 0, dayIndex: 0, recipeId: id }),
      });
      const state = (await (await fetch('/api/schedule/servings?weekOffset=0')).json()).data;
      const saved = await fetch('/api/schedule/servings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekOffset: 0,
          referenceWeekStartDate: '2026-05-04',
          expectedVersion: state.version,
          defaultServings: 8,
          days: [],
        }),
      });
      return [assigned.status, saved.status];
    }, recipe.id)
  ).toEqual([200, 200]);
  await qualifyCookingFixed(page, recipe.id, info);
});

test('ordinary guarded Save discovers a final remainder and step editing replaces its proof', async ({
  page,
  baseURL,
}) => {
  const recipe: any = cookingAllocationRecipe(true);
  const originalSteps = ['Use 1 tbsp oil.', 'Finally, use all the remaining oil.'];
  for (const [index, step] of recipe.instructionSections[0].steps.entries()) {
    step.text = originalSteps[index];
    step.bindings = [];
  }
  recipe.recipeInstructions[0].itemListElement = originalSteps.map((text) => ({ text }));
  await setupCommonRoutes(page, undefined, {
    canonicalEditor: recipe,
    supperServings: {
      knownRecipe: { id: recipe.id, basis: 4, quantity: 2, ingredient: 'oil', unit: 'tbsp' },
    },
  });
  await page
    .context()
    .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseURL! }]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/recipes?open=${recipe.id}`);
  expect(
    await page.evaluate(async (id) => {
      const assigned = await fetch('/api/schedule/assign?referenceWeekStartDate=2026-05-04', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekOffset: 0, dayIndex: 0, recipeId: id }),
      });
      const state = (await (await fetch('/api/schedule/servings?weekOffset=0')).json()).data;
      const portions = await fetch('/api/schedule/servings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekOffset: 0,
          referenceWeekStartDate: '2026-05-04',
          expectedVersion: state.version,
          defaultServings: 8,
          days: [],
        }),
      });
      return [assigned.status, portions.status];
    }, recipe.id)
  ).toEqual([200, 200]);
  await page.getByTestId('action-gear-menu').click();
  await page.getByTestId('action-edit-recipe').click();
  await page.getByTestId('recipe-edit-amount-0').fill('3');
  const saving = page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' &&
      new URL(response.url()).pathname === `/api/recipes/${recipe.id}`
  );
  await page.getByTestId('recipe-save-edits').click();
  const reply = await saving;
  expect(reply.status()).toBe(200);
  const saved = (await reply.json()).recipe;
  expect(saved.instructionSections[0].steps.map((step: any) => step.text)).toEqual(originalSteps);
  expect(saved.instructionSections[0].steps.map((step: any) => step.bindings[0].role)).toEqual([
    'absolute',
    'remainder',
  ]);
  await page.goto('/planner');
  await page.getByTestId('day-card-0').getByTestId('edit-recipe-button').click();
  await page.getByTestId('action-cooks-mode').click();
  const oil = page.getByTestId('ingredient-toggle').filter({ hasText: '6 tbsp oil' });
  await oil.click();
  await page.getByTestId('cooking-view-step-by-step').click();
  await page.getByTestId('cooks-mode-step-next').click();
  await expect(page.getByTestId('cooks-mode-instructions')).toContainText('Use 2 tbsp oil.');
  await page.getByTestId('cooks-mode-step-next').click();
  await expect(page.getByTestId('cooks-mode-instructions')).toContainText(
    'Finally, use all the remaining (4 tbsp) oil.'
  );
  await page.getByTestId('cooks-mode-edit-step').click();
  await expect(page.getByRole('textbox')).toHaveValue(originalSteps[1]);
  await page.getByRole('textbox').fill('Finally, add all the remaining oil.');
  let stepEditPatchCount = 0;
  page.on('request', (request) => {
    if (
      request.method() === 'PATCH' &&
      new URL(request.url()).pathname === `/api/recipes/${recipe.id}`
    )
      stepEditPatchCount++;
  });
  const editing = page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' &&
      new URL(response.url()).pathname === `/api/recipes/${recipe.id}`
  );
  await page.getByTestId('cooks-mode-save-edit').click();
  const editedReply = await editing;
  expect(editedReply.status()).toBe(200);
  const edited = (await editedReply.json()).recipe;
  expect(edited.instructionSections[0].steps[1].bindings[0].id).not.toBe(
    saved.instructionSections[0].steps[1].bindings[0].id
  );
  const instructionError = page.getByTestId('cooks-mode-instructions').getByRole('alert');
  await expect(instructionError).toContainText("Couldn't save this step.");
  await expect(page.getByRole('textbox')).toHaveValue('Finally, add all the remaining oil.');
  await expect(page.getByTestId('cooking-quantities-available')).toBeVisible();
  expect(stepEditPatchCount).toBe(1);
  const recoveryDetail = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname === `/api/recipes/${recipe.id}`
  );
  const recoveryProjection = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname === `/api/recipes/${recipe.id}/ingredient-projection`
  );
  await instructionError.getByRole('button', { name: 'Try again' }).click();
  const recoveredDetail = await recoveryDetail;
  const recoveredProjection = await recoveryProjection;
  expect(recoveredDetail.status()).toBe(200);
  expect(recoveredProjection.status()).toBe(200);
  expect((await recoveredDetail.json()).recipe.contentRevision).toBe(edited.contentRevision);
  expect((await recoveredProjection.json()).contentRevision).toBe(edited.contentRevision);
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await expect(page.getByText('Step saved', { exact: true })).toHaveAttribute(
    'aria-live',
    'polite'
  );
  await expect(instructionError).toHaveCount(0);
  await expect(page.getByTestId('cooking-quantities-available')).toHaveCount(0);
  expect(stepEditPatchCount).toBe(1);
  await expect(page.getByTestId('cooks-mode-instructions')).toContainText(
    'Finally, add all the remaining (4 tbsp) oil.'
  );
  await expect(page.getByTestId('cooking-step-uncertainty')).toHaveCount(0);
  await page.getByTestId('cooks-mode-step-prev').click();
  await page.getByTestId('cooks-mode-step-prev').click();
  await expect(oil).toHaveAttribute('aria-checked', 'true');
  const groceries = await page.evaluate(
    async () => (await (await fetch('/api/schedule?weekOffset=0')).json()).data.groceryItems
  );
  const demand = groceries.filter((row: any) => row.normalizedKey === 'oil');
  expect(demand).toHaveLength(1);
  expect(demand[0].quantity).toEqual({ kind: 'scalar', value: { n: '6', d: '1' } });
  expect(stepEditPatchCount).toBe(1);
});

test('ordinary guarded Save discovers a standalone fixed use without additional grocery demand', async ({
  page,
  baseURL,
}) => {
  const recipe: any = cookingAllocationRecipe(true);
  const source = 'For any number of portions, use exactly 1 tbsp oil.';
  recipe.instructionSections[0].steps = [
    { ...recipe.instructionSections[0].steps[0], text: source, bindings: [] },
  ];
  recipe.recipeInstructions[0].itemListElement = [{ text: source }];
  await setupCommonRoutes(page, undefined, {
    canonicalEditor: recipe,
    supperServings: {
      knownRecipe: { id: recipe.id, basis: 4, quantity: 2, ingredient: 'oil', unit: 'tbsp' },
    },
  });
  await page
    .context()
    .addCookies([{ name: 'x-family-member-id', value: MOCK_IDS.MEMBER_ALEX, url: baseURL! }]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/recipes?open=${recipe.id}`);
  expect(
    await page.evaluate(async (id) => {
      const assigned = await fetch('/api/schedule/assign?referenceWeekStartDate=2026-05-04', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekOffset: 0, dayIndex: 0, recipeId: id }),
      });
      const state = (await (await fetch('/api/schedule/servings?weekOffset=0')).json()).data;
      const portions = await fetch('/api/schedule/servings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekOffset: 0,
          referenceWeekStartDate: '2026-05-04',
          expectedVersion: state.version,
          defaultServings: 8,
          days: [],
        }),
      });
      return [assigned.status, portions.status];
    }, recipe.id)
  ).toEqual([200, 200]);
  await page.getByTestId('action-gear-menu').click();
  await page.getByTestId('action-edit-recipe').click();
  await page.getByTestId('recipe-edit-amount-0').fill('3');
  const saving = page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' &&
      new URL(response.url()).pathname === `/api/recipes/${recipe.id}`
  );
  await page.getByTestId('recipe-save-edits').click();
  const reply = await saving;
  expect(reply.status()).toBe(200);
  const saved = (await reply.json()).recipe;
  expect(saved.instructionSections[0].steps[0].text).toBe(source);
  expect(saved.instructionSections[0].steps[0].bindings).toHaveLength(1);
  expect(saved.instructionSections[0].steps[0].bindings[0]).toMatchObject({
    role: 'fixed',
    validatedContentRevision: saved.contentRevision,
  });
  await page.goto('/planner');
  await page.getByTestId('day-card-0').getByTestId('edit-recipe-button').click();
  await page.getByTestId('action-cooks-mode').click();
  await expect(page.getByTestId('ingredient-toggle')).toContainText('6 tbsp oil');
  await page.getByTestId('ingredient-toggle').click();
  await page.getByTestId('cooking-view-step-by-step').click();
  await page.getByTestId('cooks-mode-step-next').click();
  await expect(page.getByTestId('cooks-mode-instructions')).toContainText(source);
  await expect(page.getByTestId('cooking-step-uncertainty')).toHaveCount(0);
  await page.getByTestId('cooks-mode-edit-step').click();
  await expect(page.getByRole('textbox')).toHaveValue(source);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByTestId('cooks-mode-step-prev').click();
  await expect(page.getByTestId('ingredient-toggle')).toHaveAttribute('aria-checked', 'true');
  const rows = await page.evaluate(
    async () => (await (await fetch('/api/schedule?weekOffset=0')).json()).data.groceryItems
  );
  const oil = rows.filter((row: any) => row.normalizedKey === 'oil');
  expect(oil).toHaveLength(1);
  expect(oil[0].quantity).toEqual({ kind: 'scalar', value: { n: '6', d: '1' } });
});
