'use client';
import { PreparationStatus } from '@/components/planner/PreparationStatus';

import { DemoAiActionGate } from '@/components/demo/DemoAiActionGate';

import { useEffect, useState, useRef } from 'react';
import {
  useRecipeNotesStore,
  initializeRecipeNotes,
  editRecipeNotes,
  flushRecipeNotes,
  retryRecipeNotes,
} from '@/store/recipeNotesStore';
import { parseRecipeSteps } from '@/lib/cooking/stepParser';
import { formatCookingInstruction } from '@/lib/cooking/instructionPresentation';
import { AnimatePresence } from 'framer-motion';
import {
  X,
  Clock,
  ArrowRightLeft,
  Check,
  Plus,
  Save,
  Camera,
  RefreshCw,
  Star,
  Images,
  ExternalLink,
  Share2,
  UtensilsCrossed,
} from 'lucide-react';
import {
  getRecipe,
  getIngredientProjection,
  getIngredientPreview,
  type PreviewPortions,
  type IngredientContext,
  getRecipeShareBundle,
  downloadRecipeBundleFile,
  updateRecipe,
  deleteRecipe,
  getRecipeImportStatus,
  uploadRecipeOriginal,
  regenerateHero,
  saveRecipeImportIssue,
  resolveRecipeImportIssue,
  type RecipeImportIssueDraft,
  type Recipe,
} from '@/lib/api/recipes';
import { t, tWithVars } from '@/locales';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import { formatRecipeTime } from '@/lib/duration';
import { useUiStore } from '@/store/uiStore';
import { useFamilyStore } from '@/store/familyStore';
import { getImageUrl } from '@/lib/imageUtils';
import { ActionGearMenu } from './ActionGearMenu';
import { RecipeImportIssueBadge } from './RecipeImportIssueBadge';
import { RecipeImportIssueSheet } from './RecipeImportIssueSheet';
import { DiscoveryToggleCard } from './DiscoveryToggleCard';
import { OriginalPhotosViewer } from './OriginalPhotosViewer';
import { subscribeIngredientProjectionInvalidation } from '@/lib/ingredient-projection-invalidation';
import { ingredientProjectionText } from '@/lib/ingredient-presentation';
import { CooksMode } from '../planner/CooksMode';
import { formatSupperPlanDate } from '@/lib/planner/nonCooking';
import type { IngredientProjection } from '@/lib/api/generated/models/index';
import type {
  IngredientPreview,
  GoToListDto,
  UpdateRecipeDto_mealTypes,
} from '@/lib/api/generated/models/index';

const GOTO_KEY = 'family_goto';
const IMPORT_STATUS_POLL_INTERVAL_MS = 1000;

const RATING_OPTIONS = [
  { value: 1, emoji: '👎', label: 'Dislike' },
  { value: 2, emoji: '👍', label: 'Like' },
  { value: 3, emoji: '❤️', label: 'Love' },
] as const;

const MEAL_TYPE_OPTIONS: UpdateRecipeDto_mealTypes[] = [
  'Breakfast',
  'Brunch',
  'Snack',
  'Lunch',
  'Supper',
  'Sides',
  'Dessert',
  'Appetizer',
  'Beverage',
] as const;

function resolveMealTypes(source: Recipe): UpdateRecipeDto_mealTypes[] {
  if (source.mealTypes && source.mealTypes.length > 0) {
    return source.mealTypes.filter(Boolean);
  }

  const category = source.category?.trim();
  if (category && MEAL_TYPE_OPTIONS.includes(category as UpdateRecipeDto_mealTypes)) {
    return [category as UpdateRecipeDto_mealTypes];
  }

  return ['Supper'];
}

interface RecipeDetailSheetProps {
  recipeId: string;
  plannerDayLabel: string | null;
  ingredientContext?: IngredientContext;
  planningNeedsCheck?: boolean;
  planningEnabled?: boolean;
  planningLoading?: boolean;
  planningMessage?: string;
  planningActionLabel?: string;
  onChangeDay?: () => void;
  onBeginPlanning?: () => void;
  onRetryTarget?: () => void;
  sourceDayLabel?: string;
  onPlanAnotherDay?: () => void;
  onClose: () => void;
  onDeleted?: () => void;
  onUseForDay: (recipe: Recipe, specificDayIndex?: number) => Promise<void>;
  onFindSimilar: (recipeId: string) => void;
}

