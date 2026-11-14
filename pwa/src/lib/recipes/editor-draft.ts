import type { Recipe } from '@/lib/api/recipes';
import type { UpdateRecipeDto_mealTypes } from '@/lib/api/generated/models';
import { normalizeGroceryQuantity } from '@/lib/api/grocery-quantities';
import {
  ingredientDraft,
  withIngredientPackageDraft,
  type IngredientDraft,
} from './ingredient-draft';
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
function comparisonDraft(row: IngredientDraft): IngredientDraft {
  const pack = row.source.packageEscaped;
  // Retained SDK representations and current reads can encode the same exact
  // operands differently. Compare decoded facts without rewriting stored drafts.
  return withIngredientPackageDraft({
    ...row,
    source: {
      ...row.source,
      amount: normalizeGroceryQuantity(row.source.amount) ?? row.source.amount,
      packageEscaped: pack?.capacity
        ? {
            ...pack,
            capacity: {
              ...pack.capacity,
              amount: normalizeGroceryQuantity(pack.capacity.amount) ?? pack.capacity.amount,
            },
          }
        : pack,
    },
  });
}
export const editorBaselineMatches = (a: EditorBaseline, b: EditorBaseline) =>
  a.revision === b.revision &&
  a.canonical === b.canonical &&
  same(
    { ...a.fields, canonicalDrafts: a.fields.canonicalDrafts.map(comparisonDraft) },
    { ...b.fields, canonicalDrafts: b.fields.canonicalDrafts.map(comparisonDraft) }
  );

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
      ? fields.canonicalDrafts.map(comparisonDraft)
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
  const literalUnit = (unit: IngredientDraft['source']['unit']) =>
    unit == null ? unit : { text: unit.text, definitionId: null };
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
      return {
        ...row,
        key: clientId,
        source: {
          ...facts,
          clientId,
          unit: literalUnit(facts.unit),
          packageEscaped:
            facts.packageEscaped == null
              ? facts.packageEscaped
              : {
                  ...facts.packageEscaped,
                  countUnit: literalUnit(facts.packageEscaped.countUnit),
                  capacity: {
                    ...facts.packageEscaped.capacity,
                    unit: literalUnit(facts.packageEscaped.capacity?.unit),
                  },
                },
        },
      };
    }),
  };
}

const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const strings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');
function validSourcePackage(value: unknown): boolean {
  if (value == null) return true;
  const unit = (item: unknown) =>
    object(item) &&
    typeof item.text === 'string' &&
    (item.definitionId == null || typeof item.definitionId === 'string');
  const rational = (item: unknown) =>
    object(item) && typeof item.n === 'string' && typeof item.d === 'string';
  if (
    !object(value) ||
    !unit(value.countUnit) ||
    !object(value.capacity) ||
    !unit(value.capacity.unit) ||
    !object(value.capacity.amount) ||
    !['net', 'drained', 'unspecified'].includes(value.basis as string)
  )
    return false;
  const amount: unknown = normalizeGroceryQuantity(value.capacity.amount);
  return (
    object(amount) &&
    (amount.kind === 'scalar'
      ? rational(amount.value)
      : amount.kind === 'range' && rational(amount.min) && rational(amount.max))
  );
}
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
        (row.packageEnabled === undefined || typeof row.packageEnabled === 'boolean') &&
        ['packageCountUnit', 'packageCapacityAmount', 'packageCapacityUnit'].every(
          (key) => row[key] === undefined || typeof row[key] === 'string'
        ) &&
        (row.packageBasis === undefined ||
          ['net', 'drained', 'unspecified'].includes(row.packageBasis as string)) &&
        object(row.source) &&
        validSourcePackage(row.source.packageEscaped) &&
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
