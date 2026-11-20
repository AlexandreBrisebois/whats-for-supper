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
    attempt.count !== undefined &&
    (saved.defaultServings ?? null) === attempt.count
  );
}
const control =
  'min-h-12 rounded-xl border border-chrome-line bg-white px-3 text-ink-body focus-visible:outline-2 focus-visible:outline-hearth-ink';

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
  const [message, setMessage] = useState<'saved' | 'changed' | 'uncertain' | 'load-error' | null>(
    null
  );
  const [refresh, setRefresh] = useState(0);
  const request = useRef(0);
  const savingNow = useRef(false);
  const queuedRead = useRef(false);
  const current = useRef({ saved, draft, attempt, reviewedAttempt });
  useLayoutEffect(() => {
    current.current = { saved, draft, attempt, reviewedAttempt };
  }, [saved, draft, attempt, reviewedAttempt]);
  const dirty = Boolean(saved && draft && (!sameChoice(saved, draft) || reviewedAttempt));

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
        // kept and the next deliberate save is guarded by the fresh version.
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
            setMessage('saved');
          } else {
            setSaved(result);
            // A lost automatic ACK has no trustworthy pre-write family count. A fresh
            // read enables a deliberate save, including when its mode now matches.
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
      request.current++;
    },
    []
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
  const displayedText =
    source === 'family' ? (automaticCount == null ? '' : String(automaticCount)) : text;
  const edit = (next: Draft) => {
    setDraft(next);
    setMessage((previous) => (reviewRequired ? previous : null));
  };
  const commit = async () => {
    if (
      !saved ||
      !draft ||
      !dirty ||
      savingNow.current ||
      reading ||
      reviewRequired ||
      (draft.source === 'explicit' && !validCount(draft.text))
    )
      return;
    const intent: Attempt = {
      source: draft.source,
      count:
        draft.source === 'explicit'
          ? Number(draft.text)
          : saved.defaultServingsSource === 'family'
            ? (saved.defaultServings ?? null)
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
        referenceWeekStartDate: saved.referenceWeekStartDate,
        weekOffset: saved.weekOffset ?? 0,
        expectedVersion: saved.version,
        defaultServings: draft.source === 'family' ? null : Number(draft.text),
        days: [],
      });
      if (token !== request.current) return;
      if (
        !validSnapshot(result) ||
        result.defaultServingsSource !== intent.source ||
        (intent.source === 'explicit' && result.defaultServings !== intent.count)
      )
        throw new Error('Portions acknowledgement unavailable');
      setSaved(result);
      setDraft(null);
      setAttempt(null);
      setReviewedAttempt(false);
      setReviewRequired(false);
      setMessage('saved');
      // Preserve ordinary quiet freshness; the existing schedule/SSE owners reconcile it.
      if (useWeekStore.getState().schedule[0]?.date === String(result.weekStartDate))
        useWeekStore.setState({ groceryRefresh: result.groceryRefresh });
    } catch {
      if (token === request.current) {
        needsAutoReview = true;
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
      } else if (queuedRead.current && token === request.current) {
        queuedRead.current = false;
        setRefresh((value) => value + 1);
      }
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
      <p className="mt-2 text-sm text-ink-muted">
        {t(
          'usualPortions.description',
          'The total to cook, including leftovers. Individual days can use a different number.'
        )}
      </p>
      {!saved && reading && (
        <p role="status" className="mt-4 text-ink-body">
          {t('usualPortions.loading', 'Loading portions…')}
        </p>
      )}
      {saved && (
        <div className="mt-4 flex flex-col gap-4">
          <label className="flex min-h-12 items-center gap-3 text-ink-body">
            <input
              data-testid="usual-portions-automatic"
              type="checkbox"
              checked={source === 'family'}
              disabled={saving || (reading && !saved)}
              className="h-6 w-6 accent-hearth-fill"
              onChange={(event) =>
                edit({ source: event.currentTarget.checked ? 'family' : 'explicit', text })
              }
            />
            {t('usualPortions.useFamilySize', 'Use family size')}
          </label>
          <label htmlFor={`${id}-count`} className="font-medium text-ink-body">
            {t('usualPortions.title', 'Usual portions')}
          </label>
          <input
            id={`${id}-count`}
            data-testid="usual-portions-input"
            type="number"
            inputMode="numeric"
            min={1}
            max={2147483647}
            step={1}
            disabled={saving || source === 'family'}
            value={displayedText}
            aria-describedby={`${id}-context${source === 'explicit' && !validCount(text) ? ` ${id}-error` : ''}`}
            aria-invalid={source === 'explicit' && !validCount(text)}
            className={`${control} w-full`}
            onChange={(event) => edit({ source: 'explicit', text: event.currentTarget.value })}
          />
          <p id={`${id}-context`} className="text-sm text-ink-muted">
            {source === 'family'
              ? automaticCount == null
                ? saved.defaultServingsSource === 'explicit'
                  ? t(
                      'usualPortions.automaticPending',
                      'Family size will be confirmed when you save.'
                    )
                  : t(
                      'usualPortions.unavailable',
                      'Family size is unavailable. You can set usual portions.'
                    )
                : t('usualPortions.automaticContext', 'Automatically follows your family size.')
              : t(
                  'usualPortions.explicitContext',
                  'Your chosen total stays the same when family membership changes.'
                )}
          </p>
          {source === 'explicit' && !validCount(text) && (
            <p id={`${id}-error`} role="alert" className="text-sm text-hearth-ink">
              {t('usualPortions.invalid', 'Enter a whole number from 1 to 2147483647.')}
            </p>
          )}
          <Button
            type="button"
            variant="primary"
            size="md"
            data-testid="save-usual-portions"
            disabled={
              !dirty ||
              reading ||
              saving ||
              reviewRequired ||
              (source === 'explicit' && !validCount(text))
            }
            onClick={() => void commit()}
          >
            {saving
              ? t('usualPortions.saving', 'Saving…')
              : t('usualPortions.save', 'Save usual portions')}
          </Button>
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
      <div aria-live="polite" className="mt-4 text-sm text-ink-body">
        {message === 'saved' && (
          <p className="rounded-2xl border border-garden-line bg-sage-50 p-3 font-medium text-garden-ink">
            {t('usualPortions.saved', 'Saved')}
          </p>
        )}
        {(message === 'uncertain' || message === 'changed' || message === 'load-error') && (
          <div
            data-testid="usual-portions-recovery"
            className="flex flex-col gap-3 rounded-2xl border border-hearth-line bg-terracotta-50 p-4 text-ink-body"
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
                <p>
                  {t(
                    'usualPortions.changed',
                    'Current portions have changed. Your draft is kept; save it to replace them.'
                  )}
                </p>
                {saved && !reviewRequired && (
                  <p className="font-medium text-hearth-ink">
                    {tWithVars(
                      'usualPortions.currentSaved',
                      'Current saved portions: {{count}} ({{source}})',
                      {
                        count:
                          saved.defaultServings ??
                          t('usualPortions.unavailableCount', 'Unavailable'),
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
              <p role="alert">
                {t(
                  'usualPortions.loadError',
                  'Unable to load current portions. Your draft is kept.'
                )}
              </p>
            )}
            {message === 'load-error' && (
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
            )}
          </div>
        )}
      </div>
    </section>
  );
}
