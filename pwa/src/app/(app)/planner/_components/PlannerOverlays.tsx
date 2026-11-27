'use client';

import { AnimatePresence } from 'framer-motion';
import type { useRouter } from 'next/navigation';
import { FamilyNudgeDialog } from '@/components/discovery/FamilyNudgeDialog';
import { SkipRecoveryDialog } from '@/components/home/SkipRecoveryDialog';
import { CookedDeferConfirmSheet } from '@/components/planner/CookedDeferConfirmSheet';
import { NonCookingDaySheet } from '@/components/planner/NonCookingDaySheet';
import { PlanningPivotSheet } from '@/components/planner/PlanningPivotSheet';
import { QuickFindModal } from '@/components/planner/QuickFindModal';
import { NonCookingReplacementConfirmation } from '@/components/recipes/NonCookingReplacementConfirmation';
import { PlanningDayChooser } from '@/components/recipes/PlanningDayChooser';
import { getSchedule, removeRecipeFromDay, saveNonCookingDay } from '@/lib/api/planner';
import {
  isNonCookingTarget,
  type NonCookingTarget,
  type PlannerOverlay,
} from '@/lib/planner/plannerOverlay';
import type { AssignmentRecipe, PlannerSlot } from '@/lib/planner/slotAssignment';
import type { useReplacementRecovery } from '@/lib/planner/useReplacementRecovery';
import { useWeekStore, type UILocalScheduleDay } from '@/store/weekStore';
import { PlannerDetailSheetOverlay } from './PlannerDetailSheetOverlay';
import type { QuickFindSelection } from './usePlannerSlotActions';

interface PlannerOverlaysProps {
  overlay: PlannerOverlay;
  currentWeekOffset: number;
  referenceWeekStartDate: string | undefined;
  schedule: UILocalScheduleDay[];
  calendarVersion: number;
  router: ReturnType<typeof useRouter>;
  openQuickFind: (dayIndex: number) => void;
  openNonCooking: (target: NonCookingTarget) => void;
  backToPivot: () => void;
  setCookedDeferSubmitting: (submitting: boolean) => void;
  openChooseDay: (recipe: AssignmentRecipe, reference: string, weekOffset: number) => void;
  closeOverlay: () => void;
  closeIfCurrent: (isCurrent: (overlay: PlannerOverlay) => boolean) => void;
  closeNudgeDialog: () => void;
  closeQuickFind: () => void;
  onQuickFindSelect: (recipe: QuickFindSelection) => Promise<void>;
  onSearchLibrary: () => void;
  onRemoveRecipe: () => Promise<void>;
  onPlanLater: (dayIndex: number) => Promise<void>;
  onExecutePlanLater: (
    slot: PlannerSlot,
    cookedDisposition?: 'reset' | 'preserve'
  ) => Promise<void>;
  onChooseDaySelect: (slot: PlannerSlot, retainedRecipe: AssignmentRecipe) => Promise<void>;
  recovery: ReturnType<typeof useReplacementRecovery>;
}

