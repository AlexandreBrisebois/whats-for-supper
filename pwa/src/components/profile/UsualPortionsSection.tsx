'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { readSupperServings, saveSupperServings } from '@/lib/api/supper-servings';
import type { SupperServings } from '@/lib/api/generated/models';
import { useFamilyStore } from '@/store/familyStore';
import { useWeekStore } from '@/store/weekStore';
import { t, tWithVars } from '@/locales';
import { Button } from '@/components/ui/button';

type Draft = { source: 'explicit' | 'family'; text: string };
type Attempt = { source: Draft['source']; count: number | null | undefined };

const AUTO_SAVE_DEBOUNCE_MS = 450;

const validCount = (text: string) =>
  /^\d+$/.test(text) && Number(text) >= 1 && Number(text) <= 2147483647;
const positive = (count: unknown): count is number =>
  typeof count === 'number' && Number.isInteger(count) && count >= 1 && count <= 2147483647;

function validSnapshot(saved: SupperServings) {
  return Boolean(
    saved.version &&
    saved.referenceWeekStartDate &&
    saved.weekStartDate &&
    ((saved.defaultServingsSource === 'explicit' && positive(saved.defaultServings)) ||
      (saved.defaultServingsSource === 'family' &&
        // Kiota represents a wire-null number as undefined.
        (saved.defaultServings == null || positive(saved.defaultServings))))
  );
}

function sameChoice(saved: SupperServings, draft: Draft) {
  return (
    saved.defaultServingsSource === draft.source &&
    (draft.source === 'family' ||
      (validCount(draft.text) && saved.defaultServings === Number(draft.text)))
  );
}

function confirmedIntent(saved: SupperServings, attempt: Attempt) {
  return (
    saved.defaultServingsSource === attempt.source &&
    (attempt.source === 'family' ||
      (attempt.count !== undefined && (saved.defaultServings ?? null) === attempt.count))
  );
}

