'use client';

import { ShoppingBag, Utensils } from 'lucide-react';
import { NonCookingIcon } from '../planner/NonCookingIcon';
import type { NonCookingPlanDto } from '@/lib/api/generated/models';
import { TonightCardBase } from './TonightMenuCard';
import { getImageUrl } from '@/lib/imageUtils';
import Link from 'next/link';
import { t } from '@/locales';
import { ROUTES } from '@/lib/constants/routes';

interface TonightPivotCardProps {
  gotoDescription: string | null;
  gotoRecipeId: string | null;
  gotoImageUrl?: string | null;
  /** "ready" once synthesis is complete; "pending" while in progress; null/undefined = no GOTO set */
  gotoStatus?: string | null;
  onConfirmGoto: () => void;
  onDiscover: () => void;
  onOrderIn: () => void;
  nonCookingLabel?: string | null;
  nonCookingKind?: NonCookingPlanDto['kind'] | null;
}

export function TonightPivotCard({
  gotoDescription,
  gotoRecipeId,
  gotoImageUrl,
  gotoStatus,
  onConfirmGoto,
  onDiscover,
  onOrderIn,
  nonCookingLabel,
  nonCookingKind,
}: TonightPivotCardProps) {
  // A GOTO is only actionable when it exists AND is ready.
  // Saved Mystery context does not change the existing GOTO eligibility rules.
  const hasGoto = gotoRecipeId != null;
  const showGoto = !nonCookingLabel || nonCookingKind === 'mystery';
  const gotoReady = showGoto && hasGoto && gotoStatus === 'ready';
  const gotoPending = showGoto && hasGoto && gotoStatus === 'pending';
  const isFetching = showGoto && hasGoto && gotoStatus === null;

  // If we have an explicit image URL, use it.
  // Otherwise, if the recipe is ready, use the standard hero endpoint.
  const imageUrl = nonCookingLabel
    ? null
    : gotoImageUrl || (gotoReady ? `/api/recipes/${gotoRecipeId}/hero` : null);

  return (
    <div
      className="relative w-full min-w-0 [overflow-wrap:anywhere]"
      data-testid="tonight-pivot-card"
    >
      <TonightCardBase className="flex flex-col p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-5 px-1">
          <h2
            data-testid="pivot-card-header"
            className="font-heading text-base font-semibold text-charcoal"
          >
            {nonCookingLabel
              ? t('home.tonight', 'Tonight')
              : t('home.nothingPlannedTonight', 'Nothing planned for tonight')}
          </h2>
        </div>

        {/* Image area */}
        <div
          data-testid="pivot-card-image-area"
          className="relative aspect-[4/3] max-h-64 w-full shrink-0 rounded-[2.5rem] overflow-hidden mb-6 bg-charcoal/5 flex items-center justify-center"
        >
          {imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={getImageUrl(imageUrl)}
              alt={gotoDescription ?? t('cook.untitledRecipe', 'Untitled recipe')}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : nonCookingLabel ? (
            <NonCookingIcon kind={nonCookingKind} size={48} className="text-sage-700" />
          ) : (
            <Utensils size={48} className="text-charcoal-600" />
          )}
          {hasGoto && (
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal/60 via-transparent to-transparent opacity-60" />
          )}
        </div>

        {/* Body */}
        <div className="flex flex-col gap-2 px-1 mb-5">
          {nonCookingLabel && nonCookingKind === 'mystery' ? (
            <h3
              data-testid="today-non-cooking-label"
              className="font-heading text-3xl font-black leading-snug text-charcoal"
            >
              {nonCookingLabel}
            </h3>
          ) : nonCookingLabel ? (
            <details>
              <summary
                data-testid="today-non-cooking-label"
                className="cursor-pointer font-heading text-3xl font-black text-charcoal"
              >
                {nonCookingLabel}
              </summary>
              <p className="mt-3 whitespace-pre-wrap break-words text-charcoal">
                {nonCookingLabel}
              </p>
            </details>
          ) : null}
          {gotoReady ? (
            <div>
              <p className="text-sm font-medium leading-normal text-charcoal-600">
                {t('home.familyGoto', "Your family's GOTO")}
              </p>
              <h3 className="font-heading text-3xl font-black text-charcoal leading-snug tracking-tight">
                {gotoDescription}
              </h3>
            </div>
          ) : gotoPending ? (
            <p className="text-charcoal-600 text-sm font-medium italic">
              {t('home.preparingGoto', 'Your GOTO is being prepared…')}
            </p>
          ) : isFetching ? (
            <p className="text-charcoal-600 text-sm font-medium italic">
              {t('home.checkingGoto', 'Checking your GOTO…')}
            </p>
          ) : null}
        </div>

        {/* Footer actions — layout depends on whether a ready GOTO exists */}
        <div className="flex flex-col gap-2 mt-auto">
          {gotoReady && (
            <button
              onClick={onConfirmGoto}
              data-testid="confirm-goto-btn"
              className="flex items-center justify-center min-h-14 px-4 py-3 rounded-[1.5rem] bg-ochre text-charcoal border border-ochre-800 transition-all focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-charcoal active:scale-95 hover:brightness-95 text-base font-semibold leading-normal"
            >
              {t('home.makeThisTonight', 'Make this tonight')}
            </button>
          )}
          <div className={gotoReady ? 'grid grid-cols-1 gap-2' : 'flex flex-col gap-2'}>
            <button
              onClick={onDiscover}
              data-testid="discover-btn"
              className={
                gotoReady
                  ? 'flex items-center justify-center min-h-14 px-4 py-3 rounded-[1.5rem] border border-indigo-800 bg-transparent text-indigo-800 transition-all focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-charcoal active:scale-95 hover:bg-indigo-50 text-base font-semibold leading-normal'
                  : 'flex items-center justify-center min-h-14 px-4 py-3 rounded-[1.5rem] border border-indigo-800 bg-indigo-800 text-white transition-all focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-charcoal active:scale-95 hover:brightness-95 text-base font-semibold leading-normal'
              }
            >
              {t('home.quickFind', 'Quick Find')}
            </button>
            <button
              onClick={onOrderIn}
              data-testid="order-in-btn"
              className={
                gotoReady
                  ? 'flex flex-wrap gap-2 items-center justify-center min-h-14 px-4 py-3 rounded-[1.5rem] border border-charcoal bg-transparent text-charcoal transition-all focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-charcoal active:scale-95 hover:bg-charcoal/10 text-base font-semibold leading-normal'
                  : 'flex flex-wrap gap-2 items-center justify-center min-h-14 px-4 py-3 rounded-[1.5rem] border border-charcoal bg-transparent text-charcoal transition-all focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-charcoal active:scale-95 hover:bg-charcoal/20 text-base font-semibold leading-normal'
              }
            >
              <ShoppingBag size={20} aria-hidden="true" className="shrink-0" />
              <span>{t('home.orderingIn', 'Order In')}</span>
            </button>
          </div>
          {!hasGoto && (
            <Link
              href={ROUTES.PROFILE}
              data-testid="add-goto-btn"
              className="flex items-center justify-center min-h-14 px-4 py-3 rounded-[1.5rem] bg-transparent text-charcoal border border-charcoal w-full transition-all focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-charcoal active:scale-95 hover:brightness-95 text-base font-semibold leading-normal"
            >
              {t('home.addFamilyGoto', "Add your family's GOTO recipe")}
            </Link>
          )}
        </div>
      </TonightCardBase>
    </div>
  );
}
