import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RecipeRatingControl } from '../RecipeRatingControl';
import { DiscoveryToggleCard } from '../DiscoveryToggleCard';
import { editRecipeNotes, retryRecipeNotes } from '@/store/recipeNotesStore';
import { t } from '@/locales';

export interface RecipeNotesAndParticipationSectionProps {
  recipeId: string;
  isEditing: boolean;
  rating: number;
  onRatingChange: (next: number) => void;
  notes: string;
  notesStatus?: string;
  notesSaved: boolean;
  isDiscoverable: boolean;
  isUpdatingDiscovery: boolean;
  onToggleDiscovery: () => Promise<void>;
  editError: string | null;
}

export function RecipeNotesAndParticipationSection({
  recipeId,
  isEditing,
  rating,
  onRatingChange,
  notes,
  notesStatus,
  notesSaved,
  isDiscoverable,
  isUpdatingDiscovery,
  onToggleDiscovery,
  editError,
}: RecipeNotesAndParticipationSectionProps) {
  return (
    <>
      <section className="mt-8" aria-labelledby="recipe-rating-heading">
        <h3 id="recipe-rating-heading" className="mb-3 text-xl font-semibold text-ink-body">
          {t('recipes.rating', 'Rating')}
        </h3>
        <RecipeRatingControl
          value={rating}
          onChange={onRatingChange}
          disabled={isEditing}
          testIdPrefix="recipe-rating"
          selectorTestId="recipe-rating-selector"
          allowClear={false}
        />
      </section>
      <section
        tabIndex={-1}
        role="region"
        aria-label={t('recipes.familyNotes', 'Family notes')}
        data-testid="recipe-family-notes"
        className="mt-8 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-garden-ink"
      >
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <label htmlFor="recipe-notes-input" className="text-xl font-semibold text-ink-body">
              {t('recipes.notes', 'Notes')}
            </label>
            {(notesStatus === 'pending' || notesStatus === 'saving') && (
              <span role="status" className="text-xs text-ink-muted">
                {t('recipes.notesSaving', 'Saving…')}
              </span>
            )}
            {notesSaved && (
              <span
                data-testid="recipe-notes-saved"
                role="status"
                className="flex items-center gap-1 text-sm font-medium text-garden-ink"
              >
                <Check size={11} strokeWidth={3} />
                {t('recipes.notesSaved', 'Saved')}
              </span>
            )}
          </div>
          <textarea
            id="recipe-notes-input"
            data-testid="recipe-notes-input"
            aria-describedby={notesStatus === 'error' ? 'recipe-notes-error' : undefined}
            value={notes}
            onChange={(event) => {
              editRecipeNotes(recipeId, event.target.value);
            }}
            className="min-h-28 w-full rounded-[1.5rem] border border-chrome-line bg-white/90 px-4 py-3 text-sm text-ink-body shadow-sm outline-none transition focus:border-hearth-line focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hearth-fill"
          />
          {notesStatus === 'error' && (
            <div
              id="recipe-notes-error"
              role="alert"
              className="mt-2 flex flex-wrap items-center gap-3 rounded-2xl border border-hearth-line bg-terracotta-50 p-3 text-sm text-ink-body"
            >
              <span className="min-w-0 flex-1">
                {t('recipes.notesError', 'Notes could not be saved. Your draft is retained.')}
              </span>
              <Button
                type="button"
                variant="primary"
                size="md"
                data-testid="recipe-notes-retry"
                onClick={() => void retryRecipeNotes(recipeId)}
              >
                {t('recipes.notesRetry', 'Retry save')}
              </Button>
            </div>
          )}
        </div>
      </section>
      <div className="mt-8">
        {!isEditing && (
          <DiscoveryToggleCard
            compactReading
            descriptionClassName="text-ink-muted"
            isDiscoverable={isDiscoverable}
            onToggle={onToggleDiscovery}
            isLoading={isUpdatingDiscovery}
          />
        )}
      </div>

      {editError && (
        <p
          role="alert"
          className="mb-4 rounded-2xl border border-hearth-line bg-terracotta-50 px-4 py-3 text-sm font-bold text-ink-body"
        >
          {editError}
        </p>
      )}
    </>
  );
}
