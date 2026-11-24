'use client';

import React from 'react';
import { CalendarPlus, CheckCircle2 } from 'lucide-react';
import { PivotSheetShell, SheetMealContext } from '@/components/ui/PivotSheetShell';
import { t } from '@/locales';
import { formatSupperPlanDate } from '@/lib/planner/nonCooking';

export interface CookedDeferConfirmSheetProps {
  isOpen: boolean;
  onClose: () => void;
  date?: string;
  recipeName?: string | null;
  pending?: boolean;
  onSelect: (disposition: 'reset' | 'preserve') => void;
}

export const CookedDeferConfirmSheet: React.FC<CookedDeferConfirmSheetProps> = ({
  isOpen,
  onClose,
  date,
  recipeName,
  pending = false,
  onSelect,
}) => {
  if (!isOpen) return null;

  return (
    <PivotSheetShell
      eyebrow={t('home.saveForNextWeek', 'Save for Next Week')}
      subtitle={date ? <time dateTime={date}>{formatSupperPlanDate(date)}</time> : undefined}
      onClose={onClose}
      pending={pending}
      trapFocus={true}
      panelTestId="cooked-defer-sheet"
      backdropTestId="cooked-defer-backdrop"
      closeTestId="cooked-defer-close"
      zIndexClass="z-[75]"
    >
      <SheetMealContext
        testId="cooked-defer-meal-context"
        title={recipeName ?? t('home.saveForNextWeek', 'Save for Next Week')}
        subtitle={t(
          'planner.cookedDeferSubtitle',
          'This meal is marked cooked. How should we move it?'
        )}
      />

      <div className="grid grid-cols-1 gap-2.5">
        <button
          type="button"
          disabled={pending}
          onClick={() => onSelect('reset')}
          data-testid="cooked-defer-reset"
          className="flex min-h-[68px] w-full items-center gap-3 rounded-[1.25rem] border-[1.5px] border-hearth-line bg-terracotta-50 px-3.5 py-3 text-left transition-colors motion-reduce:transition-none hover:bg-terracotta-100/70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[0.875rem] bg-hearth-fill text-cream-100">
            <CalendarPlus size={20} aria-hidden="true" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col items-start text-left [overflow-wrap:anywhere]">
            <span className="font-heading text-[15px] font-extrabold leading-tight tracking-tight text-ink-body">
              {t('planner.cookedDeferResetTitle', 'Cook it next week')}
            </span>{' '}
            <span className="mt-0.5 text-xs font-medium leading-snug text-ink-muted">
              {t('planner.cookedDeferResetDesc', 'Move as planned and clear cooked status')}
            </span>
          </span>
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={() => onSelect('preserve')}
          data-testid="cooked-defer-preserve"
          className="flex min-h-[68px] w-full items-center gap-3 rounded-[1.25rem] border border-chrome-line bg-white px-3.5 py-3 text-left transition-colors motion-reduce:transition-none hover:border-garden-line hover:bg-sage-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[0.875rem] bg-sage-50 text-garden-ink">
            <CheckCircle2 size={20} aria-hidden="true" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col items-start text-left [overflow-wrap:anywhere]">
            <span className="font-heading text-[15px] font-extrabold leading-tight tracking-tight text-ink-body">
              {t('planner.cookedDeferPreserveTitle', 'Already cooked')}
            </span>{' '}
            <span className="mt-0.5 text-xs font-medium leading-snug text-ink-muted">
              {t(
                'planner.cookedDeferPreserveDesc',
                'Keep it marked cooked (prepped ahead or frozen)'
              )}
            </span>
          </span>
        </button>
      </div>
    </PivotSheetShell>
  );
};
