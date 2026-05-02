'use client';

import { Utensils, ChevronRight } from 'lucide-react';
import { TonightCardBase } from './TonightMenuCard';

interface TonightPivotCardProps {
  gotoDescription: string | null;
  gotoRecipeId: string | null;
  /** "ready" once synthesis is complete; "pending" while in progress; null/undefined = no GOTO set */
  gotoStatus?: string | null;
  onConfirmGoto: () => void;
  onDiscover: () => void;
  onOrderIn: () => void;
}

export function TonightPivotCard({
  gotoDescription,
  gotoRecipeId,
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

      {/* Image area — placeholder */}
      <div className="relative flex-1 rounded-[2.5rem] overflow-hidden shadow-2xl mb-6 bg-charcoal/5 flex items-center justify-center">
        <Utensils size={48} className="text-charcoal/10" />
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

        {!hasGoto && (
          <a
            href="/profile/settings"
            className="text-[10px] font-black uppercase tracking-widest text-terracotta flex items-center gap-1 mt-1"
          >
            Set your GOTO <ChevronRight size={12} />
          </a>
        )}
      </div>

      {/* Footer actions — layout depends on whether a ready GOTO exists */}
      <div className="flex flex-col gap-2 mt-auto">
        <button
          onClick={onConfirmGoto}
          data-testid="confirm-goto-btn"
          disabled={!gotoReady}
          className="flex items-center justify-center h-12 rounded-[1.5rem] bg-ochre text-white shadow-lg shadow-ochre/30 transition-all active:scale-95 hover:brightness-110 text-[10px] font-black uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:active:scale-100"
        >
          Confirm GOTO
        </button>
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
