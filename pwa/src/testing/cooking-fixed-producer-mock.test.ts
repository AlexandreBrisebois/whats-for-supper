import { expect, it, vi } from 'vitest';
import { applyCanonicalEditorPatch } from '../../e2e/canonical-editor';
import { cookingAllocationRecipe } from '../../e2e/cooking-step-fixture';
import { cookingProjection } from '../../e2e/cooking-step-projection';
import { setupCommonRoutes } from '../../e2e/mock-api';

function original(french = false) {
  const recipe: any = cookingAllocationRecipe(true);
  const row = recipe.ingredientLines[0];
  row.description = french ? 'huile' : 'oil';
  row.shopping.name = row.description;
  row.unit.text = french ? 'c. à soupe' : 'tbsp';
  recipe.instructionSections[0].steps = [recipe.instructionSections[0].steps[0]];
  const step = recipe.instructionSections[0].steps[0];
  step.text = french
    ? 'Quel que soit le nombre de portions, utilisez exactement 1 c. à soupe d’huile.'
    : 'For any number of portions, use exactly 1 tbsp oil.';
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
it.each([false, true])('produces explicit fixed proof on Save, French %s', (french) => {
  const recipe = original(french);
  expect(cookingProjection(recipe, 8)!.validatedUses).toBe(0);
  const saved = save(recipe).body.recipe;
  const step = saved.instructionSections[0].steps[0];
  expect(step.bindings).toHaveLength(1);
  expect(step.bindings[0].role).toBe('fixed');
  expect(step.bindings[0].payload.relationshipEvidence.rule).toBe('explicit-fixed-portions-clause');
  expect(step.bindings[0].payload.allocationGroup).toBeUndefined();
  expect(cookingProjection(saved, 8)!.validatedUses).toBe(1);
  expect(cookingProjection(saved, 8)!.sections[0].steps[0].text).toBe(step.text);
  const corrected = save(saved, {
    ingredientLines: saved.ingredientLines.map((row: any) => ({
      ...row,
      amount: { kind: 'scalar', value: { n: '3', d: '1' } },
      amountText: '3',
    })),
  }).body.recipe;
  expect(corrected.instructionSections[0].steps[0].bindings[0].id).toBe(step.bindings[0].id);
  expect(cookingProjection(corrected, 8)!.validatedUses).toBe(1);
  expect(cookingProjection(corrected, 8)!.sections[0].steps[0].text).toBe(step.text);
  const cleared = save(corrected, {
    ingredientLines: corrected.ingredientLines.map((row: any) => ({
      ...row,
      amount: null,
      amountText: null,
    })),
  }).body.recipe;
  expect(cookingProjection(cleared, 8)!.validatedUses).toBe(0);
});
it.each([
  'Use exactly 1 tbsp oil.',
  'For any number of portions, use exactly 1 tbsp oil if needed.',
  'For any number of portions, use exactly 1 tbsp oil or sauce.',
  'For any number of portions, use exactly 1 tbsp oil per piece.',
  'If needed, for any number of portions, use exactly 1 tbsp oil.',
])('retains unsupported source without fixed inference: %s', (text) => {
  const recipe = original();
  recipe.instructionSections[0].steps[0].text = text;
  const saved = save(recipe).body.recipe;
  expect(cookingProjection(saved, 8)!.validatedUses).toBe(0);
  expect(saved.instructionSections[0].steps[0].text).toBe(text);
});
it('publishes fixed proof through ordinary PATCH then GET/preview and rejects stale replay', async () => {
  const recipe = original();
  const handlers = new Map<any, any>();
  const page: any = {
    route: async (pattern: any, handler: any) => handlers.set(pattern, handler),
    evaluate: vi.fn(),
  };
  await setupCommonRoutes(page, undefined, { canonicalEditor: recipe });
  const call = async (pattern: string, method: string, suffix = '', body?: any) => {
    const fulfill = vi.fn();
    const fallback = vi.fn();
    await handlers.get(pattern)({
      request: () => ({
        method: () => method,
        url: () => `http://localhost/api/recipes/${recipe.id}${suffix}`,
        postDataJSON: () => body,
      }),
      fulfill,
      fallback,
    });
    const response = fulfill.mock.calls[0]?.[0];
    return {
      status: response?.status,
      body: response?.json ?? (response?.body ? JSON.parse(response.body) : null),
      fallback,
    };
  };
  const input = {
    expectedContentRevision: recipe.contentRevision,
    instructionSections: recipe.instructionSections.map((section: any) => ({
      id: section.id,
      name: section.name,
      steps: section.steps.map(({ id, text }: any) => ({ id, text })),
    })),
  };
  const saved = await call('**/api/recipes/*', 'PATCH', '', input);
  expect(saved.status).toBe(200);
  expect(saved.body.recipe.instructionSections[0].steps[0].bindings[0]?.role).toBe('fixed');
  const read = await call('**/api/recipes/*', 'GET');
  expect(read.body.recipe.instructionSections).toEqual(saved.body.recipe.instructionSections);
  const preview = await call(
    '**/api/recipes/*/ingredient-preview*',
    'GET',
    '/ingredient-preview?targetServings=6'
  );
  expect(preview.body.instructionProjection.validatedUses).toBe(1);
  expect(preview.body.instructionProjection.sections[0].steps[0].text).toBe(
    recipe.instructionSections[0].steps[0].text
  );
  expect((await call('**/api/recipes/*', 'PATCH', '', input)).status).toBe(409);
  expect(
    (
      await call(
        '**/api/recipes/*/ingredient-preview*',
        'POST',
        '/ingredient-preview?targetServings=6'
      )
    ).fallback
  ).toHaveBeenCalledOnce();
});

it.each(['If needed, stir.', 'For each serving, stir.'])(
  'abstains when another step leaves conditional scope unresolved: %s',
  (text) => {
    const recipe = original();
    recipe.instructionSections[0].steps.push({
      id: '966d8df6-a38d-4ebc-9e13-5420d6382466',
      text,
      textRevision: 'extra',
      bindings: [],
    });
    expect(cookingProjection(save(recipe).body.recipe, 8)!.validatedUses).toBe(0);
  }
);
it('rejects newline source exactly as the native closed parser does', () => {
  const recipe = original();
  recipe.instructionSections[0].steps[0].text += '\n';
  expect(cookingProjection(save(recipe).body.recipe, 8)!.validatedUses).toBe(0);
});
it('preserves fixed meaning at unknown basis and below-use total without inventing an allocation bound', () => {
  const recipe = original();
  recipe.servings = null;
  recipe.ingredientLines[0].scaling = 'fixed';
  recipe.ingredientLines[0].amount = { kind: 'scalar', value: { n: '1', d: '2' } };
  recipe.ingredientLines[0].amountText = '1/2';
  const saved = save(recipe).body.recipe;
  expect(cookingProjection(saved, 8)!.validatedUses).toBe(1);
  expect(cookingProjection(saved, 8)!.sections[0].steps[0].text).toBe(
    recipe.instructionSections[0].steps[0].text
  );
});

it('retains an independent final-remainder sequence beside a new fixed use', () => {
  const recipe: any = cookingAllocationRecipe(true);
  const oil = recipe.ingredientLines[0];
  const fixed = structuredClone(oil);
  fixed.id = 'd1b85eb0-c19f-41bd-b3f2-61df5e5230cb';
  fixed.description = 'butter';
  fixed.shopping.name = 'butter';
  recipe.ingredientLines.push(fixed);
  for (const [index, text] of [
    'Use 1 tbsp oil.',
    'Finally, use all the remaining oil.',
  ].entries()) {
    recipe.instructionSections[0].steps[index].text = text;
    recipe.instructionSections[0].steps[index].bindings = [];
  }
  recipe.instructionSections[0].steps.push({
    id: 'fa38b37e-985a-4f38-9e60-86c27bcbfd85',
    text: 'For any number of portions, use exactly 1 tbsp butter.',
    textRevision: 'butter-fixed',
    bindings: [],
  });
  const saved = save(recipe).body.recipe;
  expect(saved.instructionSections[0].steps.map((step: any) => step.bindings[0]?.role)).toEqual([
    'absolute',
    'remainder',
    'fixed',
  ]);
  expect(cookingProjection(saved, 8)!.validatedUses).toBe(3);
});

it.each(['1/0', '1,000'])(
  'does not treat an invalid annotation %s as independent proof',
  (amount) => {
    const recipe = original();
    const sauce = structuredClone(recipe.ingredientLines[0]);
    sauce.id = '9c18a0b5-af54-4293-84b9-5c477c884630';
    sauce.description = 'sauce';
    sauce.shopping.name = 'sauce';
    sauce.unit = { text: 'ml', definitionId: null };
    recipe.ingredientLines.push(sauce);
    recipe.instructionSections[0].steps.push({
      id: 'ee779833-8423-4e77-b12d-501a5ebcae09',
      text: `Add half of the sauce (${amount} ml).`,
      textRevision: 'invalid-half',
      bindings: [],
    });
    expect(cookingProjection(save(recipe).body.recipe, 8)!.validatedUses).toBe(0);
  }
);
