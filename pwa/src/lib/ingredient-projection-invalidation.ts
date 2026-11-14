import type { IngredientContext } from '@/lib/api/recipes';
import { useWeekStore } from '@/store/weekStore';
import { useTodayStore } from '@/store/todayStore';

/** Existing schedule and resume signals invalidate a captured dated ingredient read. */
export function subscribeIngredientProjectionInvalidation(
  context: IngredientContext | undefined,
  invalidate: () => void
): () => void {
  const unsubscribeWeek = useWeekStore.subscribe((state, before) => {
    const hint = state.ingredientProjectionUpdate;
    if (hint && hint !== before.ingredientProjectionUpdate) {
      // Defaults and unassigned recipe corrections can affect any proposed date.
      // The reader compares the returned semantic version before announcing a change.
      invalidate();
      return;
    }
    if (state.groceryRefresh !== before.groceryRefresh || state.schedule !== before.schedule)
      invalidate();
  });
  const unsubscribeToday = useTodayStore.subscribe((state, before) => {
    if (
      (!context || state.calendar?.today === context.supperDate) &&
      (state.currentRecipe !== before.currentRecipe ||
        state.occurrenceId !== before.occurrenceId ||
        state.status !== before.status ||
        state.calendarVersion !== before.calendarVersion)
    )
      invalidate();
  });
  const resume = () => {
    if (document.visibilityState !== 'hidden') invalidate();
  };
  window.addEventListener('focus', resume);
  document.addEventListener('visibilitychange', resume);
  return () => {
    unsubscribeWeek();
    unsubscribeToday();
    window.removeEventListener('focus', resume);
    document.removeEventListener('visibilitychange', resume);
  };
}
