import type { NonCookingPlanDto, ScheduleRecipeDto } from '@/lib/api/generated/models/index';
import type { AssignmentRecipe } from '@/lib/planner/slotAssignment';
import type { ReplacementSession } from '@/lib/planner/replacementSession';

export interface HomeCommandCenterProps {
  todaysRecipe: ScheduleRecipeDto | null;
  todayStatus?: 0 | 2 | 3;
}

export type RecoveryAction =
  'order_in' | 'eating_out' | 'pick_else' | 'search' | 'tomorrow' | 'next_week' | 'drop';

export type RecoveryFlowState =
  | { kind: 'closed' }
  | { kind: 'step1' }
  | { kind: 'quick_find'; intent: 'pick_else' | null }
  | {
      kind: 'step2';
      intent: 'non_cooking';
      nonCooking: NonCookingPlanDto;
      pendingRecipe: ScheduleRecipeDto;
    }
  | { kind: 'step2'; intent: 'pick_else'; pendingRecipe: AssignmentRecipe };

export interface QuickFindSelection {
  id?: string | null;
  name?: string | null;
  image?: string | null;
}

export interface TakeOutSaveError {
  date?: string;
  recipe: ScheduleRecipeDto | null;
  kind?: string | null;
}

export interface DayChooserState {
  recipe: AssignmentRecipe;
  reference: string;
}

export function getMondayBasedDayIndex(dateString: string): number {
  return (new Date(`${dateString}T00:00:00Z`).getUTCDay() + 6) % 7;
}

export function needsAbandonConfirm(session: ReplacementSession | null): boolean {
  return Boolean(
    session &&
    !session.saved &&
    (session.disposed || session.dispositionUnknown || session.saveUnknown)
  );
}
