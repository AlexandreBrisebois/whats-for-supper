import { AnimatePresence } from 'framer-motion';
import { getImageUrl } from '@/lib/imageUtils';
import { CooksMode } from '../../planner/CooksMode';
import { OriginalPhotosViewer } from '../OriginalPhotosViewer';
import { RecipeImportIssueSheet } from '../RecipeImportIssueSheet';
import { PairedDuplicateReviewSheet } from '../PairedDuplicateReviewSheet';
import type { IngredientContext, Recipe, RecipeImportIssueDraft } from '@/lib/api/recipes';

export interface RecipeDetailOverlaysProps {
  recipe: Recipe | null;
  ingredientContext?: IngredientContext;
  originalButtonRef: React.RefObject<HTMLButtonElement | null>;
  showOriginals: boolean;
  onCloseOriginals: () => void;
  showCooksMode: boolean;
  onCloseCooksMode: () => void;
  showImportIssueSheet: boolean;
  onCloseImportIssue: () => void;
  onOpenImportIssue: () => void;
  onSaveImportIssue: (draft: RecipeImportIssueDraft) => Promise<void>;
  onResolveImportIssue: () => Promise<void>;
  showPairedDuplicateSheet: boolean;
  onClosePairedDuplicate: () => void;
  suspectedDuplicateId: string | null;
  onRecipeUpdated: (updated: Recipe) => void;
  onNewMovedToBin: () => void;
}

export function RecipeDetailOverlays({
  recipe,
  ingredientContext,
  originalButtonRef,
  showOriginals,
  onCloseOriginals,
  showCooksMode,
  onCloseCooksMode,
  showImportIssueSheet,
  onCloseImportIssue,
  onOpenImportIssue,
  onSaveImportIssue,
  onResolveImportIssue,
  showPairedDuplicateSheet,
  onClosePairedDuplicate,
  suspectedDuplicateId,
  onRecipeUpdated,
  onNewMovedToBin,
}: RecipeDetailOverlaysProps) {
  if (!recipe) return null;

  return (
    <>
      {showOriginals && (
        <OriginalPhotosViewer
          modal
          returnFocus={originalButtonRef}
          recipeId={recipe.id}
          imageCount={recipe.imageCount}
          finishedDishIndex={recipe.finishedDishIndex}
          onClose={onCloseOriginals}
        />
      )}
      <AnimatePresence>
        {showCooksMode && (
          <CooksMode
            ingredientContext={ingredientContext}
            recipe={{
              id: recipe.id,
              name: recipe.name,
              image: getImageUrl(recipe.imageUrl) || '',
            }}
            onClose={onCloseCooksMode}
          />
        )}
      </AnimatePresence>
      {showImportIssueSheet && (
        <RecipeImportIssueSheet
          issue={recipe.importIssue ?? null}
          recipeId={recipe.id}
          canReportContentIssues={recipe.canReimport}
          isReimporting={recipe.importIssue?.isReimporting}
          reimportFailureMessage={recipe.importIssue?.reimportFailureMessage}
          reimportFailureImportId={recipe.importIssue?.reimportFailureImportId}
          onClose={onCloseImportIssue}
          onSave={onSaveImportIssue}
          onResolve={onResolveImportIssue}
        />
      )}
      {showPairedDuplicateSheet && suspectedDuplicateId && (
        <PairedDuplicateReviewSheet
          open
          newRecipe={recipe}
          existingRecipeId={suspectedDuplicateId}
          onClose={onClosePairedDuplicate}
          onKeepBothComplete={(updated) => {
            onRecipeUpdated(updated);
            onClosePairedDuplicate();
          }}
          onNewMovedToBin={() => {
            onClosePairedDuplicate();
            onNewMovedToBin();
          }}
          onExistingMovedToBin={(updated) => {
            onRecipeUpdated(updated);
            onClosePairedDuplicate();
          }}
          onOpenStandardIssueEditor={() => {
            onClosePairedDuplicate();
            onOpenImportIssue();
          }}
        />
      )}
    </>
  );
}
