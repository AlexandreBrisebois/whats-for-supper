import { expect, it, vi } from 'vitest';
import { applyCanonicalEditorPatch } from '../../e2e/canonical-editor';
import { cookingAllocationRecipe } from '../../e2e/cooking-step-fixture';
import { cookingProjection } from '../../e2e/cooking-step-projection';
import { setupCommonRoutes } from '../../e2e/mock-api';

function original(french = false) {
  const recipe: any = cookingAllocationRecipe(true);
  recipe.ingredientLines[0].description = french ? 'huile' : 'oil';
  recipe.ingredientLines[0].shopping.name = french ? 'huile' : 'oil';
  const steps = recipe.instructionSections[0].steps;
  steps[0].text = french ? 'Utilisez 1 tbsp d’huile.' : 'Use 1 tbsp oil.';
  steps[1].text = french
    ? 'Enfin, utilisez tout le reste d’huile.'
    : 'Finally, use all the remaining oil.';
  for (const step of steps) step.bindings = [];
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

it.each([false, true])(
  'discovers final exhaustive intent only on saved source, French %s',
  (french) => {
    const before = original(french);
    expect(cookingProjection(before, 8)!.validatedUses).toBe(0);
    const reply = save(before);
    expect(reply.status).toBe(200);
    const after = reply.body.recipe;
    const steps = after.instructionSections[0].steps;
    expect(steps.map((step: any) => step.bindings[0]?.role)).toEqual(['absolute', 'remainder']);
    expect(steps[1].bindings[0].payload.predecessors).toEqual([steps[0].bindings[0].id]);
    expect(cookingProjection(after, 8)!.validatedUses).toBe(2);
    expect(cookingProjection(after, 8)!.sections[0].steps[1].text).toContain(
      french ? 'reste (2 tbsp)' : 'remaining (2 tbsp)'
    );
    expect(steps.map((step: any) => step.text)).toEqual(
      before.instructionSections[0].steps.map((step: any) => step.text)
    );
    for (const amount of ['3', '1', '1/2']) {
      const corrected = save(after, {
        ingredientLines: after.ingredientLines.map((row: any) => ({
          ...row,
          amount: {
            kind: 'scalar',
            value: amount === '1/2' ? { n: '1', d: '2' } : { n: amount, d: '1' },
          },
          amountText: amount,
        })),
      }).body.recipe;
      const projection = cookingProjection(corrected, 8)!;
      expect(projection.validatedUses).toBe(amount === '1/2' ? 0 : 2);
      expect(projection.sections[0].steps[1].text).toBe(
        amount === '1/2'
          ? steps[1].text
          : steps[1].text.replace(
              french ? 'reste' : 'remaining',
              `${french ? 'reste' : 'remaining'} (${amount === '3' ? '4' : '0'} tbsp)`
            )
      );
      expect(corrected.instructionSections[0].steps[0].text).toBe(steps[0].text);
    }
  }
);

it.each([
  'Use the remaining oil.',
  'Finally, use some remaining oil.',
  'If needed, finally, use all the remaining oil.',
  'Finally, use all the remaining oil or sauce.',
])('abstains on unsupported final wording %s', (text) => {
  const recipe = original();
  recipe.instructionSections[0].steps[1].text = text;
  const saved = save(recipe).body.recipe;
  expect(cookingProjection(saved, 8)!.validatedUses).toBe(0);
});

it('ordinary method-sensitive PATCH publishes proof to subsequent GET and preview and rejects stale replay', async () => {
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
  expect(saved.body.recipe.instructionSections[0].steps[1].bindings[0]?.role).toBe('remainder');
  const read = await call('**/api/recipes/*', 'GET');
  expect(read.body.recipe.instructionSections).toEqual(saved.body.recipe.instructionSections);
  const preview = await call(
    '**/api/recipes/*/ingredient-preview*',
    'GET',
    '/ingredient-preview?targetServings=6'
  );
  expect(preview.body.instructionProjection.validatedUses).toBe(2);
  expect(preview.body.instructionProjection.sections[0].steps[1].text).toContain(
    'remaining (3/2 tbsp)'
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

it('replaces final-step proof while retaining prior identity and rejects extra references', () => {
  const before = save(original()).body.recipe;
  const ids = before.instructionSections[0].steps.map((step: any) => step.bindings[0].id);
  const input = structuredClone(before.instructionSections);
  input[0].steps[1].text = 'Finally, add all the remaining oil.';
  const edited = save(before, { instructionSections: input }).body.recipe;
  const steps = edited.instructionSections[0].steps;
  expect(steps[0].bindings[0].id).toBe(ids[0]);
  expect(steps[1].bindings[0].id).not.toBe(ids[1]);
  expect(steps[1].bindings[0].payload.predecessors).toEqual([ids[0]]);
  const extra = structuredClone(edited.instructionSections);
  extra[0].steps.push({ clientId: 'extra', text: 'Use 1 tbsp oil.' });
  const unsupported = save(edited, { instructionSections: extra }).body.recipe;
  expect(cookingProjection(unsupported, 8)!.validatedUses).toBe(0);
});

it('retains an independent other-row proof through discovery and clear', () => {
  const recipe = original();
  const sauce = structuredClone(recipe.ingredientLines[0]);
  sauce.id = '8917f403-8d14-4c39-8478-86745778ec98';
  sauce.description = 'sauce';
  sauce.shopping.name = 'sauce';
  sauce.amount = { kind: 'scalar', value: { n: '100', d: '1' } };
  sauce.amountText = '100';
  sauce.unit = { text: 'ml', definitionId: null };
  recipe.ingredientLines.push(sauce);
  const step: any = {
    id: '3c3b5764-e4a9-46e8-a940-6ba533ad8a62',
    text: 'Add all 100 ml sauce.',
    textRevision: 'sauce-text',
    bindings: [
      {
        id: 'ce1ea3ac-b0ce-4146-ab32-e516122c6504',
        ingredientLineId: sauce.id,
        stepId: '3c3b5764-e4a9-46e8-a940-6ba533ad8a62',
        validatedContentRevision: recipe.contentRevision,
        validatedTextRevision: 'sauce-text',
        span: { start: 8, end: 14, expectedText: '100 ml' },
        role: 'whole',
        payload: {},
        status: 'validated',
      },
    ],
  };
  recipe.instructionSections[0].steps.push(step);
  const saved = save(recipe).body.recipe;
  expect(cookingProjection(saved, 8)!.validatedUses).toBe(3);
  expect(saved.instructionSections[0].steps[2].bindings[0].id).toBe(step.bindings[0].id);
  const cleared = save(saved, {
    ingredientLines: saved.ingredientLines.map((row: any) =>
      row.id === sauce.id ? row : { ...row, amount: null, amountText: null }
    ),
  }).body.recipe;
  expect(cookingProjection(cleared, 8)!.validatedUses).toBe(1);
  expect(cleared.instructionSections[0].steps[2].bindings[0].id).toBe(step.bindings[0].id);
});

it.each([
  'Optionally, stir.',
  'Au besoin, remuez.',
  'Provided it thickens, stir.',
  'Keep stirring until ready.',
])('abstains when an extra step lacks closed independent evidence %s', (text) => {
  const recipe = original();
  recipe.instructionSections[0].steps.push({
    id: '22e1f184-251f-450f-a15c-91745425d883',
    text,
    textRevision: 'extra-text',
    bindings: [],
  });
  expect(cookingProjection(save(recipe).body.recipe, 8)!.validatedUses).toBe(0);
});

it.each([false, true])('abstains for an alternative saved subject, French %s', (french) => {
  const recipe = original(french);
  const name = french ? 'huile ou beurre' : 'oil or butter';
  recipe.ingredientLines[0].description = name;
  recipe.instructionSections[0].steps[0].text = french
    ? `Utilisez 1 tbsp d’${name}.`
    : `Use 1 tbsp ${name}.`;
  recipe.instructionSections[0].steps[1].text = french
    ? `Enfin, utilisez tout le reste d’${name}.`
    : `Finally, use all the remaining ${name}.`;
  expect(cookingProjection(save(recipe).body.recipe, 8)!.validatedUses).toBe(0);
});

it('admits the same tab-separated closed neutral procedure as the native producer', () => {
  const recipe = original();
  recipe.instructionSections[0].steps.push({
    id: 'f1efdfb9-abd8-42c4-96e9-5352aac47910',
    text: 'Simmer\t20\tminutes\tat\t180\t°C.',
    textRevision: 'neutral-text',
    bindings: [],
  });
  expect(cookingProjection(save(recipe).body.recipe, 8)!.validatedUses).toBe(2);
});

it('extends an existing independently proven measured use when Save adds the final clause', () => {
  const recipe = original();
  const prior = recipe.instructionSections[0].steps[0];
  const priorId = '659c847f-9e04-4201-9be8-dba1b8b7d45f';
  prior.bindings = [
    {
      id: priorId,
      ingredientLineId: recipe.ingredientLines[0].id,
      stepId: prior.id,
      validatedContentRevision: recipe.contentRevision,
      validatedTextRevision: prior.textRevision,
      span: { start: 4, end: 10, expectedText: '1 tbsp' },
      role: 'absolute',
      status: 'validated',
      payload: {
        relationshipEvidence: {
          version: 1,
          rule: 'explicit-absolute-clause',
          sourceRevision: 'mock-source',
          originalAmount: { kind: 'scalar', value: { n: '1', d: '1' } },
        },
        amount: { kind: 'scalar', value: { n: '1', d: '1' } },
        unit: recipe.ingredientLines[0].unit,
      },
    },
  ];
  recipe.instructionSections[0].steps[1].text = 'Simmer 20 minutes at 180 °C.';
  const sections = structuredClone(recipe.instructionSections);
  sections[0].steps[1].text = 'Finally, use all the remaining oil.';
  const saved = save(recipe, { instructionSections: sections }).body.recipe;
  expect(cookingProjection(saved, 8)!.validatedUses).toBe(2);
  expect(saved.instructionSections[0].steps[0].bindings[0].id).toBe(priorId);
  expect(saved.instructionSections[0].steps[1].bindings[0].payload.predecessors).toEqual([priorId]);
});
