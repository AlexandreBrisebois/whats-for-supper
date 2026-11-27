import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { PreparationStatus } from '@/components/planner/PreparationStatus';
import { Button } from '@/components/ui/button';
import type { IngredientProjection } from '@/lib/api/generated/models';
import type { IngredientContext } from '@/lib/api/recipes';
import type { CookingStep } from '@/lib/cooking/stepParser';
import { formatSupperPlanDate } from '@/lib/planner/nonCooking';
import { t, tWithVars } from '@/locales';
import type { PreparationReviewState } from './types';

export interface CooksModeProgressHeaderProps {
  hasInstructions: boolean;
  isPrepStep: boolean;
  currentStep: number;
  stepsCount: number;
  singlePageCooking: boolean;
  isVegetarian?: boolean;
  stackedLayout: boolean;
  focusedEdit: ReactNode;
}

export function CooksModeProgressHeader({
  hasInstructions,
  isPrepStep,
  currentStep,
  stepsCount,
  singlePageCooking,
  isVegetarian,
  stackedLayout,
  focusedEdit,
}: CooksModeProgressHeaderProps) {
  return (
    <>
      <div
        data-testid="cooking-reading-context"
        className="hidden min-h-11 shrink-0 items-center justify-between gap-3 px-4 py-1 text-sm font-medium text-ink-muted md:flex md:px-8"
      >
        <span data-testid="cooks-mode-step-indicator">
          {!hasInstructions
            ? t('cook.stepsUnavailable', 'Steps unavailable')
            : isPrepStep
              ? t('cook.checkAndPrep', 'Check & Prep')
              : `${currentStep} / ${stepsCount}`}
        </span>
        {!isPrepStep && isVegetarian && (
          <span className="text-xs font-semibold text-garden-ink">VEGGIE</span>
        )}
        {!stackedLayout && focusedEdit}
      </div>
      <div
        role="progressbar"
        aria-label={singlePageCooking ? 'Reading position' : 'Cooking progress'}
        aria-valuemin={0}
        aria-valuemax={Math.max(stepsCount, 1)}
        aria-valuenow={currentStep}
        className="flex w-full h-1.5 bg-charcoal/5 shrink-0"
      >
        {Array.from({ length: stepsCount }).map((_, i) => (
          <motion.div
            key={i}
            animate={{
              backgroundColor: i < currentStep ? 'var(--color-terracotta)' : 'var(--color-cream)',
            }}
            className="flex-1"
          />
        ))}
      </div>
    </>
  );
}

export interface CooksModeContextBannersProps {
  ingredientContext?: IngredientContext;
  projection?: IngredientProjection;
  projectionError: boolean;
  scaled: boolean;
  projectedSteps: CookingStep[] | null;
  quantitiesAvailable: boolean;
  quantityRefreshError: boolean;
  quantityRefreshing: boolean;
  preparationReview: PreparationReviewState;
  reviewingPreparation: boolean;
  completionError: string | null;
  onRetryProjection: () => void;
  onReviewPreparation: () => void;
  onRefreshQuantities: () => void;
}

export function CooksModeContextBanners({
  ingredientContext,
  projection,
  projectionError,
  scaled,
  projectedSteps,
  quantitiesAvailable,
  quantityRefreshError,
  quantityRefreshing,
  preparationReview,
  reviewingPreparation,
  completionError,
  onRetryProjection,
  onReviewPreparation,
  onRefreshQuantities,
}: CooksModeContextBannersProps) {
  return (
    <>
      {ingredientContext && (
        <div className="border-b border-charcoal/10 px-4 py-2 text-sm text-ink-body md:px-6">
          <p data-testid="cooking-portion-context">
            {formatSupperPlanDate(ingredientContext.supperDate)}
            {projection?.targetServings != null
              ? ` · ${tWithVars('recipes.portionCount', '{{count}} portions', { count: projection.targetServings })}`
              : ''}
          </p>
          {projection?.preparation && <PreparationStatus preparation={projection.preparation} />}
          {!projection && !projectionError && (
            <p role="status">
              {t('recipes.projectionLoading', 'Loading ingredients for this date…')}
            </p>
          )}
          {projectionError && (
            <div
              role="alert"
              className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-hearth-line bg-terracotta-50 px-4 py-3 text-sm text-ink-body shadow-sm"
            >
              <p className="min-w-0 flex-1 font-medium text-hearth-ink">
                {t('recipes.projectionFailed', 'Could not confirm ingredients for this supper.')}
              </p>
              <Button type="button" variant="primary" size="md" onClick={onRetryProjection}>
                {t('common.retry', 'Retry')}
              </Button>
            </div>
          )}
          {(projection?.status === 'partial' || projection?.status === 'unresolved') && (
            <p role="status">
              {t(
                'recipes.projectionReview',
                'Some amounts need review. Consult the original recipe.'
              )}
            </p>
          )}
          {scaled && !projectedSteps && (
            <p data-testid="cooking-instruction-limitation">
              {t('cook.originalAmounts', 'Ingredients are adjusted; step amounts remain original.')}
            </p>
          )}
        </div>
      )}
      {(quantitiesAvailable || quantityRefreshError || preparationReview) && (
        <div
          data-testid={preparationReview ? 'preparation-review' : 'cooking-update-bar'}
          className="sticky top-0 z-10 shrink-0 flex flex-wrap items-center justify-between gap-3 border-y border-hearth-line bg-terracotta-50 px-4 py-3 text-sm text-ink-body md:px-6"
        >
          <div className="min-w-0 flex-1 space-y-1">
            {preparationReview === 'required' ? (
              <p role="status" className="font-medium text-ink-body">
                {t(
                  'cook.reviewCurrentSupperHelp',
                  'Review the current supper and quantities before another attempt. Your cooking work is kept.'
                )}
              </p>
            ) : (
              <>
                {quantitiesAvailable && (
                  <p
                    data-testid="cooking-quantities-available"
                    role="status"
                    className="font-medium text-ink-body"
                  >
                    {preparationReview === 'quantities'
                      ? t(
                          'cook.reviewChangedQuantities',
                          'Refresh the changed quantities before marking this supper prepared.'
                        )
                      : t('cook.quantitiesAvailable', 'Updated quantities are available.')}
                  </p>
                )}
                {quantityRefreshError && (
                  <p role="alert" className="font-semibold text-hearth-ink">
                    {t(
                      'cook.quantityRefreshFailed',
                      'Could not confirm updated quantities. Your current quantities and cooking work are kept.'
                    )}
                  </p>
                )}
              </>
            )}
          </div>
          {preparationReview === 'required' ? (
            <Button
              type="button"
              variant="primary"
              size="md"
              className="max-w-full whitespace-normal text-center"
              disabled={reviewingPreparation}
              onClick={onReviewPreparation}
            >
              {reviewingPreparation
                ? t('cook.reviewingCurrentSupper', 'Reviewing supper…')
                : t('cook.reviewCurrentSupper', 'Review current supper')}
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="md"
              className="max-w-full whitespace-normal text-center"
              disabled={quantityRefreshing}
              onClick={onRefreshQuantities}
            >
              {quantityRefreshing
                ? t('cook.refreshingQuantities', 'Refreshing quantities…')
                : t('cook.refreshQuantities', 'Refresh quantities')}
            </Button>
          )}
        </div>
      )}
      {completionError && (
        <p
          role="alert"
          className="border-y border-hearth-line bg-terracotta-50 px-4 py-3 text-sm font-medium text-hearth-ink md:px-6"
        >
          {completionError}
        </p>
      )}
    </>
  );
}
