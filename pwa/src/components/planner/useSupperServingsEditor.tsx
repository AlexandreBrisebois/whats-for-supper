'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
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

const control =
  'min-h-[48px] min-w-[48px] rounded-xl border border-charcoal/15 bg-white px-4 text-charcoal focus-visible:outline-2 focus-visible:outline-terracotta';
// Let native focus scrolling clear the sticky week header and fixed navigation.
const focusClearance =
  '[&_button]:scroll-my-[calc(12rem+env(safe-area-inset-bottom))] [&_input]:scroll-my-[calc(12rem+env(safe-area-inset-bottom))]';

/** A local dated draft; server acknowledgement owns saved counts and grocery freshness. */
export function useSupperServingsEditor(
  weekOffset: number,
  reference: string | undefined,
  schedule: UILocalScheduleDay[],
  onFinish?: () => void
) {
  const [state, setState] = useState<SupperServings | null>(null);
  const calendarReference = useWeekStore((s) => s.calendar?.referenceWeekStartDate);
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
  const [uncertainSave, setUncertainSave] = useState(false);
  const [departure, setDeparture] = useState<(() => void) | null>(null);
  const historyOwner = useRef(false);
  const restoreOwner = useRef(0);
  const storageKey = `wfs-portions-draft:${key}`;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const date = (value: unknown) => String(value ?? '');
  const open = async () => {
    restoreOwner.current++;
    const token = lifetime.current;
    setEditingKey(key);
    setState(null);
    setError(false);
    setPending(true);
    try {
      const saved = await readSupperServings(weekOffset, anchor ?? undefined);
      if (lifetime.current === token) {
        setState(saved);
        setDraft({});
        setLegacyUsualReview(undefined);
      }
    } catch {
      if (lifetime.current === token) setError(true);
    } finally {
      if (lifetime.current === token) setPending(false);
    }
  };
  const usual = state?.defaultServings ?? null;
  const usualIsSingular =
    usual !== null && new Intl.PluralRules(getLocale()).select(usual) === 'one';
  const dirty = editing && (Object.keys(draft).length > 0 || legacyUsualReview !== undefined);
  const validCount = (value: string) =>
    /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 2147483647;
  const valid = Object.values(draft).every((value) => value === null || validCount(value));
  const close = () => {
    restoreOwner.current++;
    setDraft({});
    setLegacyUsualReview(undefined);
    setEditingKey(null);
    setError(false);
    setRestored(false);
    setReviewRequired(false);
    setReviewLoaded(false);
    setUncertainSave(false);
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
    if (dirty || pending) setDeparture(() => next);
    else next();
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
        setState(restoredState);
        setDraft(saved.draft);
        setLegacyUsualReview(legacyUsual);
        setEditingKey(key);
        setRestored(true);
        setUncertainSave(saved.uncertainSave === true);
        setReviewRequired(saved.uncertainSave === true || legacyUsual !== undefined);
        setReviewLoaded(false);
        setError(saved.uncertainSave === true);
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
      if (dirty || pending) setDeparture(() => next);
      else next();
    });
  }, [editing, dirty, pending]);
  useEffect(() => {
    if (!editing) return;
    const onBack = () => {
      if (!historyOwner.current) return;
      window.history.pushState(
        { ...window.history.state, portionsDraft: key },
        '',
        window.location.href
      );
      setDeparture(() => () => window.history.back());
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
  const review = async () => {
    const token = lifetime.current;
    setPending(true);
    try {
      const saved = await readSupperServings(
        state?.weekOffset ?? weekOffset,
        state ? String(state.referenceWeekStartDate) : reference
      );
      if (lifetime.current !== token) return;
      const matchesIntent =
        state &&
        String(saved.weekStartDate) === String(state.weekStartDate) &&
        Object.entries(draft).every(([day, count]) => {
          const current = saved.days?.find((item) => date(item.date) === day);
          return (
            current &&
            (current.overrideServings ?? null) === (count === null ? null : Number(count))
          );
        });
      if (uncertainSave && legacyUsualReview === undefined && matchesIntent) {
        close();
        setDeparture(null);
        if (useWeekStore.getState().schedule[0]?.date === String(saved.weekStartDate))
          useWeekStore.setState({ groceryRefresh: saved.groceryRefresh });
        leave(departure ?? onFinish);
        return;
      }
      setState(saved);
      setReviewLoaded(true);
      setRestored(false);
    } catch {
      if (lifetime.current === token) setError(true);
    } finally {
      if (lifetime.current === token) setPending(false);
    }
  };
  const save = async (next?: () => void) => {
    if (!state || pending || !valid || reviewRequired) return;
    if (!dirty) {
      close();
      leave(next ?? onFinish);
      return;
    }
    const token = lifetime.current;
    setPending(true);
    setError(false);
    setUncertainSave(true);
    // Persist before issuing PUT: reload can retire this request before its reply settles.
    persistDraft(true);
    const days = Object.entries(draft).map(([day, count]) => ({
      date: DateOnly.parse(day)!,
      servings: count === null ? null : Number(count),
    }));
    try {
      const saved = await saveSupperServings({
        referenceWeekStartDate: state.referenceWeekStartDate,
        weekOffset:
          state.weekOffset ?? weekOffsetFor(key, state.referenceWeekStartDate) ?? weekOffset,
        expectedVersion: state.version,
        days,
      });
      if (lifetime.current !== token) return;
      setState(saved);
      close();
      setDeparture(null);
      useWeekStore.setState({ groceryRefresh: saved.groceryRefresh });
      leave(next ?? onFinish);
    } catch {
      if (lifetime.current === token) {
        setError(true);
        setReviewRequired(true);
        setReviewLoaded(false);
      }
    } finally {
      if (lifetime.current === token) setPending(false);
    }
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
        <>
          <button
            className="inline-flex min-h-[48px] min-w-[48px] items-center gap-2 rounded-full bg-white/70 px-4 text-xs font-semibold text-charcoal shadow-sm transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-terracotta disabled:opacity-50"
            data-testid="save-portions"
            disabled={pending || !state || !valid || reviewRequired}
            onClick={() => void save()}
          >
            <Calendar size={14} aria-hidden="true" />
            {t('navigation.recipes', 'Recipes')}
          </button>
          {error && (
            <span role="alert">
              {t(
                'portions.saveError',
                'Could not confirm portions. Your edits are kept. Check saved portions before trying again.'
              )}
            </span>
          )}
        </>
      ) : (
        <>
          <button
            className="inline-flex min-h-[48px] min-w-[48px] items-center gap-2 rounded-full bg-white/70 px-4 text-xs font-semibold text-charcoal shadow-sm transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-terracotta"
            data-testid="at-the-table-mode"
            onClick={() => void open()}
          >
            <Utensils size={14} aria-hidden="true" />
            {t('portions.atTable', 'Portions')}
          </button>
        </>
      )}
    </div>
  );
  const rows = (
    <div className={'space-y-3 ' + focusClearance} data-testid="portions-editor">
      <div>
        <h2 className="font-semibold">{t('portions.question', 'How many portions?')}</h2>
        <p>{t('portions.leftovers', 'Include extra for leftovers')}</p>
      </div>
      {restored && (
        <p role="status" data-testid="portions-restored">
          {uncertainSave
            ? t(
                'portions.restoredUncertain',
                'Your portions edits are restored. Check saved portions before trying again.'
              )
            : t(
                'portions.restored',
                'Your unsaved portions are restored. Review them, then choose Recipes to save.'
              )}
        </p>
      )}
      {reviewRequired && !reviewLoaded && (
        <button
          className={control}
          disabled={pending}
          data-testid="portions-review"
          onClick={() => void review()}
        >
          {t('portions.review', 'Review saved portions')}
        </button>
      )}
      {reviewLoaded && (
        <div
          role="group"
          aria-label={t('portions.review', 'Review saved portions')}
          data-testid="portions-saved-review"
          className="space-y-3 rounded-2xl border border-terracotta/30 p-3"
        >
          <p>{t('portions.review', 'Review saved portions')}</p>
          {legacyUsualReview !== undefined && (
            <div className="space-y-2" data-testid="portions-legacy-usual-review">
              <p className="font-semibold">{t('portions.usual', 'Usual portions')}</p>
              <p>
                {t('portions.saved', 'Saved')}:{' '}
                {usual ?? t('portions.usualUnavailable', 'Usual portions unavailable')}
                {' · '}
                {t('portions.yourEdits', 'Your edits')}:{' '}
                {legacyUsualReview || t('portions.legacyUsualBlank', 'No usual portions set')}
              </p>
              <p>
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
              <div key={item.label}>
                <p className="font-semibold">{item.label}</p>
                <p>
                  {t('portions.saved', 'Saved')}:{' '}
                  {item.saved ?? t('portions.original', 'Original recipe quantities')} ·{' '}
                  {t('portions.yourEdits', 'Your edits')}:{' '}
                  {item.local ?? t('portions.original', 'Original recipe quantities')}
                </p>
              </div>
            ))}
          <button
            className={control}
            data-testid="portions-keep-draft"
            onClick={() => {
              setLegacyUsualReview(undefined);
              setReviewRequired(false);
              setUncertainSave(false);
              setReviewLoaded(false);
              setError(false);
            }}
          >
            {legacyUsualReview === undefined
              ? t('portions.keepDraft', 'Keep my edits')
              : t('portions.keepDateDraft', 'Keep date edits only')}
          </button>
        </div>
      )}
      {departure && (
        <div
          role="group"
          aria-label={t('portions.unsaved', 'Unsaved portions')}
          data-testid="portions-departure"
          className="flex flex-wrap gap-2 rounded-2xl border border-terracotta/30 p-3"
        >
          <p className="w-full">{t('portions.unsaved', 'Unsaved portions')}</p>
          <button
            className="min-h-[48px] rounded-xl bg-terracotta px-4 py-3 font-semibold text-white focus-visible:outline-2 focus-visible:outline-charcoal disabled:opacity-50"
            disabled={pending || !valid || reviewRequired}
            data-testid="portions-save-continue"
            onClick={() => void save(departure)}
          >
            {t('portions.saveContinue', 'Save and continue')}
          </button>
          <button
            className={control}
            disabled={pending}
            data-testid="portions-keep-editing"
            onClick={() => setDeparture(null)}
          >
            {t('portions.keepEditing', 'Keep editing')}
          </button>
          <button
            className="min-h-[48px] px-4 text-sm text-charcoal/70 underline underline-offset-4"
            disabled={pending}
            data-testid="portions-discard"
            onClick={() => {
              const next = departure;
              setDeparture(null);
              close();
              leave(next ?? onFinish);
            }}
          >
            {t('portions.discard', 'Discard changes')}
          </button>
        </div>
      )}
      {error && !state && (
        <button className={control} onClick={() => void open()}>
          {t('portions.retry', 'Retry')}
        </button>
      )}
      {state?.days?.map((day) => {
        const key = date(day.date);
        const meal = schedule.find((item) => item.date === key);
        const override = Object.hasOwn(draft, key) ? draft[key] : day.overrideServings;
        const value =
          override != null
            ? String(override)
            : day.editable && (usual != null || Object.hasOwn(draft, key))
              ? usual == null
                ? ''
                : String(usual)
              : day.servings == null
                ? ''
                : String(day.servings);
        const change = (value: string | null) =>
          setDraft((previous) => {
            const next = { ...previous };
            const unchanged =
              value === null
                ? day.overrideServings == null
                : value === String(day.overrideServings ?? usual ?? day.servings ?? '');
            if (unchanged) delete next[key];
            else next[key] = value;
            return next;
          });
        return (
          <div
            key={key}
            className={`flex flex-wrap items-center gap-1 rounded-2xl p-2 sm:gap-2 sm:p-3 ${!day.editable && meal?.status !== 3 ? 'bg-charcoal/10 grayscale' : 'bg-white/70'}`}
            data-testid={`portion-row-${key}`}
          >
            <time
              dateTime={key}
              aria-label={`${formatSupperPlanDate(key)} (${key})`}
              className="w-12 shrink-0 text-sm sm:w-[96px]"
            >
              {new Intl.DateTimeFormat(getLocale() === 'fr' ? 'fr-CA' : 'en-CA', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                timeZone: 'UTC',
              }).format(new Date(`${key}T12:00:00Z`))}
            </time>
            <div
              className="flex h-[48px] w-[48px] shrink-0 sm:h-[56px] sm:w-[56px] items-center justify-center overflow-hidden rounded-xl bg-charcoal/5"
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
            {meal?.status !== 3 ? (
              <div className="inline-flex items-center gap-2">
                <div
                  role="group"
                  aria-label={`${key} ${t('portions.portions', 'portions')}`}
                  aria-describedby={
                    meal?.status === 2 && !day.editable ? `portion-cooked-${key}` : undefined
                  }
                  className={`inline-flex items-center rounded-xl border border-charcoal/15 bg-white shadow-sm focus-within:ring-2 focus-within:ring-terracotta ${!day.editable ? 'opacity-60' : ''}`}
                >
                  <button
                    className="inline-flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-l-xl text-charcoal hover:bg-cream focus-visible:bg-terracotta-50 focus-visible:outline-2 focus-visible:outline-terracotta focus-visible:-outline-offset-2 disabled:opacity-40"
                    disabled={!day.editable || pending || Number(value) <= 1}
                    aria-label={`${t('portions.less', 'Fewer portions')} ${key}`}
                    onClick={() => change(String(Math.max(1, Number(value || 1) - 1)))}
                  >
                    <Minus size={18} />
                  </button>
                  <label className="text-center text-sm">
                    <input
                      className="h-[48px] w-[64px] min-w-0 border-x border-charcoal/15 bg-transparent text-center tabular-nums outline-none focus-visible:bg-terracotta-50 focus-visible:outline-2 focus-visible:outline-terracotta focus-visible:-outline-offset-2"
                      type="number"
                      min={1}
                      max={2147483647}
                      inputMode="numeric"
                      value={value}
                      disabled={!day.editable || pending}
                      aria-label={`${key} ${t('portions.portions', 'portions')}`}
                      data-testid={`portion-input-${key}`}
                      aria-invalid={
                        (day.editable &&
                          Object.hasOwn(draft, key) &&
                          draft[key] !== null &&
                          !validCount(value)) ||
                        undefined
                      }
                      aria-describedby={
                        day.editable &&
                        Object.hasOwn(draft, key) &&
                        draft[key] !== null &&
                        !validCount(value)
                          ? `portion-error-${key}`
                          : undefined
                      }
                      onChange={(event) => change(event.target.value)}
                    />
                  </label>
                  <button
                    className="inline-flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-r-xl text-charcoal hover:bg-cream focus-visible:bg-terracotta-50 focus-visible:outline-2 focus-visible:outline-terracotta focus-visible:-outline-offset-2 disabled:opacity-40"
                    disabled={!day.editable || pending || Number(value) >= 2147483647}
                    aria-label={`${t('portions.more', 'More portions')} ${key}`}
                    onClick={() => change(String(Number(value || 0) + 1))}
                  >
                    <Plus size={18} />
                  </button>
                </div>
                {meal?.status === 2 && !day.editable && (
                  <span
                    id={`portion-cooked-${key}`}
                    className="text-sm font-semibold text-charcoal-600"
                  >
                    {t('cook.cooked', 'Cooked')}
                  </span>
                )}
              </div>
            ) : (
              <span>{nonCookingLabel(meal.nonCooking)}</span>
            )}
            {day.editable &&
              Object.hasOwn(draft, key) &&
              draft[key] !== null &&
              !validCount(value) && (
                <p
                  id={`portion-error-${key}`}
                  role="alert"
                  className="w-full text-sm text-terracotta-700"
                >
                  {t('portions.invalidCount', 'Choose a whole number from 1 to 2147483647.')}
                </p>
              )}
            {meal?.status !== 3 &&
              usual !== null &&
              (day.overrideServings != null ||
                (Object.hasOwn(draft, key) && draft[key] !== null)) && (
                <button
                  className={control + ' ml-auto text-sm disabled:opacity-60'}
                  data-testid={`reset-portions-${key}`}
                  disabled={!day.editable || pending}
                  aria-label={tWithVars(
                    usualIsSingular ? 'portions.resetUsualOne' : 'portions.resetUsual',
                    usualIsSingular
                      ? 'Use usual {{count}} portion for {{date}}'
                      : 'Use usual {{count}} portions for {{date}}',
                    { count: usual, date: formatSupperPlanDate(key) }
                  )}
                  onClick={() => change(null)}
                >
                  {usual}
                </button>
              )}
            {meal?.status !== 3 && day.editable && usual === null && (
              <p className="w-full text-sm text-charcoal/70">
                {t('portions.usualUnavailable', 'Usual portions unavailable')}
              </p>
            )}
            {meal?.status !== 3 && day.editable && usual !== null && draft[key] === null && (
              <p role="status" className="w-full text-sm text-charcoal/70">
                {tWithVars(
                  usualIsSingular ? 'portions.usingUsualOne' : 'portions.usingUsual',
                  usualIsSingular
                    ? 'Using usual {{count}} portion'
                    : 'Using usual {{count}} portions',
                  { count: usual }
                )}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
  return { editing, strip, rows, requestDeparture, open };
}
