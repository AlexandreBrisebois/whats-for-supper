'use client';

import { AnimatePresence } from 'framer-motion';
import {
  SkipRecoveryDialog,
  type ReplacementFeedback,
  type SkipRecoveryBackupIntent,
} from '@/components/home/SkipRecoveryDialog';
import { CooksMode } from '@/components/planner/CooksMode';
import { QuickFindModal } from '@/components/planner/QuickFindModal';
import { PlanningDayChooser } from '@/components/recipes/PlanningDayChooser';
import type { IngredientContext } from '@/lib/api/recipes';
import { calendarDayIndex, type CalendarContext } from '@/lib/deployment-calendar';
import type { PlannerSlot } from '@/lib/planner/slotAssignment';
import type { ScheduleRecipeDto } from '@/lib/api/generated/models/index';
import type { DayChooserState, QuickFindSelection, RecoveryAction } from './types';

interface HomeCommandOverlaysProps {
  showCooksMode: boolean;
  cookingContext: IngredientContext | undefined;
  cookingRecipe: ScheduleRecipeDto | null;
  onCloseCooksMode: () => void;
  showRecovery: boolean;
  recoveryPending: boolean;
  recoveryStep: 1 | 2;
  backupIntent: SkipRecoveryBackupIntent | null;
  recoverySource: PlannerSlot | undefined;
  replacementFeedback: ReplacementFeedback | null;
  searchError: string | null;
  onRetrySearch: () => void;
  onRetryReplacement: () => void;
  confirmAbandon: boolean;
  onCancelAbandon: () => void;
  onAbandon: () => void;
  onReviewPlan: () => void;
  onChooseAnotherDay: (() => void) | undefined;
  onCloseRecovery: () => void;
  onBack: () => void;
  onCustomPlan: (customLabel: string) => void;
  onAction: (action: RecoveryAction) => void;
  showQuickFind: boolean;
  actionContext: CalendarContext | null;
  onCloseQuickFind: () => void;
  onSelectQuickFind: (recipe: QuickFindSelection | null | undefined) => void;
  dayChooserState: DayChooserState | null;
  onCloseDayChooser: () => void;
  onSelectDayChooserSlot: (slot: {
    dayIndex: number;
    weekOffset: number;
    referenceWeekStartDate?: string;
  }) => void;
}

export function HomeCommandOverlays({
  showCooksMode,
  cookingContext,
  cookingRecipe,
  onCloseCooksMode,
  showRecovery,
  recoveryPending,
  recoveryStep,
  backupIntent,
  recoverySource,
  replacementFeedback,
  searchError,
  onRetrySearch,
  onRetryReplacement,
  confirmAbandon,
  onCancelAbandon,
  onAbandon,
  onReviewPlan,
  onChooseAnotherDay,
  onCloseRecovery,
  onBack,
  onCustomPlan,
  onAction,
  showQuickFind,
  actionContext,
  onCloseQuickFind,
  onSelectQuickFind,
  dayChooserState,
  onCloseDayChooser,
  onSelectDayChooserSlot,
}: HomeCommandOverlaysProps) {
  return (
    <>
      <AnimatePresence>
        {showCooksMode && cookingRecipe && cookingRecipe.id && (
          <CooksMode
            ingredientContext={cookingContext}
            recipe={{
              id: cookingRecipe.id,
              name: cookingRecipe.name || null,
              image: cookingRecipe.image || '',
            }}
            onClose={onCloseCooksMode}
          />
        )}
      </AnimatePresence>

      {showRecovery && (
        <SkipRecoveryDialog
          pending={recoveryPending}
          isOpen={showRecovery}
          step={recoveryStep}
          canGoBack={true}
          backupIntent={backupIntent}
          source={recoverySource}
          replacement={replacementFeedback}
          searchError={searchError}
          onRetrySearch={onRetrySearch}
          onRetryReplacement={onRetryReplacement}
          confirmAbandon={confirmAbandon}
          onCancelAbandon={onCancelAbandon}
          onAbandon={onAbandon}
          onReviewPlan={onReviewPlan}
          onChooseAnotherDay={onChooseAnotherDay}
          onClose={onCloseRecovery}
          onBack={onBack}
          onCustomPlan={onCustomPlan}
          onAction={onAction}
        />
      )}

      <AnimatePresence>
        {showQuickFind && (
          <QuickFindModal
            onClose={onCloseQuickFind}
            onSelect={onSelectQuickFind}
            dayIndex={actionContext ? calendarDayIndex(actionContext) : null}
            referenceWeekStartDate={actionContext?.referenceWeekStartDate}
          />
        )}
      </AnimatePresence>

      {dayChooserState && (
        <PlanningDayChooser
          reference={dayChooserState.reference}
          weekOffset={0}
          onClose={onCloseDayChooser}
          onSelect={onSelectDayChooserSlot}
        />
      )}
    </>
  );
}
