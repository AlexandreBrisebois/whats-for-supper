import type React from 'react';
import { formatShortSupperPlanDate, formatSupperPlanDate } from '@/lib/planner/nonCooking';
import { getPlannerSlot, type PlannerSlot } from '@/lib/planner/slotAssignment';
import { t, tWithVars } from '@/locales';
import type { TargetReadState } from './useRecipesPlanningTarget';

interface BuildDetailSheetPlanningPropsParams {
  detailRecipeId: string | null;
  openRecipeId: string | null;
  reviewDuplicateParam: string | null;
  originalSourceReview: boolean;
  planningDayLabel: string | null;
  visibleTarget: PlannerSlot | undefined;
  assignmentNeedsCheck: boolean;
  targetReadError: string | undefined;
  confirmedPlannedTarget: boolean;
  detailTargetKey: string;
  targetChecking: boolean;
  targetCompleted: boolean;
  targetVoting: boolean;
  identicalTarget: boolean;
  targetReferenceForChooser: string | undefined;
  grocerySourceEntry: string | null;
  isCurrentDetailContext: (key: string) => boolean;
  getTargetReadGeneration: () => number;
  setTargetRead: React.Dispatch<React.SetStateAction<TargetReadState | null>>;
  setTargetReadAttempt: React.Dispatch<React.SetStateAction<number>>;
  setShowDayChooser: React.Dispatch<React.SetStateAction<string | null>>;
  setSourcePlanningEntry: React.Dispatch<React.SetStateAction<string | null>>;
  setChosenDetailTarget: React.Dispatch<
    React.SetStateAction<{ entry: string; slot: PlannerSlot } | null>
  >;
  reviewDetailTarget: (slot: PlannerSlot) => void;
}

