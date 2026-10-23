'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Edit3,
  ShoppingCart,
  Tag,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePlannerStore } from '@/store/plannerStore';
import { t, tWithVars } from '@/locales';
import type { GrocerySection } from '@/lib/grocery/aisleMapper';
import { AISLE_ORDER } from '@/lib/grocery/aisleOrder';
import { useSchedule } from '@/lib/api/schedule';
import { reclassifyIngredient } from '@/lib/api/ingredients';
import type { GroceryExtraDto, GroceryLineItemDto } from '@/lib/api/generated/models';
import { useWeekStore } from '@/store/weekStore';
import { useUiStore } from '@/store/uiStore';
import {
  createGroceryExtra,
  deleteGroceryExtra,
  suggestGroceryExtraNames,
  updateGroceryExtra,
} from '@/lib/api/grocery-extras';
import { absoluteMonday } from '@/lib/deployment-calendar';

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

function formatQuantityHint(
  quantity: number | null | undefined,
  unitText: string | null | undefined
) {
  if (quantity == null || !unitText) return null;

  const rounded = Number.isInteger(quantity)
    ? quantity.toString()
    : quantity
        .toFixed(3)
        .replace(/\.0+$/, '')
        .replace(/(\.\d*?)0+$/, '$1');

  return `(${rounded} ${unitText})`;
}

function matchesOccurrenceIdentity(candidate: GroceryExtraDto, expected: GroceryExtraDto) {
  return (
    candidate.id === expected.id &&
    String(candidate.occurrenceWeekStartDate ?? '') ===
      String(expected.occurrenceWeekStartDate ?? '')
  );
}

