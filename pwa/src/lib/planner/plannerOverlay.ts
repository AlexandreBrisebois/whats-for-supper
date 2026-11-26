import { useMemo, useReducer } from 'react';
import type { NonCookingPlanDto } from '@/lib/api/generated/models';
import type { AssignmentRecipe, PlannerSlot } from './slotAssignment';

export type NonCookingTarget = {
  date: string;
  weekOffset: number;
  referenceWeekStartDate?: string;
  plan?: NonCookingPlanDto | null;
  existing: boolean;
  fromPivotDayIndex?: number;
};

export type DetailSource = {
  date: string;
  dayIndex: number;
  occurrenceId?: string;
  context: 'proposed' | 'assigned';
  reference: string;
  weekOffset: number;
};

export type RecoverySlot = {
  referenceWeekStartDate?: string;
  weekOffset: number;
  dayIndex: number;
  date: string;
  recipe: any;
  removalToken?: string | null;
};

/** The one Planner overlay that is open, if any. Opening another replaces it. */
export type PlannerOverlay =
  | { kind: 'none' }
  | { kind: 'pivot'; dayIndex: number }
  | { kind: 'quickFind'; dayIndex: number }
  | { kind: 'nonCooking'; target: NonCookingTarget }
  | { kind: 'cookedDefer'; slot: PlannerSlot; submitting: boolean }
  | { kind: 'nudge' }
  | { kind: 'detail'; recipeId: string; source: DetailSource | null }
  | { kind: 'replaceRecovery'; slot: RecoverySlot; recipe: AssignmentRecipe }
  | { kind: 'chooseDay'; recipe: AssignmentRecipe; reference: string; weekOffset: number }
  | { kind: 'nonCookingReplacement'; slot: PlannerSlot; recipe: AssignmentRecipe };

export type PlannerOverlayAction =
  | { type: 'openPivot'; dayIndex: number }
  | { type: 'openQuickFind'; dayIndex: number }
  | { type: 'openNonCooking'; target: NonCookingTarget }
  | { type: 'backToPivot' }
  | { type: 'openCookedDefer'; slot: PlannerSlot }
  | { type: 'setCookedDeferSubmitting'; submitting: boolean }
  | { type: 'openNudge' }
  | { type: 'openDetail'; recipeId: string; source: DetailSource | null }
  | { type: 'openReplaceRecovery'; slot: RecoverySlot; recipe: AssignmentRecipe }
  | { type: 'openChooseDay'; recipe: AssignmentRecipe; reference: string; weekOffset: number }
  | { type: 'openNonCookingReplacement'; slot: PlannerSlot; recipe: AssignmentRecipe }
  | { type: 'close' }
  | { type: 'closeIfCurrent'; isCurrent: (overlay: PlannerOverlay) => boolean };

export const closedOverlay: PlannerOverlay = { kind: 'none' };

/** True while the open overlay is the non-cooking sheet for this target's date and week. */
export const isNonCookingTarget = (overlay: PlannerOverlay, target: NonCookingTarget) =>
  overlay.kind === 'nonCooking' &&
  overlay.target.date === target.date &&
  overlay.target.weekOffset === target.weekOffset;

export function plannerOverlayReducer(
  state: PlannerOverlay,
  action: PlannerOverlayAction
): PlannerOverlay {
  switch (action.type) {
    case 'openPivot':
      return { kind: 'pivot', dayIndex: action.dayIndex };
    case 'openQuickFind':
      return { kind: 'quickFind', dayIndex: action.dayIndex };
    case 'openNonCooking':
      return { kind: 'nonCooking', target: action.target };
    case 'backToPivot':
      return state.kind === 'nonCooking' && state.target.fromPivotDayIndex !== undefined
        ? { kind: 'pivot', dayIndex: state.target.fromPivotDayIndex }
        : state;
    case 'openCookedDefer':
      return { kind: 'cookedDefer', slot: action.slot, submitting: false };
    case 'setCookedDeferSubmitting':
      return state.kind === 'cookedDefer' ? { ...state, submitting: action.submitting } : state;
    case 'openNudge':
      return { kind: 'nudge' };
    case 'openDetail':
      return { kind: 'detail', recipeId: action.recipeId, source: action.source };
    case 'openReplaceRecovery':
      return { kind: 'replaceRecovery', slot: action.slot, recipe: action.recipe };
    case 'openChooseDay':
      return {
        kind: 'chooseDay',
        recipe: action.recipe,
        reference: action.reference,
        weekOffset: action.weekOffset,
      };
    case 'openNonCookingReplacement':
      return { kind: 'nonCookingReplacement', slot: action.slot, recipe: action.recipe };
    case 'close':
      if (state.kind === 'cookedDefer' && state.submitting) return state;
      return state.kind === 'none' ? state : closedOverlay;
    case 'closeIfCurrent':
      // Runs against the latest reducer state, never a captured closure value.
      return state.kind !== 'none' && action.isCurrent(state) ? closedOverlay : state;
  }
}

export function usePlannerOverlay() {
  const [overlay, dispatch] = useReducer(plannerOverlayReducer, closedOverlay);
  const actions = useMemo(
    () => ({
      openPivot: (dayIndex: number) => dispatch({ type: 'openPivot', dayIndex }),
      openQuickFind: (dayIndex: number) => dispatch({ type: 'openQuickFind', dayIndex }),
      openNonCooking: (target: NonCookingTarget) => dispatch({ type: 'openNonCooking', target }),
      backToPivot: () => dispatch({ type: 'backToPivot' }),
      openCookedDefer: (slot: PlannerSlot) => dispatch({ type: 'openCookedDefer', slot }),
      setCookedDeferSubmitting: (submitting: boolean) =>
        dispatch({ type: 'setCookedDeferSubmitting', submitting }),
      openNudge: () => dispatch({ type: 'openNudge' }),
      openDetail: (recipeId: string, source: DetailSource | null) =>
        dispatch({ type: 'openDetail', recipeId, source }),
      openReplaceRecovery: (slot: RecoverySlot, recipe: AssignmentRecipe) =>
        dispatch({ type: 'openReplaceRecovery', slot, recipe }),
      openChooseDay: (recipe: AssignmentRecipe, reference: string, weekOffset: number) =>
        dispatch({ type: 'openChooseDay', recipe, reference, weekOffset }),
      openNonCookingReplacement: (slot: PlannerSlot, recipe: AssignmentRecipe) =>
        dispatch({ type: 'openNonCookingReplacement', slot, recipe }),
      close: () => dispatch({ type: 'close' }),
      closeIfCurrent: (isCurrent: (overlay: PlannerOverlay) => boolean) =>
        dispatch({ type: 'closeIfCurrent', isCurrent }),
    }),
    []
  );
  return { overlay, ...actions };
}
