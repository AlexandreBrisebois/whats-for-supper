import { useLayoutEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Guid } from '@microsoft/kiota-abstractions';
import { prepareSupper } from '@/lib/api/supper-servings';
import { CalendarUnavailableError } from '@/lib/deployment-calendar';
import {
  getIngredientProjection,
  resolveRecipeImportIssue,
  saveRecipeImportIssue,
} from '@/lib/api/recipes';
import type {
  IngredientContext,
  Recipe,
  RecipeImportIssueDraft,
  RecipeImportIssueReason,
} from '@/lib/api/recipes';
import type { IngredientProjection, PrepareSupperRequest } from '@/lib/api/generated/models';
import { t } from '@/locales';
import { useTodayStore } from '@/store/todayStore';
import type {
  PreparationReviewState,
  ProjectionReadState,
  QuantityGenerationControls,
  QuantityNoticeState,
} from './types';

export interface UseCooksModeCompletionAndIssuesOptions {
  recipeId: string;
  ingredientContext?: IngredientContext;
  contextKey: string | null;
  contentKey: string;
  recipeDetails: Recipe | null;
  projection?: IngredientProjection;
  quantitiesAvailable: boolean;
  setRecipeDetails: Dispatch<SetStateAction<Recipe | null>>;
  setProjectionRead: Dispatch<SetStateAction<ProjectionReadState | null>>;
  setQuantityNotice: Dispatch<SetStateAction<QuantityNoticeState | null>>;
  setReimportAcknowledgement: Dispatch<SetStateAction<boolean>>;
  generationControls: QuantityGenerationControls;
  onClose: () => void;
  onCooked?: () => void;
}

