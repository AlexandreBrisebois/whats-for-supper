import { expect, it } from 'vitest';
import { applyCanonicalEditorPatch } from '../../e2e/canonical-editor';
import { cookingStepRecipe } from '../../e2e/cooking-step-fixture';

it('carries a proven whole use through a guarded original-total correction and rejects a stale step edit', () => {
  const original: any = cookingStepRecipe();
  const row = original.ingredientLines[0];
  const result = applyCanonicalEditorPatch(original, {
    expectedContentRevision: original.contentRevision,
    ingredientLines: [
      {
        ...row,
        unit: { definitionId: null, text: 'g' },
        shopping: { mappingRevision: null, foodId: null, name: 'pasta' },
        amount: { kind: 'scalar', value: { n: '250', d: '1' } },
        amountText: '250',
      },
    ],
  });
  expect(result.status).toBe(200);
  const step = result.body.recipe.instructionSections[0].steps[0];
  expect(step.text).toBe(original.instructionSections[0].steps[0].text);
  expect(step.bindings).toHaveLength(1);
  expect(step.bindings[0].validatedContentRevision).toBe(result.body.recipe.contentRevision);
  const stale = applyCanonicalEditorPatch(result.body.recipe, {
    expectedContentRevision: original.contentRevision,
    instructionSections: [
      {
        id: original.instructionSections[0].id,
        name: null,
        steps: [{ id: step.id, text: 'Stale edit' }],
      },
    ],
  });
  expect(stale.status).toBe(409);
  expect(step.text).toContain('200 g');
});

it('changes the legacy coherent projection key when the original serving basis changes', async () => {
  const { mockSupperServings, builders, MOCK_IDS } = await import('../../e2e/mock-api');
  const { vi } = await import('vitest');
  const handlers = new Map<string, (route: any) => Promise<unknown>>();
  const page: any = {
    route: async (pattern: string, handler: any) => handlers.set(pattern, handler),
    evaluate: vi.fn().mockResolvedValue(undefined),
  };
  const id = MOCK_IDS.RECIPE_LASAGNA;
  const current: any = builders.recipe({ id, servings: 4, ingredients: ['200 g pasta'] });
  const control = await mockSupperServings(page, () => builders.scheduleDays(), {
    readFamilyCount: () => 8,
    readRecipe: () => current,
    knownRecipe: { id, basis: 4, quantity: 200, ingredient: 'pasta', unit: 'g' },
  });
  const read = async () => {
    const fulfill = vi.fn();
    await control.ingredientProjection({
      request: () => ({
        method: () => 'GET',
        url: () =>
          `http://localhost/api/recipes/${id}/ingredient-projection?context=proposed&supperDate=2026-05-04`,
      }),
      fulfill,
    } as any);
    return fulfill.mock.calls[0][0].json;
  };
  const before = await read();
  current.servings = 3;
  await control.recipeChanged(id, { servings: 3 });
  const after = await read();
  expect(after.baseServings).toBe(3);
  expect(after.contextKey).not.toBe(before.contextKey);
  expect(after.lines[0].quantity).not.toBe(before.lines[0].quantity);
});

it.each([true, false])(
  'keeps absolute allocations separate from ingredient totals (split oil: %s)',
  async (splitOil) => {
    const { cookingAllocationRecipe } = await import('../../e2e/cooking-step-fixture');
    const { cookingProjection, canonicalIngredientLines } =
      await import('../../e2e/cooking-step-projection');
    const original = cookingAllocationRecipe(splitOil);
    const result = splitOil
      ? { status: 200, body: { recipe: original } }
      : applyCanonicalEditorPatch(original, {
          expectedContentRevision: original.contentRevision,
          ingredientLines: [
            {
              ...original.ingredientLines[0],
              amount: { kind: 'scalar', value: { n: '250', d: '1' } },
              amountText: '250',
            },
          ],
        });
    expect(result.status).toBe(200);
    const saved = result.body.recipe;
    const projection = cookingProjection(saved, splitOil ? 8 : 6)!;
    expect(projection.uncertainUses).toBe(0);
    expect(projection.validatedUses).toBe(splitOil ? 2 : 1);
    expect(projection.sections[0].steps.map((step: any) => step.text)).toEqual(
      splitOil
        ? ['Heat 2 tbsp oil.', 'Finish with 2 tbsp oil.']
        : ['Add 75 g pasta from a 400 g package; cook 20 minutes at 180 °C.']
    );
    expect(canonicalIngredientLines(saved, splitOil ? 8 : 6)[0].quantity).toBe(splitOil ? 4 : 375);
    expect(saved.instructionSections[0].steps.map((step: any) => step.text)).toEqual(
      original.instructionSections[0].steps.map((step: any) => step.text)
    );
    expect(saved.instructionSections[0].steps[0].bindings[0].payload.amount.value.n).toBe(
      splitOil ? '1' : '50'
    );
  }
);

