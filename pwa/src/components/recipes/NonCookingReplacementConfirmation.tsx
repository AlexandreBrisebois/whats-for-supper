'use client';

import { useDialogFocus } from '@/hooks/useDialogFocus';
import { Button } from '@/components/ui/button';
import { useReplacementRecovery } from '@/lib/planner/useReplacementRecovery';
import { formatSupperPlanDate, nonCookingLabel, nonCookingNote } from '@/lib/planner/nonCooking';
import type { AssignmentRecipe, PlannerSlot } from '@/lib/planner/slotAssignment';
import { t, tWithVars } from '@/locales';

const action = 'max-w-full whitespace-normal break-words text-center';

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
  const phase = recovery.feedback?.phase;
  const canRetry =
    phase === 'retry' ||
    phase === 'unknown' ||
    phase === 'disposition_unknown' ||
    phase === 'refresh';
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-charcoal/45 p-3 backdrop-blur-sm">
      <section
        ref={panelRef as React.RefObject<HTMLElement>}
        onKeyDown={onKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="non-cooking-title"
        data-testid="non-cooking-confirmation"
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-3xl border border-chrome-line bg-cream p-[16px] text-ink-body shadow-xl break-words sm:p-6"
      >
        <h2 id="non-cooking-title" className="font-heading text-xl font-bold text-ink-body">
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
        {recovery.feedback && !recovery.confirmAbandon && (
          <p
            role={phase === 'moving' || phase === 'saving' ? 'status' : 'alert'}
            className="my-3 rounded-2xl border border-hearth-line bg-terracotta-50 p-3 text-ink-body"
          >
            {recovery.feedback.message}
          </p>
        )}
        {recovery.confirmAbandon ? (
          <div
            role="alert"
            className="my-3 flex flex-col gap-3 rounded-2xl border border-hearth-line bg-terracotta-50 p-3 text-ink-body"
          >
            <p>
              {t(
                'planning.replacement.leaveUnsaved',
                'Completed changes will remain. Your new meal is not confirmed saved.'
              )}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={recovery.cancelAbandon}
                className={action}
              >
                {t('common.back', 'Back')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={recovery.abandon}
                className={action}
              >
                {t('common.close', 'Close')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-3">
            {!recovery.feedback && (
              <Button
                type="button"
                variant="primary"
                size="md"
                data-testid="non-cooking-confirm"
                disabled={recovery.pending}
                onClick={() => void recovery.act('drop')}
                className={action}
              >
                {t('recipes.confirmNonCooking', 'Replace supper plan')}
              </Button>
            )}
            {canRetry && (
              <Button
                type="button"
                variant="primary"
                size="md"
                data-testid="non-cooking-retry"
                disabled={recovery.pending}
                onClick={() => void recovery.retry()}
                className={action}
              >
                {phase === 'retry'
                  ? t('planning.replacement.retrySave', 'Retry save')
                  : t('recipes.retryPlanCheck', 'Retry check')}
              </Button>
            )}
            {phase === 'conflict' && (
              <Button
                type="button"
                variant="primary"
                size="md"
                data-testid="non-cooking-review"
                disabled={recovery.pending}
                onClick={recovery.review}
                className={action}
              >
                {t('recipes.reviewPlan', 'Review plan')}
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              size="md"
              data-testid="non-cooking-cancel"
              disabled={recovery.pending}
              onClick={recovery.close}
              className={action}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
