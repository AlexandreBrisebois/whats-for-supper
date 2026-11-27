'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { SolarLoader } from '@/components/ui/SolarLoader';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { t } from '@/locales';
import { usePlannerStore } from '@/store/plannerStore';
import { CooksModeAllStepsView } from './cooks-mode/CooksModeAllStepsView';
import {
  CooksModeContextBanners,
  CooksModeProgressHeader,
} from './cooks-mode/CooksModeContextBanners';
import { CooksModeFooterControls } from './cooks-mode/CooksModeFooterControls';
import { CooksModeHeroHeader } from './cooks-mode/CooksModeHeroHeader';
import {
  CooksModeIngredientsPrep,
  CooksModeNoStepsCard,
} from './cooks-mode/CooksModeIngredientsPrep';
import { CooksModeCelebrationOverlay, CooksModeOverlays } from './cooks-mode/CooksModeOverlays';
import {
  CooksModeStepByStepView,
  FocusedEditStepButton,
} from './cooks-mode/CooksModeStepByStepView';
import type { CooksModeProps } from './cooks-mode/types';
import { useCooksModeCompletionAndIssues } from './cooks-mode/useCooksModeCompletionAndIssues';
import { useCooksModeInstructionEdit } from './cooks-mode/useCooksModeInstructionEdit';
import { useCooksModeNavigation } from './cooks-mode/useCooksModeNavigation';
import { useCooksModeProjection } from './cooks-mode/useCooksModeProjection';

export type { CooksModeProps } from './cooks-mode/types';

