import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { getRecipe, type IngredientContext, type Recipe } from '@/lib/api/recipes';
import { initializeRecipeNotes, useRecipeNotesStore } from '@/store/recipeNotesStore';
import { formatRecipeTime } from '@/lib/duration';
import { useRecipePortionsPreview } from './useRecipePortionsPreview';
import { useRecipeInlineEditor } from './useRecipeInlineEditor';
import { useRecipeImportIssueController } from './useRecipeImportIssueController';
import { useRecipeDetailActions } from './useRecipeDetailActions';

export interface UseRecipeDetailControllerOptions {
  recipeId: string;
  initialReviewDuplicate: boolean;
  ingredientContext?: IngredientContext;
  planningNeedsCheck: boolean;
  planningLoading: boolean;
  planningMessage?: string;
  planningMessageTone?: 'prepared' | 'status' | 'alert';
  onRetryTarget?: () => void;
  plannedDayLabel?: string;
  onOpenPlannedDay?: () => void;
  onClose: () => void;
  onDeleted?: () => void;
  onUseForDay: (recipe: Recipe, specificDayIndex?: number) => Promise<void>;
}

export function useRecipeDetailController({
  recipeId,
  initialReviewDuplicate,
  ingredientContext,
  planningNeedsCheck,
  planningLoading,
  planningMessage,
  planningMessageTone,
  onRetryTarget,
  plannedDayLabel,
  onOpenPlannedDay,
  onClose,
  onDeleted,
  onUseForDay,
}: UseRecipeDetailControllerOptions) {
  const [loadedRecipe, setRecipe] = useState<Recipe | null>(null);
  const recipe = loadedRecipe?.id === recipeId ? loadedRecipe : null;
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [readAttempt, setReadAttempt] = useState(0);
  const [isEditing, setIsEditing] = useState(false);

  const handleInvalidateRecipe = useCallback(() => {
    setReadAttempt((value) => value + 1);
  }, []);

  const retryLoadRecipe = useCallback(() => {
    setReadAttempt((attempt) => attempt + 1);
  }, []);

  const actions = useRecipeDetailActions({
    recipeId,
    recipe,
    onClose,
    onDeleted,
    onUseForDay,
  });

  const installRecipeSnapshot = (source: Recipe) => {
    setRecipe(source);
    actions.syncRecipeMetadata(source);
  };

  const portions = useRecipePortionsPreview({
    recipeId,
    recipe,
    ingredientContext,
    isEditing,
    planningLoading,
    planningNeedsCheck,
    onInvalidateRecipe: handleInvalidateRecipe,
  });

  const editor = useRecipeInlineEditor({
    recipeId,
    recipe,
    ingredientContext,
    projection: portions.projection,
    isEditing,
    setIsEditing,
    installRecipeSnapshot,
    setRecipe,
    resetProjection: portions.resetProjection,
  });

  const importIssues = useRecipeImportIssueController({
    recipeId,
    recipe,
    initialReviewDuplicate,
    setRecipe,
  });

  const loadLifecycleRef = useRef({
    begin: editor.beginRecipeLoadCycle,
    end: editor.endRecipeLoadCycle,
    hydrate: editor.hydrateLoadedRecipeDraft,
    syncMetadata: actions.syncRecipeMetadata,
    setMoveError: actions.setMoveError,
  });
  useLayoutEffect(() => {
    loadLifecycleRef.current = {
      begin: editor.beginRecipeLoadCycle,
      end: editor.endRecipeLoadCycle,
      hydrate: editor.hydrateLoadedRecipeDraft,
      syncMetadata: actions.syncRecipeMetadata,
      setMoveError: actions.setMoveError,
    };
  });

  useEffect(() => {
    loadLifecycleRef.current.begin();
    let isActive = true;

    void (async () => {
      setIsLoading(true);
      setLoadError(false);
      loadLifecycleRef.current.setMoveError(false);
      try {
        const notesAtReadStart = useRecipeNotesStore.getState().drafts[recipeId];
        const nextRecipe = await getRecipe(recipeId);
        if (!isActive) return;
        setRecipe(nextRecipe);
        initializeRecipeNotes(recipeId, nextRecipe.notes ?? '', notesAtReadStart);
        loadLifecycleRef.current.hydrate(nextRecipe);
        loadLifecycleRef.current.syncMetadata(nextRecipe);
      } catch (error) {
        if (!isActive) return;
        console.error('Failed to load recipe detail', error);
        setLoadError(true);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isActive = false;
      loadLifecycleRef.current.end();
    };
  }, [recipeId, readAttempt]);

  const displayedServings = isEditing
    ? editor.structuredEditing
      ? recipe?.servings
      : ingredientContext
        ? portions.projection?.baseServings
        : recipe?.servings
    : portions.showingOriginalEvidence
      ? portions.originalBasisServings
      : (portions.previewTarget ?? portions.headingServings);

  const readyTime = formatRecipeTime(recipe?.totalTime);
  const isConfirmedPlanned = Boolean(plannedDayLabel && onOpenPlannedDay);
  const departureBlocked = actions.isSavingAction || planningLoading || planningNeedsCheck;
  const messageTone = planningMessageTone ?? (onRetryTarget ? 'alert' : 'status');
  const isScrollableStatusBanner = Boolean(planningMessage) && messageTone !== 'alert';
  const saveDisabled =
    editor.isSavingRecipe ||
    editor.saveNeedsRead ||
    editor.servingsInvalid ||
    editor.totalTimeInvalid ||
    (editor.structuredEditing && (editor.preparedDrafts.invalid || !editor.draftRevision)) ||
    editor.draftName.trim().length === 0 ||
    editor.draftMealTypes.length === 0;

  return {
    recipe,
    setRecipe,
    isLoading,
    loadError,
    retryLoadRecipe,
    isEditing,
    setIsEditing,
    displayedServings,
    readyTime,
    isConfirmedPlanned,
    departureBlocked,
    messageTone,
    isScrollableStatusBanner,
    saveDisabled,
    actions,
    portions,
    editor,
    importIssues,
  };
}
