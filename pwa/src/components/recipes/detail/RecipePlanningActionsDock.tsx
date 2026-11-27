import { ArrowRightLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t, tWithVars } from '@/locales';

export interface RecipePlanningActionsDockProps {
  plannerDayLabel: string | null;
  planningNeedsCheck: boolean;
  planningEnabled: boolean;
  planningLoading: boolean;
  planningMessage?: string;
  messageTone: 'prepared' | 'status' | 'alert';
  planningActionLabel?: string;
  onChangeDay?: () => void;
  changeDayDisabled: boolean;
  onBeginPlanning?: () => void;
  onRetryTarget?: () => void;
  secondaryPlanningActionLabel?: string;
  onSecondaryPlanningAction?: () => void;
  secondaryPlanningTestId?: string;
  sourceDayLabel?: string;
  plannedDayLabel?: string;
  onOpenPlannedDay?: () => void;
  isSavingAction: boolean;
  departureBlocked: boolean;
  actionError: string | null;
  onUseRecipe: () => void;
}

export function RecipePlanningActionsDock({
  plannerDayLabel,
  planningNeedsCheck,
  planningEnabled,
  planningLoading,
  planningMessage,
  messageTone,
  planningActionLabel,
  onChangeDay,
  changeDayDisabled,
  onBeginPlanning,
  onRetryTarget,
  secondaryPlanningActionLabel,
  onSecondaryPlanningAction,
  secondaryPlanningTestId,
  sourceDayLabel,
  plannedDayLabel,
  onOpenPlannedDay,
  isSavingAction,
  departureBlocked,
  actionError,
  onUseRecipe,
}: RecipePlanningActionsDockProps) {
  const primaryActionLabel = plannerDayLabel
    ? tWithVars('recipes.planForDay', 'Plan for {{day}}', { day: plannerDayLabel })
    : t('recipes.cookThis', 'Cook This');
  const hasDatedAction = Boolean(plannerDayLabel || planningEnabled || sourceDayLabel);
  const isConfirmedPlanned = Boolean(plannedDayLabel && onOpenPlannedDay);

  return (
    <div
      data-testid="recipe-planning-actions"
      className="shrink-0 max-h-[45dvh] overflow-y-auto border-t border-chrome-line bg-cream px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-8"
    >
      {actionError && (
        <p
          role="alert"
          className="mb-2 rounded-xl border border-hearth-line bg-terracotta-50 px-3 py-2 text-sm font-medium text-hearth-ink"
        >
          {actionError}
        </p>
      )}
      {planningMessage && messageTone === 'alert' && (
        <p
          role="alert"
          className="mb-2 rounded-xl border border-hearth-line bg-terracotta-50 px-3 py-2 text-sm font-medium text-hearth-ink"
        >
          {planningMessage}
        </p>
      )}
      <div
        data-testid="recipe-dated-planning-actions"
        className={cn(
          'flex items-stretch gap-2',
          !isConfirmedPlanned &&
            secondaryPlanningActionLabel &&
            onSecondaryPlanningAction &&
            'flex-col sm:flex-row'
        )}
      >
        {onBeginPlanning && (
          <button
            type="button"
            data-testid="action-begin-planning"
            onClick={onBeginPlanning}
            disabled={departureBlocked}
            className="inline-flex min-h-[48px] min-w-0 flex-1 items-center justify-center rounded-xl bg-hearth-fill px-[16px] py-[12px] text-center text-sm font-semibold text-white whitespace-normal break-words hover:bg-hearth-fill-hover active:bg-hearth-fill-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body disabled:opacity-60"
          >
            {t('recipes.plan', 'Plan')}
          </button>
        )}
        {isConfirmedPlanned ? (
          <button
            type="button"
            data-testid="action-planned"
            onClick={onOpenPlannedDay}
            disabled={departureBlocked}
            aria-label={tWithVars('recipes.openPlannedDay', 'Planned for {{day}}. Open Planner', {
              day: plannedDayLabel!,
            })}
            className="inline-flex min-h-[48px] min-w-0 flex-1 items-center justify-center rounded-xl border border-chrome-line bg-white px-[16px] py-[12px] text-center text-sm font-semibold text-ink-body whitespace-normal break-words shadow-sm hover:bg-charcoal/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body disabled:opacity-60"
          >
            <span className="min-w-0 break-words">
              {tWithVars('recipes.plannedForDay', 'Planned for {{day}}', {
                day: plannedDayLabel!,
              })}
            </span>
          </button>
        ) : hasDatedAction && !sourceDayLabel ? (
          <button
            type="button"
            data-testid="action-add-to-day"
            onClick={() => (onRetryTarget ? onRetryTarget() : onUseRecipe())}
            disabled={isSavingAction || planningLoading}
            className="inline-flex min-h-[48px] min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-hearth-fill px-[16px] py-[12px] text-center text-sm font-semibold text-white whitespace-normal break-words hover:bg-hearth-fill-hover active:bg-hearth-fill-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body disabled:opacity-60"
          >
            <span className="min-w-0 break-words">
              {isSavingAction
                ? t('common.saving', 'Saving')
                : planningNeedsCheck
                  ? t('recipes.retryPlanCheck', 'Retry check')
                  : planningLoading
                    ? t('common.loading', 'Loading…')
                    : (planningActionLabel ?? primaryActionLabel)}
            </span>
          </button>
        ) : sourceDayLabel && onRetryTarget ? (
          <button
            type="button"
            data-testid="action-add-to-day"
            onClick={onRetryTarget}
            disabled={isSavingAction || planningLoading}
            className="inline-flex min-h-[48px] min-w-0 flex-1 items-center justify-center rounded-xl bg-hearth-fill px-[16px] py-[12px] text-center text-sm font-semibold text-white whitespace-normal break-words hover:bg-hearth-fill-hover active:bg-hearth-fill-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body disabled:opacity-60"
          >
            <span className="min-w-0 break-words">
              {planningLoading
                ? t('common.loading', 'Loading…')
                : (planningActionLabel ?? t('recipes.retryPlanCheck', 'Retry check'))}
            </span>
          </button>
        ) : null}
        {!isConfirmedPlanned && secondaryPlanningActionLabel && onSecondaryPlanningAction && (
          <button
            type="button"
            data-testid={secondaryPlanningTestId ?? 'action-secondary-planning'}
            onClick={onSecondaryPlanningAction}
            disabled={isSavingAction || planningLoading || departureBlocked}
            className="inline-flex min-h-[48px] min-w-0 flex-1 items-center justify-center rounded-xl border border-chrome-line bg-white px-[16px] py-[12px] text-center text-sm font-semibold text-ink-body whitespace-normal break-words shadow-sm hover:bg-charcoal/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body disabled:opacity-60"
          >
            <span className="min-w-0 break-words">{secondaryPlanningActionLabel}</span>
          </button>
        )}
        {!isConfirmedPlanned && onChangeDay && (
          <button
            type="button"
            data-testid="action-change-day"
            aria-label={t('recipes.changeDay', 'Change day')}
            title={t('recipes.changeDay', 'Change day')}
            disabled={isSavingAction}
            aria-disabled={isSavingAction || changeDayDisabled}
            onClick={() => {
              // A pending target read blocks activation while keeping the
              // chooser's return-focus trigger connected and focusable.
              if (!changeDayDisabled) onChangeDay();
            }}
            className="inline-flex min-h-[48px] w-[48px] min-w-[48px] flex-none items-center justify-center rounded-xl text-icon-affordance hover:text-ink-body focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
          >
            <ArrowRightLeft
              data-testid="change-day-icon"
              className="shrink-0"
              size={18}
              aria-hidden="true"
            />
          </button>
        )}
      </div>
    </div>
  );
}
