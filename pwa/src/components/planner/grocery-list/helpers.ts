import type {
  GroceryExtraDto,
  GroceryLineItemDto,
  GroceryRange,
  GroceryRational,
  GroceryScalar,
} from '@/lib/api/generated/models';
import type { GrocerySection } from '@/lib/grocery/aisleMapper';
import { AISLE_ORDER } from '@/lib/grocery/aisleOrder';

export interface GroceryListProps {
  weekOffset: number;
  items: GroceryLineItemDto[];
  extras?: GroceryExtraDto[];
  onClose?: () => void;
  isEmbedded?: boolean;
}

export type PreserveCheckFocusFn = (control: HTMLButtonElement, keyboard: boolean) => void;

export interface CheckControlInfo {
  element: HTMLButtonElement;
  keyboard: boolean;
}

export type ExtraMutationChange =
  { name: string } | { checked: boolean } | { grocerySection: GrocerySection };

export const AISLE_ICONS: Record<GrocerySection, string> = {
  Produce: '🥬',
  Deli: '🥪',
  Bakery: '🍞',
  Meat: '🍖',
  Seafood: '🐟',
  'Dairy & Eggs': '🥛',
  Frozen: '🧊',
  Pantry: '🥫',
  Beverages: '🧃',
  Grocery: '🛒',
};

export const CATEGORY_BUTTON_CLASS =
  'min-h-12 min-w-12 shrink-0 rounded-full text-icon-affordance hover:text-ink-body hover:bg-charcoal/5 focus-visible:outline-2 focus-visible:outline-garden-ink';

export function categoryCorrectionKey(item: GroceryLineItemDto): string {
  return item.categoryScope === 'food'
    ? `food:${item.foodId ?? item.rowId ?? ''}`
    : (item.normalizedKey ?? '');
}

type QuantityWireShape = Partial<GroceryScalar & GroceryRange>;

export function formatQuantityHint(
  quantity: GroceryLineItemDto['quantity'],
  unitText: string | null | undefined
): string | null {
  if (quantity == null) return null;

  const amount = quantity as QuantityWireShape;
  const scalar = (value?: GroceryRational | null) => {
    if (!value?.n || !value.d) return null;
    const number = Number(value.n) / Number(value.d);
    if (!Number.isFinite(number)) return null;
    return Number.isInteger(number) ? String(number) : number.toFixed(3).replace(/\.?0+$/, '');
  };
  const minimum = scalar(amount.kind === 'scalar' ? amount.value : amount.min);
  const maximum = amount.kind === 'range' ? scalar(amount.max) : null;
  if (minimum === null || (amount.kind === 'range' && maximum === null)) return null;
  return `(${minimum}${maximum !== null ? `–${maximum}` : ''}${unitText?.trim() ? ` ${unitText}` : ''})`;
}

export function matchesOccurrenceIdentity(
  candidate: GroceryExtraDto,
  expected: GroceryExtraDto
): boolean {
  return (
    candidate.id === expected.id &&
    String(candidate.occurrenceWeekStartDate ?? '') ===
      String(expected.occurrenceWeekStartDate ?? '')
  );
}

export function grocerySourceKey(aisle: string, item: GroceryLineItemDto, index: number): string {
  return (
    item.rowId ??
    `${aisle}\u0000${item.normalizedKey ?? ''}\u0000${item.unitText ?? ''}\u0000${index}`
  );
}

export function groupItemsBySection(
  items: GroceryLineItemDto[]
): Partial<Record<GrocerySection, GroceryLineItemDto[]>> {
  const result: Partial<Record<GrocerySection, GroceryLineItemDto[]>> = {};
  for (const item of items) {
    const section = (item.section ?? 'Grocery') as GrocerySection;
    const bucket = AISLE_ORDER.includes(section) ? section : 'Grocery';
    if (!result[bucket]) result[bucket] = [];
    result[bucket]!.push(item);
  }
  return result;
}

export function groupExtrasBySection(
  extras: GroceryExtraDto[]
): Partial<Record<GrocerySection, GroceryExtraDto[]>> {
  const result: Partial<Record<GrocerySection, GroceryExtraDto[]>> = {};
  for (const extra of extras) {
    const candidate = (extra.grocerySection ?? 'Grocery') as GrocerySection;
    const section = AISLE_ORDER.includes(candidate) ? candidate : 'Grocery';
    (result[section] ??= []).push(extra);
  }
  return result;
}
