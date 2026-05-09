'use client';

import { useEffect, useState, useRef } from 'react';
import { X, Clock, ChefHat, ArrowRightLeft, Trash2, Eye, Check } from 'lucide-react';
import { getRecipe, updateRecipe, deleteRecipe, type Recipe } from '@/lib/api/recipes';
import { t } from '@/locales';

const RATING_OPTIONS = [
  { value: 1, emoji: '👎', label: 'Dislike' },
  { value: 2, emoji: '👍', label: 'Like' },
  { value: 3, emoji: '❤️', label: 'Love' },
] as const;

interface RecipeDetailSheetProps {
  recipeId: string;
  plannerDayLabel: string | null;
  onClose: () => void;
  onUseForDay: (recipe: Recipe) => Promise<void>;
  onFindSimilar: (recipeId: string) => void;
}

export function RecipeDetailSheet({
  recipeId,
  plannerDayLabel,
  onClose,
  onUseForDay,
  onFindSimilar,
}: RecipeDetailSheetProps) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState(0);
  const [isDiscoverable, setIsDiscoverable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingAction, setIsSavingAction] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let isActive = true;

    void (async () => {
      setIsLoading(true);
      try {
        const nextRecipe = await getRecipe(recipeId);
        if (!isActive) return;
        setRecipe(nextRecipe);
        setNotes(nextRecipe.notes ?? '');
        setRating(nextRecipe.rating ?? 0);
        setIsDiscoverable(nextRecipe.isDiscoverable ?? false);
      } catch (error) {
        if (!isActive) return;
        console.error('Failed to load recipe detail', error);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [recipeId]);

  useEffect(() => {
    if (!recipe) return;
    if ((recipe.notes ?? '') === notes) return;

    const timeoutId = window.setTimeout(() => {
      void updateRecipe(recipe.id, { notes });
      setNotesSaved(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setNotesSaved(false), 2000);
    }, 800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [notes, recipe]);

  const handleRatingChange = async (nextRating: number) => {
    // Toggle off if tapping the already-selected rating
    const newValue = rating === nextRating ? 0 : nextRating;
    setRating(newValue);
    if (!recipe) return;
    await updateRecipe(recipe.id, { rating: newValue });
  };

  const handleToggleDiscovery = async () => {
    if (!recipe) return;
    const next = !isDiscoverable;
    setIsDiscoverable(next);
    await updateRecipe(recipe.id, { isDiscoverable: next });
  };

  const handleUseRecipe = async () => {
    if (!recipe) return;
    setIsSavingAction(true);
    try {
      await onUseForDay(recipe);
    } finally {
      setIsSavingAction(false);
    }
  };

  const handleMoveToBin = async () => {
    if (!recipe) return;
    setIsSavingAction(true);
    try {
      await deleteRecipe(recipe.id);
      onClose();
    } catch (error) {
      console.error('Failed to move recipe to bin', error);
    } finally {
      setIsSavingAction(false);
    }
  };

  const primaryActionTestId = plannerDayLabel ? 'action-use-for-day' : 'action-save-for-tonight';
  const primaryActionLabel = plannerDayLabel
    ? t('recipes.useForDay', `Use for ${plannerDayLabel}`)
    : t('recipes.saveForTonight', 'Save for Tonight');

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center px-4 pb-4 sm:items-center">
      <button
        type="button"
        aria-label={t('common.close', 'Close')}
        title={t('common.close', 'Close')}
        onClick={onClose}
        className="absolute inset-0 bg-charcoal/45 backdrop-blur-sm"
      />

      <div
        data-testid="recipe-detail-sheet"
        className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2.5rem] border border-white/40 bg-[rgba(253,252,240,0.96)] shadow-[0_24px_80px_-24px_rgba(55,40,30,0.45)]"
      >
        <div className="flex items-center justify-between px-6 pt-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-terracotta/70">
              {t('recipes.detailTitle', 'Recipe detail')}
            </p>
          </div>
          <button
            type="button"
            data-testid="action-close-sheet"
            aria-label={t('common.close', 'Close')}
            title={t('common.close', 'Close')}
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-charcoal/5 text-charcoal/70 transition hover:bg-charcoal/10"
          >
            <X size={18} />
          </button>
        </div>

        {isLoading || !recipe ? (
          <div className="px-6 py-10 text-sm font-medium text-charcoal/60">
            {t('recipes.loadingDetail', 'Loading recipe...')}
          </div>
        ) : (
          <div className="overflow-y-auto px-6 pb-6 pt-4">
            <div className="relative mb-5 aspect-[16/9] overflow-hidden rounded-[2rem] bg-charcoal/5">
              <img
                src={recipe.imageUrl || '/placeholder-recipe.jpg'}
                alt={recipe.name}
                className="absolute inset-0 h-full w-full object-cover select-none pointer-events-none"
              />
            </div>

            <div className="mb-5 flex flex-col gap-3">
              <h2
                data-testid="recipe-detail-name"
                className="text-3xl font-black tracking-tighter text-charcoal"
              >
                {recipe.name}
              </h2>
              <div className="flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-widest text-charcoal/55">
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 shadow-sm">
                  <Clock size={12} /> {recipe.totalTime}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 shadow-sm">
                  <ChefHat size={12} /> {recipe.difficulty}
                </span>
              </div>
              {recipe.description && (
                <p className="text-sm leading-6 text-charcoal/70">{recipe.description}</p>
              )}
            </div>

            <div className="mb-5 grid gap-5 md:grid-cols-[1.1fr_0.9fr]">
              <div>
                <h3 className="mb-2 text-sm font-black uppercase tracking-[0.18em] text-charcoal/45">
                  {t('recipes.ingredients', 'Ingredients')}
                </h3>
                <ul className="space-y-2 text-sm text-charcoal/80">
                  {(recipe.ingredients || []).map((ingredient) => (
                    <li key={ingredient} className="rounded-2xl bg-white/85 px-4 py-2 shadow-sm">
                      {ingredient}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <label
                      htmlFor="recipe-notes-input"
                      className="text-sm font-black uppercase tracking-[0.18em] text-charcoal/45"
                    >
                      {t('recipes.notes', 'Notes')}
                    </label>
                    {notesSaved && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-sage animate-in fade-in duration-200">
                        <Check size={11} strokeWidth={3} />
                        Saved
                      </span>
                    )}
                  </div>
                  <textarea
                    id="recipe-notes-input"
                    data-testid="recipe-notes-input"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    className="min-h-28 w-full rounded-[1.5rem] border border-charcoal/10 bg-white/90 px-4 py-3 text-sm text-charcoal shadow-sm outline-none transition focus:border-terracotta/30"
                  />
                </div>

                <div>
                  <p className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-charcoal/45">
                    {t('recipes.rating', 'Rating')}
                  </p>
                  <div
                    data-testid="recipe-rating-selector"
                    className="flex justify-around items-center"
                  >
                    {RATING_OPTIONS.map(({ value, emoji, label }) => {
                      const isSelected = rating === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          aria-label={label}
                          aria-pressed={isSelected}
                          onClick={() => void handleRatingChange(value)}
                          className={[
                            'flex flex-col items-center gap-1.5 rounded-[1.5rem] px-4 py-3 transition-all duration-200',
                            isSelected
                              ? 'bg-white shadow-md scale-110'
                              : 'opacity-35 hover:opacity-70',
                          ].join(' ')}
                        >
                          <span className="text-3xl" aria-hidden>{emoji}</span>
                          <span className={[
                            'text-[9px] font-black uppercase tracking-wider',
                            isSelected ? 'text-charcoal' : 'text-charcoal/50',
                          ].join(' ')}>
                            {label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-charcoal/8 pt-5 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                data-testid={primaryActionTestId}
                onClick={() => void handleUseRecipe()}
                disabled={isSavingAction}
                className="inline-flex items-center justify-center rounded-full bg-terracotta px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-terracotta/90 disabled:opacity-60"
              >
                {primaryActionLabel}
              </button>

              <button
                type="button"
                data-testid="action-find-similar"
                onClick={() => onFindSimilar(recipe.id)}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-charcoal/10 bg-white px-5 py-3 text-sm font-black text-charcoal shadow-sm"
              >
                <ArrowRightLeft size={16} />
                {t('recipes.findSimilar', 'Find Similar')}
              </button>

              <button
                type="button"
                data-testid="action-toggle-discovery"
                onClick={() => void handleToggleDiscovery()}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-charcoal/10 bg-white px-5 py-3 text-sm font-black text-charcoal shadow-sm"
              >
                <Eye size={16} />
                {isDiscoverable
                  ? t('recipes.hideFromDiscovery', 'Hide from Discovery')
                  : t('recipes.showInDiscovery', 'Show in Discovery')}
              </button>

              <button
                type="button"
                data-testid="action-move-to-bin"
                onClick={() => void handleMoveToBin()}
                disabled={isSavingAction}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-charcoal/10 bg-white px-5 py-3 text-sm font-black text-charcoal shadow-sm disabled:opacity-60"
              >
                <Trash2 size={16} />
                {t('recipes.moveToBin', 'Move to Bin')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
