import { expect, it } from 'vitest';
import { applyCanonicalEditorPatch } from '../../e2e/canonical-editor';
import { cookingProjection } from '../../e2e/cooking-step-projection';
import { cookingStepRecipe } from '../../e2e/cooking-step-fixture';

function original(french = false) {
  const recipe: any = cookingStepRecipe();
  const template = recipe.ingredientLines[0];
  recipe.sourceRevision = 'per-item-source';
  recipe.ingredientLines = [
    {
      ...structuredClone(template),
      id: '10000000-0000-0000-0000-000000000001',
      description: 'tofu',
      amountText: '4',
      amount: { kind: 'scalar', value: { n: '4', d: '1' } },
      unit: { text: french ? 'morceaux' : 'pieces', definitionId: null },
      shopping: { name: 'tofu', foodId: null, mappingRevision: null },
    },
    {
      ...structuredClone(template),
      id: '10000000-0000-0000-0000-000000000002',
      description: french ? 'huile' : 'oil',
      amountText: '2',
      amount: { kind: 'scalar', value: { n: '2', d: '1' } },
      unit: { text: french ? 'c. à thé' : 'tsp', definitionId: null },
      shopping: { name: french ? 'huile' : 'oil', foodId: null, mappingRevision: null },
    },
  ];
  const step = recipe.instructionSections[0].steps[0];
  step.text = french
    ? 'Pour tous les 4 morceaux de tofu, utilisez exactement 1/2 c. à thé d’huile sur chaque morceau.'
    : 'For all 4 pieces of tofu, use exactly 1/2 tsp of oil on each piece.';
  step.bindings = [];
  return recipe;
}
function save(recipe: any, changes: any = {}) {
  return applyCanonicalEditorPatch(recipe, {
    expectedContentRevision: recipe.contentRevision,
    instructionSections: recipe.instructionSections.map((section: any) => ({
      id: section.id,
      name: section.name,
      steps: section.steps.map(({ id, text }: any) => ({ id, text })),
    })),
    ...changes,
  });
}
const first = (recipe: any) => recipe.instructionSections[0].steps[0];

it.each([false, true])(
  'ordinary Save produces a separate whole count and fixed per-item dose, French %s',
  (french) => {
    const recipe = original(french);
    expect(cookingProjection(recipe, 8)!.validatedUses).toBe(0);
    const result = save(recipe);
    expect(result.status).toBe(200);
    const saved = result.body.recipe;
    const [count, dose] = first(saved).bindings;
    expect(first(saved).bindings).toHaveLength(2);
    expect([count.role, dose.role]).toEqual(['whole', 'perItem']);
    expect(count.ingredientLineId).toBe(saved.ingredientLines[0].id);
    expect(dose.ingredientLineId).toBe(saved.ingredientLines[1].id);
    expect(dose.payload.countBindingId).toBe(count.id);
    expect(dose.payload.dose).toEqual({
      amount: { kind: 'scalar', value: { n: '1', d: '2' } },
      unit: saved.ingredientLines[1].unit,
    });
    for (const binding of [count, dose]) {
      expect(binding.payload.relationshipEvidence.rule).toBe('explicit-per-item-clause');
      expect(binding.payload.relationshipEvidence.sourceRevision).toBe(recipe.sourceRevision);
      expect(binding.validatedContentRevision).toBe(saved.contentRevision);
      expect(binding.validatedTextRevision).toBe(first(saved).textRevision);
      expect(first(saved).text.slice(binding.span.start, binding.span.end)).toBe(
        binding.span.expectedText
      );
      expect(binding.payload.allocationGroup).toBeUndefined();
    }
    expect(first(saved).text).toBe(first(recipe).text);
    const projection = cookingProjection(saved, 8)!;
    expect(projection.validatedUses).toBe(2);
    expect(projection.sections[0].steps[0].text).toContain(french ? '8 morceaux' : '8 pieces');
    expect(projection.sections[0].steps[0].text).toContain(french ? '1/2 c. à thé' : '1/2 tsp');
  }
);