it('invalidates the entire explicit exhaustive group after a guarded total reduction', async () => {
  const { exhaustiveCookingRecipe } = await import('../../e2e/cooking-step-fixture');
  const { cookingProjection } = await import('../../e2e/cooking-step-projection');
  const before = exhaustiveCookingRecipe();
  expect(cookingProjection(before, 8)!.validatedUses).toBe(2);
  const reply = applyCanonicalEditorPatch(before, {
    expectedContentRevision: before.contentRevision,
    ingredientLines: [
      {
        ...before.ingredientLines[0],
        amount: { kind: 'scalar', value: { n: '1', d: '1' } },
        amountText: '1',
      },
    ],
  });
  expect(reply.status).toBe(200);
  const projection = cookingProjection(reply.body.recipe, 8)!;
  expect(projection.validatedUses).toBe(0);
  expect(projection.uncertainUses).toBe(2);
  expect(projection.sections[0].steps.map((step: any) => step.text)).toEqual([
    'Heat 1 tbsp oil.',
    'Finish with 1 tbsp oil.',
  ]);
});

it('preserves relative half and binding identity through corrected totals with mixed uncertainty', async () => {
  const { fractionCookingRecipe } = await import('../../e2e/cooking-step-fixture');
  const { cookingProjection, canonicalIngredientLines } =
    await import('../../e2e/cooking-step-projection');
  const before = fractionCookingRecipe();
  const reply = applyCanonicalEditorPatch(before, {
    expectedContentRevision: before.contentRevision,
    ingredientLines: [
      {
        ...before.ingredientLines[0],
        amount: { kind: 'scalar', value: { n: '250', d: '1' } },
        amountText: '250',
      },
    ],
  });
  expect(reply.status).toBe(200);
  const after = reply.body.recipe;
  for (const target of [null, 4, 6, 8]) {
    const result = cookingProjection(after, target)!;
    expect(result.validatedUses).toBe(2);
    expect(result.uncertainUses).toBe(3);
    expect(result.sections[0].steps[1].text).toBe(before.instructionSections[0].steps[1].text);
    expect(result.sections[0].steps.slice(2).map((x: any) => x.text)).toEqual(
      before.instructionSections[0].steps.slice(2).map((x: any) => x.text)
    );
    expect(canonicalIngredientLines(after, target)[0].quantity).toBe(
      target == null ? 250 : (250 * target) / 4
    );
  }
  const use = after.instructionSections[0].steps[1].bindings[0];
  expect(use.id).toBe(before.instructionSections[0].steps[1].bindings[0].id);
  expect(use.payload).toEqual({ fraction: { n: '1', d: '2' } });
  expect(use.validatedContentRevision).toBe(after.contentRevision);
});

it.each([
  ['zero', '0', '1', 1],
  ['one', '1', '1', 1],
  ['half', '1', '2', 1],
  ['large', '1', '99999999999999999999999999999999999999', 1],
  ['denominatorZero', '1', '0', 0],
  ['negative', '-1', '2', 0],
  ['aboveOne', '3', '2', 0],
  ['notNormalized', '2', '4', 0],
  ['numberToken', 1, 2, 0],
])('checks exact relative fraction evidence: %s', async (_fault, n, d, count) => {
  const { fractionCookingRecipe } = await import('../../e2e/cooking-step-fixture');
  const { cookingProjection } = await import('../../e2e/cooking-step-projection');
  const recipe = fractionCookingRecipe();
  const step = recipe.instructionSections[0].steps[1];
  recipe.instructionSections[0].steps = [step];
  step.bindings[0].payload.fraction = { n, d };
  const projected = cookingProjection(recipe, 6)!;
  expect(projected.validatedUses).toBe(count);
  expect(projected.uncertainUses).toBe(1 - Number(count));
  expect(projected.sections[0].steps[0].text).toBe(step.text);
});

