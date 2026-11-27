import { useEffect, useRef, useState } from 'react';
import {
  getRecipeShareBundle,
  downloadRecipeBundleFile,
  updateRecipe,
  deleteRecipe,
  uploadRecipeOriginal,
  regenerateHero,
  reindexRecipe,
  type Recipe,
} from '@/lib/api/recipes';
import { useRecipeNotesStore, flushRecipeNotes } from '@/store/recipeNotesStore';
import { useUiStore } from '@/store/uiStore';
import { useFamilyStore } from '@/store/familyStore';
import { t, tWithVars } from '@/locales';
import type { GoToListDto } from '@/lib/api/generated/models/index';

const GOTO_KEY = 'family_goto';

export interface UseRecipeDetailActionsOptions {
  recipeId: string;
  recipe: Recipe | null;
  onClose: () => void;
  onDeleted?: () => void;
  onUseForDay: (recipe: Recipe, specificDayIndex?: number) => Promise<void>;
}

export function useRecipeDetailActions({
  recipeId,
  recipe,
  onClose,
  onDeleted,
  onUseForDay,
}: UseRecipeDetailActionsOptions) {
  const [rating, setRating] = useState(0);
  const [isDiscoverable, setIsDiscoverable] = useState(false);
  const [isUpdatingDiscovery, setIsUpdatingDiscovery] = useState(false);

  const [moveError, setMoveError] = useState(false);
  const [isReindexing, setIsReindexing] = useState(false);
  const [reindexFeedback, setReindexFeedback] = useState<'queued' | 'error' | null>(null);

  const [failedHero, setFailedHero] = useState<string | null>(null);
  const [isSavingGoto, setIsSavingGoto] = useState(false);
  const [showOriginals, setShowOriginals] = useState(false);
  const [isSharingRecipe, setIsSharingRecipe] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [showCooksMode, setShowCooksMode] = useState(false);

  const [isSavingAction, setIsSavingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const actionPendingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const notesDraft = useRecipeNotesStore((state) => state.drafts[recipeId]);
  const notes = notesDraft?.text ?? '';
  const notesSaved = notesDraft?.status === 'saved';

  const addToast = useUiStore((state) => state.addToast);
  const removeToast = useUiStore((state) => state.removeToast);
  const familySettings = useFamilyStore((state) => state.familySettings);
  const loadGoTo = useFamilyStore((state) => state.loadGoTo);
  const saveGoTo = useFamilyStore((state) => state.saveGoTo);

  const currentGotos = (familySettings[GOTO_KEY] as GoToListDto)?.items ?? [];
  const isCurrentGoto = currentGotos.some((g) => g.recipeId === recipe?.id);

  useEffect(() => {
    void loadGoTo();
  }, [loadGoTo]);

  useEffect(() => {
    return () => {
      void flushRecipeNotes(recipeId).then(() => {
        if (useRecipeNotesStore.getState().drafts[recipeId]?.status === 'error') {
          addToast({
            type: 'error',
            message: t(
              'recipes.notesCloseError',
              'Notes could not be saved. Reopen the recipe to retry; your draft is retained.'
            ),
          });
        }
      });
    };
  }, [recipeId, addToast]);

  const syncRecipeMetadata = (source: Recipe) => {
    setRating(source.rating ?? 0);
    setIsDiscoverable(source.isDiscoverable ?? false);
  };

  const closeDetail = () => {
    if (!actionPendingRef.current) onClose();
  };

  const handleRatingChange = async (nextRating: number) => {
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
      addToast({
        message: next
          ? 'Could not turn on Ask the Family. Check that Supper is selected in meal types, then try again.'
          : 'Could not turn off Ask the Family. Try again.',
        type: 'error',
      });
      setIsDiscoverable(!next);
    } finally {
      setIsUpdatingDiscovery(false);
    }
  };

  const handleUseRecipe = async () => {
    if (!recipe || actionPendingRef.current) return;
    actionPendingRef.current = true;
    setActionError(null);
    setIsSavingAction(true);
    try {
      await onUseForDay(recipe);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : t('recipes.planFailed', 'Could not save this meal. Try again.')
      );
    } finally {
      actionPendingRef.current = false;
      setIsSavingAction(false);
    }
  };

  const handleMoveToBin = async () => {
    if (!recipe) return;
    setMoveError(false);
    setIsSavingAction(true);
    try {
      await deleteRecipe(recipe.id);
      onDeleted?.();
      onClose();
    } catch (error) {
      console.error('Failed to move recipe to bin', error);
      setMoveError(true);
    } finally {
      setIsSavingAction(false);
    }
  };

  const handleReindexRecipe = async () => {
    if (!recipe || isReindexing) return;
    setIsReindexing(true);
    setReindexFeedback(null);
    try {
      await reindexRecipe(recipe.id);
      setReindexFeedback('queued');
    } catch {
      setReindexFeedback('error');
    } finally {
      setIsReindexing(false);
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

      if (index >= 0) {
        newList.splice(index, 1);
      } else {
        newList.push({
          recipeId: recipe.id,
          description: recipe.name!,
          imageUrl: recipe.imageUrl,
          status: recipe.isReady ? 'ready' : 'pending',
        });
      }

      await saveGoTo({ items: newList });
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

  const handleShareRecipe = async () => {
    if (!recipe || isSharingRecipe) return;

    setIsSharingRecipe(true);
    setShareError(null);
    const toastId = addToast({
      type: 'loading',
      message: t('recipes.preparingShare', 'Preparing recipe…'),
      persistent: true,
    });

    try {
      const bundle = await getRecipeShareBundle(recipe.id);
      await downloadRecipeBundleFile(recipe.name, bundle);
    } catch (error) {
      const isAbortError = error instanceof DOMException && error.name === 'AbortError';
      if (!isAbortError) {
        console.error('Failed to share recipe', error);
        const message = error instanceof Error ? error.message : String(error);
        setShareError(
          tWithVars('recipes.shareFailedWithDetail', 'Could not share: {{message}}', { message })
        );
      }
    } finally {
      removeToast(toastId);
      setIsSharingRecipe(false);
    }
  };

  return {
    rating,
    isDiscoverable,
    isUpdatingDiscovery,
    notesDraft,
    notes,
    notesSaved,
    moveError,
    setMoveError,
    isReindexing,
    reindexFeedback,
    failedHero,
    setFailedHero,
    isSavingGoto,
    isCurrentGoto,
    showOriginals,
    setShowOriginals,
    isSharingRecipe,
    shareError,
    showCooksMode,
    setShowCooksMode,
    isSavingAction,
    actionError,
    fileInputRef,
    syncRecipeMetadata,
    closeDetail,
    handleRatingChange,
    handleToggleDiscovery,
    handleUseRecipe,
    handleMoveToBin,
    handleReindexRecipe,
    handleHeroCameraClick,
    handleHeroRegenerateClick,
    handleSetGoto,
    handleFileChange,
    handleShareRecipe,
  };
}
