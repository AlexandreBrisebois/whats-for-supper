import { useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { demoSession } from '@/lib/api/demo-session';
import type { GroceryLineItemDto } from '@/lib/api/generated/models';
import { absoluteMonday, weekOffsetFor } from '@/lib/deployment-calendar';
import type { GrocerySection } from '@/lib/grocery/aisleMapper';
import { useFamilyStore } from '@/store/familyStore';
import { useWeekStore } from '@/store/weekStore';
import { useGroceryRecipeTitles } from '../useGroceryRecipeTitles';
import { grocerySourceKey } from './helpers';

interface UseGrocerySourceReviewOptions {
  weekOffset: number;
  weekStartDate: string | null;
  referenceWeekStartDate: string | undefined;
  items: GroceryLineItemDto[];
  grouped: Partial<Record<GrocerySection, GroceryLineItemDto[]>>;
}

export function useGrocerySourceReview({
  weekOffset,
  weekStartDate,
  referenceWeekStartDate,
  items,
  grouped,
}: UseGrocerySourceReviewOptions) {
  const [reviewSelection, setReviewSelection] = useState<{
    scope: string;
    key: string;
    attempt: number;
  } | null>(null);
  const sourceOpenAttempt = useRef(0);
  const sourceSchedule = useWeekStore((state) => state.schedule);
  const memberContext = useFamilyStore((state) => state.selectedFamilyMemberId);
  const demoReset = useSyncExternalStore(
    demoSession.subscribe,
    demoSession.getSnapshot,
    () => false
  );

  // Only bounded, known week context may travel with original-source review.
  const sourceReturnOffset = weekOffsetFor(weekStartDate, referenceWeekStartDate);
  const sourceReturnParams =
    sourceReturnOffset !== null &&
    Number.isSafeInteger(sourceReturnOffset) &&
    Math.abs(sourceReturnOffset) <= 520 &&
    referenceWeekStartDate &&
    absoluteMonday(referenceWeekStartDate) !== null
      ? `&${new URLSearchParams({ sourceGroceryWeekOffset: String(sourceReturnOffset), sourceGroceryReferenceWeekStartDate: referenceWeekStartDate })}`
      : '';

  const sourceScope = JSON.stringify([
    weekOffset,
    weekStartDate,
    referenceWeekStartDate,
    memberContext,
    demoSession.generation,
    demoReset,
  ]);
  const reviewKey = reviewSelection?.scope === sourceScope ? reviewSelection.key : null;
  const setReviewKey = (key: string | null) =>
    setReviewSelection(
      key === null ? null : { scope: sourceScope, key, attempt: ++sourceOpenAttempt.current }
    );

  const loadedSourceNames = useMemo(
    () =>
      Object.fromEntries(
        sourceSchedule.flatMap((day) =>
          day.recipe?.id && day.recipe.name?.trim()
            ? [[String(day.recipe.id), day.recipe.name.trim()]]
            : []
        )
      ),
    [sourceSchedule]
  );

  const openSourceIds = Object.entries(grouped)
    .flatMap(([aisle, rows]) =>
      (rows ?? []).flatMap((item, index) =>
        grocerySourceKey(aisle, item, index) === reviewKey ? (item.recipeIds ?? []) : []
      )
    )
    .filter((id): id is string => typeof id === 'string' && id.length > 0);

  const allSourceIds = items
    .flatMap((item) => item.recipeIds ?? [])
    .filter((id): id is string => typeof id === 'string' && id.length > 0);

  const sourceTitles = useGroceryRecipeTitles(
    sourceScope,
    allSourceIds,
    openSourceIds,
    reviewSelection?.attempt ?? 0,
    loadedSourceNames,
    demoReset
  );

  return {
    reviewKey,
    setReviewKey,
    sourceTitles,
    sourceReturnParams,
  };
}
