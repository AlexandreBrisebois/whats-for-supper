'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import type { NonCookingPlanDto } from '@/lib/api/generated/models';
import { t } from '@/locales';
import { X, Check } from 'lucide-react';
import { NonCookingIcon } from './NonCookingIcon';
import { formatSupperPlanDate } from '@/lib/planner/nonCooking';

interface Props {
  date: string;
  plan?: NonCookingPlanDto | null;
  onSave: (plan: NonCookingPlanDto) => Promise<void>;
  onClear?: () => Promise<void>;
  onClose: () => void;
}

export function NonCookingDaySheet({ date, plan, onSave, onClear, onClose }: Props) {
  const [kind, setKind] = useState(plan?.kind ?? 'order_in');
  const [message, setMessage] = useState(plan?.customLabel ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  const panel = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const inputId = useId();
  const dateId = useId();
  const errorId = useId();
  const hintId = useId();

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    close.current?.focus();
    return () => {
      if (previous?.isConnected) previous.focus();
      else document.querySelector<HTMLElement>(`[data-date="${date}"] button`)?.focus();
    };
  }, [date]);
  useEffect(() => {
    if (kind === 'custom') input.current?.focus();
  }, [kind]);

  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && !busy) onClose();
    if (event.key !== 'Tab') return;
    const controls = panel.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled)'
    );
    if (!controls?.length) return;
    const first = controls[0],
      last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  async function submit(clear = false) {
    if (submitting.current) return;
    const label = message.trim();
    if (!clear && kind === 'custom' && (!label || Array.from(label).length > 80)) {
      setError(t('planner.nonCookingInvalid', 'Enter a message with 1–80 characters.'));
      input.current?.focus();
      return;
    }
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      if (clear) await onClear?.();
      else await onSave({ kind, customLabel: kind === 'custom' ? label : null });
    } catch (failure) {
      const status = (failure as { responseStatusCode?: number })?.responseStatusCode;
      setError(
        status === 409
          ? t(
              'planner.nonCookingConflict',
              'This day’s plan changed. Review it before trying again.'
            )
          : t('planner.nonCookingSaveError', 'Could not save this plan. Try again.')
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center px-4 py-6 sm:items-center"
      onKeyDown={keyDown}
    >
      <div
        className="absolute inset-0 bg-cream/55 backdrop-blur-xl"
        onClick={() => {
          if (!busy) onClose();
        }}
        aria-hidden="true"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${titleId} ${dateId}`}
        aria-busy={busy}
        data-testid="non-cooking-sheet"
        className="relative w-full max-w-sm max-h-[calc(100dvh-3rem)] overflow-y-auto rounded-[3rem] border border-white/60 bg-cream/90 p-6 sm:p-8 shadow-[0_24px_60px_-16px_rgba(74,55,40,0.18)] backdrop-blur-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <time
              id={dateId}
              dateTime={date}
              className="block mb-3 text-xs font-bold text-terracotta-700"
            >
              {formatSupperPlanDate(date)}
            </time>
            <h2
              id={titleId}
              className="font-heading text-3xl font-black tracking-tight leading-tight text-charcoal"
            >
              {t('planner.supperPlanTitle', 'What’s the supper plan?')}
            </h2>
          </div>
          <button
            ref={close}
            disabled={busy}
            onClick={onClose}
            aria-label={t('common.close', 'Close')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-charcoal/5 text-charcoal/70 hover:bg-charcoal/10 focus-visible:outline-2 focus-visible:outline-terracotta disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>
        <div
          className="my-6 grid grid-cols-1 gap-3"
          role="group"
          aria-label={t('planner.nonCookingChoice', 'Supper plan')}
        >
          {(
            [
              ['order_in', t('home.orderingIn', 'Order In'), 'non-cooking-order-in'],
              ['eating_out', t('planner.eatingOut', 'Eating out'), 'non-cooking-eating-out'],
              ['custom', t('planner.otherPlans', 'Other plans'), 'non-cooking-other-plans'],
            ] as const
          ).map(([value, label, testId]) => (
            <button
              key={value}
              disabled={busy}
              aria-pressed={kind === value}
              data-testid={testId}
              onClick={() => {
                setKind(value);
                setError(null);
              }}
              className={`flex w-full items-center gap-3 rounded-[1.5rem] border-2 p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-terracotta disabled:opacity-50 ${kind === value ? 'border-sage/40 bg-sage/10 text-charcoal' : 'border-charcoal/5 text-charcoal hover:border-sage/30 hover:bg-sage/5'}`}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sage/10 text-sage-700">
                <NonCookingIcon kind={value} />
              </span>
              <span className="flex-1 font-heading text-lg font-bold">{label}</span>
              {kind === value && (
                <Check size={20} aria-hidden="true" className="shrink-0 text-sage-700" />
              )}
            </button>
          ))}
        </div>
        {kind === 'custom' && (
          <div className="mb-4">
            <label htmlFor={inputId} className="block text-sm font-bold text-charcoal">
              {t('planner.nonCookingMessage', 'What’s the plan?')}
            </label>
            <input
              ref={input}
              id={inputId}
              value={message}
              disabled={busy}
              onChange={(event) => setMessage(event.target.value)}
              data-testid="non-cooking-custom-label"
              className="mt-2 w-full rounded-2xl border-2 border-charcoal/10 bg-white/70 p-4 text-base text-charcoal focus:border-terracotta/50 focus:outline-none focus:ring-2 focus:ring-terracotta/15"
              aria-invalid={!!error}
              aria-describedby={error ? `${hintId} ${errorId}` : hintId}
            />
            <p id={hintId} className="mt-2 text-xs text-charcoal/70">
              {t('planner.nonCookingExamples', 'Supper at Grandma’s · Emma’s birthday supper')}
            </p>
          </div>
        )}
        {error && (
          <p id={errorId} role="alert" className="mb-4 text-sm text-terracotta">
            {error}
          </p>
        )}
        <div className="flex flex-col gap-2">
          <button
            disabled={busy}
            onClick={() => submit()}
            data-testid="non-cooking-save"
            className="w-full min-h-12 rounded-2xl bg-terracotta-600 px-4 py-3 font-bold text-white hover:bg-terracotta-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta disabled:opacity-50"
          >
            {busy ? t('planner.savingPlan', 'Saving…') : t('planner.savePlan', 'Save plan')}
          </button>
          <button
            disabled={busy}
            onClick={onClose}
            className="min-h-11 rounded-2xl px-4 py-3 font-bold text-charcoal/70 hover:bg-charcoal/5 disabled:opacity-50"
          >
            {t('common.cancel', 'Cancel')}
          </button>
        </div>
        {onClear && (
          <button
            disabled={busy}
            onClick={() => submit(true)}
            data-testid="non-cooking-clear"
            className="mt-4 min-h-11 w-full border-t border-charcoal/10 px-4 pt-4 pb-2 text-sm font-bold text-charcoal/70 hover:text-terracotta-700 disabled:opacity-50"
          >
            {t('planner.clearDay', 'Clear day')}
          </button>
        )}
      </div>
    </div>
  );
}
