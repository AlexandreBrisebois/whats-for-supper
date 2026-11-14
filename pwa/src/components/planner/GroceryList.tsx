'use client';
import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import Link from 'next/link';
import { DateOnly } from '@microsoft/kiota-abstractions';
import { getSchedule } from '@/lib/api/planner';
import {
  beginGroceryIntent,
  finishGroceryIntent,
  enqueueGroceryIntent,
  currentGroceryVersion,
  rememberGroceryVersion,
  overlayGroceryIntents,
  isLatestGroceryIntent,
} from '@/lib/grocery/rowState';
import { useGroceryRecipeTitles } from './useGroceryRecipeTitles';
import { demoSession } from '@/lib/api/demo-session';
import { useFamilyStore } from '@/store/familyStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Edit3,
  Plus,
  LoaderCircle,
  ShoppingCart,
  Tag,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePlannerStore } from '@/store/plannerStore';
import { t, tWithVars } from '@/locales';
import { useLocale } from '@/components/common/LocaleProvider';
import type { GrocerySection } from '@/lib/grocery/aisleMapper';
import { AISLE_ORDER } from '@/lib/grocery/aisleOrder';
import { useSchedule } from '@/lib/api/schedule';
import { refreshSupperGroceries } from '@/lib/api/supper-servings';
import { reclassifyIngredient } from '@/lib/api/ingredients';
import { reclassifyFoodCategory } from '@/lib/api/foods';
import type { GroceryExtraDto, GroceryLineItemDto } from '@/lib/api/generated/models';
import { useWeekStore } from '@/store/weekStore';
import { useUiStore } from '@/store/uiStore';
import {
  createGroceryExtra,
  deleteGroceryExtra,
  suggestGroceryExtraNames,
  updateGroceryExtra,
} from '@/lib/api/grocery-extras';
import { absoluteMonday, weekOffsetFor } from '@/lib/deployment-calendar';

interface GroceryListProps {
  weekOffset: number;
  items: GroceryLineItemDto[];
  extras?: GroceryExtraDto[];
  onClose?: () => void;
  isEmbedded?: boolean;
}

const AISLE_ICONS: Record<GrocerySection, string> = {
  Produce: '🥬',
  Deli: '🥪',
  Bakery: '🍞',
  Meat: '🍖',
  Seafood: '🐟',
  'Dairy & Eggs': '🥛',
  Frozen: '🧊',
  Pantry: '🥫',
  Beverages: '🧃',
  Grocery: '🛒',
};

function categoryCorrectionKey(item: GroceryLineItemDto) {
  return item.categoryScope === 'food'
    ? `food:${item.foodId ?? item.rowId ?? ''}`
    : (item.normalizedKey ?? '');
}

const CATEGORY_BUTTON_CLASS =
  'min-h-12 min-w-12 shrink-0 rounded-full text-charcoal/60 hover:bg-charcoal/5 focus-visible:outline-2 focus-visible:outline-sage';

function formatQuantityHint(
  quantity: GroceryLineItemDto['quantity'],
  unitText: string | null | undefined
) {
  if (quantity == null) return null;

  const amount = quantity as {
    kind?: string;
    value?: { n?: string; d?: string };
    min?: { n?: string; d?: string };
    max?: { n?: string; d?: string };
  };
  const scalar = (value?: { n?: string; d?: string }) => {
    if (!value?.n || !value.d) return null;
    const number = Number(value.n) / Number(value.d);
    if (!Number.isFinite(number)) return null;
    return Number.isInteger(number) ? String(number) : number.toFixed(3).replace(/\.?0+$/, '');
  };
  const minimum = scalar(amount.kind === 'scalar' ? amount.value : amount.min);
  const maximum = amount.kind === 'range' ? scalar(amount.max) : null;
  if (minimum === null || (amount.kind === 'range' && maximum === null)) return null;
  return `(${minimum}${maximum !== null ? `–${maximum}` : ''}${unitText?.trim() ? ` ${unitText}` : ''})`;
}

function matchesOccurrenceIdentity(candidate: GroceryExtraDto, expected: GroceryExtraDto) {
  return (
    candidate.id === expected.id &&
    String(candidate.occurrenceWeekStartDate ?? '') ===
      String(expected.occurrenceWeekStartDate ?? '')
  );
}

function grocerySourceKey(aisle: string, item: GroceryLineItemDto, index: number) {
  return (
    item.rowId ??
    `${aisle}\u0000${item.normalizedKey ?? ''}\u0000${item.unitText ?? ''}\u0000${index}`
  );
}

