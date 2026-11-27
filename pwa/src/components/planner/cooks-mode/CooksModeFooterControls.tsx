import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { IngredientProjection } from '@/lib/api/generated/models';
import type { IngredientContext } from '@/lib/api/recipes';
import { t, tWithVars } from '@/locales';
import type { CookingViewSaveState, PreparationReviewState } from './types';

export interface CooksModeFooterControlsProps {
  currentViewSaveState: CookingViewSaveState;
  selectedMemberName?: string;
  reimportAcknowledgement: boolean;
  hasInstructions: boolean;
  singlePageEnabled: boolean;
  singlePageCooking: boolean;
  isEditing: boolean;
  currentStep: number;
  isPrepStep: boolean;
  isResumingSteps: boolean;
  isCompletionAction: boolean;
  isCompleting: boolean;
  checkingPreparation: boolean;
  preparationReview: PreparationReviewState;
  ingredientContext?: IngredientContext;
  projection?: IngredientProjection;
  onRetryViewSave: () => void;
  onPrevOrIngredients: () => void;
  onNextOrComplete: () => void;
}

export function CooksModeFooterControls({
  currentViewSaveState,
  selectedMemberName,
  reimportAcknowledgement,
  hasInstructions,
  singlePageEnabled,
  singlePageCooking,
  isEditing,
  currentStep,
  isPrepStep,
  isResumingSteps,
  isCompletionAction,
  isCompleting,
  checkingPreparation,
  preparationReview,
  ingredientContext,
  projection,
  onRetryViewSave,
  onPrevOrIngredients,
  onNextOrComplete,
}: CooksModeFooterControlsProps) {
  return (
    <>
      {currentViewSaveState === 'failed' && selectedMemberName && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 border-t border-hearth-line bg-terracotta-50 px-4 py-3 text-sm text-ink-body md:px-6"
        >
          <p className="min-w-0 flex-1 font-semibold text-hearth-ink">
            {tWithVars('cook.viewSaveFailed', "View changed for now. Couldn't save for {{name}}.", {
              name: selectedMemberName,
            })}
          </p>
          <Button type="button" variant="primary" size="md" onClick={onRetryViewSave}>
            {t('cook.viewRetry', 'Retry')}
          </Button>
        </div>
      )}
      {reimportAcknowledgement && (
        <p role="status" className="shrink-0 px-4 py-2 text-sm font-semibold text-ink-body md:px-6">
          Reimporting in background
        </p>
      )}
      <div
        data-testid="cooks-mode-controls"
        className="px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:px-6 flex flex-wrap gap-3 bg-white border-t border-chrome-line shrink-0"
      >
        {hasInstructions && (!singlePageEnabled || singlePageCooking) && (
          <Button
            variant="secondary"
            disabled={singlePageCooking ? isEditing : currentStep === 0}
            onClick={onPrevOrIngredients}
            data-testid="cooks-mode-step-prev"
            className="h-auto min-h-12 min-w-0 flex-auto whitespace-normal rounded-xl py-2 text-base font-semibold text-ink-body border-chrome-line flex items-center justify-center space-x-2 transition-all bg-white"
          >
            {!singlePageCooking && <ChevronLeft size={24} />}
            <span>
              {singlePageCooking ? t('cook.ingredients', 'Ingredients') : t('cook.back', 'Back')}
            </span>
          </Button>
        )}
        {!(projection?.preparation && isCompletionAction) && (
          <Button
            variant="primary"
            disabled={
              isCompleting ||
              !!preparationReview ||
              (ingredientContext?.context === 'assigned' && !projection)
            }
            onClick={onNextOrComplete}
            data-testid="cooks-mode-step-next"
            aria-label={
              isCompletionAction
                ? checkingPreparation
                  ? t('cook.checkPreparation', 'Check preparation')
                  : t('cook.markCooked', 'Mark recipe as cooked')
                : undefined
            }
            className="h-auto min-h-12 min-w-0 flex-auto whitespace-normal rounded-xl py-2 text-lg font-bold shadow-sm flex items-center justify-center space-x-2 transition-all"
          >
            <span>
              {isCompletionAction
                ? checkingPreparation
                  ? t('cook.checkPreparation', 'Check preparation')
                  : t('cook.cooked', 'Cooked')
                : isResumingSteps
                  ? t('cook.resumeSteps', 'Resume steps')
                  : isPrepStep
                    ? t('cook.letsCook', "Let's Cook")
                    : t('cook.next', 'Next')}
            </span>
            {!isCompletionAction && <ChevronRight size={24} />}
          </Button>
        )}
      </div>
    </>
  );
}