export function CooksMode({
  recipe: initialRecipe,
  onClose,
  onCooked,
  ingredientContext,
}: CooksModeProps) {
  const router = useRouter();
  const stackedLayout = useMediaQuery('(max-width: 767px)');
  const instructionScrollRef = useRef<HTMLDivElement>(null);
  const originalActionRef = useRef<HTMLButtonElement>(null);

  const [gathered, setGathered] = useState<Record<string, boolean>>({});
  const [isEditing, setIsEditing] = useState(false);

  const { cookProgress } = usePlannerStore();
  const progressKey = ingredientContext
    ? JSON.stringify([
        initialRecipe.id,
        ingredientContext.supperDate,
        ingredientContext.context,
        ingredientContext.context === 'assigned' ? ingredientContext.occurrenceId : null,
      ])
    : initialRecipe.id;

  const projectionState = useCooksModeProjection(instructionScrollRef, {
    recipeId: initialRecipe.id,
    ingredientContext,
    gathered,
    rawStepProgress: cookProgress[progressKey] ?? 0,
    isEditing,
  });

  const editor = useCooksModeInstructionEdit({
    recipeId: initialRecipe.id,
    ingredientContext,
    contextKey: projectionState.contextKey,
    contentKey: projectionState.contentKey,
    recipeDetails: projectionState.recipeDetails,
    projection: projectionState.projection,
    steps: projectionState.steps,
    isEditing,
    setIsEditing,
    setRecipeDetails: projectionState.setRecipeDetails,
    setParsedSteps: projectionState.setParsedSteps,
    setProjectionRead: projectionState.setProjectionRead,
    setQuantityNotice: projectionState.setQuantityNotice,
    generationControls: projectionState.generationControls,
  });

  const completion = useCooksModeCompletionAndIssues({
    recipeId: initialRecipe.id,
    ingredientContext,
    contextKey: projectionState.contextKey,
    contentKey: projectionState.contentKey,
    recipeDetails: projectionState.recipeDetails,
    projection: projectionState.projection,
    quantitiesAvailable: projectionState.quantitiesAvailable,
    setRecipeDetails: projectionState.setRecipeDetails,
    setProjectionRead: projectionState.setProjectionRead,
    setQuantityNotice: projectionState.setQuantityNotice,
    setReimportAcknowledgement: projectionState.setReimportAcknowledgement,
    generationControls: projectionState.generationControls,
    onClose,
    onCooked,
  });

  const navigation = useCooksModeNavigation(instructionScrollRef, {
    progressKey,
    steps: projectionState.steps,
    currentStep: projectionState.currentStep,
    isLoading: projectionState.isLoading,
    isEditing,
    isCompleting: completion.isCompleting,
    showOriginals: completion.showOriginals,
  });

  const originalPending =
    editor.editPending ||
    completion.reportPending ||
    completion.isCompleting ||
    navigation.currentViewSaveState === 'saving';

  const currentStepData = projectionState.steps[navigation.activeRecipeStepIndex];
  const focusedEdit = navigation.hasInstructions &&
    !isEditing &&
    !navigation.isPrepStep &&
    !navigation.singlePageEnabled && (
      <FocusedEditStepButton
        onStartEdit={() => editor.startEdit(navigation.activeRecipeStepIndex)}
      />
    );

  if (projectionState.isLoading) {
    return (
      <div
        data-testid="cooks-mode-loading"
        className="fixed inset-0 z-[110] bg-cream flex items-center justify-center"
      >
        <SolarLoader label={t('cook.gettingReady', 'Getting your kitchen ready...')} />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      data-testid="cooks-mode-overlay"
      inert={completion.showOriginals || undefined}
      aria-hidden={completion.showOriginals || undefined}
      className="fixed inset-0 z-[100] bg-cream flex flex-col md:flex-row overflow-hidden pt-[env(safe-area-inset-top)]"
    >
      <CooksModeCelebrationOverlay showCelebration={completion.showCelebration} />

      <CooksModeHeroHeader
        initialRecipe={initialRecipe}
        recipeDetails={projectionState.recipeDetails}
        cookingViewMode={navigation.cookingViewMode}
        isEditing={isEditing}
        isCompleting={completion.isCompleting}
        hasInstructions={navigation.hasInstructions}
        isPrepStep={navigation.isPrepStep}
        stackedLayout={stackedLayout}
        focusedEdit={focusedEdit}
        originalPending={originalPending}
        originalActionRef={originalActionRef}
        showDetailId={completion.showDetailId}
        onOpenDetails={() => completion.setShowDetailId(initialRecipe.id)}
        onChooseCookingView={navigation.chooseCookingView}
        onOpenOriginals={() => completion.setShowOriginals(true)}
        onOpenReport={(reason) => completion.setReportContext(reason)}
        onClose={onClose}
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <CooksModeProgressHeader
          hasInstructions={navigation.hasInstructions}
          isPrepStep={navigation.isPrepStep}
          currentStep={projectionState.currentStep}
          stepsCount={projectionState.steps.length}
          singlePageCooking={navigation.singlePageCooking}
          isVegetarian={initialRecipe.isVegetarian}
          stackedLayout={stackedLayout}
          focusedEdit={focusedEdit}
        />

        <div
          ref={instructionScrollRef}
          onScroll={navigation.trackReadingPosition}
          data-testid="cooks-mode-instructions"
          className="min-h-0 flex-1 overflow-y-auto bg-white"
        >
          <CooksModeContextBanners
            ingredientContext={ingredientContext}
            projection={projectionState.projection}
            projectionError={projectionState.projectionError}
            scaled={projectionState.scaled}
            projectedSteps={projectionState.projectedSteps}
            quantitiesAvailable={projectionState.quantitiesAvailable}
            quantityRefreshError={projectionState.quantityRefreshError}
            quantityRefreshing={projectionState.quantityRefreshing}
            preparationReview={completion.preparationReview}
            reviewingPreparation={completion.reviewingPreparation}
            completionError={completion.completionError}
            onRetryProjection={projectionState.retryProjection}
            onReviewPreparation={() => void completion.reviewPreparation()}
            onRefreshQuantities={() =>
              void projectionState.refreshQuantities(completion.clearQuantitiesPreparationReview)
            }
          />

          <div
            className={`min-h-full flex flex-col items-start justify-start ${navigation.singlePageCooking ? 'px-4 pt-5 pb-8 md:px-10 md:pt-8 lg:px-16' : 'px-8 pt-12 pb-24 md:px-16 md:pt-16 lg:px-24 lg:pt-16'} text-left`}
          >
            <motion.div
              key={navigation.singlePageEnabled ? 'single-page' : projectionState.currentStep}
              initial={false}
              className="w-full max-w-4xl"
            >
              {!navigation.hasInstructions ? (
                <CooksModeNoStepsCard
                  contentError={projectionState.contentError}
                  canReimport={projectionState.recipeDetails?.canReimport}
                  onRetry={projectionState.retryLoadContent}
                  onReportSteps={() => completion.setReportContext('steps')}
                  onOpenDetails={() => completion.setShowDetailId(initialRecipe.id)}
                />
              ) : navigation.isPrepStep ? (
                <CooksModeIngredientsPrep
                  ingredients={projectionState.ingredients}
                  gathered={gathered}
                  onToggleIngredient={(ing) =>
                    setGathered((prev) => ({ ...prev, [ing]: !prev[ing] }))
                  }
                />
              ) : navigation.singlePageEnabled ? (
                <CooksModeAllStepsView
                  steps={projectionState.steps}
                  projectedSteps={projectionState.projectedSteps}
                  isEditing={isEditing}
                  editingStepIndex={editor.editingStepIndex}
                  editingValue={editor.editingValue}
                  editPending={editor.editPending}
                  editError={editor.editError}
                  onStartEdit={editor.startEdit}
                  onChangeEditingValue={editor.setEditingValue}
                  onSaveEdit={() => void editor.handleSaveEdit()}
                  onCancelEdit={editor.handleCancelEdit}
                />
              ) : (
                <CooksModeStepByStepView
                  currentStepData={currentStepData}
                  isEditing={isEditing}
                  editingValue={editor.editingValue}
                  editPending={editor.editPending}
                  editError={editor.editError}
                  onChangeEditingValue={editor.setEditingValue}
                  onSaveEdit={() => void editor.handleSaveEdit()}
                  onCancelEdit={editor.handleCancelEdit}
                />
              )}
            </motion.div>
          </div>
        </div>

        <CooksModeFooterControls
          currentViewSaveState={navigation.currentViewSaveState}
          selectedMemberName={navigation.selectedFamilyMember?.name}
          reimportAcknowledgement={projectionState.reimportAcknowledgement}
          hasInstructions={navigation.hasInstructions}
          singlePageEnabled={navigation.singlePageEnabled}
          singlePageCooking={navigation.singlePageCooking}
          isEditing={isEditing}
          currentStep={projectionState.currentStep}
          isPrepStep={navigation.isPrepStep}
          isResumingSteps={navigation.isResumingSteps}
          isCompletionAction={navigation.isCompletionAction}
          isCompleting={completion.isCompleting}
          checkingPreparation={completion.checkingPreparation}
          preparationReview={completion.preparationReview}
          ingredientContext={ingredientContext}
          projection={projectionState.projection}
          onRetryViewSave={navigation.retrySaveCookingView}
          onPrevOrIngredients={
            navigation.singlePageCooking ? navigation.openIngredients : navigation.prevStep
          }
          onNextOrComplete={
            !navigation.hasInstructions || (!navigation.isPrepStep && navigation.singlePageEnabled)
              ? () => void completion.finishCooking()
              : () => navigation.nextStep(() => void completion.finishCooking())
          }
        />
      </div>

      <CooksModeOverlays
        ingredientContext={ingredientContext}
        recipeDetails={projectionState.recipeDetails}
        showDetailId={completion.showDetailId}
        editAnnouncement={editor.editAnnouncement}
        reportContext={completion.reportContext}
        showOriginals={completion.showOriginals}
        originalActionRef={originalActionRef}
        onCloseDetail={() => completion.setShowDetailId(null)}
        onFindSimilar={(id) => {
          completion.setShowDetailId(null);
          onClose();
          router.push(`/recipes?similarTo=${id}`);
        }}
        onCloseReport={() => completion.setReportContext(null)}
        onSaveImportIssue={completion.handleSaveImportIssue}
        onResolveImportIssue={completion.handleResolveImportIssue}
        onCloseOriginals={() => completion.setShowOriginals(false)}
      />
    </motion.div>
  );
}