export function GroceryList({
  weekOffset,
  items,
  extras = [],
  onClose,
  isEmbedded,
}: GroceryListProps) {
  const { locale } = useLocale();
  const { groceryState, setGroceryItemToggle } = usePlannerStore();
  const [reviewSelection, setReviewSelection] = useState<{
    scope: string;
    key: string;
    attempt: number;
  } | null>(null);
  const sourceOpenAttempt = useRef(0);
  const servingRefresh = useWeekStore((s) => s.groceryRefresh);
  const summary = servingRefresh?.resetSummaryVersion;
  const weekStartDate = useWeekStore((state) => state.weekStartDate);
  const noticeKey = weekStartDate ? `serving-grocery-summary:${weekStartDate}` : null;
  const [dismissedSummaries, setDismissedSummaries] = useState<Record<string, string>>({});
  let dismissedSummary: string | null = dismissedSummaries[weekStartDate ?? ''] ?? null;
  if (!dismissedSummary && noticeKey && typeof window !== 'undefined') {
    try {
      dismissedSummary = sessionStorage.getItem(noticeKey);
    } catch {
      /* Storage is optional; the list and local dismissal remain usable. */
    }
  }
  const [refreshError, setRefreshError] = useState(false);
  const retryPortions = async () => {
    setRefreshError(false);
    const week = useWeekStore.getState().schedule[0]?.date;
    const member = useFamilyStore.getState().selectedFamilyMemberId;
    const generation = demoSession.generation;
    if (!week) return;
    const ownsReply = () => {
      const current = useWeekStore.getState();
      const freshness = current.groceryRefresh;
      // A fresh GET can replace the object without changing the captured work.
      // New input, progress or replacement workflows still retire this reply.
      const sameWork =
        freshness === servingRefresh ||
        Boolean(
          servingRefresh?.version &&
          freshness?.version === servingRefresh.version &&
          freshness.status === servingRefresh.status &&
          freshness.appliedVersion === servingRefresh.appliedVersion &&
          freshness.resetSummaryVersion === servingRefresh.resetSummaryVersion &&
          freshness.workflowId === servingRefresh.workflowId
        );
      return (
        current.schedule[0]?.date === week &&
        sameWork &&
        useFamilyStore.getState().selectedFamilyMemberId === member &&
        demoSession.generation === generation &&
        !demoSession.resetRequired
      );
    };
    try {
      await refreshSupperGroceries(week);
      if (ownsReply())
        useWeekStore.setState((state) => ({
          groceryRefresh: { ...state.groceryRefresh, status: 'updating' },
        }));
    } catch {
      if (ownsReply()) setRefreshError(true);
    }
  };

  const { toggleGroceryItem } = useSchedule();
  const [errorItems, setErrorItems] = useState<Set<string>>(new Set());
  const [reclassifyOpen, setReclassifyOpen] = useState<string | null>(null);
  const [reclassifyErrors, setReclassifyErrors] = useState<Set<string>>(new Set());
  const [pendingReclassifications, setPendingReclassifications] = useState<Set<string>>(new Set());
  const reclassifyGroceryItem = useWeekStore((state) => state.reclassifyGroceryItem);
  const upsertExtra = useWeekStore((state) => state.upsertGroceryExtra);
  const removeExtra = useWeekStore((state) => state.removeGroceryExtra);
  const setGroceryExtraPending = useWeekStore((state) => state.setGroceryExtraPending);
  const addToast = useUiStore((state) => state.addToast);
  const storePendingExtras = useWeekStore((state) => state.pendingGroceryExtraIds);
  const referenceWeekStartDate = useWeekStore((state) => state.calendar?.referenceWeekStartDate);
  useEffect(() => {
    void useWeekStore.getState().refreshGroceries();
  }, [weekOffset, weekStartDate, referenceWeekStartDate]);
  const currentWeekStartDate = useWeekStore((state) => state.calendar?.currentWeekStartDate);
  const [extraName, setExtraName] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [composerFocused, setComposerFocused] = useState(false);
  const [suggestionError, setSuggestionError] = useState(false);
  const [addState, setAddState] = useState<'idle' | 'pending' | 'error'>('idle');
  const [editingExtra, setEditingExtra] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [pendingExtras, setPendingExtras] = useState<Set<string>>(new Set());
  const [extraErrors, setExtraErrors] = useState<Set<string>>(new Set());
  const suggestionGeneration = useRef(0);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const createAttempt = useRef<{ name: string; week: string; clientId: string } | null>(null);
  const editButtons = useRef(new Map<string, HTMLButtonElement>());
  const checklistRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const checkFocus = useRef<{
    control: HTMLButtonElement;
    adjacent: HTMLElement[];
    keyboard: boolean;
    week: string | null;
    scrollTop: number;
  } | null>(null);
  const preserveCheckFocus = (control: HTMLButtonElement, keyboard: boolean) => {
    if (document.activeElement !== control) return;
    const controls = Array.from(
      checklistRef.current?.querySelectorAll<HTMLButtonElement>('[role="checkbox"]') ?? []
    ).filter((button) => !button.closest('[hidden]'));
    const index = controls.indexOf(control);
    checkFocus.current = {
      control,
      adjacent: [...controls.slice(index + 1), ...controls.slice(0, index).reverse()],
      keyboard,
      week: weekStartDate,
      scrollTop: scrollRef.current?.scrollTop ?? 0,
    };
  };
  useLayoutEffect(() => {
    const intent = checkFocus.current;
    checkFocus.current = null;
    if (!intent || intent.week !== weekStartDate) return;
    // Never steal focus from a later user action. DOM reordering/removal can
    // return focus to body even though the initiating control was focused.
    if (document.activeElement !== document.body && document.activeElement !== intent.control)
      return;
    const target = intent.control.isConnected
      ? intent.control
      : intent.keyboard
        ? (intent.adjacent.find((control) => control.isConnected) ?? headingRef.current)
        : null;
    if (target && document.activeElement !== target) target.focus({ preventScroll: true });
    if (scrollRef.current) scrollRef.current.scrollTop = intent.scrollTop;
  });
  const composerIsEligible =
    absoluteMonday(weekStartDate) !== null &&
    absoluteMonday(weekStartDate) === absoluteMonday(currentWeekStartDate);

  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (!composerRef.current?.contains(event.target as Node)) {
        setSuggestionsOpen(false);
        setActiveSuggestion(-1);
      }
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, []);

  useEffect(() => {
    const query = extraName.trim();
    const generation = ++suggestionGeneration.current;
    if (!composerIsEligible || !composerFocused || query.length < 2) {
      // Reset transient lookup state when the field no longer qualifies.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuggestions([]);
      setSuggestionsOpen(false);
      setSuggestionError(false);
      return;
    }
    const timer = window.setTimeout(() => {
      void suggestGroceryExtraNames(query)
        .then((names) => {
          if (generation !== suggestionGeneration.current) return;
          setSuggestions(names.slice(0, 3));
          setSuggestionsOpen(names.length > 0);
          setActiveSuggestion(-1);
          setSuggestionError(false);
        })
        .catch(() => {
          if (generation !== suggestionGeneration.current) return;
          setSuggestions([]);
          setSuggestionsOpen(false);
          setSuggestionError(true);
        });
    }, 200);
    return () => window.clearTimeout(timer);
  }, [composerFocused, composerIsEligible, extraName]);

  const markExtraPending = (id: string, pending: boolean) => {
    setGroceryExtraPending(id, pending);
    setPendingExtras((current) => {
      const next = new Set(current);
      pending ? next.add(id) : next.delete(id);
      return next;
    });
  };
  const markExtraError = (id: string) => setExtraErrors((current) => new Set(current).add(id));

  const mutateExtra = async (
    extra: GroceryExtraDto,
    change: { name: string } | { checked: boolean } | { grocerySection: string },
    checkControl?: { element: HTMLButtonElement; keyboard: boolean }
  ) => {
    const id = extra.id;
    if (!id || pendingExtras.has(id)) return;
    const selectedWeekAtStart = useWeekStore.getState().weekStartDate;
    markExtraPending(id, true);
    setExtraErrors((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    const isProjectedAtStart =
      absoluteMonday(selectedWeekAtStart) !==
      absoluteMonday(String(extra.occurrenceWeekStartDate ?? ''));
    if ('checked' in change && change.checked && isProjectedAtStart) removeExtra(id);
    else if ('checked' in change) upsertExtra({ ...extra, ...change } as GroceryExtraDto);
    try {
      const authoritative = await updateGroceryExtra(extra, change);
      if (checkControl) preserveCheckFocus(checkControl.element, checkControl.keyboard);
      if (!matchesOccurrenceIdentity(authoritative, extra)) {
        markExtraError(id);
        markExtraPending(id, false);
        await useWeekStore.getState().sync();
        return;
      }
      const selectedWeek = useWeekStore.getState().weekStartDate;
      const isProjected =
        absoluteMonday(selectedWeek) !==
        absoluteMonday(String(authoritative.occurrenceWeekStartDate ?? ''));
      if (isProjected && authoritative.checked) removeExtra(id);
      else upsertExtra(authoritative);
      if ('name' in change) {
        setEditingExtra(null);
        requestAnimationFrame(() => editButtons.current.get(id)?.focus({ preventScroll: true }));
      }
      if ('grocerySection' in change) setReclassifyOpen(null);
    } catch (error) {
      if (checkControl) preserveCheckFocus(checkControl.element, checkControl.keyboard);
      const conflict = error as { current?: GroceryExtraDto | null; absent?: boolean };
      if (conflict.current && matchesOccurrenceIdentity(conflict.current, extra))
        upsertExtra(conflict.current);
      else if (conflict.absent) removeExtra(id);
      else upsertExtra(extra);
      markExtraError(id);
      markExtraPending(id, false);
      await useWeekStore.getState().sync();
    } finally {
      markExtraPending(id, false);
    }
  };

  const handleDeleteExtra = async (extra: GroceryExtraDto) => {
    if (!extra.id || pendingExtras.has(extra.id)) return;
    const id = extra.id;
    removeExtra(id);
    markExtraPending(id, true);
    try {
      await deleteGroceryExtra(extra);
      setEditingExtra(null);
    } catch (error) {
      const conflict = error as { current?: GroceryExtraDto | null; absent?: boolean };
      if (conflict.current && matchesOccurrenceIdentity(conflict.current, extra))
        upsertExtra(conflict.current);
      else if (!conflict.absent) upsertExtra(extra);
      markExtraError(id);
      markExtraPending(id, false);
      await useWeekStore.getState().sync();
    } finally {
      markExtraPending(id, false);
    }
  };

  const handleAddExtra = async () => {
    const name = extraName.trim();
    if (!name || !weekStartDate || !composerIsEligible || addState === 'pending') return;
    const attempt =
      createAttempt.current?.name === name && createAttempt.current.week === weekStartDate
        ? createAttempt.current
        : { name, week: weekStartDate, clientId: crypto.randomUUID() };
    createAttempt.current = attempt;
    setAddState('pending');
    setSuggestionsOpen(false);
    try {
      const extra = await createGroceryExtra(attempt.name, attempt.week, attempt.clientId);
      if (
        extra.id !== attempt.clientId ||
        String(extra.occurrenceWeekStartDate ?? '') !== attempt.week
      ) {
        await useWeekStore.getState().sync();
        setAddState('error');
        inputRef.current?.focus();
        return;
      }
      upsertExtra(extra);
      addToast({
        type: 'success',
        message: tWithVars('grocery.extraSavedToSection', 'Saved to {{section}}', {
          section: extra.grocerySection ?? 'Grocery',
        }),
      });
      createAttempt.current = null;
      setExtraName('');
      setSuggestions([]);
      setAddState('idle');
      inputRef.current?.focus();
    } catch (error) {
      await useWeekStore.getState().sync();
      // Confirmed removal ends the old submission. Another explicit Add may
      // deliberately create a fresh occurrence; uncertain outcomes retain the ID.
      if ((error as { absent?: boolean }).absent) createAttempt.current = null;
      setAddState('error');
      inputRef.current?.focus();
    }
  };

  const extrasBySection = useMemo(() => {
    const result: Partial<Record<GrocerySection, GroceryExtraDto[]>> = {};
    for (const extra of extras) {
      const candidate = (extra.grocerySection ?? 'Grocery') as GrocerySection;
      const section = AISLE_ORDER.includes(candidate) ? candidate : 'Grocery';
      (result[section] ??= []).push(extra);
    }
    return result;
  }, [extras]);
  const grouped = useMemo(() => {
    const result: Partial<Record<GrocerySection, GroceryLineItemDto[]>> = {};
    for (const item of items) {
      const section = (item.section ?? 'Grocery') as GrocerySection;
      const bucket = AISLE_ORDER.includes(section) ? section : 'Grocery';
      if (!result[bucket]) result[bucket] = [];
      result[bucket]!.push(item);
    }
    return result;
  }, [items]);
  const sourceSchedule = useWeekStore((state) => state.schedule);
  const memberContext = useFamilyStore((state) => state.selectedFamilyMemberId);
  const demoReset = useSyncExternalStore(
    demoSession.subscribe,
    demoSession.getSnapshot,
    () => false
  );
  // Only bounded, known week context may travel with original-source review.
  const sourceReturnOffset = weekOffsetFor(weekStartDate, referenceWeekStartDate);
  const sourceReturnParams =
    sourceReturnOffset !== null &&
    Number.isSafeInteger(sourceReturnOffset) &&
    Math.abs(sourceReturnOffset) <= 520 &&
    referenceWeekStartDate &&
    absoluteMonday(referenceWeekStartDate) !== null
      ? `&${new URLSearchParams({ sourceGroceryWeekOffset: String(sourceReturnOffset), sourceGroceryReferenceWeekStartDate: referenceWeekStartDate })}`
      : '';
  const sourceScope = JSON.stringify([
    weekOffset,
    weekStartDate,
    referenceWeekStartDate,
    memberContext,
    demoSession.generation,
    demoReset,
  ]);
  const reviewKey = reviewSelection?.scope === sourceScope ? reviewSelection.key : null;
  const setReviewKey = (key: string | null) =>
    setReviewSelection(
      key === null ? null : { scope: sourceScope, key, attempt: ++sourceOpenAttempt.current }
    );
  const loadedSourceNames = useMemo(
    () =>
      Object.fromEntries(
        sourceSchedule.flatMap((day) =>
          day.recipe?.id && day.recipe.name?.trim()
            ? [[String(day.recipe.id), day.recipe.name.trim()]]
            : []
        )
      ),
    [sourceSchedule]
  );
  const openSourceIds = Object.entries(grouped)
    .flatMap(([aisle, rows]) =>
      (rows ?? []).flatMap((item, index) =>
        grocerySourceKey(aisle, item, index) === reviewKey ? (item.recipeIds ?? []) : []
      )
    )
    .filter((id): id is string => typeof id === 'string' && id.length > 0);
  const allSourceIds = items
    .flatMap((item) => item.recipeIds ?? [])
    .filter((id): id is string => typeof id === 'string' && id.length > 0);
  const sourceTitles = useGroceryRecipeTitles(
    sourceScope,
    allSourceIds,
    openSourceIds,
    reviewSelection?.attempt ?? 0,
    loadedSourceNames,
    demoReset
  );

  const completedAisles = useMemo(
    () =>
      new Set(
        AISLE_ORDER.filter((aisle) => {
          const aisleItems = grouped[aisle] ?? [];
          const aisleExtras = extrasBySection[aisle] ?? [];
          return (
            aisleItems.length + aisleExtras.length > 0 &&
            aisleItems.every((item) => groceryState[item.rowId ?? '']) &&
            aisleExtras.every((extra) => extra.checked)
          );
        })
      ),
    [extrasBySection, grouped, groceryState]
  );
  const [collapsedAisles, setCollapsedAisles] = useState<Set<GrocerySection>>(
    () => new Set(completedAisles)
  );

  useEffect(() => {
    const collapseCompletedAislesOnReturn = () => {
      if (document.visibilityState !== 'visible') return;

      setCollapsedAisles((current) => {
        const next = new Set(current);
        let changed = false;
        completedAisles.forEach((aisle) => {
          if (!next.has(aisle)) {
            next.add(aisle);
            changed = true;
          }
        });
        return changed ? next : current;
      });
    };

    document.addEventListener('visibilitychange', collapseCompletedAislesOnReturn);
    return () => document.removeEventListener('visibilitychange', collapseCompletedAislesOnReturn);
  }, [completedAisles]);

  const handleToggle = async (item: GroceryLineItemDto) => {
    const captured = useWeekStore.getState();
    const week = absoluteMonday(item.weekStartDate) ?? captured.weekStartDate;
    const reference = captured.calendar?.referenceWeekStartDate;
    const id = item.rowId;
    if (!id || !week || !reference || !item.rowVersion) return;
    const intended = !usePlannerStore.getState().groceryState[id];
    const intentEpoch = captured.groceryPresentationEpoch;
    const currentEpoch = () => useWeekStore.getState().groceryPresentationEpoch === intentEpoch;
    const token = beginGroceryIntent(week, id, intended);
    setErrorItems((previous) => {
      const next = new Set(previous);
      next.delete(id);
      return next;
    });
    setGroceryItemToggle(id, intended);
    const reconcile = () => {
      const state = useWeekStore.getState();
      if (state.weekStartDate === week && state.groceryVersionWeek === week)
        usePlannerStore
          .getState()
          .setGroceryState(overlayGroceryIntents(week, state.authoritativeGroceryChecks));
    };
    try {
      await enqueueGroceryIntent(week, id, async () => {
        if (!currentEpoch()) return;
        const current = useWeekStore.getState();
        const row =
          current.weekStartDate === week
            ? current.groceryItems.find((row) => row.rowId === id)
            : undefined;
        try {
          const outcome = await toggleGroceryItem(
            weekOffset,
            {
              rowId: id,
              weekStartDate: DateOnly.parse(week)!,
              checked: intended,
              expectedPresentationEpoch: intentEpoch,
              expectedRowVersion: currentGroceryVersion(
                week,
                id,
                row?.rowVersion ?? item.rowVersion!
              ),
              clientMutationId: crypto.randomUUID(),
            },
            reference
          );
          if (!currentEpoch()) return;
          if (!outcome?.rowVersion || !outcome.listVersion || !outcome.rows || !outcome.checks)
            throw new Error('Missing authoritative grocery outcome.');
          rememberGroceryVersion(week, id, outcome.rowVersion);
          useWeekStore.getState().applyGrocerySnapshot({
            weekStartDate: outcome.weekStartDate,
            groceryListVersion: outcome.listVersion,
            presentationVersion: outcome.presentationVersion ?? undefined,
            presentationEpoch: outcome.presentationEpoch ?? undefined,
            groceryItems: outcome.rows,
            groceryState: outcome.checks,
          });
        } catch (error) {
          if (!currentEpoch()) return;
          // Unknown replies are read before any later queued intention. Never
          // automatically replay the failed mutation or restore a whole old map.
          try {
            const expectedPresentationEpoch = useWeekStore.getState().groceryPresentationEpoch;
            const snapshot = await getSchedule(weekOffset, reference, true);
            if (!currentEpoch()) return;
            if (
              snapshot &&
              useWeekStore
                .getState()
                .applyGrocerySnapshot(snapshot, { expectedPresentationEpoch }) &&
              currentEpoch()
            ) {
              const authoritative = snapshot.groceryItems?.find((row) => row.rowId === id);
              if (authoritative?.rowVersion)
                rememberGroceryVersion(week, id, authoritative.rowVersion);
            }
          } catch {
            /* Keep the last confirmed state and an explicit row error. */
          }
          throw error;
        }
      });
    } catch (error) {
      console.error('Failed to save grocery state:', error);
      if (
        useWeekStore.getState().weekStartDate === week &&
        isLatestGroceryIntent(week, id, token)
      ) {
        setErrorItems((previous) => new Set(previous).add(id));
        setTimeout(
          () =>
            setErrorItems((previous) => {
              const next = new Set(previous);
              next.delete(id);
              return next;
            }),
          3000
        );
      }
    } finally {
      finishGroceryIntent(week, id, token);
      reconcile();
    }
  };

  const handleReclassify = async (item: GroceryLineItemDto, newSection: GrocerySection) => {
    const normalizedKey = item.normalizedKey;
    const categoryKey = categoryCorrectionKey(item);
    if (!categoryKey || pendingReclassifications.has(categoryKey)) return;
    if (item.section === newSection && item.categoryStatus !== 'conflict') {
      setReclassifyOpen(null);
      return;
    }

    const startingWeek = weekOffset;
    const startingWeekStart = useWeekStore.getState().weekStartDate;
    setPendingReclassifications((prev) => new Set(prev).add(categoryKey));
    try {
      if (item.categoryScope === 'food') {
        if (!item.foodId || item.categoryRevision === undefined)
          throw new Error('Food category authority is unavailable.');
        await reclassifyFoodCategory(item.foodId, newSection, item.categoryRevision);
        if (
          useWeekStore.getState().weekOffset === startingWeek &&
          useWeekStore.getState().weekStartDate === startingWeekStart
        )
          await useWeekStore.getState().refreshGroceries();
      } else {
        if (!normalizedKey) throw new Error('Ingredient category authority is unavailable.');
        await reclassifyIngredient(normalizedKey, newSection);
        if (
          useWeekStore.getState().weekOffset === startingWeek &&
          useWeekStore.getState().weekStartDate === startingWeekStart
        )
          reclassifyGroceryItem(normalizedKey, newSection);
      }
      setReclassifyOpen(null);
    } catch {
      if (
        item.categoryScope === 'food' &&
        useWeekStore.getState().weekOffset === startingWeek &&
        useWeekStore.getState().weekStartDate === startingWeekStart
      )
        void useWeekStore.getState().refreshGroceries();
      setReclassifyErrors((prev) => {
        const next = new Set(prev);
        next.add(categoryKey);
        return next;
      });
      setTimeout(() => {
        setReclassifyErrors((prev) => {
          const next = new Set(prev);
          next.delete(categoryKey);
          return next;
        });
      }, 3000);
    } finally {
      setPendingReclassifications((prev) => {
        const next = new Set(prev);
        next.delete(categoryKey);
        return next;
      });
    }
  };

  const toggleAisle = (aisle: GrocerySection) => {
    setCollapsedAisles((current) => {
      const next = new Set(current);
      if (next.has(aisle)) next.delete(aisle);
      else next.add(aisle);
      return next;
    });
  };

  const renderExtraRow = (extra: GroceryExtraDto) => {
    const id = extra.id ?? '';
    const pending = pendingExtras.has(id) || storePendingExtras.has(id);
    const error = extraErrors.has(id);
    const editable = extra.readOnly !== true;
    const editing = editingExtra === id;
    return (
      <div
        key={`extra-${id}`}
        className="relative py-2"
        data-testid="grocery-extra-row"
        data-extra-id={id}
      >
        {editing ? (
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor={`extra-name-${id}`}>
              {t('grocery.editExtraName', 'Extra name')}
            </label>
            <input
              id={`extra-name-${id}`}
              value={editingName}
              onChange={(event) => setEditingName(event.target.value)}
              className="min-h-11 w-full min-w-0 flex-1 rounded-xl border border-sage/30 bg-white px-3 focus:outline-none focus:ring-2 focus:ring-sage"
              autoFocus
            />
            <button
              type="button"
              className="h-11 w-11 shrink-0 rounded-full bg-sage text-white focus:outline-none focus:ring-2 focus:ring-charcoal disabled:opacity-50"
              disabled={!editingName.trim() || pending}
              onClick={() => void mutateExtra(extra, { name: editingName.trim() })}
              aria-label={t('grocery.save', 'Save')}
            >
              <Check className="mx-auto" size={20} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="h-11 w-11 shrink-0 rounded-full text-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta disabled:opacity-50"
              onClick={() => void handleDeleteExtra(extra)}
              disabled={pending}
              aria-label={t('grocery.delete', 'Delete')}
            >
              <Trash2 className="mx-auto" size={20} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div className="flex min-h-12 items-center gap-3 rounded-2xl px-2">
            {editable ? (
              <button
                type="button"
                role="checkbox"
                aria-checked={extra.checked === true}
                aria-label={`${extra.checked ? t('grocery.uncheck', 'Uncheck') : t('grocery.check', 'Check')} ${extra.name ?? ''}`}
                aria-disabled={pending}
                onClick={(event) => {
                  if (pending) return;
                  const control = { element: event.currentTarget, keyboard: event.detail === 0 };
                  preserveCheckFocus(control.element, control.keyboard);
                  void mutateExtra(extra, { checked: extra.checked !== true }, control);
                }}
                className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left focus:outline-none focus:ring-2 focus:ring-sage"
                data-testid="grocery-extra-checkbox"
              >
                {extra.checked ? (
                  <CheckCircle2 className="shrink-0 text-sage" size={20} />
                ) : (
                  <Circle className="shrink-0 text-charcoal/20" size={20} />
                )}
                <span className={cn('min-w-0 flex-1', extra.checked && 'line-through opacity-60')}>
                  <span className="block font-medium" data-testid="grocery-extra-name">
                    {extra.name}
                  </span>
                  <span className="text-xs font-bold text-ochre-800">
                    {t('grocery.extra', 'Extra')}
                  </span>
                </span>
              </button>
            ) : (
              <div className="flex min-h-11 min-w-0 flex-1 items-center gap-3">
                {extra.checked ? (
                  <CheckCircle2 className="shrink-0 text-sage" size={20} aria-hidden="true" />
                ) : (
                  <Circle className="shrink-0 text-charcoal/30" size={20} aria-hidden="true" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block font-medium" data-testid="grocery-extra-name">
                    {extra.name}
                  </span>
                  <span className="text-xs font-bold text-ochre-800">
                    {t('grocery.extra', 'Extra')}
                  </span>
                  <span className="ml-2 text-xs font-bold text-charcoal/70">
                    {extra.checked
                      ? t('grocery.bought', 'Bought')
                      : t('grocery.notBought', 'Not bought')}
                  </span>
                </span>
              </div>
            )}
            {editable && (
              <>
                <button
                  type="button"
                  className={CATEGORY_BUTTON_CLASS}
                  aria-label={`${t('grocery.changeSection', 'Change section for')} ${extra.name ?? ''}`}
                  aria-expanded={reclassifyOpen === id}
                  onClick={() => setReclassifyOpen(reclassifyOpen === id ? null : id)}
                >
                  <Tag size={16} className="mx-auto" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  ref={(node) => {
                    if (node) editButtons.current.set(id, node);
                    else editButtons.current.delete(id);
                  }}
                  className="min-h-11 min-w-11 rounded-full focus:ring-2 focus:ring-sage"
                  aria-label={`${t('grocery.edit', 'Edit')} ${extra.name ?? ''}`}
                  onClick={() => {
                    setEditingExtra(id);
                    setEditingName(extra.name ?? '');
                  }}
                >
                  <Edit3 size={16} className="mx-auto" />
                </button>
              </>
            )}
          </div>
        )}
        {reclassifyOpen === id && editable && (
          <div
            className="flex flex-wrap gap-2 px-3 pb-2"
            role="group"
            aria-label={t('grocery.chooseSection', 'Choose section')}
          >
            {AISLE_ORDER.map((nextSection) => (
              <button
                type="button"
                key={nextSection}
                disabled={pending}
                className="min-h-11 rounded-full bg-charcoal/5 px-3 text-xs font-bold focus:ring-2 focus:ring-sage"
                onClick={() => {
                  if (extra.grocerySection === nextSection) setReclassifyOpen(null);
                  else void mutateExtra(extra, { grocerySection: nextSection });
                }}
              >
                {t(`grocery.aisles.${nextSection}`, nextSection)}
              </button>
            ))}
          </div>
        )}
        {(pending || error) && (
          <p className="px-3 text-xs font-bold" role={error ? 'alert' : 'status'}>
            {pending
              ? t('grocery.savingExtra', 'Saving…')
              : t('grocery.extraSaveError', 'Could not save. Refreshing; try again.')}
          </p>
        )}
      </div>
    );
  };

  return (
    <div
      ref={checklistRef}
      className={cn('flex flex-col bg-cream', isEmbedded ? 'h-full' : 'fixed inset-0 z-[100]')}
      data-testid="grocery-checklist"
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between border-b border-charcoal/5 bg-white/50 backdrop-blur-md',
          isEmbedded ? 'px-6 py-2.5' : 'p-8'
        )}
      >
        <div className={cn(isEmbedded ? 'py-0.5' : 'py-0')}>
          {!isEmbedded && (
            <p className="text-[10px] font-black uppercase tracking-widest text-sage/60">
              {t('grocery.smartShopping', 'Smart Shopping')}
            </p>
          )}
          <h2
            ref={headingRef}
            tabIndex={-1}
            className={cn(
              'font-heading font-black text-charcoal',
              isEmbedded ? 'text-lg' : 'text-xl'
            )}
          >
            {t('grocery.checklist', 'Grocery Checklist')}
          </h2>
        </div>
        {onClose && !isEmbedded && (
          <Button
            variant="secondary"
            onClick={onClose}
            aria-label={t('grocery.close', 'Close grocery list')}
            className="rounded-full h-14 w-14 p-0 border-charcoal/10"
          >
            ×
          </Button>
        )}
      </div>

      {servingRefresh?.status === 'updating' && (
        <p role="status" className="p-4" data-testid="grocery-portions-updating">
          {t('portions.updating', 'Updating your shopping list…')}
        </p>
      )}
      {(servingRefresh?.status === 'failed' || refreshError) && (
        <div role="alert" className="p-4">
          {t('portions.refreshFailed', 'Portions saved. Shopping list needs updating.')}{' '}
          <button className="min-h-12 px-3 underline" onClick={() => void retryPortions()}>
            {t('portions.retry', 'Retry')}
          </button>
        </div>
      )}
      {summary && summary !== dismissedSummary && (
        <div role="status" className="p-4" data-testid="grocery-portions-summary">
          {t('portions.increased', 'Shopping list updated. Items needing more are unchecked.')}{' '}
          <button
            className="min-h-12 px-3"
            aria-label={t('portions.dismiss', 'Dismiss')}
            onClick={() => {
              setDismissedSummaries((previous) => ({
                ...previous,
                [weekStartDate ?? '']: summary,
              }));
              if (noticeKey) {
                try {
                  sessionStorage.setItem(noticeKey, summary);
                } catch {
                  /* Preserve the local acknowledgement when storage is unavailable. */
                }
              }
            }}
          >
            ×
          </button>
        </div>
      )}
      {/* Content */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto bg-cream/50"
        style={{ overflowAnchor: 'none' }}
      >
        <div
          className={cn(
            'mx-auto',
            isEmbedded ? 'max-w-full pt-2 pb-20 px-[16px]' : 'max-w-2xl py-8 px-[16px] sm:px-6'
          )}
        >
          <AnimatePresence mode="wait">
            {Object.keys(grouped).length === 0 && extras.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-20 px-6"
              >
                <div className="h-24 w-24 bg-sage/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShoppingCart size={40} className="text-sage" />
                </div>
                <h3 className="text-xl font-heading font-black text-charcoal mb-2">
                  {t('grocery.emptyTitle', 'Your list is empty')}
                </h3>
                <p className="text-charcoal/40 font-medium mb-12 max-w-[240px] mx-auto">
                  {t(
                    'grocery.emptySubtext',
                    'Add meals to your planner and your grocery list will build itself — organized by store section.'
                  )}
                </p>
                {onClose && (
                  <Button
                    onClick={onClose}
                    className="bg-terracotta hover:bg-terracotta-600 active:bg-terracotta-700 text-white rounded-3xl h-16 px-10 font-bold shadow-xl shadow-terracotta/20 active:scale-95 transition-all"
                  >
                    {t('grocery.startPlanning', 'Start Planning')}
                  </Button>
                )}
              </motion.div>
            ) : (
              <div className="space-y-8">
                {AISLE_ORDER.map((aisle) => {
                  const aisleItems = grouped[aisle] || [];
                  const aisleExtras = extrasBySection[aisle] ?? [];
                  if (aisleItems.length === 0 && aisleExtras.length === 0) return null;

                  // The API's check-state contract is keyed by displayName, but a grocery
                  // line is identified by its normalized ingredient and unit bucket. Retain
                  // the source position too so stale/legacy payloads with exact duplicate
                  // lines still have distinct, stable reconciliation identities.
                  const itemsWithRenderKeys = aisleItems.map((item, sourceIndex) => ({
                    item,
                    renderKey: grocerySourceKey(aisle, item, sourceIndex),
                  }));
                  const displayedRows = [
                    ...aisleExtras
                      .filter((extra) => !extra.checked)
                      .map((extra) => ({ kind: 'extra' as const, extra })),
                    ...itemsWithRenderKeys
                      .filter(({ item }) => !groceryState[item.rowId ?? ''])
                      .map((entry) => ({ kind: 'recipe' as const, ...entry })),
                    ...aisleExtras
                      .filter((extra) => extra.checked)
                      .map((extra) => ({ kind: 'extra' as const, extra })),
                    ...itemsWithRenderKeys
                      .filter(({ item }) => groceryState[item.rowId ?? ''])
                      .map((entry) => ({ kind: 'recipe' as const, ...entry })),
                  ];

                  const checkedCount =
                    aisleItems.filter((item) => groceryState[item.rowId ?? '']).length +
                    aisleExtras.filter((extra) => extra.checked).length;
                  const totalCount = aisleItems.length + aisleExtras.length;
                  const isCollapsed = collapsedAisles.has(aisle);
                  const itemsRegionId = `aisle-items-${aisle.replace(/\s+/g, '-').toLowerCase()}`;

                  return (
                    <motion.div
                      key={aisle}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="@container bg-white rounded-3xl border border-charcoal/5 overflow-hidden shadow-sm"
                      data-testid={`aisle-section-${aisle}`}
                    >
                      {/* Aisle Header */}
                      {(() => {
                        const isComplete = totalCount > 0 && checkedCount === totalCount;
                        return (
                          <button
                            type="button"
                            onClick={() => toggleAisle(aisle)}
                            className={`px-6 py-4 border-b border-charcoal/5 ${
                              isComplete
                                ? 'bg-sage/20'
                                : 'bg-gradient-to-r from-charcoal/2 to-transparent'
                            } w-full text-left`}
                            data-testid={
                              isComplete ? 'aisle-header-complete' : 'aisle-header-incomplete'
                            }
                            aria-expanded={!isCollapsed}
                            aria-controls={itemsRegionId}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <span className="text-3xl">{AISLE_ICONS[aisle]}</span>
                                <div>
                                  <h3 className="font-black text-charcoal text-lg">
                                    {t(`grocery.aisles.${aisle}`, aisle)}
                                  </h3>
                                  <p className="text-xs text-charcoal/40 font-medium">
                                    {tWithVars(
                                      'grocery.itemsCount',
                                      `${checkedCount}/${totalCount} items`,
                                      {
                                        checked: checkedCount,
                                        total: totalCount,
                                      }
                                    )}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-sage/10 flex items-center justify-center">
                                  {isComplete ? (
                                    <CheckCircle2
                                      size={18}
                                      className="text-sage"
                                      data-testid="section-complete-icon"
                                    />
                                  ) : (
                                    <span className="text-xs font-black text-sage">
                                      {Math.round((checkedCount / totalCount) * 100)}%
                                    </span>
                                  )}
                                </div>
                                <ChevronDown
                                  size={18}
                                  className={cn(
                                    'text-charcoal/40 transition-transform',
                                    isCollapsed && '-rotate-90'
                                  )}
                                  aria-hidden="true"
                                />
                              </div>
                            </div>
                          </button>
                        );
                      })()}

                      {/* Items */}
                      <div
                        id={itemsRegionId}
                        className="divide-y divide-charcoal/5 p-[8px] space-y-2 @min-[18rem]:p-4"
                        hidden={isCollapsed}
                        aria-hidden={isCollapsed}
                      >
                        {displayedRows.map((row) => {
                          if (row.kind === 'extra') return renderExtraRow(row.extra);
                          const { item, renderKey } = row;
                          const key = item.displayLabels?.[locale] ?? item.displayName ?? '';
                          const knownQuantity = formatQuantityHint(item.quantity, item.unitText);
                          const quantityHint =
                            item.quantityComplete === false && knownQuantity
                              ? tWithVars('grocery.knownSubtotal', '{{amount}} known', {
                                  amount: knownQuantity.slice(1, -1),
                                })
                              : knownQuantity;
                          const isChecked = groceryState[item.rowId ?? ''] ?? false;
                          const hasError = errorItems.has(item.rowId ?? '');
                          const categoryKey = categoryCorrectionKey(item);
                          const hasReclassifyError = reclassifyErrors.has(categoryKey);
                          const isPickerOpen = reclassifyOpen === (item.rowId ?? categoryKey);
                          const isReclassifyPending = pendingReclassifications.has(categoryKey);

                          return (
                            <div key={renderKey} className="relative">
                              <div
                                className={`flex flex-wrap items-center p-[8px] @min-[18rem]:p-4 rounded-2xl transition-all ${
                                  isChecked
                                    ? 'bg-sage/5 text-charcoal/40'
                                    : 'hover:bg-charcoal/2 text-charcoal'
                                }`}
                              >
                                {/* Toggle button — takes up the left portion */}
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    preserveCheckFocus(event.currentTarget, event.detail === 0);
                                    void handleToggle(item);
                                  }}
                                  onKeyDown={(event) => {
                                    if (event.key === ' ' || event.key === 'Enter') {
                                      event.preventDefault();
                                      if (event.repeat) return;
                                      preserveCheckFocus(event.currentTarget, true);
                                      void handleToggle(item);
                                    }
                                  }}
                                  className="flex min-h-12 min-w-0 flex-1 basis-full items-center gap-2 text-left @min-[18rem]:basis-0 @min-[18rem]:gap-4"
                                  data-testid="grocery-item-checkbox"
                                  data-row-id={item.rowId}
                                  data-item-name={key}
                                  data-state={isChecked ? 'checked' : 'unchecked'}
                                  role="checkbox"
                                  aria-checked={isChecked}
                                >
                                  {isChecked ? (
                                    <CheckCircle2
                                      size={20}
                                      className="text-sage flex-shrink-0"
                                      aria-hidden="true"
                                    />
                                  ) : (
                                    <Circle
                                      size={20}
                                      className="text-charcoal/20 flex-shrink-0"
                                      aria-hidden="true"
                                    />
                                  )}
                                  <span
                                    className={cn(
                                      'min-w-0 flex-1 transition-all',
                                      isChecked && 'line-through opacity-60'
                                    )}
                                  >
                                    <span
                                      data-testid="grocery-item-label"
                                      className={cn(
                                        'block break-words font-medium transition-all',
                                        isChecked && 'line-through opacity-60'
                                      )}
                                    >
                                      {key}
                                    </span>
                                    {quantityHint && (
                                      <span
                                        data-testid="grocery-item-quantity-hint"
                                        className={cn(
                                          'mt-1 block text-sm font-normal',
                                          item.quantityComplete === false
                                            ? 'text-charcoal'
                                            : 'text-charcoal/50'
                                        )}
                                      >
                                        {quantityHint}
                                      </span>
                                    )}
                                  </span>
                                  {hasError && (
                                    <AlertCircle
                                      size={12}
                                      className="text-terracotta flex-shrink-0 ml-1"
                                      data-testid="grocery-item-error"
                                    />
                                  )}
                                </button>

                                {(item.recipeIds ?? []).some(
                                  (id) => typeof id === 'string' && id.length > 0
                                ) && (
                                  <button
                                    type="button"
                                    data-testid="grocery-recipe-sources-toggle"
                                    className="inline-flex min-h-[48px] min-w-[48px] shrink-0 items-center justify-center rounded-full text-charcoal/60 hover:bg-charcoal/5 focus-visible:outline-2 focus-visible:outline-terracotta"
                                    aria-label={tWithVars(
                                      'grocery.sourceRecipesFor',
                                      'Source recipes for {{ingredient}}',
                                      { ingredient: key }
                                    )}
                                    aria-expanded={reviewKey === renderKey}
                                    aria-controls={`grocery-sources-${encodeURIComponent(renderKey)}`}
                                    onClick={() =>
                                      setReviewKey(reviewKey === renderKey ? null : renderKey)
                                    }
                                  >
                                    <BookOpen size={18} aria-hidden="true" />
                                  </button>
                                )}
                                {reviewKey === renderKey && (
                                  <>
                                    <div
                                      id={`grocery-sources-${encodeURIComponent(renderKey)}`}
                                      data-testid="grocery-recipe-sources-region"
                                      role="region"
                                      aria-labelledby={`grocery-sources-heading-${encodeURIComponent(renderKey)}`}
                                      className="order-last w-full min-w-0 rounded-xl bg-white px-[12px] py-2 text-sm"
                                    >
                                      <h4
                                        id={`grocery-sources-heading-${encodeURIComponent(renderKey)}`}
                                        className="mb-1 font-semibold text-charcoal"
                                      >
                                        {t('grocery.usedIn', 'Used in')}
                                      </h4>
                                      <ul>
                                        {[
                                          ...new Set(
                                            (item.recipeIds ?? []).filter(
                                              (id): id is string =>
                                                typeof id === 'string' && id.length > 0
                                            )
                                          ),
                                        ].map((id) => (
                                          <li key={id}>
                                            <Link
                                              prefetch={false}
                                              className="inline-block min-h-[48px] max-w-full break-words py-3 text-sage-800 underline underline-offset-4"
                                              href={`/recipes?open=${encodeURIComponent(id)}&reviewAmounts=true${sourceReturnParams}`}
                                              aria-describedby={`grocery-source-purpose-${encodeURIComponent(renderKey)}`}
                                            >
                                              {sourceTitles[id] === undefined
                                                ? t(
                                                    'grocery.sourceTitleLoading',
                                                    'Loading recipe title…'
                                                  )
                                                : (sourceTitles[id] ??
                                                  t(
                                                    'grocery.sourceTitleUnavailable',
                                                    'Recipe title unavailable'
                                                  ))}
                                            </Link>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                    <span
                                      id={`grocery-source-purpose-${encodeURIComponent(renderKey)}`}
                                      className="sr-only"
                                    >
                                      {t(
                                        'grocery.sourceOriginalReview',
                                        'Open the recipe’s original quantities.'
                                      )}
                                    </span>
                                  </>
                                )}
                                {/* Reclassify button — separate tap target */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setReclassifyOpen(
                                      isPickerOpen ? null : (item.rowId ?? categoryKey)
                                    )
                                  }
                                  className={cn(
                                    CATEGORY_BUTTON_CLASS,
                                    'relative ml-auto @min-[18rem]:ml-2'
                                  )}
                                  aria-label={`${t('grocery.changeSection', 'Change section for')} ${key}`}
                                  aria-expanded={isPickerOpen}
                                  data-testid="reclassify-btn"
                                  data-item-name={key}
                                  disabled={isReclassifyPending}
                                >
                                  <Tag size={16} className="mx-auto" aria-hidden="true" />
                                  {hasReclassifyError && (
                                    <AlertCircle
                                      size={10}
                                      className="text-terracotta absolute -top-1 -right-1"
                                      data-testid="reclassify-error"
                                    />
                                  )}
                                </button>
                              </div>

                              {/* Inline section picker */}
                              {isPickerOpen && (
                                <div
                                  className="mx-4 mb-2 flex flex-wrap gap-2 p-3 bg-charcoal/3 rounded-2xl"
                                  data-testid="section-picker"
                                  data-item-name={key}
                                  aria-busy={isReclassifyPending}
                                >
                                  {item.categoryStatus === 'conflict' && (
                                    <div className="w-full text-sm text-charcoal/70">
                                      <p>
                                        {t(
                                          'grocery.categoryConflict',
                                          'Different saved sections apply. Choose one for this food.'
                                        )}
                                      </p>
                                      {(item.categoryChoices?.length ?? 0) > 0 && (
                                        <p data-testid="category-prior-choices">
                                          {t('grocery.savedSections', 'Saved sections:')}{' '}
                                          {[
                                            ...new Set(
                                              item.categoryChoices
                                                ?.map((choice) => choice.grocerySection)
                                                .filter(Boolean)
                                            ),
                                          ]
                                            .map((section) =>
                                              t(`grocery.aisles.${section}`, section ?? '')
                                            )
                                            .join(', ')}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                  {AISLE_ORDER.map((section) => (
                                    <button
                                      type="button"
                                      key={section}
                                      onClick={() => handleReclassify(item, section)}
                                      className={`min-h-11 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                                        item.section === section
                                          ? 'bg-sage text-white'
                                          : 'bg-white text-charcoal/60 hover:bg-sage/10'
                                      }`}
                                      data-testid={`section-option-${section}`}
                                      disabled={isReclassifyPending}
                                    >
                                      {t(`grocery.aisles.${section}`, section)}
                                    </button>
                                  ))}
                                  {isReclassifyPending && (
                                    <span data-testid="reclassify-pending" data-item-name={key} />
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {composerIsEligible && (
        <div
          ref={composerRef}
          className="relative border-t border-charcoal/10 bg-cream p-3"
          data-testid="grocery-extra-composer"
          onFocusCapture={() => setComposerFocused(true)}
          onBlurCapture={(event) => {
            if (composerRef.current?.contains(event.relatedTarget as Node | null)) return;
            suggestionGeneration.current++;
            setComposerFocused(false);
            setSuggestionsOpen(false);
            setActiveSuggestion(-1);
          }}
        >
          {suggestionsOpen && (
            <ul
              id="grocery-extra-suggestions"
              role="listbox"
              aria-label={t('grocery.extraSuggestions', 'Extra suggestions')}
              className="absolute bottom-full left-3 right-3 z-20 mb-2 max-h-40 overflow-auto rounded-2xl border border-charcoal/10 bg-white p-1 shadow-xl"
            >
              {suggestions.map((suggestion, index) => (
                <li
                  id={`grocery-extra-option-${index}`}
                  key={suggestion}
                  role="option"
                  aria-selected={activeSuggestion === index}
                >
                  <button
                    type="button"
                    className="min-h-11 w-full rounded-xl px-3 text-left focus:bg-sage/10 focus:outline-none"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setExtraName(suggestion);
                      setSuggestionsOpen(false);
                      setActiveSuggestion(-1);
                      inputRef.current?.focus();
                    }}
                  >
                    {suggestion}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="sr-only" role="status" aria-live="polite">
            {suggestionsOpen
              ? tWithVars(
                  suggestions.length === 1
                    ? 'grocery.suggestionCountOne'
                    : 'grocery.suggestionCountMany',
                  suggestions.length === 1
                    ? '{{count}} suggestion available'
                    : '{{count}} suggestions available',
                  { count: suggestions.length }
                )
              : ''}
          </p>
          <form
            className="mx-auto flex max-w-2xl items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void handleAddExtra();
            }}
          >
            <label htmlFor="grocery-extra-name" className="sr-only">
              {t('grocery.addExtraLabel', 'Add an extra')}
            </label>
            <input
              ref={inputRef}
              id="grocery-extra-name"
              role="combobox"
              aria-autocomplete="list"
              aria-controls="grocery-extra-suggestions"
              aria-expanded={suggestionsOpen}
              aria-activedescendant={
                suggestionsOpen && activeSuggestion >= 0
                  ? `grocery-extra-option-${activeSuggestion}`
                  : undefined
              }
              value={extraName}
              onChange={(event) => setExtraName(event.target.value)}
              onFocus={() => suggestions.length > 0 && setSuggestionsOpen(true)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  setSuggestionsOpen(false);
                  setActiveSuggestion(-1);
                } else if (
                  suggestions.length > 0 &&
                  (event.key === 'ArrowDown' || event.key === 'ArrowUp')
                ) {
                  event.preventDefault();
                  setSuggestionsOpen(true);
                  setActiveSuggestion((current) => {
                    if (event.key === 'ArrowDown') return (current + 1) % suggestions.length;
                    return current <= 0 ? suggestions.length - 1 : current - 1;
                  });
                } else if (event.key === 'Enter' && suggestionsOpen && activeSuggestion >= 0) {
                  event.preventDefault();
                  setExtraName(suggestions[activeSuggestion]);
                  setSuggestionsOpen(false);
                  setActiveSuggestion(-1);
                }
              }}
              placeholder={t('grocery.extraPlaceholder', 'Add milk, coffee, foil…')}
              className="min-h-12 min-w-0 flex-1 rounded-2xl border border-charcoal/10 bg-white px-4 focus:outline-none focus:ring-2 focus:ring-sage"
            />
            <button
              type="submit"
              disabled={!extraName.trim() || addState === 'pending'}
              onPointerDown={(event) => event.preventDefault()}
              className="h-12 w-12 shrink-0 rounded-2xl bg-terracotta hover:bg-terracotta-600 active:bg-terracotta-700 text-white disabled:opacity-50 focus:ring-2 focus:ring-charcoal"
              aria-label={
                addState === 'pending'
                  ? t('grocery.addingExtra', 'Adding…')
                  : t('grocery.addExtra', 'Add')
              }
              aria-busy={addState === 'pending'}
            >
              {addState === 'pending' ? (
                <LoaderCircle className="mx-auto animate-spin" size={20} aria-hidden="true" />
              ) : (
                <Plus className="mx-auto" size={20} aria-hidden="true" />
              )}
            </button>
          </form>
          {(addState === 'error' || suggestionError) && (
            <p className="mx-auto mt-1 max-w-2xl text-xs font-bold text-terracotta" role="alert">
              {addState === 'error'
                ? t(
                    'grocery.addExtraError',
                    'Could not add this extra. Your text is still here; try again.'
                  )
                : t(
                    'grocery.suggestionError',
                    'Suggestions are unavailable. You can still add your own text.'
                  )}
            </p>
          )}
          {addState === 'pending' && (
            <p className="sr-only" role="status">
              {t('grocery.addingExtra', 'Adding…')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
