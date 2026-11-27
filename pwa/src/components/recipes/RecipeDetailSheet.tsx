'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import type { IngredientContext, Recipe } from '@/lib/api/recipes';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import { t } from '@/locales';
import { useRecipeDetailController } from './detail/useRecipeDetailController';
import { RecipeDetailToolbar } from './detail/RecipeDetailToolbar';
import { RecipeDetailHeroAndHeader } from './detail/RecipeDetailHeroAndHeader';
import { RecipePortionsAndIngredientsSection } from './detail/RecipePortionsAndIngredientsSection';
import { RecipeInstructionsSection } from './detail/RecipeInstructionsSection';
import { RecipeNotesAndParticipationSection } from './detail/RecipeNotesAndParticipationSection';
import { RecipeEditorFooterDock } from './detail/RecipeEditorFooterDock';
import { RecipePlanningActionsDock } from './detail/RecipePlanningActionsDock';
import { RecipeDetailOverlays } from './detail/RecipeDetailOverlays';

interface RecipeDetailSheetProps {
  recipeId: string;
  initialReviewDuplicate?: boolean;
  plannerDayLabel: string | null;
  ingredientContext?: IngredientContext;
  planningNeedsCheck?: boolean;
  planningEnabled?: boolean;
  planningLoading?: boolean;
  planningMessage?: string;
  planningMessageTone?: 'prepared' | 'status' | 'alert';
  planningActionLabel?: string;
  onChangeDay?: () => void;
  changeDayDisabled?: boolean;
  onBeginPlanning?: () => void;
  onRetryTarget?: () => void;
  secondaryPlanningActionLabel?: string;
  onSecondaryPlanningAction?: () => void;
  secondaryPlanningTestId?: string;
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
  planningMessageTone,
  planningActionLabel,
  onChangeDay,
  changeDayDisabled = false,
  onBeginPlanning,
  onRetryTarget,
  secondaryPlanningActionLabel,
  onSecondaryPlanningAction,
  secondaryPlanningTestId,
  sourceDayLabel,
  plannedDayLabel,
  onOpenPlannedDay,
  onClose,
  onDeleted,
  onUseForDay,
  onFindSimilar,
}: RecipeDetailSheetProps) {
  const portionsHeadingRef = useRef<HTMLHeadingElement>(null);
  const servingsInputRef = useRef<HTMLInputElement>(null);
  const originalButtonRef = useRef<HTMLButtonElement>(null);
  const readingRef = useRef<HTMLDivElement>(null);

  const {
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
  } = useRecipeDetailController({
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
  });

  const { panelRef, onKeyDown } = useDialogFocus(actions.closeDetail);

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center [@media(min-width:768px)_and_(min-height:500px)]:p-6">
      <button
        type="button"
        aria-label={t('common.close', 'Close')}
        title={t('common.close', 'Close')}
        onClick={actions.closeDetail}
        className="absolute inset-0 bg-charcoal/45 backdrop-blur-sm"
      />

      <div
        inert={actions.showOriginals || actions.showCooksMode || undefined}
        aria-hidden={actions.showOriginals || actions.showCooksMode || undefined}
        ref={panelRef as React.RefObject<HTMLDivElement>}
        role="dialog"
        aria-modal="true"
        aria-label={t('recipes.detailTitle', 'Recipe detail')}
        onKeyDown={onKeyDown}
        data-testid="recipe-detail-sheet"
        className="relative z-10 flex h-dvh w-full min-w-0 flex-col overflow-clip bg-cream shadow-[0_24px_80px_-24px_rgba(55,40,30,0.45)] [@media(min-width:768px)_and_(min-height:500px)]:h-[calc(100dvh-3rem)] [@media(min-width:768px)_and_(min-height:500px)]:max-w-5xl [@media(min-width:768px)_and_(min-height:500px)]:rounded-[1.75rem]"
      >
        <RecipeDetailToolbar
          recipe={recipe}
          isLoading={isLoading}
          isEditing={isEditing}
          isConfirmedPlanned={isConfirmedPlanned}
          departureBlocked={departureBlocked}
          isCurrentGoto={actions.isCurrentGoto}
          isSavingGoto={actions.isSavingGoto}
          isSharingRecipe={actions.isSharingRecipe}
          isReindexing={actions.isReindexing}
          reindexFeedback={actions.reindexFeedback}
          moveError={actions.moveError}
          ingredientContext={ingredientContext}
          projection={portions.projection}
          previewTarget={portions.previewTarget}
          showingOriginalEvidence={portions.showingOriginalEvidence}
          onOpenCooksMode={() => actions.setShowCooksMode(true)}
          onToggleGoto={() => void actions.handleSetGoto()}
          onShareRecipe={() => void actions.handleShareRecipe()}
          onEditRecipe={() => {
            if (!recipe) return;
            editor.resetDrafts(recipe);
            setIsEditing(true);
          }}
          onOriginalQuantities={() => {
            portions.showOriginalQuantities();
            requestAnimationFrame(() => portionsHeadingRef.current?.focus());
          }}
          onResetView={() => {
            portions.resetQuantitiesView();
            requestAnimationFrame(() => portionsHeadingRef.current?.focus());
          }}
          onReindexRecipe={() => void actions.handleReindexRecipe()}
          onMoveToBin={() => void actions.handleMoveToBin()}
          onOpenIssueReview={importIssues.openIssueReview}
          onCloseDetail={actions.closeDetail}
        />

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
              onClick={retryLoadRecipe}
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
            <RecipeDetailHeroAndHeader
              recipe={recipe}
              isEditing={isEditing}
              isScrollableStatusBanner={isScrollableStatusBanner}
              planningMessage={planningMessage}
              messageTone={messageTone}
              failedHero={actions.failedHero}
              onFailedHero={actions.setFailedHero}
              readyTime={readyTime}
              shareError={actions.shareError}
              departureBlocked={departureBlocked}
              originalButtonRef={originalButtonRef}
              fileInputRef={actions.fileInputRef}
              onOpenOriginalPhotos={() => actions.setShowOriginals(true)}
              onOpenIssueReview={importIssues.openIssueReview}
              onHeroRegenerate={() => void actions.handleHeroRegenerateClick()}
              onHeroCameraClick={actions.handleHeroCameraClick}
              onFileChange={actions.handleFileChange}
              onFindSimilar={onFindSimilar}
              editorMetadataProps={{
                isSavingRecipe: editor.isSavingRecipe,
                draftName: editor.draftName,
                onDraftNameChange: editor.setDraftName,
                draftCuisineType: editor.draftCuisineType,
                onDraftCuisineTypeChange: editor.setDraftCuisineType,
                draftTotalTime: editor.draftTotalTime,
                onDraftTotalTimeChange: editor.setDraftTotalTime,
                totalTimeInvalid: editor.totalTimeInvalid,
                parsedDraftTotalTimeMinutes: editor.parsedDraftTotalTimeMinutes,
                draftMealTypes: editor.draftMealTypes,
                onToggleMealType: (mealType) =>
                  editor.setDraftMealTypes((current) =>
                    current.includes(mealType)
                      ? current.filter((value) => value !== mealType)
                      : [...current, mealType]
                  ),
                draftDescription: editor.draftDescription,
                onDraftDescriptionChange: editor.setDraftDescription,
              }}
            />

            <div className="mb-5 grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <RecipePortionsAndIngredientsSection
                recipe={recipe}
                isEditing={isEditing}
                portionsHeadingRef={portionsHeadingRef}
                displayedServings={displayedServings}
                previewTarget={portions.previewTarget}
                showingOriginalEvidence={portions.showingOriginalEvidence}
                readingBasisServings={portions.readingBasisServings}
                headingServings={portions.headingServings}
                preview={portions.preview}
                previewError={portions.previewError}
                ingredientContext={ingredientContext}
                projection={portions.projection}
                projectionError={portions.projectionError}
                displayedProjection={portions.displayedProjection}
                originalIngredientTexts={portions.originalIngredientTexts}
                sourceDayLabel={sourceDayLabel}
                hasBeginPlanning={Boolean(onBeginPlanning)}
                onSelectPreviewTarget={portions.selectPreviewTarget}
                onSetOriginalYield={() => {
                  portions.clearPreviewSelection();
                  editor.resetDrafts(recipe);
                  setIsEditing(true);
                  requestAnimationFrame(() => servingsInputRef.current?.focus());
                }}
                onRetryPreview={portions.retryPreview}
                onRetryProjection={portions.retryProjection}
                editorIngredientsProps={{
                  servingsInputRef,
                  isSavingRecipe: editor.isSavingRecipe,
                  draftServings: editor.draftServings,
                  onDraftServingsChange: editor.setDraftServings,
                  parsedDraftServings: editor.parsedDraftServings,
                  servingsInvalid: editor.servingsInvalid,
                  structuredEditing: editor.structuredEditing,
                  ingredientDrafts: editor.ingredientDrafts,
                  setIngredientDrafts: editor.setIngredientDrafts,
                  preparedDraftsInvalid: editor.preparedDrafts.invalid,
                  draftIngredients: editor.draftIngredients,
                  setDraftIngredients: editor.setDraftIngredients,
                }}
              />

              <RecipeInstructionsSection
                recipe={recipe}
                isEditing={isEditing}
                isSavingRecipe={editor.isSavingRecipe}
                structuredEditing={editor.structuredEditing}
                draftInstructions={editor.draftInstructions}
                setDraftInstructions={editor.setDraftInstructions}
                previewTarget={portions.previewTarget}
                displayedProjection={portions.displayedProjection}
              />
            </div>

            <RecipeNotesAndParticipationSection
              recipeId={recipeId}
              isEditing={isEditing}
              rating={actions.rating}
              onRatingChange={(next) => void actions.handleRatingChange(next)}
              notes={actions.notes}
              notesStatus={actions.notesDraft?.status}
              notesSaved={actions.notesSaved}
              isDiscoverable={actions.isDiscoverable}
              isUpdatingDiscovery={actions.isUpdatingDiscovery}
              onToggleDiscovery={actions.handleToggleDiscovery}
              editError={editor.editError}
            />
          </div>
        )}

        {isEditing && (
          <RecipeEditorFooterDock
            draftStorageIssue={editor.draftStorageIssue}
            draftRecovered={editor.draftRecovered}
            saveNeedsRead={editor.saveNeedsRead}
            reconcileReadError={editor.reconcileReadError}
            reconcileContext={editor.reconcileContext}
            conflictFields={editor.conflictFields}
            reconcileChoices={editor.reconcileChoices}
            editorSession={editor.editorSession}
            isSavingRecipe={editor.isSavingRecipe}
            saveDisabled={saveDisabled}
            onRetryReconcileRead={() => void editor.loadSavedBaselineForReconcile()}
            onChooseReconcileField={editor.chooseReconcileField}
            onSave={() => void editor.handleSaveRecipeFields()}
            onCancel={editor.handleCancelEdit}
          />
        )}

        {recipe && !isLoading && !isEditing && (
          <RecipePlanningActionsDock
            plannerDayLabel={plannerDayLabel}
            planningNeedsCheck={planningNeedsCheck}
            planningEnabled={planningEnabled}
            planningLoading={planningLoading}
            planningMessage={planningMessage}
            messageTone={messageTone}
            planningActionLabel={planningActionLabel}
            onChangeDay={onChangeDay}
            changeDayDisabled={changeDayDisabled}
            onBeginPlanning={onBeginPlanning}
            onRetryTarget={onRetryTarget}
            secondaryPlanningActionLabel={secondaryPlanningActionLabel}
            onSecondaryPlanningAction={onSecondaryPlanningAction}
            secondaryPlanningTestId={secondaryPlanningTestId}
            sourceDayLabel={sourceDayLabel}
            plannedDayLabel={plannedDayLabel}
            onOpenPlannedDay={onOpenPlannedDay}
            isSavingAction={actions.isSavingAction}
            departureBlocked={departureBlocked}
            actionError={actions.actionError}
            onUseRecipe={() => void actions.handleUseRecipe()}
          />
        )}
      </div>

      <RecipeDetailOverlays
        recipe={recipe}
        ingredientContext={ingredientContext}
        originalButtonRef={originalButtonRef}
        showOriginals={actions.showOriginals}
        onCloseOriginals={() => actions.setShowOriginals(false)}
        showCooksMode={actions.showCooksMode}
        onCloseCooksMode={() => actions.setShowCooksMode(false)}
        showImportIssueSheet={importIssues.showImportIssueSheet}
        onCloseImportIssue={importIssues.closeImportIssue}
        onOpenImportIssue={() => importIssues.setShowImportIssueSheet(true)}
        onSaveImportIssue={importIssues.handleSaveImportIssue}
        onResolveImportIssue={importIssues.handleResolveImportIssue}
        showPairedDuplicateSheet={importIssues.showPairedDuplicateSheet}
        onClosePairedDuplicate={() => importIssues.setShowPairedDuplicateSheet(false)}
        suspectedDuplicateId={importIssues.suspectedDuplicateId}
        onRecipeUpdated={setRecipe}
        onNewMovedToBin={() => {
          onDeleted?.();
          onClose();
        }}
      />
    </div>
  );
}