export function buildDetailSheetPlanningProps({
  detailRecipeId,
  openRecipeId,
  reviewDuplicateParam,
  originalSourceReview,
  planningDayLabel,
  visibleTarget,
  assignmentNeedsCheck,
  targetReadError,
  confirmedPlannedTarget,
  detailTargetKey,
  targetChecking,
  targetCompleted,
  targetVoting,
  identicalTarget,
  targetReferenceForChooser,
  grocerySourceEntry,
  isCurrentDetailContext,
  getTargetReadGeneration,
  setTargetRead,
  setTargetReadAttempt,
  setShowDayChooser,
  setSourcePlanningEntry,
  setChosenDetailTarget,
  reviewDetailTarget,
}: BuildDetailSheetPlanningPropsParams) {
  return {
    initialReviewDuplicate: reviewDuplicateParam === '1' && detailRecipeId === openRecipeId,
    plannerDayLabel: originalSourceReview ? null : planningDayLabel,
    ingredientContext:
      !originalSourceReview && visibleTarget
        ? ({ context: 'proposed', supperDate: visibleTarget.date } as const)
        : undefined,
    planningNeedsCheck: assignmentNeedsCheck || Boolean(targetReadError),
    plannedDayLabel:
      confirmedPlannedTarget && visibleTarget
        ? formatSupperPlanDate(visibleTarget.date)
        : undefined,
    onOpenPlannedDay:
      confirmedPlannedTarget && visibleTarget
        ? () => {
            const captured = visibleTarget;
            const generation = getTargetReadGeneration();
            void getPlannerSlot(
              captured.weekOffset,
              captured.dayIndex,
              captured.referenceWeekStartDate
            )
              .then((checked) => {
                if (
                  !isCurrentDetailContext(detailTargetKey) ||
                  getTargetReadGeneration() !== generation
                )
                  return;
                if (
                  !checked ||
                  checked.date !== captured.date ||
                  checked.recipe?.id !== detailRecipeId ||
                  (checked.status !== 0 && checked.status !== 1)
                ) {
                  setTargetRead({
                    key: detailTargetKey,
                    slot: captured,
                    error: t(
                      'recipes.planChanged',
                      'Your plan changed. Review the selected day in Planner.'
                    ),
                  });
                  return;
                }
                reviewDetailTarget(checked);
              })
              .catch(() => {
                if (
                  isCurrentDetailContext(detailTargetKey) &&
                  getTargetReadGeneration() === generation
                )
                  setTargetRead({
                    key: detailTargetKey,
                    slot: captured,
                    error: t(
                      'recipes.checkPlanFailed',
                      'Could not confirm this meal. Retry check before saving.'
                    ),
                  });
              });
          }
        : undefined,
    planningEnabled: !originalSourceReview,
    planningLoading:
      !originalSourceReview && (targetChecking || (!visibleTarget && !targetReadError)),
    planningMessageTone: (!originalSourceReview && !targetReadError && targetCompleted
      ? 'prepared'
      : !originalSourceReview && !targetReadError && targetVoting
        ? 'status'
        : 'alert') as 'prepared' | 'status' | 'alert',
    planningMessage: originalSourceReview
      ? undefined
      : (targetReadError ??
        (targetCompleted && visibleTarget
          ? visibleTarget.isPast
            ? undefined
            : visibleTarget.preparation?.preparedOn
              ? tWithVars('recipes.alreadyCookedOn', 'Prepared on {{date}}', {
                  date: formatShortSupperPlanDate(visibleTarget.preparation.preparedOn.toString()),
                })
              : tWithVars('recipes.preparedForDate', 'Prepared for {{date}}', {
                  date: formatShortSupperPlanDate(visibleTarget.date),
                })
          : targetVoting && visibleTarget
            ? tWithVars('recipes.votingOpenOn', 'Your household is still voting on {{date}}.', {
                date: formatShortSupperPlanDate(visibleTarget.date),
              })
            : undefined)),
    planningActionLabel: originalSourceReview
      ? undefined
      : targetReadError
        ? t('recipes.retryPlanCheck', 'Retry check')
        : targetCompleted
          ? t('recipes.planAnotherDay', 'Plan for another day')
          : targetVoting
            ? t('recipes.openVotingInPlanner', 'Open voting in Planner')
            : undefined,
    changeDayDisabled: targetChecking,
    onChangeDay:
      originalSourceReview ||
      assignmentNeedsCheck ||
      identicalTarget ||
      targetCompleted ||
      targetVoting ||
      !targetReferenceForChooser
        ? undefined
        : () => setShowDayChooser(detailTargetKey),
    onRetryTarget:
      !originalSourceReview && targetReadError
        ? () => {
            setTargetRead((current) =>
              current?.key === detailTargetKey
                ? { ...current, checking: true, error: undefined }
                : current
            );
            setTargetReadAttempt((value) => value + 1);
          }
        : !originalSourceReview && targetCompleted && visibleTarget
          ? targetReferenceForChooser
            ? () => setShowDayChooser(detailTargetKey)
            : undefined
          : !originalSourceReview && targetVoting && visibleTarget
            ? () => reviewDetailTarget(visibleTarget)
            : undefined,
    secondaryPlanningActionLabel:
      !originalSourceReview && !targetReadError && visibleTarget
        ? targetCompleted
          ? tWithVars('recipes.openDayInPlanner', 'Open {{date}} in Planner', {
              date: formatShortSupperPlanDate(visibleTarget.date),
            })
          : targetVoting
            ? t('recipes.planAnotherDay', 'Plan for another day')
            : undefined
        : undefined,
    secondaryPlanningTestId:
      !originalSourceReview && !targetReadError && visibleTarget
        ? targetCompleted
          ? 'action-open-day-in-planner'
          : targetVoting
            ? 'action-plan-another-day'
            : undefined
        : undefined,
    onSecondaryPlanningAction:
      !originalSourceReview && !targetReadError && visibleTarget
        ? targetCompleted
          ? () => reviewDetailTarget(visibleTarget)
          : targetVoting && targetReferenceForChooser
            ? () => setShowDayChooser(detailTargetKey)
            : undefined
        : undefined,
    onBeginPlanning: originalSourceReview
      ? () => {
          setSourcePlanningEntry(grocerySourceEntry);
          setChosenDetailTarget(null);
          setTargetReadAttempt((value) => value + 1);
        }
      : undefined,
  };
}
