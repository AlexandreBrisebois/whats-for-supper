'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Utensils,
  Search,
  RefreshCw,
  ArrowRight,
  Trash2,
  CircleHelp,
  LoaderCircle,
  Check,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { NonCookingIcon } from '../planner/NonCookingIcon';
import { Button } from '@/components/ui/button';
import {
  PivotSheetShell,
  SheetMealContext,
  usePrefersReducedMotion,
} from '@/components/ui/PivotSheetShell';
import { cn } from '@/lib/utils';
import { getLocale, t, tWithVars } from '@/locales';
import type { NonCookingPlanDto } from '@/lib/api/generated/models';

import type { PlannerSlot } from '@/lib/planner/slotAssignment';
import {
  formatShortSupperPlanDate,
  formatSupperPlanDate,
  nonCookingLabel,
} from '@/lib/planner/nonCooking';
import { describeOriginalDisposition } from '@/lib/planner/replacementCopy';
import type { ReplacementFeedback } from '@/lib/planner/replacementSession';
export type { ReplacementFeedback } from '@/lib/planner/replacementSession';

export type SkipRecoveryBackupIntent =
  { kind: 'non_cooking'; nonCooking: NonCookingPlanDto } | { kind: 'pick_else' };

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
  /** Whether Step 2 has a prior Step 1 to return to (false for direct-to-Step-2 Planner/Recipes callers) */
  canGoBack?: boolean;
  /** Active backup intent selected in Step 1 so Step 2 can tailor its prompt subtitle */
  backupIntent?: SkipRecoveryBackupIntent | null;
  searchError?: string | null;
  onRetrySearch?: () => void;
  onClose: () => void;
  onBack: () => void;
  onCustomPlan?: (customLabel: string) => void;
  onAction: (
    action: 'order_in' | 'eating_out' | 'pick_else' | 'search' | 'tomorrow' | 'next_week' | 'drop'
  ) => void;
}

export function SkipRecoveryDialog(props: SkipRecoveryDialogProps) {
  if (!props.isOpen) return null;
  return <SkipRecoveryDialogContent {...props} />;
}

