import { Share2, Star, UtensilsCrossed, X } from 'lucide-react';
import { ActionGearMenu } from '../ActionGearMenu';
import { t } from '@/locales';
import type { IngredientContext, PreviewPortions, Recipe } from '@/lib/api/recipes';
import type { IngredientProjection } from '@/lib/api/generated/models/index';

export interface RecipeDetailToolbarProps {
  recipe: Recipe | null;
  isLoading: boolean;
  isEditing: boolean;
  isConfirmedPlanned: boolean;
  departureBlocked: boolean;
  isCurrentGoto: boolean;
  isSavingGoto: boolean;
  isSharingRecipe: boolean;
  isReindexing: boolean;
  reindexFeedback: 'queued' | 'error' | null;
  moveError: boolean;
  ingredientContext?: IngredientContext;
  projection?: IngredientProjection;
  previewTarget: PreviewPortions | null;
  showingOriginalEvidence: boolean;
  onOpenCooksMode: () => void;
  onToggleGoto: () => void;
  onShareRecipe: () => void;
  onEditRecipe: () => void;
  onOriginalQuantities: () => void;
  onResetView: () => void;
  onReindexRecipe: () => void;
  onMoveToBin: () => void;
  onOpenIssueReview: () => void;
  onCloseDetail: () => void;
}

export function RecipeDetailToolbar({
  recipe,
  isLoading,
  isEditing,
  isConfirmedPlanned,
  departureBlocked,
  isCurrentGoto,
  isSavingGoto,
  isSharingRecipe,
  isReindexing,
  reindexFeedback,
  moveError,
  ingredientContext,
  projection,
  previewTarget,
  showingOriginalEvidence,
  onOpenCooksMode,
  onToggleGoto,
  onShareRecipe,
  onEditRecipe,
  onOriginalQuantities,
  onResetView,
  onReindexRecipe,
  onMoveToBin,
  onOpenIssueReview,
  onCloseDetail,
}: RecipeDetailToolbarProps) {
  return (
    <>
      <div
        data-testid="recipe-detail-toolbar"
        className="shrink-0 flex flex-wrap items-center gap-[8px] border-b border-chrome-line px-[16px] py-[12px] md:px-8"
      >
        <div className="flex min-w-0 items-center gap-2">
          {!isLoading && recipe && !isEditing && (
            <button
              type="button"
              data-testid="action-cooks-mode"
              disabled={departureBlocked}
              onClick={onOpenCooksMode}
              className={[
                'inline-flex min-h-[48px] min-w-[48px] items-center justify-center gap-2 rounded-full px-[12px] py-[10px] text-sm font-semibold shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body disabled:opacity-60',
                isConfirmedPlanned
                  ? 'bg-hearth-fill text-white hover:bg-hearth-fill-hover'
                  : 'border border-chrome-line bg-white text-ink-body hover:bg-charcoal/5',
              ].join(' ')}
            >
              <UtensilsCrossed size={18} className="shrink-0" aria-hidden="true" />
              <span>{t('home.cook', 'Cook')}</span>
            </button>
          )}
          <p className="sr-only">{t('recipes.detailTitle', 'Recipe detail')}</p>
        </div>
        <div className="ml-auto flex min-w-0 max-w-full flex-wrap items-center justify-end gap-[8px]">
          {!isLoading && recipe && !isEditing && (
            <button
              type="button"
              data-testid={isCurrentGoto ? 'action-current-goto' : 'action-set-goto'}
              aria-label={
                isCurrentGoto
                  ? t('recipes.removeGoto', 'Remove from GOTO')
                  : t('recipes.setGoto', 'Set as GOTO')
              }
              title={
                isCurrentGoto
                  ? t('recipes.removeGoto', 'Remove from GOTO')
                  : t('recipes.setGoto', 'Set as GOTO')
              }
              aria-pressed={isCurrentGoto}
              onClick={onToggleGoto}
              disabled={isSavingGoto}
              className={[
                'inline-flex min-h-[48px] items-center justify-center gap-[6px] rounded-full border border-sunlight-line px-[12px] text-sm font-bold shadow-sm transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body disabled:cursor-default',
                isCurrentGoto
                  ? 'bg-ochre-100 text-sunlight-ink hover:bg-ochre-200'
                  : 'bg-ochre-50 text-sunlight-ink hover:bg-ochre-100',
              ].join(' ')}
            >
              <Star
                className="hidden min-[400px]:block"
                aria-hidden="true"
                size={15}
                fill={isCurrentGoto ? 'currentColor' : 'none'}
                strokeWidth={isCurrentGoto ? 2.8 : 2.4}
              />
              <span>GOTO</span>
            </button>
          )}

          {!isLoading &&
            recipe &&
            !isEditing &&
            recipe.imageUrl &&
            !recipe.imageUrl.includes('placeholder') &&
            recipe.isReady && (
              <button
                type="button"
                data-testid="recipe-share-btn"
                aria-label={t('recipes.shareRecipe', 'Share recipe')}
                title={t('recipes.shareRecipe', 'Share recipe')}
                onClick={onShareRecipe}
                disabled={isSharingRecipe}
                className="inline-flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-full border border-chrome-line bg-white text-ink-body shadow-sm transition hover:bg-charcoal/5"
              >
                <Share2 size={14} />
              </button>
            )}
          {recipe && !isEditing && (
            <fieldset disabled={isLoading} className="contents">
              <ActionGearMenu
                hasImportIssue={Boolean(recipe.importIssue)}
                onEdit={onEditRecipe}
                originalQuantitiesDisabled={Boolean(ingredientContext && !projection)}
                onOriginalQuantities={!showingOriginalEvidence ? onOriginalQuantities : undefined}
                onResetView={previewTarget || showingOriginalEvidence ? onResetView : undefined}
                onReindex={recipe.isReady ? onReindexRecipe : undefined}
                reindexing={isReindexing}
                onMoveToBin={onMoveToBin}
                onReportImportIssue={onOpenIssueReview}
              />
            </fieldset>
          )}
          <button
            type="button"
            data-testid="action-close-sheet"
            aria-label={t('common.close', 'Close')}
            title={t('common.close', 'Close')}
            onClick={onCloseDetail}
            className="inline-flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-full bg-charcoal/5 text-icon-affordance hover:text-ink-body transition hover:bg-charcoal/10 focus-visible:outline-2 focus-visible:outline-ink-body"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {moveError && (
        <p
          role="alert"
          className="mx-6 mt-4 rounded-2xl border border-hearth-line bg-terracotta-50 px-4 py-3 text-sm font-medium text-hearth-ink"
        >
          {t('recipes.moveToBinError', 'Could not move this recipe to the Recycle Bin. Try again.')}
        </p>
      )}
      {reindexFeedback === 'queued' && (
        <p
          role="status"
          data-testid="recipe-reindex-status"
          className="mx-6 mt-4 rounded-2xl border border-garden-line bg-sage-50 px-4 py-3 text-sm font-bold text-garden-ink"
        >
          {t('recipes.reindexQueued', 'Queued for search reindex.')}
        </p>
      )}
      {reindexFeedback === 'error' && (
        <p
          role="alert"
          data-testid="recipe-reindex-error"
          className="mx-6 mt-4 rounded-2xl border border-hearth-line bg-terracotta-50 px-4 py-3 text-sm font-medium text-hearth-ink"
        >
          {t('recipes.reindexError', 'Could not queue search reindex for this recipe. Try again.')}
        </p>
      )}
    </>
  );
}
