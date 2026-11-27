import { Button } from '@/components/ui/button';
import { PreparationStatus } from '@/components/planner/PreparationStatus';
import { ingredientProjectionText } from '@/lib/ingredient-presentation';
import { t, tWithVars } from '@/locales';
import {
  RecipeEditorIngredientsSection,
  type RecipeEditorIngredientsSectionProps,
} from './RecipeEditorIngredientsSection';
import type { IngredientContext, PreviewPortions, Recipe } from '@/lib/api/recipes';
import type { IngredientPreview, IngredientProjection } from '@/lib/api/generated/models/index';

export interface RecipePortionsAndIngredientsSectionProps {
  recipe: Recipe;
  isEditing: boolean;
  portionsHeadingRef: React.RefObject<HTMLHeadingElement | null>;
  displayedServings: number | null | undefined;
  previewTarget: PreviewPortions | null;
  showingOriginalEvidence: boolean;
  readingBasisServings: number | null | undefined;
  headingServings: number | null | undefined;
  preview?: IngredientPreview;
  previewError: boolean;
  ingredientContext?: IngredientContext;
  projection?: IngredientProjection;
  projectionError: boolean;
  displayedProjection?: IngredientPreview | IngredientProjection;
  originalIngredientTexts: string[];
  sourceDayLabel?: string;
  hasBeginPlanning: boolean;
  onSelectPreviewTarget: (target: PreviewPortions) => void;
  onSetOriginalYield: () => void;
  onRetryPreview: () => void;
  onRetryProjection: () => void;
  editorIngredientsProps: RecipeEditorIngredientsSectionProps;
}

export function RecipePortionsAndIngredientsSection({
  recipe,
  isEditing,
  portionsHeadingRef,
  displayedServings,
  previewTarget,
  showingOriginalEvidence,
  readingBasisServings,
  headingServings,
  preview,
  previewError,
  ingredientContext,
  projection,
  projectionError,
  displayedProjection,
  originalIngredientTexts,
  sourceDayLabel,
  hasBeginPlanning,
  onSelectPreviewTarget,
  onSetOriginalYield,
  onRetryPreview,
  onRetryProjection,
  editorIngredientsProps,
}: RecipePortionsAndIngredientsSectionProps) {
  return (
    <div>
      <h3
        ref={portionsHeadingRef}
        tabIndex={-1}
        className="mb-4 flex flex-wrap items-center gap-2 text-xl font-semibold text-ink-body focus-visible:outline-2 focus-visible:outline-ink-body"
      >
        <span className="max-w-full break-words">{t('recipes.ingredients', 'Ingredients')}</span>{' '}
        {displayedServings != null && displayedServings > 0 && (
          <span
            data-testid="recipe-servings"
            className="inline-block max-w-full shrink-0 rounded-full bg-charcoal/5 px-2 py-1 text-xs font-medium normal-case tracking-normal text-ink-body"
          >
            {tWithVars(
              displayedServings === 1 ? 'recipes.serving' : 'recipes.servings',
              displayedServings === 1 ? '{{count}} serving' : '{{count}} servings',
              { count: displayedServings }
            )}
          </span>
        )}
      </h3>
      {!isEditing && (
        <div className="mb-4 text-sm">
          {(previewTarget || showingOriginalEvidence) &&
            readingBasisServings != null &&
            readingBasisServings > 0 && (
              <p data-testid="recipe-original-yield" className="mb-2 text-ink-muted">
                {tWithVars(
                  readingBasisServings === 1
                    ? 'recipes.originalBasisSingular'
                    : 'recipes.originalBasis',
                  readingBasisServings === 1
                    ? 'Original recipe: {{count}} serving'
                    : 'Original recipe: {{count}} servings',
                  { count: readingBasisServings }
                )}
              </p>
            )}
          {recipe.servings != null && recipe.servings > 0 ? (
            <div
              role="group"
              aria-label={t('recipes.previewLabel', 'Preview portions')}
              className="flex flex-wrap items-center gap-2"
            >
              <span className="mr-1 font-semibold">
                {t('recipes.previewLabel', 'Preview portions')}
              </span>
              {([2, 4, 6] as const).map((target) => {
                const pressed =
                  previewTarget === target ||
                  (!previewTarget && !showingOriginalEvidence && headingServings === target);
                return (
                  <button
                    key={target}
                    type="button"
                    aria-label={tWithVars(
                      'recipes.previewCountName',
                      'Preview {{count}} portions',
                      { count: target }
                    )}
                    aria-pressed={pressed}
                    onClick={() => onSelectPreviewTarget(target)}
                    className={`min-h-[48px] min-w-[48px] rounded-xl border px-3 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body ${pressed ? 'border-hearth-line bg-terracotta-50 text-hearth-ink' : 'border-chrome-line bg-white text-ink-body'}`}
                  >
                    {target}
                  </button>
                );
              })}
            </div>
          ) : (
            <button
              type="button"
              disabled={Boolean(ingredientContext && !projection)}
              className="min-h-[48px] text-garden-ink underline underline-offset-4"
              onClick={onSetOriginalYield}
            >
              {t('recipes.setOriginalYield', 'Set recipe portions')}
            </button>
          )}
          {previewTarget && (
            <div className="mt-2">
              {!preview && !previewError && (
                <p role="status">{t('recipes.previewLoading', 'Loading preview…')}</p>
              )}
              {previewError && (
                <div
                  role="alert"
                  data-testid="recipe-preview-error"
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-hearth-line bg-terracotta-50 px-4 py-3 text-sm text-ink-body shadow-sm"
                >
                  <p className="min-w-0 flex-1 font-medium text-hearth-ink">
                    {t('recipes.previewFailed', 'Preview could not load.')}
                  </p>
                  <Button type="button" variant="primary" size="md" onClick={onRetryPreview}>
                    {t('common.retry', 'Retry')}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {!isEditing && sourceDayLabel && hasBeginPlanning && (
        <p data-testid="recipe-portion-context" className="mb-3 text-sm text-ink-muted">
          {sourceDayLabel}
        </p>
      )}
      {ingredientContext && !isEditing && (
        <div className="mb-3 text-sm text-ink-muted">
          {projection?.preparation && (
            <>
              <PreparationStatus preparation={projection.preparation} />
              {projection.preparation.servings != null && (
                <p data-testid="recipe-prepared-portions">
                  {tWithVars('recipes.preparedPortions', 'Prepared {{count}} portions', {
                    count: projection.preparation.servings,
                  })}
                </p>
              )}
            </>
          )}
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
          {projection?.targetServings == null && projection && (
            <p>
              {projection.editable === false
                ? t('recipes.originalQuantities', 'Original recipe quantities are shown.')
                : t(
                    'recipes.portionsUnconfigured',
                    'Usual portions are not set. Original quantities are shown.'
                  )}
            </p>
          )}
        </div>
      )}
      {isEditing ? (
        <RecipeEditorIngredientsSection {...editorIngredientsProps} />
      ) : (
        <ul
          data-testid={
            previewTarget
              ? 'recipe-ingredient-preview'
              : ingredientContext
                ? 'recipe-ingredient-projection'
                : undefined
          }
          className="divide-y divide-garden-line text-base leading-relaxed text-ink-body"
        >
          {previewTarget || (ingredientContext && !showingOriginalEvidence)
            ? displayedProjection?.lines?.map((line, index) => (
                <li key={index} className="py-3">
                  {ingredientProjectionText(line)}
                </li>
              ))
            : originalIngredientTexts.map((ingredient, index) => (
                <li key={index} className="py-3">
                  {ingredient}
                </li>
              ))}
        </ul>
      )}
    </div>
  );
}
