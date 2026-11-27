import { useEffect, useState } from 'react';
import {
  getIngredientProjection,
  getIngredientPreview,
  type PreviewPortions,
  type IngredientContext,
  type Recipe,
} from '@/lib/api/recipes';
import { subscribeIngredientProjectionInvalidation } from '@/lib/ingredient-projection-invalidation';
import type { IngredientProjection, IngredientPreview } from '@/lib/api/generated/models/index';

export interface UseRecipePortionsPreviewOptions {
  recipeId: string;
  recipe: Recipe | null;
  ingredientContext?: IngredientContext;
  isEditing: boolean;
  planningLoading: boolean;
  planningNeedsCheck: boolean;
  onInvalidateRecipe: () => void;
}

export function useRecipePortionsPreview({
  recipeId,
  recipe,
  ingredientContext,
  isEditing,
  planningLoading,
  planningNeedsCheck,
  onInvalidateRecipe,
}: UseRecipePortionsPreviewOptions) {
  const projectionKey = ingredientContext ? JSON.stringify([recipeId, ingredientContext]) : null;
  const [projectionRead, setProjectionRead] = useState<{
    key: string;
    data?: IngredientProjection;
    error?: boolean;
  } | null>(null);
  const [projectionAttempt, setProjectionAttempt] = useState(0);

  const projection =
    projectionKey && projectionRead?.key === projectionKey ? projectionRead.data : undefined;
  const projectionError = Boolean(
    projectionKey && projectionRead?.key === projectionKey && projectionRead.error
  );
  const originalBasisServings = ingredientContext ? projection?.baseServings : recipe?.servings;
  const originalIngredientTexts = ingredientContext
    ? (projection?.lines ?? []).map((line) => line.originalText ?? '')
    : (recipe?.ingredients ?? []);
  const headingServings = ingredientContext
    ? (projection?.targetServings ??
      (projection?.status === 'original' ? projection.baseServings : null))
    : recipe?.servings;

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
  const previewError = Boolean(previewKey && previewRead?.key === previewKey && previewRead.error);

  const displayedProjection = showingOriginalEvidence
    ? undefined
    : previewTarget
      ? preview
      : projection;
  const readingBasisServings = previewTarget ? preview?.baseServings : originalBasisServings;

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
      onInvalidateRecipe();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [previewKey, previewTarget, recipeId, projectionKey, previewAttempt, onInvalidateRecipe]);

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

  const resetProjection = () => {
    setProjectionRead(null);
    setProjectionAttempt((value) => value + 1);
  };

  const clearPreviewSelection = () => {
    setPreviewSelection(null);
  };

  const showOriginalQuantities = () => {
    setPreviewSelection(null);
    setOriginalEvidenceScope(previewScope);
  };

  const resetQuantitiesView = () => {
    setPreviewSelection(null);
    setOriginalEvidenceScope(null);
  };

  const selectPreviewTarget = (target: PreviewPortions) => {
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
  };

  const retryPreview = () => {
    setPreviewAttempt((value) => value + 1);
  };

  const retryProjection = () => {
    setProjectionAttempt((value) => value + 1);
  };

  return {
    projection,
    projectionError,
    preview,
    previewError,
    previewTarget,
    showingOriginalEvidence,
    displayedProjection,
    originalBasisServings,
    originalIngredientTexts,
    headingServings,
    readingBasisServings,
    resetProjection,
    clearPreviewSelection,
    showOriginalQuantities,
    resetQuantitiesView,
    selectPreviewTarget,
    retryPreview,
    retryProjection,
  };
}
