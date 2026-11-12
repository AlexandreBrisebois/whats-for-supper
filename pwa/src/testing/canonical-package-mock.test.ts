import { expect, it, vi } from 'vitest';
import { applyCanonicalEditorPatch } from '../../e2e/canonical-editor';
import { canonicalIngredientLines } from '../../e2e/cooking-step-projection';
import { cookingStepRecipe } from '../../e2e/cooking-step-fixture';

const scalar = (n: string) => ({ kind: 'scalar', value: { n, d: '1' } });
function input() {
  const recipe: any = cookingStepRecipe();
  const row = {
    ...structuredClone(recipe.ingredientLines[0]),
    description: 'tomatoes',
    amount: scalar('2'),
    amountText: '2',
    unit: { text: 'cans', definitionId: null },
    shopping: { name: 'tomatoes', foodId: null, mappingRevision: null },
    package: {
      countUnit: { text: 'cans', definitionId: null },
      capacity: {
        amount: scalar('400'),
        unit: { text: 'g', definitionId: null },
      },
      basis: 'net',
    },
  };
  return { recipe, row };
}
const save = (recipe: any, row: any) =>
  applyCanonicalEditorPatch(recipe, {
    expectedContentRevision: recipe.contentRevision,
    ingredientLines: [row],
  });

