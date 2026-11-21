'use client';

import { useEffect, useState } from 'react';
import { getSchedule, normalizeScheduleRecipe } from '@/lib/api/planner';
import { readCalendar } from '@/lib/deployment-calendar';
import type { ScheduleDayDto } from '@/lib/api/generated/models';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import { formatSupperPlanDate, nonCookingLabel, nonCookingNote } from '@/lib/planner/nonCooking';
import type { PlannerSlot } from '@/lib/planner/slotAssignment';
import { Button } from '@/components/ui/button';
import { getLocale, t } from '@/locales';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

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
  const weekStart = new Date(Date.parse(`${reference}T00:00:00Z`) + week * 7 * 86400000);
  const weekEnd = new Date(weekStart.getTime() + 6 * 86400000);
  const weekRange = Number.isFinite(weekStart.getTime())
    ? new Intl.DateTimeFormat(getLocale() === 'fr' ? 'fr-CA' : 'en-CA', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      }).formatRange(weekStart, weekEnd)
    : '';
  const stepper =
    'inline-flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-full border border-chrome-line bg-white text-ink-body focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body';
  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-charcoal/45 p-3 backdrop-blur-sm"
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
        className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-3xl border border-chrome-line bg-cream p-5 text-ink-body shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            id="planning-day-title"
            className="min-w-0 font-heading text-xl font-bold text-ink-body"
          >
            {t('recipes.changeDay', 'Change day')}
          </h2>
          <button
            type="button"
            data-testid="planning-day-close"
            aria-label={t('common.close', 'Close')}
            onClick={onClose}
            className={stepper}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="my-3 flex min-w-0 items-center justify-between gap-[8px]">
          <button
            type="button"
            data-testid="planning-week-previous"
            aria-label={t('planner.previousWeek', 'Previous week')}
            onClick={() => setWeek(week - 1)}
            className={stepper}
          >
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
          <span
            data-testid="planning-week-range"
            aria-live="polite"
            className="min-w-0 flex-1 text-center text-sm font-semibold text-ink-body"
          >
            {weekRange}
          </span>
          <button
            type="button"
            data-testid="planning-week-next"
            aria-label={t('planner.nextWeek', 'Next week')}
            onClick={() => setWeek(week + 1)}
            className={stepper}
          >
            <ChevronRight size={22} aria-hidden="true" />
          </button>
        </div>
        {!current && (
          <p role="status" className="text-ink-muted">
            {t('common.loading', 'Loading…')}
          </p>
        )}
        {current?.error && (
          <div
            role="alert"
            className="mb-3 flex flex-col items-start gap-3 rounded-2xl border border-hearth-line bg-terracotta-50 p-4 text-ink-body"
          >
            <p>
              {t(
                'recipes.weekReadFailed',
                'Could not read this week. Retry before choosing a day.'
              )}
            </p>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => setAttempt(attempt + 1)}
            >
              {t('common.retry', 'Retry')}
            </Button>
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
              className="flex min-h-16 w-full flex-col rounded-2xl border border-chrome-line bg-white p-3 text-left text-ink-body focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body"
            >
              <span className="font-bold text-ink-body">{formatSupperPlanDate(day.date!)}</span>
              <span className="text-ink-muted">
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
      </section>
    </div>
  );
}
