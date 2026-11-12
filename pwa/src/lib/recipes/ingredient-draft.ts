import type {
  RecipeIngredientLine,
  RecipeIngredientLineInput,
  GroceryScalar,
  GroceryRange,
} from '@/lib/api/generated/models';
import { parseIngredientAmount } from './ingredient-amount';
import { normalizeGroceryQuantity } from '@/lib/api/grocery-quantities';

export type IngredientDraft = {
  key: string;
  source: RecipeIngredientLineInput;
  description: string;
  amount: string;
  unit: string;
  shoppingName: string;
  fixed: boolean;
  // Optional so drafts retained by the previous editor still reopen losslessly.
  packageEnabled?: boolean;
  packageCountUnit?: string;
  packageCapacityAmount?: string;
  packageCapacityUnit?: string;
  packageBasis?: 'net' | 'drained' | 'unspecified';
};
const numberText = (q: { n?: string | null; d?: string | null }) =>
  q.d === '1' ? (q.n ?? '') : `${q.n}/${q.d}`;
function quantityText(amount: RecipeIngredientLine['amount']) {
  const q = amount as (GroceryScalar & GroceryRange) | null;
  return q?.value
    ? numberText(q.value)
    : q?.min && q.max
      ? `${numberText(q.min)}–${numberText(q.max)}`
      : '';
}
function amountText(row: RecipeIngredientLine) {
  return row.amountText ?? quantityText(row.amount);
}
export function ingredientPackageDraft(row: IngredientDraft) {
  const saved = row.source.packageEscaped;
  return {
    enabled: row.packageEnabled ?? saved != null,
    countUnit: row.packageCountUnit ?? saved?.countUnit?.text ?? '',
    capacityAmount:
      row.packageCapacityAmount ?? quantityText(normalizeGroceryQuantity(saved?.capacity?.amount)),
    capacityUnit: row.packageCapacityUnit ?? saved?.capacity?.unit?.text ?? '',
    basis: row.packageBasis ?? saved?.basis ?? 'unspecified',
  };
}
export function withIngredientPackageDraft(row: IngredientDraft): IngredientDraft {
  const pack = ingredientPackageDraft(row);
  return {
    ...row,
    packageEnabled: pack.enabled,
    packageCountUnit: pack.countUnit,
    packageCapacityAmount: pack.capacityAmount,
    packageCapacityUnit: pack.capacityUnit,
    packageBasis: pack.basis,
  };
}
export function ingredientDraft(row?: RecipeIngredientLine): IngredientDraft {
  const source: RecipeIngredientLineInput = row
    ? {
        id: row.id,
        description: row.description,
        amount: row.amount ?? null,
        amountText: row.amountText ?? null,
        unit: row.unit ?? null,
        scaling: row.scaling,
        packageEscaped: row.packageEscaped ?? null,
        shopping: row.shopping,
      }
    : { clientId: crypto.randomUUID(), packageEscaped: null };
  const draft: IngredientDraft = {
    key: String(source.id ?? source.clientId),
    source,
    description: row?.description ?? '',
    amount: row ? amountText(row) : '',
    unit: row?.unit?.text ?? '',
    shoppingName: row?.shopping?.name ?? '',
    fixed: row?.scaling === 'fixed',
  };
  return withIngredientPackageDraft(draft);
}
export function prepareIngredientDrafts(drafts: IngredientDraft[]): {
  lines: RecipeIngredientLineInput[];
  invalid: boolean;
} {
  let invalid = false;
  const lines = drafts
    .filter(
      (row) =>
        row.description.trim() ||
        row.amount.trim() ||
        row.unit.trim() ||
        ingredientPackageDraft(row).enabled
    )
    .map((row) => {
      const notation = row.amount.trim();
      const amount = notation ? parseIngredientAmount(notation) : null;
      if (!row.description.trim() || (notation && !amount)) invalid = true;
      const unitText = row.unit.trim();
      const pack = ingredientPackageDraft(row);
      const capacity = parseIngredientAmount(pack.capacityAmount.trim());
      if (
        pack.enabled &&
        (!capacity ||
          !pack.countUnit.trim() ||
          !pack.capacityUnit.trim() ||
          !['net', 'drained', 'unspecified'].includes(pack.basis))
      )
        invalid = true;
      const declaredUnit = (text: string, old: typeof row.source.unit) => ({
        text: text.trim(),
        definitionId: text.trim() === old?.text ? (old.definitionId ?? null) : null,
      });
      return {
        ...row.source,
        description: row.description.trim(),
        amount,
        amountText: notation || null,
        unit: unitText
          ? {
              text: unitText,
              definitionId:
                unitText === row.source.unit?.text ? (row.source.unit.definitionId ?? null) : null,
            }
          : null,
        scaling: row.fixed ? ('fixed' as const) : ('proportional' as const),
        packageEscaped: pack.enabled
          ? {
              countUnit: declaredUnit(pack.countUnit, row.source.packageEscaped?.countUnit),
              capacity: {
                amount: capacity,
                unit: declaredUnit(pack.capacityUnit, row.source.packageEscaped?.capacity?.unit),
              },
              basis: pack.basis,
            }
          : null,
        shopping: {
          name: row.shoppingName.trim() || row.description.trim(),
          foodId: row.source.shopping?.foodId ?? null,
          mappingRevision: row.source.shopping?.mappingRevision ?? null,
        },
      };
    });
  return { lines, invalid };
}
