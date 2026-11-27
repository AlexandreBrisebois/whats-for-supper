import { useState } from 'react';
import { reclassifyFoodCategory } from '@/lib/api/foods';
import type { GroceryLineItemDto } from '@/lib/api/generated/models';
import { reclassifyIngredient } from '@/lib/api/ingredients';
import type { GrocerySection } from '@/lib/grocery/aisleMapper';
import { useWeekStore } from '@/store/weekStore';
import { categoryCorrectionKey } from './helpers';

export function useGroceryReclassify(weekOffset: number) {
  const [reclassifyOpen, setReclassifyOpen] = useState<string | null>(null);
  const [reclassifyErrors, setReclassifyErrors] = useState<Set<string>>(new Set());
  const [pendingReclassifications, setPendingReclassifications] = useState<Set<string>>(new Set());
  const reclassifyGroceryItem = useWeekStore((state) => state.reclassifyGroceryItem);

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

  return {
    reclassifyOpen,
    setReclassifyOpen,
    reclassifyErrors,
    pendingReclassifications,
    handleReclassify,
  };
}
