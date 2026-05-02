'use client';

import { Utensils } from 'lucide-react';
import Image from 'next/image';
import { TonightCardBase } from './TonightMenuCard';
import { getImageUrl } from '@/lib/imageUtils';

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
    <TonightCardBase
      className="aspect-[4/5] w-full flex flex-col p-6"
      data-testid="tonight-pivot-card"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-5 px-1">
        <h2 className="font-heading text-[10px] font-black uppercase tracking-[0.2em] text-charcoal/40">
          Tonight&apos;s Menu
        </h2>
        <span className="text-[10px] font-black text-terracotta bg-terracotta/10 px-3 py-1 rounded-full uppercase tracking-widest">
          30-45 Mins
        </span>
      </div>

      {/* Image area */}
      <div className="relative flex-1 rounded-[2.5rem] overflow-hidden shadow-2xl mb-6 bg-charcoal/5 flex items-center justify-center">
        {imageUrl ? (
          <Image
            src={getImageUrl(imageUrl)}
            alt={gotoDescription ?? 'Recipe image'}
            fill
            className="object-cover"
            priority
            unoptimized
          />
        ) : hasGoto ? (
          <Utensils size={48} className="text-charcoal/10" />
        ) : (
          <a
            href="/profile/settings"
            className="flex flex-col items-center justify-center gap-3 px-6 text-center"
          >
            <span className="flex items-center justify-center w-16 h-16 rounded-full bg-terracotta/10">
              <Utensils size={28} className="text-terracotta" />
            </span>
            <span className="text-[11px] font-black uppercase tracking-widest text-terracotta leading-snug">
              Add your family&apos;s
              <br />
              GOTO recipe
            </span>
          </a>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/60 via-transparent to-transparent opacity-60" />
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
            Confirm GOTO
          </button>
        )}
        <div className={gotoReady ? 'grid grid-cols-2 gap-2' : 'flex flex-col gap-2'}>
          <button
            onClick={onDiscover}
            data-testid="discover-btn"
            className="flex items-center justify-center h-12 rounded-[1.5rem] bg-indigo/10 text-indigo transition-all active:scale-95 hover:bg-indigo/20 text-[10px] font-black uppercase tracking-widest"
          >
            Quick Find
          </button>
          <button
            onClick={onOrderIn}
            data-testid="order-in-btn"
            className="flex items-center justify-center h-12 rounded-[1.5rem] bg-charcoal/10 text-charcoal/60 transition-all active:scale-95 hover:bg-charcoal/20 text-[10px] font-black uppercase tracking-widest"
          >
            Order In
          </button>
        </div>
      </div>
    </TonightCardBase>
  );
}
