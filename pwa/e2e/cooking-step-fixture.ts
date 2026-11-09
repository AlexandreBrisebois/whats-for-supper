import { builders, MOCK_IDS } from './mock-api';

export function cookingStepRecipe() {
  return builders.recipe({
    id: MOCK_IDS.RECIPE_LASAGNA,
    name: 'Bound pasta',
    contentSchemaVersion: 2,
    contentRevision: 'bound-original',
    servings: 4,
    ingredients: ['200 g pasta'],
    ingredientLines: [
      {
        id: MOCK_IDS.RECIPE_CHICKEN,
        description: 'pasta',
        amount: { kind: 'scalar', value: { n: '200', d: '1' } },
        amountText: '200',
        unit: { text: 'g', definitionId: null },
        scaling: 'proportional',
        package: null,
        shopping: { name: 'pasta', foodId: null, mappingRevision: null },
        provenance: { origin: 'human', sourceRef: null, protectedFields: [] },
      },
    ],
    instructionSections: [
      {
        id: MOCK_IDS.RECIPE_CARBONARA,
        name: null,
        steps: [
          {
            id: MOCK_IDS.RECIPE_SPAGHETTI,
            text: 'Add 200 g pasta; cook 20 minutes at 180 °C.',
            textRevision: 'step-original',
            bindings: [
              {
                id: MOCK_IDS.RECIPE_TACOS,
                ingredientLineId: MOCK_IDS.RECIPE_CHICKEN,
                stepId: MOCK_IDS.RECIPE_SPAGHETTI,
                validatedContentRevision: 'bound-original',
                validatedTextRevision: 'step-original',
                span: { start: 4, end: 9, expectedText: '200 g' },
                role: 'whole',
                payload: {},
                status: 'validated',
              },
            ],
          },
        ],
      },
    ],
    recipeInstructions: [
      { name: null, itemListElement: [{ text: 'Add 200 g pasta; cook 20 minutes at 180 °C.' }] },
    ],
  } as any);
}

export function cookingAllocationRecipe(splitOil: boolean) {
  const recipe: any = cookingStepRecipe();
  const row = recipe.ingredientLines[0];
  recipe.name = splitOil ? 'Split oil' : 'Explicit partial pasta';
  row.description = splitOil ? 'oil' : 'pasta';
  row.shopping.name = row.description;
  row.amount = { kind: 'scalar', value: { n: splitOil ? '2' : '200', d: '1' } };
  row.amountText = splitOil ? '2' : '200';
  row.unit.text = splitOil ? 'tbsp' : 'g';
  recipe.ingredients = [splitOil ? '2 tbsp oil' : '200 g pasta'];
  const template = recipe.instructionSections[0].steps[0];
  recipe.instructionSections[0].steps = (splitOil ? [0, 1] : [0]).map((index) => {
    const step = structuredClone(template);
    step.id = index ? MOCK_IDS.RECIPE_LASAGNA : template.id;
    step.text = splitOil
      ? index
        ? 'Finish with 1 tbsp oil.'
        : 'Heat 1 tbsp oil.'
      : 'Add 50 g pasta from a 400 g package; cook 20 minutes at 180 °C.';
    const binding = step.bindings[0];
    binding.id = index ? MOCK_IDS.RECIPE_CHICKEN : binding.id;
    binding.stepId = step.id;
    binding.role = 'absolute';
    binding.payload = {
      amount: { kind: 'scalar', value: { n: splitOil ? '1' : '50', d: '1' } },
      unit: structuredClone(row.unit),
    };
    const expectedText = splitOil ? '1 tbsp' : '50 g';
    const start = step.text.indexOf(expectedText);
    binding.span = { start, end: start + expectedText.length, expectedText };
    return step;
  });
  recipe.recipeInstructions = [
    {
      name: null,
      itemListElement: recipe.instructionSections[0].steps.map((step: any) => ({
        text: step.text,
      })),
    },
  ];
  return recipe;
}

export function exhaustiveCookingRecipe() {
  const recipe: any = cookingAllocationRecipe(true);
  const steps = recipe.instructionSections[0].steps;
  const group = {
    id: MOCK_IDS.RECIPE_CARBONARA,
    exhaustive: true,
    bindingIds: steps.map((step: any) => step.bindings[0].id),
  };
  for (const step of steps) step.bindings[0].payload.allocationGroup = structuredClone(group);
  return recipe;
}

