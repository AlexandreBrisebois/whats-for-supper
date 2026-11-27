import { Minus, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ingredientDraft, type IngredientDraft } from '@/lib/recipes/ingredient-draft';
import { t } from '@/locales';
import { StructuredIngredientDraftCard } from './StructuredIngredientDraftCard';

export interface RecipeEditorIngredientsSectionProps {
  servingsInputRef: React.RefObject<HTMLInputElement | null>;
  isSavingRecipe: boolean;
  draftServings: string;
  onDraftServingsChange: (value: string) => void;
  parsedDraftServings: number | null;
  servingsInvalid: boolean;
  structuredEditing: boolean;
  ingredientDrafts: IngredientDraft[];
  setIngredientDrafts: React.Dispatch<React.SetStateAction<IngredientDraft[]>>;
  preparedDraftsInvalid: boolean;
  draftIngredients: string[];
  setDraftIngredients: React.Dispatch<React.SetStateAction<string[]>>;
}

export function RecipeEditorIngredientsSection({
  servingsInputRef,
  isSavingRecipe,
  draftServings,
  onDraftServingsChange,
  parsedDraftServings,
  servingsInvalid,
  structuredEditing,
  ingredientDrafts,
  setIngredientDrafts,
  preparedDraftsInvalid,
  draftIngredients,
  setDraftIngredients,
}: RecipeEditorIngredientsSectionProps) {
  return (
    <>
      <div className="mb-3 min-w-0">
        <p className="mb-2 text-sm text-ink-muted">
          {t(
            'recipes.yieldCorrectionHint',
            'This updates the saved recipe and may change your shopping list.'
          )}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label
            htmlFor="recipe-edit-servings"
            className="shrink-0 text-sm font-semibold text-ink-body"
          >
            {t('recipes.servingsLabel', 'Servings')}
          </label>
          <div className="ml-auto inline-flex max-w-full min-w-0 shrink-0 items-center rounded-full border border-chrome-line bg-white/90 shadow-sm">
            <button
              type="button"
              data-testid="recipe-edit-servings-decrement"
              aria-label={t('recipes.fewerServings', 'Decrease servings')}
              title={t('recipes.fewerServings', 'Decrease servings')}
              disabled={isSavingRecipe || parsedDraftServings === null || parsedDraftServings <= 1}
              onClick={() => {
                if (parsedDraftServings !== null && parsedDraftServings > 1) {
                  onDraftServingsChange(String(parsedDraftServings - 1));
                }
              }}
              className="inline-flex min-h-[48px] min-w-[48px] shrink-0 items-center justify-center rounded-l-full text-ink-body transition hover:bg-charcoal/5 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
            >
              <Minus size={16} aria-hidden="true" />
            </button>
            <input
              id="recipe-edit-servings"
              ref={servingsInputRef}
              data-testid="recipe-edit-servings-input"
              disabled={isSavingRecipe}
              type="text"
              inputMode="numeric"
              value={draftServings}
              onChange={(event) => onDraftServingsChange(event.target.value)}
              aria-invalid={servingsInvalid}
              aria-describedby={servingsInvalid ? 'recipe-servings-error' : undefined}
              className="min-h-[48px] min-w-[48px] w-14 bg-transparent text-center text-sm font-semibold text-ink-body outline-none"
            />
            <button
              type="button"
              data-testid="recipe-edit-servings-increment"
              aria-label={t('recipes.moreServings', 'Increase servings')}
              title={t('recipes.moreServings', 'Increase servings')}
              disabled={
                isSavingRecipe ||
                (draftServings !== '' && parsedDraftServings === null) ||
                (parsedDraftServings !== null && parsedDraftServings >= 2147483647)
              }
              onClick={() =>
                onDraftServingsChange(
                  parsedDraftServings === null ? '1' : String(parsedDraftServings + 1)
                )
              }
              className="inline-flex min-h-[48px] min-w-[48px] shrink-0 items-center justify-center rounded-r-full text-ink-body transition hover:bg-charcoal/5 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
            >
              <Plus size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
        {servingsInvalid && (
          <p id="recipe-servings-error" className="mt-1 break-words text-sm text-hearth-ink">
            {t('recipes.servingsInvalid', 'Enter a whole number from 1 to 2147483647.')}
          </p>
        )}
      </div>

      <div className="space-y-2">
        {structuredEditing
          ? ingredientDrafts.map((row, index) => (
              <StructuredIngredientDraftCard
                key={row.key}
                row={row}
                index={index}
                isSavingRecipe={isSavingRecipe}
                onChange={(patch) =>
                  setIngredientDrafts((rows) =>
                    rows.map((item) => (item.key === row.key ? { ...item, ...patch } : item))
                  )
                }
                onRemove={() =>
                  setIngredientDrafts((rows) => rows.filter((item) => item.key !== row.key))
                }
              />
            ))
          : draftIngredients.map((ingredient, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  data-testid={`recipe-edit-ingredient-${index}`}
                  disabled={isSavingRecipe}
                  aria-label={`Ingredient ${index + 1}`}
                  title={`Ingredient ${index + 1}`}
                  value={ingredient}
                  onChange={(event) =>
                    setDraftIngredients((current) =>
                      current.map((item, idx) => (idx === index ? event.target.value : item))
                    )
                  }
                  className="min-h-12 min-w-0 flex-1 rounded-2xl border border-chrome-line bg-white/90 px-4 py-2 text-sm text-ink-body shadow-sm outline-none transition focus:border-hearth-line"
                />
                <button
                  type="button"
                  data-testid={`recipe-remove-ingredient-${index}`}
                  disabled={isSavingRecipe}
                  aria-label={t('recipes.removeIngredient', 'Remove ingredient')}
                  onClick={() =>
                    setDraftIngredients((current) => current.filter((_, idx) => idx !== index))
                  }
                  className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-charcoal/5 text-icon-affordance hover:text-ink-body transition hover:bg-charcoal/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
        {structuredEditing && preparedDraftsInvalid && (
          <p
            role="alert"
            className="rounded-2xl border border-hearth-line bg-terracotta-50 px-4 py-3 text-sm font-medium text-hearth-ink"
          >
            {t(
              'recipes.ingredientInvalid',
              'Enter a description and a valid amount, or leave the amount blank.'
            )}
          </p>
        )}
        <Button
          type="button"
          variant="secondary"
          size="md"
          data-testid="recipe-add-ingredient"
          disabled={isSavingRecipe}
          onClick={() =>
            structuredEditing
              ? setIngredientDrafts((rows) => [...rows, ingredientDraft()])
              : setDraftIngredients((current) => [...current, ''])
          }
          className="gap-2 rounded-full border-chrome-line px-4 text-sm font-black text-ink-body shadow-sm hover:bg-cream"
        >
          <Plus size={16} />
          {t('recipes.addIngredient', 'Add ingredient')}
        </Button>
      </div>
    </>
  );
}
