'use client';

import { Camera, ChevronRight, Vote } from 'lucide-react';
import Link from 'next/link';
import { ROUTES } from '@/lib/constants/routes';
import { t } from '@/locales';
import { SuccessCard } from '@/components/ui/SuccessCard';

export function QuickCaptureTrigger() {
  return (
    <Link
      href={ROUTES.CAPTURE}
      data-testid="quick-capture-trigger"
      className="group relative flex items-center justify-between w-full bg-white text-ink-body p-4 sm:p-6 rounded-[2.5rem] border-2 border-chrome-line transition-all active:scale-[0.98] hover:border-hearth-line focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-hearth-ink"
    >
      <div className="flex items-center gap-3 sm:gap-5">
        <div className="flex h-11 w-11 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-terracotta/10 text-hearth-ink transition-colors group-hover:bg-hearth-fill group-hover:text-white">
          <Camera size={32} strokeWidth={2} />
        </div>
        <div className="flex flex-col">
          <span className="font-heading text-[1.05rem] sm:text-xl font-black tracking-tighter leading-none">
            {t('home.captureRecipe', 'Capture a Recipe')}
          </span>
          <span className="text-ink-muted text-xs font-medium mt-1">
            {t('home.photoOrLink', 'Photo or Link')}
          </span>
        </div>
      </div>
      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full border border-chrome-line flex items-center justify-center group-hover:border-hearth-line">
        <ChevronRight
          size={20}
          className="text-icon-affordance group-hover:text-hearth-ink transition-all group-hover:translate-x-0.5"
        />
      </div>
    </Link>
  );
}
export function CookedSuccessCard({ onDismiss }: { onDismiss?: () => void }) {
  return (
    <SuccessCard
      testId="cooked-success-card"
      titleTestId="cooked-success-title"
      actionTestId="cooked-success-dismiss"
      title={t('home.enjoyMeal', 'Enjoy your meal!')}
      description={t('home.markedAsCooked', 'Recipe marked as cooked')}
      actionLabel={t('home.dismiss', 'Dismiss')}
      onAction={onDismiss}
    />
  );
}

interface VotingNudgeCardProps {
  phase: 'collecting' | 'converged' | null;
  status: 'checking' | 'unavailable' | null;
  onNavigate: () => void;
  onRetry: () => void;
}

export function VotingNudgeCard({ phase, status, onNavigate, onRetry }: VotingNudgeCardProps) {
  const converged = phase === 'converged';
  return (
    <section
      data-testid="voting-nudge-card"
      aria-label={t('home.votingRound', 'Family voting')}
      className="w-full bg-ochre-50 border border-sunlight-line rounded-[2.5rem] p-6 flex flex-col gap-4"
    >
      {phase && (
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ochre-100 text-sunlight-ink flex-shrink-0"
          >
            <Vote size={20} />
          </div>
          <div>
            <h2 className="font-heading text-lg font-bold text-ink-body">
              {converged
                ? t('home.menuIsIn', "Menu's In")
                : t('home.familyVoting', 'The family is voting')}
            </h2>
            {converged && (
              <p className="text-sm text-ink-body">
                {t('home.matchesReady', 'Your matches are ready to review and save.')}
              </p>
            )}
          </div>
        </div>
      )}
      {status && (
        <p role="status" data-testid="home-voting-status" className="text-sm text-ink-body">
          {status === 'checking'
            ? t('home.checkingVoting', 'Checking voting…')
            : phase
              ? t(
                  'home.votingUnavailableRetained',
                  'Voting status unavailable. Showing the last confirmed round.'
                )
              : t('home.votingUnavailable', 'Voting status unavailable.')}
        </p>
      )}
      {phase && (
        <button
          data-testid={converged ? 'home-see-matches' : 'voting-nudge-vote-now'}
          onClick={onNavigate}
          className="w-full min-h-12 rounded-2xl bg-white text-sunlight-ink border border-sunlight-line shadow-sm font-semibold text-sm px-4 py-3 transition-colors hover:bg-ochre-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body"
        >
          {converged ? t('home.seeMatches', 'See your matches') : t('home.voteNow', 'Vote Now')}
        </button>
      )}
      {status === 'unavailable' && (
        <button
          onClick={onRetry}
          className="min-h-12 rounded-2xl border border-chrome-line bg-white px-4 py-3 font-semibold text-sm text-ink-body hover:bg-charcoal-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body"
        >
          {t('home.retryVoting', 'Retry')}
        </button>
      )}
    </section>
  );
}
