'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Minus, Plus } from 'lucide-react';
import { t } from '@/locales';
import { Button } from '@/components/ui/button';
import {
  DEFAULT_QUICK_VOTES_SETTINGS,
  DEFAULT_QUICK_VOTES_TARGET_LIKES,
  type QuickVotesSettings,
  readQuickVotesSettings,
  saveQuickVotesSettings,
} from '@/lib/api/quick-votes';

const AUTO_SAVE_DEBOUNCE_MS = 450;

function parseTargetText(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : null;
}

export function QuickVotesSettingsSection() {
  const [saved, setSaved] = useState<QuickVotesSettings>(DEFAULT_QUICK_VOTES_SETTINGS);
  const [enabled, setEnabled] = useState(false);
  const [targetText, setTargetText] = useState(String(DEFAULT_QUICK_VOTES_TARGET_LIKES));
  const [reading, setReading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMode, setErrorMode] = useState<'load' | 'save' | null>(null);
  const [failedSettings, setFailedSettings] = useState<QuickVotesSettings | null>(null);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  const headingId = useId();
  const subtitleId = useId();
  const targetInputId = useId();
  const validationErrorId = useId();
  const howItWorksId = useId();

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const requestSeqRef = useRef(0);
  const latestTargetTextRef = useRef(targetText);

  useEffect(() => {
    latestTargetTextRef.current = targetText;
  }, [targetText]);

  const clearDebounce = useCallback(() => {
    if (debounceTimer.current !== null) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
  }, []);

  const applyReadResult = useCallback((seq: number, result: QuickVotesSettings) => {
    if (!mountedRef.current || seq !== requestSeqRef.current) return;
    setSaved(result);
    setEnabled(result.enabled);
    const nextText = String(result.targetLikes);
    latestTargetTextRef.current = nextText;
    setTargetText(nextText);
    setErrorMode(null);
    setFailedSettings(null);
  }, []);

  const reloadSettings = useCallback(() => {
    const seq = ++requestSeqRef.current;
    setReading(true);
    setErrorMode(null);
    setFailedSettings(null);
    readQuickVotesSettings()
      .then((result) => applyReadResult(seq, result))
      .catch(() => {
        if (!mountedRef.current || seq !== requestSeqRef.current) return;
        setErrorMode('load');
      })
      .finally(() => {
        if (mountedRef.current && seq === requestSeqRef.current) {
          setReading(false);
        }
      });
  }, [applyReadResult]);

  useEffect(() => {
    mountedRef.current = true;
    const seq = ++requestSeqRef.current;
    readQuickVotesSettings()
      .then((result) => applyReadResult(seq, result))
      .catch(() => {
        if (!mountedRef.current || seq !== requestSeqRef.current) return;
        setErrorMode('load');
      })
      .finally(() => {
        if (mountedRef.current && seq === requestSeqRef.current) {
          setReading(false);
        }
      });
    return () => {
      mountedRef.current = false;
      clearDebounce();
    };
  }, [applyReadResult, clearDebounce]);

  const parsedTarget = parseTargetText(targetText);
  const isTargetInvalid = enabled && parsedTarget === null;

  const commitSave = useCallback(
    async (next: QuickVotesSettings) => {
      const seq = ++requestSeqRef.current;
      setSaving(true);
      setErrorMode(null);
      setFailedSettings(null);
      try {
        const persisted = await saveQuickVotesSettings(next);
        if (!mountedRef.current || seq !== requestSeqRef.current) return;
        setSaved(persisted);
        setEnabled(persisted.enabled);
        if (latestTargetTextRef.current === String(next.targetLikes)) {
          setTargetText(String(persisted.targetLikes));
        }
      } catch {
        if (!mountedRef.current || seq !== requestSeqRef.current) return;
        setErrorMode('save');
        setFailedSettings(next);
        setEnabled(saved.enabled);
      } finally {
        if (mountedRef.current && seq === requestSeqRef.current) {
          setSaving(false);
        }
      }
    },
    [saved.enabled]
  );

  const handleToggleSwitch = () => {
    if (reading || saving) return;
    clearDebounce();
    const nextEnabled = !enabled;
    const resolvedTarget = parsedTarget ?? saved.targetLikes ?? DEFAULT_QUICK_VOTES_TARGET_LIKES;
    setEnabled(nextEnabled);
    const nextText = String(resolvedTarget);
    latestTargetTextRef.current = nextText;
    setTargetText(nextText);
    void commitSave({ enabled: nextEnabled, targetLikes: resolvedTarget });
  };

  const handleStep = (delta: number) => {
    if (reading || saving) return;
    clearDebounce();
    const currentValue = parsedTarget ?? saved.targetLikes ?? DEFAULT_QUICK_VOTES_TARGET_LIKES;
    const nextValue = Math.max(1, currentValue + delta);
    if (nextValue === currentValue && delta < 0) return;
    const nextText = String(nextValue);
    latestTargetTextRef.current = nextText;
    setTargetText(nextText);
    void commitSave({ enabled: true, targetLikes: nextValue });
  };

  const scheduleTargetSave = (nextText: string) => {
    clearDebounce();
    const valid = parseTargetText(nextText);
    if (valid === null) return;
    debounceTimer.current = setTimeout(() => {
      debounceTimer.current = null;
      if (valid !== saved.targetLikes || !saved.enabled) {
        void commitSave({ enabled: true, targetLikes: valid });
      }
    }, AUTO_SAVE_DEBOUNCE_MS);
  };

  const flushTargetSave = () => {
    clearDebounce();
    const valid = parseTargetText(targetText);
    if (valid === null) return;
    if (valid !== saved.targetLikes || !saved.enabled) {
      void commitSave({ enabled: true, targetLikes: valid });
    }
  };

  const handleRetry = () => {
    if (errorMode === 'save' && failedSettings) {
      setEnabled(failedSettings.enabled);
      const nextText = String(failedSettings.targetLikes);
      latestTargetTextRef.current = nextText;
      setTargetText(nextText);
      void commitSave(failedSettings);
      return;
    }
    reloadSettings();
  };

  return (
    <section
      data-testid="quick-votes-settings"
      aria-labelledby={headingId}
      className="w-full min-w-0 rounded-3xl border border-chrome-line bg-white px-4 py-6 shadow-card sm:px-6"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 id={headingId} className="break-words font-heading text-lg font-bold text-ink-body">
            {t('settings.quickVotes.title', 'Quick Votes')}
          </h2>
          <p id={subtitleId} className="mt-0.5 break-words text-sm font-medium text-ink-muted">
            {t('settings.quickVotes.subtitle', 'Pause gently after a short batch of likes')}
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-labelledby={headingId}
          aria-describedby={subtitleId}
          aria-busy={reading || saving}
          disabled={reading || saving}
          data-testid="quick-votes-switch"
          onClick={handleToggleSwitch}
          className="inline-flex min-h-12 min-w-[56px] shrink-0 items-center justify-end rounded-full disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body"
        >
          <span
            aria-hidden="true"
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors motion-reduce:transition-none ${
              enabled ? 'bg-garden-fill' : 'bg-charcoal-200'
            }`}
          >
            <span
              className={`inline-block h-6 w-6 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none ${
                enabled ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </span>
        </button>
      </div>

      {enabled && (
        <div
          data-testid="quick-votes-target-controls"
          className="mt-4 space-y-2 border-t border-chrome-line pt-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label htmlFor={targetInputId} className="min-w-0 text-sm font-semibold text-ink-body">
              {t('settings.quickVotes.likesTargetLabel', 'Likes per turn')}
            </label>

            <div className="flex max-w-full flex-wrap items-center gap-[8px]">
              <button
                type="button"
                data-testid="quick-votes-decrease"
                disabled={saving || (parsedTarget !== null && parsedTarget <= 1)}
                onClick={() => handleStep(-1)}
                aria-label={t('settings.quickVotes.decreaseTarget', 'Decrease likes per turn')}
                className="inline-flex min-h-12 min-w-[48px] items-center justify-center rounded-xl border border-chrome-line bg-white text-ink-body transition-colors hover:bg-charcoal-50 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body"
              >
                <Minus className="h-5 w-5" aria-hidden="true" />
              </button>

              <input
                id={targetInputId}
                data-testid="quick-votes-target-input"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={targetText}
                aria-invalid={isTargetInvalid}
                aria-describedby={isTargetInvalid ? validationErrorId : undefined}
                onChange={(event) => {
                  const nextText = event.currentTarget.value;
                  latestTargetTextRef.current = nextText;
                  setTargetText(nextText);
                  scheduleTargetSave(nextText);
                }}
                onBlur={flushTargetSave}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    flushTargetSave();
                  }
                }}
                className="min-h-12 w-[68px] rounded-xl border border-chrome-line bg-white px-2 text-center font-heading text-base font-extrabold text-ink-body [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
              />

              <button
                type="button"
                data-testid="quick-votes-increase"
                disabled={saving}
                onClick={() => handleStep(1)}
                aria-label={t('settings.quickVotes.increaseTarget', 'Increase likes per turn')}
                className="inline-flex min-h-12 min-w-[48px] items-center justify-center rounded-xl border border-chrome-line bg-white text-ink-body transition-colors hover:bg-charcoal-50 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body"
              >
                <Plus className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {isTargetInvalid && (
            <p
              id={validationErrorId}
              role="alert"
              data-testid="quick-votes-validation-error"
              className="text-sm font-medium text-hearth-ink"
            >
              {t('settings.quickVotes.invalidTarget', 'Enter a whole number of at least 1.')}
            </p>
          )}
        </div>
      )}

      {errorMode && (
        <div
          data-testid="quick-votes-error"
          className="mt-4 flex flex-col gap-3 rounded-2xl border border-hearth-line bg-terracotta-50 p-4 text-sm text-ink-body"
        >
          <p role="alert" className="font-medium text-hearth-ink">
            {errorMode === 'load'
              ? t('settings.quickVotes.loadError', 'Unable to load Quick Votes settings right now.')
              : t(
                  'settings.quickVotes.saveError',
                  'Could not save Quick Votes settings. Nothing was changed.'
                )}
          </p>
          <Button
            type="button"
            variant="secondary"
            size="md"
            data-testid="quick-votes-retry"
            disabled={reading || saving}
            onClick={handleRetry}
            className="self-start"
          >
            {t('settings.quickVotes.retry', 'Retry')}
          </Button>
        </div>
      )}

      <div className="mt-4 border-t border-chrome-line pt-2">
        <button
          type="button"
          data-testid="quick-votes-how-it-works-toggle"
          aria-expanded={howItWorksOpen}
          aria-controls={howItWorksId}
          onClick={() => setHowItWorksOpen((open) => !open)}
          className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl px-1 py-2 text-left text-sm font-bold text-garden-ink transition-colors hover:bg-sage-50/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
        >
          <span>
            {howItWorksOpen
              ? t('settings.quickVotes.hideDetails', 'Hide details')
              : t('settings.quickVotes.howItWorks', 'How it works')}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`h-5 w-5 shrink-0 text-garden-ink transition-transform motion-reduce:transition-none ${
              howItWorksOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {howItWorksOpen && (
          <div
            id={howItWorksId}
            data-testid="quick-votes-how-it-works-body"
            className="mt-2 space-y-2.5 rounded-2xl border border-chrome-line bg-cream p-4"
          >
            <p className="text-sm font-bold text-ink-body">
              {t(
                'settings.quickVotes.howItWorksLead',
                'Take a calm pause after a handful of likes.'
              )}
            </p>
            <p className="text-sm leading-relaxed text-ink-muted">
              {t(
                'settings.quickVotes.howItWorksBody',
                'Swiping stays counter-free, then gently checks in once you reach your target likes. It never blocks voting or loses saved votes. Keep going or come back anytime.'
              )}
            </p>
            <p className="text-xs font-semibold text-garden-ink">
              {t('settings.quickVotes.familyScopeNote', 'Applies to everyone in the family.')}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
