'use client';

import { useDialogFocus } from '@/hooks/useDialogFocus';
import { useReplacementRecovery } from '@/lib/planner/useReplacementRecovery';
import { formatSupperPlanDate, nonCookingLabel, nonCookingNote } from '@/lib/planner/nonCooking';
import type { AssignmentRecipe, PlannerSlot } from '@/lib/planner/slotAssignment';
import { t, tWithVars } from '@/locales';

/** Consent view for the existing guarded removal/save session. */
export function NonCookingReplacementConfirmation({
  slot,
  recipe,
  onClose,
  onSaved,
  onReview,
}: {
  slot: PlannerSlot;
  recipe: AssignmentRecipe;
  onClose: () => void;
  onSaved: () => Promise<unknown>;
  onReview: () => void;
}) {
  const recovery = useReplacementRecovery({ slot, recipe, onClosed: onClose, onSaved, onReview });
  const { panelRef, onKeyDown } = useDialogFocus(recovery.close);
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-charcoal/40 p-3">
      <section
        ref={panelRef as React.RefObject<HTMLElement>}
        onKeyDown={onKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="non-cooking-title"
        data-testid="non-cooking-confirmation"
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-3xl bg-cream p-[16px] sm:p-6 shadow-xl break-words"
      >
        <h2 id="non-cooking-title" className="text-xl font-bold">
          {t('recipes.replaceNonCooking', 'Replace this supper plan?')}
        </h2>
        <p className="my-3">
          {formatSupperPlanDate(slot.date)} · {nonCookingLabel(slot.nonCooking)}{' '}
          {nonCookingNote(slot.nonCooking)}
        </p>
        <p>
          {tWithVars(
            'recipes.nonCookingConsequence',
            'Remove this dated plan and save {{recipe}} here. The recipe stays in your library.',
            { recipe: recipe.name ?? '' }
          )}
        </p>
        {recovery.feedback && (
          <p role="status" className="my-3">
            {recovery.feedback.message}
          </p>
        )}
        {recovery.confirmAbandon ? (
          <>
            <p>
              {t(
                'planning.replacement.leaveUnsaved',
                'Completed changes will remain. Your new meal is not confirmed saved.'
              )}
            </p>
            <button
              type="button"
              onClick={recovery.cancelAbandon}
              className="min-h-12 max-w-full whitespace-normal break-words px-3 py-2"
            >
              {t('common.back', 'Back')}
            </button>
            <button
              type="button"
              onClick={recovery.abandon}
              className="min-h-12 max-w-full whitespace-normal break-words px-3 py-2"
            >
              {t('common.close', 'Close')}
            </button>
          </>
        ) : (
          <>
            {!recovery.feedback && (
              <button
                type="button"
                data-testid="non-cooking-confirm"
                disabled={recovery.pending}
                onClick={() => void recovery.act('drop')}
                className="mt-4 min-h-12 max-w-full whitespace-normal break-words rounded-xl bg-terracotta px-3 py-2 font-bold text-white"
              >
                {t('recipes.confirmNonCooking', 'Replace supper plan')}
              </button>
            )}
            {recovery.feedback &&
              ['retry', 'unknown', 'disposition_unknown', 'refresh'].includes(
                recovery.feedback.phase
              ) && (
                <button
                  type="button"
                  data-testid="non-cooking-retry"
                  disabled={recovery.pending}
                  onClick={() => void recovery.retry()}
                  className="min-h-12 max-w-full whitespace-normal break-words px-3 py-2"
                >
                  {recovery.feedback.phase === 'retry'
                    ? t('planning.replacement.retrySave', 'Retry save')
                    : t('recipes.retryPlanCheck', 'Retry check')}
                </button>
              )}
            {recovery.feedback && (
              <button
                type="button"
                disabled={recovery.pending}
                onClick={recovery.review}
                className="min-h-12 max-w-full whitespace-normal break-words px-3 py-2"
              >
                {t('recipes.reviewPlan', 'Review plan')}
              </button>
            )}
            <button
              type="button"
              data-testid="non-cooking-cancel"
              disabled={recovery.pending}
              onClick={recovery.close}
              className="min-h-12 max-w-full whitespace-normal break-words px-3 py-2"
            >
              {t('common.cancel', 'Cancel')}
            </button>
          </>
        )}
      </section>
    </div>
  );
}