it('revalidates two exhaustive relative halves against a corrected total', async () => {
  const { fractionCookingRecipe } = await import('../../e2e/cooking-step-fixture');
  const { cookingProjection } = await import('../../e2e/cooking-step-projection');
  const recipe = fractionCookingRecipe();
  const steps = recipe.instructionSections[0].steps.slice(1, 3);
  const ids = steps.map((x: any) => x.bindings[0].id);
  for (const step of steps) {
    const use = step.bindings[0];
    use.validatedTextRevision = step.textRevision;
    use.payload = {
      fraction: { n: '1', d: '2' },
      allocationGroup: { id: recipe.id, exhaustive: true, bindingIds: ids },
    };
  }
  recipe.instructionSections[0].steps = steps;
  expect(cookingProjection(recipe, 6)!.validatedUses).toBe(2);
  const reply = applyCanonicalEditorPatch(recipe, {
    expectedContentRevision: recipe.contentRevision,
    ingredientLines: [
      {
        ...recipe.ingredientLines[0],
        amount: { kind: 'scalar', value: { n: '250', d: '1' } },
        amountText: '250',
      },
    ],
  });
  expect(reply.status).toBe(200);
  const projected = cookingProjection(reply.body.recipe, 6)!;
  expect(projected.validatedUses).toBe(2);
  expect(projected.uncertainUses).toBe(0);
  expect(projected.sections[0].steps.map((x: any) => x.text)).toEqual(
    steps.map((x: any) => x.text)
  );
});

it.each([
  'valid',
  'corrected',
  'reduced',
  'stale',
  'cycle',
  'missing',
  'alternative',
  'unit',
  'range',
])('proves remainder from a closed current allocation: %s', async (fault) => {
  const { remainderCookingRecipe } = await import('../../e2e/cooking-step-fixture');
  const { cookingProjection } = await import('../../e2e/cooking-step-projection');
  const before = remainderCookingRecipe();
  const steps = before.instructionSections[0].steps;
  if (fault === 'stale') steps[0].bindings[0].validatedTextRevision = 'old';
  if (fault === 'cycle') steps[1].bindings[0].payload.predecessors = [steps[1].bindings[0].id];
  if (fault === 'missing') steps[1].bindings[0].payload.predecessors = [];
  if (fault === 'alternative')
    for (const step of steps) step.bindings[0].payload.allocationGroup.exhaustive = false;
  if (fault === 'unit') steps[0].bindings[0].payload.unit.text = 'tsp';
  if (fault === 'range')
    steps[0].bindings[0].payload.amount = {
      kind: 'range',
      min: { n: '1', d: '1' },
      max: { n: '2', d: '1' },
    };
  let current = before;
  if (['corrected', 'reduced'].includes(fault)) {
    const result = applyCanonicalEditorPatch(before, {
      expectedContentRevision: before.contentRevision,
      ingredientLines: [
        {
          ...before.ingredientLines[0],
          amount: {
            kind: 'scalar',
            value: { n: fault === 'corrected' ? '3' : '1', d: fault === 'corrected' ? '1' : '2' },
          },
          amountText: fault === 'corrected' ? '3' : '1/2',
        },
      ],
    });
    expect(result.status).toBe(200);
    current = result.body.recipe;
  }
  const projection = cookingProjection(current, 8)!;
  const proven = ['valid', 'corrected'].includes(fault);
  expect(projection.validatedUses).toBe(proven ? 2 : 0);
  expect(projection.uncertainUses).toBe(proven ? 0 : 2);
  expect(projection.sections[0].steps[1].text).toBe(
    proven
      ? `Use the remaining (${fault === 'corrected' ? '4' : '2'} tbsp) oil; cook 20 minutes at 180 °C.`
      : steps[1].text
  );
  expect(current.instructionSections[0].steps.map((s: any) => s.text)).toEqual(
    steps.map((s: any) => s.text)
  );
});

