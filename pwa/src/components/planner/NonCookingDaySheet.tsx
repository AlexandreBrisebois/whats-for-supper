'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import type { NonCookingPlanDto } from '@/lib/api/generated/models';
import { t } from '@/locales';
import { X } from 'lucide-react';

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
      className="fixed inset-0 z-[80] flex items-end justify-center p-6 sm:items-center"
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
        aria-labelledby={titleId}
        data-testid="non-cooking-sheet"
        className="relative w-full max-w-sm rounded-[2rem] border border-white/60 bg-cream p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="font-heading text-xl font-bold text-charcoal">
            {t('planner.noCooking', 'No cooking')} · {date}
          </h2>
          <button
            ref={close}
            disabled={busy}
            onClick={onClose}
            aria-label={t('common.close', 'Close')}
            className="rounded-full p-2"
          >
            <X size={20} />
          </button>
        </div>
        <div
          className="my-5 flex flex-wrap gap-2"
          role="group"
          aria-label={t('planner.nonCookingChoice', 'Supper plan')}
        >
          {(
            [
              ['order_in', t('home.orderingIn', 'Ordering In'), 'non-cooking-order-in'],
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
              className={`rounded-full px-4 py-3 text-sm font-bold ${kind === value ? 'bg-terracotta text-white' : 'bg-charcoal/5 text-charcoal'}`}
            >
              {label}
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
              className="mt-2 w-full rounded-xl border border-charcoal/20 bg-white p-3 text-charcoal"
              aria-invalid={!!error}
            />
            <p className="mt-2 text-xs text-charcoal/60">
              {t('planner.nonCookingExamples', 'Supper at Grandma’s · Emma’s birthday supper')}
            </p>
          </div>
        )}
        {error && (
          <p role="alert" className="mb-4 text-sm text-terracotta">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            disabled={busy}
            onClick={() => submit()}
            data-testid="non-cooking-save"
            className="flex-1 rounded-xl bg-terracotta px-4 py-3 font-bold text-white disabled:opacity-50"
          >
            {t('common.save', 'Save')}
          </button>
          <button
            disabled={busy}
            onClick={onClose}
            className="rounded-xl bg-charcoal/5 px-4 py-3 font-bold text-charcoal"
          >
            {t('common.cancel', 'Cancel')}
          </button>
        </div>
        {onClear && (
          <button
            disabled={busy}
            onClick={() => submit(true)}
            data-testid="non-cooking-clear"
            className="mt-4 w-full rounded-xl px-4 py-3 text-sm font-bold text-charcoal/60"
          >
            {t('planner.clearDay', 'Clear day')}
          </button>
        )}
      </div>
    </div>
  );
}
