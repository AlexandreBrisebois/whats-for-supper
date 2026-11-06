'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Utensils,
  Search,
  RefreshCw,
  Calendar,
  ArrowRight,
  Trash2,
  CircleHelp,
  LoaderCircle,
  Check,
} from 'lucide-react';
import { NonCookingIcon } from '../planner/NonCookingIcon';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { t, tWithVars } from '@/locales';

import type { PlannerSlot } from '@/lib/planner/slotAssignment';
import { formatSupperPlanDate } from '@/lib/planner/nonCooking';
import { describeOriginalDisposition } from '@/lib/planner/replacementCopy';
import type { ReplacementFeedback } from '@/lib/planner/replacementSession';
export type { ReplacementFeedback } from '@/lib/planner/replacementSession';

interface SkipRecoveryDialogProps {
  isOpen: boolean;
  pending?: boolean;
  source?: PlannerSlot;
  replacement?: ReplacementFeedback | null;
  onRetryReplacement?: () => void;
  onReviewPlan?: () => void;
  confirmAbandon?: boolean;
  onCancelAbandon?: () => void;
  onAbandon?: () => void;
  step: 1 | 2;
  searchError?: string | null;
  onRetrySearch?: () => void;
  onClose: () => void;
  onBack: () => void;
  onAction: (
    action: 'order_in' | 'pick_else' | 'search' | 'tomorrow' | 'next_week' | 'drop'
  ) => void;
}

