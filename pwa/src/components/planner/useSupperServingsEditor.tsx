'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { DateOnly } from '@microsoft/kiota-abstractions';
import Image from 'next/image';
import { Calendar, Minus, Plus, Utensils } from 'lucide-react';
import { getLocale, t, tWithVars } from '@/locales';
import { readSupperServings, saveSupperServings } from '@/lib/api/supper-servings';
import type { SupperServings } from '@/lib/api/generated/models';
import { useWeekStore, type UILocalScheduleDay } from '@/store/weekStore';
import { NonCookingIcon } from './NonCookingIcon';
import { formatSupperPlanDate, nonCookingLabel } from '@/lib/planner/nonCooking';
import { registerPortionsDeparture } from '@/lib/planner/portionsNavigation';
import { getImageUrl } from '@/lib/imageUtils';
import { absoluteMonday, civilDate, weekOffsetFor } from '@/lib/deployment-calendar';
import { Button } from '@/components/ui/button';

// Card actions wrap and shrink so recovery stays inside 320px at 200% text.
const cardButton = 'max-w-full px-4 text-sm text-center leading-snug';
// Let native focus scrolling clear the sticky week header and fixed navigation.
const focusClearance =
  '[&_button]:scroll-my-[calc(12rem+env(safe-area-inset-bottom))] [&_input]:scroll-my-[calc(12rem+env(safe-area-inset-bottom))]';

