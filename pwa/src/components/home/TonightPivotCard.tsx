'use client';

import { Utensils } from 'lucide-react';
import { TonightCardBase } from './TonightMenuCard';
import { getImageUrl } from '@/lib/imageUtils';
import Link from 'next/link';
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
}

export function TonightPivotCard({
  gotoDescription,
  gotoRecipeId,
  gotoImageUrl,
  gotoStatus,
  onConfirmGoto,
  onDiscover,
  onOrderIn,
}: TonightPivotCardProps) {
  // A GOTO is only actionable when it exists AND is ready.
  // Existing values without a status field (set before Phase 13) are treated as ready.
  const hasGoto = gotoRecipeId != null;
  const gotoReady = hasGoto && gotoStatus === 'ready';
  const gotoPending = hasGoto && gotoStatus === 'pending';
  const isFetching = hasGoto && gotoStatus === null;

  // If we have an explicit image URL, use it.
  // Otherwise, if the recipe is ready, use the standard hero endpoint.
  const imageUrl = gotoImageUrl || (gotoReady ? `/api/recipes/${gotoRecipeId}/hero` : null);

  return (
    <div
      className="relative w-full min-h-[28rem] h-[clamp(28rem,64vh,38rem)] perspective-1000 group sm:aspect-[4/5] sm:h-auto sm:min-h-0"
      data-testid="tonight-pivot-card"
    >
      <TonightCardBase className="absolute inset-0 flex flex-col p-6 backface-hidden">
        {/* Header */}
        <div className="flex justify-between items-center mb-5 px-1">
          <h2
            data-testid="pivot-card-header"
            className="font-heading text-[10px] font-black uppercase tracking-[0.2em] text-charcoal/40"
          >
            What&apos;s for Supper?
          </h2>
        </div>

        {/* Image area */}
        <div
          data-testid="pivot-card-image-area"
          className="relative flex-1 rounded-[2.5rem] overflow-hidden shadow-2xl mb-6 bg-charcoal/5 flex items-center justify-center"
        >
          {imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={getImageUrl(imageUrl)}
              alt={gotoDescription ?? 'Recipe image'}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <Utensils size={48} className="text-charcoal/10" />
          )}
          {hasGoto && (
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal/60 via-transparent to-transparent opacity-60" />
          )}
        </div>

        {/* Body */}
        <div className="flex flex-col gap-2 px-1 mb-5">
          {gotoReady && gotoDescription ? (
            <h3 className="font-heading text-3xl font-black text-charcoal leading-none tracking-tighter">
              {gotoDescription}
            </h3>
          ) : gotoPending ? (
            <p className="text-charcoal/40 text-sm font-medium italic">
              Your GOTO is being prepared…
            </p>
          ) : isFetching ? (
            <p className="text-charcoal/40 text-sm font-medium italic">Checking your GOTO…</p>
          ) : (
            <p className="text-charcoal/40 text-sm font-medium italic">Nothing planned yet</p>
          )}
        </div>

        {/* Footer actions — layout depends on whether a ready GOTO exists */}
        <div className="flex flex-col gap-2 mt-auto">
          {gotoReady && (
            <button
              onClick={onConfirmGoto}
              data-testid="confirm-goto-btn"
              className="flex items-center justify-center h-12 rounded-[1.5rem] bg-ochre text-white shadow-lg shadow-ochre/30 transition-all active:scale-95 hover:brightness-110 text-[10px] font-black uppercase tracking-widest"
            >
              Make This Tonight
            </button>
          )}
          {!hasGoto && (
            <Link
              href={ROUTES.PROFILE}
              data-testid="add-goto-btn"
              className="flex items-center justify-center h-12 rounded-[1.5rem] bg-ochre text-white w-full shadow-lg shadow-ochre/30 transition-all active:scale-95 hover:brightness-110 text-[10px] font-black uppercase tracking-widest"
            >
              Add your family&apos;s GOTO recipe
            </Link>
          )}
          <div className={gotoReady ? 'grid grid-cols-2 gap-2' : 'flex flex-col gap-2'}>
            <button
              onClick={onDiscover}
              data-testid="discover-btn"
              className={
                gotoReady
                  ? 'flex items-center justify-center h-12 rounded-[1.5rem] border border-indigo/30 bg-transparent text-indigo transition-all active:scale-95 hover:bg-indigo/10 text-[10px] font-black uppercase tracking-widest'
                  : 'flex items-center justify-center h-12 rounded-[1.5rem] bg-indigo/10 text-indigo transition-all active:scale-95 hover:bg-indigo/20 text-[10px] font-black uppercase tracking-widest'
              }
            >
              Quick Find
            </button>
            <button
              onClick={onOrderIn}
              data-testid="order-in-btn"
              className={
                gotoReady
                  ? 'flex items-center justify-center h-12 rounded-[1.5rem] border border-charcoal/20 bg-transparent text-charcoal/60 transition-all active:scale-95 hover:bg-charcoal/10 text-[10px] font-black uppercase tracking-widest'
                  : 'flex items-center justify-center h-12 rounded-[1.5rem] bg-charcoal/10 text-charcoal/60 transition-all active:scale-95 hover:bg-charcoal/20 text-[10px] font-black uppercase tracking-widest'
              }
            >
              Order In
            </button>
          </div>
        </div>
      </TonightCardBase>
    </div>
  );
}
