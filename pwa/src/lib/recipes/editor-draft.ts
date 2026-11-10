import type { Recipe } from '@/lib/api/recipes';
import type { UpdateRecipeDto_mealTypes } from '@/lib/api/generated/models';
import { ingredientDraft, type IngredientDraft } from './ingredient-draft';
import { originalInstructions, restoreDeletedInstructionIds } from './instruction-draft';

export interface EditorFields {
  name: string;
  description: string;
  servings: string;
  cuisineType: string;
  mealTypes: UpdateRecipeDto_mealTypes[];
  ingredients: string[];
  canonicalDrafts: IngredientDraft[];
  instructions?: unknown[];
}
export interface EditorBaseline {
  revision: string | null;
  canonical: boolean;
  fields: EditorFields;
}
export interface EditorDraft {
  version: 1;
  recipeId: string;
  baseline: EditorBaseline;
  fields: EditorFields;
  // Keep the original through reconciliation, until Cancel or acknowledged Save.
  original?: { baseline: EditorBaseline; fields: EditorFields };
}
export type EditorField =
  | 'name'
  | 'description'
  | 'servings'
  | 'cuisineType'
  | 'mealTypes'
  | 'ingredients'
  | 'instructions';
export const editorFields: EditorField[] = [
  'name',
  'description',
  'servings',
  'cuisineType',
  'mealTypes',
  'ingredients',
  'instructions',
];
export const editorDraftKey = (id: string) => `wfs.recipe-editor-draft.${id}`;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
export const editorBaselineMatches = (a: EditorBaseline, b: EditorBaseline) =>
  a.revision === b.revision && a.canonical === b.canonical && same(a.fields, b.fields);

export function editorBaseline(
  recipe: Recipe,
  mealTypes: UpdateRecipeDto_mealTypes[]
): EditorBaseline {
  return {
    revision: recipe.contentRevision ?? null,
    canonical: recipe.contentSchemaVersion === 2,
    fields: {
      name: recipe.name,
      description: recipe.description ?? '',
      servings: recipe.servings == null ? '' : String(recipe.servings),
      cuisineType: recipe.cuisineType ?? '',
      mealTypes,
      ingredients: recipe.ingredients ?? [],
      instructions: originalInstructions(recipe),
      canonicalDrafts: (recipe.ingredientLines ?? []).map(ingredientDraft),
    },
  };
}

function value(fields: EditorFields, field: EditorField, canonical: boolean) {
  return field === 'ingredients'
    ? canonical
      ? fields.canonicalDrafts
      : fields.ingredients
    : fields[field];
}
function set(target: EditorFields, source: EditorFields, field: EditorField) {
  if (field === 'ingredients') {
    target.ingredients = source.ingredients;
    target.canonicalDrafts = source.canonicalDrafts;
  } else Object.assign(target, { [field]: source[field] });
}
export function reconcileEditorDraft(
  draft: EditorDraft,
  current: EditorBaseline,
  choices: Partial<Record<EditorField, 'draft' | 'current'>> = {}
) {
  const fields = structuredClone(current.fields);
  const conflicts: EditorField[] = [];
  for (const field of editorFields) {
    const before = value(draft.baseline.fields, field, draft.baseline.canonical);
    const mine = value(draft.fields, field, draft.baseline.canonical);
    const theirs = value(current.fields, field, current.canonical);
    if (same(mine, before)) continue;
    const compatible =
      !['ingredients', 'instructions'].includes(field) ||
      draft.baseline.canonical === current.canonical;
    if (compatible && (same(theirs, before) || same(mine, theirs)))
      set(fields, draft.fields, field);
    else if (choices[field] === 'current') continue;
    else if (choices[field] === 'draft' && compatible) {
      set(fields, draft.fields, field);
    } else conflicts.push(field);
  }
  return { fields, conflicts };
}

export function restoreDeletedEditorRows(
  fields: EditorFields,
  current: EditorBaseline
): EditorFields {
  const savedIds = new Set(current.fields.canonicalDrafts.map((row) => row.source.id));
  // Only called by explicit Apply. A restored deleted row is a new create,
  // never a claim that an absent saved identity continued.
  return {
    ...fields,
    ...(current.canonical && fields.instructions
      ? {
          instructions: restoreDeletedInstructionIds(
            fields.instructions,
            current.fields.instructions ?? []
          ),
        }
      : {}),
    canonicalDrafts: fields.canonicalDrafts.map((row) => {
      if (!row.source.id || savedIds.has(row.source.id)) return row;
      const { id: _id, ...facts } = row.source;
      const clientId = crypto.randomUUID();
      return { ...row, key: clientId, source: { ...facts, clientId } };
    }),
  };
}

const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const strings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');
function validFields(value: unknown): value is EditorFields {
  return (
    object(value) &&
    ['name', 'description', 'servings', 'cuisineType'].every(
      (key) => typeof value[key] === 'string'
    ) &&
    strings(value.mealTypes) &&
    strings(value.ingredients) &&
    (value.instructions === undefined || Array.isArray(value.instructions)) &&
    Array.isArray(value.canonicalDrafts) &&
    value.canonicalDrafts.every(
      (row) =>
        object(row) &&
        ['key', 'description', 'amount', 'unit', 'shoppingName'].every(
          (key) => typeof row[key] === 'string'
        ) &&
        typeof row.fixed === 'boolean' &&
        object(row.source) &&
        (typeof row.source.id === 'string' || typeof row.source.clientId === 'string') &&
        (row.source.unit == null ||
          (object(row.source.unit) && typeof row.source.unit.text === 'string')) &&
        (row.source.shopping == null ||
          (object(row.source.shopping) && typeof row.source.shopping.name === 'string'))
    )
  );
}
function validBaseline(value: unknown): value is EditorBaseline {
  return (
    object(value) &&
    (value.revision === null || typeof value.revision === 'string') &&
    typeof value.canonical === 'boolean' &&
    validFields(value.fields)
  );
}
export function readEditorDraft(id: string): {
  status: 'empty' | 'ready' | 'unavailable' | 'incompatible';
  draft?: EditorDraft;
} {
  try {
    const bytes = sessionStorage.getItem(editorDraftKey(id));
    if (!bytes) return { status: 'empty' };
    const value: unknown = JSON.parse(bytes);
    if (
      !object(value) ||
      value.version !== 1 ||
      value.recipeId !== id ||
      !validBaseline(value.baseline) ||
      !validFields(value.fields) ||
      (value.original !== undefined &&
        (!object(value.original) ||
          !validBaseline(value.original.baseline) ||
          !validFields(value.original.fields)))
    )
      return { status: 'incompatible' };
    return { status: 'ready', draft: value as unknown as EditorDraft };
  } catch {
    return { status: 'unavailable' };
  }
}
export function persistEditorDraft(draft: EditorDraft): boolean {
  try {
    sessionStorage.setItem(editorDraftKey(draft.recipeId), JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}
export function discardEditorDraft(id: string) {
  try {
    sessionStorage.removeItem(editorDraftKey(id));
    return true;
  } catch {
    return false;
  }
}
