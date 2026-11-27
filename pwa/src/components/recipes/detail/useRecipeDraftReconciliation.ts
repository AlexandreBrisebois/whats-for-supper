import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
import { getRecipe, type Recipe } from '@/lib/api/recipes';
import type { UpdateRecipeDto_mealTypes } from '@/lib/api/generated/models/index';

export const MEAL_TYPE_OPTIONS: UpdateRecipeDto_mealTypes[] = [
  'Breakfast',
  'Brunch',
  'Snack',
  'Lunch',
  'Supper',
  'Sides',
  'Dessert',
  'Appetizer',
  'Beverage',
];

export function resolveMealTypes(source: Recipe): UpdateRecipeDto_mealTypes[] {
  if (source.mealTypes && source.mealTypes.length > 0) {
    return source.mealTypes.filter(Boolean);
  }

  const category = source.category?.trim();
  if (category && MEAL_TYPE_OPTIONS.includes(category as UpdateRecipeDto_mealTypes)) {
    return [category as UpdateRecipeDto_mealTypes];
  }

  return ['Supper'];
}

export type EditorSessionState = Omit<EditorDraft, 'fields'>;

export interface ReconcileContext {
  draftFields: EditorFields;
  draftStructured: boolean;
  saved: EditorBaseline;
}

export interface UseRecipeDraftReconciliationOptions {
  recipeId: string;
  recipe: Recipe | null;
  isEditing: boolean;
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
  editorValues: EditorFields;
  installEditorFields: (fields: EditorFields) => void;
  saveVisitRef: React.MutableRefObject<number>;
  setEditError: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useRecipeDraftReconciliation({
  recipeId,
  recipe,
  isEditing,
  setIsEditing,
  editorValues,
  installEditorFields,
  saveVisitRef,
  setEditError,
}: UseRecipeDraftReconciliationOptions) {
  const reconcileReadRef = useRef(0);
  const draftStorageBlocked = useRef(false);

  const [draftRevision, setDraftRevision] = useState<string | null>(null);
  const [saveNeedsRead, setSaveNeedsRead] = useState(false);
  const [currentSavedRecipe, setCurrentSavedRecipe] = useState<Recipe | null>(null);
  const [editorSession, setEditorSession] = useState<EditorSessionState | null>(null);
  const [draftRecovered, setDraftRecovered] = useState(false);
  const [draftStorageIssue, setDraftStorageIssue] = useState(false);
  const [reconcileChoices, setReconcileChoices] = useState<
    Partial<Record<EditorField, 'draft' | 'current'>>
  >({});
  const [conflictFields, setConflictFields] = useState<EditorField[]>([]);
  const [reconcileReadError, setReconcileReadError] = useState(false);
  const [reconcileContext, setReconcileContext] = useState<ReconcileContext | null>(null);

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
    const schemaChanged = session.baseline.structured !== next.structured;
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
        ? { draftFields, draftStructured: session.baseline.structured, saved: next }
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
      next.ingredientDrafts = source.ingredientDrafts;
    } else (next as unknown as Record<string, unknown>)[field] = source[field];
    installEditorFields(restoreDeletedEditorRows(next, reconcileContext.saved));
    setReconcileChoices((choices) => ({ ...choices, [field]: choice }));
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
    editorValues.name,
    editorValues.description,
    editorValues.servings,
    editorValues.totalTime,
    editorValues.cuisineType,
    editorValues.mealTypes,
    editorValues.ingredients,
    editorValues.ingredientDrafts,
    editorValues.instructions,
  ]);

  const bumpReconcileGeneration = () => {
    reconcileReadRef.current += 1;
  };

  const discardStoredDraft = () => {
    if (!draftStorageBlocked.current) {
      setDraftStorageIssue(!discardEditorDraft(recipeId));
    }
  };

  const resetReconciliationSession = (source: Recipe) => {
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
    setDraftRevision(source.contentRevision ?? null);
    setSaveNeedsRead(false);
    setCurrentSavedRecipe(null);
  };

  const hydrateLoadedRecipeDraft = (nextRecipe: Recipe) => {
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
    setIsEditing(!!retained);
    setEditError(null);
  };

  const requireReconcileAfterFailedSave = () => {
    setSaveNeedsRead(true);
    void loadSavedBaselineForReconcile();
  };

  return {
    draftRevision,
    saveNeedsRead,
    currentSavedRecipe,
    editorSession,
    draftRecovered,
    draftStorageIssue,
    reconcileChoices,
    conflictFields,
    reconcileReadError,
    reconcileContext,
    bumpReconcileGeneration,
    discardStoredDraft,
    resetReconciliationSession,
    hydrateLoadedRecipeDraft,
    requireReconcileAfterFailedSave,
    loadSavedBaselineForReconcile,
    chooseReconcileField,
  };
}