function SkipRecoveryDialogContent({
  pending = false,
  source,
  replacement,
  onRetryReplacement,
  onReviewPlan,
  confirmAbandon,
  onCancelAbandon,
  onAbandon,
  step,
  canGoBack = true,
  backupIntent = null,
  searchError,
  onRetrySearch,
  onClose,
  onBack,
  onCustomPlan,
  onAction,
}: SkipRecoveryDialogProps) {
  const feedbackRef = useRef<HTMLParagraphElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const customInputId = useId();
  const customErrorId = useId();
  const [madePlansOpen, setMadePlansOpen] = useState(false);
  const [customPlanDraft, setCustomPlanDraft] = useState('');
  const [customPlanError, setCustomPlanError] = useState<string | null>(null);

  useEffect(() => {
    if (replacement && !pending && !confirmAbandon) feedbackRef.current?.focus();
  }, [replacement, pending, confirmAbandon]);

  useEffect(() => {
    if (step === 1 && madePlansOpen && !replacement) {
      customInputRef.current?.focus();
    }
  }, [step, madePlansOpen, replacement]);

  const sourceDate = source?.date ? formatSupperPlanDate(source.date) : '';
  const shortSourceDate = source?.date ? formatShortSupperPlanDate(source.date) : '';
  const followingDateIso = source?.date
    ? new Date(Date.parse(`${source.date}T00:00:00Z`) + 86400000).toISOString().slice(0, 10)
    : '';
  const shortFollowingDate = followingDateIso ? formatShortSupperPlanDate(followingDateIso) : '';

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

  const showMultiStepChrome = !replacement && (step === 1 || canGoBack);
  const headerSubtitle = showMultiStepChrome
    ? tWithVars('home.stepOf', 'Step {{current}} of {{total}}', { current: step, total: 2 })
    : undefined;

  const step2Subtitle = (() => {
    if (backupIntent?.kind === 'non_cooking') {
      const plan = backupIntent.nonCooking;
      const planText =
        plan.kind === 'custom' && plan.customLabel
          ? getLocale() === 'fr'
            ? `« ${plan.customLabel} »`
            : `“${plan.customLabel}”`
          : nonCookingLabel(plan);
      return tWithVars(
        'planning.replacement.chooseDispositionNonCooking',
        'Keep or move it before saving {{plan}}.',
        { plan: planText }
      );
    }
    return t(
      'planning.replacement.chooseDisposition',
      'Choose where to keep the original meal before saving your new recipe.'
    );
  })();

  const submitCustomPlan = () => {
    if (pending) return;
    const trimmed = customPlanDraft.trim();
    if (!trimmed || Array.from(trimmed).length > 80) {
      setCustomPlanError(t('planner.nonCookingInvalid', 'Enter a message with 1–80 characters.'));
      customInputRef.current?.focus();
      return;
    }
    setCustomPlanError(null);
    onCustomPlan?.(trimmed);
  };

  return (
    <PivotSheetShell
      eyebrow={t('home.recoveryFlow', 'Plan B')}
      subtitle={headerSubtitle}
      stepProgress={showMultiStepChrome ? { current: step, total: 2 } : undefined}
      onBack={!replacement && step === 2 && canGoBack ? onBack : undefined}
      backLabel={t('common.back', 'Back')}
      backTestId="recovery-go-back"
      onClose={onClose}
      closeTestId="recovery-close"
      titleTestId="recovery-dialog-title"
      panelTestId="recovery-dialog-panel"
      pending={pending}
      consistentMinHeight={showMultiStepChrome}
      zIndexClass="z-[100]"
    >
      <div className="relative" aria-busy={pending}>
        {pending && !replacement && (
          <p role="status" className="mb-2 text-xs font-medium text-ink-body">
            {t('planning.replacement.movingTitle', 'Updating your plan')}
          </p>
        )}
        {replacement ? (
          <div className="flex flex-col gap-4" data-testid="replacement-recovery">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
                  replacement.phase === 'refresh' && !confirmAbandon
                    ? 'bg-sage/15 text-ink-body'
                    : 'bg-terracotta/10 text-hearth-ink'
                )}
              >
                <FeedbackIcon
                  size={22}
                  aria-hidden="true"
                  className={pending ? 'animate-spin motion-reduce:animate-none' : undefined}
                />
              </span>
              <h3 className="font-heading text-xl font-extrabold leading-tight tracking-tight text-ink-body">
                {replacementTitle}
              </h3>
            </div>
            <p
              ref={feedbackRef}
              tabIndex={-1}
              role={pending ? 'status' : 'alert'}
              className="rounded-lg text-sm leading-relaxed text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body"
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
              <div className="flex items-stretch gap-3">
                <span
                  aria-hidden="true"
                  className="w-[3.5px] shrink-0 rounded-full bg-hearth-fill"
                />
                <p className="text-xs font-medium leading-relaxed text-ink-muted">
                  {describeOriginalDisposition(replacement.original)}
                </p>
              </div>
            )}
            {replacement.recipeName && (
              <div className="flex items-center gap-3 rounded-2xl border border-chrome-line bg-white px-4 py-3">
                <Utensils size={18} className="shrink-0 text-hearth-ink" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-ink-muted">
                    {t('planning.replacement.newMeal', 'Your new meal')}
                  </p>
                  <p className="mt-0.5 break-words font-heading text-base font-semibold text-ink-body">
                    {replacement.recipeName}
                  </p>
                </div>
              </div>
            )}
            {confirmAbandon ? (
              <div className="flex flex-col gap-2.5 pt-1">
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
              </div>
            ) : (
              !pending && (
                <div className="flex flex-col gap-2.5 pt-1">
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
                </div>
              )
            )}
          </div>
        ) : (
          <AnimatePresence initial={false} mode="wait">
            {step === 1 ? (
              <motion.div
                key="step1"
                initial={reducedMotion ? false : { opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: -16 }}
                transition={reducedMotion ? { duration: 0 } : undefined}
                className="flex flex-col"
              >
                <div>
                  <h3 className="font-heading text-xl font-extrabold leading-tight tracking-tight text-ink-body">
                    {t('home.backupPlanTitle', 'What’s the backup plan?')}
                  </h3>
                  {!madePlansOpen && (
                    <p className="mt-1 text-xs font-medium text-ink-muted">
                      {t('home.backupPlanSubtitle', 'Plans changed. What are we doing instead?')}
                    </p>
                  )}
                </div>

                <hr className="my-3 border-0 border-t border-chrome-line" />

                <p className="mb-2 text-xs font-semibold text-ink-muted">
                  {t('home.notCookingLane', 'Not cooking tonight')}
                </p>

                <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-3">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => onAction('order_in')}
                    data-testid="recovery-action-order-in"
                    className="flex min-h-[76px] items-center justify-start gap-2.5 rounded-[1.125rem] border border-chrome-line bg-white px-3 py-2.5 text-left transition-colors hover:border-hearth-line hover:bg-terracotta-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body disabled:opacity-40 min-[360px]:flex-col min-[360px]:justify-center min-[360px]:gap-1.5 min-[360px]:px-2 min-[360px]:text-center"
                  >
                    <span className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[0.6875rem] bg-terracotta-50 text-hearth-ink">
                      <NonCookingIcon kind="order_in" size={20} />
                    </span>
                    <span className="min-w-0 break-words [overflow-wrap:anywhere] font-heading text-[13px] font-bold leading-tight text-ink-body">
                      {t('home.orderingIn', 'Take Out')}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => onAction('eating_out')}
                    data-testid="recovery-action-eating-out"
                    className="flex min-h-[76px] items-center justify-start gap-2.5 rounded-[1.125rem] border border-chrome-line bg-white px-3 py-2.5 text-left transition-colors hover:border-garden-line hover:bg-sage-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body disabled:opacity-40 min-[360px]:flex-col min-[360px]:justify-center min-[360px]:gap-1.5 min-[360px]:px-2 min-[360px]:text-center"
                  >
                    <span className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[0.6875rem] bg-sage-50 text-garden-ink">
                      <NonCookingIcon kind="eating_out" size={20} />
                    </span>
                    <span className="min-w-0 break-words [overflow-wrap:anywhere] font-heading text-[13px] font-bold leading-tight text-ink-body">
                      {t('planner.eatingOut', 'Eating out')}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={pending}
                    aria-pressed={madePlansOpen}
                    onClick={() => {
                      setMadePlansOpen((prev) => !prev);
                      setCustomPlanError(null);
                    }}
                    data-testid="recovery-action-made-plans"
                    className={cn(
                      'relative flex min-h-[76px] items-center justify-start gap-2.5 rounded-[1.125rem] px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body disabled:opacity-40 min-[360px]:flex-col min-[360px]:justify-center min-[360px]:gap-1.5 min-[360px]:px-2 min-[360px]:text-center',
                      madePlansOpen
                        ? 'border-2 border-garden-ink bg-sage-50'
                        : 'border border-chrome-line bg-white hover:border-garden-line hover:bg-sage-50'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[0.6875rem] text-garden-ink',
                        madePlansOpen ? 'bg-white' : 'bg-sage-50'
                      )}
                    >
                      <NonCookingIcon kind="custom" size={20} />
                    </span>
                    <span
                      className={cn(
                        'min-w-0 break-words [overflow-wrap:anywhere] font-heading text-[13px] leading-tight text-ink-body',
                        madePlansOpen ? 'font-extrabold' : 'font-bold'
                      )}
                    >
                      {t('home.madePlans', 'Made plans')}
                    </span>
                    {madePlansOpen && (
                      <span
                        aria-hidden="true"
                        className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-garden-fill text-white"
                      >
                        <Check size={11} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                </div>

                {madePlansOpen && (
                  <div className="mt-2.5 rounded-[1.125rem] border border-garden-line bg-white p-3">
                    <label
                      htmlFor={customInputId}
                      className="mb-2 block text-xs font-bold text-ink-body"
                    >
                      {t('planner.nonCookingMessage', 'Tell the family the plan')}
                    </label>
                    <div className="flex flex-wrap items-stretch gap-2 min-[360px]:flex-nowrap">
                      <input
                        ref={customInputRef}
                        id={customInputId}
                        type="text"
                        value={customPlanDraft}
                        disabled={pending}
                        onChange={(event) => {
                          setCustomPlanDraft(event.target.value);
                          if (customPlanError) setCustomPlanError(null);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            submitCustomPlan();
                          }
                        }}
                        placeholder={t('home.madePlansPlaceholder', 'Supper at Grandma’s')}
                        data-testid="recovery-custom-plan-input"
                        aria-invalid={!!customPlanError}
                        aria-describedby={customPlanError ? customErrorId : undefined}
                        className="min-h-12 min-w-0 flex-1 rounded-xl border border-chrome-line bg-cream px-3 py-2 text-sm text-ink-body placeholder:text-ink-muted focus:border-hearth-line focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body disabled:opacity-40"
                      />
                      <button
                        type="button"
                        disabled={pending}
                        onClick={submitCustomPlan}
                        data-testid="recovery-custom-plan-next"
                        className="inline-flex min-h-12 shrink-0 items-center justify-center gap-1 rounded-xl bg-hearth-fill px-3.5 text-sm font-bold text-cream-100 transition-colors motion-reduce:transition-none hover:bg-hearth-fill-hover active:bg-hearth-fill-active focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body disabled:opacity-40"
                      >
                        <span>{t('buttons.next', 'Next')}</span>
                        <ArrowRight size={15} aria-hidden="true" />
                      </button>
                    </div>
                    {customPlanError && (
                      <p
                        id={customErrorId}
                        role="alert"
                        className="mt-1.5 text-xs font-medium text-hearth-ink"
                      >
                        {customPlanError}
                      </p>
                    )}
                  </div>
                )}

                <p className="mb-2 mt-3.5 text-xs font-semibold text-ink-muted">
                  {t('home.cookSomethingElseLane', 'Cook something else')}
                </p>

                <div className="grid gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => onAction('pick_else')}
                    data-testid="recovery-action-pick-else"
                    className="flex min-h-[64px] w-full items-center gap-3 rounded-[1.25rem] border border-chrome-line bg-white px-3.5 py-2.5 text-left transition-colors hover:border-sunlight-line hover:bg-ochre-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body disabled:opacity-40"
                  >
                    <span className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-xl bg-ochre-100 text-sunlight-ink">
                      <Sparkles size={20} aria-hidden="true" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col items-start text-left [overflow-wrap:anywhere]">
                      <span className="font-heading text-[15px] font-extrabold leading-tight tracking-tight text-ink-body">
                        {t('home.pickSomethingElse', 'Suggestions')}
                      </span>{' '}
                      <span className="mt-0.5 text-xs font-medium leading-snug text-ink-muted">
                        {t('home.searchRecipes', 'Browse up to 5 recipe suggestions')}
                      </span>
                    </span>
                    <ChevronRight
                      size={18}
                      aria-hidden="true"
                      className="shrink-0 text-icon-affordance"
                    />
                  </button>

                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => onAction('search')}
                    data-testid="recovery-action-search"
                    className="flex min-h-[64px] w-full items-center gap-3 rounded-[1.25rem] border border-chrome-line bg-white px-3.5 py-2.5 text-left transition-colors hover:border-hearth-line hover:bg-terracotta-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body disabled:opacity-40"
                  >
                    <span className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-xl bg-terracotta-50 text-hearth-ink">
                      <Search size={20} aria-hidden="true" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col items-start text-left [overflow-wrap:anywhere]">
                      <span className="font-heading text-[15px] font-extrabold leading-tight tracking-tight text-ink-body">
                        {t('home.searchChoice', 'Search')}
                      </span>{' '}
                      <span className="mt-0.5 text-xs font-medium leading-snug text-ink-muted">
                        {t('home.searchChoiceDescription', 'Find a recipe in your library')}
                      </span>
                    </span>
                    <ChevronRight
                      size={18}
                      aria-hidden="true"
                      className="shrink-0 text-icon-affordance"
                    />
                  </button>

                  {searchError && (
                    <div
                      role="alert"
                      className="rounded-2xl border border-hearth-line bg-terracotta-50 p-3.5 text-xs text-ink-body"
                    >
                      <p>{searchError}</p>
                      <button
                        type="button"
                        onClick={onRetrySearch}
                        className="mt-1.5 min-h-12 font-semibold text-hearth-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body"
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
                initial={reducedMotion ? false : { opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: -16 }}
                transition={reducedMotion ? { duration: 0 } : undefined}
                className="flex flex-col"
              >
                <SheetMealContext
                  testId="recovery-meal-context"
                  eyebrow={
                    sourceDate
                      ? `${t('home.originalMeal', 'Original meal')} · ${sourceDate}`
                      : t('home.originalMeal', 'Original meal')
                  }
                  title={
                    source?.recipe?.name ||
                    t('home.tonightRecipeTitle', "What about tonight's recipe?")
                  }
                  subtitle={step2Subtitle}
                />

                <div className="grid gap-2.5">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => onAction('tomorrow')}
                    data-testid="recovery-action-tomorrow"
                    className="flex min-h-[68px] w-full items-center gap-3 rounded-[1.25rem] border-[1.5px] border-hearth-line bg-terracotta-50 px-3.5 py-3 text-left transition-colors hover:bg-terracotta-100/70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body disabled:opacity-40"
                  >
                    <span className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[0.875rem] bg-hearth-fill text-cream-100">
                      <ArrowRight size={20} aria-hidden="true" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col items-start text-left [overflow-wrap:anywhere]">
                      <span className="font-heading text-[15px] font-extrabold leading-tight tracking-tight text-ink-body">
                        {source
                          ? tWithVars('planning.replacement.moveDate', 'Move to {{date}}', {
                              date: shortFollowingDate,
                            })
                          : t('home.moveTomorrow', 'Move to Tomorrow')}
                      </span>{' '}
                      <span className="mt-0.5 text-xs font-medium leading-snug text-ink-muted">
                        {t(
                          'planning.replacement.tomorrowConsequence',
                          'Moves following meals forward as needed'
                        )}
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => onAction('next_week')}
                    data-testid="recovery-action-next-week"
                    className="flex min-h-[68px] w-full items-center gap-3 rounded-[1.25rem] border border-chrome-line bg-white px-3.5 py-3 text-left transition-colors hover:border-garden-line hover:bg-sage-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body disabled:opacity-40"
                  >
                    <span className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[0.875rem] bg-sage-50 text-garden-ink">
                      <RefreshCw size={20} aria-hidden="true" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col items-start text-left [overflow-wrap:anywhere]">
                      <span className="font-heading text-[15px] font-extrabold leading-tight tracking-tight text-ink-body">
                        {t('home.saveForNextWeek', 'Save for Next Week')}
                      </span>{' '}
                      <span className="mt-0.5 text-xs font-medium leading-snug text-ink-muted">
                        {t(
                          'planning.replacement.nextWeekConsequence',
                          'First open day from the following week; later if full'
                        )}
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => onAction('drop')}
                    data-testid="recovery-action-drop"
                    className="flex min-h-[68px] w-full items-center gap-3 rounded-[1.25rem] border border-chrome-line bg-white px-3.5 py-3 text-left transition-colors hover:bg-charcoal-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body disabled:opacity-40"
                  >
                    <span className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[0.875rem] bg-charcoal-100 text-ink-muted">
                      <Trash2 size={20} aria-hidden="true" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col items-start text-left [overflow-wrap:anywhere]">
                      <span className="font-heading text-[15px] font-extrabold leading-tight tracking-tight text-ink-body">
                        {source
                          ? tWithVars('planning.replacement.removeDate', 'Remove from {{date}}', {
                              date: shortSourceDate,
                            })
                          : t('home.dropTonight', 'Just Drop Tonight')}
                      </span>{' '}
                      <span className="mt-0.5 text-xs font-medium leading-snug text-ink-muted">
                        {t(
                          'planning.replacement.dropConsequence',
                          'Keeps the recipe in your library'
                        )}
                      </span>
                    </span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </PivotSheetShell>
  );
}
