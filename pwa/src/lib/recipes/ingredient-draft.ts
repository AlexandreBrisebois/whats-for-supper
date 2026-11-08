import type {
  RecipeIngredientLine,
  RecipeIngredientLineInput,
  GroceryScalar,
  GroceryRange,
} from '@/lib/api/generated/models';
import { parseIngredientAmount } from './ingredient-amount';

export type IngredientDraft = {
  key: string;
  source: RecipeIngredientLineInput;
  description: string;
  amount: string;
  unit: string;
  shoppingName: string;
  fixed: boolean;
};
const numberText = (q: { n?: string | null; d?: string | null }) =>
  q.d === '1' ? (q.n ?? '') : `${q.n}/${q.d}`;
function amountText(row: RecipeIngredientLine) {
  if (row.amountText != null) return row.amountText;
  const q = row.amount as (GroceryScalar & GroceryRange) | null;
  return q?.value
    ? numberText(q.value)
    : q?.min && q.max
      ? `${numberText(q.min)}–${numberText(q.max)}`
      : '';
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
  return {
    key: String(source.id ?? source.clientId),
    source,
    description: row?.description ?? '',
    amount: row ? amountText(row) : '',
    unit: row?.unit?.text ?? '',
    shoppingName: row?.shopping?.name ?? '',
    fixed: row?.scaling === 'fixed',
  };
}
export function prepareIngredientDrafts(drafts: IngredientDraft[]): {
  lines: RecipeIngredientLineInput[];
  invalid: boolean;
} {
  let invalid = false;
  const lines = drafts
    .filter((row) => row.description.trim() || row.amount.trim() || row.unit.trim())
    .map((row) => {
      const notation = row.amount.trim();
      const amount = notation ? parseIngredientAmount(notation) : null;
      if (!row.description.trim() || (notation && !amount)) invalid = true;
      const unitText = row.unit.trim();
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
        shopping: {
          name: row.shoppingName.trim() || row.description.trim(),
          foodId: row.source.shopping?.foodId ?? null,
          mappingRevision: row.source.shopping?.mappingRevision ?? null,
        },
      };
    });
  return { lines, invalid };
}
