import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  editorBaseline,
  editorBaselineMatches,
  editorDraftKey,
  readEditorDraft,
  persistEditorDraft,
  reconcileEditorDraft,
  restoreDeletedEditorRows,
  type EditorDraft,
} from './editor-draft';
import type { Recipe } from '@/lib/api/recipes';
import type { RecipeDto } from '@/lib/api/generated/models';
import { ingredientDraft, ingredientPackageDraft } from './ingredient-draft';
import { prepareIngredientDrafts } from './ingredient-draft';
const recipe = {
  id: 'recipe',
  name: 'Pasta',
  description: '',
  servings: 4,
  contentSchemaVersion: 2,
  contentRevision: 'r1',
  ingredients: [],
  ingredientLines: [],
} as unknown as Recipe;
const base = editorBaseline(recipe, ['Supper']);
const draft = (): EditorDraft => ({
  version: 1,
  recipeId: recipe.id,
  baseline: structuredClone(base),
  fields: {
    ...structuredClone(base.fields),
    name: 'My pasta',
    servings: 'invalid',
    description: '',
    canonicalDrafts: [ingredientDraft()],
  },
});
beforeEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
});
describe('per-tab original editor recovery', () => {
  it.each([
    'not a package',
    {
      countUnit: { text: 400 },
      capacity: { amount: { kind: 'scalar', value: { n: '400', d: '1' } }, unit: { text: 'g' } },
      basis: 'net',
    },
    {
      countUnit: { text: 'cans' },
      capacity: { amount: { kind: 'scalar', value: { n: 400, d: '1' } }, unit: { text: 'g' } },
      basis: 'net',
    },
    {
      countUnit: { text: 'cans' },
      capacity: { amount: { kind: 'scalar', value: { n: '400', d: '1' } }, unit: { text: 400 } },
      basis: 'net',
    },
  ])(
    'retains malformed baseline package bytes without installing an unusable draft: %j',
    (packageEscaped) => {
      const value = draft();
      Object.assign(value.fields.canonicalDrafts[0].source, { packageEscaped });
      const bytes = JSON.stringify(value);
      sessionStorage.setItem(editorDraftKey(recipe.id), bytes);
      expect(readEditorDraft(recipe.id).status).toBe('incompatible');
      expect(sessionStorage.getItem(editorDraftKey(recipe.id))).toBe(bytes);
    }
  );
  it('does not invent an ingredient conflict when an older retained draft lacks package controls', () => {
    const original = {
      ...recipe,
      ingredientLines: [
        {
          id: '52cbce29-d94d-47ed-9dc7-4f581ad1c451',
          description: 'tomatoes',
          amount: { kind: 'scalar', value: { n: '2', d: '1' } },
          amountText: '2',
          unit: { text: 'cans', definitionId: null },
          scaling: 'proportional',
          packageEscaped: null,
          shopping: { name: 'tomatoes', foodId: null, mappingRevision: null },
        },
      ],
    } as Recipe;
    const before = editorBaseline(original, ['Supper']);
    const old = structuredClone(before);
    for (const row of old.fields.canonicalDrafts) {
      delete row.packageEnabled;
      delete row.packageCountUnit;
      delete row.packageCapacityAmount;
      delete row.packageCapacityUnit;
      delete row.packageBasis;
    }
    expect(editorBaselineMatches(old, before)).toBe(true);
    const value: EditorDraft = {
      version: 1,
      recipeId: recipe.id,
      baseline: old,
      fields: structuredClone(old.fields),
    };
    value.fields.canonicalDrafts[0].amount = '3';
    const current = editorBaseline({ ...original, contentRevision: 'r2', name: 'Their name' }, [
      'Supper',
    ]);
    const reconciled = reconcileEditorDraft(value, current);
    expect(reconciled.conflicts).toEqual([]);
    expect(reconciled.fields.canonicalDrafts[0].amount).toBe('3');
    expect(reconciled.fields.name).toBe('Their name');
  });
  it.each([
    { packageEnabled: 'true' },
    { packageCapacityAmount: 400 },
    { packageCountUnit: null },
    { packageBasis: 'cooked' },
  ])('preserves malformed package draft bytes without installing them: %j', (patch) => {
    const value = draft();
    Object.assign(value.fields.canonicalDrafts[0], patch);
    const bytes = JSON.stringify(value);
    sessionStorage.setItem(editorDraftKey(recipe.id), bytes);
    expect(readEditorDraft(recipe.id).status).toBe('incompatible');
    expect(sessionStorage.getItem(editorDraftKey(recipe.id))).toBe(bytes);
  });
  it('roundtrips the exact draft and its baseline including invalid and empty input', () => {
    const value = draft();
    expect(persistEditorDraft(value)).toBe(true);
    expect(readEditorDraft(recipe.id)).toEqual({ status: 'ready', draft: value });
    expect(readEditorDraft('another-recipe')).toEqual({ status: 'empty' });
  });
  it.each([
    '{bad json',
    JSON.stringify({ version: 2, recipeId: recipe.id }),
    JSON.stringify({
      ...draft(),
      fields: { ...draft().fields, canonicalDrafts: [{ source: null }] },
    }),
  ])('retains unsupported/corrupt bytes without exposing a broken draft: %s', (bytes) => {
    sessionStorage.setItem(editorDraftKey(recipe.id), bytes);
    expect(readEditorDraft(recipe.id).draft).toBeUndefined();
    expect(sessionStorage.getItem(editorDraftKey(recipe.id))).toBe(bytes);
  });
  it('retains instruction edits and explicitly reconciles concurrent original step changes', () => {
    const initial = editorBaseline(
      {
        ...recipe,
        instructionSections: [{ id: 'section', steps: [{ id: 'step', text: 'Stir.' }] }],
      } as Recipe,
      ['Supper']
    );
    const edited: EditorDraft = {
      version: 1,
      recipeId: recipe.id,
      baseline: initial,
      fields: {
        ...structuredClone(initial.fields),
        instructions: [{ id: 'section', name: null, steps: [{ id: 'step', text: 'Taste.' }] }],
      },
    };
    const current = editorBaseline(
      {
        ...recipe,
        contentRevision: 'r2',
        instructionSections: [{ id: 'section', steps: [{ id: 'step', text: 'Simmer.' }] }],
      } as Recipe,
      ['Supper']
    );
    expect(persistEditorDraft(edited)).toBe(true);
    expect(readEditorDraft(recipe.id).draft).toEqual(edited);
    expect(reconcileEditorDraft(edited, current).conflicts).toEqual(['instructions']);
    expect(
      reconcileEditorDraft(edited, current, { instructions: 'draft' }).fields.instructions
    ).toEqual(edited.fields.instructions);
    const restored = restoreDeletedEditorRows(
      edited.fields,
      editorBaseline({ ...recipe, instructionSections: [] } as Recipe, ['Supper'])
    );
    expect(restored.instructions).toEqual([
      {
        clientId: expect.any(String),
        name: null,
        steps: [{ clientId: expect.any(String), text: 'Taste.' }],
      },
    ]);
  });
  it('reports quota/storage failures without deleting the retained draft', () => {
    const value = draft();
    persistEditorDraft(value);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });
    expect(persistEditorDraft({ ...value, fields: { ...value.fields, name: 'Newer' } })).toBe(
      false
    );
    expect(readEditorDraft(recipe.id).draft).toEqual(value);
  });
  it('merges independent fields, preserves conflicts and detects metadata changes with the same content token', () => {
    const value = draft();
    value.fields.servings = base.fields.servings;
    value.fields.canonicalDrafts = [];
    const current = editorBaseline(
      { ...recipe, name: 'Their pasta', description: 'Their description' },
      ['Lunch']
    );
    expect(editorBaselineMatches(base, current)).toBe(false);
    const review = reconcileEditorDraft(value, current);
    expect(review.conflicts).toEqual(['name']);
    expect(review.fields.description).toBe('Their description');
    expect(review.fields.mealTypes).toEqual(['Lunch']);
    expect(reconcileEditorDraft(value, current, { name: 'draft' }).fields.name).toBe('My pasta');
    expect(reconcileEditorDraft(value, current, { name: 'current' }).fields.name).toBe(
      'Their pasta'
    );
    expect(value.baseline).toEqual(base);
  });
  it('never transfers identity by position or text when a person restores a deleted saved row', () => {
    const row = ingredientDraft({
      id: 'saved-row',
      description: 'Pasta',
      amount: null,
      unit: null,
    });
    const values = { ...base.fields, canonicalDrafts: [row] };
    const restored = restoreDeletedEditorRows(values, base);
    expect(restored.canonicalDrafts[0].source.id).toBeUndefined();
    expect(restored.canonicalDrafts[0].source.clientId).toBeTruthy();
    expect(restored.canonicalDrafts[0].description).toBe('Pasta');
    expect(row.source.id).toBe('saved-row');
  });
  it('restores deleted package literals as a new declaration without carrying definition authority', () => {
    const row = ingredientDraft({
      id: 'deleted-package',
      description: 'tomatoes',
      amount: { kind: 'scalar', value: { n: '2', d: '1' } },
      amountText: '2',
      unit: { text: 'cans', definitionId: 'retained-count' },
      scaling: 'proportional',
      shopping: { name: 'tomatoes', foodId: null, mappingRevision: null },
      packageEscaped: {
        countUnit: { text: 'containers', definitionId: 'retained-package-count' },
        capacity: {
          amount: { kind: 'scalar', value: { n: '400', d: '1' } },
          unit: { text: 'g', definitionId: 'retained-gram' },
        },
        basis: 'net',
      },
    });
    const original = structuredClone(row);
    const restored = restoreDeletedEditorRows({ ...base.fields, canonicalDrafts: [row] }, base);
    const result = prepareIngredientDrafts(restored.canonicalDrafts);
    expect(result.invalid).toBe(false);
    expect(result.lines[0].id).toBeUndefined();
    expect(result.lines[0].clientId).toBeTruthy();
    expect(result.lines[0].unit).toEqual({ text: 'cans', definitionId: null });
    expect(result.lines[0].packageEscaped).toEqual({
      countUnit: { text: 'containers', definitionId: null },
      capacity: {
        amount: { kind: 'scalar', value: { n: '400', d: '1' } },
        unit: { text: 'g', definitionId: null },
      },
      basis: 'net',
    });
    expect(row).toEqual(original);
    const existing = { ...base, fields: { ...base.fields, canonicalDrafts: [row] } };
    expect(restoreDeletedEditorRows(existing.fields, existing).canonicalDrafts[0]).toEqual(
      original
    );
  });
  it('keeps legacy edited strings as a conflict across upgrade instead of matching canonical IDs', () => {
    const legacy = editorBaseline(
      { ...recipe, contentSchemaVersion: null, ingredients: ['200 g pasta'] },
      ['Supper']
    );
    const value: EditorDraft = {
      version: 1,
      recipeId: recipe.id,
      baseline: legacy,
      fields: { ...legacy.fields, ingredients: ['250 g pasta'] },
    };
    expect(reconcileEditorDraft(value, base, { ingredients: 'draft' }).conflicts).toEqual([
      'ingredients',
    ]);
    expect(reconcileEditorDraft(value, base, { ingredients: 'current' }).conflicts).toEqual([]);
    expect(value.fields.ingredients).toEqual(['250 g pasta']);
  });
});