it('ordinary mock Save introduces a human package and later clears it without reviving metadata', () => {
  const { recipe, row } = input();
  const before = structuredClone(recipe);
  const response = save(recipe, row);
  expect(response.status).toBe(200);
  expect(recipe).toEqual(before);
  const stored = response.body.recipe;
  expect(stored.ingredientLines[0].package).toEqual(row.package);
  expect(stored.ingredientLines[0].provenance.protectedFields).toContain('package');
  expect(stored.ingredients[0]).toBe('2 cans tomatoes (400 g / cans; net)');
  const cleared = save(stored, { ...stored.ingredientLines[0], package: null });
  expect(cleared.status).toBe(200);
  expect(cleared.body.recipe.ingredientLines[0].package).toBeNull();
});
it('preserves an unrelated original row when generated serialization changes object property order', () => {
  const { recipe, row } = input();
  const original = structuredClone(recipe.ingredientLines[0]);
  const unchanged = {
    ...structuredClone(original),
    amount: { value: { d: '1', n: '200' }, kind: 'scalar' },
    unit: { definitionId: null, text: 'g' },
    shopping: { mappingRevision: null, foodId: null, name: 'pasta' },
  };
  const added: any = { ...row, clientId: 'new-package' };
  delete added.id;
  const response = applyCanonicalEditorPatch(recipe, {
    expectedContentRevision: recipe.contentRevision,
    ingredientLines: [unchanged, added],
  });
  expect(response.status).toBe(200);
  expect(response.body.recipe.ingredientLines[0]).toEqual(original);
});
it.each(['countUnit', 'capacity'])(
  'rejects a new non-null nested %s definition atomically',
  (path) => {
    const { recipe, row } = input();
    const unit = path === 'countUnit' ? row.package.countUnit : row.package.capacity.unit;
    unit.definitionId = 'unqualified-definition' as any;
    const before = structuredClone(recipe);
    expect(save(recipe, row).status).toBe(400);
    expect(recipe).toEqual(before);
  }
);
it('retains same-path definitions during a capacity edit but fences a text change under their ID', () => {
  const { recipe, row } = input();
  row.package.capacity.unit.definitionId = 'retained-gram' as any;
  recipe.ingredientLines = [structuredClone(row)];
  const changed = {
    ...structuredClone(row),
    package: {
      ...structuredClone(row.package),
      capacity: { ...structuredClone(row.package.capacity), amount: scalar('800') },
    },
  };
  expect(save(recipe, changed).status).toBe(200);
  changed.package.capacity.unit.text = 'ml';
  expect(save(recipe, changed).status).toBe(400);
});
it('projects only the package count exactly and preserves fixed capacity and independent null unit', () => {
  const { recipe, row } = input();
  recipe.servings = 4;
  recipe.ingredientLines = [row];
  recipe.ingredients = ['2 cans tomatoes (400 g / cans; net)'];
  const doubled: any = canonicalIngredientLines(recipe, 8)[0];
  expect(doubled.displayText).toBe('4 cans tomatoes (400 g / cans; net)');
  expect(doubled.originalText).toBe(recipe.ingredients[0]);
  const fractional: any = canonicalIngredientLines(recipe, 1)[0];
  expect(fractional.displayText).toBe('1/2 cans tomatoes (400 g / cans; net)');
  row.unit = null as any;
  expect((canonicalIngredientLines(recipe, 8)[0] as any).displayText).toBe(
    '4 tomatoes (400 g / cans; net)'
  );
  expect(canonicalIngredientLines(recipe, 8)[0].unitText).toBeNull();
  expect(row.package.capacity.amount).toEqual(scalar('400'));
});
it('retains the original readable count and truthful unresolved status on bounded arithmetic overflow', () => {
  const { recipe, row } = input();
  recipe.servings = 1;
  row.amountText = '9'.repeat(38);
  row.amount = scalar(row.amountText);
  recipe.ingredientLines = [row];
  recipe.ingredients = [`${row.amountText} cans tomatoes (400 g / cans; net)`];
  expect(canonicalIngredientLines(recipe, 8)[0]).toMatchObject({
    quantity: null,
    status: 'unresolved',
    issues: ['unreliable_amount'],
    displayText: recipe.ingredients[0],
  });
  expect(row.amount.value.n).toBe('9'.repeat(38));
});
it.each([false, true])(
  'keeps package grocery buckets and exact fractions through the existing refresh route: %s',
  async (fractional) => {
    const { mockSupperServings, builders } = await import('../../e2e/mock-api');
    const { recipe, row } = input();
    row.shopping.name = 'tomato';
    if (fractional) {
      row.amount = { kind: 'scalar', value: { n: '1', d: '3' } };
      row.amountText = '1/3';
    }
    recipe.servings = 4;
    recipe.ingredientLines = [
      row,
      { ...structuredClone(row), id: '10000000-0000-0000-0000-000000000022' },
      {
        ...structuredClone(row),
        id: '10000000-0000-0000-0000-000000000023',
        package: {
          ...structuredClone(row.package),
          capacity: { ...structuredClone(row.package.capacity), amount: scalar('800') },
        },
      },
    ];
    recipe.ingredients = recipe.ingredientLines.map(() => 'declared tomatoes');
    const schedule: any = builders.scheduleDays();
    const day = schedule.days[6];
    day.recipe = { id: recipe.id };
    day.occurrenceId = '10000000-0000-0000-0000-000000000024';
    const page: any = {
      route: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockResolvedValue(undefined),
    };
    const control = await mockSupperServings(page, () => schedule, {
      readFamilyCount: () => (fractional ? 1 : 8),
      readRecipe: () => recipe,
      knownRecipe: { id: recipe.id, basis: 4, quantity: 2, ingredient: 'tomato', unit: 'cans' },
    });
    control.preparationContext(day.date, recipe.id);
    await control.recipeChanged(recipe.id, { ingredients: recipe.ingredients });
    control.decorateSchedule(schedule);
    const items = schedule.groceryItems;
    expect(items).toHaveLength(2);
    const fourHundred = items.find(
      (item: any) => item.displayName === 'tomato (400 g / cans; net)'
    );
    expect(fourHundred.normalizedKey).toBe('tomato');
    expect(fourHundred.quantity).toEqual({
      kind: 'scalar',
      value: { n: fractional ? '1' : '8', d: fractional ? '6' : '1' },
    });
    expect(new Set(items.map((item: any) => item.demandIdentity)).size).toBe(2);
    const before = structuredClone(items);
    recipe.ingredientLines.reverse();
    recipe.ingredients.reverse();
    await control.recipeChanged(recipe.id, { ingredients: recipe.ingredients });
    control.decorateSchedule(schedule);
    expect(schedule.groceryItems).toEqual(before);
  }
);
