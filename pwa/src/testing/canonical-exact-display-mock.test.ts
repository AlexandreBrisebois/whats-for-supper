import { expect, it } from 'vitest';
import { canonicalIngredientLines } from '../../e2e/cooking-step-projection';
import { cookingStepRecipe } from '../../e2e/cooking-step-fixture';
import { ingredientProjectionText } from '../lib/ingredient-presentation';

function fixture() {
  const recipe: any = cookingStepRecipe();
  const template = structuredClone(recipe.ingredientLines[0]);
  recipe.servings = 3;
  recipe.ingredientLines = [
    {
      ...template,
      description: 'saved flour wording',
      amount: { kind: 'scalar', value: { n: '1', d: '3' } },
      amountText: '⅓',
      unit: { text: 'cup', definitionId: null },
      package: null,
      shopping: { name: 'flour', foodId: null, mappingRevision: null },
    },
    {
      ...structuredClone(template),
      id: '10000000-0000-0000-0000-000000000024',
      description: 'garlic',
      amount: { kind: 'range', min: { n: '2', d: '1' }, max: { n: '3', d: '1' } },
      amountText: '2–3',
      unit: { text: 'cloves', definitionId: null },
      package: null,
      shopping: { name: 'garlic', foodId: null, mappingRevision: null },
    },
  ];
  recipe.ingredients = ['⅓ cup saved flour wording', '2–3 cloves garlic'];
  return recipe;
}

it('projects exact non-package fractions and both range endpoints from originals without changing labels or saved wording', () => {
  const recipe = fixture();
  const before = structuredClone(recipe);
  const lines = canonicalIngredientLines(recipe, 5);
  expect(lines[0].displayText).toBe('5/9 cup flour');
  expect(lines[1].displayText).toBe('10/3–5 cloves garlic');
  expect(lines[0].originalText).toBe('⅓ cup saved flour wording');
  expect(ingredientProjectionText(lines[0] as any)).toBe('5/9 cup flour');
  expect(ingredientProjectionText(lines[1] as any)).toBe('10/3–5 cloves garlic');
  expect(canonicalIngredientLines(recipe, 3)[0].displayText).toBe('1/3 cup flour');
  expect(recipe).toEqual(before);
});

it('keeps Original notation and honestly omits derived text for unknown proportional basis', () => {
  const recipe = fixture();
  expect(ingredientProjectionText(canonicalIngredientLines(recipe, null)[0] as any)).toBe(
    '⅓ cup saved flour wording'
  );
  recipe.servings = null;
  const line = canonicalIngredientLines(recipe, 5)[0];
  expect(line).toMatchObject({ quantity: null, status: 'unresolved', issues: ['missing_basis'] });
  expect(line.displayText ?? null).toBeNull();
  expect(ingredientProjectionText(line as any)).toBe('⅓ cup saved flour wording');
});

it('keeps fixed exact amounts independent of an unknown basis and units independently nullable', () => {
  const recipe = fixture();
  recipe.servings = null;
  recipe.ingredientLines[0].scaling = 'fixed';
  recipe.ingredientLines[0].unit = null;
  const line = canonicalIngredientLines(recipe, 5)[0];
  expect(line).toMatchObject({
    displayText: '1/3 flour',
    quantity: 1 / 3,
    unitText: null,
    status: 'scaled',
    issues: [],
  });
});

it('retains exact zero and absent amounts without inventing a quantity', () => {
  const recipe = fixture();
  recipe.ingredientLines[0].amount = { kind: 'scalar', value: { n: '0', d: '1' } };
  expect(canonicalIngredientLines(recipe, 5)[0].displayText).toBe('0 cup flour');
  recipe.ingredientLines[0].amount = null;
  recipe.ingredients[0] = 'flour to taste';
  const line = canonicalIngredientLines(recipe, 5)[0];
  expect(line).toMatchObject({ quantity: null, status: 'unquantified', issues: [] });
  expect(line.displayText ?? null).toBeNull();
  expect(ingredientProjectionText(line as any)).toBe('flour to taste');
});

it('retains readable originals and unreliable status when exact projected operands overflow their bound', () => {
  const recipe = fixture();
  recipe.servings = 1;
  recipe.ingredientLines[0].amount = { kind: 'scalar', value: { n: '9'.repeat(38), d: '1' } };
  const line = canonicalIngredientLines(recipe, 8)[0];
  expect(line).toMatchObject({
    quantity: null,
    status: 'unresolved',
    issues: ['unreliable_amount'],
  });
  expect(line.displayText ?? null).toBeNull();
  expect(ingredientProjectionText(line as any)).toBe('⅓ cup saved flour wording');
});
