'use client';

import { useEffect, useState } from 'react';
import { getSchedule, normalizeScheduleRecipe } from '@/lib/api/planner';
import { readCalendar } from '@/lib/deployment-calendar';
import type { ScheduleDayDto } from '@/lib/api/generated/models';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import { formatSupperPlanDate, nonCookingLabel, nonCookingNote } from '@/lib/planner/nonCooking';
import type { PlannerSlot } from '@/lib/planner/slotAssignment';
import { t } from '@/locales';

/** Read-only dated choice. The caller retains the recipe and prior destination. */
export function PlanningDayChooser({
  reference,
  weekOffset,
  onSelect,
  onClose,
}: {
  reference: string;
  weekOffset: number;
  onSelect: (slot: PlannerSlot) => void;
  onClose: () => void;
}) {
  const [week, setWeek] = useState(weekOffset);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    week: number;
    reference: string;
    days?: ScheduleDayDto[];
    error?: boolean;
  } | null>(null);
  const { panelRef, onKeyDown } = useDialogFocus(onClose);
  useEffect(() => {
    let active = true;
    void getSchedule(week, reference)
      .then((schedule) => {
        const calendar = readCalendar(schedule?.calendar);
        const days = schedule?.days;
        if (
          calendar?.referenceWeekStartDate !== reference ||
          days?.length !== 7 ||
          days.some(
            (day, index) =>
              day.date !==
              new Date(Date.parse(`${reference}T00:00:00Z`) + (week * 7 + index) * 86400000)
                .toISOString()
                .slice(0, 10)
          )
        )
          throw new Error('Invalid week');
        if (active) setResult({ week, reference, days });
      })
      .catch(() => {
        if (active) setResult({ week, reference, error: true });
      });
    return () => {
      active = false;
    };
  }, [week, reference, attempt]);
  const current = result?.week === week && result.reference === reference ? result : null;
  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-charcoal/40 p-3"
      onClick={onClose}
    >
      <section
        ref={panelRef as React.RefObject<HTMLElement>}
        onKeyDown={onKeyDown}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="planning-day-title"
        data-testid="planning-day-chooser"
        className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-3xl bg-cream p-5 shadow-xl"
      >
        <h2 id="planning-day-title" className="text-xl font-bold">
          {t('recipes.changeDay', 'Change day')}
        </h2>
        <div className="my-3 flex min-w-0 flex-wrap gap-2">
          <button
            type="button"
            data-testid="planning-week-previous"
            onClick={() => setWeek(week - 1)}
            className="min-h-12 min-w-0 max-w-full flex-1 rounded-xl bg-white px-4 py-2 break-words"
          >
            {t('planner.previousWeek', 'Previous week')}
          </button>
          <button
            type="button"
            data-testid="planning-week-next"
            onClick={() => setWeek(week + 1)}
            className="min-h-12 min-w-0 max-w-full flex-1 rounded-xl bg-white px-4 py-2 break-words"
          >
            {t('planner.nextWeek', 'Next week')}
          </button>
        </div>
        {!current && <p role="status">{t('common.loading', 'Loading…')}</p>}
        {current?.error && (
          <div role="alert">
            <p>
              {t(
                'recipes.weekReadFailed',
                'Could not read this week. Retry before choosing a day.'
              )}
            </p>
            <button type="button" onClick={() => setAttempt(attempt + 1)} className="min-h-12">
              {t('common.retry', 'Retry')}
            </button>
          </div>
        )}
        <div className="space-y-2">
          {current?.days?.map((day, index) => (
            <button
              key={day.date}
              type="button"
              data-testid={`planning-day-${index}`}
              onClick={() =>
                onSelect({
                  referenceWeekStartDate: reference,
                  weekOffset: week,
                  dayIndex: index,
                  date: day.date!,
                  recipe: normalizeScheduleRecipe(day.recipe),
                  status: day.status ?? undefined,
                  removalToken: day.removalToken,
                  nonCooking: day.nonCooking?.kind ? day.nonCooking : null,
                })
              }
              className="flex min-h-16 w-full flex-col rounded-xl border border-charcoal/10 bg-white p-3 text-left"
            >
              <span className="font-bold">{formatSupperPlanDate(day.date!)}</span>
              <span>
                {day.nonCooking?.kind
                  ? [nonCookingLabel(day.nonCooking), nonCookingNote(day.nonCooking)]
                      .filter(Boolean)
                      .join(' · ')
                  : normalizeScheduleRecipe(day.recipe)?.name ||
                    (day.removalToken || day.status !== 0
                      ? t('recipes.reviewPlan', 'Review plan')
                      : t('recipes.emptySupper', 'No supper planned'))}
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          data-testid="planning-day-cancel"
          onClick={onClose}
          className="mt-3 min-h-12 rounded-full px-5 font-bold"
        >
          {t('common.cancel', 'Cancel')}
        </button>
      </section>
    </div>
  );
}
