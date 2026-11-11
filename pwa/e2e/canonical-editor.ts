import { carryCookingBindings } from './cooking-step-projection';
import { discoverRemainderBindings } from './cooking-remainder-producer';
import { randomUUID } from 'node:crypto';

/** Explicit disposable mock composition; the common default remains fenced. */
export function applyCanonicalEditorPatch(current: any, input: any): { status: number; body: any } {
  const semantic = [
    'ingredientLines',
    'instructionSections',
    'servings',
    'ingredients',
    'recipeInstructions',
  ].some((key) => Object.hasOwn(input, key));
  const conflict = () => ({
    status: 409,
    body: {
      code: 'recipe_content_conflict',
      currentContentRevision: current.contentRevision,
      upgradeRequired: input.ingredients != null || input.recipeInstructions != null,
    },
  });
  if (
    semantic &&
    (input.expectedContentRevision !== current.contentRevision ||
      input.ingredients != null ||
      input.recipeInstructions != null)
  )
    return conflict();
  const invalid = () => ({
    status: 400,
    body: { message: 'Invalid canonical recipe content. No fields were saved.' },
  });
  if (
    Object.hasOwn(input, 'servings') &&
    (!Number.isInteger(input.servings) || input.servings < 1 || input.servings > 2147483647)
  )
    return invalid();
  if (
    input.rating != null &&
    (!Number.isInteger(input.rating) || input.rating < 0 || input.rating > 3)
  )
    return invalid();
  const suitable =
    input.mealTypes == null
      ? (current.supperSuitable ??
        (current.category === 'Supper' || current.mealTypes?.includes('Supper')))
      : input.mealTypes.length === 0 || input.mealTypes.includes('Supper');
  if (input.isDiscoverable === true && !suitable) return invalid();
  const createdIds: Record<string, string> = {};
  const assign = (row: any, existing: any[]) => {
    if (row.id && !existing.some((old) => old.id === row.id)) throw new Error('Foreign identity');
    const id = row.id ?? randomUUID();
    if (row.clientId) createdIds[row.clientId] = id;
    const { clientId: _clientId, ...facts } = row;
    return { ...facts, id };
  };
  try {
    const recipe = structuredClone(current);
    for (const key of ['name', 'description', 'notes', 'cuisineType', 'mealTypes', 'rating'])
      if (input[key] != null) recipe[key] = input[key];
    if (input.isDiscoverable != null) {
      recipe.isDiscoverable = input.isDiscoverable;
    }
    if (input.servings !== undefined) recipe.servings = input.servings;
    if (input.ingredientLines) {
      recipe.ingredientLines = input.ingredientLines.map((row: any) => {
        const old = current.ingredientLines.find((item: any) => item.id === row.id);
        if (
          (old &&
            (row.shopping.foodId !== old.shopping.foodId ||
              row.shopping.mappingRevision !== old.shopping.mappingRevision)) ||
          (!old && row.shopping.foodId != null)
        )
          throw new Error('Unqualified mapping');
        if (
          (row.unit?.definitionId != null &&
            JSON.stringify(row.unit) !== JSON.stringify(old?.unit)) ||
          (row.package != null && JSON.stringify(row.package) !== JSON.stringify(old?.package))
        )
          throw new Error('Unqualified definition');
        const result = assign(row, current.ingredientLines);
        const same =
          old &&
          ['description', 'amount', 'amountText', 'unit', 'scaling', 'package', 'shopping'].every(
            (key) => JSON.stringify(row[key]) === JSON.stringify(old[key])
          );
        result.provenance = same
          ? old.provenance
          : {
              origin: 'human',
              sourceRef: old?.provenance?.sourceRef ?? null,
              protectedFields: [
                'description',
                'amount',
                'amountText',
                'unit',
                'scaling',
                'package',
                'shopping',
              ],
            };
        return result;
      });
      const rational = (q: any) => (q.d === '1' ? q.n : `${q.n}/${q.d}`);
      recipe.ingredients = recipe.ingredientLines.map((row: any) =>
        [
          row.amountText ??
            (row.amount?.kind === 'scalar'
              ? rational(row.amount.value)
              : row.amount?.kind === 'range'
                ? `${rational(row.amount.min)}–${rational(row.amount.max)}`
                : null),
          row.unit?.text,
          row.description,
        ]
          .filter((value) => value != null)
          .join(' ')
      );
    }
    if (input.instructionSections) {
      const steps = current.instructionSections?.flatMap((section: any) => section.steps) ?? [];
      recipe.instructionSections = input.instructionSections.map((section: any) => ({
        ...assign(section, current.instructionSections ?? []),
        steps: section.steps.map((step: any) => ({
          ...assign(step, steps),
          textRevision:
            steps.find((old: any) => old.id === step.id && old.text === step.text)?.textRevision ??
            randomUUID(),
          bindings: [],
        })),
      }));
    } else if (semantic)
      recipe.instructionSections = (recipe.instructionSections ?? []).map((section: any) => ({
        ...section,
        steps: section.steps.map((step: any) => ({ ...step, bindings: [] })),
      }));
    if (input.mealTypes) {
      if (input.mealTypes.length && !input.mealTypes.includes('Supper'))
        recipe.isDiscoverable = false;
      if (!input.mealTypes.length) recipe.category = 'Supper';
    }
    if (semantic) {
      recipe.contentRevision = randomUUID();
      carryCookingBindings(current, recipe);
      discoverRemainderBindings(current, recipe);
      recipe.recipeInstructions = (recipe.instructionSections ?? []).map((section: any) => ({
        name: section.name,
        itemListElement: section.steps.map((step: any) => ({ text: step.text })),
      }));
    }
    return { status: 200, body: { recipe, createdIds, updatedAt: new Date().toISOString() } };
  } catch {
    return invalid();
  }
}
