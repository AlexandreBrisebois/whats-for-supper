'use client';

import { Check, Camera, ChevronRight, X, Vote, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { ROUTES } from '@/lib/constants/routes';
import { t } from '@/locales';

export function QuickCaptureTrigger() {
  return (
    <Link
      href={ROUTES.CAPTURE}
      data-testid="quick-capture-trigger"
      className="group relative flex items-center justify-between w-full bg-white text-charcoal p-4 sm:p-6 rounded-[2.5rem] border-2 border-charcoal/5 transition-all active:scale-[0.98] hover:border-terracotta/20"
    >
      <div className="flex items-center gap-3 sm:gap-5">
        <div className="flex h-11 w-11 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-terracotta/10 text-terracotta transition-colors group-hover:bg-terracotta group-hover:text-white">
          <Camera size={32} strokeWidth={2} />
        </div>
        <div className="flex flex-col">
          <span className="font-heading text-[1.05rem] sm:text-xl font-black tracking-tighter leading-none">
            {t('home.captureRecipe', 'Capture a Recipe')}
          </span>
          <span className="text-charcoal/40 text-[10px] font-black uppercase tracking-widest mt-1">
            {t('home.photoOrLink', 'Photo or Link')}
          </span>
        </div>
      </div>
      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full border border-charcoal/10 flex items-center justify-center group-hover:border-terracotta/30">
        <ChevronRight
          size={20}
          className="text-charcoal/20 group-hover:text-terracotta transition-all group-hover:translate-x-0.5"
        />
      </div>
    </Link>
  );
}

export function CookedSuccessCard({ onDismiss }: { onDismiss?: () => void }) {
  return (
    <div
      data-testid="cooked-success-card"
      className="bg-sage p-8 rounded-[2.5rem] shadow-sage-floating flex flex-col items-center justify-center gap-6 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute bottom-0 left-0 -ml-8 -mb-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/40 text-white mb-2">
        <Check size={48} strokeWidth={3} />
      </div>

      <div className="flex flex-col gap-2 items-center text-center relative z-10">
        <h3
          data-testid="cooked-success-title"
          className="font-heading text-4xl font-black text-white leading-none tracking-tighter"
        >
          {t('home.enjoyMeal', 'Enjoy your meal!')}
        </h3>
        <p className="text-white/70 text-xs font-black uppercase tracking-widest">
          {t('home.markedAsCooked', 'Recipe marked as cooked')}
        </p>
      </div>

      <button
        onClick={onDismiss}
        data-testid="cooked-success-dismiss"
        className="mt-2 px-8 h-12 rounded-2xl bg-white text-sage font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 hover:bg-white/90"
      >
        {t('home.dismiss', 'Dismiss')}
      </button>
    </div>
  );
}

interface VotingNudgeCardProps {
  plannedCount: number;
  onVote: () => void;
  onDismiss: () => void;
}

export function VotingNudgeCard({ plannedCount, onVote, onDismiss }: VotingNudgeCardProps) {
  return (
    <div
      data-testid="voting-nudge-card"
      className="relative w-full bg-ochre/10 border border-ochre/20 rounded-[2.5rem] p-6 flex flex-col gap-4 overflow-hidden"
    >
      <button
        data-testid="voting-nudge-dismiss"
        onClick={onDismiss}
        className="absolute top-4 right-4 h-8 w-8 rounded-full bg-ochre/10 flex items-center justify-center text-ochre/60 hover:bg-ochre/20 transition-colors"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ochre/20 text-ochre flex-shrink-0">
          <Vote size={20} />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-black text-charcoal leading-tight">
            The family is voting on next week
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-ochre/70 mt-0.5">
            {plannedCount} {plannedCount === 1 ? 'recipe' : 'recipes'} to vote on
          </span>
        </div>
      </div>

      <button
        data-testid="voting-nudge-vote-now"
        onClick={onVote}
        className="w-full h-12 rounded-2xl bg-ochre text-white font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 hover:bg-ochre/90 shadow-lg shadow-ochre/20"
      >
        Vote Now →
      </button>
    </div>
  );
}

export function BrowseLibraryTrigger({ testId }: { testId: string }) {
  return (
    <Link
      href={ROUTES.BROWSE_ALL_STACK}
      data-testid={testId}
      className="group relative flex items-center justify-between w-full bg-white text-charcoal p-4 sm:p-6 rounded-[2.5rem] border-2 border-charcoal/5 transition-all active:scale-[0.98] hover:border-ochre/20"
    >
      <div className="flex items-center gap-3 sm:gap-5">
        <div className="flex h-11 w-11 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-ochre/10 text-ochre transition-colors group-hover:bg-ochre group-hover:text-white">
          <BookOpen size={28} strokeWidth={2} />
        </div>
        <div className="flex flex-col">
          <span className="font-heading text-[1.05rem] sm:text-xl font-black tracking-tighter leading-none">
            {t('home.browseLibrary', 'Browse your library')}
          </span>
          <span className="text-charcoal/40 text-[10px] font-black uppercase tracking-widest mt-1">
            {t('home.browseLibrarySubtitle', 'Flip through your recipes')}
          </span>
        </div>
      </div>
      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full border border-charcoal/10 flex items-center justify-center group-hover:border-ochre/30">
        <ChevronRight
          size={20}
          className="text-charcoal/20 group-hover:text-ochre transition-all group-hover:translate-x-0.5"
        />
      </div>
    </Link>
  );
}
