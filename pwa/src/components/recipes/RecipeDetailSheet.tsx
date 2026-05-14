'use client';

import { useEffect, useState, useRef } from 'react';
import {
  X,
  Clock,
  Search,
  Trash2,
  Check,
  Pencil,
  Plus,
  Save,
  Camera,
  RefreshCw,
  Star,
  Images,
  ExternalLink,
} from 'lucide-react';
import {
  getRecipe,
  updateRecipe,
  deleteRecipe,
  reimportRecipe,
  uploadRecipeOriginal,
  regenerateHero,
  type Recipe,
} from '@/lib/api/recipes';
import { t, tWithVars } from '@/locales';
import { formatRecipeTime } from '@/lib/duration';
import { useUiStore } from '@/store/uiStore';
import { useFamilyStore } from '@/store/familyStore';
import { getImageUrl } from '@/lib/imageUtils';
import { ActionGearMenu } from './ActionGearMenu';
import { DiscoveryToggleCard } from './DiscoveryToggleCard';
import { OriginalPhotosViewer } from './OriginalPhotosViewer';
import type { GoToListDto } from '@/lib/api/generated/models/index';

const GOTO_KEY = 'family_goto';

const RATING_OPTIONS = [
  { value: 1, emoji: '👎', label: 'Dislike' },
  { value: 2, emoji: '👍', label: 'Like' },
  { value: 3, emoji: '❤️', label: 'Love' },
] as const;

interface RecipeDetailSheetProps {
  recipeId: string;
  plannerDayLabel: string | null;
  onClose: () => void;
  onUseForDay: (recipe: Recipe, specificDayIndex?: number) => Promise<void>;
  onPlanForLater?: (recipe: Recipe) => Promise<void>;
  onFindSimilar: (recipeId: string) => void;
}

