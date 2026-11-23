'use client';

import React from 'react';
import { Sparkles, Search, Trash2, ChevronRight, RefreshCw, CalendarCheck } from 'lucide-react';
import { PivotSheetShell, SheetMealContext } from '@/components/ui/PivotSheetShell';
import { t } from '@/locales';
import { formatSupperPlanDate } from '@/lib/planner/nonCooking';

interface PlanningPivotSheetProps {
  isOpen: boolean;
  onClose: () => void;
  dayIndex: number;
  date?: string;
  recipeName?: string | null;
  onQuickFind: () => void;
  onSearchLibrary: () => void;
  onRemoveRecipe?: () => void;
  onPlanLater?: () => void;
  hasRecipe: boolean;
  onNoCooking?: () => void;
  isNonCooking?: boolean;
}

export const PlanningPivotSheet: React.FC<PlanningPivotSheetProps> = ({
  isOpen,
  onClose,
  date,
  recipeName,
  onQuickFind,
  onSearchLibrary,
  onRemoveRecipe,
  onPlanLater,
  hasRecipe,
  onNoCooking,
  isNonCooking = false,
}) => {
  const removeAction = hasRecipe && (
    <button
      type="button"
      onClick={onRemoveRecipe}
      data-testid="pivot-remove-recipe"
      className="flex min-h-[60px] w-full items-center gap-3 rounded-[1.125rem] border border-chrome-line bg-white px-3.5 py-2.5 text-left transition-colors hover:bg-charcoal-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-charcoal-100 text-ink-muted">
        <Trash2 size={20} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-heading text-[15px] font-extrabold leading-tight tracking-tight text-ink-body">
          {isNonCooking
            ? t('planner.clearDay', 'Remove supper plan')
            : t('planner.removeRecipeAction', 'Remove recipe')}
        </span>{' '}
        <span className="mt-0.5 block text-xs font-medium leading-snug text-ink-muted">
          {isNonCooking
            ? t('planner.leaveDayUnplanned', 'Leave this day unplanned')
            : 'Clear this slot'}
        </span>
      </span>
    </button>
  );

  const showRecipeContext = hasRecipe && !isNonCooking && !!recipeName;

  if (!isOpen) return null;

  return (
    <PivotSheetShell
      eyebrow={t('planner.choosePathLabel', 'Planner options')}
      subtitle={date ? <time dateTime={date}>{formatSupperPlanDate(date)}</time> : undefined}
      onClose={onClose}
      panelTestId="pivot-sheet"
      backdropTestId="pivot-sheet-backdrop"
      zIndexClass="z-[70]"
    >
      {showRecipeContext ? (
        <SheetMealContext
          testId="pivot-meal-context"
          title={recipeName}
          subtitle={t('planner.choosePathSubtitle', 'Choose how to replace or remove this recipe')}
        />
      ) : (
        <div>
          <h3 className="font-heading text-xl font-extrabold leading-tight tracking-tight text-ink-body">
            {isNonCooking
              ? t('planner.changeSupperPlans', 'Change supper plans')
              : hasRecipe
                ? t('planner.choosePathTitle', 'Change this recipe')
                : t('planner.planSupper', 'Plan supper')}
          </h3>
          <p className="mt-1 text-xs font-medium text-ink-muted">
            {!hasRecipe || isNonCooking
              ? t('planner.supperOptionsSubtitle', 'Choose what works for this day')
              : t('planner.choosePathSubtitle', 'Choose how to replace or remove this recipe')}
          </p>
          <hr className="my-3.5 border-0 border-t border-chrome-line" />
        </div>
      )}

      <div className="grid grid-cols-1 gap-2">
        {hasRecipe && onPlanLater && (
          <button
            type="button"
            onClick={onPlanLater}
            data-testid="pivot-plan-later"
            className="flex min-h-[60px] w-full items-center gap-3 rounded-[1.125rem] border border-chrome-line bg-white px-3.5 py-2.5 text-left transition-colors hover:border-garden-line hover:bg-sage-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage-50 text-garden-ink">
              <RefreshCw size={20} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <span className="block font-heading text-[15px] font-extrabold leading-tight tracking-tight text-ink-body">
                {t('home.saveForNextWeek', 'Save for Next Week')}
              </span>
              <p className="mt-0.5 text-xs font-medium leading-snug text-ink-muted">
                {t('home.moveFirstSlot', 'Moves to the first open slot')}
              </p>
            </div>
            <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-icon-affordance" />
          </button>
        )}

        <button
          type="button"
          onClick={onQuickFind}
          data-testid="pivot-quick-find"
          className="flex min-h-[60px] w-full items-center gap-3 rounded-[1.125rem] border border-chrome-line bg-white px-3.5 py-2.5 text-left transition-colors hover:border-sunlight-line hover:bg-ochre-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ochre-100 text-sunlight-ink">
            <Sparkles size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <span className="block font-heading text-[15px] font-extrabold leading-tight tracking-tight text-ink-body">
              {t('planner.quickFindAction', 'Suggestions')}
            </span>
            <p className="mt-0.5 text-xs font-medium leading-snug text-ink-muted">
              {t('planner.quickFindDescription', 'Browse up to 5 recipe suggestions')}
            </p>
          </div>
          <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-icon-affordance" />
        </button>

        <button
          type="button"
          onClick={onSearchLibrary}
          data-testid="pivot-search-library"
          className="flex min-h-[60px] w-full items-center gap-3 rounded-[1.125rem] border border-chrome-line bg-white px-3.5 py-2.5 text-left transition-colors hover:border-hearth-line hover:bg-terracotta-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-terracotta-50 text-hearth-ink">
            <Search size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <span className="block font-heading text-[15px] font-extrabold leading-tight tracking-tight text-ink-body">
              {t('planner.searchLibraryAction', 'Search library')}
            </span>
            <p className="mt-0.5 text-xs font-medium leading-snug text-ink-muted">
              Browse your collection
            </p>
          </div>
          <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-icon-affordance" />
        </button>

        {!isNonCooking && removeAction}
        {onNoCooking && (
          <button
            type="button"
            onClick={onNoCooking}
            data-testid="pivot-no-cooking"
            className="flex min-h-[60px] w-full items-center gap-3 rounded-[1.125rem] border border-chrome-line bg-white px-3.5 py-2.5 text-left transition-colors hover:border-garden-line hover:bg-sage-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage-50 text-garden-ink">
              <CalendarCheck size={20} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <span className="block font-heading text-[15px] font-extrabold leading-tight tracking-tight text-ink-body">
                {isNonCooking
                  ? t('planner.editSupperPlan', 'Edit supper plan')
                  : t('planner.noCooking', 'Other plans')}
              </span>
              <p className="mt-0.5 text-xs font-medium leading-snug text-ink-muted">
                {t('planner.otherPlansSubtitle', 'Take out, eat out, or add your own')}
              </p>
            </div>
            <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-icon-affordance" />
          </button>
        )}
        {isNonCooking && removeAction}
      </div>
    </PivotSheetShell>
  );
};
