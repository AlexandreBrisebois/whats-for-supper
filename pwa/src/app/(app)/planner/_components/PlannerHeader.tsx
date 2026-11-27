'use client';

import { Calendar, ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { usePlanningConfirmation } from '@/lib/planner/usePlanningConfirmation';
import { cn } from '@/lib/utils';
import { getLocale, t, tWithVars } from '@/locales';
import type { UILocalScheduleDay } from '@/store/weekStore';

interface PlannerHeaderProps {
  isWide: boolean;
  activeTab: 'planner' | 'grocery';
  setActiveTab: (tab: 'planner' | 'grocery') => void;
  requestPortionsDeparture: (onDepart: () => void) => void;
  currentWeekOffset: number;
  schedule: UILocalScheduleDay[];
  isVotingOpen: boolean;
  isConvergedWeek: boolean;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onNavigateToWeekOffset: (nextWeekOffset: number) => void;
}

export function PlannerHeader({
  isWide,
  activeTab,
  setActiveTab,
  requestPortionsDeparture,
  currentWeekOffset,
  schedule,
  isVotingOpen,
  isConvergedWeek,
  onPrevWeek,
  onNextWeek,
  onNavigateToWeekOffset,
}: PlannerHeaderProps) {
  return (
    <header className="sticky top-0 z-30 px-4 pt-2 pb-2 sm:px-6 sm:pt-3 sm:pb-2 glass-nav">
      <div
        className={cn(
          'mx-auto w-full transition-all duration-500',
          isWide ? 'max-w-[1400px]' : 'max-w-[27rem] sm:max-w-sm md:max-w-2xl'
        )}
      >
        {/* Tab Switcher */}
        {!isWide && (
          <div className="flex bg-charcoal/5 p-1.5 rounded-[1.5rem] relative">
            <button
              onClick={() => setActiveTab('planner')}
              data-testid="planner-tab"
              className={cn(
                'flex-1 min-h-12 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-semibold transition-all z-10',
                activeTab === 'planner' ? 'bg-white text-ink-body shadow-sm' : 'text-ink-muted'
              )}
            >
              <Calendar size={14} /> {t('planner.planner', 'Planner')}
            </button>
            <button
              onClick={() => requestPortionsDeparture(() => setActiveTab('grocery'))}
              data-testid="grocery-tab"
              className={cn(
                'flex-1 min-h-12 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-semibold transition-all z-10',
                activeTab === 'grocery' ? 'bg-white text-ink-body shadow-sm' : 'text-ink-muted'
              )}
            >
              <ShoppingCart size={14} /> {t('planner.groceryList', 'Grocery list')}
            </button>
          </div>
        )}

        {/* Week Navigator */}
        <div className="mt-3 flex items-start justify-between gap-3">
          <button
            data-testid="prev-week"
            onClick={onPrevWeek}
            className="p-3 rounded-full hover:bg-charcoal/5 active:scale-90 transition-all"
            aria-label="Previous week"
            title="Previous week"
          >
            <ChevronLeft className="text-ink-muted" />
          </button>

          <div className="min-w-0 flex-1 text-center">
            <span
              className="font-heading text-sm leading-5 font-semibold tracking-normal text-ink-muted text-center flex-1"
              data-testid="week-range"
            >
              {currentWeekOffset === 0
                ? t('planner.thisWeek', 'This week')
                : currentWeekOffset === 1
                  ? t('planner.nextWeek', 'Next week')
                  : tWithVars('planner.weekX', `Week ${currentWeekOffset}`, {
                      count: currentWeekOffset,
                    })}
            </span>
            <h2 className="text-lg font-heading font-bold text-ink-body flex items-center justify-center">
              {isVotingOpen && (
                <span className="relative flex h-2 w-2 mr-2">
                  {!isConvergedWeek && (
                    <span className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full bg-ochre-600 opacity-75"></span>
                  )}
                  <span
                    className={cn(
                      'relative inline-flex rounded-full h-2 w-2',
                      isConvergedWeek ? 'bg-garden-fill' : 'bg-ochre-600'
                    )}
                  ></span>
                </span>
              )}
              {schedule.length >= 7
                ? (() => {
                    const start = new Date(schedule[0].date ?? '');
                    const end = new Date(schedule[6].date ?? '');
                    const isFrench = getLocale() === 'fr';
                    const monthFormat = new Intl.DateTimeFormat(isFrench ? 'fr-CA' : 'en-CA', {
                      month: 'short',
                      timeZone: 'UTC',
                    });
                    const startMonth = monthFormat.format(start);
                    const endMonth = monthFormat.format(end);
                    const startDate = start.getUTCDate();
                    const endDate = end.getUTCDate();

                    if (isFrench) {
                      return startMonth === endMonth
                        ? `${startDate} — ${endDate} ${endMonth}`
                        : `${startDate} ${startMonth} — ${endDate} ${endMonth}`;
                    }
                    if (startMonth === endMonth) {
                      return `${startMonth} ${startDate} — ${endDate}`;
                    }
                    return `${startMonth} ${startDate} — ${endMonth} ${endDate}`;
                  })()
                : t('messages.loading', 'Loading...')}
            </h2>
            {currentWeekOffset !== 0 && (
              <button
                type="button"
                data-testid="planner-this-week-pill"
                onClick={() => onNavigateToWeekOffset(0)}
                className="mx-auto mt-2 inline-flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-full border border-hearth-line bg-white px-4 text-xs font-semibold text-hearth-ink shadow-sm transition-all hover:bg-terracotta-50 active:scale-95"
                aria-label={t('planner.backToThisWeek', 'Back to this week')}
                title={t('planner.backToThisWeek', 'Back to this week')}
              >
                {currentWeekOffset > 0 && (
                  <ChevronLeft size={12} strokeWidth={3} aria-hidden="true" />
                )}
                {t('planner.backToThisWeek', 'Back to this week')}
                {currentWeekOffset < 0 && (
                  <ChevronRight size={12} strokeWidth={3} aria-hidden="true" />
                )}
              </button>
            )}
          </div>

          <button
            data-testid="next-week"
            onClick={onNextWeek}
            className="p-3 rounded-full hover:bg-charcoal/5 active:scale-90 transition-all"
            aria-label="Next week"
            title="Next week"
          >
            <ChevronRight className="text-ink-muted" />
          </button>
        </div>
      </div>
    </header>
  );
}

interface PlannerConfirmationBannerProps {
  isWide: boolean;
  visibleConfirmation: ReturnType<typeof usePlanningConfirmation>['visibleConfirmation'];
  onRetry: () => void;
  onDismiss: () => void;
}

export function PlannerConfirmationBanner({
  isWide,
  visibleConfirmation,
  onRetry,
  onDismiss,
}: PlannerConfirmationBannerProps) {
  if (!visibleConfirmation) return null;

  return (
    <div
      className={cn(
        'relative z-10 mx-auto mt-3 mb-1 w-full px-4 sm:px-6',
        isWide ? 'max-w-[1400px]' : 'max-w-[27rem] sm:max-w-sm md:max-w-2xl'
      )}
    >
      <div
        role={
          visibleConfirmation.kind === 'replacement'
            ? 'status'
            : visibleConfirmation.kind === 'refreshing'
              ? 'status'
              : 'alert'
        }
        data-testid="planner-planning-confirmation"
        className={cn(
          'flex flex-wrap items-center gap-3 rounded-2xl border p-4 text-ink-body shadow-sm',
          visibleConfirmation.kind === 'replacement'
            ? 'border-garden-line bg-sage-50'
            : 'border-hearth-line bg-terracotta-50'
        )}
      >
        <p className="min-w-0 flex-1">{visibleConfirmation.message}</p>
        {visibleConfirmation.kind === 'refresh-failed' ||
        visibleConfirmation.kind === 'refreshing' ? (
          <Button
            type="button"
            variant="primary"
            size="md"
            data-testid="planner-confirmation-refresh"
            onFocus={(event) => {
              if (event.currentTarget.matches(':focus-visible'))
                event.currentTarget.scrollIntoView({ block: 'center', behavior: 'instant' });
            }}
            aria-disabled={visibleConfirmation.kind === 'refreshing'}
            aria-busy={visibleConfirmation.kind === 'refreshing'}
            className="min-w-12"
            onClick={onRetry}
          >
            {t('common.refresh', 'Refresh')}
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="md"
            data-testid="planner-confirmation-dismiss"
            onFocus={(event) => {
              if (event.currentTarget.matches(':focus-visible'))
                event.currentTarget.scrollIntoView({ block: 'center', behavior: 'instant' });
            }}
            className="min-w-12"
            onClick={onDismiss}
          >
            {t('common.close', 'Close')}
          </Button>
        )}
      </div>
    </div>
  );
}