it.each([
  'valid',
  'correctedCount',
  'duplicateDoseAcrossSteps',
  'correctedDoseTotal',
  'missing',
  'cycle',
  'stale',
  'duplicate',
  'overlap',
  'range',
  'fixedCount',
  'badDose',
  'unit',
  'countUnitChanged',
  'countTextChanged',
  'sourceChanged',
  'unknownBasis',
  'overflow',
])('scales only the separately proven per-item count: %s', async (fault) => {
  const { perItemCookingRecipe } = await import('../../e2e/cooking-step-fixture');
  const { cookingProjection } = await import('../../e2e/cooking-step-projection');
  const before = perItemCookingRecipe();
  const step = before.instructionSections[0].steps[0];
  const [count, dose] = step.bindings;
  if (fault === 'duplicateDoseAcrossSteps') {
    const extra = structuredClone(step);
    extra.id = before.id;
    const duplicated = structuredClone(dose);
    duplicated.stepId = extra.id;
    extra.bindings = [duplicated];
    before.instructionSections[0].steps.push(extra);
  }
  if (fault === 'missing') dose.payload.countBindingId = before.id;
  if (fault === 'cycle') dose.payload.countBindingId = dose.id;
  if (fault === 'stale') count.validatedTextRevision = 'old';
  if (fault === 'duplicate') step.bindings.push(structuredClone(count));
  if (fault === 'overlap') step.bindings.push({ id: before.id, span: count.span });
  if (fault === 'range')
    before.ingredientLines[0].amount = {
      kind: 'range',
      min: { n: '4', d: '1' },
      max: { n: '6', d: '1' },
    };
  if (fault === 'fixedCount') before.ingredientLines[0].scaling = 'fixed';
  if (fault === 'badDose') dose.payload.dose.amount.value.d = '0';
  if (fault === 'unit') dose.payload.dose.unit.text = 'tbsp';
  if (fault === 'unknownBasis') before.servings = null;
  if (fault === 'overflow')
    before.ingredientLines[0].amount.value.n = '99999999999999999999999999999999999999';
  let after = before;
  if (['correctedCount', 'correctedDoseTotal', 'countUnitChanged'].includes(fault)) {
    const rows = structuredClone(before.ingredientLines);
    if (fault === 'correctedCount') {
      rows[0].amount.value.n = '6';
      rows[0].amountText = '6';
    }
    if (fault === 'correctedDoseTotal') {
      rows[1].amount.value.n = '3';
      rows[1].amountText = '3';
    }
    if (fault === 'countUnitChanged') rows[0].unit.text = 'g';
    const reply = applyCanonicalEditorPatch(before, {
      expectedContentRevision: before.contentRevision,
      ingredientLines: rows,
    });
    expect(reply.status).toBe(200);
    after = reply.body.recipe;
  }
  if (fault === 'countTextChanged') {
    const reply = applyCanonicalEditorPatch(before, {
      expectedContentRevision: before.contentRevision,
      instructionSections: [
        {
          id: before.instructionSections[0].id,
          name: null,
          steps: [{ id: step.id, text: step.text + ' Changed.' }],
        },
      ],
    });
    expect(reply.status).toBe(200);
    after = reply.body.recipe;
  }
  // Mock source revision does not currently participate in canonical editor patches.
  if (fault === 'sourceChanged') {
    after = structuredClone(before);
    after.contentRevision = 'new';
  }
  for (const target of [null, 4, 8, 6, 4]) {
    const projection = cookingProjection(after, target)!;
    const proven = ['valid', 'correctedCount', 'correctedDoseTotal'].includes(fault);
    const validCount =
      ![
        'stale',
        'duplicate',
        'overlap',
        'countTextChanged',
        'countUnitChanged',
        'sourceChanged',
      ].includes(fault) &&
      !(
        (target != null && fault === 'unknownBasis') ||
        (target != null && target > 4 && fault === 'overflow')
      );
    const doseValid =
      proven ||
      (target == null && fault === 'unknownBasis') ||
      ((target == null || target === 4) && fault === 'overflow');
    expect(projection.validatedUses).toBe(Number(validCount) + Number(doseValid));
    const projected = projection.sections[0].steps[0];
    expect(projected.text).toContain('1/2 tsp on each of');
    expect(projected.text).toContain('400 g package; cook 20 minutes at 180 °C in a 20 cm pan.');
    expect(projected.originalText).toBe(after.instructionSections[0].steps[0].text);
    if (proven)
      expect(projected.text).toContain(
        `${(fault === 'correctedCount' ? 6 : 4) * (target == null ? 1 : target / 4)} pieces`
      );
  }
  if (['valid', 'correctedCount', 'correctedDoseTotal'].includes(fault)) {
    const saved = after.instructionSections[0].steps[0].bindings[1];
    expect(saved.id).toBe(dose.id);
    expect(saved.payload).toEqual(dose.payload);
    expect(saved.validatedContentRevision).toBe(after.contentRevision);
  }
});