export function PlannerOverlays({
  overlay,
  currentWeekOffset,
  referenceWeekStartDate,
  schedule,
  calendarVersion,
  router,
  openQuickFind,
  openNonCooking,
  backToPivot,
  setCookedDeferSubmitting,
  openChooseDay,
  closeOverlay,
  closeIfCurrent,
  closeNudgeDialog,
  closeQuickFind,
  onQuickFindSelect,
  onSearchLibrary,
  onRemoveRecipe,
  onPlanLater,
  onExecutePlanLater,
  onChooseDaySelect,
  recovery,
}: PlannerOverlaysProps) {
  const pivot = overlay.kind === 'pivot' ? overlay : null;
  const quickFindDayIndex = overlay.kind === 'quickFind' ? overlay.dayIndex : null;
  const nonCookingTarget = overlay.kind === 'nonCooking' ? overlay.target : null;
  const pendingCookedDefer = overlay.kind === 'cookedDefer' ? overlay.slot : null;
  const cookedDeferSubmitting = overlay.kind === 'cookedDefer' && overlay.submitting;
  const showNudgeDialog = overlay.kind === 'nudge';
  const openDetailRecipeId = overlay.kind === 'detail' ? overlay.recipeId : null;
  const detailSource = overlay.kind === 'detail' ? overlay.source : null;
  const pendingRecovery = overlay.kind === 'replaceRecovery' ? overlay : null;
  const chooseDayTarget = overlay.kind === 'chooseDay' ? overlay : null;
  const nonCookingReplacement = overlay.kind === 'nonCookingReplacement' ? overlay : null;

  return (
    <>
      {nonCookingTarget && (
        <NonCookingDaySheet
          key={`${nonCookingTarget.weekOffset}:${nonCookingTarget.date}`}
          date={nonCookingTarget.date}
          plan={nonCookingTarget.plan}
          onBack={nonCookingTarget.fromPivotDayIndex !== undefined ? backToPivot : undefined}
          onClose={closeOverlay}
          onSave={async (plan) => {
            const target = nonCookingTarget;
            try {
              await saveNonCookingDay(target.date, plan);
            } catch (failure) {
              const refreshed = await getSchedule(
                target.weekOffset,
                target.referenceWeekStartDate
              ).catch(() => undefined);
              if (refreshed && useWeekStore.getState().weekOffset === target.weekOffset)
                useWeekStore.getState().applySnapshot(refreshed);
              throw failure;
            }
            const refreshed = await getSchedule(target.weekOffset, target.referenceWeekStartDate);
            if (refreshed && useWeekStore.getState().weekOffset === target.weekOffset)
              useWeekStore.getState().applySnapshot(refreshed);
            closeIfCurrent((current) => isNonCookingTarget(current, target));
          }}
          onClear={
            nonCookingTarget.existing
              ? async () => {
                  const target = nonCookingTarget;
                  await removeRecipeFromDay(target.date);
                  const refreshed = await getSchedule(
                    target.weekOffset,
                    target.referenceWeekStartDate
                  );
                  if (refreshed && useWeekStore.getState().weekOffset === target.weekOffset)
                    useWeekStore.getState().applySnapshot(refreshed);
                  closeIfCurrent((current) => isNonCookingTarget(current, target));
                }
              : undefined
          }
        />
      )}

      <PlanningPivotSheet
        date={pivot !== null ? (schedule[pivot.dayIndex]?.date ?? undefined) : undefined}
        recipeName={
          pivot !== null && schedule[pivot.dayIndex]?.status !== 3
            ? (schedule[pivot.dayIndex]?.recipe?.name ?? null)
            : null
        }
        isNonCooking={pivot !== null && schedule[pivot.dayIndex]?.status === 3}
        onNoCooking={
          pivot !== null &&
          currentWeekOffset >= 0 &&
          (!schedule[pivot.dayIndex]?.recipe?.id || schedule[pivot.dayIndex]?._isPending)
            ? () => {
                const pivotDayIndex = pivot.dayIndex;
                const day = schedule[pivotDayIndex];
                if (!day?.date) return;
                openNonCooking({
                  date: day.date,
                  weekOffset: currentWeekOffset,
                  referenceWeekStartDate: useWeekStore.getState().calendar?.referenceWeekStartDate,
                  plan: day.nonCooking,
                  existing: day.status === 3,
                  fromPivotDayIndex: pivotDayIndex,
                });
              }
            : undefined
        }
        isOpen={pivot !== null}
        onClose={closeOverlay}
        dayIndex={pivot?.dayIndex ?? 0}
        onQuickFind={() => {
          if (pivot === null) return;
          openQuickFind(pivot.dayIndex);
        }}
        onSearchLibrary={onSearchLibrary}
        onRemoveRecipe={onRemoveRecipe}
        onPlanLater={
          pivot !== null && schedule[pivot.dayIndex]?.status !== 3
            ? () => void onPlanLater(pivot.dayIndex)
            : undefined
        }
        hasRecipe={
          !!(
            pivot !== null &&
            (schedule[pivot.dayIndex]?.recipe?.id || schedule[pivot.dayIndex]?.status === 3)
          )
        }
      />

      <CookedDeferConfirmSheet
        isOpen={pendingCookedDefer !== null}
        date={pendingCookedDefer?.date}
        recipeName={pendingCookedDefer?.recipe?.name ?? null}
        pending={cookedDeferSubmitting}
        onClose={closeOverlay}
        onSelect={async (disposition) => {
          if (!pendingCookedDefer || cookedDeferSubmitting) return;
          const slot = pendingCookedDefer;
          setCookedDeferSubmitting(true);
          try {
            await onExecutePlanLater(slot, disposition);
          } finally {
            setCookedDeferSubmitting(false);
            closeIfCurrent((current) => current.kind === 'cookedDefer' && current.slot === slot);
          }
        }}
      />

      <FamilyNudgeDialog open={showNudgeDialog} onClose={closeNudgeDialog} />

      <AnimatePresence>
        {quickFindDayIndex !== null && (
          <QuickFindModal
            referenceWeekStartDate={useWeekStore.getState().calendar?.referenceWeekStartDate}
            onClose={closeQuickFind}
            onSelect={onQuickFindSelect}
            weekOffset={currentWeekOffset}
            dayIndex={quickFindDayIndex}
          />
        )}
      </AnimatePresence>

      <PlannerDetailSheetOverlay
        openDetailRecipeId={openDetailRecipeId}
        detailSource={detailSource}
        schedule={schedule}
        calendarVersion={calendarVersion}
        referenceWeekStartDate={referenceWeekStartDate}
        closeIfCurrent={closeIfCurrent}
        openChooseDay={openChooseDay}
        router={router}
      />

      {chooseDayTarget && (
        <PlanningDayChooser
          reference={chooseDayTarget.reference}
          weekOffset={chooseDayTarget.weekOffset}
          onClose={() => closeIfCurrent((current) => current.kind === 'chooseDay')}
          onSelect={(slot) => void onChooseDaySelect(slot, chooseDayTarget.recipe)}
        />
      )}

      {nonCookingReplacement && (
        <NonCookingReplacementConfirmation
          slot={nonCookingReplacement.slot}
          recipe={nonCookingReplacement.recipe}
          onClose={() => closeIfCurrent((current) => current.kind === 'nonCookingReplacement')}
          onSaved={async () => {
            const { slot } = nonCookingReplacement;
            await useWeekStore.getState().init(slot.weekOffset, slot.referenceWeekStartDate);
            router.push(
              `/planner?success=1&dayIndex=${slot.dayIndex}&weekOffset=${slot.weekOffset}&referenceWeekStartDate=${slot.referenceWeekStartDate}`
            );
          }}
          onReview={() => {
            const { slot } = nonCookingReplacement;
            closeIfCurrent((current) => current.kind === 'nonCookingReplacement');
            router.push(
              `/planner?dayIndex=${slot.dayIndex}&weekOffset=${slot.weekOffset}&referenceWeekStartDate=${slot.referenceWeekStartDate}`
            );
          }}
        />
      )}

      <AnimatePresence>
        {pendingRecovery && (
          <SkipRecoveryDialog
            pending={recovery.pending}
            isOpen={true}
            step={2}
            canGoBack={false}
            source={pendingRecovery.slot}
            replacement={recovery.feedback}
            confirmAbandon={recovery.confirmAbandon}
            onCancelAbandon={recovery.cancelAbandon}
            onAbandon={recovery.abandon}
            onRetryReplacement={recovery.retry}
            onReviewPlan={recovery.review}
            onChooseAnotherDay={recovery.chooseAnotherDay}
            onClose={recovery.close}
            onBack={recovery.close}
            onAction={recovery.act}
          />
        )}
      </AnimatePresence>
    </>
  );
}