it('carries independent original-total corrections and refreshes explicit current-count text proof', () => {
  const saved = save(original()).body.recipe;
  expect(first(saved).bindings).toHaveLength(2);
  const ids = first(saved).bindings.map((binding: any) => binding.id);
  const corrected = save(saved, {
    ingredientLines: saved.ingredientLines.map((row: any, index: number) => ({
      ...row,
      amountText: index === 0 ? '6' : '3',
      amount: { kind: 'scalar', value: { n: index === 0 ? '6' : '3', d: '1' } },
    })),
  }).body.recipe;
  expect(first(corrected).bindings.map((binding: any) => binding.id)).toEqual(ids);
  expect(first(corrected).bindings[1].payload.countBindingId).toBe(ids[0]);
  expect(first(corrected).text).toBe(first(saved).text);
  expect(cookingProjection(corrected, 8)!.sections[0].steps[0].text).toContain('12 pieces');
  expect(cookingProjection(corrected, 8)!.sections[0].steps[0].text).toContain('1/2 tsp');
  const draft = structuredClone(corrected);
  first(draft).text = 'For all 6 pieces of tofu, use exactly 1/3 tsp of oil on each piece.';
  const edited = save(corrected, {
    instructionSections: draft.instructionSections.map((section: any) => ({
      id: section.id,
      name: section.name,
      steps: section.steps.map(({ id, text }: any) => ({ id, text })),
    })),
  }).body.recipe;
  expect(first(edited).bindings).toHaveLength(2);
  expect(first(edited).bindings.every((binding: any) => !ids.includes(binding.id))).toBe(true);
  expect(first(edited).bindings[1].payload.countBindingId).toBe(first(edited).bindings[0].id);
  expect(cookingProjection(edited, 8)!.sections[0].steps[0].text).toContain('12 pieces');
  expect(cookingProjection(edited, 8)!.sections[0].steps[0].text).toContain('1/3 tsp');
});

it('keeps the explicit dose when its ingredient total is unknown, without guessing a serving basis', () => {
  const recipe = original();
  recipe.ingredientLines[1].amount = null;
  recipe.ingredientLines[1].amountText = null;
  const saved = save(recipe).body.recipe;
  expect(first(saved).bindings).toHaveLength(2);
  expect(saved.ingredientLines[1].amount).toBeNull();
  expect(cookingProjection(saved, 8)!.validatedUses).toBe(2);
  const noBasis = original();
  noBasis.servings = null;
  const unresolved = save(noBasis).body.recipe;
  expect(first(unresolved).bindings).toHaveLength(2);
  expect(cookingProjection(unresolved, 8)!.validatedUses).toBe(0);
  expect(cookingProjection(unresolved, 8)!.sections[0].steps[0].text).toBe(first(noBasis).text);
});

it.each([
  'For some 4 pieces of tofu, use exactly 1/2 tsp of oil on each piece.',
  'For all 3 pieces of tofu, use exactly 1/2 tsp of oil on each piece.',
  'For all 4 pieces of tofu, use exactly 1/2 tsp of oil on each piece if needed.',
  'For all 4 pieces of tofu, use exactly 1/0 tsp of oil on each piece.',
])('does not infer a per-item graph from unsupported source: %s', (text) => {
  const recipe = original();
  first(recipe).text = text;
  const saved = save(recipe).body.recipe;
  expect(cookingProjection(saved, 8)!.validatedUses).toBe(0);
  expect(first(saved).text).toBe(text);
});

