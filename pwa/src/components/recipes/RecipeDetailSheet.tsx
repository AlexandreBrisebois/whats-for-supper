'use client';
import {
  ingredientDraft,
  ingredientPackageDraft,
  ingredientUnitOptions,
  isStandardIngredientUnit,
  prepareIngredientDrafts,
  type IngredientDraft,
} from '@/lib/recipes/ingredient-draft';
import {
  editorBaseline,
  readEditorDraft,
  persistEditorDraft,
  discardEditorDraft,
  editorBaselineMatches,
  reconcileEditorDraft,
  restoreDeletedEditorRows,
  type EditorBaseline,
  type EditorDraft,
  type EditorFields,
  type EditorField,
} from '@/lib/recipes/editor-draft';
import {
  originalInstructions,
  instructionSections,
  changeInstruction,
  changeInstructionSectionName,
  addInstruction,
  addInstructionSection,
  removeInstructionSection,
  canonicalInstructionInput,
  legacyInstructionInput,
} from '@/lib/recipes/instruction-draft';
import { PreparationStatus } from '@/components/planner/PreparationStatus';

import { DemoAiActionGate } from '@/components/demo/DemoAiActionGate';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  useRecipeNotesStore,
  initializeRecipeNotes,
  editRecipeNotes,
  flushRecipeNotes,
  retryRecipeNotes,
} from '@/store/recipeNotesStore';
import { parseRecipeSteps, projectedCookingSteps } from '@/lib/cooking/stepParser';
import { formatCookingInstruction } from '@/lib/cooking/instructionPresentation';
import { AnimatePresence } from 'framer-motion';
import {
  X,
  Clock,
  ArrowRightLeft,
  Check,
  Minus,
  Plus,
  Save,
  Trash2,
  Camera,
  RefreshCw,
  Star,
  Images,
  ExternalLink,
  Share2,
  Search,
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
import { PairedDuplicateReviewSheet } from './PairedDuplicateReviewSheet';
import { RecipeRatingControl } from './RecipeRatingControl';
import { DiscoveryToggleCard } from './DiscoveryToggleCard';
import { OriginalPhotosViewer } from './OriginalPhotosViewer';
import { subscribeIngredientProjectionInvalidation } from '@/lib/ingredient-projection-invalidation';
import { ingredientProjectionText } from '@/lib/ingredient-presentation';
import { CooksMode } from '../planner/CooksMode';
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
  initialReviewDuplicate?: boolean;
  plannerDayLabel: string | null;
  ingredientContext?: IngredientContext;
  planningNeedsCheck?: boolean;
  planningEnabled?: boolean;
  planningLoading?: boolean;
  planningMessage?: string;
  planningActionLabel?: string;
  onChangeDay?: () => void;
  changeDayDisabled?: boolean;
  onBeginPlanning?: () => void;
  onRetryTarget?: () => void;
  sourceDayLabel?: string;
  plannedDayLabel?: string;
  onOpenPlannedDay?: () => void;
  onClose: () => void;
  onDeleted?: () => void;
  onUseForDay: (recipe: Recipe, specificDayIndex?: number) => Promise<void>;
  onFindSimilar?: (recipeId: string) => void;
}

