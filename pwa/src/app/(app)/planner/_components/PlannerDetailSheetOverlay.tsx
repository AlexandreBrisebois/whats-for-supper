'use client';

import type { useRouter } from 'next/navigation';
import { RecipeDetailSheet } from '@/components/recipes/RecipeDetailSheet';
import { formatShortSupperPlanDate, formatSupperPlanDate } from '@/lib/planner/nonCooking';
import type { DetailSource, PlannerOverlay } from '@/lib/planner/plannerOverlay';
import type { AssignmentRecipe } from '@/lib/planner/slotAssignment';
import { t, tWithVars } from '@/locales';
import type { UILocalScheduleDay } from '@/store/weekStore';
import { isDetailOverlay, usePlannerDetailVerification } from './usePlannerDetailVerification';

interface PlannerDetailSheetOverlayProps {
  openDetailRecipeId: string | null;
  detailSource: DetailSource | null;
  schedule: UILocalScheduleDay[];
  calendarVersion: number;
  referenceWeekStartDate: string | undefined;
  closeIfCurrent: (isCurrent: (overlay: PlannerOverlay) => boolean) => void;
  openChooseDay: (recipe: AssignmentRecipe, reference: string, weekOffset: number) => void;
  router: ReturnType<typeof useRouter>;
}

export function PlannerDetailSheetOverlay({
  openDetailRecipeId,
  detailSource,
  schedule,
  calendarVersion,
  referenceWeekStartDate,
  closeIfCurrent,
  openChooseDay,
  router,
}: PlannerDetailSheetOverlayProps) {
  const {
    verifiedDetail,
    detailReview,
    detailIdentity,
    openPlannedDay,
    openDetailDayChooser,
    retryDetailCheck,
  } = usePlannerDetailVerification({
    openDetailRecipeId,
    detailSource,
    schedule,
    calendarVersion,
    referenceWeekStartDate,
    closeIfCurrent,
    openChooseDay,
    router,
  });

  if (!openDetailRecipeId) return null;

  return (
    <RecipeDetailSheet
      ingredientContext={
        detailSource
          ? detailSource.context === 'proposed'
            ? { context: 'proposed', supperDate: detailSource.date }
            : {
                context: 'assigned',
                supperDate: detailSource.date,
                occurrenceId: detailSource.occurrenceId ?? '',
              }
          : undefined
      }
      recipeId={openDetailRecipeId}
      plannerDayLabel={null}
      sourceDayLabel={detailSource ? formatSupperPlanDate(detailSource.date) : undefined}
      planningLoading={
        detailSource?.context === 'assigned' &&
        verifiedDetail !== detailIdentity &&
        detailReview?.identity !== detailIdentity
      }
      planningNeedsCheck={
        detailReview?.identity === detailIdentity &&
        detailReview.kind !== 'completed' &&
        detailReview.kind !== 'voting'
      }
      plannedDayLabel={
        verifiedDetail === detailIdentity && detailSource
          ? formatSupperPlanDate(detailSource.date)
          : undefined
      }
      onOpenPlannedDay={verifiedDetail === detailIdentity ? () => void openPlannedDay() : undefined}
      planningMessageTone={
        detailReview?.identity === detailIdentity && detailReview.kind === 'completed'
          ? 'prepared'
          : detailReview?.identity === detailIdentity && detailReview.kind === 'voting'
            ? 'status'
            : 'alert'
      }
      planningMessage={
        detailReview?.identity === detailIdentity && detailSource
          ? detailReview.kind === 'completed'
            ? detailReview.isPast
              ? undefined
              : detailReview.preparedOn
                ? tWithVars('recipes.alreadyCookedOn', 'Prepared on {{date}}', {
                    date: formatShortSupperPlanDate(detailReview.preparedOn),
                  })
                : tWithVars('recipes.preparedForDate', 'Prepared for {{date}}', {
                    date: formatShortSupperPlanDate(detailSource.date),
                  })
            : detailReview.kind === 'voting'
              ? tWithVars('recipes.votingOpenOn', 'Your household is still voting on {{date}}.', {
                  date: formatShortSupperPlanDate(detailSource.date),
                })
              : detailReview.kind === 'review'
                ? t('recipes.planChanged', 'Your plan changed. Review the selected day in Planner.')
                : t(
                    'recipes.checkPlanFailed',
                    'Could not confirm this meal. Retry check before saving.'
                  )
          : undefined
      }
      planningActionLabel={
        detailReview?.identity === detailIdentity
          ? detailReview.kind === 'completed'
            ? t('recipes.planAnotherDay', 'Plan for another day')
            : detailReview.kind === 'voting'
              ? t('recipes.openVotingInPlanner', 'Open voting in Planner')
              : detailReview.kind === 'review'
                ? t('recipes.reviewPlan', 'Review plan')
                : t('recipes.retryPlanCheck', 'Retry check')
          : undefined
      }
      onRetryTarget={
        detailReview?.identity === detailIdentity && detailSource
          ? detailReview.kind === 'completed'
            ? openDetailDayChooser
            : detailReview.kind === 'voting' || detailReview.kind === 'review'
              ? () => {
                  closeIfCurrent(isDetailOverlay);
                  router.push(
                    `/planner?dayIndex=${detailSource.dayIndex}&weekOffset=${detailSource.weekOffset}&referenceWeekStartDate=${detailSource.reference}`
                  );
                }
              : retryDetailCheck
          : undefined
      }
      secondaryPlanningActionLabel={
        detailReview?.identity === detailIdentity && detailSource
          ? detailReview.kind === 'completed'
            ? tWithVars('recipes.openDayInPlanner', 'Open {{date}} in Planner', {
                date: formatShortSupperPlanDate(detailSource.date),
              })
            : detailReview.kind === 'voting'
              ? t('recipes.planAnotherDay', 'Plan for another day')
              : undefined
          : undefined
      }
      secondaryPlanningTestId={
        detailReview?.identity === detailIdentity
          ? detailReview.kind === 'completed'
            ? 'action-open-day-in-planner'
            : detailReview.kind === 'voting'
              ? 'action-plan-another-day'
              : undefined
          : undefined
      }
      onSecondaryPlanningAction={
        detailReview?.identity === detailIdentity && detailSource
          ? detailReview.kind === 'completed'
            ? () => {
                closeIfCurrent(isDetailOverlay);
                router.push(
                  `/planner?dayIndex=${detailSource.dayIndex}&weekOffset=${detailSource.weekOffset}&referenceWeekStartDate=${detailSource.reference}`
                );
              }
            : detailReview.kind === 'voting'
              ? openDetailDayChooser
              : undefined
          : undefined
      }
      onClose={() => closeIfCurrent(isDetailOverlay)}
      onUseForDay={async () => {}}
      onFindSimilar={(recipeId) => {
        router.push(`/recipes?similarTo=${recipeId}`);
      }}
    />
  );
}
