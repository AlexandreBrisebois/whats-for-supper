import { useEffect, useRef, useState } from 'react';
import {
  getRecipe,
  getRecipeImportStatus,
  saveRecipeImportIssue,
  resolveRecipeImportIssue,
  type RecipeImportIssueDraft,
  type Recipe,
} from '@/lib/api/recipes';
import { useUiStore } from '@/store/uiStore';

const IMPORT_STATUS_POLL_INTERVAL_MS = 1000;

export interface UseRecipeImportIssueControllerOptions {
  recipeId: string;
  recipe: Recipe | null;
  initialReviewDuplicate: boolean;
  setRecipe: React.Dispatch<React.SetStateAction<Recipe | null>>;
}

export function useRecipeImportIssueController({
  recipeId,
  recipe,
  initialReviewDuplicate,
  setRecipe,
}: UseRecipeImportIssueControllerOptions) {
  const [showImportIssueSheet, setShowImportIssueSheet] = useState(false);
  const [showPairedDuplicateSheet, setShowPairedDuplicateSheet] = useState(false);
  const autoOpenedDuplicateForRef = useRef<string | null>(null);
  const importPollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchedImportIdRef = useRef<string | null>(null);
  const addToast = useUiStore((state) => state.addToast);

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

  useEffect(() => {
    return () => {
      watchedImportIdRef.current = null;
      if (importPollTimerRef.current) clearTimeout(importPollTimerRef.current);
    };
  }, [recipeId]);

  const openIssueReview = () => {
    if (suspectedDuplicateId) {
      setShowPairedDuplicateSheet(true);
      return;
    }
    setShowImportIssueSheet(true);
  };

  const closeImportIssue = () => setShowImportIssueSheet(false);

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

  return {
    showImportIssueSheet,
    setShowImportIssueSheet,
    showPairedDuplicateSheet,
    setShowPairedDuplicateSheet,
    suspectedDuplicateId,
    openIssueReview,
    closeImportIssue,
    handleSaveImportIssue,
    handleResolveImportIssue,
  };
}
