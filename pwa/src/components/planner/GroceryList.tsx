'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlannerStore } from '@/store/plannerStore';
import { t, tWithVars } from '@/locales';
import { mapIngredientToSection, type GrocerySection } from '@/lib/grocery/aisleMapper';
import { AISLE_ORDER } from '@/lib/grocery/aisleOrder';
import { useSchedule } from '@/lib/api/schedule';

interface GroceryListProps {
  weekOffset: number;
  ingredients: string[];
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

export function GroceryList({ weekOffset, ingredients, onClose }: GroceryListProps) {
  const { groceryState, setGroceryItemToggle, setGroceryState } = usePlannerStore();
  const { updateGroceryState } = useSchedule();
  const [errorItems, setErrorItems] = useState<Set<string>>(new Set());
  const grouped = useMemo(() => {
    const result: Partial<Record<GrocerySection, string[]>> = {};
    for (const ingredient of ingredients) {
      const section = mapIngredientToSection(ingredient);
      if (!result[section]) result[section] = [];
      result[section]!.push(ingredient);
    }
    return result;
  }, [ingredients]);

  useEffect(() => {
    // Initialize grocery state if not already set and we have ingredients
    if (ingredients.length > 0 && Object.keys(groceryState).length === 0) {
      const initialState = ingredients.reduce(
        (acc, ing) => {
          acc[ing] = false;
          return acc;
        },
        {} as Record<string, boolean>
      );
      setGroceryState(initialState);
    }
  }, [ingredients, groceryState, setGroceryState]);

  const handleToggle = async (ingredientName: string) => {
    const newState = !groceryState[ingredientName];
    setGroceryItemToggle(ingredientName, newState);

    // Persist to API
    try {
      await updateGroceryState(weekOffset, {
        ...groceryState,
        [ingredientName]: newState,
      });
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
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <p className="text-charcoal/40 font-medium">
                  {t('grocery.noIngredients', "No ingredients in this week's plan")}
                </p>
              </motion.div>
            ) : (
              <div className="space-y-8">
                {AISLE_ORDER.map((aisle) => {
                  const aisleItems = grouped[aisle] || [];
                  if (aisleItems.length === 0) return null;

                  const checkedCount = aisleItems.filter((item) => groceryState[item]).length;

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
                          const isChecked = groceryState[item] ?? false;
                          const hasError = errorItems.has(item);
                          return (
                            <motion.button
                              key={item}
                              onClick={() => handleToggle(item)}
                              layout
                              className={`w-full flex items-center space-x-4 p-4 rounded-2xl transition-all ${
                                isChecked
                                  ? 'bg-sage/5 text-charcoal/40'
                                  : 'hover:bg-charcoal/2 text-charcoal'
                              }`}
                              data-testid={`grocery-item-checkbox`}
                              data-item-name={item}
                            >
                              {isChecked ? (
                                <CheckCircle2 size={20} className="text-sage flex-shrink-0" />
                              ) : (
                                <Circle size={20} className="text-charcoal/20 flex-shrink-0" />
                              )}
                              <span
                                className={`text-left font-medium transition-all ${
                                  isChecked ? 'line-through opacity-60' : ''
                                }`}
                              >
                                {item}
                              </span>
                              {hasError && (
                                <AlertCircle
                                  size={12}
                                  className="text-terracotta flex-shrink-0 ml-1"
                                  data-testid="grocery-item-error"
                                />
                              )}
                            </motion.button>
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
