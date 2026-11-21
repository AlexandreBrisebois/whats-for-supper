import { JsonParseNode } from '@microsoft/kiota-serialization-json';
import {
  createGroceryRangeFromDiscriminatorValue,
  createGroceryScalarFromDiscriminatorValue,
  type GroceryLineItemDto,
  type GroceryRange,
  type GroceryScalar,
} from './generated/models';

function readRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

export function normalizeGroceryQuantity(value: unknown): GroceryScalar | GroceryRange | null {
  const source = readRecord(value);
  if (!source) return null;
  // Kiota may select the nullable union's marker first and retain the real
  // kind/operands as additionalData. Decode that exact wire data, never a
  // displayed decimal or an inferred quantity.
  const { additionalData, ...fields } = source;
  const wire = { ...(readRecord(additionalData) ?? {}), ...fields };
  const node = new JsonParseNode(wire);
  if (wire.kind === 'scalar')
    return node.getObjectValue<GroceryScalar>(createGroceryScalarFromDiscriminatorValue) ?? null;
  if (wire.kind === 'range')
    return node.getObjectValue<GroceryRange>(createGroceryRangeFromDiscriminatorValue) ?? null;
  return null;
}

/** Keep reads and mutation acknowledgements on the same exact wire boundary. */
export function normalizeGroceryItems(items: GroceryLineItemDto[] | null | undefined) {
  return items?.map((item) => ({
    ...item,
    // Kiota assigns explicit wire null to an own undefined property. Missing
    // authority must remain missing so callers can reject an incomplete read.
    ...(Object.hasOwn(item, 'categoryRevision') && item.categoryRevision === undefined
      ? { categoryRevision: null }
      : {}),
    quantity: normalizeGroceryQuantity(item.quantity),
  }));
}