export function fractionCookingRecipe() {
  const recipe: any = cookingAllocationRecipe(false);
  recipe.name = 'Relative half pasta';
  const template = recipe.instructionSections[0].steps[0];
  const texts = [
    'Add half the pasta; cook 20 minutes at 180 °C.',
    'Keep half the pasta aside.',
    'Reserve half the pasta.',
    'Use half or half the pasta.',
  ];
  const ids = [
    MOCK_IDS.RECIPE_LASAGNA,
    MOCK_IDS.RECIPE_CHICKEN,
    MOCK_IDS.RECIPE_CARBONARA,
    MOCK_IDS.MEMBER_ALEX,
  ];
  const steps = texts.map((text, i) => {
    const step = structuredClone(template);
    step.id = ids[i];
    step.text = text;
    step.textRevision = `fraction-text-${i}`;
    const use = step.bindings[0];
    use.id = ids[i];
    use.stepId = step.id;
    use.validatedTextRevision = i === 2 ? 'old-text' : step.textRevision;
    const start = text.indexOf('half');
    use.span = { start, end: start + 4, expectedText: 'half' };
    use.role = 'fraction';
    use.payload = { fraction: { n: '1', d: i === 1 ? '0' : '2' } };
    if (i === 3)
      use.payload.allocationGroup = {
        id: MOCK_IDS.MEMBER_ALEX,
        exhaustive: false,
        bindingIds: [use.id],
      };
    return step;
  });
  recipe.instructionSections[0].steps = [template, ...steps];
  recipe.recipeInstructions = [
    { name: null, itemListElement: [template, ...steps].map(({ text }: any) => ({ text })) },
  ];
  return recipe;
}

export function remainderCookingRecipe() {
  const recipe: any = exhaustiveCookingRecipe();
  recipe.name = 'Remaining oil';
  const step = recipe.instructionSections[0].steps[1];
  step.text = 'Use the remaining oil; cook 20 minutes at 180 °C.';
  const binding = step.bindings[0];
  binding.role = 'remainder';
  binding.span = { start: 8, end: 17, expectedText: 'remaining' };
  binding.payload = {
    allocationGroup: binding.payload.allocationGroup,
    allocationGroupId: binding.payload.allocationGroup.id,
    predecessors: [recipe.instructionSections[0].steps[0].bindings[0].id],
  };
  recipe.recipeInstructions[0].itemListElement = recipe.instructionSections[0].steps.map(
    (s: any) => ({ text: s.text })
  );
  return recipe;
}

export function perItemCookingRecipe() {
  const recipe: any = cookingStepRecipe();
  recipe.name = 'Per-piece oil';
  const count = recipe.ingredientLines[0];
  count.description = 'pieces';
  count.shopping.name = 'pieces';
  count.amount = { kind: 'scalar', value: { n: '4', d: '1' } };
  count.amountText = '4';
  count.unit.text = 'pieces';
  const oil = structuredClone(count);
  oil.id = MOCK_IDS.MEMBER_ALEX;
  oil.description = 'oil';
  oil.shopping.name = 'oil';
  oil.amount = { kind: 'scalar', value: { n: '2', d: '1' } };
  oil.amountText = '2';
  oil.unit.text = 'tsp';
  recipe.ingredientLines = [count, oil];
  recipe.ingredients = ['4 pieces pieces', '2 tsp oil'];
  const step = recipe.instructionSections[0].steps[0];
  step.text =
    'Spread 1/2 tsp on each of 4 pieces from a 400 g package; cook 20 minutes at 180 °C in a 20 cm pan.';
  const boundCount = step.bindings[0];
  boundCount.span = { start: 26, end: 34, expectedText: '4 pieces' };
  const dose = structuredClone(boundCount);
  dose.id = MOCK_IDS.MEMBER_JORDAN;
  dose.ingredientLineId = oil.id;
  dose.span = { start: 7, end: 14, expectedText: '1/2 tsp' };
  dose.role = 'perItem';
  dose.payload = {
    dose: {
      amount: { kind: 'scalar', value: { n: '1', d: '2' } },
      unit: structuredClone(oil.unit),
    },
    countBindingId: boundCount.id,
  };
  step.bindings = [boundCount, dose];
  recipe.recipeInstructions[0].itemListElement = [{ text: step.text }];
  return recipe;
}

export function fixedCookingRecipe() {
  const recipe: any = cookingAllocationRecipe(true);
  recipe.name = 'Fixed oil';
  const [first, second] = recipe.instructionSections[0].steps;
  first.text = 'Heat one tbsp oil from a 400 g package; cook 20 minutes at 180 °C.';
  first.bindings[0].role = 'fixed';
  first.bindings[0].span = { start: 5, end: 13, expectedText: 'one tbsp' };
  recipe.recipeInstructions[0].itemListElement = [first, second].map((s: any) => ({
    text: s.text,
  }));
  return recipe;
}