export function UsualPortionsSection() {
  const id = useId();
  const members = useFamilyStore((state) => state.familyMembers);
  const rosterError = useFamilyStore((state) => state.error);
  const loadFamily = useFamilyStore((state) => state.loadFamilyMembers);
  const reference = useWeekStore((state) => state.calendar?.referenceWeekStartDate);
  const projectionSequence = useWeekStore((state) => state.ingredientProjectionUpdate?.sequence);
  // Identity changes matter; roster length and selected identity never supply the count.
  const memberKey = members
    .map((member) => member.id)
    .sort()
    .join('|');
  const [saved, setSaved] = useState<SupperServings | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [reading, setReading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reviewRequired, setReviewRequired] = useState(false);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [reviewedAttempt, setReviewedAttempt] = useState(false);
  const [message, setMessage] = useState<'changed' | 'uncertain' | 'load-error' | null>(null);
  const [refresh, setRefresh] = useState(0);
  const request = useRef(0);
  const savingNow = useRef(false);
  const queuedRead = useRef(false);
  const pendingDraft = useRef<Draft | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const automaticLabelRef = useRef<HTMLLabelElement | null>(null);
  const current = useRef({ saved, draft, attempt, reviewedAttempt, reading, reviewRequired });

  useLayoutEffect(() => {
    current.current = { saved, draft, attempt, reviewedAttempt, reading, reviewRequired };
  }, [saved, draft, attempt, reviewedAttempt, reading, reviewRequired]);

  const clearDebounce = useCallback(() => {
    if (debounceTimer.current !== null) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
  }, []);

  const read = useCallback(
    async (review = false) => {
      if (savingNow.current) {
        queuedRead.current = true;
        return;
      }
      const token = ++request.current;
      setReading(true);
      try {
        const before = current.current;
        const result = await readSupperServings(
          review ? (before.saved?.weekOffset ?? 0) : 0,
          review && before.saved
            ? String(before.saved.referenceWeekStartDate)
            : (reference ?? undefined)
        );
        if (token !== request.current) return;
        if (!validSnapshot(result)) throw new Error('Portions unavailable');
        const latest = current.current;
        const dirtyNow = Boolean(
          latest.draft &&
          latest.saved &&
          (!sameChoice(latest.saved, latest.draft) || latest.attempt || latest.reviewedAttempt)
        );
        // A changed baseline under a dirty draft is installed directly: the draft is
        // kept and the next save is guarded by the fresh version.
        const baselineChanged = dirtyNow && result.version !== latest.saved?.version;
        if (review || baselineChanged) {
          if (
            latest.attempt &&
            latest.draft &&
            sameChoice(result, latest.draft) &&
            confirmedIntent(result, latest.attempt)
          ) {
            setSaved(result);
            setDraft(null);
            setAttempt(null);
            setReviewedAttempt(false);
            setReviewRequired(false);
            setMessage(null);
          } else {
            setSaved(result);
            setReviewedAttempt(Boolean(latest.attempt));
            setAttempt(null);
            setReviewRequired(false);
            setMessage('changed');
          }
        } else if (dirtyNow) {
          // Same baseline: keep the dirty draft exactly as it is.
        } else {
          setSaved(result);
          if (!latest.attempt) setDraft(null);
          setMessage((previous) => (previous === 'load-error' ? null : previous));
        }
      } catch {
        if (token === request.current) setMessage('load-error');
      } finally {
        if (token === request.current) setReading(false);
      }
    },
    [reference]
  );

  useEffect(() => {
    void read();
  }, [read, memberKey, projectionSequence, refresh]);

  // Only an unmount retires a pending write. A new calendar reference queues a
  // fresh read while the captured write is allowed to settle normally.
  useEffect(
    () => () => {
      clearDebounce();
      request.current++;
    },
    [clearDebounce]
  );

  useEffect(() => {
    const resume = () => {
      if (document.visibilityState !== 'hidden') void read();
    };
    window.addEventListener('focus', resume);
    window.addEventListener('pageshow', resume);
    document.addEventListener('visibilitychange', resume);
    return () => {
      window.removeEventListener('focus', resume);
      window.removeEventListener('pageshow', resume);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [read]);

  const source = draft?.source ?? saved?.defaultServingsSource;
  const text = draft?.text ?? (saved?.defaultServings == null ? '' : String(saved.defaultServings));
  const automaticCount =
    saved?.defaultServingsSource === 'family' ? (saved.defaultServings ?? null) : null;

  const commit = useCallback(
    async (targetDraft: Draft) => {
      const state = current.current;
      const activeSaved = state.saved;
      if (
        !activeSaved ||
        state.reading ||
        state.reviewRequired ||
        (targetDraft.source === 'explicit' && !validCount(targetDraft.text))
      ) {
        return;
      }
      if (savingNow.current) {
        pendingDraft.current = targetDraft;
        return;
      }
      const isDirty = !sameChoice(activeSaved, targetDraft) || state.reviewedAttempt;
      if (!isDirty) return;

      const intent: Attempt = {
        source: targetDraft.source,
        count:
          targetDraft.source === 'explicit'
            ? Number(targetDraft.text)
            : activeSaved.defaultServingsSource === 'family'
              ? (activeSaved.defaultServings ?? null)
              : undefined,
      };
      const token = ++request.current;
      savingNow.current = true;
      setSaving(true);
      setAttempt(intent);
      setMessage(null);
      let needsAutoReview = false;
      try {
        const result = await saveSupperServings({
          referenceWeekStartDate: activeSaved.referenceWeekStartDate,
          weekOffset: activeSaved.weekOffset ?? 0,
          expectedVersion: activeSaved.version,
          defaultServings: targetDraft.source === 'family' ? null : Number(targetDraft.text),
          days: [],
        });
        if (token !== request.current) return;
        if (
          !validSnapshot(result) ||
          result.defaultServingsSource !== intent.source ||
          (intent.source === 'explicit' && result.defaultServings !== intent.count)
        ) {
          throw new Error('Portions acknowledgement unavailable');
        }
        setSaved(result);
        const queued = pendingDraft.current;
        if (!queued || sameChoice(result, queued)) {
          setDraft(null);
        }
        setAttempt(null);
        setReviewedAttempt(false);
        setReviewRequired(false);
        setMessage(null);
        // Preserve ordinary quiet freshness; the existing schedule/SSE owners reconcile it.
        if (useWeekStore.getState().schedule[0]?.date === String(result.weekStartDate)) {
          useWeekStore.setState({ groceryRefresh: result.groceryRefresh });
        }
      } catch {
        if (token === request.current) {
          needsAutoReview = true;
          pendingDraft.current = null;
          setReviewRequired(true);
          setMessage('uncertain');
        }
      } finally {
        savingNow.current = false;
        if (token === request.current) setSaving(false);
        if (needsAutoReview && token === request.current) {
          // Read current saved portions immediately; no manual Review gate.
          queuedRead.current = false;
          void read(true);
        } else if (pendingDraft.current && token === request.current) {
          const next = pendingDraft.current;
          pendingDraft.current = null;
          void commit(next);
        } else if (queuedRead.current && token === request.current) {
          queuedRead.current = false;
          setRefresh((value) => value + 1);
        }
      }
    },
    [read]
  );

  const scheduleExplicitSave = (nextDraft: Draft) => {
    clearDebounce();
    if (!validCount(nextDraft.text)) return;
    debounceTimer.current = setTimeout(() => {
      debounceTimer.current = null;
      void commit(nextDraft);
    }, AUTO_SAVE_DEBOUNCE_MS);
  };

  const handleToggleAutomatic = (checked: boolean) => {
    clearDebounce();
    if (checked) {
      const nextDraft: Draft = { source: 'family', text };
      setDraft(nextDraft);
      setMessage((previous) => (reviewRequired ? previous : null));
      current.current = { ...current.current, draft: nextDraft };
      void commit(nextDraft);
      return;
    }

    const fallbackText = validCount(text)
      ? text
      : saved?.defaultServings != null
        ? String(saved.defaultServings)
        : '';
    const nextDraft: Draft = { source: 'explicit', text: fallbackText };
    setDraft(nextDraft);
    setMessage((previous) => (reviewRequired ? previous : null));
    current.current = { ...current.current, draft: nextDraft };
    scheduleExplicitSave(nextDraft);
  };

  const handleCountChange = (nextText: string) => {
    const nextDraft: Draft = { source: 'explicit', text: nextText };
    setDraft(nextDraft);
    setMessage((previous) => (reviewRequired ? previous : null));
    current.current = { ...current.current, draft: nextDraft };
    scheduleExplicitSave(nextDraft);
  };

  const flushExplicitSave = () => {
    clearDebounce();
    const latestDraft = current.current.draft;
    if (latestDraft && latestDraft.source === 'explicit' && validCount(latestDraft.text)) {
      void commit(latestDraft);
    }
  };

  return (
    <section
      data-testid="usual-portions-section"
      aria-labelledby={`${id}-heading`}
      className="min-w-0 rounded-3xl border border-chrome-line bg-white p-6 shadow-sm"
    >
      <h2 id={`${id}-heading`} className="font-heading text-lg font-bold text-ink-body">
        {t('usualPortions.title', 'Usual portions')}
      </h2>
      <p className="mt-1 text-sm text-ink-muted">
        {t('usualPortions.description', 'Total to cook, including leftovers.')}
      </p>
      {!saved && reading && (
        <p role="status" className="mt-4 text-ink-body">
          {t('usualPortions.loading', 'Loading portions…')}
        </p>
      )}
      {saved && (
        <div className="mt-4">
          <div
            data-testid="usual-portions-row"
            className="flex min-h-12 flex-wrap items-center justify-between gap-x-4 gap-y-2"
          >
            <div className="flex min-h-12 items-center">
              {source === 'family' ? (
                <p
                  data-testid="usual-portions-display"
                  className="flex min-h-12 items-baseline gap-1.5 text-ink-body"
                >
                  {automaticCount != null ? (
                    <>
                      <span className="font-heading text-xl font-extrabold text-ink-body">
                        {automaticCount}
                      </span>{' '}
                      <span className="text-sm font-semibold text-ink-body">
                        {t('usualPortions.unit', 'portions')}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-ink-muted">
                      {t(
                        'usualPortions.unavailable',
                        'Family size is unavailable. You can set usual portions.'
                      )}
                    </span>
                  )}
                </p>
              ) : (
                <div className="flex min-h-12 items-center gap-2.5">
                  <input
                    id={`${id}-count`}
                    data-testid="usual-portions-input"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={2147483647}
                    step={1}
                    aria-label={t('usualPortions.title', 'Usual portions')}
                    value={text}
                    aria-describedby={!validCount(text) ? `${id}-error` : undefined}
                    aria-invalid={!validCount(text)}
                    className="h-12 min-h-12 w-[72px] rounded-xl border border-chrome-line bg-white px-2 text-center font-heading text-base font-extrabold text-ink-body focus-visible:border-hearth-fill focus-visible:outline-2 focus-visible:outline-hearth-ink"
                    onChange={(event) => handleCountChange(event.currentTarget.value)}
                    onBlur={(event) => {
                      const related = event.relatedTarget as Node | null;
                      if (related && automaticLabelRef.current?.contains(related)) {
                        clearDebounce();
                        return;
                      }
                      flushExplicitSave();
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        flushExplicitSave();
                      }
                    }}
                  />
                  <label htmlFor={`${id}-count`} className="text-sm font-semibold text-ink-body">
                    {t('usualPortions.unit', 'portions')}
                  </label>
                </div>
              )}
            </div>

            <label
              ref={automaticLabelRef}
              className="flex min-h-12 shrink-0 cursor-pointer items-center gap-2.5 text-sm font-medium text-ink-body"
            >
              <input
                data-testid="usual-portions-automatic"
                type="checkbox"
                checked={source === 'family'}
                disabled={reading && !saved}
                className="h-6 w-6 accent-hearth-fill"
                onChange={(event) => handleToggleAutomatic(event.currentTarget.checked)}
              />
              <span>{t('usualPortions.useFamilySize', 'Use family size')}</span>
            </label>
          </div>

          {source === 'explicit' && !validCount(text) && (
            <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-hearth-ink">
              {t('usualPortions.invalid', 'Enter a whole number from 1 to 2147483647.')}
            </p>
          )}
        </div>
      )}
      {rosterError && (
        <p className="mt-4 text-sm text-ink-muted">
          {t(
            'usualPortions.rosterError',
            'The family list could not be loaded. Retry to view its members.'
          )}{' '}
          <Button type="button" variant="secondary" size="md" onClick={() => void loadFamily()}>
            {t('usualPortions.retryFamily', 'Retry family list')}
          </Button>
        </p>
      )}
      {(message === 'uncertain' || message === 'changed' || message === 'load-error') && (
        <div
          aria-live="polite"
          data-testid="usual-portions-recovery"
          className="mt-4 flex flex-col gap-3 rounded-2xl border border-hearth-line bg-terracotta-50 p-4 text-sm text-ink-body"
        >
          {message === 'uncertain' && (
            <p role="alert">
              {t(
                'usualPortions.uncertain',
                'The save could not be confirmed. Your draft is kept; current portions are checked below.'
              )}
            </p>
          )}
          {message === 'changed' && (
            <>
              <p role="alert">
                {t(
                  'usualPortions.changed',
                  'Current portions have changed. Your draft is kept; edit or leave the field to save.'
                )}
              </p>
              {saved && !reviewRequired && (
                <p className="font-medium text-hearth-ink">
                  {tWithVars(
                    'usualPortions.currentSaved',
                    'Current saved portions: {{count}} ({{source}})',
                    {
                      count:
                        saved.defaultServings ?? t('usualPortions.unavailableCount', 'Unavailable'),
                      source:
                        saved.defaultServingsSource === 'family'
                          ? t('usualPortions.familySource', 'Family size')
                          : t('usualPortions.explicitSource', 'Your chosen total'),
                    }
                  )}
                </p>
              )}
            </>
          )}
          {message === 'load-error' && (
            <>
              <p role="alert">
                {t(
                  'usualPortions.loadError',
                  'Unable to load current portions. Your draft is kept.'
                )}
              </p>
              <Button
                type="button"
                variant="secondary"
                size="md"
                className="self-start"
                disabled={reading || saving}
                onClick={() => void read(reviewRequired)}
              >
                {t('usualPortions.retry', 'Retry portions')}
              </Button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
