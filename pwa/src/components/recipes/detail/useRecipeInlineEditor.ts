import { useRef, useState } from 'react';
import {
  ingredientDraft,
  prepareIngredientDrafts,
  type IngredientDraft,
} from '@/lib/recipes/ingredient-draft';
import type { EditorFields } from '@/lib/recipes/editor-draft';
import {
  originalInstructions,
  structuredInstructionInput,
  legacyInstructionInput,
} from '@/lib/recipes/instruction-draft';
import { updateRecipe, type IngredientContext, type Recipe } from '@/lib/api/recipes';
import { minutesToIsoDuration, parseRecipeTimeMinutes } from '@/lib/duration';
import { t } from '@/locales';
import {
  MEAL_TYPE_OPTIONS,
  resolveMealTypes,
  useRecipeDraftReconciliation,
  type EditorSessionState,
  type ReconcileContext,
} from './useRecipeDraftReconciliation';
import type {
  IngredientProjection,
  UpdateRecipeDto_mealTypes,
} from '@/lib/api/generated/models/index';

export { MEAL_TYPE_OPTIONS, resolveMealTypes, type EditorSessionState, type ReconcileContext };

export interface UseRecipeInlineEditorOptions {
  recipeId: string;
  recipe: Recipe | null;
  ingredientContext?: IngredientContext;
  projection?: IngredientProjection;
  isEditing: boolean;
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
  installRecipeSnapshot: (source: Recipe) => void;
  setRecipe: React.Dispatch<React.SetStateAction<Recipe | null>>;
  resetProjection: () => void;
}