export function RecipeDetailSheet({
  recipeId,
  initialReviewDuplicate = false,
  plannerDayLabel,
  ingredientContext,
  planningNeedsCheck = false,
  planningEnabled = false,
  planningLoading = false,
  planningMessage,
  planningActionLabel,
  onChangeDay,
  changeDayDisabled = false,
  onBeginPlanning,
  onRetryTarget,
  sourceDayLabel,
  plannedDayLabel,
  onOpenPlannedDay,
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
  const reconcileReadRef = useRef(0);
  const [draftName, setDraftName] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftIngredients, setDraftIngredients] = useState<string[]>([]);
  const [draftInstructions, setDraftInstructions] = useState<unknown[] | undefined>(undefined);
  const [canonicalDrafts, setCanonicalDrafts] = useState<IngredientDraft[]>([]);
  const [draftRevision, setDraftRevision] = useState<string | null>(null);
  const [saveNeedsRead, setSaveNeedsRead] = useState(false);
  const [currentSavedRecipe, setCurrentSavedRecipe] = useState<Recipe | null>(null);
  const [editorSession, setEditorSession] = useState<Omit<EditorDraft, 'fields'> | null>(null);
  const [draftRecovered, setDraftRecovered] = useState(false);
  const [draftStorageIssue, setDraftStorageIssue] = useState(false);
  const draftStorageBlocked = useRef(false);
  const [reconcileChoices, setReconcileChoices] = useState<
    Partial<Record<EditorField, 'draft' | 'current'>>
  >({});
  const [conflictFields, setConflictFields] = useState<EditorField[]>([]);
  const [reconcileReadError, setReconcileReadError] = useState(false);
  const [reconcileContext, setReconcileContext] = useState<{
    draftFields: EditorFields;
    draftCanonical: boolean;
    saved: EditorBaseline;
  } | null>(null);
  const canonicalEditing = editorSession?.baseline.canonical ?? recipe?.contentSchemaVersion === 2;
  const preparedDrafts = prepareIngredientDrafts(canonicalDrafts);
  const [draftCuisineType, setDraftCuisineType] = useState('');
  const [draftMealTypes, setDraftMealTypes] = useState<UpdateRecipeDto_mealTypes[]>([]);
  const [rating, setRating] = useState(0);
  const [isDiscoverable, setIsDiscoverable] = useState(false);
  const installRecipeSnapshot = (source: Recipe) => {
    setRecipe(source);
    setRating(source.rating ?? 0);
    setIsDiscoverable(source.isDiscoverable ?? false);
  };
  const [isEditing, setIsEditing] = useState(false);
  const editorValues: EditorFields = {
    name: draftName,
    description: draftDescription,
    servings: draftServings,
    cuisineType: draftCuisineType,
    mealTypes: draftMealTypes,
    ingredients: draftIngredients,
    canonicalDrafts,
    instructions: draftInstructions,
  };
  const installEditorFields = (fields: EditorFields) => {
    setDraftName(fields.name);
    setDraftDescription(fields.description);
    setDraftServings(fields.servings);
    setDraftCuisineType(fields.cuisineType);
    setDraftMealTypes(fields.mealTypes);
    setDraftIngredients(fields.ingredients);
    setCanonicalDrafts(fields.canonicalDrafts);
    setDraftInstructions(fields.instructions);
  };
  type EditorSessionState = Omit<EditorDraft, 'fields'>;
  // Automatic reconciliation: merge untouched fields with the saved recipe, keep the
  // person's draft for conflicting fields, and expose only the conflicts as toggles.
  const reconcileWithSaved = (
    current: Recipe,
    session: EditorSessionState,
    draftFields: EditorFields
  ) => {
    const next = editorBaseline(current, resolveMealTypes(current));
    setCurrentSavedRecipe(current);
    setReconcileReadError(false);
    if (editorBaselineMatches(session.baseline, next)) {
      setSaveNeedsRead(false);
      setConflictFields([]);
      setReconcileContext(null);
      setReconcileChoices({});
      return;
    }
    const draft = { ...session, fields: draftFields };
    const schemaChanged = session.baseline.canonical !== next.canonical;
    const { conflicts } = reconcileEditorDraft(draft, next);
    const choices: Partial<Record<EditorField, 'draft' | 'current'>> = {};
    for (const field of conflicts)
      choices[field] =
        (field === 'ingredients' || field === 'instructions') && schemaChanged
          ? 'current'
          : 'draft';
    const merged = reconcileEditorDraft(draft, next, choices);
    const original =
      session.original ??
      (schemaChanged ? { baseline: session.baseline, fields: draftFields } : undefined);
    installEditorFields(restoreDeletedEditorRows(merged.fields, next));
    setEditorSession({ version: 1, recipeId, baseline: next, ...(original ? { original } : {}) });
    setDraftRevision(next.revision);
    setSaveNeedsRead(false);
    setReconcileChoices(choices);
    setConflictFields(conflicts);
    setReconcileContext(
      conflicts.length
        ? { draftFields, draftCanonical: session.baseline.canonical, saved: next }
        : null
    );
  };
  const reconcileWithSavedRef = useRef(reconcileWithSaved);
  useLayoutEffect(() => {
    reconcileWithSavedRef.current = reconcileWithSaved;
  });
  const loadSavedBaselineForReconcile = async () => {
    if (!recipe) return;
    const session: EditorSessionState = editorSession ?? {
      version: 1,
      recipeId,
      baseline: editorBaseline(recipe, resolveMealTypes(recipe)),
    };
    const fields = editorValues;
    const visit = saveVisitRef.current;
    const read = ++reconcileReadRef.current;
    setReconcileReadError(false);
    try {
      const current = await getRecipe(recipeId);
      if (visit !== saveVisitRef.current || read !== reconcileReadRef.current) return;
      reconcileWithSaved(current, session, fields);
    } catch {
      // Keep the draft and the save fence; a single Retry stays available.
      if (visit === saveVisitRef.current && read === reconcileReadRef.current)
        setReconcileReadError(true);
    }
  };
  const chooseReconcileField = (field: EditorField, choice: 'draft' | 'current') => {
    if (!reconcileContext) return;
    const source =
      choice === 'draft' ? reconcileContext.draftFields : reconcileContext.saved.fields;
    const next: EditorFields = { ...editorValues };
    if (field === 'ingredients') {
      next.ingredients = source.ingredients;
      next.canonicalDrafts = source.canonicalDrafts;
    } else (next as unknown as Record<string, unknown>)[field] = source[field];
    installEditorFields(restoreDeletedEditorRows(next, reconcileContext.saved));
    setReconcileChoices((choices) => ({ ...choices, [field]: choice }));
  };
  const editorFieldLabel = (field: EditorField) =>
    ({
      name: t('recipes.name', 'Name'),
      description: t('recipes.description', 'Description'),
      servings: t('recipes.originalServings', 'Original portions'),
      cuisineType: t('recipes.cuisineType', 'Cuisine'),
      mealTypes: t('recipes.mealTypes', 'Meal types'),
      ingredients: t('recipes.ingredients', 'Ingredients'),
      instructions: t('recipes.instructions', 'Instructions'),
    })[field];
  const editorFieldText = (fields: EditorFields, field: EditorField, canonical: boolean) => {
    if (field === 'instructions')
      return instructionSections(fields.instructions ?? [], canonical)
        .flatMap((section) => [
          ...(section.name.trim() ? [section.name.trim()] : []),
          ...section.steps.map((row) => row.text),
        ])
        .join('\n');
    if (field !== 'ingredients')
      return Array.isArray(fields[field]) ? fields[field].join(', ') : fields[field];
    return canonical
      ? fields.canonicalDrafts
          .map((row) => {
            const pack = ingredientPackageDraft(row);
            const basis =
              pack.basis === 'net'
                ? t('recipes.packageBasisNet', 'Net amount')
                : pack.basis === 'drained'
                  ? t('recipes.packageBasisDrained', 'Drained amount')
                  : t('recipes.packageBasisUnspecified', 'Not specified');
            return [
              row.amount,
              row.unit,
              row.description,
              row.shoppingName,
              row.fixed
                ? t('recipes.fixedIngredient', 'Keep amount fixed when portions change')
                : '',
              pack.enabled
                ? `${t('recipes.packageDetails', 'Package details')}: ${pack.capacityAmount} ${pack.capacityUnit} / ${pack.countUnit} · ${basis}`
                : t('recipes.noPackageDetails', 'No package details'),
            ]
              .filter(Boolean)
              .join(' · ');
          })
          .join('\n')
      : fields.ingredients.join('\n');
  };
  useEffect(() => {
    if (
      !isEditing ||
      !recipe ||
      editorSession?.recipeId !== recipeId ||
      draftStorageBlocked.current
    )
      return;
    setDraftStorageIssue(!persistEditorDraft({ ...editorSession, fields: editorValues }));
    // Persist each completed render, including invalid/blank input, without a timer
    // that could lose the last edit on unmount or a tab upgrade.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isEditing,
    recipeId,
    editorSession,
    draftName,
    draftDescription,
    draftServings,
    draftCuisineType,
    draftMealTypes,
    draftIngredients,
    canonicalDrafts,
    draftInstructions,
  ]);
  const previewScope = JSON.stringify([recipeId, projectionKey]);
  const unresolvedPreviewScope = JSON.stringify([recipeId, null]);
  // Original evidence changes only the reading surface, never the dated target.
  const [originalEvidenceScope, setOriginalEvidenceScope] = useState<string | null>(null);
  const showingOriginalEvidence = !isEditing && originalEvidenceScope === previewScope;
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
  const portionsHeadingRef = useRef<HTMLHeadingElement>(null);
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
  const [showPairedDuplicateSheet, setShowPairedDuplicateSheet] = useState(false);
  const autoOpenedDuplicateForRef = useRef<string | null>(null);
  const suspectedDuplicateId =
    recipe?.importIssue?.reasons.includes('duplicate') &&
    recipe.importIssue.suspectedDuplicateRecipeId
      ? recipe.importIssue.suspectedDuplicateRecipeId
      : null;

  useEffect(() => {
    if (
      initialReviewDuplicate &&
      recipe &&
      suspectedDuplicateId &&
      autoOpenedDuplicateForRef.current !== recipe.id
    ) {
      autoOpenedDuplicateForRef.current = recipe.id;
      setShowPairedDuplicateSheet(true);
    }
  }, [initialReviewDuplicate, recipe, suspectedDuplicateId]);

  const openIssueReview = () => {
    if (suspectedDuplicateId) {
      setShowPairedDuplicateSheet(true);
      return;
    }
    setShowImportIssueSheet(true);
  };
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
    reconcileReadRef.current += 1;
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
        const recovery = readEditorDraft(recipeId);
        draftStorageBlocked.current =
          recovery.status === 'incompatible' || recovery.status === 'unavailable';
        setDraftStorageIssue(draftStorageBlocked.current);
        const retained = recovery.draft;
        installEditorFields(
          retained?.fields ?? editorBaseline(nextRecipe, resolveMealTypes(nextRecipe)).fields
        );
        setEditorSession(
          retained
            ? { version: 1, recipeId, baseline: retained.baseline, original: retained.original }
            : null
        );
        setDraftRevision(retained?.baseline.revision ?? nextRecipe.contentRevision ?? null);
        setSaveNeedsRead(false);
        setDraftRecovered(!!retained);
        setReconcileChoices({});
        setConflictFields([]);
        setReconcileContext(null);
        setReconcileReadError(false);
        setCurrentSavedRecipe(null);
        // A recovered draft is checked against the recipe just read; no second GET.
        if (retained)
          reconcileWithSavedRef.current(
            nextRecipe,
            { version: 1, recipeId, baseline: retained.baseline, original: retained.original },
            retained.fields
          );
        setRating(nextRecipe.rating ?? 0);
        setIsDiscoverable(nextRecipe.isDiscoverable ?? false);
        setIsEditing(!!retained);
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
    reconcileReadRef.current += 1;
    setEditorSession({
      version: 1,
      recipeId: source.id,
      baseline: editorBaseline(source, resolveMealTypes(source)),
    });
    setDraftRecovered(false);
    setReconcileChoices({});
    setConflictFields([]);
    setReconcileContext(null);
    setReconcileReadError(false);
    const basis =
      source.contentSchemaVersion === 2
        ? source.servings
        : ingredientContext && projection
          ? projection.baseServings
          : source.servings;
    setDraftServings(basis == null ? '' : String(basis));
    setCanonicalDrafts((source.ingredientLines ?? []).map(ingredientDraft));
    setDraftInstructions(originalInstructions(source));
    setDraftRevision(source.contentRevision ?? null);
    setSaveNeedsRead(false);
    setCurrentSavedRecipe(null);
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
    if (!draftStorageBlocked.current) setDraftStorageIssue(!discardEditorDraft(recipeId));
    if (recipe) {
      const source = currentSavedRecipe ?? recipe;
      if (currentSavedRecipe) {
        installRecipeSnapshot(source);
        setProjectionRead(null);
        setProjectionAttempt((value) => value + 1);
      }
      resetDrafts(source);
    }
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
    ? canonicalEditing
      ? recipe?.servings
      : ingredientContext
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
  const parsedDraftServings =
    /^[0-9]+$/.test(draftServings) &&
    Number(draftServings) >= 1 &&
    Number(draftServings) <= 2147483647
      ? Number(draftServings)
      : null;

  const renderUnitOptions = (currentUnit: string) =>
    ingredientUnitOptions(currentUnit).map((unitOption) => (
      <option key={unitOption || '__none__'} value={unitOption}>
        {unitOption === ''
          ? t('recipes.unitNone', '—')
          : isStandardIngredientUnit(unitOption)
            ? t(`recipes.units.${unitOption}`, unitOption)
            : unitOption}
      </option>
    ));

  const handleSaveRecipeFields = async () => {
    if (
      !recipe ||
      servingsInvalid ||
      saveNeedsRead ||
      (canonicalEditing && (preparedDrafts.invalid || !draftRevision))
    )
      return;
    const savingVisit = saveVisitRef.current;
    const servingsUpdate = draftServings === '' ? {} : { servings: Number(draftServings) };

    const cleanedIngredients = draftIngredients
      .map((ingredient) => ingredient.trim())
      .filter(Boolean);
    const normalizedLegacyInstructions =
      !canonicalEditing && draftInstructions !== undefined
        ? legacyInstructionInput(draftInstructions)
        : undefined;
    const nextRecipe: Recipe = {
      ...recipe,
      ...servingsUpdate,
      name: draftName.trim(),
      description: draftDescription.trim(),
      ingredients: cleanedIngredients,
      ...(normalizedLegacyInstructions !== undefined
        ? { recipeInstructions: normalizedLegacyInstructions }
        : {}),
      cuisineType: draftCuisineType.trim() || null,
      mealTypes: draftMealTypes,
    };

    setIsSavingRecipe(true);
    setEditError(null);
    try {
      const saved = await updateRecipe(recipe.id, {
        ...servingsUpdate,
        name: nextRecipe.name,
        description: nextRecipe.description,
        ...(canonicalEditing
          ? {
              ingredientLines: preparedDrafts.lines,
              expectedContentRevision: draftRevision!,
              ...(draftInstructions === undefined
                ? {}
                : { instructionSections: canonicalInstructionInput(draftInstructions) }),
            }
          : {
              ingredients: cleanedIngredients,
              ...(normalizedLegacyInstructions === undefined
                ? {}
                : { recipeInstructions: normalizedLegacyInstructions }),
            }),
        cuisineType: nextRecipe.cuisineType,
        mealTypes: nextRecipe.mealTypes ?? [],
      });
      if (saveVisitRef.current !== savingVisit) return;
      if (canonicalEditing && !saved) throw new Error('Authoritative saved recipe is absent.');
      if (saved) installRecipeSnapshot(saved);
      else setRecipe(nextRecipe);
      reconcileReadRef.current += 1;
      if (!draftStorageBlocked.current) setDraftStorageIssue(!discardEditorDraft(recipeId));
      setDraftIngredients(cleanedIngredients);
      setIsEditing(false);
      setProjectionRead(null);
      setProjectionAttempt((value) => value + 1);
    } catch (error) {
      console.error('Failed to update recipe fields', error);
      if (saveVisitRef.current !== savingVisit) return;
      setSaveNeedsRead(true);
      setEditError(t('recipes.editFailed', 'Could not save changes. Try again.'));
      void loadSavedBaselineForReconcile();
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
    if (submission.recipe.importIssue?.reimportFailureMessage) {
      addToast({
        type: 'success',
        message: 'Saved for review. Add new detail if you want us to try re-importing again.',
      });
    }
  };

  const handleResolveImportIssue = async () => {
    if (!recipe) return;
    const updated = await resolveRecipeImportIssue(recipe.id);
    setRecipe(updated);
    setShowImportIssueSheet(false);
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

  const primaryActionLabel = plannerDayLabel
    ? tWithVars('recipes.planForDay', 'Plan for {{day}}', { day: plannerDayLabel })
    : t('recipes.cookThis', 'Cook This');
  const projectedSteps = projectedCookingSteps(displayedProjection);
  const steps = projectedSteps ?? parseRecipeSteps(recipe?.recipeInstructions);
  const hasNotes = Boolean(notes.trim());
  const readyTime = formatRecipeTime(recipe?.totalTime);
  const hasDatedAction = Boolean(plannerDayLabel || planningEnabled || sourceDayLabel);
  const isConfirmedPlanned = Boolean(plannedDayLabel && onOpenPlannedDay);
  const departureBlocked = isSavingAction || planningLoading || planningNeedsCheck;
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
          className="shrink-0 flex flex-wrap items-center gap-[8px] border-b border-chrome-line px-[16px] py-[12px] md:px-8"
        >
          <div className="flex min-w-0 items-center gap-2">
            {!isLoading && recipe && !isEditing && (
              <button
                type="button"
                data-testid="action-cooks-mode"
                disabled={departureBlocked}
                onClick={() => setShowCooksMode(true)}
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
            {recipe?.importIssue && (
              <button
                type="button"
                data-testid="detail-import-issue-trigger"
                onClick={openIssueReview}
                className="inline-flex min-h-[48px] items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
              >
                <RecipeImportIssueBadge status={recipe.importIssue.status} variant="compact" />
              </button>
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
                  onClick={() => void handleShareRecipe()}
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
                  onEdit={() => {
                    resetDrafts(recipe);
                    setIsEditing(true);
                  }}
                  originalQuantitiesDisabled={Boolean(ingredientContext && !projection)}
                  onOriginalQuantities={
                    !showingOriginalEvidence
                      ? () => {
                          setPreviewSelection(null);
                          setOriginalEvidenceScope(previewScope);
                          requestAnimationFrame(() => portionsHeadingRef.current?.focus());
                        }
                      : undefined
                  }
                  onResetView={
                    previewTarget || showingOriginalEvidence
                      ? () => {
                          setPreviewSelection(null);
                          setOriginalEvidenceScope(null);
                          requestAnimationFrame(() => portionsHeadingRef.current?.focus());
                        }
                      : undefined
                  }
                  onMoveToBin={() => void handleMoveToBin()}
                  onReportImportIssue={openIssueReview}
                />
              </fieldset>
            )}
            <button
              type="button"
              data-testid="action-close-sheet"
              aria-label={t('common.close', 'Close')}
              title={t('common.close', 'Close')}
              onClick={closeDetail}
              className="inline-flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-full bg-charcoal/5 text-icon-affordance hover:text-ink-body transition hover:bg-charcoal/10 focus-visible:outline-2 focus-visible:outline-ink-body"
            >
              <X size={18} />
            </button>
          </div>
          {recipe?.importIssue?.reimportFailureMessage && (
            <p role="status" className="basis-full text-sm font-bold text-hearth-ink">
              {recipe.importIssue.reimportFailureMessage}
            </p>
          )}
        </div>

        {moveError && (
          <p
            role="alert"
            className="mx-6 mt-4 rounded-2xl border border-hearth-line bg-terracotta-50 px-4 py-3 text-sm font-medium text-hearth-ink"
          >
            {t(
              'recipes.moveToBinError',
              'Could not move this recipe to the Recycle Bin. Try again.'
            )}
          </p>
        )}
        {loadError && !isLoading ? (
          <div
            data-testid="recipe-detail-load-error"
            className="mx-6 my-6 space-y-4 rounded-2xl border border-hearth-line bg-terracotta-50 p-5 text-sm text-ink-body shadow-sm"
          >
            <p role="alert" className="font-medium text-hearth-ink">
              {t('recipes.detailLoadError', 'Could not load this recipe.')}
            </p>
            <Button
              type="button"
              variant="primary"
              size="md"
              data-testid="recipe-detail-retry"
              className="rounded-full px-5"
              onClick={() => setReadAttempt((attempt) => attempt + 1)}
            >
              {t('common.retry', 'Retry')}
            </Button>
          </div>
        ) : isLoading || !recipe ? (
          <div className="px-6 py-10 text-sm font-medium text-ink-muted">
            {t('recipes.loadingDetail', 'Loading recipe...')}
          </div>
        ) : (
          <div
            ref={readingRef}
            data-testid="recipe-detail-reading"
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-[20px] pb-[32px] pt-[20px] md:px-8"
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
                  <UtensilsCrossed size={40} className="text-icon-affordance" />
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
                    className="absolute bottom-4 right-4 inline-flex min-h-12 max-w-[calc(100%-2rem)] items-center justify-center gap-2 rounded-full bg-cream/90 border border-chrome-line px-4 py-2 text-sm font-semibold text-ink-body shadow-sm backdrop-blur-md transition-colors hover:bg-cream active:bg-cream focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body focus-visible:ring-2 focus-visible:ring-ink-body focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
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
                  className="absolute top-4 left-4 inline-flex max-w-[calc(100%-2rem)] items-center gap-1.5 rounded-full bg-cream border border-chrome-line px-3 py-2 text-sm font-semibold text-ink-body shadow-sm"
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
                  className="rounded-2xl border border-hearth-line bg-terracotta-50 px-4 py-3 text-sm font-medium text-hearth-ink"
                >
                  {shareError}
                </p>
              )}
              {isEditing ? (
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-ink-body">
                    {t('recipes.name', 'Name')}
                  </span>
                  <input
                    data-testid="recipe-edit-name-input"
                    disabled={isSavingRecipe}
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    className="w-full rounded-[1.25rem] border border-chrome-line bg-white/90 px-4 py-3 text-xl font-black text-ink-body shadow-sm outline-none transition focus:border-hearth-line"
                  />
                </label>
              ) : (
                <h2
                  data-testid="recipe-detail-name"
                  className="break-words text-3xl font-bold leading-tight text-ink-body md:text-4xl"
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
                    className="min-h-12 rounded-xl px-3 py-2 text-sm font-semibold text-garden-ink underline underline-offset-4"
                  >
                    {t('recipes.familyNotes', 'Family notes')}
                  </button>
                )}
              </div>
              {isEditing ? (
                <div className="grid gap-3">
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-ink-body">
                      {t('recipes.cuisineType', 'Cuisine')}
                    </span>
                    <input
                      data-testid="recipe-edit-cuisine-input"
                      disabled={isSavingRecipe}
                      value={draftCuisineType}
                      onChange={(event) => setDraftCuisineType(event.target.value)}
                      className="min-h-12 w-full px-4 py-2.5 rounded-xl border border-chrome-line bg-white text-ink-body focus:border-garden-line focus:outline-none text-sm transition-all duration-200"
                    />
                  </label>
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
                            onClick={() =>
                              setDraftMealTypes((current) =>
                                current.includes(mealType)
                                  ? current.filter((value) => value !== mealType)
                                  : [...current, mealType]
                              )
                            }
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
              ) : (
                (recipe.cuisineType || mealTypesForDisplay.length > 0) && (
                  <div className="flex flex-wrap items-center gap-2">
                    {recipe.cuisineType && (
                      <span
                        data-testid="recipe-detail-cuisine-badge"
                        className="inline-flex items-center gap-1 rounded-full bg-ochre-50 border border-sunlight-line text-sunlight-ink px-3 py-1.5 shadow-sm text-xs font-semibold"
                      >
                        {recipe.cuisineType}
                      </span>
                    )}
                    {mealTypesForDisplay.map((mealType) => (
                      <span
                        key={mealType}
                        data-testid={`recipe-detail-meal-type-${mealType.toLowerCase()}`}
                        className="rounded-full bg-white border border-garden-line text-garden-ink px-3 py-1 text-xs font-bold uppercase"
                      >
                        {mealType}
                      </span>
                    ))}
                  </div>
                )
              )}
              {isEditing ? (
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-ink-body">
                    {t('recipes.description', 'Description')}
                  </span>
                  <textarea
                    data-testid="recipe-edit-description-input"
                    disabled={isSavingRecipe}
                    value={draftDescription}
                    onChange={(event) => setDraftDescription(event.target.value)}
                    className="min-h-24 w-full rounded-[1.25rem] border border-chrome-line bg-white/90 px-4 py-3 text-sm leading-6 text-ink-body shadow-sm outline-none transition focus:border-hearth-line"
                  />
                </label>
              ) : (
                recipe.description && (
                  <p className="text-sm leading-6 text-ink-muted">{recipe.description}</p>
                )
              )}
              {!isEditing && onFindSimilar && (
                <button
                  type="button"
                  data-testid="action-find-similar"
                  disabled={departureBlocked}
                  onClick={() => onFindSimilar(recipe.id)}
                  className="inline-flex min-h-[48px] max-w-full items-center justify-center gap-2 self-start rounded-full border border-chrome-line bg-white px-[16px] py-[12px] text-sm font-semibold text-ink-body shadow-sm hover:bg-charcoal/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body disabled:opacity-60"
                >
                  <Search size={18} className="shrink-0" aria-hidden="true" />
                  <span className="min-w-0 break-words">
                    {t('recipes.findSimilar', 'Find Similar')}
                  </span>
                </button>
              )}
            </div>

            <div className="mb-5 grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <div>
                <h3
                  ref={portionsHeadingRef}
                  tabIndex={-1}
                  className="mb-4 flex flex-wrap items-center gap-2 text-xl font-semibold text-ink-body focus-visible:outline-2 focus-visible:outline-ink-body"
                >
                  <span className="max-w-full break-words">
                    {t('recipes.ingredients', 'Ingredients')}
                  </span>{' '}
                  {displayedServings != null && displayedServings! > 0 && (
                    <span
                      data-testid="recipe-servings"
                      className="inline-block max-w-full shrink-0 rounded-full bg-charcoal/5 px-2 py-1 text-xs font-medium normal-case tracking-normal text-ink-body"
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
                        {([2, 4, 6] as const).map((target) => (
                          <button
                            key={target}
                            type="button"
                            aria-label={tWithVars(
                              'recipes.previewCountName',
                              'Preview {{count}} portions',
                              { count: target }
                            )}
                            aria-pressed={
                              previewTarget === target ||
                              (!previewTarget &&
                                !showingOriginalEvidence &&
                                headingServings === target)
                            }
                            onClick={() => {
                              setOriginalEvidenceScope(null);
                              setPreviewAttempt((value) => value + 1);
                              setPreviewSelection(
                                !planningLoading &&
                                  !planningNeedsCheck &&
                                  headingServings != null &&
                                  target === headingServings
                                  ? null
                                  : { scope: previewScope, target }
                              );
                            }}
                            className={`min-h-[48px] min-w-[48px] rounded-xl border px-3 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body ${previewTarget === target || (!previewTarget && !showingOriginalEvidence && headingServings === target) ? 'border-hearth-line bg-terracotta-50 text-hearth-ink' : 'border-chrome-line bg-white text-ink-body'}`}
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
                          className="min-h-[48px] text-garden-ink underline underline-offset-4"
                          onClick={() => {
                            setPreviewSelection(null);
                            resetDrafts(recipe);
                            setIsEditing(true);
                            requestAnimationFrame(() => servingsInputRef.current?.focus());
                          }}
                        >
                          {t('recipes.setOriginalYield', 'Set recipe portions')}
                        </button>
                      </>
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
                            <Button
                              type="button"
                              variant="primary"
                              size="md"
                              onClick={() => setPreviewAttempt((value) => value + 1)}
                            >
                              {t('common.retry', 'Retry')}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {!isEditing && sourceDayLabel && onBeginPlanning && (
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
                          {t(
                            'recipes.projectionFailed',
                            'Could not confirm ingredients for this supper.'
                          )}
                        </p>
                        <Button
                          type="button"
                          variant="primary"
                          size="md"
                          onClick={() => setProjectionAttempt((value) => value + 1)}
                        >
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
                {isEditing && (
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
                          disabled={
                            isSavingRecipe ||
                            parsedDraftServings === null ||
                            parsedDraftServings <= 1
                          }
                          onClick={() => {
                            if (parsedDraftServings !== null && parsedDraftServings > 1) {
                              setDraftServings(String(parsedDraftServings - 1));
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
                          onChange={(event) => setDraftServings(event.target.value)}
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
                            setDraftServings(
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
                      <p
                        id="recipe-servings-error"
                        className="mt-1 break-words text-sm text-hearth-ink"
                      >
                        {t('recipes.servingsInvalid', 'Enter a whole number from 1 to 2147483647.')}
                      </p>
                    )}
                  </div>
                )}
                {isEditing ? (
                  <div className="space-y-2">
                    {canonicalEditing
                      ? canonicalDrafts.map((row, index) => {
                          const change = (patch: Partial<IngredientDraft>) =>
                            setCanonicalDrafts((rows) =>
                              rows.map((item) =>
                                item.key === row.key ? { ...item, ...patch } : item
                              )
                            );
                          const pack = ingredientPackageDraft(row);
                          return (
                            <div
                              key={row.key}
                              className="space-y-3 rounded-2xl border border-chrome-line bg-white p-3"
                            >
                              <div
                                data-testid={`recipe-ingredient-top-row-${index}`}
                                className="flex flex-wrap items-end gap-2"
                              >
                                <label className="grid min-w-[min(100%,5rem)] flex-1 gap-1 text-sm font-semibold text-ink-body">
                                  <span>{t('recipes.ingredientAmount', 'Amount')}</span>
                                  <input
                                    data-testid={`recipe-edit-amount-${index}`}
                                    disabled={isSavingRecipe}
                                    value={row.amount}
                                    onChange={(event) => change({ amount: event.target.value })}
                                    className="min-h-12 w-full min-w-0 rounded-xl border border-chrome-line bg-white px-3 text-sm font-normal text-ink-body"
                                  />
                                </label>
                                <label className="grid min-w-[min(100%,6rem)] flex-[1.2] gap-1 text-sm font-semibold text-ink-body">
                                  <span>{t('recipes.ingredientUnit', 'Unit')}</span>
                                  <select
                                    data-testid={`recipe-edit-unit-${index}`}
                                    disabled={isSavingRecipe}
                                    value={row.unit}
                                    onChange={(event) => change({ unit: event.target.value })}
                                    className="min-h-12 w-full min-w-0 rounded-xl border border-chrome-line bg-white px-2 text-sm font-normal text-ink-body"
                                  >
                                    {renderUnitOptions(row.unit)}
                                  </select>
                                </label>
                                <button
                                  type="button"
                                  data-testid={`recipe-remove-ingredient-${index}`}
                                  disabled={isSavingRecipe}
                                  aria-label={t('recipes.removeIngredient', 'Remove ingredient')}
                                  title={t('recipes.removeIngredient', 'Remove ingredient')}
                                  onClick={() =>
                                    setCanonicalDrafts((rows) =>
                                      rows.filter((item) => item.key !== row.key)
                                    )
                                  }
                                  className="ml-auto inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-icon-affordance transition hover:bg-charcoal/5 hover:text-ink-body disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
                                >
                                  <Trash2 size={18} aria-hidden="true" />
                                </button>
                              </div>
                              <label className="grid min-w-0 gap-1 text-sm font-semibold text-ink-body">
                                <span>{t('recipes.ingredientDescription', 'Description')}</span>
                                <input
                                  data-testid={`recipe-edit-ingredient-${index}`}
                                  disabled={isSavingRecipe}
                                  value={row.description}
                                  onChange={(event) => change({ description: event.target.value })}
                                  className="min-h-12 w-full rounded-xl border border-chrome-line bg-white px-3 text-sm font-normal text-ink-body"
                                />
                              </label>
                              <details className="rounded-xl bg-charcoal/3 px-3 py-1">
                                <summary className="min-h-12 cursor-pointer py-3 text-sm font-semibold text-ink-body">
                                  {t('recipes.ingredientOptions', 'Shopping and scaling')}
                                </summary>
                                <label className="grid min-w-0 gap-1 text-sm font-semibold text-ink-body">
                                  <span>{t('recipes.shoppingName', 'Shopping name')}</span>
                                  <input
                                    disabled={isSavingRecipe}
                                    value={row.shoppingName}
                                    onChange={(event) =>
                                      change({ shoppingName: event.target.value })
                                    }
                                    className="min-h-12 w-full rounded-xl border border-chrome-line bg-white px-3 text-sm font-normal text-ink-body"
                                  />
                                </label>
                                <label className="flex min-h-12 items-center gap-2 text-sm text-ink-body">
                                  <input
                                    type="checkbox"
                                    disabled={isSavingRecipe}
                                    checked={row.fixed}
                                    onChange={(event) => change({ fixed: event.target.checked })}
                                  />
                                  {t(
                                    'recipes.fixedIngredient',
                                    'Keep amount fixed when portions change'
                                  )}
                                </label>
                                <label className="flex min-h-12 items-center gap-2 text-sm text-ink-body">
                                  <input
                                    type="checkbox"
                                    data-testid={`recipe-edit-package-enabled-${index}`}
                                    disabled={isSavingRecipe}
                                    checked={pack.enabled}
                                    onChange={(event) =>
                                      change({
                                        packageEnabled: event.target.checked,
                                        packageCountUnit: row.packageCountUnit || row.unit.trim(),
                                      })
                                    }
                                  />
                                  {t('recipes.packageDetails', 'Package details')}
                                </label>
                                {pack.enabled && (
                                  <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))] gap-2 pb-2">
                                    <label className="grid min-w-0 gap-1 text-sm font-semibold text-ink-body">
                                      <span>{t('recipes.packageCountUnit', 'Package label')}</span>
                                      <input
                                        data-testid={`recipe-edit-package-count-unit-${index}`}
                                        disabled={isSavingRecipe}
                                        value={pack.countUnit}
                                        onChange={(event) =>
                                          change({ packageCountUnit: event.target.value })
                                        }
                                        className="min-h-12 w-full min-w-0 rounded-xl border border-chrome-line bg-white px-3 text-sm font-normal text-ink-body"
                                      />
                                    </label>
                                    <label className="grid min-w-0 gap-1 text-sm font-semibold text-ink-body">
                                      <span>
                                        {t(
                                          'recipes.packageCapacityAmount',
                                          'Amount in each package'
                                        )}
                                      </span>
                                      <input
                                        data-testid={`recipe-edit-package-capacity-${index}`}
                                        disabled={isSavingRecipe}
                                        value={pack.capacityAmount}
                                        onChange={(event) =>
                                          change({ packageCapacityAmount: event.target.value })
                                        }
                                        className="min-h-12 w-full min-w-0 rounded-xl border border-chrome-line bg-white px-3 text-sm font-normal text-ink-body"
                                      />
                                    </label>
                                    <label className="grid min-w-0 gap-1 text-sm font-semibold text-ink-body">
                                      <span>
                                        {t('recipes.packageCapacityUnit', 'Unit in each package')}
                                      </span>
                                      <select
                                        data-testid={`recipe-edit-package-unit-${index}`}
                                        disabled={isSavingRecipe}
                                        value={pack.capacityUnit}
                                        onChange={(event) =>
                                          change({ packageCapacityUnit: event.target.value })
                                        }
                                        className="min-h-12 w-full min-w-0 rounded-xl border border-chrome-line bg-white px-2 text-sm font-normal text-ink-body"
                                      >
                                        {renderUnitOptions(pack.capacityUnit)}
                                      </select>
                                    </label>
                                    <label className="grid min-w-0 gap-1 text-sm font-semibold text-ink-body">
                                      <span>{t('recipes.packageBasis', 'Amount refers to')}</span>
                                      <select
                                        data-testid={`recipe-edit-package-basis-${index}`}
                                        disabled={isSavingRecipe}
                                        value={pack.basis}
                                        onChange={(event) =>
                                          change({
                                            packageBasis: event.target
                                              .value as IngredientDraft['packageBasis'],
                                          })
                                        }
                                        className="min-h-12 w-full min-w-0 rounded-xl border border-chrome-line bg-white px-2 text-sm font-normal text-ink-body"
                                      >
                                        <option value="unspecified">
                                          {t('recipes.packageBasisUnspecified', 'Not specified')}
                                        </option>
                                        <option value="net">
                                          {t('recipes.packageBasisNet', 'Net amount')}
                                        </option>
                                        <option value="drained">
                                          {t('recipes.packageBasisDrained', 'Drained amount')}
                                        </option>
                                      </select>
                                    </label>
                                  </div>
                                )}
                              </details>
                            </div>
                          );
                        })
                      : draftIngredients.map((ingredient, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <input
                              data-testid={`recipe-edit-ingredient-${index}`}
                              disabled={isSavingRecipe}
                              aria-label={`Ingredient ${index + 1}`}
                              title={`Ingredient ${index + 1}`}
                              value={ingredient}
                              onChange={(event) =>
                                handleIngredientChange(index, event.target.value)
                              }
                              className="min-h-12 min-w-0 flex-1 rounded-2xl border border-chrome-line bg-white/90 px-4 py-2 text-sm text-ink-body shadow-sm outline-none transition focus:border-hearth-line"
                            />
                            <button
                              type="button"
                              data-testid={`recipe-remove-ingredient-${index}`}
                              disabled={isSavingRecipe}
                              aria-label={t('recipes.removeIngredient', 'Remove ingredient')}
                              onClick={() => handleRemoveIngredient(index)}
                              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-charcoal/5 text-icon-affordance hover:text-ink-body transition hover:bg-charcoal/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                    {canonicalEditing && preparedDrafts.invalid && (
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
                        canonicalEditing
                          ? setCanonicalDrafts((rows) => [...rows, ingredientDraft()])
                          : handleAddIngredient()
                      }
                      className="gap-2 rounded-full border-chrome-line px-4 text-sm font-black text-ink-body shadow-sm hover:bg-cream"
                    >
                      <Plus size={16} />
                      {t('recipes.addIngredient', 'Add ingredient')}
                    </Button>
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

              <section
                role="region"
                aria-labelledby="recipe-instructions-heading"
                className="min-w-0"
              >
                <h3
                  id="recipe-instructions-heading"
                  className="mb-4 text-xl font-semibold text-ink-body"
                >
                  {t('recipes.instructions', 'Instructions')}
                </h3>
                {previewTarget &&
                  !projectedSteps &&
                  displayedProjection?.factor != null &&
                  displayedProjection.factor !== 1 &&
                  displayedProjection.lines?.some((line) => line.status === 'scaled') && (
                    <p
                      data-testid="recipe-instruction-limitation"
                      className="mb-4 text-sm text-ink-body"
                    >
                      {t(
                        'cook.originalAmounts',
                        'Ingredients are adjusted; step amounts remain original.'
                      )}
                    </p>
                  )}
                {isEditing ? (
                  <div className="grid min-w-0 gap-4">
                    {(() => {
                      const currentInstructions = draftInstructions ?? originalInstructions(recipe);
                      const editableSections = instructionSections(
                        currentInstructions,
                        canonicalEditing
                      );
                      return (
                        <>
                          {editableSections.map((section) => (
                            <div
                              key={section.key}
                              data-testid={`recipe-edit-section-${section.sectionIndex}`}
                              className="grid min-w-0 gap-3 rounded-2xl border border-chrome-line p-3"
                            >
                              <div className="flex items-end gap-2">
                                <label className="grid min-w-0 flex-1 gap-2">
                                  <span className="text-sm font-semibold text-ink-body">
                                    {tWithVars(
                                      'recipes.sectionHeader',
                                      'Section {{number}} header',
                                      {
                                        number: section.sectionIndex + 1,
                                      }
                                    )}
                                  </span>
                                  <input
                                    type="text"
                                    data-testid={`recipe-edit-section-header-${section.sectionIndex}`}
                                    disabled={isSavingRecipe}
                                    placeholder={t(
                                      'recipes.sectionHeaderPlaceholder',
                                      'Optional section header'
                                    )}
                                    value={section.name}
                                    onChange={(event) =>
                                      setDraftInstructions(
                                        changeInstructionSectionName(
                                          currentInstructions,
                                          canonicalEditing,
                                          section.sectionIndex,
                                          event.target.value
                                        )
                                      )
                                    }
                                    className="min-h-12 min-w-0 w-full rounded-xl border border-chrome-line bg-white px-3 py-2 text-base font-semibold text-ink-body"
                                  />
                                </label>
                                <button
                                  type="button"
                                  data-testid={`recipe-remove-section-${section.sectionIndex}`}
                                  disabled={isSavingRecipe}
                                  aria-label={tWithVars(
                                    'recipes.removeSection',
                                    'Remove section {{number}}',
                                    {
                                      number: section.sectionIndex + 1,
                                    }
                                  )}
                                  title={tWithVars(
                                    'recipes.removeSection',
                                    'Remove section {{number}}',
                                    {
                                      number: section.sectionIndex + 1,
                                    }
                                  )}
                                  onClick={() =>
                                    setDraftInstructions(
                                      removeInstructionSection(
                                        currentInstructions,
                                        canonicalEditing,
                                        section.sectionIndex
                                      )
                                    )
                                  }
                                  className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-icon-affordance transition hover:bg-charcoal/5 hover:text-ink-body disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
                                >
                                  <Trash2 size={18} aria-hidden="true" />
                                </button>
                              </div>
                              {section.steps.map((row) => (
                                <div key={row.path.join(':')} className="grid min-w-0 gap-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <label
                                      htmlFor={`recipe-edit-step-${row.stepNumber - 1}-input`}
                                      className="text-sm font-semibold text-ink-body"
                                    >
                                      {tWithVars(
                                        'recipes.stepInstructions',
                                        'Step {{number}} instructions',
                                        {
                                          number: row.stepNumber,
                                        }
                                      )}
                                    </label>
                                    <button
                                      type="button"
                                      data-testid={`recipe-remove-step-${row.stepNumber - 1}`}
                                      disabled={isSavingRecipe}
                                      aria-label={tWithVars(
                                        'recipes.removeStep',
                                        'Remove step {{number}}',
                                        {
                                          number: row.stepNumber,
                                        }
                                      )}
                                      title={tWithVars(
                                        'recipes.removeStep',
                                        'Remove step {{number}}',
                                        {
                                          number: row.stepNumber,
                                        }
                                      )}
                                      onClick={() =>
                                        setDraftInstructions(
                                          changeInstruction(
                                            currentInstructions,
                                            canonicalEditing,
                                            row.path,
                                            null
                                          )
                                        )
                                      }
                                      className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-icon-affordance transition hover:bg-charcoal/5 hover:text-ink-body disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
                                    >
                                      <Trash2 size={18} aria-hidden="true" />
                                    </button>
                                  </div>
                                  <textarea
                                    id={`recipe-edit-step-${row.stepNumber - 1}-input`}
                                    rows={3}
                                    data-testid={`recipe-edit-step-${row.stepNumber - 1}`}
                                    disabled={isSavingRecipe}
                                    value={row.text}
                                    onChange={(event) =>
                                      setDraftInstructions(
                                        changeInstruction(
                                          currentInstructions,
                                          canonicalEditing,
                                          row.path,
                                          event.target.value
                                        )
                                      )
                                    }
                                    className="min-w-0 w-full rounded-2xl border border-chrome-line bg-white p-3 text-base text-ink-body"
                                  />
                                </div>
                              ))}
                              <Button
                                type="button"
                                variant="secondary"
                                size="md"
                                data-testid={`recipe-add-step-section-${section.sectionIndex}`}
                                disabled={isSavingRecipe}
                                aria-label={
                                  editableSections.length > 1
                                    ? tWithVars(
                                        'recipes.addStepToSection',
                                        'Add step to section {{number}}',
                                        {
                                          number: section.sectionIndex + 1,
                                        }
                                      )
                                    : undefined
                                }
                                onClick={() =>
                                  setDraftInstructions(
                                    addInstruction(
                                      currentInstructions,
                                      canonicalEditing,
                                      section.sectionIndex
                                    )
                                  )
                                }
                                className="rounded-xl border-chrome-line px-4 text-sm font-semibold text-ink-body hover:bg-cream"
                              >
                                {t('recipes.addStep', 'Add step')}
                              </Button>
                            </div>
                          ))}
                          {editableSections.length === 0 && (
                            <Button
                              type="button"
                              variant="secondary"
                              size="md"
                              disabled={isSavingRecipe}
                              onClick={() =>
                                setDraftInstructions(
                                  addInstruction(currentInstructions, canonicalEditing)
                                )
                              }
                              className="rounded-xl border-chrome-line px-4 text-sm font-semibold text-ink-body hover:bg-cream"
                            >
                              {t('recipes.addStep', 'Add step')}
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="secondary"
                            size="md"
                            data-testid="recipe-add-section"
                            disabled={isSavingRecipe}
                            onClick={() =>
                              setDraftInstructions(
                                addInstructionSection(currentInstructions, canonicalEditing)
                              )
                            }
                            className="rounded-xl border-chrome-line px-4 text-sm font-semibold text-ink-body hover:bg-cream"
                          >
                            {t('recipes.addSection', 'Add section')}
                          </Button>
                        </>
                      );
                    })()}
                  </div>
                ) : steps.length ? (
                  <ol className="space-y-5">
                    {steps.map((step, index) => (
                      <li
                        key={step.index}
                        value={step.index}
                        className="text-base leading-relaxed text-ink-body"
                      >
                        {step.sectionTitle &&
                          step.sectionTitle !== steps[index - 1]?.sectionTitle && (
                            <h4 className="mb-3 text-lg font-semibold text-garden-ink">
                              {step.sectionTitle}
                            </h4>
                          )}
                        <div className="flex items-start gap-3">
                          <span
                            aria-hidden="true"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sage-50 border border-garden-line text-sm font-semibold text-garden-ink"
                          >
                            {step.index}
                          </span>
                          <div className="min-w-0 whitespace-pre-wrap break-words">
                            {formatCookingInstruction(
                              projectedSteps
                                ? step.instruction
                                : (step.editableInstruction ?? step.instruction)
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
                  <p className="text-base leading-relaxed text-ink-muted">
                    {t(
                      'recipes.instructionsUnavailable',
                      'Instructions are unavailable for this recipe.'
                    )}
                  </p>
                )}
              </section>
            </div>
            <section className="mt-8" aria-labelledby="recipe-rating-heading">
              <h3 id="recipe-rating-heading" className="mb-3 text-xl font-semibold text-ink-body">
                {t('recipes.rating', 'Rating')}
              </h3>
              <RecipeRatingControl
                value={rating}
                onChange={(next) => void handleRatingChange(next)}
                disabled={isEditing}
                testIdPrefix="recipe-rating"
                selectorTestId="recipe-rating-selector"
                allowClear={false}
              />
            </section>
            <section
              ref={notesSectionRef}
              tabIndex={-1}
              role="region"
              aria-label={t('recipes.familyNotes', 'Family notes')}
              data-testid="recipe-family-notes"
              className="mt-8 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-garden-ink"
            >
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <label
                    htmlFor="recipe-notes-input"
                    className="text-xl font-semibold text-ink-body"
                  >
                    {t('recipes.notes', 'Notes')}
                  </label>
                  {(notesDraft?.status === 'pending' || notesDraft?.status === 'saving') && (
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
                  className="min-h-28 w-full rounded-[1.5rem] border border-chrome-line bg-white/90 px-4 py-3 text-sm text-ink-body shadow-sm outline-none transition focus:border-hearth-line focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hearth-fill"
                />
                {notesDraft?.status === 'error' && (
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
                  onToggle={handleToggleDiscovery}
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
          </div>
        )}
        {isEditing && (
          <div className="shrink-0 max-h-[45dvh] overflow-y-auto flex flex-wrap gap-3 border-t border-chrome-line bg-cream px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-8">
            {draftStorageIssue && (
              <p
                role="alert"
                className="w-full rounded-2xl border border-hearth-line bg-terracotta-50 p-3 text-sm text-ink-body"
              >
                {t(
                  'recipes.draftStorageUnavailable',
                  'This tab cannot safely store your edits for recovery. Keep it open until you save or cancel.'
                )}
              </p>
            )}
            {draftRecovered && (
              <p
                role="status"
                className="w-full rounded-2xl border border-garden-line bg-sage-50 p-3 text-sm text-ink-body"
              >
                {t('recipes.draftRecovered', 'Your unsaved edits were recovered.')}
              </p>
            )}
            {saveNeedsRead && reconcileReadError && (
              <div
                role="alert"
                data-testid="recipe-reconcile-error"
                className="flex w-full flex-col items-start gap-3 rounded-2xl border border-hearth-line bg-terracotta-50 p-4 text-sm text-ink-body"
              >
                <p>
                  {t(
                    'recipes.reconcileReadFailed',
                    'Could not check the saved recipe. Your draft is kept.'
                  )}
                </p>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  data-testid="recipe-reconcile-retry"
                  onClick={() => void loadSavedBaselineForReconcile()}
                >
                  {t('common.retry', 'Retry')}
                </Button>
              </div>
            )}
            {reconcileContext && conflictFields.length > 0 && (
              <div
                role="region"
                aria-label={t('recipes.savedRecipeChangedTitle', 'The saved recipe changed')}
                data-testid="recipe-reconcile-conflicts"
                className="w-full space-y-3 rounded-2xl border border-hearth-line bg-terracotta-50 p-4 text-sm text-ink-body"
              >
                <p className="font-heading text-base font-bold text-hearth-ink">
                  {t('recipes.savedRecipeChangedTitle', 'The saved recipe changed')}
                </p>
                <p>
                  {t(
                    'recipes.draftReconcileHelp',
                    'Other fields were updated automatically. For each field below, choose your draft or the saved version, then save.'
                  )}
                </p>
                {conflictFields.map((field) => {
                  const draftAllowed =
                    !(field === 'ingredients' || field === 'instructions') ||
                    reconcileContext.draftCanonical === reconcileContext.saved.canonical;
                  const pill = (choice: 'draft' | 'current', label: string) => {
                    const selected = reconcileChoices[field] === choice;
                    return (
                      <button
                        type="button"
                        className={cn(
                          'inline-flex min-h-12 max-w-full items-center gap-2 rounded-full border px-4 py-2 text-center font-semibold leading-snug whitespace-normal focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body',
                          selected
                            ? 'border-hearth-line bg-terracotta-50 text-hearth-ink'
                            : 'border-chrome-line bg-white text-ink-body'
                        )}
                        aria-pressed={selected}
                        aria-label={`${label}: ${editorFieldLabel(field)}`}
                        onClick={() => chooseReconcileField(field, choice)}
                      >
                        {selected && <Check size={16} aria-hidden="true" />}
                        {label}
                      </button>
                    );
                  };
                  return (
                    <fieldset
                      key={field}
                      className="min-w-0 space-y-2 rounded-xl border border-chrome-line bg-white p-3"
                    >
                      <legend className="px-1 font-semibold">{editorFieldLabel(field)}</legend>
                      <p className="font-semibold text-ink-body">
                        {t('recipes.myDraft', 'My draft')}
                      </p>
                      <p className="whitespace-pre-wrap break-words text-ink-muted">
                        {editorFieldText(
                          reconcileContext.draftFields,
                          field,
                          reconcileContext.draftCanonical
                        )}
                      </p>
                      <p className="font-semibold text-ink-body">
                        {t('recipes.currentSaved', 'Currently saved')}
                      </p>
                      <p className="whitespace-pre-wrap break-words text-ink-muted">
                        {editorFieldText(
                          reconcileContext.saved.fields,
                          field,
                          reconcileContext.saved.canonical
                        )}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {draftAllowed && pill('draft', t('recipes.keepMyDraft', 'Keep my draft'))}
                        {pill('current', t('recipes.useCurrentSaved', 'Use currently saved'))}
                      </div>
                    </fieldset>
                  );
                })}
                {editorSession &&
                  reconcileContext.draftCanonical !== reconcileContext.saved.canonical && (
                    <p>
                      {t(
                        'recipes.legacyDraftReference',
                        'The ingredient format changed. Your old ingredient text is retained below for reference; use the current ingredients and reapply corrections in the editor.'
                      )}
                    </p>
                  )}
              </div>
            )}
            {editorSession?.original && (
              <details className="w-full text-sm text-ink-body">
                <summary className="min-h-12 cursor-pointer py-3 font-semibold">
                  {t('recipes.originalRecoveredDraft', 'Original recovered draft')}
                </summary>
                {(
                  [
                    'name',
                    'description',
                    'servings',
                    'cuisineType',
                    'mealTypes',
                    'ingredients',
                  ] as EditorField[]
                ).map((field) => (
                  <div key={field}>
                    <p className="font-bold">{editorFieldLabel(field)}</p>
                    <p className="whitespace-pre-wrap break-words">
                      {editorFieldText(
                        editorSession.original!.fields,
                        field,
                        editorSession.original!.baseline.canonical
                      )}
                    </p>
                  </div>
                ))}
              </details>
            )}
            <Button
              type="button"
              variant="primary"
              size="md"
              data-testid="recipe-save-edits"
              onClick={() => void handleSaveRecipeFields()}
              disabled={
                isSavingRecipe ||
                saveNeedsRead ||
                servingsInvalid ||
                (canonicalEditing && (preparedDrafts.invalid || !draftRevision)) ||
                draftName.trim().length === 0 ||
                draftMealTypes.length === 0
              }
              className="gap-2 rounded-full px-2 text-sm font-black sm:px-5"
            >
              <Save size={16} className="hidden shrink-0 sm:block" aria-hidden="true" />
              <span className="min-w-0 break-words">
                {isSavingRecipe
                  ? t('common.saving', 'Saving')
                  : t('common.saveChanges', 'Save changes')}
              </span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="md"
              data-testid="recipe-cancel-edits"
              onClick={handleCancelEdit}
              disabled={isSavingRecipe}
              className="gap-2 rounded-full px-2 text-sm font-black sm:px-5"
            >
              <X size={16} className="hidden shrink-0 sm:block" aria-hidden="true" />
              <span className="min-w-0 break-words">{t('common.cancel', 'Cancel')}</span>
            </Button>
          </div>
        )}

        {recipe && !isLoading && !isEditing && (
          <div
            data-testid="recipe-planning-actions"
            className="shrink-0 max-h-[45dvh] overflow-y-auto border-t border-chrome-line bg-cream px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-8"
          >
            {actionError && (
              <p
                role="alert"
                className="mb-2 rounded-xl border border-hearth-line bg-terracotta-50 px-3 py-2 text-sm font-medium text-hearth-ink"
              >
                {actionError}
              </p>
            )}
            {planningMessage && (
              <p
                role={onRetryTarget ? 'alert' : 'status'}
                className={`mb-2 rounded-xl border px-3 py-2 text-sm font-medium ${
                  onRetryTarget
                    ? 'border-hearth-line bg-terracotta-50 text-hearth-ink'
                    : 'border-chrome-line bg-white text-ink-body'
                }`}
              >
                {planningMessage}
              </p>
            )}
            <div data-testid="recipe-dated-planning-actions" className="flex items-stretch gap-2">
              {onBeginPlanning && (
                <button
                  type="button"
                  data-testid="action-begin-planning"
                  onClick={onBeginPlanning}
                  disabled={departureBlocked}
                  className="inline-flex min-h-[48px] min-w-0 flex-1 items-center justify-center rounded-xl bg-hearth-fill px-[16px] py-[12px] text-sm font-semibold text-white hover:bg-hearth-fill-hover active:bg-hearth-fill-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body disabled:opacity-60"
                >
                  {t('recipes.plan', 'Plan')}
                </button>
              )}
              {isConfirmedPlanned ? (
                <button
                  type="button"
                  data-testid="action-planned"
                  onClick={onOpenPlannedDay}
                  disabled={departureBlocked}
                  aria-label={tWithVars(
                    'recipes.openPlannedDay',
                    'Planned for {{day}}. Open Planner',
                    { day: plannedDayLabel! }
                  )}
                  className="inline-flex min-h-[48px] min-w-0 flex-1 items-center justify-center rounded-xl border border-chrome-line bg-white px-[16px] py-[12px] text-sm font-semibold text-ink-body shadow-sm hover:bg-charcoal/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body disabled:opacity-60"
                >
                  <span className="min-w-0 break-words">
                    {tWithVars('recipes.plannedForDay', 'Planned for {{day}}', {
                      day: plannedDayLabel!,
                    })}
                  </span>
                </button>
              ) : hasDatedAction && !sourceDayLabel ? (
                <button
                  type="button"
                  data-testid="action-add-to-day"
                  onClick={() => (onRetryTarget ? onRetryTarget() : void handleUseRecipe())}
                  disabled={isSavingAction || planningLoading}
                  className="inline-flex min-h-[48px] min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-hearth-fill px-[16px] py-[12px] text-sm font-semibold text-white hover:bg-hearth-fill-hover active:bg-hearth-fill-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body disabled:opacity-60"
                >
                  <span className="min-w-0 break-words">
                    {isSavingAction
                      ? t('common.saving', 'Saving')
                      : planningNeedsCheck
                        ? t('recipes.retryPlanCheck', 'Retry check')
                        : planningLoading
                          ? t('common.loading', 'Loading…')
                          : (planningActionLabel ?? primaryActionLabel)}
                  </span>
                </button>
              ) : sourceDayLabel && onRetryTarget ? (
                <button
                  type="button"
                  data-testid="action-add-to-day"
                  onClick={onRetryTarget}
                  disabled={isSavingAction || planningLoading}
                  className="inline-flex min-h-[48px] min-w-0 flex-1 items-center justify-center rounded-xl bg-hearth-fill px-[16px] py-[12px] text-sm font-semibold text-white hover:bg-hearth-fill-hover active:bg-hearth-fill-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body disabled:opacity-60"
                >
                  {planningLoading
                    ? t('common.loading', 'Loading…')
                    : (planningActionLabel ?? t('recipes.retryPlanCheck', 'Retry check'))}
                </button>
              ) : null}
              {!isConfirmedPlanned && onChangeDay && (
                <button
                  type="button"
                  data-testid="action-change-day"
                  aria-label={t('recipes.changeDay', 'Change day')}
                  title={t('recipes.changeDay', 'Change day')}
                  disabled={isSavingAction}
                  aria-disabled={isSavingAction || changeDayDisabled}
                  onClick={() => {
                    // A pending target read blocks activation while keeping the
                    // chooser's return-focus trigger connected and focusable.
                    if (!changeDayDisabled) onChangeDay();
                  }}
                  className="inline-flex min-h-[48px] w-[48px] min-w-[48px] flex-none items-center justify-center rounded-xl text-icon-affordance hover:text-ink-body focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
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
      {showPairedDuplicateSheet && recipe && suspectedDuplicateId && (
        <PairedDuplicateReviewSheet
          open
          newRecipe={recipe}
          existingRecipeId={suspectedDuplicateId}
          onClose={() => setShowPairedDuplicateSheet(false)}
          onKeepBothComplete={(updated) => {
            setRecipe(updated);
            setShowPairedDuplicateSheet(false);
          }}
          onNewMovedToBin={() => {
            setShowPairedDuplicateSheet(false);
            onDeleted?.();
            onClose();
          }}
          onExistingMovedToBin={(updated) => {
            setRecipe(updated);
            setShowPairedDuplicateSheet(false);
          }}
          onOpenStandardIssueEditor={() => {
            setShowPairedDuplicateSheet(false);
            setShowImportIssueSheet(true);
          }}
        />
      )}
    </div>
  );
}