export function RecipeDetailSheet({
  recipeId,
  plannerDayLabel,
  onClose,
  onUseForDay,
  onPlanForLater,
  onFindSimilar,
}: RecipeDetailSheetProps) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [notes, setNotes] = useState('');
  const [draftName, setDraftName] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftIngredients, setDraftIngredients] = useState<string[]>([]);
  const [rating, setRating] = useState(0);
  const [isDiscoverable, setIsDiscoverable] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingAction, setIsSavingAction] = useState(false);
  const [isSavingRecipe, setIsSavingRecipe] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [notesSaved, setNotesSaved] = useState(false);
  const [showActionPivot, setShowActionPivot] = useState(false);
  const [isUpdatingDiscovery, setIsUpdatingDiscovery] = useState(false);
  const [isSavingGoto, setIsSavingGoto] = useState(false);
  const [showOriginals, setShowOriginals] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addToast = useUiStore((state) => state.addToast);
  const familySettings = useFamilyStore((state) => state.familySettings);
  const loadGoTo = useFamilyStore((state) => state.loadGoTo);
  const saveGoTo = useFamilyStore((state) => state.saveGoTo);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentGotos = (familySettings[GOTO_KEY] as GoToListDto)?.items ?? [];
  const isCurrentGoto = currentGotos.some((g) => g.recipeId === recipe?.id);

  useEffect(() => {
    let isActive = true;

    void (async () => {
      setIsLoading(true);
      try {
        const nextRecipe = await getRecipe(recipeId);
        if (!isActive) return;
        setRecipe(nextRecipe);
        setNotes(nextRecipe.notes ?? '');
        setDraftName(nextRecipe.name);
        setDraftDescription(nextRecipe.description ?? '');
        setDraftIngredients(nextRecipe.ingredients ?? []);
        setRating(nextRecipe.rating ?? 0);
        setIsDiscoverable(nextRecipe.isDiscoverable ?? false);
        setIsEditing(false);
        setEditError(null);
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
    void loadGoTo();
  }, [loadGoTo]);

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
    setIsUpdatingDiscovery(true);
    try {
      await updateRecipe(recipe.id, { isDiscoverable: next });
    } catch (error) {
      console.error('Failed to toggle discovery', error);
      // Revert optimistic state on error
      setIsDiscoverable(!next);
    } finally {
      setIsUpdatingDiscovery(false);
    }
  };

  const resetDrafts = (source: Recipe) => {
    setDraftName(source.name);
    setDraftDescription(source.description ?? '');
    setDraftIngredients(source.ingredients ?? []);
    setEditError(null);
  };

  const handleCancelEdit = () => {
    if (recipe) resetDrafts(recipe);
    setIsEditing(false);
  };

  const handleIngredientChange = (index: number, value: string) => {
    setDraftIngredients((current) =>
      current.map((ingredient, ingredientIndex) => (ingredientIndex === index ? value : ingredient))
    );
  };

  const handleAddIngredient = () => {
    setDraftIngredients((current) => [...current, '']);
  };

  const handleRemoveIngredient = (index: number) => {
    setDraftIngredients((current) =>
      current.filter((_, ingredientIndex) => ingredientIndex !== index)
    );
  };

  const handleSaveRecipeFields = async () => {
    if (!recipe) return;

    const cleanedIngredients = draftIngredients
      .map((ingredient) => ingredient.trim())
      .filter(Boolean);
    const nextRecipe: Recipe = {
      ...recipe,
      name: draftName.trim(),
      description: draftDescription.trim(),
      ingredients: cleanedIngredients,
    };

    setIsSavingRecipe(true);
    setEditError(null);
    try {
      await updateRecipe(recipe.id, {
        name: nextRecipe.name,
        description: nextRecipe.description,
        ingredients: cleanedIngredients,
      });
      setRecipe(nextRecipe);
      setDraftIngredients(cleanedIngredients);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update recipe fields', error);
      setEditError(t('recipes.editFailed', 'Could not save changes. Try again.'));
    } finally {
      setIsSavingRecipe(false);
    }
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

  const handlePlanForLater = async () => {
    if (!recipe) return;
    setIsSavingAction(true);
    try {
      await (onPlanForLater ? onPlanForLater(recipe) : onUseForDay(recipe));
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

  const handleReimport = async () => {
    if (!recipe) return;
    try {
      await reimportRecipe(recipe.id);
      addToast({
        type: 'success',
        message: t('recipes.reimportStarted', 'Reimport started...'),
      });
    } catch (error) {
      console.error('Failed to reimport recipe', error);
      addToast({
        type: 'error',
        message: t('recipes.reimportFailed', 'Failed to start reimport'),
      });
    }
  };

  const handleHeroCameraClick = () => {
    fileInputRef.current?.click();
  };

  const handleHeroRegenerateClick = async () => {
    if (!recipe) return;
    try {
      await regenerateHero(recipe.id);
      addToast({
        type: 'success',
        message: t('recipes.regeneratingHero', 'Regenerating hero image...'),
      });
    } catch (error) {
      console.error('Failed to regenerate hero', error);
      addToast({
        type: 'error',
        message: t('recipes.regenerateFailed', 'Failed to start regeneration'),
      });
    }
  };

  const handleSetGoto = async () => {
    if (!recipe || isSavingGoto) return;

    setIsSavingGoto(true);
    try {
      const newList = [...currentGotos];
      const index = newList.findIndex((g) => g.recipeId === recipe.id);
      let isRemoving = false;

      if (index >= 0) {
        newList.splice(index, 1);
        isRemoving = true;
      } else {
        newList.push({
          recipeId: recipe.id,
          description: recipe.name!,
          imageUrl: recipe.imageUrl,
          status: recipe.isReady ? 'ready' : 'pending',
        });
      }

      await saveGoTo({ items: newList });
      addToast({
        type: 'success',
        message: isRemoving
          ? t('recipes.gotoRemoved', 'Removed from GOTO list')
          : t('recipes.gotoUpdated', 'Added to GOTO list'),
      });
    } catch (error) {
      console.error('Failed to update GOTO recipe', error);
      addToast({
        type: 'error',
        message: t('recipes.gotoUpdateFailed', 'Could not update GOTO'),
      });
    } finally {
      setIsSavingGoto(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !recipe) return;

    addToast({
      type: 'info',
      message: t('recipes.photoUploading', 'Uploading photo...'),
    });

    try {
      await uploadRecipeOriginal(recipe.id, file);
      addToast({
        type: 'success',
        message: t('recipes.regeneratingHero', 'Regenerating hero image...'),
      });
    } catch (error) {
      console.error('Failed to upload photo', error);
      addToast({
        type: 'error',
        message: t('recipes.uploadFailed', 'Failed to upload photo'),
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const primaryActionTestId = plannerDayLabel ? 'action-add-to-day' : 'action-cook-this';
  const primaryActionLabel = plannerDayLabel ? `Plan for ${plannerDayLabel}` : 'Cook This';

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
          <div className="flex items-center gap-2">
            {!isLoading && recipe && !isEditing && (
              <button
                type="button"
                data-testid={isCurrentGoto ? 'action-current-goto' : 'action-set-goto'}
                aria-label={
                  isCurrentGoto
                    ? t('recipes.currentGoto', 'Current GOTO recipe')
                    : t('recipes.setGoto', 'Set as GOTO')
                }
                title={
                  isCurrentGoto
                    ? t('recipes.currentGoto', 'Current GOTO recipe')
                    : t('recipes.setGoto', 'Set as GOTO')
                }
                aria-pressed={isCurrentGoto}
                onClick={() => void handleSetGoto()}
                disabled={isSavingGoto}
                className={[
                  'inline-flex h-10 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-black uppercase tracking-wider shadow-sm transition disabled:cursor-default',
                  isCurrentGoto
                    ? 'bg-ochre text-white'
                    : 'bg-white text-ochre hover:bg-ochre/10 disabled:opacity-60',
                ].join(' ')}
              >
                <Star
                  size={15}
                  fill={isCurrentGoto ? 'currentColor' : 'none'}
                  strokeWidth={isCurrentGoto ? 2.8 : 2.4}
                />
                {isCurrentGoto && <span>GOTO</span>}
              </button>
            )}
            {!isLoading && recipe && !isEditing && (
              <button
                type="button"
                data-testid="action-edit-recipe"
                aria-label={t('common.edit', 'Edit')}
                title={t('common.edit', 'Edit')}
                onClick={() => {
                  resetDrafts(recipe);
                  setIsEditing(true);
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-charcoal shadow-sm transition hover:bg-charcoal/5"
              >
                <Pencil size={14} />
              </button>
            )}
            {!isLoading && recipe && !isEditing && (
              <ActionGearMenu
                canReimport={recipe.canReimport}
                onMoveToBin={() => void handleMoveToBin()}
                onReimport={() => void handleReimport()}
              />
            )}
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
        </div>

        {isLoading || !recipe ? (
          <div className="px-6 py-10 text-sm font-medium text-charcoal/60">
            {t('recipes.loadingDetail', 'Loading recipe...')}
          </div>
        ) : (
          <div className="overflow-y-auto px-6 pb-6 pt-4">
            <div className="relative mb-5 aspect-[16/9] overflow-hidden rounded-[2rem] bg-charcoal/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getImageUrl(recipe.imageUrl) || '/placeholder-recipe.jpg'}
                alt={recipe.name}
                className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
              />
              {!isEditing && (recipe.imageCount > 0 || recipe.sourceType === 'url') && (
                <button
                  type="button"
                  data-testid="action-view-original"
                  onClick={() => {
                    if (recipe.sourceType === 'url' && recipe.sourceUrl) {
                      window.open(recipe.sourceUrl, '_blank', 'noopener,noreferrer');
                    } else {
                      setShowOriginals(true);
                    }
                  }}
                  className="absolute bottom-4 right-4 flex h-12 items-center gap-2 rounded-full border border-white/30 bg-white/20 px-4 text-xs font-black uppercase tracking-wider text-white shadow-xl backdrop-blur-md transition-all hover:bg-white/30 active:scale-95"
                >
                  {recipe.sourceType === 'url' ? <ExternalLink size={18} /> : <Images size={18} />}
                  <span>{t('recipes.viewOriginal', 'View Original')}</span>
                </button>
              )}
              {isEditing && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <button
                    type="button"
                    data-testid="hero-action-regenerate"
                    onClick={() => void handleHeroRegenerateClick()}
                    className="absolute bottom-4 left-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-white/20 text-white shadow-xl backdrop-blur-md transition-all hover:bg-white/30 active:scale-95"
                  >
                    <RefreshCw size={24} />
                  </button>
                  <button
                    type="button"
                    data-testid="hero-action-camera"
                    onClick={handleHeroCameraClick}
                    className="absolute bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-white/20 text-white shadow-xl backdrop-blur-md transition-all hover:bg-white/30 active:scale-95"
                  >
                    <Camera size={24} />
                  </button>
                </>
              )}
            </div>

            <div className="mb-5 flex flex-col gap-3">
              {isEditing ? (
                <label className="grid gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-charcoal/45">
                    {t('recipes.name', 'Name')}
                  </span>
                  <input
                    data-testid="recipe-edit-name-input"
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    className="w-full rounded-[1.25rem] border border-charcoal/10 bg-white/90 px-4 py-3 text-xl font-black text-charcoal shadow-sm outline-none transition focus:border-terracotta/30"
                  />
                </label>
              ) : (
                <h2
                  data-testid="recipe-detail-name"
                  className="text-3xl font-black tracking-tighter text-charcoal"
                >
                  {recipe.name}
                </h2>
              )}
              <div className="flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-widest text-charcoal/55">
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 shadow-sm">
                  <Clock size={12} />{' '}
                  {tWithVars('common.readyIn', 'READY IN {{time}}', {
                    time: formatRecipeTime(recipe.totalTime),
                  })}
                </span>
              </div>
              {isEditing ? (
                <label className="grid gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-charcoal/45">
                    {t('recipes.description', 'Description')}
                  </span>
                  <textarea
                    data-testid="recipe-edit-description-input"
                    value={draftDescription}
                    onChange={(event) => setDraftDescription(event.target.value)}
                    className="min-h-24 w-full rounded-[1.25rem] border border-charcoal/10 bg-white/90 px-4 py-3 text-sm leading-6 text-charcoal shadow-sm outline-none transition focus:border-terracotta/30"
                  />
                </label>
              ) : (
                recipe.description && (
                  <p className="text-sm leading-6 text-charcoal/70">{recipe.description}</p>
                )
              )}
            </div>

            <div className="mb-5 grid gap-5 md:grid-cols-[1.1fr_0.9fr]">
              <div>
                <h3 className="mb-2 text-sm font-black uppercase tracking-[0.18em] text-charcoal/45">
                  {t('recipes.ingredients', 'Ingredients')}
                </h3>
                {isEditing ? (
                  <div className="space-y-2">
                    {draftIngredients.map((ingredient, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          data-testid={`recipe-edit-ingredient-${index}`}
                          value={ingredient}
                          onChange={(event) => handleIngredientChange(index, event.target.value)}
                          className="min-h-11 flex-1 rounded-2xl border border-charcoal/10 bg-white/90 px-4 py-2 text-sm text-charcoal shadow-sm outline-none transition focus:border-terracotta/30"
                        />
                        <button
                          type="button"
                          data-testid={`recipe-remove-ingredient-${index}`}
                          aria-label={t('recipes.removeIngredient', 'Remove ingredient')}
                          onClick={() => handleRemoveIngredient(index)}
                          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-charcoal/5 text-charcoal/70 transition hover:bg-charcoal/10"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      data-testid="recipe-add-ingredient"
                      onClick={handleAddIngredient}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-charcoal/10 bg-white px-4 text-sm font-black text-charcoal shadow-sm"
                    >
                      <Plus size={16} />
                      {t('recipes.addIngredient', 'Add ingredient')}
                    </button>
                  </div>
                ) : (
                  <ul className="space-y-2 text-sm text-charcoal/80">
                    {(recipe.ingredients || []).map((ingredient) => (
                      <li key={ingredient} className="rounded-2xl bg-white/85 px-4 py-2 shadow-sm">
                        {ingredient}
                      </li>
                    ))}
                  </ul>
                )}
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
                          <span className="text-3xl" aria-hidden>
                            {emoji}
                          </span>
                          <span
                            className={[
                              'text-[9px] font-black uppercase tracking-wider',
                              isSelected ? 'text-charcoal' : 'text-charcoal/50',
                            ].join(' ')}
                          >
                            {label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {editError && (
              <p className="mb-4 rounded-2xl bg-terracotta/10 px-4 py-3 text-sm font-bold text-terracotta">
                {editError}
              </p>
            )}

            {isEditing && (
              <div className="sticky bottom-0 z-10 -mx-6 mb-5 flex flex-col gap-3 border-y border-charcoal/8 bg-[rgba(253,252,240,0.96)] px-6 py-4 backdrop-blur sm:flex-row">
                <button
                  type="button"
                  data-testid="recipe-save-edits"
                  onClick={() => void handleSaveRecipeFields()}
                  disabled={isSavingRecipe || draftName.trim().length === 0}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-terracotta px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-terracotta/90 disabled:opacity-60"
                >
                  <Save size={16} />
                  {isSavingRecipe
                    ? t('common.saving', 'Saving')
                    : t('common.saveChanges', 'Save changes')}
                </button>
                <button
                  type="button"
                  data-testid="recipe-cancel-edits"
                  onClick={handleCancelEdit}
                  disabled={isSavingRecipe}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-charcoal/10 bg-white px-5 py-3 text-sm font-black text-charcoal shadow-sm disabled:opacity-60"
                >
                  <X size={16} />
                  {t('common.cancel', 'Cancel')}
                </button>
              </div>
            )}

            <div className="flex flex-col gap-4 border-t border-charcoal/8 pt-5">
              {!showActionPivot ? (
                <button
                  type="button"
                  data-testid={primaryActionTestId}
                  onClick={() =>
                    plannerDayLabel ? void handleUseRecipe() : setShowActionPivot(true)
                  }
                  disabled={isSavingAction}
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-terracotta px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-terracotta/90 disabled:opacity-60"
                >
                  {primaryActionLabel}
                </button>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    data-testid="action-cook-tonight"
                    onClick={() => void handleUseRecipe()}
                    disabled={isSavingAction}
                    className="flex-1 inline-flex min-h-12 items-center justify-center rounded-full bg-terracotta px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-terracotta/90 disabled:opacity-60"
                  >
                    Cook Tonight
                  </button>
                  <button
                    type="button"
                    data-testid="action-plan-later"
                    onClick={() => void handlePlanForLater()}
                    disabled={isSavingAction}
                    className="flex-1 inline-flex min-h-12 items-center justify-center rounded-full bg-ochre px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-ochre/90 disabled:opacity-60"
                  >
                    Plan for Later
                  </button>
                </div>
              )}

              <button
                type="button"
                data-testid="action-find-similar"
                onClick={() => onFindSimilar(recipe.id)}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-charcoal/10 bg-white px-5 py-3 text-sm font-black text-charcoal shadow-sm transition hover:bg-charcoal/5"
              >
                <Search size={16} />
                {t('recipes.findSimilar', 'Find Similar')}
              </button>

              <DiscoveryToggleCard
                isDiscoverable={isDiscoverable}
                onToggle={handleToggleDiscovery}
                isLoading={isUpdatingDiscovery}
              />
            </div>
          </div>
        )}
      </div>

      {showOriginals && recipe && (
        <OriginalPhotosViewer
          recipeId={recipe.id}
          imageCount={recipe.imageCount}
          finishedDishIndex={recipe.finishedDishIndex}
          onClose={() => setShowOriginals(false)}
        />
      )}
    </div>
  );
}
