'use client';

import type React from 'react';
import { useState } from 'react';
import type { useRouter } from 'next/navigation';
import type { AssignmentRecipe, PlannerSlot } from '@/lib/planner/slotAssignment';
import { useReplacementRecovery } from '@/lib/planner/useReplacementRecovery';

interface UseRecipesReplacementRecoveryFlowParams {
  router: ReturnType<typeof useRouter>;
  targetReferenceForChooser: string | undefined;
  setDetailRecipeId: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useRecipesReplacementRecoveryFlow({
  router,
  targetReferenceForChooser,
  setDetailRecipeId,
}: UseRecipesReplacementRecoveryFlowParams) {
  const [pendingRecovery, setPendingRecovery] = useState<{
    slot: PlannerSlot;
    recipe: AssignmentRecipe;
  } | null>(null);
  const [recoveryDayChooser, setRecoveryDayChooser] = useState<{
    recipe: AssignmentRecipe;
    reference: string;
    weekOffset: number;
  } | null>(null);

  const recovery = useReplacementRecovery({
    slot: pendingRecovery?.slot,
    recipe: pendingRecovery?.recipe,
    onClosed: (saved, reason) => {
      if (!saved && reason === 'dismiss' && pendingRecovery)
        setDetailRecipeId(pendingRecovery.recipe.id);
      setPendingRecovery(null);
    },
    onSaved: async () => {
      if (!pendingRecovery) return;
      const { slot } = pendingRecovery;
      router.push(
        `/planner?success=1&dayIndex=${slot.dayIndex}&weekOffset=${slot.weekOffset}&referenceWeekStartDate=${slot.referenceWeekStartDate}`
      );
    },
    onReview: () => {
      if (!pendingRecovery) return;
      const { slot } = pendingRecovery;
      router.push(
        `/planner?dayIndex=${slot.dayIndex}&weekOffset=${slot.weekOffset}&referenceWeekStartDate=${slot.referenceWeekStartDate}`
      );
    },
    onChooseAnotherDay: () => {
      if (!pendingRecovery) return;
      const reference = pendingRecovery.slot.referenceWeekStartDate ?? targetReferenceForChooser;
      if (!reference) return;
      setRecoveryDayChooser({
        recipe: pendingRecovery.recipe,
        reference,
        weekOffset: pendingRecovery.slot.weekOffset,
      });
    },
  });

  return {
    pendingRecovery,
    setPendingRecovery,
    recoveryDayChooser,
    setRecoveryDayChooser,
    recovery,
  };
}