it('retains an independent count through successive saves after the dose unit becomes unsupported', () => {
  const saved = save(original()).body.recipe;
  const countId = first(saved).bindings[0].id;
  const changed = save(saved, {
    ingredientLines: saved.ingredientLines.map((row: any, index: number) =>
      index === 1 ? { ...row, unit: { text: 'tbsp', definitionId: null } } : row
    ),
  }).body.recipe;
  expect(first(changed).bindings).toHaveLength(1);
  expect(first(changed).bindings[0].id).toBe(countId);
  const later = save(changed, {
    ingredientLines: changed.ingredientLines.map((row: any, index: number) =>
      index === 0
        ? { ...row, amountText: '6', amount: { kind: 'scalar', value: { n: '6', d: '1' } } }
        : row
    ),
  }).body.recipe;
  expect(first(later).bindings).toHaveLength(1);
  expect(first(later).bindings[0].id).toBe(countId);
  expect(cookingProjection(later, 8)!.validatedUses).toBe(1);
  expect(cookingProjection(later, 8)!.sections[0].steps[0].text).toContain('12 pieces');
  expect(first(later).text).toBe(first(saved).text);
});

it('preserves independent remainder and fixed proof beside the closed count/dose clause', () => {
  const recipe = original();
  for (const [index, description] of ['sauce', 'butter'].entries())
    recipe.ingredientLines.push({
      ...structuredClone(recipe.ingredientLines[1]),
      id: `10000000-0000-0000-0000-00000000000${index + 3}`,
      description,
      unit: { text: 'tbsp', definitionId: null },
      shopping: { name: description, foodId: null, mappingRevision: null },
    });
  for (const [index, text] of [
    'Use 1 tbsp sauce.',
    'Finally, use all the remaining sauce.',
    'For any number of portions, use exactly 1 tbsp butter.',
  ].entries())
    recipe.instructionSections[0].steps.push({
      id: `20000000-0000-0000-0000-00000000000${index + 1}`,
      text,
      textRevision: `other-${index}`,
      bindings: [],
    });
  const saved = save(recipe).body.recipe;
  expect(saved.instructionSections[0].steps.map((step: any) => step.bindings.length)).toEqual([
    2, 1, 1, 1,
  ]);
  const prior = saved.instructionSections[0].steps.slice(1).map((step: any) => step.bindings[0].id);
  const changed = save(saved, {
    ingredientLines: saved.ingredientLines.map((row: any, index: number) =>
      index === 1 ? { ...row, unit: { text: 'tbsp', definitionId: null } } : row
    ),
  }).body.recipe;
  expect(changed.instructionSections[0].steps.map((step: any) => step.bindings.length)).toEqual([
    1, 1, 1, 1,
  ]);
  expect(
    changed.instructionSections[0].steps.slice(1).map((step: any) => step.bindings[0].id)
  ).toEqual(prior);
  expect(cookingProjection(changed, 8)!.validatedUses).toBe(4);
});

it.each(['count', 'dose', 'pair'])(
  'does not launder duplicated owned %s proof into new identities',
  (fault) => {
    const recipe = save(original()).body.recipe;
    if (fault === 'pair') first(recipe).bindings[1].id = first(recipe).bindings[0].id;
    else
      first(recipe).bindings.push(
        structuredClone(first(recipe).bindings[fault === 'count' ? 0 : 1])
      );
    expect(cookingProjection(save(recipe).body.recipe, 8)!.validatedUses).toBe(0);
  }
);

it.each(['rename', 'delete'])(
  'retains only authoritative upstream count after dose %s and another Save',
  (fault) => {
    const saved = save(original()).body.recipe;
    const id = first(saved).bindings[0].id;
    const lines = structuredClone(saved.ingredientLines);
    if (fault === 'rename') {
      lines[1].description = 'butter';
      lines[1].shopping.name = 'butter';
    } else lines.splice(1, 1);
    const changed = save(saved, { ingredientLines: lines }).body.recipe;
    expect(first(changed).bindings).toHaveLength(1);
    expect(first(changed).bindings[0].id).toBe(id);
    const later = save(changed, {
      ingredientLines: changed.ingredientLines.map((row: any, index: number) =>
        index === 0
          ? { ...row, amountText: '6', amount: { kind: 'scalar', value: { n: '6', d: '1' } } }
          : row
      ),
    }).body.recipe;
    expect(first(later).bindings).toHaveLength(1);
    expect(first(later).bindings[0].id).toBe(id);
    expect(cookingProjection(later, 8)!.validatedUses).toBe(1);
    expect(cookingProjection(later, 8)!.sections[0].steps[0].text).toContain('12 pieces');
    expect(first(later).bindings.some((binding: any) => binding.role === 'perItem')).toBe(false);
  }
);