export function useCooksModeCompletionAndIssues({
  recipeId,
  ingredientContext,
  contextKey,
  contentKey,
  recipeDetails,
  projection,
  quantitiesAvailable,
  setRecipeDetails,
  setProjectionRead,
  setQuantityNotice,
  setReimportAcknowledgement,
  generationControls,
  onClose,
  onCooked,
}: UseCooksModeCompletionAndIssuesOptions) {
  const [showCelebration, setShowCelebration] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const completionInFlight = useRef(false);
  const uncertainPreparation = useRef<PrepareSupperRequest | null>(null);
  const [checkingPreparation, setCheckingPreparation] = useState(false);
  const [preparationReview, setPreparationReview] = useState<PreparationReviewState>(null);
  const [reviewingPreparation, setReviewingPreparation] = useState(false);

  const preparationReviewRef = useRef(preparationReview);
  useLayoutEffect(() => {
    preparationReviewRef.current = preparationReview;
  }, [preparationReview]);

  const [showDetailId, setShowDetailId] = useState<string | null>(null);
  const [showOriginals, setShowOriginals] = useState(false);
  const [reportPending, setReportPending] = useState(false);
  const [reportContext, setReportContext] = useState<RecipeImportIssueReason | null>(null);

  const clearQuantitiesPreparationReview = () => {
    if (preparationReviewRef.current === 'quantities') {
      uncertainPreparation.current = null;
      setCheckingPreparation(false);
      setPreparationReview(null);
      setCompletionError(null);
    }
  };

  const reviewPreparation = async () => {
    if (!contextKey || ingredientContext?.context !== 'assigned' || reviewingPreparation) return;
    setReviewingPreparation(true);
    setCompletionError(null);
    const generation = generationControls.nextGeneration();
    try {
      // The captured identity stays fixed: a recreated assignment must fail this read.
      const current = await getIngredientProjection(recipeId, ingredientContext);
      if (generation !== generationControls.currentGeneration()) return;
      if (current.preparation) {
        setProjectionRead({ key: contextKey, data: current });
        uncertainPreparation.current = null;
        setCheckingPreparation(false);
        setPreparationReview(null);
        useTodayStore.getState().confirmPreparation({
          occurrenceId: current.occurrenceId,
          recipeId: current.recipeId,
          supperDate: current.supperDate,
          preparation: current.preparation,
        });
        return;
      }
      if (!current.preparationPlanToken || !current.preparationServingVersion)
        throw new Error('Preparation needs confirmation.');
      if (current.version !== generationControls.getAppliedProjection()?.version) {
        setPreparationReview('quantities');
        setQuantityNotice({ key: contextKey, available: true, error: false });
      } else {
        // Explicit review may accept fresh guards only for the quantities already displayed.
        setProjectionRead({ key: contextKey, data: current });
        uncertainPreparation.current = null;
        setCheckingPreparation(false);
        setPreparationReview(null);
        setQuantityNotice({ key: contextKey, available: false, error: false });
      }
    } catch {
      if (generation === generationControls.currentGeneration())
        setCompletionError(
          t(
            'cook.preparationReviewFailed',
            'Could not review this supper. Your cooking work is kept.'
          )
        );
    } finally {
      setReviewingPreparation(false);
    }
  };

  const finishCooking = async () => {
    if (completionInFlight.current || projection?.preparation || preparationReview) return;
    completionInFlight.current = true;
    setIsCompleting(true);
    setCompletionError(null);
    try {
      if (ingredientContext?.context === 'assigned') {
        const displayed = generationControls.getAppliedProjection();
        if (
          !uncertainPreparation.current &&
          (!displayed?.preparationPlanToken ||
            !displayed.preparationServingVersion ||
            quantitiesAvailable)
        )
          throw new Error(
            t(
              'cook.reviewPreparation',
              'Review the current supper and quantities before preparing it.'
            )
          );
        const request: PrepareSupperRequest = uncertainPreparation.current ?? {
          expectedOccurrenceId: ingredientContext.occurrenceId as Guid,
          recipeId: recipeId as Guid,
          expectedPlanToken: displayed!.preparationPlanToken,
          expectedServingVersion: displayed!.preparationServingVersion,
        };
        const confirmCaptured = async () => {
          const current = await getIngredientProjection(recipeId, ingredientContext);
          if (
            current.preparation?.planToken !== request.expectedPlanToken ||
            current.preparation?.servingVersion !== request.expectedServingVersion
          ) {
            setPreparationReview('required');
            throw new Error(
              t(
                'cook.preparationUnconfirmed',
                'Preparation could not be confirmed. Review this supper before trying again.'
              )
            );
          }
          return {
            occurrenceId: request.expectedOccurrenceId,
            recipeId: request.recipeId,
            supperDate: current.supperDate,
            preparation: current.preparation,
          };
        };
        let outcome;
        if (uncertainPreparation.current) outcome = await confirmCaptured();
        else {
          try {
            outcome = await prepareSupper(ingredientContext.supperDate, request);
          } catch (error) {
            const status = (error as { responseStatusCode?: number })?.responseStatusCode;
            if (status === 400 || status === 409 || status === 412) {
              setPreparationReview('required');
              throw error;
            }
            // Retain the original guards across failed reads; recovery never replays this write.
            uncertainPreparation.current = request;
            setCheckingPreparation(true);
            outcome = await confirmCaptured();
          }
        }
        uncertainPreparation.current = null;
        setCheckingPreparation(false);
        useTodayStore.getState().confirmPreparation(outcome);
      } else await useTodayStore.getState().markCooked(recipeId);
      setShowCelebration(true);
      setTimeout(() => {
        onCooked?.();
        onClose();
      }, 600);
    } catch (error) {
      completionInFlight.current = false;
      setIsCompleting(false);
      setCompletionError(
        error instanceof CalendarUnavailableError
          ? error.message
          : t('cook.completionFailed', 'Could not save cooking completion. Please try again.')
      );
    }
  };

  const applyReportRecipe = (updated: Recipe) => {
    // A report owns quality metadata, not the active content snapshot.
    setRecipeDetails(
      (current) =>
        current && {
          ...current,
          importIssue: updated.importIssue,
          canReimport: updated.canReimport,
          isReady: updated.isReady,
        }
    );
    const displayedRevision =
      generationControls.getAppliedProjection()?.contentRevision ?? recipeDetails?.contentRevision;
    if (updated.contentRevision && updated.contentRevision !== displayedRevision) {
      // Retire reads started before this content hint, including a pending refresh.
      generationControls.bumpGeneration();
      setQuantityNotice({ key: contentKey, error: false, available: true });
    }
  };

  const handleSaveImportIssue = async (draft: RecipeImportIssueDraft) => {
    if (!recipeDetails) return;
    setReportPending(true);
    try {
      const submission = await saveRecipeImportIssue(recipeDetails.id, draft);
      applyReportRecipe(submission.recipe);
      if (submission.reimportLaunchFailed) throw new Error('Re-import launch failed');
      setReportContext(null);
      setReimportAcknowledgement(submission.reimportStarted);
    } finally {
      setReportPending(false);
    }
  };

  const handleResolveImportIssue = async () => {
    if (!recipeDetails) return;
    setReportPending(true);
    try {
      const updated = await resolveRecipeImportIssue(recipeDetails.id);
      applyReportRecipe(updated);
      setReportContext(null);
    } finally {
      setReportPending(false);
    }
  };

  return {
    showCelebration,
    isCompleting,
    completionError,
    checkingPreparation,
    preparationReview,
    reviewingPreparation,
    reviewPreparation,
    finishCooking,
    clearQuantitiesPreparationReview,
    showDetailId,
    setShowDetailId,
    showOriginals,
    setShowOriginals,
    reportPending,
    reportContext,
    setReportContext,
    handleSaveImportIssue,
    handleResolveImportIssue,
  };
}