const retainedDraftRecipeGet = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/api-client', () => ({
  apiClient: { api: { recipes: { byId: () => ({ get: retainedDraftRecipeGet }) } } },
  requestAdapter: { baseUrl: 'http://localhost:5052' },
}));

describe('retained version1 generated quantity representations', () => {
  beforeEach(() => retainedDraftRecipeGet.mockReset());
  const id = '550e8400-e29b-41d4-a716-446655440212';
  const exact = (n: string) => ({ kind: 'scalar', value: { n, d: '1' } });
  const wire = (packaged = false, amount = '2', revision = 'retained-r1') => ({
    id,
    name: 'Pasta',
    description: '',
    servings: 4,
    contentSchemaVersion: 2,
    contentRevision: revision,
    ingredients: [],
    instructionSections: [],
    ingredientLines: [
      {
        id: '550e8400-e29b-41d4-a716-446655440213',
        description: 'tomatoes',
        amount: exact(amount),
        amountText: amount,
        unit: { text: 'cans', definitionId: null },
        scaling: 'proportional',
        package: packaged
          ? {
              countUnit: { text: 'cans', definitionId: null },
              capacity: { amount: exact('400'), unit: { text: 'g', definitionId: null } },
              basis: 'net',
            }
          : null,
        shopping: { name: 'tomatoes', foodId: null, mappingRevision: null },
      },
    ],
  });
  const decode = async (input: ReturnType<typeof wire>) => {
    const { JsonParseNode } = await import('@microsoft/kiota-serialization-json');
    const { createRecipeDtoFromDiscriminatorValue } = await import('../api/generated/models');
    return new JsonParseNode(input).getObjectValue<RecipeDto>(
      createRecipeDtoFromDiscriminatorValue
    )!;
  };
  const priorAdapter = async (input: ReturnType<typeof wire>) => {
    const decoded = await decode(input);
    // Model the old adapter exactly at its nullable-fact boundary, without applying the new operand decoder.
    const nullable = <T extends object>(value: T | null | undefined) =>
      value && Object.keys(value).length > 0 ? value : null;
    return {
      ...recipe,
      ...decoded,
      ingredientLines: decoded.ingredientLines!.map((row) => ({
        ...row,
        amount: nullable(row.amount),
        unit: nullable(row.unit),
        packageEscaped: nullable(row.packageEscaped),
      })),
    } as Recipe;
  };
  const currentAdapter = async (input: ReturnType<typeof wire>) => {
    const { getRecipe } = await import('../api/recipes');
    retainedDraftRecipeGet.mockResolvedValueOnce({ recipe: await decode(input) });
    return getRecipe(id);
  };
  const retained = async (packaged = false) => {
    const older = await priorAdapter(wire(packaged));
    const baseline = editorBaseline(older, ['Supper']);
    for (const row of baseline.fields.canonicalDrafts) {
      delete row.packageEnabled;
      delete row.packageCountUnit;
      delete row.packageCapacityAmount;
      delete row.packageCapacityUnit;
      delete row.packageBasis;
    }
    const value: EditorDraft = {
      version: 1,
      recipeId: id,
      baseline,
      fields: structuredClone(baseline.fields),
    };
    value.fields.canonicalDrafts[0].description = 'My retained tomatoes';
    expect(value.baseline.fields.canonicalDrafts[0].source.amount).toEqual({
      kind: 'scalar',
      additionalData: { value: { n: '2', d: '1' } },
    });
    expect(value.baseline.fields.canonicalDrafts[0].source.packageEscaped == null).toBe(!packaged);
    expect(persistEditorDraft(value)).toBe(true);
    return { value, bytes: sessionStorage.getItem(editorDraftKey(id))! };
  };

  it('matches a same-revision baseline after decoding retained scalar operands without rewriting bytes', async () => {
    const { bytes } = await retained();
    const restored = readEditorDraft(id);
    expect(restored.status).toBe('ready');
    expect(restored.draft!.fields.canonicalDrafts[0].description).toBe('My retained tomatoes');
    const current = editorBaseline(await currentAdapter(wire()), ['Supper']);
    expect(sessionStorage.getItem(editorDraftKey(id))).toBe(bytes);
    expect(editorBaselineMatches(restored.draft!.baseline, current)).toBe(true);
    expect(JSON.stringify(restored.draft)).toBe(bytes);
    expect(sessionStorage.getItem(editorDraftKey(id))).toBe(bytes);
  });

  it('reconciles an edited description against equivalent current scalar facts without an ingredient conflict', async () => {
    const { bytes } = await retained();
    const restored = readEditorDraft(id);
    expect(restored.status).toBe('ready');
    const current = editorBaseline(await currentAdapter(wire()), ['Supper']);
    const reviewed = reconcileEditorDraft(restored.draft!, current);
    expect(sessionStorage.getItem(editorDraftKey(id))).toBe(bytes);
    expect(reviewed.conflicts).toEqual([]);
    expect(reviewed.fields.canonicalDrafts[0].description).toBe('My retained tomatoes');
    expect(reviewed.fields.canonicalDrafts[0].amount).toBe('2');
    expect(JSON.stringify(restored.draft)).toBe(bytes);
  });

  it('still conflicts when the server quantity actually changed and preserves the retained visible edit', async () => {
    const { bytes } = await retained();
    const restored = readEditorDraft(id);
    expect(restored.status).toBe('ready');
    const current = editorBaseline(await currentAdapter(wire(false, '3', 'retained-r2')), [
      'Supper',
    ]);
    expect(editorBaselineMatches(restored.draft!.baseline, current)).toBe(false);
    expect(reconcileEditorDraft(restored.draft!, current).conflicts).toEqual(['ingredients']);
    expect(restored.draft!.fields.canonicalDrafts[0].description).toBe('My retained tomatoes');
    expect(restored.draft!.fields.canonicalDrafts[0].amount).toBe('2');
    expect(JSON.stringify(restored.draft)).toBe(bytes);
    expect(sessionStorage.getItem(editorDraftKey(id))).toBe(bytes);
  });

  it('accepts an older decoded scalar package source as retained facts and compares it without a representation conflict', async () => {
    const { value, bytes } = await retained(true);
    expect(value.fields.canonicalDrafts[0].source.packageEscaped!.capacity!.amount).toEqual({
      kind: 'scalar',
      additionalData: { value: { n: '400', d: '1' } },
    });
    const restored = readEditorDraft(id);
    expect(sessionStorage.getItem(editorDraftKey(id))).toBe(bytes);
    expect(restored.status).toBe('ready');
    const current = editorBaseline(await currentAdapter(wire(true)), ['Supper']);
    expect(editorBaselineMatches(restored.draft!.baseline, current)).toBe(true);
    expect(reconcileEditorDraft(restored.draft!, current).conflicts).toEqual([]);
    const row = restored.draft!.fields.canonicalDrafts[0];
    expect(ingredientPackageDraft(row).capacityAmount).toBe('400');
    const prepared = prepareIngredientDrafts([row]);
    expect(prepared.invalid).toBe(false);
    expect(prepared.lines[0].packageEscaped).toEqual(wire(true).ingredientLines[0].package);
    expect(restored.draft!.fields.canonicalDrafts[0].description).toBe('My retained tomatoes');
    expect(JSON.stringify(restored.draft)).toBe(bytes);
    expect(sessionStorage.getItem(editorDraftKey(id))).toBe(bytes);
  });

  it('derives absent package controls from exact older decoded operands without mutating retained bytes', async () => {
    const { bytes } = await retained(true);
    // Isolate the derived-control seam from the source-guard readiness regression above.
    const stored = JSON.parse(sessionStorage.getItem(editorDraftKey(id))!) as EditorDraft;
    const row = stored.fields.canonicalDrafts[0];
    expect(row).not.toHaveProperty('packageCapacityAmount');
    expect(ingredientPackageDraft(row).capacityAmount).toBe('400');
    const prepared = prepareIngredientDrafts([row]);
    expect(prepared.invalid).toBe(false);
    expect(prepared.lines[0].packageEscaped).toEqual(wire(true).ingredientLines[0].package);
    expect(row.description).toBe('My retained tomatoes');
    expect(JSON.stringify(stored)).toBe(bytes);
    expect(sessionStorage.getItem(editorDraftKey(id))).toBe(bytes);
  });

  it('keeps an explicitly retained blank capacity blank and invalid instead of restoring the source amount', async () => {
    const { value } = await retained(true);
    value.fields.canonicalDrafts[0].packageCapacityAmount = '';
    expect(persistEditorDraft(value)).toBe(true);
    const bytes = sessionStorage.getItem(editorDraftKey(id))!;
    const stored = JSON.parse(bytes) as EditorDraft;
    const row = stored.fields.canonicalDrafts[0];
    expect(ingredientPackageDraft(row).capacityAmount).toBe('');
    expect(prepareIngredientDrafts([row]).invalid).toBe(true);
    expect(row.description).toBe('My retained tomatoes');
    expect(JSON.stringify(stored)).toBe(bytes);
    expect(sessionStorage.getItem(editorDraftKey(id))).toBe(bytes);
  });

  it('does not equate an unresolved non-null retained source quantity with a current null quantity', () => {
    const old = structuredClone(base);
    const oldRow = ingredientDraft({
      id: 'retained-unknown',
      description: 'tomatoes',
      amount: null,
      unit: null,
    });
    Object.assign(oldRow.source, {
      amount: { kind: 'unresolved-retained-shape', evidence: 'keep' },
    });
    old.fields.canonicalDrafts = [oldRow];
    const current = structuredClone(old);
    current.fields.canonicalDrafts[0].source.amount = null;
    const bytes = JSON.stringify(old);
    expect(editorBaselineMatches(old, current)).toBe(false);
    expect(JSON.stringify(old)).toBe(bytes);
  });
});
