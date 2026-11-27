import { motion } from 'framer-motion';
import { Check, CheckCircle2, UtensilsCrossed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { t } from '@/locales';
import type { CookingIngredientItem } from './types';

export interface CooksModeNoStepsCardProps {
  contentError: boolean;
  canReimport?: boolean;
  onRetry: () => void;
  onReportSteps: () => void;
  onOpenDetails: () => void;
}

export function CooksModeNoStepsCard({
  contentError,
  canReimport,
  onRetry,
  onReportSteps,
  onOpenDetails,
}: CooksModeNoStepsCardProps) {
  return (
    <div
      data-testid="cooks-mode-no-steps"
      className={`space-y-5 rounded-3xl border p-6 text-ink-body ${
        contentError ? 'border-hearth-line bg-terracotta-50' : 'border-chrome-line bg-white'
      }`}
    >
      <p
        role={contentError ? 'alert' : 'status'}
        className={`text-lg font-bold ${contentError ? 'text-hearth-ink' : 'text-ink-body'}`}
      >
        {contentError
          ? t('cook.instructionsLoadError', 'Could not load cooking instructions.')
          : t(
              'cook.instructionsUnavailable',
              'Cooking instructions are not available for this recipe.'
            )}
      </p>
      <p className="text-sm text-ink-muted">
        {t(
          'cook.instructionsRecovery',
          'You can open recipe details to view the original, or mark this recipe as cooked.'
        )}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button data-testid="cooks-mode-content-retry" onClick={onRetry}>
          {t('common.retry', 'Retry')}
        </Button>
        {canReimport && (
          <Button variant="secondary" onClick={onReportSteps}>
            {t('cook.reportSteps', 'Report steps')}
          </Button>
        )}
        <Button variant="secondary" onClick={onOpenDetails}>
          {t('cook.recipeDetails', 'Recipe details')}
        </Button>
      </div>
    </div>
  );
}

export interface CooksModeIngredientsPrepProps {
  ingredients: CookingIngredientItem[];
  gathered: Record<string, boolean>;
  onToggleIngredient: (key: string) => void;
}

export function CooksModeIngredientsPrep({
  ingredients,
  gathered,
  onToggleIngredient,
}: CooksModeIngredientsPrepProps) {
  return (
    <div className="space-y-10">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
        <div className="flex flex-col gap-2">
          <h3 className="text-3xl md:text-4xl lg:text-5xl font-heading font-black text-ink-body leading-tight">
            {t('cook.checkAndPrep', 'Check & Prep')}
          </h3>
          <p className="text-xl md:text-2xl font-medium text-ink-muted leading-relaxed max-w-lg">
            {t('cook.ingredientsReady', 'Check off your ingredients before you start cooking.')}
          </p>
        </div>
      </div>

      {ingredients.length > 0 ? (
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-garden-ink">
            <CheckCircle2 size={16} />
            <span className="text-sm font-semibold">
              {ingredients.filter(({ key }) => gathered[key]).length} of {ingredients.length} ready
            </span>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 text-left">
            {ingredients.map(({ key: ing, text }, idx) => {
              const isChecked = !!gathered[ing];
              return (
                <motion.button
                  key={idx}
                  data-testid="ingredient-toggle"
                  aria-checked={isChecked}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => onToggleIngredient(ing)}
                  className={`group flex items-center p-4 md:p-5 rounded-[1.5rem] w-full text-left border transition-all ${
                    isChecked
                      ? 'bg-sage-50 border-garden-line'
                      : 'bg-white border-chrome-line shadow-sm hover:border-chrome-line'
                  }`}
                >
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 mr-4 transition-all ${
                      isChecked
                        ? 'bg-garden-fill border-sage-700 text-white'
                        : 'border-chrome-line group-hover:border-icon-affordance'
                    }`}
                  >
                    {isChecked && <Check size={14} strokeWidth={4} />}
                  </div>
                  <span
                    className={`text-lg font-bold transition-all ${
                      isChecked ? 'text-ink-muted line-through' : 'text-ink-body'
                    }`}
                  >
                    {text}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="py-16 px-8 rounded-[2.5rem] bg-charcoal-100 border border-dashed border-chrome-line flex flex-col items-center text-center">
          <UtensilsCrossed size={32} className="text-icon-affordance mb-4" />
          <p className="text-ink-muted font-semibold max-w-xs">
            {t(
              'cook.extractionInProgress',
              "Extraction in progress... we're still identifying the exact quantities."
            )}
          </p>
        </div>
      )}
    </div>
  );
}
