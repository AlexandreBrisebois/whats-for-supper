import type { PlannerSlot, AssignmentRecipe } from './slotAssignment';
import type { ScheduleDayDto } from '@/lib/api/generated/models/index';
import { nonCookingLabel } from './nonCooking';
import { t } from '@/locales';

export type ReplacementAction = 'tomorrow' | 'next_week' | 'drop';
export type ReplacementFeedback = {
  phase: 'moving' | 'saving' | 'retry' | 'unknown' | 'conflict' | 'disposition_unknown' | 'refresh';
  message: string;
  recipeName: string | null;
  original?: OriginalDisposition;
};
export type OriginalDisposition = {
  action: ReplacementAction;
  recipeName: string;
  sourceDate: string;
  destinationDate?: string;
  spillover?: boolean;
};
export type ReplacementSession = {
  slot: PlannerSlot;
  recipe: AssignmentRecipe;
  action: ReplacementAction;
  disposed: boolean;
  saved: boolean;
  saveUnknown?: boolean;
  saveReconciled?: boolean;
  dispositionUnknown?: boolean;
  blocked?: boolean;
  disposition?: OriginalDisposition;
};
export function createReplacementSession(
  slot: PlannerSlot,
  recipe: AssignmentRecipe,
  action: ReplacementAction
): ReplacementSession {
  return { slot, recipe, action, disposed: false, saved: false };
}

type Dependencies = {
  active: () => boolean;
  read: () => Promise<ScheduleDayDto>;
  dispose: () => Promise<OriginalDisposition>;
  save: () => Promise<unknown>;
  feedback: (feedback: ReplacementFeedback) => void;
  observed?: (day: ScheduleDayDto) => void;
};
const empty = (day: ScheduleDayDto) => !day.recipe?.id && !day.nonCooking?.kind && day.status === 0;

/** One mounted replacement, with explicit acknowledged and uncertain stages. No persistence/retry framework. */
export async function continueReplacementSession(session: ReplacementSession, deps: Dependencies) {
  const feedback = (phase: ReplacementFeedback['phase'], message: string) => {
    if (deps.active())
      deps.feedback({
        phase,
        message,
        recipeName: session.recipe.name,
        original: session.disposition,
      });
  };
  const reconcileSave = async () => {
    try {
      const day = await deps.read();
      if (!deps.active()) return false;
      deps.observed?.(day);
      session.saveUnknown = false;
      if (day.recipe?.id === session.recipe.id && day.status === 0 && !day.nonCooking?.kind) {
        session.saved = true;
        session.saveReconciled = true;
        return true;
      }
      if (empty(day)) {
        feedback(
          'retry',
          t(
            'planning.replacement.retry',
            "Your original meal was updated. Your new meal wasn't saved."
          )
        );
      } else {
        session.blocked = true;
        feedback(
          'conflict',
          t(
            'planning.replacement.conflict',
            'Your plan changed. Review it before replacing this meal.'
          )
        );
      }
    } catch {
      session.saveUnknown = true;
      feedback(
        'unknown',
        t(
          'planning.replacement.unknown',
          'Your new meal could not be confirmed. Check your plan before saving again.'
        )
      );
    }
    return false;
  };
  if (!deps.active() || session.blocked) return false;
  if (session.saveUnknown) return reconcileSave();
  if (session.dispositionUnknown) {
    try {
      const day = await deps.read();
      if (!deps.active()) return false;
      deps.observed?.(day);
      // Absence proves removal from this captured day. It cannot prove an unknown move's destination.
      if (session.action === 'drop' && empty(day)) {
        session.disposed = true;
        session.dispositionUnknown = false;
        session.disposition = {
          action: 'drop',
          recipeName:
            session.slot.recipe?.name ??
            (session.slot.nonCooking ? nonCookingLabel(session.slot.nonCooking) : ''),
          sourceDate: session.slot.date,
        };
      } else {
        feedback(
          'disposition_unknown',
          t(
            'planning.replacement.dispositionUnknown',
            'The original meal could not be confirmed. Review your plan before choosing again.'
          )
        );
        return false;
      }
    } catch {
      feedback(
        'disposition_unknown',
        t(
          'planning.replacement.dispositionUnknown',
          'The original meal could not be confirmed. Review your plan before choosing again.'
        )
      );
      return false;
    }
  }
  if (!session.disposed) {
    feedback('moving', t('planning.replacement.moving', 'Updating your original meal…'));
    try {
      session.disposition = await deps.dispose();
      session.disposed = true;
      if (!deps.active()) return false;
    } catch (error) {
      const status = (error as { responseStatusCode?: number })?.responseStatusCode;
      if ([400, 401, 403, 404, 409].includes(status ?? 0)) {
        session.blocked = true;
        feedback(
          'conflict',
          t(
            'planning.replacement.conflict',
            'Your plan changed. Review it before replacing this meal.'
          )
        );
      } else {
        session.dispositionUnknown = true;
        // A read is useful evidence, but never turns an empty source into a made-up move destination.
        try {
          const day = await deps.read();
          if (!deps.active()) return false;
          deps.observed?.(day);
          if (session.action === 'drop' && empty(day)) {
            session.disposed = true;
            session.dispositionUnknown = false;
            session.disposition = {
              action: 'drop',
              sourceDate: session.slot.date,
              recipeName:
                session.slot.recipe?.name ??
                (session.slot.nonCooking ? nonCookingLabel(session.slot.nonCooking) : ''),
            };
            feedback(
              'retry',
              t(
                'planning.replacement.retry',
                "Your original meal was updated. Your new meal wasn't saved."
              )
            );
            return false;
          }
        } catch {
          /* Retry check remains available. */
        }
        feedback(
          'disposition_unknown',
          t(
            'planning.replacement.dispositionUnknown',
            'The original meal could not be confirmed. Review your plan before choosing again.'
          )
        );
      }
      return false;
    }
  }
  if (!session.saved) {
    feedback('saving', t('planning.replacement.saving', 'Saving your new meal…'));
    try {
      await deps.save();
      session.saved = true;
    } catch {
      session.saveUnknown = true;
      return reconcileSave();
    }
  }
  return deps.active() && session.saved;
}