export function SkipRecoveryDialog({
  isOpen,
  pending = false,
  source,
  replacement,
  onRetryReplacement,
  onReviewPlan,
  confirmAbandon,
  onCancelAbandon,
  onAbandon,
  step,
  searchError,
  onRetrySearch,
  onClose,
  onBack,
  onAction,
}: SkipRecoveryDialogProps) {
  const feedbackRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (replacement && !pending && !confirmAbandon) feedbackRef.current?.focus();
  }, [replacement, pending, confirmAbandon]);
  if (!isOpen) return null;

  const sourceDate = source?.date ? formatSupperPlanDate(source.date) : '';
  const followingDate = source?.date
    ? formatSupperPlanDate(
        new Date(Date.parse(`${source.date}T00:00:00Z`) + 86400000).toISOString().slice(0, 10)
      )
    : '';
  const replacementTitle = confirmAbandon
    ? t('planning.replacement.leaveTitle', 'Leave this replacement?')
    : replacement &&
      {
        moving: t('planning.replacement.movingTitle', 'Updating your plan'),
        saving: t('planning.replacement.savingTitle', 'Saving your new meal'),
        retry: t('planning.replacement.retryTitle', 'Let’s finish saving'),
        unknown: t('planning.replacement.unknownTitle', 'Check your plan'),
        conflict: t('planning.replacement.conflictTitle', 'Your plan changed'),
        disposition_unknown: t('planning.replacement.dispositionTitle', 'Check your original meal'),
        refresh: t('planning.replacement.refreshTitle', 'Your meal is saved'),
      }[replacement.phase];
  const FeedbackIcon = pending
    ? LoaderCircle
    : replacement?.phase === 'refresh'
      ? Check
      : CircleHelp;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center px-6 pb-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={pending ? undefined : onClose}
        className="absolute inset-0 bg-cream/55 backdrop-blur-xl"
      />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={cn(
          'relative w-full max-w-sm max-h-[calc(100dvh-3rem-env(safe-area-inset-bottom))] overflow-y-auto shadow-[0_24px_60px_-16px_rgba(74,55,40,0.18)]',
          replacement
            ? 'rounded-[2rem] border border-charcoal/10 bg-cream p-6'
            : 'rounded-[3rem] border border-white/60 bg-[rgba(253,252,240,0.78)] p-8 backdrop-blur-xl'
        )}
      >
        <div className={cn('flex justify-between items-center', replacement ? 'mb-5' : 'mb-8')}>
          <h2
            className="font-heading text-[10px] font-black uppercase tracking-[0.3em] text-terracotta"
            data-testid="recovery-dialog-title"
          >
            {t('home.recoveryFlow', 'Recovery Flow')}
          </h2>
          <button
            disabled={pending}
            onClick={pending ? undefined : onClose}
            data-testid="recovery-close"
            aria-label={t('common.close', 'Close')}
            title={t('common.close', 'Close')}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-charcoal/5 text-charcoal/70 hover:bg-charcoal/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta disabled:opacity-40 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="relative overflow-hidden" aria-busy={pending}>
          {pending && !replacement && (
            <p role="status" className="text-sm text-charcoal">
              {t('planning.replacement.movingTitle', 'Updating your plan')}
            </p>
          )}
          {replacement ? (
            <div className="flex flex-col gap-5" data-testid="replacement-recovery">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
                    replacement.phase === 'refresh' && !confirmAbandon
                      ? 'bg-sage/15 text-charcoal'
                      : 'bg-terracotta/10 text-terracotta-600'
                  )}
                >
                  <FeedbackIcon
                    size={22}
                    aria-hidden="true"
                    className={pending ? 'animate-spin motion-reduce:animate-none' : undefined}
                  />
                </span>
                <h3 className="font-heading text-2xl font-bold leading-tight tracking-tight text-charcoal">
                  {replacementTitle}
                </h3>
              </div>
              <p
                ref={feedbackRef}
                tabIndex={-1}
                role={pending ? 'status' : 'alert'}
                className="text-sm leading-relaxed text-charcoal/80 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-terracotta"
                data-testid="replacement-feedback"
              >
                {confirmAbandon
                  ? replacement.phase === 'unknown' || replacement.phase === 'disposition_unknown'
                    ? t(
                        'planning.replacement.leaveUnknown',
                        'Some changes are unconfirmed. Leaving will not undo completed changes. Review your plan before trying again.'
                      )
                    : t(
                        'planning.replacement.leaveUnsaved',
                        'Your new meal is not saved. Completed changes to your original meal will remain.'
                      )
                  : replacement.message}
              </p>
              {replacement.original && (
                <p className="text-sm text-charcoal/80">
                  {describeOriginalDisposition(replacement.original)}
                </p>
              )}
              {replacement.recipeName && (
                <div className="flex items-center gap-3 rounded-2xl border border-charcoal/10 bg-white/60 px-4 py-3">
                  <Utensils size={18} className="shrink-0 text-terracotta" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-charcoal/70">
                      {t('planning.replacement.newMeal', 'Your new meal')}
                    </p>
                    <p className="mt-0.5 break-words font-heading text-base font-semibold text-charcoal">
                      {replacement.recipeName}
                    </p>
                  </div>
                </div>
              )}
              {confirmAbandon ? (
                <>
                  <Button
                    key="keep-editing"
                    autoFocus
                    onClick={onCancelAbandon}
                    data-testid="recovery-keep-editing"
                  >
                    {t('planning.replacement.keepEditing', 'Keep editing')}
                  </Button>
                  <Button variant="secondary" onClick={onAbandon} data-testid="recovery-abandon">
                    {t('planning.replacement.leave', 'Leave replacement')}
                  </Button>
                </>
              ) : (
                !pending && (
                  <>
                    {['retry', 'unknown', 'refresh', 'disposition_unknown'].includes(
                      replacement.phase
                    ) && (
                      <Button
                        onClick={onRetryReplacement}
                        data-testid={
                          replacement.phase === 'retry'
                            ? 'recovery-retry-save'
                            : 'recovery-retry-check'
                        }
                      >
                        {replacement.phase === 'retry'
                          ? t('planning.replacement.retrySave', 'Retry save')
                          : replacement.phase === 'refresh'
                            ? t('planning.replacement.refreshPlan', 'Refresh plan')
                            : t('planning.replacement.retryCheck', 'Retry check')}
                      </Button>
                    )}
                    {['conflict', 'disposition_unknown'].includes(replacement.phase) && (
                      <Button onClick={onReviewPlan} data-testid="recovery-review-plan">
                        {t('planning.replacement.review', 'Review plan')}
                      </Button>
                    )}
                  </>
                )
              )}
            </div>
          ) : (
            <AnimatePresence initial={false} mode="wait">
              {step === 1 ? (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col gap-6"
                >
                  <div className="flex flex-col gap-2">
                    <h3 className="text-3xl font-heading font-black text-charcoal leading-none tracking-tighter">
                      {t('home.backupPlanTitle', "What's the backup plan?")}
                    </h3>
                    <p className="text-sm text-charcoal/40 font-medium">
                      {t(
                        'home.backupPlanSubtitle',
                        'Plans changed. We get it. What are we eating instead?'
                      )}
                    </p>
                  </div>

                  <div className="grid gap-3">
                    <button
                      disabled={pending}
                      onClick={() => {
                        onAction('order_in');
                      }}
                      data-testid="recovery-action-order-in"
                      className="flex w-full items-center gap-4 p-5 rounded-[2rem] border-2 border-charcoal/5 hover:border-terracotta/30 hover:bg-terracotta/5 transition-all text-left group"
                    >
                      <div className="h-14 w-14 rounded-2xl bg-terracotta/10 text-terracotta-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <NonCookingIcon kind="order_in" size={28} />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col items-start text-left">
                        <span className="font-heading text-xl font-black text-charcoal tracking-tight">
                          {t('home.orderingIn', 'Take Out')}
                        </span>
                        <span className="text-xs font-medium leading-snug text-charcoal/70">
                          {t('home.takeoutOrDelivery', 'Takeout or delivery')}
                        </span>
                      </div>
                    </button>

                    <button
                      disabled={pending}
                      onClick={() => {
                        onAction('pick_else');
                      }}
                      data-testid="recovery-action-pick-else"
                      className="flex w-full items-center gap-4 p-5 rounded-[2rem] border-2 border-charcoal/5 hover:border-sage/30 hover:bg-sage/5 transition-all text-left group"
                    >
                      <div className="h-14 w-14 rounded-2xl bg-sage/10 text-sage flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Utensils size={28} />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col items-start text-left">
                        <span className="font-heading text-xl font-black text-charcoal tracking-tight">
                          {t('home.pickSomethingElse', 'Suggestions')}
                        </span>
                        <span className="text-xs font-medium leading-snug text-charcoal/70">
                          {t('home.searchRecipes', 'Browse up to 5 recipe suggestions')}
                        </span>
                      </div>
                    </button>
                    <button
                      disabled={pending}
                      onClick={() => onAction('search')}
                      data-testid="recovery-action-search"
                      className="flex w-full items-center gap-4 rounded-[2rem] border-2 border-charcoal/5 p-5 text-left transition-all hover:border-terracotta/30 hover:bg-terracotta/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-charcoal"
                    >
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-terracotta/10 text-terracotta-600">
                        <Search size={28} aria-hidden="true" />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col items-start text-left">
                        <span className="font-heading text-xl font-black tracking-tight text-charcoal">
                          {t('home.searchChoice', 'Search')}
                        </span>
                        <span className="text-xs font-medium leading-snug text-charcoal/70">
                          {t('home.searchChoiceDescription', 'Find a recipe in your library')}
                        </span>
                      </div>
                    </button>
                    {searchError && (
                      <div
                        role="alert"
                        className="rounded-2xl bg-terracotta/10 p-4 text-sm text-charcoal"
                      >
                        <p>{searchError}</p>
                        <button
                          type="button"
                          onClick={onRetrySearch}
                          className="mt-2 min-h-12 font-semibold text-terracotta-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-charcoal"
                        >
                          {t('errors.tryAgain', 'Try again')}
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col gap-6"
                >
                  <div className="flex flex-col gap-2">
                    <h3 className="text-3xl font-heading font-black text-charcoal leading-none tracking-tighter">
                      {source
                        ? tWithVars(
                            'planning.replacement.originalTitle',
                            'What about {{recipe}} on {{date}}?',
                            { recipe: source.recipe?.name ?? '', date: sourceDate }
                          )
                        : t('home.tonightRecipeTitle', "What about tonight's recipe?")}
                    </h3>
                    <p className="text-sm text-charcoal/40 font-medium">
                      {t(
                        'planning.replacement.chooseDisposition',
                        'Choose where to keep the original meal before saving your new recipe.'
                      )}
                    </p>
                  </div>

                  <div className="grid gap-3">
                    <button
                      disabled={pending}
                      onClick={() => onAction('tomorrow')}
                      data-testid="recovery-action-tomorrow"
                      className="flex w-full items-center justify-between p-5 rounded-[2rem] border-2 border-charcoal/5 hover:border-terracotta/30 hover:bg-terracotta/5 transition-all text-left group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-terracotta/10 text-terracotta-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <ArrowRight size={24} />
                        </div>
                        <div className="flex flex-col items-start text-left">
                          <span className="font-heading text-lg font-black text-charcoal tracking-tight">
                            {source
                              ? tWithVars('planning.replacement.moveDate', 'Move to {{date}}', {
                                  date: followingDate,
                                })
                              : t('home.moveTomorrow', 'Move to Tomorrow')}
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-charcoal/30">
                            {t(
                              'planning.replacement.tomorrowConsequence',
                              'Moves following meals forward as needed'
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-charcoal/5 flex items-center justify-center text-charcoal/20 group-hover:bg-terracotta/10 group-hover:text-terracotta-600 transition-colors">
                        <Calendar size={16} />
                      </div>
                    </button>

                    <button
                      disabled={pending}
                      onClick={() => onAction('next_week')}
                      data-testid="recovery-action-next-week"
                      className="flex w-full items-center justify-between p-5 rounded-[2rem] border-2 border-charcoal/5 hover:border-sage/30 hover:bg-sage/5 transition-all text-left group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-sage/10 text-sage flex items-center justify-center group-hover:scale-110 transition-transform">
                          <RefreshCw size={24} />
                        </div>
                        <div className="flex flex-col items-start text-left">
                          <span className="font-heading text-lg font-black text-charcoal tracking-tight">
                            {t('home.saveForNextWeek', 'Save for Next Week')}
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-charcoal/30">
                            {t(
                              'planning.replacement.nextWeekConsequence',
                              'First open day from the following week; later if full'
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-charcoal/5 flex items-center justify-center text-charcoal/20 group-hover:bg-sage/10 group-hover:text-sage transition-colors">
                        <RefreshCw size={16} />
                      </div>
                    </button>

                    <button
                      disabled={pending}
                      onClick={() => onAction('drop')}
                      data-testid="recovery-action-drop"
                      className="flex w-full items-center gap-4 p-5 rounded-[2rem] border-2 border-charcoal/5 hover:border-charcoal/20 hover:bg-charcoal/5 transition-all text-left group"
                    >
                      <div className="h-12 w-12 rounded-2xl bg-charcoal/5 text-charcoal/40 flex items-center justify-center group-hover:text-charcoal/60 transition-colors">
                        <Trash2 size={24} />
                      </div>
                      <div className="flex flex-col items-start text-left">
                        <span className="font-heading text-lg font-black text-charcoal tracking-tight">
                          {source
                            ? tWithVars('planning.replacement.removeDate', 'Remove from {{date}}', {
                                date: sourceDate,
                              })
                            : t('home.dropTonight', 'Just Drop Tonight')}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-charcoal/30">
                          {t(
                            'planning.replacement.dropConsequence',
                            'Keeps the recipe in your library'
                          )}
                        </span>
                      </div>
                    </button>
                  </div>

                  <button
                    disabled={pending}
                    onClick={pending ? undefined : onBack}
                    className="mt-4 text-xs font-black uppercase tracking-widest text-charcoal/30 hover:text-charcoal/60 transition-colors"
                  >
                    {t('home.goBack', 'Go back')}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </motion.div>
    </div>
  );
}
