'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, Circle, Tag, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlannerStore } from '@/store/plannerStore';
import { t, tWithVars } from '@/locales';
import type { GrocerySection } from '@/lib/grocery/aisleMapper';
import { AISLE_ORDER } from '@/lib/grocery/aisleOrder';
import { useSchedule } from '@/lib/api/schedule';
import { reclassifyIngredient } from '@/lib/api/ingredients';
import type { GroceryLineItemDto } from '@/lib/api/generated/models';

interface GroceryListProps {
  weekOffset: number;
  items: GroceryLineItemDto[];
  onClose?: () => void;
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

export function GroceryList({ weekOffset, items, onClose }: GroceryListProps) {
  const { groceryState, setGroceryItemToggle, setGroceryState } = usePlannerStore();
  const { toggleGroceryItem } = useSchedule();
  const [errorItems, setErrorItems] = useState<Set<string>>(new Set());
  const [reclassifyOpen, setReclassifyOpen] = useState<string | null>(null);
  const [reclassifyErrors, setReclassifyErrors] = useState<Set<string>>(new Set());
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
    setReclassifyOpen(null);
    try {
      await reclassifyIngredient(item.normalizedKey!, newSection);
      // Optimistic: the SSE stream will push the recomputed list shortly.
      // No local state change needed beyond closing the picker.
    } catch {
      setReclassifyErrors((prev) => {
        const next = new Set(prev);
        next.add(item.normalizedKey!);
        return next;
      });
      setTimeout(() => {
        setReclassifyErrors((prev) => {
          const next = new Set(prev);
          next.delete(item.normalizedKey!);
          return next;
        });
      }, 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-cream flex flex-col" data-testid="grocery-checklist">
      {/* Header */}
      <div className="p-8 flex items-center justify-between border-b border-charcoal/5 bg-white/50 backdrop-blur-md">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-sage/60">
            {t('grocery.smartShopping', 'Smart Shopping')}
          </p>
          <h2 className="text-xl font-heading font-black text-charcoal">
            {t('grocery.checklist', 'Grocery Checklist')}
          </h2>
        </div>
        {onClose && (
          <Button
            variant="secondary"
            onClick={onClose}
            className="rounded-full h-14 w-14 p-0 border-charcoal/10"
          >
            ×
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-cream/50">
        <div className="max-w-2xl mx-auto py-8 px-6">
          <AnimatePresence mode="wait">
            {Object.keys(grouped).length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-16 px-4"
                data-testid="grocery-empty-state"
              >
                <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-sage/10 flex items-center justify-center">
                  <ShoppingCart size={36} className="text-sage/50" />
                </div>
                <h3 className="font-heading text-xl font-black text-charcoal mb-2">
                  {t('grocery.emptyTitle', 'Your list is empty')}
                </h3>
                <p className="text-charcoal/50 text-sm font-medium max-w-xs mx-auto mb-8 leading-relaxed">
                  {t(
                    'grocery.emptyBody',
                    'Add meals to your planner and your grocery list will build itself — organized by store section.'
                  )}
                </p>
                {onClose && (
                  <Button
                    onClick={onClose}
                    data-testid="grocery-empty-go-to-planner"
                    className="rounded-3xl bg-sage text-white px-8 h-14 text-sm font-bold shadow-lg shadow-sage/20"
                  >
                    {t('grocery.goToPlanner', 'Go to Planner')}
                  </Button>
                )}
              </motion.div>
            ) : (
              <div className="space-y-8">
                {AISLE_ORDER.map((aisle) => {
                  const aisleItems = grouped[aisle] || [];
                  if (aisleItems.length === 0) return null;

                  const checkedCount = aisleItems.filter(
                    (item) => groceryState[item.displayName ?? '']
                  ).length;

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
                        const isComplete =
                          aisleItems.length > 0 && checkedCount === aisleItems.length;
                        return (
                          <div
                            className={`px-6 py-4 border-b border-charcoal/5 ${
                              isComplete
                                ? 'bg-sage/20'
                                : 'bg-gradient-to-r from-charcoal/2 to-transparent'
                            }`}
                            data-testid={
                              isComplete ? 'aisle-header-complete' : 'aisle-header-incomplete'
                            }
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
                                      `${checkedCount}/${aisleItems.length} items`,
                                      {
                                        checked: checkedCount,
                                        total: aisleItems.length,
                                      }
                                    )}
                                  </p>
                                </div>
                              </div>
                              <div className="h-8 w-8 rounded-full bg-sage/10 flex items-center justify-center">
                                {isComplete ? (
                                  <CheckCircle2
                                    size={18}
                                    className="text-sage"
                                    data-testid="section-complete-icon"
                                  />
                                ) : (
                                  <span className="text-xs font-black text-sage">
                                    {Math.round((checkedCount / aisleItems.length) * 100)}%
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Items */}
                      <div className="divide-y divide-charcoal/5 p-4 space-y-2">
                        {aisleItems.map((item) => {
                          const key = item.displayName ?? '';
                          const quantityHint = formatQuantityHint(item.quantity, item.unitText);
                          const isChecked = groceryState[key] ?? false;
                          const hasError = errorItems.has(key);
                          const hasReclassifyError = reclassifyErrors.has(item.normalizedKey ?? '');
                          const isPickerOpen = reclassifyOpen === item.normalizedKey;

                          return (
                            <div key={key} className="relative">
                              <div
                                className={`flex items-center p-4 rounded-2xl transition-all ${
                                  isChecked
                                    ? 'bg-sage/5 text-charcoal/40'
                                    : 'hover:bg-charcoal/2 text-charcoal'
                                }`}
                              >
                                {/* Toggle button — takes up the left portion */}
                                <button
                                  onClick={() => handleToggle(key)}
                                  className="flex min-w-0 items-start space-x-4 flex-1 text-left"
                                  data-testid="grocery-item-checkbox"
                                  data-item-name={key}
                                  data-state={isChecked ? 'checked' : 'unchecked'}
                                  role="checkbox"
                                  aria-checked={isChecked}
                                >
                                  {isChecked ? (
                                    <CheckCircle2 size={20} className="text-sage flex-shrink-0" />
                                  ) : (
                                    <Circle size={20} className="text-charcoal/20 flex-shrink-0" />
                                  )}
                                  <span
                                    className={`min-w-0 flex-1 transition-all ${isChecked ? 'line-through opacity-60' : ''}`}
                                  >
                                    <span
                                      className={`block font-medium transition-all ${isChecked ? 'line-through opacity-60' : ''}`}
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

                                {/* Reclassify button — separate tap target */}
                                <button
                                  onClick={() =>
                                    setReclassifyOpen(
                                      isPickerOpen ? null : (item.normalizedKey ?? null)
                                    )
                                  }
                                  className="ml-2 p-1 rounded-full hover:bg-charcoal/5 text-charcoal/30 hover:text-charcoal/60 transition-colors relative"
                                  aria-label={`Change section for ${key}`}
                                  data-testid="reclassify-btn"
                                  data-item-name={key}
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
                                >
                                  {AISLE_ORDER.map((section) => (
                                    <button
                                      key={section}
                                      onClick={() => handleReclassify(item, section)}
                                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                                        item.section === section
                                          ? 'bg-sage text-white'
                                          : 'bg-white text-charcoal/60 hover:bg-sage/10'
                                      }`}
                                      data-testid={`section-option-${section}`}
                                    >
                                      {section}
                                    </button>
                                  ))}
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

      {/* Footer */}
      {onClose && (
        <div className="p-8 bg-white/50 backdrop-blur-md border-t border-charcoal/5">
          <Button
            onClick={onClose}
            data-testid="done-shopping-btn"
            className="w-full h-16 rounded-3xl bg-sage text-white text-lg font-bold shadow-xl shadow-sage/20"
          >
            {t('grocery.doneShopping', 'Done Shopping')}
          </Button>
        </div>
      )}
    </div>
  );
}
