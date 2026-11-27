'use client';

import { Check } from 'lucide-react';
import { NonCookingVignette } from '@/components/home/NonCookingVignette';
import { TonightCardBase } from '@/components/home/TonightMenuCard';
import { nonCookingLabel, nonCookingNote } from '@/lib/planner/nonCooking';
import { t } from '@/locales';
import type { NonCookingPlanDto } from '@/lib/api/generated/models/index';

interface SavedNonCookingPlanCardProps {
  nonCooking: NonCookingPlanDto | null | undefined;
  onEditPlan: () => void;
}

export function SavedNonCookingPlanCard({ nonCooking, onEditPlan }: SavedNonCookingPlanCardProps) {
  const label = nonCookingLabel(nonCooking);
  const note = nonCookingNote(nonCooking);

  return (
    <TonightCardBase
      data-testid="today-non-cooking-plan"
      className="flex min-w-0 flex-col gap-5 p-6 [overflow-wrap:anywhere]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <h2 className="font-heading text-base font-medium text-ink-muted">
          {t('home.tonight', 'Tonight')}
        </h2>
        <span
          data-testid="non-cooking-status-pill"
          className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-garden-line bg-sage-50 px-3 py-1 text-xs font-semibold text-garden-ink"
        >
          <Check size={14} strokeWidth={2.5} aria-hidden="true" className="shrink-0" />
          {nonCooking?.kind === 'custom'
            ? t('planner.otherPlans', 'We made plans')
            : t('home.planSet', 'Plan set')}
        </span>
      </div>
      <NonCookingVignette kind={nonCooking?.kind} testId="saved-plan-illustration" />
      <div className="space-y-3 px-1">
        <h3
          data-testid="today-non-cooking-label"
          className="whitespace-pre-wrap break-words font-heading text-3xl font-black leading-snug text-ink-body"
        >
          {label}
        </h3>
        <div className="space-y-0.5 border-l-4 border-garden-line pl-3.5">
          {note ? (
            <>
              <p
                data-testid="today-non-cooking-note"
                className="whitespace-pre-wrap break-words text-sm font-medium leading-relaxed text-ink-body"
              >
                {note}
              </p>
              <p className="text-xs leading-normal text-ink-muted">
                {nonCooking?.kind === 'eating_out'
                  ? t('home.noCookingTonight', 'No cooking tonight')
                  : t('home.takeoutNoCooking', 'Takeout or delivery · no cooking')}
              </p>
            </>
          ) : (
            <p className="text-sm leading-relaxed text-ink-muted">
              {nonCooking?.kind === 'custom'
                ? t('home.noCookingPlanSaved', 'No cooking tonight · plan saved')
                : nonCooking?.kind === 'eating_out'
                  ? t('home.noCookingTonight', 'No cooking tonight')
                  : t('home.takeoutNoCooking', 'Takeout or delivery · no cooking')}
            </p>
          )}
        </div>
      </div>
      <button
        aria-label={`${t('home.tonight', 'Tonight')} ${[label, note].filter(Boolean).join(' ')} ${t('planner.editSupperPlan', 'Edit supper plan')}`}
        onClick={onEditPlan}
        className="flex min-h-14 items-center justify-center rounded-[1.5rem] border border-hearth-line px-4 py-3 text-base font-semibold text-hearth-ink transition-colors hover:bg-terracotta-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body"
      >
        {t('planner.editSupperPlan', 'Edit supper plan')}
      </button>
    </TonightCardBase>
  );
}
