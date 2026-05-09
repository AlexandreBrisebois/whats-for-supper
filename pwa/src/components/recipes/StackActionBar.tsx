'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { t } from '@/locales';
import type { RecipeDto } from '@/lib/api/generated/models/index';

interface StackActionBarProps {
  currentRecipe: RecipeDto;
  currentIndex: number;
  totalCount: number;
  onToggleIndividualCuration: (recipeId: string, newValue: boolean) => Promise<void>;
}

export const StackActionBar: React.FC<StackActionBarProps> = ({
  currentRecipe,
  currentIndex,
  totalCount,
  onToggleIndividualCuration,
}) => {
  const recipeId = currentRecipe.id ?? '';

  // Individual curation state (optimistic)
  const [pendingValue, setPendingValue] = React.useState<boolean | null>(null);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [loadingForId, setLoadingForId] = React.useState<string | null>(null);

  const isIndividualDiscoverable =
    isUpdating && loadingForId === recipeId && pendingValue !== null
      ? pendingValue
      : (currentRecipe.isDiscoverable ?? false);

  const handleIndividualToggle = async () => {
    if (isUpdating) return;
    const newValue = !isIndividualDiscoverable;
    setPendingValue(newValue);
    setLoadingForId(recipeId);
    setIsUpdating(true);
    try {
      await onToggleIndividualCuration(recipeId, newValue);
    } catch (err) {
      console.error('Individual toggle failed', err);
    } finally {
      setPendingValue(null);
      setLoadingForId(null);
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex flex-col items-center w-full py-4 gap-2">
      {/* Depth indicator — lives above the pill, separate from actions */}
      <div className="flex items-center gap-1.5" data-testid="stack-depth-indicator">
        <span className="text-[11px] font-bold tabular-nums text-charcoal/40">
          <span className="text-ochre font-black">{currentIndex + 1}</span>
          <span className="mx-1 text-charcoal/25"> / </span>
          <span>{totalCount}</span>
        </span>
      </div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex w-full flex-col gap-2 rounded-[1.75rem] border border-charcoal/8 bg-white/85 p-2 shadow-glass backdrop-blur-2xl"
        data-testid="stack-action-bar"
      >
        {/* Individual card: add/remove from Discovery */}
        <button
          onClick={handleIndividualToggle}
          disabled={isUpdating}
          className={`flex min-h-[5rem] items-center justify-between gap-4 rounded-[1.5rem] px-6 py-4 text-left transition-all duration-300 ${
            isIndividualDiscoverable
              ? 'bg-sage/15 text-charcoal border border-sage/30 shadow-sm shadow-sage/10'
              : 'bg-charcoal/5 text-charcoal/65 border border-charcoal/8 hover:bg-charcoal/8 hover:text-charcoal'
          } ${isUpdating ? 'opacity-50 cursor-wait' : ''}`}
          data-testid={`card-toggle-discovery-${recipeId}${isUpdating ? '-loading' : ''}`}
          aria-label={
            isIndividualDiscoverable
              ? t('recipes.turnOffDiscovery', 'Turn off Discovery for this recipe')
              : t('recipes.turnOnDiscovery', 'Turn on Discovery for this recipe')
          }
        >
          <span className="flex flex-col gap-0.5 leading-tight">
            <span className="text-sm font-black tracking-wide text-charcoal">
              {t('planner.askFamily', 'Ask the Family')}
            </span>
            <span className="text-[11px] font-bold text-charcoal/50">
              {t('discovery.showsInDiscovery', 'Shows in Discovery voting')}
            </span>
          </span>
          <div
            className={`relative h-8 w-14 rounded-full transition-colors duration-300 ${
              isIndividualDiscoverable ? 'bg-sage' : 'bg-charcoal/20'
            }`}
            aria-hidden="true"
          >
            <div
              className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-300 ${
                isIndividualDiscoverable ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </div>
        </button>
      </motion.div>
    </div>
  );
};
