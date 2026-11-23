'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { NonCookingPlanDto } from '@/lib/api/generated/models';
import { t } from '@/locales';
import { Check } from 'lucide-react';
import { NonCookingIcon } from './NonCookingIcon';
import { PivotSheetShell } from '@/components/ui/PivotSheetShell';
import { formatSupperPlanDate } from '@/lib/planner/nonCooking';
import { cn } from '@/lib/utils';

interface Props {
  date: string;
  plan?: NonCookingPlanDto | null;
  onSave: (plan: NonCookingPlanDto) => Promise<void>;
  onClear?: () => Promise<void>;
  onBack?: () => void;
  onClose: () => void;
}

export function NonCookingDaySheet({ date, plan, onSave, onClear, onBack, onClose }: Props) {
  const [kind, setKind] = useState(plan?.kind ?? 'mystery');
  const [message, setMessage] = useState(plan?.customLabel ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const titleId = useId();
  const inputId = useId();
  const dateId = useId();
  const errorId = useId();
  const hintId = useId();

  useEffect(() => {
    if (kind === 'custom') input.current?.focus();
  }, [kind]);

  async function submit(clear = false) {
    if (submitting.current) return;
    const label = message.trim();
    if (
      !clear &&
      kind !== 'mystery' &&
      ((kind === 'custom' && !label) || Array.from(label).length > 80)
    ) {
      setError(t('planner.nonCookingInvalid', 'Enter a message with 1–80 characters.'));
      input.current?.focus();
      return;
    }
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      if (clear) await onClear?.();
      else await onSave({ kind, customLabel: kind === 'mystery' ? null : label || null });
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
    <PivotSheetShell
      eyebrow={t('planner.noCooking', 'Other plans')}
      subtitle={<time dateTime={date}>{formatSupperPlanDate(date)}</time>}
      subtitleId={dateId}
      ariaLabelledBy={`${titleId} ${dateId}`}
      onBack={onBack}
      backLabel={t('common.back', 'Back')}
      backTestId="non-cooking-back"
      onClose={onClose}
      closeTestId="non-cooking-close"
      panelTestId="non-cooking-sheet"
      pending={busy}
      trapFocus
      restoreFocusSelector={`[data-date="${date}"] button`}
      zIndexClass="z-[80]"
    >
      <h3
        id={titleId}
        className="font-heading text-xl font-extrabold leading-tight tracking-tight text-ink-body"
      >
        {t('planner.supperPlanTitle', 'What’s the plan?')}
      </h3>

      <div
        className="my-3 grid grid-cols-1 gap-2"
        role="group"
        aria-label={t('planner.nonCookingChoice', 'Supper plan')}
      >
        {(
          [
            ['mystery', t('planner.mysteryNight', 'Mystery night'), 'non-cooking-mystery'],
            ['order_in', t('home.orderingIn', 'Take Out'), 'non-cooking-order-in'],
            ['eating_out', t('planner.eatingOut', 'Eating out'), 'non-cooking-eating-out'],
            ['custom', t('planner.otherPlans', 'We made plans'), 'non-cooking-other-plans'],
          ] as const
        ).map(([value, label, testId]) => {
          const selected = kind === value;
          return (
            <button
              key={value}
              type="button"
              disabled={busy}
              aria-pressed={selected}
              data-testid={testId}
              onClick={() => {
                setKind(value);
                setError(null);
              }}
              className={cn(
                'flex min-h-12 min-w-0 w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body disabled:opacity-50',
                selected
                  ? 'border-[1.5px] border-garden-line bg-sage-50 text-ink-body'
                  : 'border-chrome-line bg-white text-ink-body hover:border-garden-line hover:bg-sage-50'
              )}
            >
              <span
                className={cn(
                  'flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-xl text-garden-ink',
                  selected ? 'bg-white' : 'bg-sage-50'
                )}
              >
                <NonCookingIcon kind={value} size={18} />
              </span>
              <span
                className={cn(
                  'min-w-0 flex-1 break-words [overflow-wrap:anywhere] font-heading text-[15px] leading-tight',
                  selected ? 'font-extrabold' : 'font-bold'
                )}
              >
                {label}
              </span>
              {selected && (
                <Check size={18} aria-hidden="true" className="shrink-0 text-garden-ink" />
              )}
            </button>
          );
        })}
      </div>

      {kind !== 'mystery' && (
        <div className="mb-3">
          <label htmlFor={inputId} className="block text-xs font-bold text-ink-body">
            {t('planner.nonCookingMessage', 'Tell the family the plan')}
          </label>
          <textarea
            rows={2}
            ref={input}
            id={inputId}
            value={message}
            disabled={busy}
            onChange={(event) => setMessage(event.target.value)}
            data-testid="non-cooking-custom-label"
            className="mt-1.5 w-full rounded-2xl border border-chrome-line bg-white px-3.5 py-2.5 text-base leading-snug text-ink-body focus:border-hearth-line focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body disabled:opacity-50"
            aria-invalid={!!error}
            aria-describedby={error ? `${hintId} ${errorId}` : hintId}
          />
          <p id={hintId} className="mt-1 text-xs text-ink-muted">
            {t('planner.nonCookingExamples', 'Supper at Grandma’s · Emma’s birthday supper')}
          </p>
        </div>
      )}

      {error && (
        <p id={errorId} role="alert" className="mb-3 text-xs font-medium text-hearth-ink">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => submit()}
          data-testid="non-cooking-save"
          className="min-h-12 w-full rounded-2xl bg-hearth-fill px-4 py-3 text-base font-bold text-cream-100 transition-colors motion-reduce:transition-none hover:bg-hearth-fill-hover active:bg-hearth-fill-active focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body disabled:opacity-50"
        >
          {busy ? t('planner.savingPlan', 'Saving…') : t('common.save', 'Save')}
        </button>
        {onClear && (
          <button
            type="button"
            disabled={busy}
            onClick={() => submit(true)}
            data-testid="non-cooking-clear"
            className="min-h-12 w-full rounded-2xl border border-chrome-line bg-white px-4 py-3 text-sm font-bold text-ink-body transition-colors hover:bg-charcoal-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body disabled:opacity-50"
          >
            {t('planner.clearDay', 'Remove supper plan')}
          </button>
        )}
      </div>
    </PivotSheetShell>
  );
}
