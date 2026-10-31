'use client';

import { ShoppingBag, Utensils, UtensilsCrossed, Search, Star } from 'lucide-react';
import { NonCookingIcon } from '../planner/NonCookingIcon';
import type { NonCookingPlanDto } from '@/lib/api/generated/models';
import { TonightCardBase } from './TonightMenuCard';
import { TonightRecipeImage } from './TonightRecipeImage';
import { t } from '@/locales';

interface TonightPivotCardProps {
  gotoDescription: string | null;
  gotoRecipeId: string | null;
  gotoImageUrl?: string | null;
  /** "ready" once synthesis is complete; "pending" while in progress; null/undefined = no GOTO set */
  gotoStatus?: string | null;
  hasCheckedActive?: boolean;
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
  hasCheckedActive = false,
  onConfirmGoto,
  onDiscover,
  onOrderIn,
  nonCookingLabel,
  nonCookingKind,
}: TonightPivotCardProps) {
  // A GOTO is only actionable when it exists AND is ready.
  // Saved Mystery context does not change the existing GOTO eligibility rules.
  const hasGoto = gotoRecipeId != null;
  const showGotoHelper = hasCheckedActive && !hasGoto && !nonCookingLabel;
  const showGoto = !nonCookingLabel || nonCookingKind === 'mystery';
  const gotoReady = showGoto && hasGoto && gotoStatus === 'ready';
  const gotoPending = showGoto && hasGoto && gotoStatus === 'pending';
  const isFetching = showGoto && hasGoto && gotoStatus === null;

  // If we have an explicit image URL, use it.
  // Otherwise, if the recipe is ready, use the standard hero endpoint.
  const imageUrl =
    !nonCookingLabel && gotoReady ? gotoImageUrl || `/api/recipes/${gotoRecipeId}/hero` : null;

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
            className="font-heading text-base font-medium text-charcoal-600"
          >
            {nonCookingLabel
              ? t('home.tonight', 'Tonight')
              : t('home.nothingPlannedTonight', 'Nothing planned for tonight')}
          </h2>
        </div>

        <div data-testid="pivot-card-image-area">
          {showGotoHelper ? (
            <div
              data-testid="empty-pivot-illustration"
              className="flex h-28 sm:h-40 items-center justify-center rounded-[1.5rem] bg-cream text-sage-700"
              aria-hidden="true"
            >
              <Utensils size={104} strokeWidth={1.25} />
            </div>
          ) : (
            <TonightRecipeImage
              key={`${gotoRecipeId}:${imageUrl}`}
              imageUrl={imageUrl}
              alt={gotoDescription ?? t('cook.untitledRecipe', 'Untitled recipe')}
              className="aspect-[5/4]"
              fallback={
                nonCookingLabel ? (
                  <NonCookingIcon kind={nonCookingKind} size={28} className="text-sage-700" />
                ) : (
                  <Utensils size={28} />
                )
              }
            />
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
              <h3 className="font-heading text-[2rem] font-black text-charcoal leading-tight tracking-tight">
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
              className="flex items-center justify-center gap-2 min-h-14 px-4 py-3 rounded-[1.5rem] bg-terracotta text-cream-100 hover:bg-terracotta-600 active:bg-terracotta-700 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-charcoal text-base font-semibold leading-normal"
            >
              <UtensilsCrossed size={18} aria-hidden="true" className="shrink-0" />
              {t('home.makeThisTonight', 'Make this tonight')}
            </button>
          )}
          <div className={gotoReady ? 'flex flex-wrap gap-2' : 'flex flex-col gap-2'}>
            <button
              onClick={onDiscover}
              data-testid="discover-btn"
              className={
                gotoReady
                  ? 'flex min-w-[min(100%,8em)] flex-[1.4_1_8em] items-center justify-center gap-1 min-h-14 px-1.5 py-3 rounded-[1.5rem] border border-terracotta-200 text-terracotta-700 hover:bg-terracotta-50 active:bg-terracotta-100 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-charcoal text-base font-semibold leading-normal'
                  : 'flex items-center justify-center gap-2 min-h-14 px-4 py-3 rounded-[1.5rem] bg-terracotta text-cream-100 hover:bg-terracotta-600 active:bg-terracotta-700 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-charcoal text-base font-semibold leading-normal'
              }
            >
              <Search size={16} aria-hidden="true" className="shrink-0" />
              <span className="min-w-0 [overflow-wrap:normal]">
                {nonCookingLabel ? t('home.quickFind', 'Quick Find') : t('home.search', 'Search')}
              </span>
            </button>
            <button
              onClick={onOrderIn}
              data-testid="order-in-btn"
              className={
                gotoReady
                  ? 'flex min-w-[min(100%,8.25em)] flex-[1_1_8.25em] items-center justify-center gap-1 min-h-14 px-1.5 py-3 rounded-[1.5rem] border border-terracotta-200 text-terracotta-700 hover:bg-terracotta-50 active:bg-terracotta-100 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-charcoal text-base font-semibold leading-normal'
                  : 'flex items-center justify-center gap-1 min-h-14 px-1.5 py-3 rounded-[1.5rem] border border-terracotta-200 text-terracotta-700 hover:bg-terracotta-50 active:bg-terracotta-100 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-charcoal text-base font-semibold leading-normal'
              }
            >
              <ShoppingBag size={16} aria-hidden="true" className="shrink-0" />
              <span className="min-w-0 [overflow-wrap:normal]">
                {t('home.orderingIn', 'Order In')}
              </span>
            </button>
          </div>
          {showGotoHelper && (
            <div data-testid="goto-setup-helper" className="mt-2 space-y-1">
              <p className="text-base font-normal leading-relaxed text-charcoal-600">
                {t(
                  'home.gotoHelper',
                  'Tap the {{star}} on favourite recipes so we can suggest one here.'
                )
                  .split('{{star}}')
                  .map((part, index) => (
                    <span key={index}>
                      {index > 0 && (
                        <Star
                          className="inline-block align-text-bottom"
                          size={18}
                          role="img"
                          aria-label={t('home.star', 'star')}
                        />
                      )}
                      {part}
                    </span>
                  ))}
              </p>
            </div>
          )}
        </div>
      </TonightCardBase>
    </div>
  );
}