it.each([false, true])(
  'count-only carry never authorizes a new exhaustive group on the old dose row, later Save %s',
  (later) => {
    const saved = save(original()).body.recipe;
    const lines = structuredClone(saved.ingredientLines);
    lines[1].description = 'olive oil';
    lines[1].shopping.name = 'olive oil';
    const base = later ? save(saved, { ingredientLines: lines }).body.recipe : saved;
    const sections = base.instructionSections.map((section: any) => ({
      id: section.id,
      name: section.name,
      steps: [
        ...section.steps.map(({ id, text }: any) => ({ id, text })),
        { id: null, text: 'Use 1 tsp olive oil.' },
        { id: null, text: 'Finally, use all the remaining olive oil.' },
      ],
    }));
    const result = save(base, { ingredientLines: lines, instructionSections: sections }).body
      .recipe;
    expect(first(result).bindings).toHaveLength(1);
    expect(first(result).bindings[0].id).toBe(first(saved).bindings[0].id);
    expect(
      result.instructionSections[0].steps.slice(1).map((step: any) => step.bindings.length)
    ).toEqual([0, 0]);
  }
);

it.each(['rename', 'delete'])(
  'preserves independent remainder and fixed proof through dose %s and repeated Save',
  (fault) => {
    const recipe = original();
    for (const [index, description] of ['sauce', 'butter'].entries())
      recipe.ingredientLines.push({
        ...structuredClone(recipe.ingredientLines[1]),
        id: `10000000-0000-0000-0000-00000000000${index + 3}`,
        description,
        unit: { text: 'tbsp', definitionId: null },
        shopping: { name: description, foodId: null, mappingRevision: null },
      });
    for (const [index, text] of [
      'Use 1 tbsp sauce.',
      'Finally, use all the remaining sauce.',
      'For any number of portions, use exactly 1 tbsp butter.',
    ].entries())
      recipe.instructionSections[0].steps.push({
        id: `20000000-0000-0000-0000-00000000000${index + 1}`,
        text,
        textRevision: `other-${index}`,
        bindings: [],
      });
    const saved = save(recipe).body.recipe;
    expect(saved.instructionSections[0].steps.map((step: any) => step.bindings.length)).toEqual([
      2, 1, 1, 1,
    ]);
    const prior = saved.instructionSections[0].steps
      .slice(1)
      .map((step: any) => step.bindings[0].id);
    const lines = structuredClone(saved.ingredientLines);
    if (fault === 'rename') {
      lines[1].description = 'olive oil';
      lines[1].shopping.name = 'olive oil';
    } else lines.splice(1, 1);
    const changed = save(saved, { ingredientLines: lines }).body.recipe;
    expect(changed.instructionSections[0].steps.map((step: any) => step.bindings.length)).toEqual([
      1, 1, 1, 1,
    ]);
    expect(
      changed.instructionSections[0].steps.slice(1).map((step: any) => step.bindings[0].id)
    ).toEqual(prior);
    expect(cookingProjection(changed, 8)!.validatedUses).toBe(4);
    const later = save(changed, {
      ingredientLines: changed.ingredientLines.map((row: any, index: number) =>
        index === 0
          ? { ...row, amountText: '6', amount: { kind: 'scalar', value: { n: '6', d: '1' } } }
          : row
      ),
    }).body.recipe;
    expect(
      later.instructionSections[0].steps.slice(1).map((step: any) => step.bindings[0]?.id)
    ).toEqual(prior);
    expect(cookingProjection(later, 8)!.validatedUses).toBe(4);
  }
);