export function useRecipeInlineEditor({
  recipeId,
  recipe,
  ingredientContext,
  projection,
  isEditing,
  setIsEditing,
  installRecipeSnapshot,
  setRecipe,
  resetProjection,
}: UseRecipeInlineEditorOptions) {
  const saveVisitRef = useRef(0);

  const [draftServings, setDraftServings] = useState('');
  const [draftName, setDraftName] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftIngredients, setDraftIngredients] = useState<string[]>([]);
  const [draftInstructions, setDraftInstructions] = useState<unknown[] | undefined>(undefined);
  const [ingredientDrafts, setIngredientDrafts] = useState<IngredientDraft[]>([]);
  const [draftCuisineType, setDraftCuisineType] = useState('');
  const [draftTotalTime, setDraftTotalTime] = useState('');
  const [draftMealTypes, setDraftMealTypes] = useState<UpdateRecipeDto_mealTypes[]>([]);

  const [isSavingRecipe, setIsSavingRecipe] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const editorValues: EditorFields = {
    name: draftName,
    description: draftDescription,
    servings: draftServings,
    totalTime: draftTotalTime,
    cuisineType: draftCuisineType,
    mealTypes: draftMealTypes,
    ingredients: draftIngredients,
    ingredientDrafts,
    instructions: draftInstructions,
  };

  const installEditorFields = (fields: EditorFields) => {
    setDraftName(fields.name);
    setDraftDescription(fields.description);
    setDraftServings(fields.servings);
    setDraftTotalTime(fields.totalTime ?? '');
    setDraftCuisineType(fields.cuisineType);
    setDraftMealTypes(fields.mealTypes);
    setDraftIngredients(fields.ingredients);
    setIngredientDrafts(fields.ingredientDrafts);
    setDraftInstructions(fields.instructions);
  };

  const reconciliation = useRecipeDraftReconciliation({
    recipeId,
    recipe,
    isEditing,
    setIsEditing,
    editorValues,
    installEditorFields,
    saveVisitRef,
    setEditError,
  });

  const structuredEditing =
    reconciliation.editorSession?.baseline.structured ?? recipe?.contentSchemaVersion === 2;
  const preparedDrafts = prepareIngredientDrafts(ingredientDrafts);

  const beginRecipeLoadCycle = () => {
    saveVisitRef.current += 1;
    reconciliation.bumpReconcileGeneration();
    setIsEditing(false);
    setIsSavingRecipe(false);
    setEditError(null);
  };

  const endRecipeLoadCycle = () => {
    saveVisitRef.current += 1;
  };

  const resetDrafts = (source: Recipe) => {
    reconciliation.resetReconciliationSession(source);
    const basis =
      source.contentSchemaVersion === 2
        ? source.servings
        : ingredientContext && projection
          ? projection.baseServings
          : source.servings;
    setDraftServings(basis == null ? '' : String(basis));
    setIngredientDrafts((source.ingredientLines ?? []).map(ingredientDraft));
    setDraftInstructions(originalInstructions(source));
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
    reconciliation.discardStoredDraft();
    if (recipe) {
      const source = reconciliation.currentSavedRecipe ?? recipe;
      if (reconciliation.currentSavedRecipe) {
        installRecipeSnapshot(source);
        resetProjection();
      }
      resetDrafts(source);
    }
    setIsEditing(false);
  };

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
  const trimmedTotalTime = draftTotalTime.trim();
  const totalTimeInvalid =
    trimmedTotalTime !== '' &&
    (!/^[0-9]+$/.test(trimmedTotalTime) ||
      Number(trimmedTotalTime) < 1 ||
      Number(trimmedTotalTime) > 10080);
  const parsedDraftTotalTimeMinutes =
    trimmedTotalTime !== '' && !totalTimeInvalid ? Number(trimmedTotalTime) : null;

  const handleSaveRecipeFields = async () => {
    if (
      !recipe ||
      servingsInvalid ||
      totalTimeInvalid ||
      reconciliation.saveNeedsRead ||
      (structuredEditing && (preparedDrafts.invalid || !reconciliation.draftRevision))
    )
      return;
    const savingVisit = saveVisitRef.current;
    const servingsUpdate = draftServings === '' ? {} : { servings: Number(draftServings) };
    const initialTotalMinutes = parseRecipeTimeMinutes(recipe.totalTime);
    const initialTotalTime =
      initialTotalMinutes === null ? null : minutesToIsoDuration(initialTotalMinutes);
    const nextTotalTime =
      parsedDraftTotalTimeMinutes === null
        ? null
        : minutesToIsoDuration(parsedDraftTotalTimeMinutes);
    const totalTimeChanged = nextTotalTime !== initialTotalTime;
    const totalTimeUpdate = totalTimeChanged ? { totalTime: nextTotalTime } : {};

    const cleanedIngredients = draftIngredients
      .map((ingredient) => ingredient.trim())
      .filter(Boolean);
    const normalizedLegacyInstructions =
      !structuredEditing && draftInstructions !== undefined
        ? legacyInstructionInput(draftInstructions)
        : undefined;
    const nextRecipe: Recipe = {
      ...recipe,
      ...servingsUpdate,
      ...(totalTimeChanged ? { totalTime: nextTotalTime ?? '' } : {}),
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
        ...totalTimeUpdate,
        name: nextRecipe.name,
        description: nextRecipe.description,
        ...(structuredEditing
          ? {
              ingredientLines: preparedDrafts.lines,
              expectedContentRevision: reconciliation.draftRevision!,
              ...(draftInstructions === undefined
                ? {}
                : { instructionSections: structuredInstructionInput(draftInstructions) }),
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
      if (structuredEditing && !saved) throw new Error('Authoritative saved recipe is absent.');
      if (saved) installRecipeSnapshot(saved);
      else setRecipe(nextRecipe);
      reconciliation.bumpReconcileGeneration();
      reconciliation.discardStoredDraft();
      setDraftIngredients(cleanedIngredients);
      setIsEditing(false);
      resetProjection();
    } catch (error) {
      console.error('Failed to update recipe fields', error);
      if (saveVisitRef.current !== savingVisit) return;
      setEditError(t('recipes.editFailed', 'Could not save changes. Try again.'));
      reconciliation.requireReconcileAfterFailedSave();
    } finally {
      if (saveVisitRef.current === savingVisit) setIsSavingRecipe(false);
    }
  };

  return {
    draftName,
    setDraftName,
    draftDescription,
    setDraftDescription,
    draftServings,
    setDraftServings,
    draftTotalTime,
    setDraftTotalTime,
    draftCuisineType,
    setDraftCuisineType,
    draftMealTypes,
    setDraftMealTypes,
    draftIngredients,
    setDraftIngredients,
    ingredientDrafts,
    setIngredientDrafts,
    draftInstructions,
    setDraftInstructions,
    draftRevision: reconciliation.draftRevision,
    structuredEditing,
    preparedDrafts,
    servingsInvalid,
    parsedDraftServings,
    totalTimeInvalid,
    parsedDraftTotalTimeMinutes,
    saveNeedsRead: reconciliation.saveNeedsRead,
    isSavingRecipe,
    editError,
    draftStorageIssue: reconciliation.draftStorageIssue,
    draftRecovered: reconciliation.draftRecovered,
    reconcileReadError: reconciliation.reconcileReadError,
    reconcileContext: reconciliation.reconcileContext,
    conflictFields: reconciliation.conflictFields,
    reconcileChoices: reconciliation.reconcileChoices,
    editorSession: reconciliation.editorSession,
    beginRecipeLoadCycle,
    endRecipeLoadCycle,
    hydrateLoadedRecipeDraft: reconciliation.hydrateLoadedRecipeDraft,
    resetDrafts,
    handleCancelEdit,
    handleSaveRecipeFields,
    loadSavedBaselineForReconcile: reconciliation.loadSavedBaselineForReconcile,
    chooseReconcileField: reconciliation.chooseReconcileField,
  };
}
