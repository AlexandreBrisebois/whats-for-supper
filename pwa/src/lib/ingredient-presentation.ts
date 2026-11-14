import type { IngredientProjectionLine } from '@/lib/api/generated/models';

export function ingredientProjectionText(line: IngredientProjectionLine): string {
  if (line.displayText != null) return line.displayText;
  return line.status === 'scaled' && line.quantity != null
    ? `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 6 }).format(line.quantity)} ${line.unitText ? `${line.unitText} ` : ''}${line.name ?? ''}`
    : (line.originalText ?? '');
}