it.each([
  'valid',
  'corrected',
  'fixedRow',
  'unknownBasis',
  'stale',
  'contentStale',
  'span',
  'unit',
  'amount',
  'missingAmount',
  'missingUnit',
  'id',
  'duplicateAcrossSteps',
  'overlap',
  'rowUnitChanged',
  'grouped',
  'remainderGroup',
])('preserves standalone fixed evidence and independent uses: %s', async (fault) => {
  const { fixedCookingRecipe } = await import('../../e2e/cooking-step-fixture');
  const { cookingProjection } = await import('../../e2e/cooking-step-projection');
  const before = fixedCookingRecipe();
  const steps = before.instructionSections[0].steps;
  const binding = steps[0].bindings[0];
  if (fault === 'fixedRow') before.ingredientLines[0].scaling = 'fixed';
  if (fault === 'unknownBasis') before.servings = null;
  if (fault === 'stale') binding.validatedTextRevision = 'old';
  if (fault === 'contentStale') binding.validatedContentRevision = 'old';
  if (fault === 'span') binding.span.end = 999;
  if (fault === 'unit') binding.payload.unit.text = 'tsp';
  if (fault === 'amount') binding.payload.amount.value.d = '0';
  if (fault === 'missingAmount') delete binding.payload.amount;
  if (fault === 'missingUnit') delete binding.payload.unit;
  if (fault === 'id') binding.id = '00000000-0000-0000-0000-000000000000';
  if (fault === 'duplicateAcrossSteps') {
    steps[1].text = steps[0].text;
    steps[1].bindings = [{ ...structuredClone(binding), stepId: steps[1].id }];
  }
  if (fault === 'overlap') steps[0].bindings.push({ ...structuredClone(binding), id: before.id });
  if (['grouped', 'remainderGroup'].includes(fault)) {
    const group = {
      id: before.id,
      exhaustive: true,
      bindingIds: steps.map((s: any) => s.bindings[0].id),
    };
    for (const step of steps) step.bindings[0].payload.allocationGroup = structuredClone(group);
    if (fault === 'remainderGroup') {
      const other = steps[1].bindings[0];
      other.role = 'remainder';
      other.payload.allocationGroupId = group.id;
      other.payload.predecessors = [binding.id];
    }
  }
  let after = before;
  if (['corrected', 'rowUnitChanged'].includes(fault)) {
    const rows = structuredClone(before.ingredientLines);
    rows[0].amount.value.n = '3';
    rows[0].amountText = '3';
    if (fault === 'rowUnitChanged') rows[0].unit.text = 'tsp';
    const reply = applyCanonicalEditorPatch(before, {
      expectedContentRevision: before.contentRevision,
      ingredientLines: rows,
    });
    expect(reply.status).toBe(200);
    after = reply.body.recipe;
  }
  for (const target of [null, 4, 8, 6, 4]) {
    const projection = cookingProjection(after, target)!;
    const fixedValid = ['valid', 'corrected', 'fixedRow', 'unknownBasis'].includes(fault);
    const otherValid =
      !['duplicateAcrossSteps', 'rowUnitChanged', 'grouped', 'remainderGroup'].includes(fault) &&
      !(fault === 'unknownBasis' && target !== null);
    expect(projection.validatedUses).toBe(Number(fixedValid) + Number(otherValid));
    expect(projection.sections[0].steps[0].text).toBe(steps[0].text);
    if (otherValid)
      expect(projection.sections[0].steps[1].text).toBe(
        `Finish with ${target == null || fault === 'fixedRow' ? '1' : target === 6 ? '3/2' : target / 4} tbsp oil.`
      );
  }
  expect(after.instructionSections[0].steps[0].bindings[0].payload).toEqual(binding.payload);
  if (fault === 'corrected')
    expect(after.instructionSections[0].steps[0].bindings[0].validatedContentRevision).toBe(
      after.contentRevision
    );
});