export function GroceryList({
  weekOffset,
  items,
  extras = [],
  onClose,
  isEmbedded,
}: GroceryListProps) {
  const { groceryState, setGroceryItemToggle, setGroceryState } = usePlannerStore();
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
  const weekStartDate = useWeekStore((state) => state.weekStartDate);
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
    change: { name: string } | { checked: boolean } | { grocerySection: string }
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
    else if ('checked' in change || 'grocerySection' in change)
      upsertExtra({ ...extra, ...change } as GroceryExtraDto);
    try {
      const authoritative = await updateGroceryExtra(extra, change);
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
      setEditingExtra(null);
      requestAnimationFrame(() => editButtons.current.get(id)?.focus());
    } catch (error) {
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
    } catch {
      await useWeekStore.getState().sync();
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
  const completedAisles = useMemo(
    () =>
      new Set(
        AISLE_ORDER.filter((aisle) => {
          const aisleItems = grouped[aisle] ?? [];
          const aisleExtras = extrasBySection[aisle] ?? [];
          return (
            aisleItems.length + aisleExtras.length > 0 &&
            aisleItems.every((item) => groceryState[item.displayName ?? '']) &&
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
    // Initialize grocery state if not already set and we have items
    if (items.length > 0 && Object.keys(groceryState).length === 0) {
      const initialState = items.reduce(
        (acc, item) => {
          const key = item.displayName ?? '';
          acc[key] = false;
          return acc;
        },
        {} as Record<string, boolean>
      );
      setGroceryState(initialState);
    }
  }, [items, groceryState, setGroceryState]);

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

  const handleToggle = async (ingredientName: string) => {
    const newState = !groceryState[ingredientName];
    setGroceryItemToggle(ingredientName, newState);

    // Persist to API — single item only, merged server-side.
    // Sending the full map would cause concurrent toggles by two family members
    // to overwrite each other (last-writer-wins on the whole map).
    try {
      await toggleGroceryItem(weekOffset, ingredientName, newState);
    } catch (error) {
      console.error('Failed to save grocery state:', error);
      // Revert the single toggled item only
      setGroceryItemToggle(ingredientName, !newState);
      // Show per-item error indicator, auto-clear after 3 seconds
      setErrorItems((prev) => new Set(prev).add(ingredientName));
      setTimeout(() => {
        setErrorItems((prev) => {
          const next = new Set(prev);
          next.delete(ingredientName);
          return next;
        });
      }, 3000);
    }
  };

  const handleReclassify = async (item: GroceryLineItemDto, newSection: GrocerySection) => {
    const normalizedKey = item.normalizedKey;
    if (!normalizedKey || pendingReclassifications.has(normalizedKey)) return;
    if (item.section === newSection) {
      setReclassifyOpen(null);
      return;
    }

    const startingWeek = weekOffset;
    setPendingReclassifications((prev) => new Set(prev).add(normalizedKey));
    try {
      await reclassifyIngredient(normalizedKey, newSection);
      if (useWeekStore.getState().weekOffset === startingWeek) {
        reclassifyGroceryItem(normalizedKey, newSection);
      }
      setReclassifyOpen(null);
    } catch {
      setReclassifyErrors((prev) => {
        const next = new Set(prev);
        next.add(normalizedKey);
        return next;
      });
      setTimeout(() => {
        setReclassifyErrors((prev) => {
          const next = new Set(prev);
          next.delete(normalizedKey);
          return next;
        });
      }, 3000);
    } finally {
      setPendingReclassifications((prev) => {
        const next = new Set(prev);
        next.delete(normalizedKey);
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
      <div key={`extra-${id}`} className="relative py-2" data-testid="grocery-extra-row">
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
                disabled={pending}
                onClick={() => void mutateExtra(extra, { checked: extra.checked !== true })}
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
                  className="min-h-11 min-w-11 rounded-full focus:ring-2 focus:ring-sage"
                  aria-label={`${t('grocery.changeSection', 'Change section for')} ${extra.name ?? ''}`}
                  onClick={() => setReclassifyOpen(reclassifyOpen === id ? null : id)}
                >
                  <Tag size={16} className="mx-auto" />
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
                onClick={() => void mutateExtra(extra, { grocerySection: nextSection })}
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-cream/50">
        <div
          className={cn(
            'mx-auto',
            isEmbedded ? 'max-w-full pt-2 pb-20 px-4' : 'max-w-2xl py-8 px-6'
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
                    className="bg-terracotta text-white rounded-3xl h-16 px-10 font-bold shadow-xl shadow-terracotta/20 active:scale-95 transition-all"
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
                    renderKey: `${item.normalizedKey ?? ''}\u0000${item.unitText ?? ''}\u0000${sourceIndex}`,
                  }));
                  const displayedItems = [
                    ...itemsWithRenderKeys.filter(
                      ({ item }) => !groceryState[item.displayName ?? '']
                    ),
                    ...itemsWithRenderKeys.filter(
                      ({ item }) => groceryState[item.displayName ?? '']
                    ),
                  ];

                  const checkedCount =
                    aisleItems.filter((item) => groceryState[item.displayName ?? '']).length +
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
                      className="bg-white rounded-3xl border border-charcoal/5 overflow-hidden shadow-sm"
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
                        className="divide-y divide-charcoal/5 p-4 space-y-2"
                        hidden={isCollapsed}
                        aria-hidden={isCollapsed}
                      >
                        {aisleExtras.map(renderExtraRow)}
                        {displayedItems.map(({ item, renderKey }) => {
                          const key = item.displayName ?? '';
                          const quantityHint = formatQuantityHint(item.quantity, item.unitText);
                          const isChecked = groceryState[key] ?? false;
                          const hasError = errorItems.has(key);
                          const hasReclassifyError = reclassifyErrors.has(item.normalizedKey ?? '');
                          const isPickerOpen = reclassifyOpen === item.normalizedKey;
                          const isReclassifyPending = pendingReclassifications.has(
                            item.normalizedKey ?? ''
                          );

                          return (
                            <div key={renderKey} className="relative">
                              <div
                                className={`flex items-center p-4 rounded-2xl transition-all ${
                                  isChecked
                                    ? 'bg-sage/5 text-charcoal/40'
                                    : 'hover:bg-charcoal/2 text-charcoal'
                                }`}
                              >
                                {/* Toggle button — takes up the left portion */}
                                {isChecked ? (
                                  <button
                                    type="button"
                                    onClick={() => handleToggle(key)}
                                    onKeyDown={(event) => {
                                      if (event.key === ' ' || event.key === 'Enter') {
                                        event.preventDefault();
                                        void handleToggle(key);
                                      }
                                    }}
                                    className="flex min-w-0 items-start space-x-4 flex-1 text-left"
                                    data-testid="grocery-item-checkbox"
                                    data-item-name={key}
                                    data-state="checked"
                                    role="checkbox"
                                    aria-checked="true"
                                  >
                                    <CheckCircle2 size={20} className="text-sage flex-shrink-0" />
                                    <span className="min-w-0 flex-1 transition-all line-through opacity-60">
                                      <span
                                        data-testid="grocery-item-label"
                                        className="block font-medium transition-all line-through opacity-60"
                                      >
                                        {key}
                                      </span>
                                      {quantityHint && (
                                        <span
                                          data-testid="grocery-item-quantity-hint"
                                          className="mt-1 block text-sm font-normal text-charcoal/50"
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
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleToggle(key)}
                                    onKeyDown={(event) => {
                                      if (event.key === ' ' || event.key === 'Enter') {
                                        event.preventDefault();
                                        void handleToggle(key);
                                      }
                                    }}
                                    className="flex min-w-0 items-start space-x-4 flex-1 text-left"
                                    data-testid="grocery-item-checkbox"
                                    data-item-name={key}
                                    data-state="unchecked"
                                    role="checkbox"
                                    aria-checked="false"
                                  >
                                    <Circle size={20} className="text-charcoal/20 flex-shrink-0" />
                                    <span className="min-w-0 flex-1 transition-all">
                                      <span
                                        data-testid="grocery-item-label"
                                        className="block font-medium transition-all"
                                      >
                                        {key}
                                      </span>
                                      {quantityHint && (
                                        <span
                                          data-testid="grocery-item-quantity-hint"
                                          className="mt-1 block text-sm font-normal text-charcoal/50"
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
                                )}

                                {/* Reclassify button — separate tap target */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setReclassifyOpen(
                                      isPickerOpen ? null : (item.normalizedKey ?? null)
                                    )
                                  }
                                  className="ml-2 p-1 rounded-full hover:bg-charcoal/5 text-charcoal/30 hover:text-charcoal/60 transition-colors relative"
                                  aria-label={`Change section for ${key}`}
                                  data-testid="reclassify-btn"
                                  data-item-name={key}
                                  disabled={isReclassifyPending}
                                >
                                  <Tag size={14} />
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
                                  {AISLE_ORDER.map((section) => (
                                    <button
                                      type="button"
                                      key={section}
                                      onClick={() => handleReclassify(item, section)}
                                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                                        item.section === section
                                          ? 'bg-sage text-white'
                                          : 'bg-white text-charcoal/60 hover:bg-sage/10'
                                      }`}
                                      data-testid={`section-option-${section}`}
                                      disabled={isReclassifyPending}
                                    >
                                      {section}
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
              className="min-h-12 rounded-2xl bg-terracotta px-5 font-bold text-white disabled:opacity-50 focus:ring-2 focus:ring-charcoal"
            >
              {addState === 'pending'
                ? t('grocery.addingExtra', 'Adding…')
                : t('grocery.addExtra', 'Add')}
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