export function RecipeDetailSheet({
  recipeId,
  plannerDayLabel,
  ingredientContext,
  planningNeedsCheck = false,
  planningEnabled = false,
  planningLoading = false,
  planningMessage,
  planningActionLabel,
  onChangeDay,
  onBeginPlanning,
  onRetryTarget,
  sourceDayLabel,
  onPlanAnotherDay,
  onClose,
  onDeleted,
  onUseForDay,
  onFindSimilar,
}: RecipeDetailSheetProps) {
  const [loadedRecipe, setRecipe] = useState<Recipe | null>(null);
  const recipe = loadedRecipe?.id === recipeId ? loadedRecipe : null;
  const projectionKey = ingredientContext ? JSON.stringify([recipeId, ingredientContext]) : null;
  const [projectionRead, setProjectionRead] = useState<{
    key: string;
    data?: IngredientProjection;
    error?: boolean;
  } | null>(null);
  const [projectionAttempt, setProjectionAttempt] = useState(0);
  const projection =
    projectionKey && projectionRead?.key === projectionKey ? projectionRead.data : undefined;
  const projectionError =
    projectionKey && projectionRead?.key === projectionKey && projectionRead.error;
  const originalBasisServings = ingredientContext ? projection?.baseServings : recipe?.servings;
  const originalIngredientTexts = ingredientContext
    ? (projection?.lines ?? []).map((line) => line.originalText ?? '')
    : (recipe?.ingredients ?? []);
  const headingServings = ingredientContext
    ? (projection?.targetServings ??
      (projection?.status === 'original' ? projection.baseServings : null))
    : recipe?.servings;
  const [loadError, setLoadError] = useState(false);
  const [moveError, setMoveError] = useState(false);
  const [readAttempt, setReadAttempt] = useState(0);
  const notesDraft = useRecipeNotesStore((state) => state.drafts[recipeId]);
  const notes = notesDraft?.text ?? '';
  const notesSaved = notesDraft?.status === 'saved';
  const [draftServings, setDraftServings] = useState('');
  const saveVisitRef = useRef(0);
  const [draftName, setDraftName] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftIngredients, setDraftIngredients] = useState<string[]>([]);
  const [draftCuisineType, setDraftCuisineType] = useState('');
  const [draftMealTypes, setDraftMealTypes] = useState<UpdateRecipeDto_mealTypes[]>([]);
  const [rating, setRating] = useState(0);
  const [isDiscoverable, setIsDiscoverable] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const previewScope = JSON.stringify([recipeId, projectionKey]);
  const unresolvedPreviewScope = JSON.stringify([recipeId, null]);
  // Original evidence changes only the reading surface, never the dated target.
  const [originalEvidenceScope, setOriginalEvidenceScope] = useState<string | null>(null);
  const showingOriginalEvidence =
    !isEditing && Boolean(ingredientContext) && originalEvidenceScope === previewScope;
  if (originalEvidenceScope && (isEditing || originalEvidenceScope !== previewScope)) {
    setOriginalEvidenceScope(null);
  }
  const [previewSelection, setPreviewSelection] = useState<{
    scope: string;
    target: PreviewPortions;
  } | null>(null);
  // Adopt the first resolved automatic target, then retire intent synchronously
  // on recipe/date replacement or entry to editing, before old reads can render.
  if (previewSelection && (isEditing || previewSelection.scope !== previewScope)) {
    setPreviewSelection(
      !isEditing && previewSelection.scope === unresolvedPreviewScope
        ? { ...previewSelection, scope: previewScope }
        : null
    );
  }
  const previewTarget =
    !isEditing &&
    (previewSelection?.scope === previewScope || previewSelection?.scope === unresolvedPreviewScope)
      ? (previewSelection?.target ?? null)
      : null;
  const [previewAttempt, setPreviewAttempt] = useState(0);
  const previewKey = previewTarget
    ? JSON.stringify([previewScope, previewTarget, previewAttempt])
    : null;
  const [previewRead, setPreviewRead] = useState<{
    key: string;
    data?: IngredientPreview;
    error?: boolean;
  } | null>(null);
  const preview = previewKey && previewRead?.key === previewKey ? previewRead.data : undefined;
  const previewError = previewKey && previewRead?.key === previewKey && previewRead.error;
  const displayedProjection = showingOriginalEvidence
    ? undefined
    : previewTarget
      ? preview
      : projection;
  const readingBasisServings = previewTarget ? preview?.baseServings : originalBasisServings;
  const servingsInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingAction, setIsSavingAction] = useState(false);
  const [isSavingRecipe, setIsSavingRecipe] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const originalButtonRef = useRef<HTMLButtonElement>(null);
  const readingRef = useRef<HTMLDivElement>(null);
  const notesSectionRef = useRef<HTMLElement>(null);
  const notesInputRef = useRef<HTMLTextAreaElement>(null);
  const [failedHero, setFailedHero] = useState<string | null>(null);
  const [isUpdatingDiscovery, setIsUpdatingDiscovery] = useState(false);
  const [isSavingGoto, setIsSavingGoto] = useState(false);
  const [showOriginals, setShowOriginals] = useState(false);
  const [isSharingRecipe, setIsSharingRecipe] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [showCooksMode, setShowCooksMode] = useState(false);
  const [showImportIssueSheet, setShowImportIssueSheet] = useState(false);
  const actionPendingRef = useRef(false);
  const closeDetail = () => {
    if (!actionPendingRef.current) onClose();
  };
  const { panelRef, onKeyDown } = useDialogFocus(closeDetail);
  const closeImportIssue = () => setShowImportIssueSheet(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addToast = useUiStore((state) => state.addToast);
  const removeToast = useUiStore((state) => state.removeToast);
  const familySettings = useFamilyStore((state) => state.familySettings);
  const loadGoTo = useFamilyStore((state) => state.loadGoTo);
  const saveGoTo = useFamilyStore((state) => state.saveGoTo);
  const importPollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchedImportIdRef = useRef<string | null>(null);

  const currentGotos = (familySettings[GOTO_KEY] as GoToListDto)?.items ?? [];
  const isCurrentGoto = currentGotos.some((g) => g.recipeId === recipe?.id);

  useEffect(() => {
    if (!previewKey || !previewTarget) return;
    let active = true;
    void getIngredientPreview(recipeId, previewTarget).then(
      (data) => {
        if (active) setPreviewRead({ key: previewKey, data });
      },
      () => {
        if (active) setPreviewRead({ key: previewKey, error: true });
      }
    );
    const previewContext = projectionKey
      ? (JSON.parse(projectionKey) as [string, IngredientContext])[1]
      : undefined;
    const unsubscribe = subscribeIngredientProjectionInvalidation(previewContext, () => {
      active = false;
      setPreviewAttempt((value) => value + 1);
      setReadAttempt((value) => value + 1);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [previewKey, previewTarget, recipeId, projectionKey, previewAttempt]);

  useEffect(() => {
    if (!projectionKey) return;
    const [id, context] = JSON.parse(projectionKey) as [string, IngredientContext];
    let active = true;
    let generation = 0;
    const reload = () => {
      const request = ++generation;
      setProjectionRead({ key: projectionKey });
      void getIngredientProjection(id, context).then(
        (data) => {
          if (active && request === generation) setProjectionRead({ key: projectionKey, data });
        },
        () => {
          if (active && request === generation)
            setProjectionRead({ key: projectionKey, error: true });
        }
      );
    };
    const unsubscribe = subscribeIngredientProjectionInvalidation(context, reload);
    reload();
    return () => {
      active = false;
      generation++;
      unsubscribe();
    };
  }, [projectionKey, projectionAttempt]);

  useEffect(() => {
    saveVisitRef.current += 1;
    let isActive = true;

    void (async () => {
      setIsLoading(true);
      setLoadError(false);
      setIsEditing(false);
      setIsSavingRecipe(false);
      setEditError(null);
      setMoveError(false);
      try {
        const notesAtReadStart = useRecipeNotesStore.getState().drafts[recipeId];
        const nextRecipe = await getRecipe(recipeId);
        if (!isActive) return;
        setRecipe(nextRecipe);
        initializeRecipeNotes(recipeId, nextRecipe.notes ?? '', notesAtReadStart);
        setDraftServings(nextRecipe.servings == null ? '' : String(nextRecipe.servings));
        setDraftName(nextRecipe.name);
        setDraftDescription(nextRecipe.description ?? '');
        setDraftIngredients(nextRecipe.ingredients ?? []);
        setDraftCuisineType(nextRecipe.cuisineType ?? '');
        setDraftMealTypes(resolveMealTypes(nextRecipe));
        setRating(nextRecipe.rating ?? 0);
        setIsDiscoverable(nextRecipe.isDiscoverable ?? false);
        setIsEditing(false);
        setEditError(null);
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
      saveVisitRef.current += 1;
    };
  }, [recipeId, readAttempt]);

  useEffect(() => {
    return () => {
      watchedImportIdRef.current = null;
      if (importPollTimerRef.current) clearTimeout(importPollTimerRef.current);
    };
  }, [recipeId]);

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
      addToast({
        message: next
          ? 'Could not turn on Ask the Family. Check that Supper is selected in meal types, then try again.'
          : 'Could not turn off Ask the Family. Try again.',
        type: 'error',
      });
      // Revert optimistic state on error
      setIsDiscoverable(!next);
    } finally {
      setIsUpdatingDiscovery(false);
    }
  };

  const resetDrafts = (source: Recipe) => {
    const basis = ingredientContext && projection ? projection.baseServings : source.servings;
    setDraftServings(basis == null ? '' : String(basis));
    setDraftName(source.name);
    setDraftDescription(source.description ?? '');
    setDraftIngredients(
      ingredientContext && projection
        ? (projection.lines ?? []).map((line) => line.originalText ?? '')
        : (source.ingredients ?? [])
    );
    setDraftCuisineType(source.cuisineType ?? '');
    setDraftMealTypes(resolveMealTypes(source));
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

  const displayedServings = isEditing
    ? ingredientContext
      ? projection?.baseServings
      : recipe?.servings
    : showingOriginalEvidence
      ? originalBasisServings
      : (previewTarget ?? headingServings);
  const servingsInvalid =
    (draftServings !== '' || recipe?.servings != null) &&
    (!/^[0-9]+$/.test(draftServings) ||
      Number(draftServings) < 1 ||
      Number(draftServings) > 2147483647);

  const handleSaveRecipeFields = async () => {
    if (!recipe || servingsInvalid) return;
    const savingVisit = saveVisitRef.current;
    const servingsUpdate = draftServings === '' ? {} : { servings: Number(draftServings) };

    const cleanedIngredients = draftIngredients
      .map((ingredient) => ingredient.trim())
      .filter(Boolean);
    const nextRecipe: Recipe = {
      ...recipe,
      ...servingsUpdate,
      name: draftName.trim(),
      description: draftDescription.trim(),
      ingredients: cleanedIngredients,
      cuisineType: draftCuisineType.trim() || null,
      mealTypes: draftMealTypes,
    };

    setIsSavingRecipe(true);
    setEditError(null);
    try {
      await updateRecipe(recipe.id, {
        ...servingsUpdate,
        name: nextRecipe.name,
        description: nextRecipe.description,
        ingredients: cleanedIngredients,
        cuisineType: nextRecipe.cuisineType,
        mealTypes: nextRecipe.mealTypes ?? [],
      });
      if (saveVisitRef.current !== savingVisit) return;
      setRecipe(nextRecipe);
      setDraftIngredients(cleanedIngredients);
      setIsEditing(false);
      setProjectionRead(null);
      setProjectionAttempt((value) => value + 1);
    } catch (error) {
      console.error('Failed to update recipe fields', error);
      if (saveVisitRef.current !== savingVisit) return;
      setEditError(t('recipes.editFailed', 'Could not save changes. Try again.'));
    } finally {
      if (saveVisitRef.current === savingVisit) setIsSavingRecipe(false);
    }
  };

  const [actionError, setActionError] = useState<string | null>(null);
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

  const pollImportUntilTerminal = async (targetRecipeId: string, importId: string) => {
    if (watchedImportIdRef.current !== importId) return;

    try {
      const result = await getRecipeImportStatus(importId);
      if (watchedImportIdRef.current !== importId) return;

      const status = result.status.toLowerCase();
      if (status === 'completed' || status === 'failed' || status === 'paused') {
        const refreshedRecipe = await getRecipe(targetRecipeId);
        if (watchedImportIdRef.current !== importId) return;
        setRecipe(refreshedRecipe);
        watchedImportIdRef.current = null;
        importPollTimerRef.current = null;
        return;
      }
    } catch (error) {
      console.error('Failed to check recipe import status', error);
    }

    if (watchedImportIdRef.current === importId) {
      importPollTimerRef.current = setTimeout(() => {
        void pollImportUntilTerminal(targetRecipeId, importId);
      }, IMPORT_STATUS_POLL_INTERVAL_MS);
    }
  };

  const handleSaveImportIssue = async (draft: RecipeImportIssueDraft) => {
    if (!recipe) return;
    const submission = await saveRecipeImportIssue(recipe.id, draft);
    setRecipe(submission.recipe);
    if (submission.reimportLaunchFailed) {
      throw new Error('Re-import launch failed');
    }
    setShowImportIssueSheet(false);
    if (submission.reimportStarted && submission.importId) {
      watchedImportIdRef.current = submission.importId;
      if (importPollTimerRef.current) clearTimeout(importPollTimerRef.current);
      void pollImportUntilTerminal(recipe.id, submission.importId);
      addToast({ type: 'success', message: 'Reimporting in background' });
      return;
    }
    addToast({
      type: 'success',
      message: submission.recipe.importIssue?.reimportFailureMessage
        ? 'Saved for review. Add new detail if you want us to try re-importing again.'
        : recipe.importIssue
          ? 'Changes saved'
          : 'Marked for review',
    });
  };

  const handleResolveImportIssue = async () => {
    if (!recipe) return;
    const updated = await resolveRecipeImportIssue(recipe.id);
    setRecipe(updated);
    setShowImportIssueSheet(false);
    addToast({ type: 'success', message: 'Marked as resolved' });
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

  const primaryActionLabel = plannerDayLabel
    ? tWithVars('recipes.planForDay', 'Plan for {{day}}', { day: plannerDayLabel })
    : t('recipes.cookThis', 'Cook This');
  const steps = parseRecipeSteps(recipe?.recipeInstructions);
  const hasNotes = Boolean(notes.trim());
  const readyTime = formatRecipeTime(recipe?.totalTime);
  const hasDatedAction = Boolean(plannerDayLabel || planningEnabled || sourceDayLabel);
  const mealTypesForDisplay = (recipe?.mealTypes ?? []).filter(Boolean);

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center [@media(min-width:768px)_and_(min-height:500px)]:p-6">
      <button
        type="button"
        aria-label={t('common.close', 'Close')}
        title={t('common.close', 'Close')}
        onClick={closeDetail}
        className="absolute inset-0 bg-charcoal/45 backdrop-blur-sm"
      />

      <div
        inert={showOriginals || showCooksMode || undefined}
        aria-hidden={showOriginals || showCooksMode || undefined}
        ref={panelRef as React.RefObject<HTMLDivElement>}
        role="dialog"
        aria-modal="true"
        aria-label={t('recipes.detailTitle', 'Recipe detail')}
        onKeyDown={onKeyDown}
        data-testid="recipe-detail-sheet"
        className="relative z-10 flex h-dvh w-full min-w-0 flex-col overflow-clip bg-cream shadow-[0_24px_80px_-24px_rgba(55,40,30,0.45)] [@media(min-width:768px)_and_(min-height:500px)]:h-[calc(100dvh-3rem)] [@media(min-width:768px)_and_(min-height:500px)]:max-w-5xl [@media(min-width:768px)_and_(min-height:500px)]:rounded-[1.75rem]"
      >
        <div
          data-testid="recipe-detail-toolbar"
          className="shrink-0 flex flex-wrap items-center gap-[8px] border-b border-charcoal/10 px-[16px] py-[12px] md:px-8"
        >
          <div className="flex min-w-0 items-center gap-2">
            <p className="sr-only">{t('recipes.detailTitle', 'Recipe detail')}</p>
            {recipe?.importIssue && (
              <RecipeImportIssueBadge status={recipe.importIssue.status} variant="compact" />
            )}
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
                onClick={() => void handleSetGoto()}
                disabled={isSavingGoto}
                className={[
                  'inline-flex min-h-[48px] items-center justify-center gap-[6px] rounded-full px-[12px] text-sm font-bold shadow-sm transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-charcoal disabled:cursor-default',
                  isCurrentGoto
                    ? 'bg-ochre-100 text-ochre-800 hover:bg-ochre-200'
                    : 'bg-ochre-50 text-ochre-800 hover:bg-ochre-100',
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
                  onClick={() => void handleShareRecipe()}
                  disabled={isSharingRecipe}
                  className="inline-flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-full bg-white text-charcoal shadow-sm transition hover:bg-charcoal/5"
                >
                  <Share2 size={14} />
                </button>
              )}
            {!isLoading && recipe && !isEditing && (
              <ActionGearMenu
                hasImportIssue={Boolean(recipe.importIssue)}
                onEdit={
                  ingredientContext && !projection
                    ? undefined
                    : () => {
                        resetDrafts(recipe);
                        setIsEditing(true);
                      }
                }
                onFindSimilar={() => onFindSimilar(recipe.id)}
                onMoveToBin={() => void handleMoveToBin()}
                onReportImportIssue={() => setShowImportIssueSheet(true)}
              />
            )}
            <button
              type="button"
              data-testid="action-close-sheet"
              aria-label={t('common.close', 'Close')}
              title={t('common.close', 'Close')}
              onClick={closeDetail}
              className="inline-flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-full bg-charcoal/5 text-charcoal/70 transition hover:bg-charcoal/10"
            >
              <X size={18} />
            </button>
          </div>
          {recipe?.importIssue?.reimportFailureMessage && (
            <p role="status" className="basis-full text-sm font-bold text-terracotta-700">
              {recipe.importIssue.reimportFailureMessage}
            </p>
          )}
        </div>

        {moveError && (
          <p role="alert" className="px-6 pt-4 text-sm text-red-700">
            {t(
              'recipes.moveToBinError',
              'Could not move this recipe to the Recycle Bin. Try again.'
            )}
          </p>
        )}
        {loadError && !isLoading ? (
          <div className="px-6 py-10 text-sm font-medium text-charcoal">
            <p role="alert">{t('recipes.detailLoadError', 'Could not load this recipe.')}</p>
            <button
              type="button"
              data-testid="recipe-detail-retry"
              onClick={() => setReadAttempt((attempt) => attempt + 1)}
              className="mt-4 rounded-full bg-terracotta hover:bg-terracotta-600 active:bg-terracotta-700 px-5 py-3 font-bold text-white"
            >
              {t('common.retry', 'Retry')}
            </button>
          </div>
        ) : isLoading || !recipe ? (
          <div className="px-6 py-10 text-sm font-medium text-charcoal/60">
            {t('recipes.loadingDetail', 'Loading recipe...')}
          </div>
        ) : (
          <div
            ref={readingRef}
            data-testid="recipe-detail-reading"
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8 pt-5 md:px-8"
          >
            <div
              data-testid="recipe-detail-hero"
              className={`relative mb-6 overflow-hidden rounded-3xl bg-charcoal/5 ${recipe.imageUrl && failedHero !== recipe.imageUrl ? 'h-56 md:h-72' : 'h-40'}`}
            >
              {recipe.imageUrl && failedHero !== recipe.imageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={getImageUrl(recipe.imageUrl)}
                  onError={() => setFailedHero(recipe.imageUrl ?? '')}
                  alt={recipe.name}
                  className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
                />
              ) : (
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  aria-hidden="true"
                >
                  <UtensilsCrossed size={40} className="text-charcoal/20" />
                </div>
              )}
              {!isEditing &&
                (recipe.imageCount > 0 ||
                  Boolean(recipe.sourceType === 'url' && recipe.sourceUrl?.trim())) && (
                  <button
                    type="button"
                    ref={originalButtonRef}
                    data-testid="action-view-original"
                    onClick={() => {
                      if (recipe.sourceType === 'url' && recipe.sourceUrl) {
                        window.open(recipe.sourceUrl, '_blank', 'noopener,noreferrer');
                      } else {
                        setShowOriginals(true);
                      }
                    }}
                    className="absolute bottom-4 right-4 inline-flex min-h-12 max-w-[calc(100%-2rem)] items-center justify-center gap-2 rounded-full bg-cream/80 px-4 py-2 text-sm font-semibold text-charcoal shadow-sm backdrop-blur-md transition-colors hover:bg-cream/90 active:bg-cream/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-charcoal focus-visible:ring-2 focus-visible:ring-charcoal focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
                  >
                    <span data-testid="view-original-icon">
                      {recipe.sourceType === 'url' ? (
                        <ExternalLink size={18} />
                      ) : (
                        <Images size={18} />
                      )}
                    </span>
                    <span>{t('recipes.viewOriginal', 'View Original')}</span>
                  </button>
                )}
              {!isEditing && readyTime && (
                <span
                  data-testid="recipe-ready-in"
                  className="absolute top-4 left-4 inline-flex max-w-[calc(100%-2rem)] items-center gap-1.5 rounded-full bg-cream px-3 py-2 text-sm font-semibold text-charcoal shadow-sm"
                >
                  <Clock size={14} aria-hidden="true" />
                  {tWithVars('common.readyIn', 'Ready in {{time}}', { time: readyTime })}
                </span>
              )}
              {isEditing && (
                <DemoAiActionGate className="absolute inset-x-4 bottom-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    aria-label="Take a photo for hero image"
                    title="Take a photo for hero image"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <button
                    type="button"
                    data-testid="hero-action-regenerate"
                    aria-label="Regenerate hero image"
                    title="Regenerate hero image"
                    onClick={() => void handleHeroRegenerateClick()}
                    className="absolute bottom-4 left-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-white/20 text-white shadow-xl backdrop-blur-md transition-all hover:bg-white/30 active:scale-95"
                  >
                    <RefreshCw size={24} />
                  </button>
                  <button
                    type="button"
                    data-testid="hero-action-camera"
                    aria-label="Take a new photo"
                    title="Take a new photo"
                    onClick={handleHeroCameraClick}
                    className="absolute bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-white/20 text-white shadow-xl backdrop-blur-md transition-all hover:bg-white/30 active:scale-95"
                  >
                    <Camera size={24} />
                  </button>
                </DemoAiActionGate>
              )}
            </div>

            <div className="mb-5 flex flex-col gap-3">
              {shareError && (
                <p
                  data-testid="recipe-share-error"
                  className="rounded-2xl border border-pink/20 bg-pink/5 px-4 py-3 text-sm font-medium text-pink"
                >
                  {shareError}
                </p>
              )}
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
                  className="break-words text-3xl font-bold leading-tight text-charcoal md:text-4xl"
                >
                  {recipe.name}
                </h2>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {!isEditing && hasNotes && (
                  <button
                    type="button"
                    data-testid="recipe-family-notes-shortcut"
                    onClick={() => {
                      const reading = readingRef.current;
                      const section = notesSectionRef.current;
                      if (reading && section)
                        reading.scrollTo({ top: section.offsetTop - reading.offsetTop });
                      notesInputRef.current?.focus({ preventScroll: true });
                    }}
                    className="min-h-12 rounded-xl px-3 py-2 text-sm font-semibold text-sage-800 underline underline-offset-4"
                  >
                    {t('recipes.familyNotes', 'Family notes')}
                  </button>
                )}
              </div>
              {isEditing ? (
                <div className="grid gap-3">
                  <label className="grid gap-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-charcoal/45">
                      {t('recipes.cuisineType', 'Cuisine')}
                    </span>
                    <input
                      data-testid="recipe-edit-cuisine-input"
                      value={draftCuisineType}
                      onChange={(event) => setDraftCuisineType(event.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-charcoal/10 bg-white text-charcoal focus:border-sage focus:outline-none text-sm transition-all duration-200"
                    />
                  </label>
                  <div className="grid gap-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-charcoal/45">
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
                            aria-pressed={isSelected}
                            onClick={() =>
                              setDraftMealTypes((current) =>
                                current.includes(mealType)
                                  ? current.filter((value) => value !== mealType)
                                  : [...current, mealType]
                              )
                            }
                            className={
                              isSelected
                                ? 'px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 bg-sage text-white shadow-md active:scale-95'
                                : 'px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 bg-white border border-charcoal/10 text-charcoal/60 hover:bg-cream/20 active:scale-95'
                            }
                          >
                            {mealType}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                (recipe.cuisineType || mealTypesForDisplay.length > 0) && (
                  <div className="flex flex-wrap items-center gap-2">
                    {recipe.cuisineType && (
                      <span
                        data-testid="recipe-detail-cuisine-badge"
                        className="inline-flex items-center gap-1 rounded-full bg-ochre/10 text-ochre-800 px-3 py-1.5 shadow-sm text-[11px] font-black uppercase tracking-widest"
                      >
                        {recipe.cuisineType}
                      </span>
                    )}
                    {mealTypesForDisplay.map((mealType) => (
                      <span
                        key={mealType}
                        data-testid={`recipe-detail-meal-type-${mealType.toLowerCase()}`}
                        className="rounded-full bg-white border border-sage/30 text-sage-700 px-3 py-1 text-xs font-bold uppercase"
                      >
                        {mealType}
                      </span>
                    ))}
                  </div>
                )
              )}
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

            <div className="mb-5 grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <div>
                <h3 className="mb-4 flex flex-wrap items-center gap-2 text-xl font-semibold text-charcoal">
                  <span className="max-w-full break-words">
                    {t('recipes.ingredients', 'Ingredients')}
                  </span>{' '}
                  {(isEditing ||
                    previewTarget ||
                    (ingredientContext && !showingOriginalEvidence)) &&
                    displayedServings != null &&
                    displayedServings! > 0 && (
                      <span
                        data-testid="recipe-servings"
                        className="inline-block max-w-full shrink-0 rounded-full bg-charcoal/5 px-2 py-1 text-xs font-medium normal-case tracking-normal text-charcoal/80"
                      >
                        {tWithVars(
                          displayedServings === 1 ? 'recipes.serving' : 'recipes.servings',
                          displayedServings === 1 ? '{{count}} serving' : '{{count}} servings',
                          { count: displayedServings! }
                        )}
                      </span>
                    )}
                </h3>
                {!isEditing && (
                  <div className="mb-4 text-sm">
                    {readingBasisServings != null && readingBasisServings > 0 && (
                      <p
                        data-testid={
                          !previewTarget && (!ingredientContext || showingOriginalEvidence)
                            ? 'recipe-servings'
                            : 'recipe-original-yield'
                        }
                        className="mb-2 text-charcoal/80"
                      >
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
                        {([2, 4, 6] as const).map((target) => (
                          <button
                            key={target}
                            type="button"
                            aria-label={tWithVars(
                              'recipes.previewCountName',
                              'Preview {{count}} portions',
                              { count: target }
                            )}
                            aria-pressed={previewTarget === target}
                            onClick={() => {
                              setOriginalEvidenceScope(null);
                              setPreviewAttempt((value) => value + 1);
                              setPreviewSelection({ scope: previewScope, target });
                            }}
                            className={`min-h-[48px] min-w-[48px] rounded-xl border px-3 font-semibold focus-visible:outline-2 focus-visible:outline-terracotta ${previewTarget === target ? 'border-terracotta bg-terracotta-50 text-terracotta-700' : 'border-charcoal/15 bg-white text-charcoal'}`}
                          >
                            {target}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={Boolean(ingredientContext && !projection)}
                          className="min-h-[48px] text-sage-800 underline underline-offset-4"
                          onClick={() => {
                            setPreviewSelection(null);
                            resetDrafts(recipe);
                            setIsEditing(true);
                            requestAnimationFrame(() => servingsInputRef.current?.focus());
                          }}
                        >
                          {t('recipes.setOriginalYield', 'Set original yield')}
                        </button>
                        <p className="text-charcoal/70">
                          {t(
                            'recipes.yieldCorrectionHint',
                            'This updates the saved recipe and may change your shopping list.'
                          )}
                        </p>
                      </>
                    )}
                    {ingredientContext && (
                      <button
                        type="button"
                        className="min-h-[48px] text-sage-800 underline underline-offset-4"
                        aria-pressed={showingOriginalEvidence}
                        disabled={!projection}
                        onClick={() => {
                          setPreviewSelection(null);
                          setOriginalEvidenceScope(showingOriginalEvidence ? null : previewScope);
                        }}
                      >
                        {showingOriginalEvidence
                          ? t('recipes.previewReturnPlanned', 'Planned quantities')
                          : t('recipes.previewReturnOriginal', 'Original quantities')}
                      </button>
                    )}
                    {previewTarget && (
                      <div className="mt-2">
                        <p className="font-semibold">
                          {tWithVars('recipes.previewFor', 'Preview for {{count}} portions', {
                            count: previewTarget,
                          })}
                        </p>
                        <p className="text-charcoal/70">
                          {t(
                            'recipes.previewOnly',
                            'Preview only. Your plan and shopping list stay unchanged.'
                          )}
                        </p>
                        {!preview && !previewError && (
                          <p role="status">{t('recipes.previewLoading', 'Loading preview…')}</p>
                        )}
                        {previewError && (
                          <p role="alert">
                            {t('recipes.previewFailed', 'Preview could not load.')}{' '}
                            <button
                              type="button"
                              className="min-h-[48px] underline"
                              onClick={() => setPreviewAttempt((value) => value + 1)}
                            >
                              {t('common.retry', 'Retry')}
                            </button>
                          </p>
                        )}
                        {preview &&
                          (preview.status === 'partial' || preview.status === 'unresolved') && (
                            <p role="status">
                              {t(
                                'recipes.projectionReview',
                                'Some amounts need review. Consult the original recipe.'
                              )}
                            </p>
                          )}
                        <button
                          type="button"
                          className="min-h-[48px] text-sage-800 underline underline-offset-4"
                          onClick={() => setPreviewSelection(null)}
                        >
                          {ingredientContext
                            ? t('recipes.previewReturnPlanned', 'Planned quantities')
                            : t('recipes.previewReturnOriginal', 'Original quantities')}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {ingredientContext && !isEditing && (
                  <div className="mb-3 text-sm text-charcoal/80">
                    <p data-testid="recipe-portion-context">
                      {plannerDayLabel ||
                        sourceDayLabel ||
                        formatSupperPlanDate(ingredientContext.supperDate)}
                      {projection?.targetServings
                        ? ` · ${tWithVars('recipes.portionCount', '{{count}} portions', { count: projection.targetServings })}`
                        : ''}
                    </p>
                    {projection?.preparation && (
                      <PreparationStatus preparation={projection.preparation} />
                    )}
                    {!projection && !projectionError && (
                      <p role="status">
                        {t('recipes.projectionLoading', 'Loading ingredients for this date…')}
                      </p>
                    )}
                    {projectionError && (
                      <p role="alert">
                        {t(
                          'recipes.projectionFailed',
                          'Could not confirm ingredients for this supper.'
                        )}{' '}
                        <button
                          type="button"
                          className="min-h-12 underline"
                          onClick={() => setProjectionAttempt((value) => value + 1)}
                        >
                          {t('common.retry', 'Retry')}
                        </button>
                      </p>
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
                    {projection &&
                      !previewTarget &&
                      (projection.status === 'partial' || projection.status === 'unresolved') && (
                        <p role="status">
                          {projection.baseServings == null ||
                          projection.lines?.some((line) => line.issues?.includes('missing_basis'))
                            ? t(
                                'recipes.projectionMissingBasis',
                                'Set the original recipe servings to adjust quantities.'
                              )
                            : t(
                                'recipes.projectionReview',
                                'Some amounts need review. Consult the original recipe.'
                              )}
                        </p>
                      )}
                  </div>
                )}
                {isEditing && (
                  <div className="mb-3 min-w-0">
                    <div className="flex items-center gap-3">
                      <label
                        htmlFor="recipe-edit-servings"
                        className="shrink-0 text-sm font-bold text-charcoal"
                      >
                        {t('recipes.servingsLabel', 'Servings')}
                      </label>
                      <input
                        id="recipe-edit-servings"
                        ref={servingsInputRef}
                        data-testid="recipe-edit-servings-input"
                        type="text"
                        inputMode="numeric"
                        value={draftServings}
                        onChange={(event) => setDraftServings(event.target.value)}
                        aria-invalid={servingsInvalid}
                        aria-describedby={servingsInvalid ? 'recipe-servings-error' : undefined}
                        className="min-h-12 min-w-0 flex-1 rounded-2xl border border-charcoal/10 bg-white/90 px-4 py-2 text-sm text-charcoal shadow-sm outline-none transition focus:border-terracotta/30"
                      />
                    </div>
                    {servingsInvalid && (
                      <p
                        id="recipe-servings-error"
                        className="mt-1 break-words text-sm text-terracotta-600"
                      >
                        {t('recipes.servingsInvalid', 'Enter a whole number from 1 to 2147483647.')}
                      </p>
                    )}
                  </div>
                )}
                {isEditing ? (
                  <div className="space-y-2">
                    {draftIngredients.map((ingredient, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          data-testid={`recipe-edit-ingredient-${index}`}
                          aria-label={`Ingredient ${index + 1}`}
                          title={`Ingredient ${index + 1}`}
                          value={ingredient}
                          onChange={(event) => handleIngredientChange(index, event.target.value)}
                          className="min-h-12 min-w-0 flex-1 rounded-2xl border border-charcoal/10 bg-white/90 px-4 py-2 text-sm text-charcoal shadow-sm outline-none transition focus:border-terracotta/30"
                        />
                        <button
                          type="button"
                          data-testid={`recipe-remove-ingredient-${index}`}
                          aria-label={t('recipes.removeIngredient', 'Remove ingredient')}
                          onClick={() => handleRemoveIngredient(index)}
                          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-charcoal/5 text-charcoal/70 transition hover:bg-charcoal/10"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      data-testid="recipe-add-ingredient"
                      onClick={handleAddIngredient}
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-charcoal/10 bg-white px-4 text-sm font-black text-charcoal shadow-sm"
                    >
                      <Plus size={16} />
                      {t('recipes.addIngredient', 'Add ingredient')}
                    </button>
                  </div>
                ) : (
                  <ul
                    data-testid={
                      previewTarget
                        ? 'recipe-ingredient-preview'
                        : ingredientContext
                          ? 'recipe-ingredient-projection'
                          : undefined
                    }
                    className="divide-y divide-sage/20 text-base leading-relaxed text-charcoal"
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

              <section
                role="region"
                aria-labelledby="recipe-instructions-heading"
                className="min-w-0"
              >
                <h3
                  id="recipe-instructions-heading"
                  className="mb-4 text-xl font-semibold text-charcoal"
                >
                  {t('recipes.instructions', 'Instructions')}
                </h3>
                {displayedProjection?.factor != null &&
                  displayedProjection.factor !== 1 &&
                  displayedProjection.lines?.some((line) => line.status === 'scaled') && (
                    <p
                      data-testid="recipe-instruction-limitation"
                      className="mb-4 text-sm text-charcoal"
                    >
                      {t(
                        'cook.originalAmounts',
                        'Ingredients are adjusted; step amounts remain original.'
                      )}
                    </p>
                  )}
                {steps.length ? (
                  <ol className="space-y-5">
                    {steps.map((step, index) => (
                      <li
                        key={step.index}
                        value={step.index}
                        className="text-base leading-relaxed text-charcoal"
                      >
                        {step.sectionTitle &&
                          step.sectionTitle !== steps[index - 1]?.sectionTitle && (
                            <h4 className="mb-3 text-lg font-semibold text-sage-800">
                              {step.sectionTitle}
                            </h4>
                          )}
                        <div className="flex items-start gap-3">
                          <span
                            aria-hidden="true"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sage/15 text-sm font-semibold text-sage-800"
                          >
                            {step.index}
                          </span>
                          <div className="min-w-0 whitespace-pre-wrap break-words">
                            {formatCookingInstruction(
                              step.editableInstruction ?? step.instruction
                            ).map((paragraph, part) => (
                              <p key={part} className={part ? 'mt-3' : undefined}>
                                {paragraph}
                              </p>
                            ))}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-base leading-relaxed text-charcoal/80">
                    {t(
                      'recipes.instructionsUnavailable',
                      'Instructions are unavailable for this recipe.'
                    )}
                  </p>
                )}
              </section>
            </div>
            <section className="mt-8" aria-labelledby="recipe-rating-heading">
              <h3 id="recipe-rating-heading" className="mb-3 text-xl font-semibold">
                {t('recipes.rating', 'Rating')}
              </h3>
              <div
                data-testid="recipe-rating-selector"
                className="flex flex-wrap items-start justify-around gap-2"
              >
                {RATING_OPTIONS.map(({ value, emoji, label }) => {
                  const isSelected = rating === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-label={t(`recipes.rating${label}`, label)}
                      disabled={isEditing}
                      aria-pressed={isSelected}
                      onClick={() => void handleRatingChange(value)}
                      className={[
                        'relative inline-flex min-h-12 min-w-12 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta',
                        isSelected
                          ? 'bg-terracotta-50 text-terracotta-700'
                          : 'text-charcoal hover:bg-charcoal/5',
                      ].join(' ')}
                    >
                      {isSelected && (
                        <Check
                          data-testid="recipe-rating-selected"
                          className="absolute right-2 top-2"
                          size={14}
                          aria-hidden="true"
                        />
                      )}
                      <span className="text-lg" aria-hidden>
                        {emoji}
                      </span>
                      <span
                        className={[
                          'text-sm font-semibold',
                          isSelected ? 'text-terracotta-700' : 'text-charcoal',
                        ].join(' ')}
                      >
                        {t(`recipes.rating${label}`, label)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
            <section
              ref={notesSectionRef}
              tabIndex={-1}
              role="region"
              aria-label={t('recipes.familyNotes', 'Family notes')}
              data-testid="recipe-family-notes"
              className="mt-8 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sage"
            >
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <label
                    htmlFor="recipe-notes-input"
                    className="text-xl font-semibold text-charcoal"
                  >
                    {t('recipes.notes', 'Notes')}
                  </label>
                  {(notesDraft?.status === 'pending' || notesDraft?.status === 'saving') && (
                    <span role="status" className="text-xs text-charcoal/60">
                      {t('recipes.notesSaving', 'Saving…')}
                    </span>
                  )}
                  {notesSaved && (
                    <span
                      data-testid="recipe-notes-saved"
                      role="status"
                      className="flex items-center gap-1 text-sm font-medium text-sage-800"
                    >
                      <Check size={11} strokeWidth={3} />
                      {t('recipes.notesSaved', 'Saved')}
                    </span>
                  )}
                </div>
                <textarea
                  ref={notesInputRef}
                  id="recipe-notes-input"
                  data-testid="recipe-notes-input"
                  aria-describedby={
                    notesDraft?.status === 'error' ? 'recipe-notes-error' : undefined
                  }
                  value={notes}
                  onChange={(event) => {
                    editRecipeNotes(recipeId, event.target.value);
                  }}
                  className="min-h-28 w-full rounded-[1.5rem] border border-charcoal/10 bg-white/90 px-4 py-3 text-sm text-charcoal shadow-sm outline-none transition focus:border-terracotta focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
                />
                {notesDraft?.status === 'error' && (
                  <div
                    id="recipe-notes-error"
                    role="alert"
                    className="mt-2 text-sm text-terracotta"
                  >
                    {t('recipes.notesError', 'Notes could not be saved. Your draft is retained.')}
                    <button
                      type="button"
                      data-testid="recipe-notes-retry"
                      className="ml-2 font-bold underline"
                      onClick={() => void retryRecipeNotes(recipeId)}
                    >
                      {t('recipes.notesRetry', 'Retry save')}
                    </button>
                  </div>
                )}
              </div>
            </section>
            <div className="mt-8">
              {!isEditing && (
                <DiscoveryToggleCard
                  compactReading
                  descriptionClassName="text-charcoal-600"
                  isDiscoverable={isDiscoverable}
                  onToggle={handleToggleDiscovery}
                  isLoading={isUpdatingDiscovery}
                />
              )}
            </div>

            {editError && (
              <p className="mb-4 rounded-2xl bg-terracotta/10 px-4 py-3 text-sm font-bold text-terracotta-600">
                {editError}
              </p>
            )}
          </div>
        )}
        {isEditing && (
          <div className="shrink-0 max-h-[45dvh] overflow-y-auto flex flex-wrap gap-3 border-t border-charcoal/10 bg-cream px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-8">
            <p className="w-full text-[10px] font-black uppercase tracking-[0.24em] text-charcoal/45 sm:hidden">
              {t('recipes.saveEditingLabel', 'Save recipe edits')}
            </p>
            <button
              type="button"
              data-testid="recipe-save-edits"
              onClick={() => void handleSaveRecipeFields()}
              disabled={
                isSavingRecipe ||
                servingsInvalid ||
                draftName.trim().length === 0 ||
                draftMealTypes.length === 0
              }
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-terracotta active:bg-terracotta-700 px-2 py-3 sm:px-5 text-sm font-black text-white shadow-sm transition hover:bg-terracotta-600 disabled:opacity-60"
            >
              <Save size={16} className="hidden shrink-0 sm:block" />
              <span className="min-w-0 break-words">
                {isSavingRecipe
                  ? t('common.saving', 'Saving')
                  : t('common.saveChanges', 'Save changes')}
              </span>
            </button>
            <button
              type="button"
              data-testid="recipe-cancel-edits"
              onClick={handleCancelEdit}
              disabled={isSavingRecipe}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-charcoal/10 bg-white px-2 py-3 sm:px-5 text-sm font-black text-charcoal shadow-sm disabled:opacity-60"
            >
              <X size={16} className="hidden shrink-0 sm:block" />
              <span className="min-w-0 break-words">{t('common.cancel', 'Cancel')}</span>
            </button>
          </div>
        )}

        {recipe && !isLoading && !isEditing && (
          <div
            data-testid="recipe-planning-actions"
            className="shrink-0 max-h-[45dvh] overflow-y-auto border-t border-charcoal/10 bg-cream px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-8"
          >
            {actionError && (
              <p role="alert" className="mb-2 text-sm text-terracotta">
                {actionError}
              </p>
            )}
            {planningMessage && (
              <p role={onRetryTarget ? 'alert' : 'status'} className="mb-2 text-sm">
                {planningMessage}
              </p>
            )}
            {sourceDayLabel && <p className="mb-2 text-sm font-bold">{sourceDayLabel}</p>}
            {onBeginPlanning && (
              <button
                type="button"
                data-testid="action-begin-planning"
                onClick={onBeginPlanning}
                className="mb-2 inline-flex min-h-12 items-center justify-center rounded-xl bg-terracotta px-5 py-3 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-charcoal"
              >
                {t('recipes.plan', 'Plan')}
              </button>
            )}
            <div
              data-testid="recipe-dated-planning-actions"
              className="flex flex-wrap items-stretch gap-2"
            >
              {hasDatedAction && (
                <button
                  type="button"
                  data-testid={sourceDayLabel ? 'action-cooks-mode' : 'action-add-to-day'}
                  onClick={() =>
                    sourceDayLabel
                      ? setShowCooksMode(true)
                      : onRetryTarget
                        ? onRetryTarget()
                        : void handleUseRecipe()
                  }
                  disabled={isSavingAction || planningLoading}
                  className="inline-flex min-h-12 min-w-0 flex-[1_1_9rem] items-center justify-center gap-2 rounded-xl bg-terracotta px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {sourceDayLabel && <UtensilsCrossed size={18} aria-hidden="true" />}
                  {isSavingAction
                    ? t('common.saving', 'Saving')
                    : planningNeedsCheck
                      ? t('recipes.retryPlanCheck', 'Retry check')
                      : sourceDayLabel
                        ? t('home.cook', 'Cook')
                        : planningLoading
                          ? t('common.loading', 'Loading…')
                          : (planningActionLabel ?? primaryActionLabel)}
                </button>
              )}
              {onChangeDay && (
                <button
                  type="button"
                  data-testid="action-change-day"
                  aria-label={t('recipes.changeDay', 'Change day')}
                  title={t('recipes.changeDay', 'Change day')}
                  disabled={isSavingAction}
                  onClick={onChangeDay}
                  className="inline-flex min-h-[48px] w-[48px] min-w-[48px] flex-none items-center justify-center rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
                >
                  <ArrowRightLeft
                    data-testid="change-day-icon"
                    className="shrink-0"
                    size={18}
                    aria-hidden="true"
                  />
                </button>
              )}
            </div>
            {!sourceDayLabel && (
              <button
                type="button"
                data-testid="action-cooks-mode"
                onClick={() => setShowCooksMode(true)}
                className="mt-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-terracotta-200 bg-white px-5 py-3 font-semibold text-terracotta-700 hover:bg-terracotta-50"
              >
                <UtensilsCrossed size={18} aria-hidden="true" />
                {t('home.cook', 'Cook')}
              </button>
            )}
            {onPlanAnotherDay && (
              <button
                type="button"
                data-testid="action-plan-another-day"
                onClick={onPlanAnotherDay}
                className="mt-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-[1.5rem] border border-terracotta-200 bg-white px-5 py-3 font-semibold text-terracotta-700 hover:bg-terracotta-50"
              >
                {t('recipes.planAnotherDay', 'Plan another day')}
              </button>
            )}
          </div>
        )}
      </div>

      {showOriginals && recipe && (
        <OriginalPhotosViewer
          modal
          returnFocus={originalButtonRef}
          recipeId={recipe.id}
          imageCount={recipe.imageCount}
          finishedDishIndex={recipe.finishedDishIndex}
          onClose={() => setShowOriginals(false)}
        />
      )}
      <AnimatePresence>
        {showCooksMode && recipe && (
          <CooksMode
            ingredientContext={ingredientContext}
            recipe={{
              id: recipe.id,
              name: recipe.name,
              image: getImageUrl(recipe.imageUrl) || '',
            }}
            onClose={() => setShowCooksMode(false)}
          />
        )}
      </AnimatePresence>
      {showImportIssueSheet && recipe && (
        <RecipeImportIssueSheet
          issue={recipe.importIssue ?? null}
          recipeId={recipe.id}
          canReportContentIssues={recipe.canReimport}
          isReimporting={recipe.importIssue?.isReimporting}
          reimportFailureMessage={recipe.importIssue?.reimportFailureMessage}
          reimportFailureImportId={recipe.importIssue?.reimportFailureImportId}
          onClose={closeImportIssue}
          onSave={handleSaveImportIssue}
          onResolve={handleResolveImportIssue}
        />
      )}
    </div>
  );
}
