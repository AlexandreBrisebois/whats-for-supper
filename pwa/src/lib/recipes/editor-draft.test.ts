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
import { ingredientDraft } from './ingredient-draft';
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
