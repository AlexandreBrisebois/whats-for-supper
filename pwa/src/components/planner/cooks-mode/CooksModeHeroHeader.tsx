import { useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { ExternalLink, File, Flag, Images, Layers3, UtensilsCrossed, X } from 'lucide-react';
import type { Recipe, RecipeImportIssueReason } from '@/lib/api/recipes';
import { getImageUrl } from '@/lib/imageUtils';
import { t } from '@/locales';
import type { CookingViewMode, CooksModeRecipeSummary } from './types';

export interface CooksModeHeroHeaderProps {
  initialRecipe: CooksModeRecipeSummary;
  recipeDetails: Recipe | null;
  cookingViewMode: CookingViewMode;
  isEditing: boolean;
  isCompleting: boolean;
  hasInstructions: boolean;
  isPrepStep: boolean;
  stackedLayout: boolean;
  focusedEdit: ReactNode;
  originalPending: boolean;
  originalActionRef: RefObject<HTMLButtonElement | null>;
  showDetailId: string | null;
  onOpenDetails: () => void;
  onChooseCookingView: (mode: CookingViewMode) => void;
  onOpenOriginals: () => void;
  onOpenReport: (reason: RecipeImportIssueReason) => void;
  onClose: () => void;
}

export function CooksModeHeroHeader({
  initialRecipe,
  recipeDetails,
  cookingViewMode,
  isEditing,
  isCompleting,
  hasInstructions,
  isPrepStep,
  stackedLayout,
  focusedEdit,
  originalPending,
  originalActionRef,
  showDetailId,
  onOpenDetails,
  onChooseCookingView,
  onOpenOriginals,
  onOpenReport,
  onClose,
}: CooksModeHeroHeaderProps) {
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const originalUrl = recipeDetails?.sourceType === 'url' ? recipeDetails.sourceUrl : null;
  const hasOriginal = !!originalUrl || (recipeDetails?.imageCount ?? 0) > 0;

  return (
    <div
      data-testid="cooks-mode-hero"
      className="relative grid w-full shrink-0 grid-cols-1 grid-rows-[minmax(9.75rem,auto)_auto] border-b border-charcoal/5 md:flex md:h-full md:w-[40%] md:flex-col md:border-b-0 md:border-r"
    >
      <div
        data-testid="cooks-mode-photo"
        className="relative col-start-1 row-start-1 min-h-34 overflow-hidden md:absolute md:inset-0"
      >
        <button
          type="button"
          aria-label={t('cook.openRecipeDetails', 'Open recipe details')}
          onClick={onOpenDetails}
          className="absolute inset-0 z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-terracotta"
        />
        {initialRecipe.image && failedPhoto !== initialRecipe.image ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={getImageUrl(initialRecipe.image)}
            onError={() => setFailedPhoto(initialRecipe.image)}
            alt={initialRecipe.name || 'Recipe'}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-charcoal/5">
            <UtensilsCrossed size={48} className="text-charcoal/10" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-charcoal/95 via-charcoal/80 via-[calc(100%_-_4rem)] to-charcoal/20 md:via-50% md:via-charcoal/35 md:to-transparent" />
      </div>
      <div className="pointer-events-none relative z-20 col-start-1 row-start-1 self-end px-4 pb-3 pt-16 md:mt-auto md:min-h-0 md:overflow-y-auto md:self-auto md:px-8 md:pb-0 md:pt-20">
        <p className="mb-2 hidden text-xs font-semibold text-white/90 md:block">
          {t('cook.cooksMode', "Cook's mode")}
        </p>
        <h2
          data-testid="cooks-mode-recipe-name"
          className="font-heading break-words text-xl font-bold leading-tight text-white md:rounded-sm md:bg-charcoal/65 md:px-1 md:text-3xl md:drop-shadow-md"
        >
          {initialRecipe.name || t('cook.untitledRecipe', 'Untitled Recipe')}
        </h2>
      </div>
      <div
        data-testid="cooks-mode-header-controls"
        className="relative z-20 flex min-h-14 flex-wrap items-center gap-2 bg-cream px-4 py-1 md:mx-8 md:mb-6 md:mt-3 md:shrink-0 md:bg-transparent md:p-0"
      >
        <div
          role="group"
          aria-label={t('cook.view', 'View')}
          data-testid="cooking-view-toggle"
          onClick={(event) => event.stopPropagation()}
          className="relative z-20 inline-flex min-h-12 shrink-0 rounded-full border border-white/40 bg-white/90 p-0.5 text-ink-body shadow-md backdrop-blur-md"
        >
          {(['step-by-step', 'all-steps'] as const).map((mode) => {
            const selected = cookingViewMode === mode;
            const label =
              mode === 'all-steps'
                ? t('cook.viewAllSteps', 'All steps')
                : t('cook.viewStepByStep', 'Step by step');
            return (
              <button
                key={mode}
                type="button"
                data-testid={`cooking-view-${mode}`}
                aria-label={label}
                aria-pressed={selected}
                disabled={isEditing || isCompleting}
                title={
                  isEditing
                    ? t('cook.viewEditBlocked', 'Save or cancel your edit to change view.')
                    : label
                }
                onClick={() => onChooseCookingView(mode)}
                className={`inline-flex h-[48px] w-[48px] items-center justify-center rounded-full transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body disabled:cursor-not-allowed disabled:opacity-60 ${
                  selected
                    ? 'bg-sage-50 text-garden-ink shadow-sm'
                    : 'text-ink-muted hover:bg-white hover:text-ink-body'
                }`}
              >
                {mode === 'all-steps' ? (
                  <File size={20} aria-hidden="true" />
                ) : (
                  <Layers3 size={20} aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>

        {((stackedLayout && focusedEdit) || hasOriginal) && (
          <div className="ml-auto flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2 md:ml-0 md:justify-start">
            {stackedLayout && focusedEdit}
            {hasOriginal && (
              <button
                type="button"
                data-testid="cooks-mode-original"
                ref={originalActionRef}
                disabled={originalPending}
                aria-busy={originalPending}
                title={originalPending ? t('common.saving', 'Saving') : undefined}
                onClick={(event) => {
                  event.stopPropagation();
                  if (originalPending) return;
                  if (originalUrl) {
                    if (recipeDetails?.id === initialRecipe.id)
                      window.open(originalUrl, '_blank', 'noopener,noreferrer');
                  } else onOpenOriginals();
                }}
                className="relative z-20 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-chrome-line bg-white px-3 py-2 text-sm font-semibold text-ink-body shadow-sm hover:bg-cream active:bg-charcoal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body disabled:cursor-wait disabled:opacity-60"
              >
                {originalUrl ? (
                  <ExternalLink size={18} aria-hidden="true" />
                ) : (
                  <Images size={18} aria-hidden="true" />
                )}
                {t('recipes.viewOriginal', 'View Original')}
              </button>
            )}
          </div>
        )}
      </div>
      <div
        data-testid="cooks-mode-top-actions"
        className="absolute right-4 top-4 z-30 flex items-center gap-2"
      >
        {hasInstructions && !isEditing && recipeDetails?.canReimport && (
          <button
            type="button"
            data-testid={isPrepStep ? 'cooks-mode-report-ingredients' : 'cooks-mode-report-steps'}
            aria-label={isPrepStep ? 'Report issue with ingredients' : 'Report issue with steps'}
            onClick={(event) => {
              event.stopPropagation();
              onOpenReport(isPrepStep ? 'ingredients' : 'steps');
            }}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-chrome-line bg-white/95 text-hearth-ink shadow-md transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
          >
            <Flag size={20} aria-hidden="true" />
          </button>
        )}
        {!showDetailId && (
          <button
            data-testid="close-cooks-mode"
            aria-label="Close cook's mode"
            title="Close cook's mode"
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-chrome-line bg-white/95 text-ink-body shadow-md transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
          >
            <X size={20} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
