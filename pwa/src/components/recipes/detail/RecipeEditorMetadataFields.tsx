import { formatRecipeTime, minutesToIsoDuration } from '@/lib/duration';
import { t } from '@/locales';
import { MEAL_TYPE_OPTIONS } from './useRecipeInlineEditor';
import type { UpdateRecipeDto_mealTypes } from '@/lib/api/generated/models/index';

export interface RecipeEditorMetadataFieldsProps {
  isSavingRecipe: boolean;
  draftName: string;
  onDraftNameChange: (value: string) => void;
  draftCuisineType: string;
  onDraftCuisineTypeChange: (value: string) => void;
  draftTotalTime: string;
  onDraftTotalTimeChange: (value: string) => void;
  totalTimeInvalid: boolean;
  parsedDraftTotalTimeMinutes: number | null;
  draftMealTypes: UpdateRecipeDto_mealTypes[];
  onToggleMealType: (mealType: UpdateRecipeDto_mealTypes) => void;
  draftDescription: string;
  onDraftDescriptionChange: (value: string) => void;
}

export function RecipeEditorMetadataFields({
  isSavingRecipe,
  draftName,
  onDraftNameChange,
  draftCuisineType,
  onDraftCuisineTypeChange,
  draftTotalTime,
  onDraftTotalTimeChange,
  totalTimeInvalid,
  parsedDraftTotalTimeMinutes,
  draftMealTypes,
  onToggleMealType,
  draftDescription,
  onDraftDescriptionChange,
}: RecipeEditorMetadataFieldsProps) {
  return (
    <>
      <label className="grid gap-2">
        <span className="text-sm font-semibold text-ink-body">{t('recipes.name', 'Name')}</span>
        <input
          data-testid="recipe-edit-name-input"
          disabled={isSavingRecipe}
          value={draftName}
          onChange={(event) => onDraftNameChange(event.target.value)}
          className="w-full rounded-[1.25rem] border border-chrome-line bg-white/90 px-4 py-3 text-xl font-black text-ink-body shadow-sm outline-none transition focus:border-hearth-line"
        />
      </label>
      <div className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-ink-body">
              {t('recipes.cuisineType', 'Cuisine')}
            </span>
            <input
              data-testid="recipe-edit-cuisine-input"
              disabled={isSavingRecipe}
              value={draftCuisineType}
              onChange={(event) => onDraftCuisineTypeChange(event.target.value)}
              className="min-h-12 w-full px-4 py-2.5 rounded-xl border border-chrome-line bg-white text-ink-body focus:border-garden-line focus:outline-none text-sm transition-all duration-200"
            />
          </label>
          <div className="grid gap-2">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-ink-body">
                {t('recipes.totalTimeLabel', 'Time (minutes)')}
              </span>
              <input
                data-testid="recipe-edit-total-time-input"
                disabled={isSavingRecipe}
                type="text"
                inputMode="numeric"
                value={draftTotalTime}
                onChange={(event) => onDraftTotalTimeChange(event.target.value)}
                aria-invalid={totalTimeInvalid || undefined}
                aria-describedby={totalTimeInvalid ? 'recipe-total-time-error' : undefined}
                placeholder="35"
                className="min-h-12 w-full px-4 py-2.5 rounded-xl border border-chrome-line bg-white text-ink-body focus:border-garden-line focus:outline-none text-sm transition-all duration-200"
              />
            </label>
            {totalTimeInvalid && (
              <p
                id="recipe-total-time-error"
                data-testid="recipe-edit-total-time-error"
                className="break-words text-sm text-hearth-ink"
              >
                {t('recipes.totalTimeInvalid', 'Enter a whole number of minutes from 1 to 10080.')}
              </p>
            )}
            {!totalTimeInvalid && parsedDraftTotalTimeMinutes !== null && (
              <p className="text-xs text-ink-muted">
                {formatRecipeTime(minutesToIsoDuration(parsedDraftTotalTimeMinutes))}
              </p>
            )}
          </div>
        </div>
        <div className="grid gap-2">
          <span className="text-sm font-semibold text-ink-body">
            {t('recipes.mealTypes', 'Meal types')}
          </span>
          <div className="flex flex-wrap gap-2">
            {MEAL_TYPE_OPTIONS.map((mealType) => {
              const isSelected = draftMealTypes.includes(mealType);
              return (
                <button
                  key={mealType}
                  type="button"
                  data-testid={`recipe-edit-meal-type-pill-${mealType.toLowerCase()}`}
                  disabled={isSavingRecipe}
                  aria-pressed={isSelected}
                  onClick={() => onToggleMealType(mealType)}
                  className={
                    isSelected
                      ? 'min-h-12 px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 bg-garden-fill text-white shadow-md active:scale-95'
                      : 'min-h-12 px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 bg-white border border-chrome-line text-ink-muted hover:bg-cream-100 active:scale-95'
                  }
                >
                  {mealType}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <label className="grid gap-2">
        <span className="text-sm font-semibold text-ink-body">
          {t('recipes.description', 'Description')}
        </span>
        <textarea
          data-testid="recipe-edit-description-input"
          disabled={isSavingRecipe}
          value={draftDescription}
          onChange={(event) => onDraftDescriptionChange(event.target.value)}
          className="min-h-24 w-full rounded-[1.25rem] border border-chrome-line bg-white/90 px-4 py-3 text-sm leading-6 text-ink-body shadow-sm outline-none transition focus:border-hearth-line"
        />
      </label>
    </>
  );
}
