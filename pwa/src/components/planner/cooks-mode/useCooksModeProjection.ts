import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { getIngredientProjection, getRecipe } from '@/lib/api/recipes';
import type { IngredientContext, Recipe } from '@/lib/api/recipes';
import { subscribeIngredientProjectionInvalidation } from '@/lib/ingredient-projection-invalidation';
import { ingredientProjectionText } from '@/lib/ingredient-presentation';
import {
  parseRecipeSteps,
  projectedCookingSteps,
  type CookingStep,
} from '@/lib/cooking/stepParser';
import type {
  CookingIngredientItem,
  ProjectionReadState,
  QuantityGenerationControls,
  QuantityNoticeState,
} from './types';

export interface UseCooksModeProjectionOptions {
  recipeId: string;
  ingredientContext?: IngredientContext;
  gathered: Record<string, boolean>;
  rawStepProgress: number;
  isEditing: boolean;
}

export function useCooksModeProjection(
  instructionScrollRef: RefObject<HTMLDivElement | null>,
  {
    recipeId,
    ingredientContext,
    gathered,
    rawStepProgress,
    isEditing,
  }: UseCooksModeProjectionOptions
) {
  const [recipeDetails, setRecipeDetails] = useState<Recipe | null>(null);
  const [parsedSteps, setParsedSteps] = useState<CookingStep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [contentError, setContentError] = useState(false);
  const [readAttempt, setReadAttempt] = useState(0);
  const [reimportAcknowledgement, setReimportAcknowledgement] = useState(false);

  const contextKey = ingredientContext ? JSON.stringify([recipeId, ingredientContext]) : null;
  const contentKey = contextKey ?? JSON.stringify([recipeId, 'original']);

  const [projectionRead, setProjectionRead] = useState<ProjectionReadState | null>(null);
  const [projectionAttempt, setProjectionAttempt] = useState(0);
  const quantityRequest = useRef(0);

  useEffect(
    () => () => {
      quantityRequest.current++;
    },
    [contentKey]
  );

  const projection = projectionRead?.key === contextKey ? projectionRead?.data : undefined;
  const projectionError = Boolean(projectionRead?.key === contextKey && projectionRead?.error);

  useEffect(() => {
    if (!contextKey) return;
    let active = true;
    const generation = ++quantityRequest.current;
    const [id, context] = JSON.parse(contextKey) as [string, IngredientContext];
    void getIngredientProjection(id, context)
      .then((data) => {
        if (active && generation === quantityRequest.current)
          setProjectionRead({ key: contextKey, data });
      })
      .catch(() => {
        if (active && generation === quantityRequest.current)
          setProjectionRead({ key: contextKey, error: true });
      });
    return () => {
      active = false;
    };
  }, [contextKey, projectionAttempt]);

  const [quantityNotice, setQuantityNotice] = useState<QuantityNoticeState | null>(null);
  const quantitiesAvailable = Boolean(
    quantityNotice?.key === contentKey && quantityNotice.available
  );
  const quantityRefreshError = Boolean(quantityNotice?.key === contentKey && quantityNotice.error);
  const [quantityRefreshing, setQuantityRefreshing] = useState(false);
  const quantityInvalidated = useRef(false);
  const quantityRefreshInFlight = useRef(false);
  const appliedProjection = useRef(projection);

  const projectedSteps = projectedCookingSteps(projection);
  const steps = projectedSteps ?? parsedSteps;
  const currentStep = Math.min(rawStepProgress, steps.length);

  const gatheredRef = useRef(gathered);
  const currentStepRef = useRef(currentStep);
  const isEditingRef = useRef(isEditing);

  useLayoutEffect(() => {
    appliedProjection.current = projection;
  }, [projection]);

  useLayoutEffect(() => {
    gatheredRef.current = gathered;
    currentStepRef.current = currentStep;
    isEditingRef.current = isEditing;
  }, [gathered, currentStep, isEditing]);

  useEffect(() => {
    if (!contextKey) return;
    let active = true;
    let probeRequest = 0;
    const [id, context] = JSON.parse(contextKey) as [string, IngredientContext];
    const probe = async () => {
      if (!appliedProjection.current || quantityRefreshInFlight.current) {
        quantityInvalidated.current = true;
        return;
      }
      quantityInvalidated.current = false;
      // A background hint can retire another probe, but cannot supersede an
      // explicit Save or refresh. Foreground work still retires older probes.
      const generation = quantityRequest.current;
      const probeGeneration = ++probeRequest;
      try {
        const current = await getIngredientProjection(id, context);
        if (!active || generation !== quantityRequest.current || probeGeneration !== probeRequest)
          return;
        const hasCookingProgress =
          Object.values(gatheredRef.current).some(Boolean) ||
          currentStepRef.current > 0 ||
          isEditingRef.current ||
          (instructionScrollRef.current?.scrollTop ?? 0) > 0;
        const changed =
          current.version !== appliedProjection.current!.version ||
          current.contentRevision !== appliedProjection.current!.contentRevision;
        if (!changed || !hasCookingProgress) {
          setProjectionRead({ key: contextKey, data: current });
          setQuantityNotice({ key: contextKey, error: false, available: false });
        } else {
          setQuantityNotice({ key: contextKey, error: false, available: true });
        }
      } catch {
        if (active && generation === quantityRequest.current && probeGeneration === probeRequest)
          setQuantityNotice((previous) => ({
            key: contextKey,
            error: true,
            available: Boolean(previous?.key === contextKey && previous.available),
          }));
      }
    };
    const unsubscribe = subscribeIngredientProjectionInvalidation(context, () => void probe());
    if (quantityInvalidated.current) void probe();
    return () => {
      active = false;
      unsubscribe();
    };
  }, [contextKey, projection, instructionScrollRef]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    const fetchDetails = async () => {
      setIsLoading(true);
      setContentError(false);
      try {
        const details = await getRecipe(recipeId);
        if (!isActive) return;
        setRecipeDetails(details);
        setReimportAcknowledgement(details.importIssue?.isReimporting === true);
        setParsedSteps(parseRecipeSteps(details.recipeInstructions));
      } catch (error) {
        if (!isActive) return;
        console.error('[CooksMode] Failed to fetch recipe details:', error);
        setRecipeDetails(null);
        setParsedSteps([]);
        setContentError(true);
      } finally {
        if (isActive) setIsLoading(false);
      }
    };
    void fetchDetails();
    return () => {
      isActive = false;
    };
  }, [recipeId, readAttempt]);

  const refreshQuantities = async (onRefreshed?: () => void) => {
    if (quantityRefreshInFlight.current) return;
    quantityRefreshInFlight.current = true;
    const generation = ++quantityRequest.current;
    setQuantityRefreshing(true);
    try {
      if (contextKey) {
        const [id, context] = JSON.parse(contextKey) as [string, IngredientContext];
        const data = await getIngredientProjection(id, context);
        if (generation !== quantityRequest.current) return;
        setProjectionRead({ key: contextKey, data });
      } else {
        const details = await getRecipe(recipeId);
        if (generation !== quantityRequest.current) return;
        setRecipeDetails(details);
        setParsedSteps(parseRecipeSteps(details.recipeInstructions));
      }
      setQuantityNotice({ key: contentKey, error: false, available: false });
      onRefreshed?.();
    } catch {
      if (generation === quantityRequest.current)
        setQuantityNotice((previous) => ({
          key: contentKey,
          error: true,
          available: Boolean(previous?.key === contentKey && previous.available),
        }));
    } finally {
      // Only one explicit refresh runs at a time. A report may retire its data
      // generation, but the settled request must still release the retry control.
      quantityRefreshInFlight.current = false;
      setQuantityRefreshing(false);
    }
  };

  const ingredients: CookingIngredientItem[] = ingredientContext
    ? (projection?.lines ?? []).map((line, index) => ({
        key: `${index}:${line.originalText}`,
        text: ingredientProjectionText(line),
      }))
    : (recipeDetails?.ingredients ?? []).map((text) => ({ key: text, text }));

  const scaled = Boolean(
    projection?.factor != null &&
    projection.factor !== 1 &&
    projection.lines?.some((line) => line.status === 'scaled')
  );

  const generationControls: QuantityGenerationControls = {
    nextGeneration: () => ++quantityRequest.current,
    currentGeneration: () => quantityRequest.current,
    bumpGeneration: () => {
      quantityRequest.current++;
    },
    getAppliedProjection: () => appliedProjection.current,
  };

  return {
    contextKey,
    contentKey,
    recipeDetails,
    setRecipeDetails,
    parsedSteps,
    setParsedSteps,
    isLoading,
    contentError,
    retryLoadContent: () => setReadAttempt((attempt) => attempt + 1),
    reimportAcknowledgement,
    setReimportAcknowledgement,
    projection,
    projectionError,
    retryProjection: () => setProjectionAttempt((value) => value + 1),
    setProjectionRead,
    setQuantityNotice,
    quantitiesAvailable,
    quantityRefreshError,
    quantityRefreshing,
    refreshQuantities,
    projectedSteps,
    steps,
    currentStep,
    ingredients,
    scaled,
    generationControls,
  };
}
