'use client';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useLocale } from '@/components/common/LocaleProvider';
import type { GrocerySection } from '@/lib/grocery/aisleMapper';
import { AISLE_ORDER } from '@/lib/grocery/aisleOrder';
import { cn } from '@/lib/utils';
import { useWeekStore } from '@/store/weekStore';
import { GroceryAisleSection } from './grocery-list/GroceryAisleSection';
import { GroceryExtraComposer } from './grocery-list/GroceryExtraComposer';
import { GroceryEmptyState, GroceryListHeader } from './grocery-list/GroceryListHeader';
import {
  groupExtrasBySection,
  groupItemsBySection,
  type GroceryListProps,
} from './grocery-list/helpers';
import { useGroceryExtras } from './grocery-list/useGroceryExtras';
import { useGroceryReclassify } from './grocery-list/useGroceryReclassify';
import { useGroceryRowSync } from './grocery-list/useGroceryRowSync';
import { useGrocerySourceReview } from './grocery-list/useGrocerySourceReview';

export function GroceryList({
  weekOffset,
  items,
  extras = [],
  onClose,
  isEmbedded,
}: GroceryListProps) {
  const { locale } = useLocale();
  const weekStartDate = useWeekStore((state) => state.weekStartDate);
  const referenceWeekStartDate = useWeekStore((state) => state.calendar?.referenceWeekStartDate);
  const currentWeekStartDate = useWeekStore((state) => state.calendar?.currentWeekStartDate);

  const checklistRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const checkFocus = useRef<{
    control: HTMLButtonElement;
    adjacent: HTMLElement[];
    keyboard: boolean;
    week: string | null;
    scrollTop: number;
  } | null>(null);

  const setHeadingNode = useCallback((node: HTMLHeadingElement | null) => {
    headingRef.current = node;
  }, []);

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

  const {
    groceryState,
    servingRefresh,
    refreshError,
    errorItems,
    dismissPortionsSummary,
    retryPortions,
    handleToggle,
  } = useGroceryRowSync({
    weekOffset,
    weekStartDate,
    referenceWeekStartDate,
  });

  const {
    reclassifyOpen,
    setReclassifyOpen,
    reclassifyErrors,
    pendingReclassifications,
    handleReclassify,
  } = useGroceryReclassify(weekOffset);

  const {
    composerIsEligible,
    extraName,
    setExtraName,
    suggestions,
    suggestionsOpen,
    setSuggestionsOpen,
    setComposerFocused,
    suggestionError,
    addState,
    editingExtra,
    editingName,
    setEditingName,
    pendingExtras,
    storePendingExtras,
    extraErrors,
    activeSuggestion,
    setComposerContainerNode,
    setComposerInputNode,
    registerEditButton,
    mutateExtra,
    handleDeleteExtra,
    handleAddExtra,
    handleComposerBlurCapture,
    handleSelectSuggestion,
    handleComposerKeyDown,
    startEditExtra,
  } = useGroceryExtras({
    weekStartDate,
    currentWeekStartDate,
    dismissPortionsSummary,
    preserveCheckFocus,
    setReclassifyOpen,
  });

  const extrasBySection = useMemo(() => groupExtrasBySection(extras), [extras]);
  const grouped = useMemo(() => groupItemsBySection(items), [items]);

  const { reviewKey, setReviewKey, sourceTitles, sourceReturnParams } = useGrocerySourceReview({
    weekOffset,
    weekStartDate,
    referenceWeekStartDate,
    items,
    grouped,
  });

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

  const toggleAisle = (aisle: GrocerySection) => {
    dismissPortionsSummary();
    setCollapsedAisles((current) => {
      const next = new Set(current);
      if (next.has(aisle)) next.delete(aisle);
      else next.add(aisle);
      return next;
    });
  };

  const toggleReclassifyPicker = (pickerKey: string) => {
    dismissPortionsSummary();
    setReclassifyOpen((current) => (current === pickerKey ? null : pickerKey));
  };

  return (
    <div
      ref={checklistRef}
      className={cn('flex flex-col bg-cream', isEmbedded ? 'h-full' : 'fixed inset-0 z-[100]')}
      data-testid="grocery-checklist"
    >
      <GroceryListHeader
        isEmbedded={isEmbedded}
        onClose={onClose}
        setHeadingNode={setHeadingNode}
        servingRefresh={servingRefresh}
        refreshError={refreshError}
        onRetryPortions={() => void retryPortions()}
      />

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
              <GroceryEmptyState onClose={onClose} />
            ) : (
              <div className="space-y-8">
                {AISLE_ORDER.map((aisle) => {
                  const aisleItems = grouped[aisle] || [];
                  const aisleExtras = extrasBySection[aisle] ?? [];
                  if (aisleItems.length === 0 && aisleExtras.length === 0) return null;

                  return (
                    <GroceryAisleSection
                      key={aisle}
                      aisle={aisle}
                      aisleItems={aisleItems}
                      aisleExtras={aisleExtras}
                      locale={locale}
                      groceryState={groceryState}
                      isCollapsed={collapsedAisles.has(aisle)}
                      onToggleAisle={toggleAisle}
                      errorItems={errorItems}
                      reclassifyOpen={reclassifyOpen}
                      reclassifyErrors={reclassifyErrors}
                      pendingReclassifications={pendingReclassifications}
                      onToggleReclassifyPicker={toggleReclassifyPicker}
                      onCloseReclassifyPicker={() => setReclassifyOpen(null)}
                      onReclassifyItem={(item, section) => void handleReclassify(item, section)}
                      onToggleItem={(item) => void handleToggle(item)}
                      reviewKey={reviewKey}
                      onSetReviewKey={setReviewKey}
                      sourceReturnParams={sourceReturnParams}
                      sourceTitles={sourceTitles}
                      pendingExtras={pendingExtras}
                      storePendingExtras={storePendingExtras}
                      extraErrors={extraErrors}
                      editingExtra={editingExtra}
                      editingName={editingName}
                      onEditingNameChange={setEditingName}
                      onStartEditExtra={startEditExtra}
                      onMutateExtra={(extra, change, control) =>
                        void mutateExtra(extra, change, control)
                      }
                      onDeleteExtra={(extra) => void handleDeleteExtra(extra)}
                      preserveCheckFocus={preserveCheckFocus}
                      registerEditButton={registerEditButton}
                    />
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {composerIsEligible && (
        <GroceryExtraComposer
          extraName={extraName}
          suggestions={suggestions}
          suggestionsOpen={suggestionsOpen}
          activeSuggestion={activeSuggestion}
          addState={addState}
          suggestionError={suggestionError}
          setComposerContainerNode={setComposerContainerNode}
          setComposerInputNode={setComposerInputNode}
          onFocusCapture={() => setComposerFocused(true)}
          onBlurCapture={handleComposerBlurCapture}
          onExtraNameChange={setExtraName}
          onInputFocus={() => suggestions.length > 0 && setSuggestionsOpen(true)}
          onInputKeyDown={handleComposerKeyDown}
          onSelectSuggestion={handleSelectSuggestion}
          onSubmitExtra={() => void handleAddExtra()}
        />
      )}
    </div>
  );
}
