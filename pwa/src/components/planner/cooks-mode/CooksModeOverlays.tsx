import type { RefObject } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { OriginalPhotosViewer } from '@/components/recipes/OriginalPhotosViewer';
import { RecipeDetailSheet } from '@/components/recipes/RecipeDetailSheet';
import { RecipeImportIssueSheet } from '@/components/recipes/RecipeImportIssueSheet';
import type {
  IngredientContext,
  Recipe,
  RecipeImportIssueDraft,
  RecipeImportIssueReason,
} from '@/lib/api/recipes';

export function CooksModeCelebrationOverlay({ showCelebration }: { showCelebration: boolean }) {
  return (
    <AnimatePresence>
      {showCelebration && (
        <motion.div
          data-testid="cooks-mode-celebration"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 flex flex-col items-center justify-center bg-cream z-10"
        >
          <Sparkles size={48} className="text-sunlight-ink mb-4" />
          <p className="font-heading text-3xl font-black text-ink-body">Supper&apos;s done!</p>
          <p className="text-ink-muted mt-2 font-medium">Nice work.</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export interface CooksModeOverlaysProps {
  ingredientContext?: IngredientContext;
  recipeDetails: Recipe | null;
  showDetailId: string | null;
  editAnnouncement: string;
  reportContext: RecipeImportIssueReason | null;
  showOriginals: boolean;
  originalActionRef: RefObject<HTMLButtonElement | null>;
  onCloseDetail: () => void;
  onFindSimilar: (recipeId: string) => void;
  onCloseReport: () => void;
  onSaveImportIssue: (draft: RecipeImportIssueDraft) => Promise<void>;
  onResolveImportIssue: () => Promise<void>;
  onCloseOriginals: () => void;
}

export function CooksModeOverlays({
  ingredientContext,
  recipeDetails,
  showDetailId,
  editAnnouncement,
  reportContext,
  showOriginals,
  originalActionRef,
  onCloseDetail,
  onFindSimilar,
  onCloseReport,
  onSaveImportIssue,
  onResolveImportIssue,
  onCloseOriginals,
}: CooksModeOverlaysProps) {
  return (
    <>
      {showDetailId && (
        <RecipeDetailSheet
          ingredientContext={ingredientContext}
          recipeId={showDetailId}
          plannerDayLabel={null}
          onClose={onCloseDetail}
          onUseForDay={async () => {}}
          onFindSimilar={onFindSimilar}
        />
      )}
      <p className="sr-only" aria-live="polite">
        {editAnnouncement}
      </p>
      {reportContext && recipeDetails && (
        <RecipeImportIssueSheet
          issue={recipeDetails.importIssue ?? null}
          recipeId={recipeDetails.id}
          contextualReason={reportContext}
          canReportContentIssues={recipeDetails.canReimport}
          isReimporting={recipeDetails.importIssue?.isReimporting}
          reimportFailureMessage={recipeDetails.importIssue?.reimportFailureMessage}
          reimportFailureImportId={recipeDetails.importIssue?.reimportFailureImportId}
          onClose={onCloseReport}
          onSave={onSaveImportIssue}
          onResolve={onResolveImportIssue}
        />
      )}
      {showOriginals &&
        recipeDetails &&
        createPortal(
          <OriginalPhotosViewer
            recipeId={recipeDetails.id}
            imageCount={recipeDetails.imageCount}
            finishedDishIndex={recipeDetails.finishedDishIndex}
            modal
            onClose={() => {
              onCloseOriginals();
              requestAnimationFrame(() =>
                originalActionRef.current?.focus({ preventScroll: true })
              );
            }}
          />,
          document.body
        )}
    </>
  );
}