/** A local dated draft; server acknowledgement owns saved counts and grocery freshness. */
export function useSupperServingsEditor(
  weekOffset: number,
  reference: string | undefined,
  schedule: UILocalScheduleDay[],
  onFinish?: () => void,
  todayDate?: string | null
) {
  const [state, setState] = useState<SupperServings | null>(null);
  const calendarReference = useWeekStore((s) => s.calendar?.referenceWeekStartDate);
  const calendarToday = useWeekStore((s) => s.calendar?.today ?? null);
  const resolvedToday = todayDate !== undefined ? todayDate : calendarToday;
  const [initialWeek] = useState(() => ({
    monday: absoluteMonday(schedule[0]?.date),
    offset: weekOffset,
  }));
  const inferred =
    initialWeek.monday && Number.isInteger(initialWeek.offset)
      ? new Date(Date.parse(`${initialWeek.monday}T00:00:00Z`) - initialWeek.offset * 7 * 86400000)
      : null;
  const anchor = absoluteMonday(
    reference ??
      calendarReference ??
      (inferred && Number.isFinite(inferred.getTime()) ? inferred.toISOString().slice(0, 10) : null)
  );
  const target =
    anchor && Number.isInteger(weekOffset)
      ? new Date(Date.parse(`${anchor}T00:00:00Z`) + weekOffset * 7 * 86400000)
      : null;
  const key =
    target && Number.isFinite(target.getTime())
      ? (absoluteMonday(target.toISOString().slice(0, 10)) ?? '')
      : (absoluteMonday(schedule[0]?.date) ?? '');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const editing = editingKey === key;
  const lifetime = useRef({ key });
  useEffect(() => {
    const token = { key };
    lifetime.current = token;
    return () => {
      if (lifetime.current === token) lifetime.current = { key: 'retired' };
    };
  }, [key]);
  const [draft, setDraft] = useState<Record<string, string | null>>({});
  // A pre-Settings combined draft is evidence to review, never a default mutation.
  const [legacyUsualReview, setLegacyUsualReview] = useState<string | undefined>();
  const [restored, setRestored] = useState(false);
  const [reviewRequired, setReviewRequired] = useState(false);
  const [reviewLoaded, setReviewLoaded] = useState(false);
  const [reviewReadError, setReviewReadError] = useState(false);
  const [uncertainSave, setUncertainSave] = useState(false);
  const [departure, setDeparture] = useState<(() => void) | null>(null);
  const historyOwner = useRef(false);
  const restoreOwner = useRef(0);
  const pendingRef = useRef(false);
  const reviewingRef = useRef(false);
  const stateRef = useRef<SupperServings | null>(null);
  const draftRef = useRef<Record<string, string | null>>({});
  const legacyUsualReviewRef = useRef<string | undefined>(undefined);
  const uncertainSaveRef = useRef(false);
  const departureRef = useRef<(() => void) | null>(null);
  const reviewRef = useRef<(pendingNext?: () => void) => Promise<void>>(async () => {});
  const attemptLeaveRef = useRef<(next: () => void) => void>(() => {});
  const storageKey = `wfs-portions-draft:${key}`;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const date = (value: unknown) => String(value ?? '');
  const open = async () => {
    restoreOwner.current++;
    const token = lifetime.current;
    setEditingKey(key);
    setState(null);
    stateRef.current = null;
    setError(false);
    setRestored(false);
    setReviewRequired(false);
    setReviewLoaded(false);
    setReviewReadError(false);
    setUncertainSave(false);
    uncertainSaveRef.current = false;
    setDeparture(null);
    departureRef.current = null;
    pendingRef.current = true;
    setPending(true);
    try {
      const saved = await readSupperServings(weekOffset, anchor ?? undefined);
      if (lifetime.current === token) {
        setState(saved);
        stateRef.current = saved;
        setDraft({});
        draftRef.current = {};
        setLegacyUsualReview(undefined);
        legacyUsualReviewRef.current = undefined;
      }
    } catch {
      if (lifetime.current === token) setError(true);
    } finally {
      if (lifetime.current === token) {
        pendingRef.current = false;
        setPending(false);
      }
    }
  };
  const usual = state?.defaultServings ?? null;
  const dirty = editing && (Object.keys(draft).length > 0 || legacyUsualReview !== undefined);
  const validCount = (value: string) =>
    /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 2147483647;
  const valid = Object.values(draft).every((value) => value === null || validCount(value));
  const close = () => {
    restoreOwner.current++;
    setDraft({});
    draftRef.current = {};
    setLegacyUsualReview(undefined);
    legacyUsualReviewRef.current = undefined;
    setEditingKey(null);
    setError(false);
    setRestored(false);
    setReviewRequired(false);
    setReviewLoaded(false);
    setReviewReadError(false);
    setUncertainSave(false);
    uncertainSaveRef.current = false;
    setDeparture(null);
    departureRef.current = null;
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* Storage can be unavailable. */
    }
  };
  const leave = (next?: () => void) => {
    if (!historyOwner.current) {
      next?.();
      return;
    }
    historyOwner.current = false;
    window.addEventListener('popstate', () => next?.(), { once: true });
    window.history.back();
  };
  const requestDeparture = (next: () => void) => {
    attemptLeaveRef.current(next);
  };
  useEffect(() => {
    let active = true;
    const owner = ++restoreOwner.current;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (
        !key ||
        (saved.formatVersion !== undefined && saved.formatVersion !== 2) ||
        (saved.formatVersion === 2 && saved.usualDraft !== undefined) ||
        (saved.legacyUsualReview !== undefined &&
          (saved.formatVersion !== 2 || typeof saved.legacyUsualReview?.value !== 'string')) ||
        saved.key !== key ||
        !saved.state?.version ||
        saved.state.days?.length !== 7 ||
        absoluteMonday(saved.state.weekStartDate) !== key ||
        weekOffsetFor(key, saved.state.referenceWeekStartDate) !== saved.state.weekOffset ||
        !saved.state.days.every(
          (day: any, index: number) =>
            civilDate(day.date) ===
            new Date(Date.parse(`${key}T00:00:00Z`) + index * 86400000).toISOString().slice(0, 10)
        ) ||
        !saved.draft ||
        typeof saved.draft !== 'object' ||
        Array.isArray(saved.draft) ||
        !Object.entries(saved.draft).every(
          ([day, value]) =>
            saved.state.days.some((current: any) => current.date === day) &&
            (value === null || typeof value === 'string')
        ) ||
        (saved.usualDraft !== undefined && typeof saved.usualDraft !== 'string')
      )
        return;
      const legacyUsual =
        saved.formatVersion === 2 ? saved.legacyUsualReview?.value : saved.usualDraft;
      const restoredState = {
        ...saved.state,
        referenceWeekStartDate: DateOnly.parse(saved.state.referenceWeekStartDate),
        weekStartDate: DateOnly.parse(saved.state.weekStartDate),
        days: saved.state.days.map((day: any) => ({ ...day, date: DateOnly.parse(day.date) })),
      };
      // Apply the captured stored session after hydration; retired weeks cannot install it.
      void Promise.resolve().then(() => {
        if (!active || restoreOwner.current !== owner) return;
        stateRef.current = restoredState;
        draftRef.current = saved.draft;
        legacyUsualReviewRef.current = legacyUsual;
        uncertainSaveRef.current = saved.uncertainSave === true;
        const needsReview = saved.uncertainSave === true || legacyUsual !== undefined;
        setState(restoredState);
        setDraft(saved.draft);
        setLegacyUsualReview(legacyUsual);
        setEditingKey(key);
        setRestored(true);
        setUncertainSave(saved.uncertainSave === true);
        setReviewRequired(needsReview);
        setReviewLoaded(false);
        setReviewReadError(false);
        setError(saved.uncertainSave === true);
        if (needsReview) void reviewRef.current();
      });
    } catch {
      /* Storage can be unavailable; the mounted editor still works. */
    }
    return () => {
      active = false;
    };
  }, [key, storageKey]);
  const persistDraft = useCallback(
    (unknown = uncertainSave) => {
      if (!state) return;
      try {
        sessionStorage.setItem(
          storageKey,
          JSON.stringify({
            formatVersion: 2,
            key,
            state: {
              ...state,
              referenceWeekStartDate: String(state.referenceWeekStartDate),
              weekStartDate: String(state.weekStartDate ?? key),
              weekOffset: state.weekOffset ?? weekOffsetFor(key, state.referenceWeekStartDate),
              days: state.days?.map((day) => ({ ...day, date: String(day.date) })),
            },
            draft,
            ...(legacyUsualReview === undefined
              ? {}
              : { legacyUsualReview: { value: legacyUsualReview } }),
            uncertainSave: unknown,
          })
        );
      } catch {
        /* Private mode can disable storage; the mounted draft remains intact. */
      }
    },
    [state, storageKey, key, draft, legacyUsualReview, uncertainSave]
  );
  useEffect(() => {
    if (!dirty) {
      if (!editing) return;
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        /* Storage can be unavailable. */
      }
      return;
    }
    persistDraft();
  }, [dirty, editing, persistDraft, storageKey]);
  useEffect(() => {
    if (!editing) return;
    return registerPortionsDeparture((next) => {
      attemptLeaveRef.current(next);
    });
  }, [editing]);
  useEffect(() => {
    if (!editing) return;
    const onBack = () => {
      if (!historyOwner.current) return;
      window.history.pushState(
        { ...window.history.state, portionsDraft: key },
        '',
        window.location.href
      );
      attemptLeaveRef.current(() => window.history.back());
    };
    const onUnload = (event: BeforeUnloadEvent) => {
      if (historyOwner.current) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('popstate', onBack);
    window.addEventListener('beforeunload', onUnload);
    return () => {
      window.removeEventListener('popstate', onBack);
      window.removeEventListener('beforeunload', onUnload);
      historyOwner.current = false;
    };
  }, [editing, key]);
  useEffect(() => {
    if (!dirty && historyOwner.current) leave();
    if (dirty && !historyOwner.current) {
      if (window.history.state?.portionsDraft !== key)
        window.history.pushState(
          { ...window.history.state, portionsDraft: key },
          '',
          window.location.href
        );
      historyOwner.current = true;
    }
  }, [dirty, key]);
  const review = async (pendingNext?: () => void) => {
    if (reviewingRef.current) return;
    const token = lifetime.current;
    reviewingRef.current = true;
    pendingRef.current = true;
    setPending(true);
    setReviewReadError(false);
    const currentState = stateRef.current;
    const currentDraft = draftRef.current;
    const currentLegacy = legacyUsualReviewRef.current;
    const isUncertain = uncertainSaveRef.current;
    try {
      const saved = await readSupperServings(
        currentState?.weekOffset ?? weekOffset,
        currentState ? String(currentState.referenceWeekStartDate) : reference
      );
      if (lifetime.current !== token) return;
      const matchesIntent =
        currentState &&
        String(saved.weekStartDate) === String(currentState.weekStartDate) &&
        Object.entries(currentDraft).every(([day, count]) => {
          const current = saved.days?.find((item) => date(item.date) === day);
          return (
            current &&
            (current.overrideServings ?? null) === (count === null ? null : Number(count))
          );
        });
      if (isUncertain && currentLegacy === undefined && matchesIntent) {
        const exitCallback = pendingNext ?? departureRef.current ?? onFinish;
        close();
        if (useWeekStore.getState().schedule[0]?.date === String(saved.weekStartDate))
          useWeekStore.setState({ groceryRefresh: saved.groceryRefresh });
        leave(exitCallback);
        return;
      }
      setState(saved);
      stateRef.current = saved;
      setReviewLoaded(true);
      setReviewReadError(false);
      setUncertainSave(false);
      uncertainSaveRef.current = false;
      setRestored(false);
    } catch {
      if (lifetime.current === token) {
        setError(true);
        setReviewReadError(true);
        setReviewLoaded(false);
      }
    } finally {
      if (lifetime.current === token) {
        reviewingRef.current = false;
        pendingRef.current = false;
        setPending(false);
      }
    }
  };
  const save = async (next?: () => void, options?: { bypassReviewLock?: boolean }) => {
    const currentState = stateRef.current;
    if (!currentState || pendingRef.current || !valid) return;
    if (reviewRequired && !options?.bypassReviewLock) return;
    if (legacyUsualReviewRef.current !== undefined) return;
    if (Object.keys(draftRef.current).length === 0) {
      close();
      leave(next ?? departureRef.current ?? onFinish);
      return;
    }
    const token = lifetime.current;
    let shouldAutoReview = false;
    pendingRef.current = true;
    setPending(true);
    setError(false);
    setReviewReadError(false);
    setUncertainSave(true);
    uncertainSaveRef.current = true;
    // Persist before issuing PUT: reload can retire this request before its reply settles.
    persistDraft(true);
    const days = Object.entries(draftRef.current).map(([day, count]) => ({
      date: DateOnly.parse(day)!,
      servings: count === null ? null : Number(count),
    }));
    try {
      const saved = await saveSupperServings({
        referenceWeekStartDate: currentState.referenceWeekStartDate,
        weekOffset:
          currentState.weekOffset ??
          weekOffsetFor(key, currentState.referenceWeekStartDate) ??
          weekOffset,
        expectedVersion: currentState.version,
        days,
      });
      if (lifetime.current !== token) return;
      const exitCallback = next ?? departureRef.current ?? onFinish;
      setState(saved);
      stateRef.current = saved;
      close();
      useWeekStore.setState({ groceryRefresh: saved.groceryRefresh });
      leave(exitCallback);
    } catch {
      if (lifetime.current === token) {
        if (next) {
          setDeparture(() => next);
          departureRef.current = next;
        }
        setError(true);
        setReviewRequired(true);
        setReviewLoaded(false);
        setReviewReadError(false);
        shouldAutoReview = true;
      }
    } finally {
      if (lifetime.current === token && !shouldAutoReview) {
        pendingRef.current = false;
        setPending(false);
      }
    }
    if (shouldAutoReview && lifetime.current === token) {
      reviewingRef.current = false;
      await review(next ?? departureRef.current ?? undefined);
    }
  };
  const attemptLeave = (next: () => void) => {
    if (pendingRef.current) return;
    if (!dirty && !reviewRequired && !uncertainSave && legacyUsualReview === undefined) {
      close();
      leave(next);
      return;
    }
    if (
      dirty &&
      valid &&
      !reviewRequired &&
      !error &&
      !uncertainSave &&
      legacyUsualReview === undefined
    ) {
      departureRef.current = next;
      void save(next);
      return;
    }
    setDeparture(() => next);
    departureRef.current = next;
    if (!valid) {
      const invalidInput = document.querySelector<HTMLInputElement>(
        '[data-testid="portions-editor"] [aria-invalid="true"]'
      );
      invalidInput?.focus();
    }
    if (
      (reviewRequired || uncertainSave || legacyUsualReview !== undefined) &&
      !reviewLoaded &&
      !reviewReadError &&
      !reviewingRef.current
    ) {
      void review(next);
    }
  };
  useLayoutEffect(() => {
    stateRef.current = state;
    draftRef.current = draft;
    legacyUsualReviewRef.current = legacyUsualReview;
    uncertainSaveRef.current = uncertainSave;
    departureRef.current = departure;
    reviewRef.current = review;
    attemptLeaveRef.current = attemptLeave;
  });
  const saveRecoveredDraft = () => {
    const hadLegacyOnly =
      legacyUsualReviewRef.current !== undefined && Object.keys(draftRef.current).length === 0;
    const exitNext = departureRef.current;
    setLegacyUsualReview(undefined);
    legacyUsualReviewRef.current = undefined;
    if (hadLegacyOnly) {
      close();
      leave(exitNext ?? onFinish);
      return;
    }
    if (!valid) return;
    setReviewRequired(false);
    setReviewLoaded(false);
    setReviewReadError(false);
    setUncertainSave(false);
    uncertainSaveRef.current = false;
    setError(false);
    void save(exitNext ?? undefined, { bypassReviewLock: true });
  };
  const freshness = useWeekStore((s) => s.groceryRefresh);
  useEffect(() => {
    if (freshness?.status !== 'updating') return;
    const timer = window.setInterval(() => {
      void useWeekStore.getState().refreshGroceries();
    }, 1500);
    return () => window.clearInterval(timer);
  }, [freshness?.status, weekOffset, reference]);
  const strip = (
    <div
      className={'mb-4 flex flex-wrap items-center gap-2 ' + focusClearance}
      data-testid="portions-mode-strip"
    >
      {editing ? (
        <Button
          type="button"
          variant="secondary"
          size="md"
          className="min-w-12 gap-2 rounded-full px-4 text-sm"
          data-testid="save-portions"
          disabled={
            pending || !state || !valid || reviewRequired || legacyUsualReview !== undefined
          }
          onClick={() => void save()}
        >
          <Calendar size={14} aria-hidden="true" />
          {t('navigation.recipes', 'Recipes')}
        </Button>
      ) : (
        <Button
          type="button"
          variant="secondary"
          size="md"
          className="min-w-12 gap-2 rounded-full px-4 text-sm"
          data-testid="at-the-table-mode"
          onClick={() => void open()}
        >
          <Utensils size={14} aria-hidden="true" />
          {t('portions.atTable', 'Portions')}
        </Button>
      )}
    </div>
  );
  const legacyOnlyEmpty = legacyUsualReview !== undefined && Object.keys(draft).length === 0;
  const rows = (
    <div className={'space-y-3.5 ' + focusClearance} data-testid="portions-editor">
      <div>
        <h2 className="font-heading text-xl font-bold text-ink-body">
          {t('portions.question', 'How many portions?')}
        </h2>
        <p className="text-sm text-ink-muted">
          {t('portions.leftovers', 'Include extra for leftovers')}
        </p>
      </div>
      {restored && !reviewRequired && (
        <p
          role="status"
          data-testid="portions-restored"
          className="rounded-2xl border border-garden-line bg-sage-50 px-4 py-3 text-sm font-medium text-garden-ink"
        >
          {t(
            'portions.restored',
            'Your unsaved portions are restored. Review them, then choose Recipes to save.'
          )}
        </p>
      )}
      {reviewRequired && reviewReadError && (
        <div
          role="alert"
          data-testid="portions-saved-review"
          className="space-y-3 rounded-2xl border border-hearth-line bg-terracotta-50 p-4 text-ink-body shadow-sm"
        >
          <p className="font-heading text-base font-bold text-hearth-ink">
            {t('portions.conflictHeading', 'Could not confirm your save')}
          </p>
          <p className="text-sm text-ink-body">
            {t('portions.readError', 'Could not check saved portions. Your edits are kept below.')}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="primary"
              size="md"
              className={cardButton}
              disabled={pending}
              data-testid="portions-retry-review"
              onClick={() => void review()}
            >
              {t('portions.retry', 'Retry')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="md"
              className={cardButton}
              disabled={pending}
              data-testid="portions-discard"
              onClick={() => {
                const exitNext = departureRef.current;
                close();
                leave(exitNext ?? onFinish);
              }}
            >
              {t('portions.discard', 'Discard changes')}
            </Button>
          </div>
        </div>
      )}
      {reviewRequired && reviewLoaded && !reviewReadError && (
        <div
          role="group"
          aria-label={t('portions.recoveryTitle', 'Review saved portions')}
          data-testid="portions-saved-review"
          className="space-y-3 rounded-2xl border border-hearth-line bg-terracotta-50 p-4 text-ink-body shadow-sm"
        >
          <p
            role={error ? 'alert' : undefined}
            className="font-heading text-base font-bold text-hearth-ink"
          >
            {error
              ? t('portions.conflictHeading', 'Could not confirm your save')
              : t('portions.recoveryTitle', 'Review saved portions')}
          </p>
          <p className="text-sm text-ink-body">
            {t(
              'portions.conflictBody',
              'Current saved portions are shown below. Adjust any date or save your edits directly.'
            )}
          </p>
          {legacyUsualReview !== undefined && (
            <div
              className="space-y-1.5 rounded-xl border border-chrome-line bg-white px-3 py-2 text-sm"
              data-testid="portions-legacy-usual-review"
            >
              <p className="font-semibold text-ink-body">{t('portions.usual', 'Usual portions')}</p>
              <p className="text-ink-muted">
                {t('portions.saved', 'Saved')}:{' '}
                {usual ?? t('portions.usualUnavailable', 'Usual portions unavailable')}
                {' · '}
                {t('portions.yourEdits', 'Your edits')}:{' '}
                {legacyUsualReview || t('portions.legacyUsualBlank', 'No usual portions set')}
              </p>
              <p className="text-ink-body">
                {t(
                  'portions.legacyUsualContext',
                  'This restored draft also included a usual portions change. Change usual portions in Settings, and keep only the date edits below.'
                )}
              </p>
            </div>
          )}
          {Object.entries(draft)
            .map(([day, count]) => ({
              label: day,
              saved: state?.days?.find((saved) => date(saved.date) === day)?.servings,
              local: count === null ? usual : count,
            }))
            .map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-chrome-line bg-white px-3 py-2 text-sm"
              >
                <p className="font-semibold text-ink-body">{item.label}</p>
                <p className="text-ink-muted">
                  {t('portions.saved', 'Saved')}:{' '}
                  {item.saved ?? t('portions.original', 'Original recipe quantities')} ·{' '}
                  {t('portions.yourEdits', 'Your edits')}:{' '}
                  {item.local ?? t('portions.original', 'Original recipe quantities')}
                </p>
              </div>
            ))}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="primary"
              size="md"
              className={cardButton}
              disabled={pending || (legacyOnlyEmpty ? false : !valid)}
              data-testid={departure ? 'portions-save-continue' : 'portions-save-recovered'}
              onClick={saveRecoveredDraft}
            >
              {legacyOnlyEmpty
                ? t('portions.keepDateDraft', 'Keep date edits only')
                : departure
                  ? t('portions.saveContinue', 'Save and continue')
                  : t('portions.savePortions', 'Save portions')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="md"
              className={cardButton}
              disabled={pending}
              data-testid="portions-discard"
              onClick={() => {
                const exitNext = departureRef.current;
                close();
                leave(exitNext ?? onFinish);
              }}
            >
              {t('portions.discard', 'Discard changes')}
            </Button>
          </div>
        </div>
      )}
      {departure && !reviewRequired && (
        <div
          role="alert"
          aria-label={t('portions.invalidExitTitle', 'Fix invalid portions before leaving')}
          data-testid="portions-departure"
          className="space-y-3 rounded-2xl border border-hearth-line bg-terracotta-50 p-4 text-ink-body shadow-sm"
        >
          <p className="font-heading text-base font-bold text-hearth-ink">
            {t('portions.invalidExitTitle', 'Fix invalid portions before leaving')}
          </p>
          <p className="text-sm text-ink-body">
            {t('portions.invalidCount', 'Choose a whole number from 1 to 2147483647.')}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="primary"
              size="md"
              className={cardButton}
              disabled={pending || !valid || reviewRequired}
              data-testid="portions-save-continue"
              onClick={() => void save(departure)}
            >
              {t('portions.saveContinue', 'Save and continue')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="md"
              className={cardButton}
              disabled={pending}
              data-testid="portions-discard"
              onClick={() => {
                const next = departure;
                close();
                leave(next ?? onFinish);
              }}
            >
              {t('portions.discard', 'Discard changes')}
            </Button>
          </div>
        </div>
      )}
      {error && !state && (
        <div
          role="alert"
          className="space-y-3 rounded-2xl border border-hearth-line bg-terracotta-50 p-4 text-ink-body shadow-sm"
        >
          <p className="text-sm font-medium text-hearth-ink">
            {t('portions.loadError', 'Could not load portions. Try again.')}
          </p>
          <Button
            type="button"
            variant="primary"
            size="md"
            className={cardButton}
            onClick={() => void open()}
          >
            {t('portions.retry', 'Retry')}
          </Button>
        </div>
      )}
      {state?.days?.map((day) => {
        const key = date(day.date);
        const meal = schedule.find((item) => item.date === key);
        const isToday = civilDate(key) !== null && !!resolvedToday && key === resolvedToday;
        const isPast = !!resolvedToday && civilDate(key) !== null && key < resolvedToday;
        const parsedDayDate = new Date(`${key}T12:00:00Z`);
        const localeCode = getLocale() === 'fr' ? 'fr-CA' : 'en-CA';
        const weekdayLabel = new Intl.DateTimeFormat(localeCode, {
          weekday: 'short',
          timeZone: 'UTC',
        }).format(parsedDayDate);
        const dayNumberLabel = parsedDayDate.getUTCDate();
        const monthLabel = parsedDayDate.toLocaleDateString(localeCode, {
          month: 'short',
          timeZone: 'UTC',
        });
        const hasDraft = Object.hasOwn(draft, key);
        const count = hasDraft ? (draft[key] === null ? usual : draft[key]) : day.servings;
        const value = count == null ? '' : String(count);
        const numericCount = count == null || value === '' ? null : Number(value);
        const isUpcomingPrepared =
          !isPast &&
          !day.editable &&
          meal?.status !== 3 &&
          (Boolean(meal?.preparation) || meal?.status === 2);
        const change = (value: string) =>
          setDraft((previous) => {
            const next = { ...previous };
            if (value === String(day.servings ?? '')) delete next[key];
            else next[key] = value;
            return next;
          });
        return (
          <div
            key={key}
            className="w-full"
            data-temporal={isToday ? 'today' : isPast ? 'past' : 'neutral'}
            data-testid={`portion-row-${key}`}
          >
            {isToday && (
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <p
                  data-testid="planner-today-label"
                  className="min-w-0 max-w-full text-sm leading-5 font-semibold text-hearth-ink break-words"
                >
                  {t('planner.today', 'Today')}
                </p>
                <span
                  data-testid="planner-today-separator"
                  aria-hidden="true"
                  className="h-px min-w-4 flex-1 bg-terracotta/15"
                />
              </div>
            )}
            <div className="flex w-full items-stretch gap-2">
              <div
                data-testid="planner-date"
                aria-current={isToday ? 'date' : undefined}
                className="relative flex w-10 max-w-[40px] shrink-0 flex-col items-center justify-center rounded-xl"
              >
                <time
                  dateTime={key}
                  aria-label={`${formatSupperPlanDate(key)} (${key})`}
                  data-testid="planner-date-marker"
                  className="flex w-full flex-col items-center justify-center rounded-xl py-2"
                >
                  <span className="mb-1 max-w-full break-all text-center text-xs font-bold leading-none tracking-normal text-ink-muted">
                    {weekdayLabel}
                  </span>
                  <span className="max-w-full break-all text-center font-heading text-lg font-extrabold leading-none text-ink-body">
                    {dayNumberLabel}
                  </span>
                  <span className="mt-1 max-w-full break-all text-center text-xs font-bold leading-none tracking-normal text-ink-muted">
                    {monthLabel}
                  </span>
                </time>
              </div>
              <div
                data-testid="planner-meal"
                className={`relative min-w-0 flex-1 rounded-2xl border border-white/20 ${isPast ? 'bg-cream shadow-none' : 'glass shadow-sm'}`}
              >
                <div className="flex min-h-[72px] flex-wrap items-center gap-2 px-[12px] py-2.5">
                  <div
                    className="flex h-[48px] w-[48px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-charcoal/5"
                    aria-label={
                      meal?.status === 3
                        ? nonCookingLabel(meal.nonCooking)
                        : t('portions.photo', 'Supper photo')
                    }
                  >
                    {meal?.status === 3 ? (
                      <NonCookingIcon kind={meal.nonCooking?.kind} />
                    ) : meal?.recipe?.image ? (
                      <Image
                        alt=""
                        src={getImageUrl(meal.recipe.image)}
                        width={56}
                        height={56}
                        unoptimized
                        className="h-full w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <Utensils aria-hidden="true" />
                    )}
                  </div>
                  {meal?.status === 3 ? (
                    <span className="text-sm font-semibold text-ink-muted">
                      {nonCookingLabel(meal.nonCooking)}
                    </span>
                  ) : day.editable ? (
                    <div
                      data-testid={`portion-controls-${key}`}
                      className="ml-auto flex min-w-0 max-w-full items-center justify-end"
                    >
                      <div
                        role="group"
                        aria-label={`${key} ${t('portions.portions', 'portions')}`}
                        className="inline-flex max-w-full items-center rounded-xl border border-chrome-line bg-white shadow-sm focus-within:ring-2 focus-within:ring-terracotta"
                      >
                        <button
                          type="button"
                          className="inline-flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-l-xl text-ink-body hover:bg-cream focus-visible:bg-terracotta-50 focus-visible:outline-2 focus-visible:outline-ink-body focus-visible:-outline-offset-2 disabled:opacity-40"
                          disabled={pending || Number(value) <= 1}
                          aria-label={`${t('portions.less', 'Fewer portions')} ${key}`}
                          onClick={() => change(String(Math.max(1, Number(value || 1) - 1)))}
                        >
                          <Minus size={18} aria-hidden="true" />
                        </button>
                        <label className="text-center text-sm">
                          <input
                            className="h-[48px] w-[64px] min-w-0 border-x border-chrome-line bg-transparent text-center tabular-nums text-ink-body outline-none focus-visible:bg-terracotta-50 focus-visible:outline-2 focus-visible:outline-ink-body focus-visible:-outline-offset-2"
                            type="number"
                            min={1}
                            max={2147483647}
                            inputMode="numeric"
                            value={value}
                            disabled={pending}
                            aria-label={`${key} ${t('portions.portions', 'portions')}`}
                            data-testid={`portion-input-${key}`}
                            aria-invalid={
                              (Object.hasOwn(draft, key) &&
                                draft[key] !== null &&
                                !validCount(value)) ||
                              undefined
                            }
                            aria-describedby={
                              Object.hasOwn(draft, key) && draft[key] !== null && !validCount(value)
                                ? `portion-error-${key}`
                                : undefined
                            }
                            onChange={(event) => change(event.target.value)}
                          />
                        </label>
                        <button
                          type="button"
                          className="inline-flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-r-xl text-ink-body hover:bg-cream focus-visible:bg-terracotta-50 focus-visible:outline-2 focus-visible:outline-ink-body focus-visible:-outline-offset-2 disabled:opacity-40"
                          disabled={pending || Number(value) >= 2147483647}
                          aria-label={`${t('portions.more', 'More portions')} ${key}`}
                          onClick={() => change(String(Number(value || 0) + 1))}
                        >
                          <Plus size={18} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ) : isUpcomingPrepared ? (
                    <div
                      data-testid={`portion-prepared-status-${key}`}
                      className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 pl-0.5"
                    >
                      <span className="text-sm font-semibold leading-tight text-garden-ink">
                        {t('cook.alreadyPrepared', 'Already prepared')}
                      </span>
                      {numericCount != null && Number.isFinite(numericCount) && (
                        <span
                          data-testid={`portion-prepared-count-${key}`}
                          className="text-xs font-medium leading-tight text-ink-muted tabular-nums"
                        >
                          {tWithVars(
                            numericCount === 1 ? 'portions.countOne' : 'portions.countOther',
                            numericCount === 1 ? '{{count}} portion' : '{{count}} portions',
                            { count: value }
                          )}
                        </span>
                      )}
                    </div>
                  ) : null}
                  {day.editable &&
                    Object.hasOwn(draft, key) &&
                    draft[key] !== null &&
                    !validCount(value) && (
                      <p
                        id={`portion-error-${key}`}
                        role="alert"
                        className="w-full text-sm font-medium text-hearth-ink"
                      >
                        {t('portions.invalidCount', 'Choose a whole number from 1 to 2147483647.')}
                      </p>
                    )}
                  {meal?.status !== 3 && day.editable && usual === null && (
                    <p className="w-full text-sm text-ink-muted">
                      {t('portions.usualUnavailable', 'Usual portions unavailable')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
  return { editing, strip, rows, requestDeparture, open };
}
