import type { GroceryLineItemDto } from '@/lib/api/generated/models';

const legacyEpoch = '00000000-0000-0000-0000-000000000000';

export function groceryPresentation(version: unknown, epoch: unknown) {
  if (version === undefined && epoch === undefined) return { version: 0n, epoch: legacyEpoch };
  if (
    typeof version !== 'string' ||
    !/^(0|[1-9][0-9]*)$/.test(version) ||
    typeof epoch !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(epoch)
  )
    return null;
  return { version: BigInt(version), epoch: epoch.toLowerCase() };
}

/** Keep only presentation from a matching saved row when demand advances first. */
export function retainGroceryPresentation(
  incoming: GroceryLineItemDto[],
  current: GroceryLineItemDto[]
) {
  const byId = new Map(current.map((row) => [row.rowId, row]));
  return incoming.map((row) => {
    const prior = byId.get(row.rowId);
    if (!prior || prior.demandIdentity !== row.demandIdentity || prior.foodId !== row.foodId)
      return {
        ...row,
        displayLabels: { en: row.displayName ?? '', fr: row.displayName ?? '' },
        labelStatus: 'fallback' as const,
        displayNameVariants: { en: [], fr: [] },
        categoryStatus: 'conflict' as const,
        categoryRevision: null,
        categoryChoices: [],
      };
    return {
      ...row,
      section: prior.section,
      displayLabels: prior.displayLabels,
      labelStatus: prior.labelStatus,
      displayNameVariants: prior.displayNameVariants,
      categoryScope: prior.categoryScope,
      categoryStatus: prior.categoryStatus,
      categoryRevision: prior.categoryRevision,
      categoryChoices: prior.categoryChoices,
    };
  });
}
