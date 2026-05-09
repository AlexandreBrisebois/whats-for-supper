'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { t } from '@/locales';
import type { RecipeDto } from '@/lib/api/generated/models/index';

interface StackActionBarProps {
  currentRecipe: RecipeDto;
  currentIndex: number;
  totalCount: number;
  isDiscoverableOnly: boolean;
  onToggleGlobalFilter: () => void;
  onToggleIndividualCuration: (recipeId: string, newValue: boolean) => Promise<void>;
}

export const StackActionBar: React.FC<StackActionBarProps> = ({
  currentRecipe,
  currentIndex,
  totalCount,
  isDiscoverableOnly,
  onToggleGlobalFilter,
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
    <div className="flex flex-col items-center w-full px-6 py-4 gap-2">
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
        className="flex w-full max-w-md flex-col gap-2 rounded-[1.75rem] border border-charcoal/8 bg-white/85 p-2 shadow-glass backdrop-blur-2xl"
        data-testid="stack-action-bar"
      >
        {/* Global Toggle: Library (all) vs Discovery (voteable only) */}
        <button
          onClick={onToggleGlobalFilter}
          className={`flex min-h-11 items-center justify-center gap-2 rounded-[1.25rem] px-4 py-2 transition-all duration-300 ${
            isDiscoverableOnly
              ? 'bg-ochre/15 text-ochre-800 border border-ochre/25 shadow-sm shadow-ochre/10'
              : 'bg-cream text-charcoal/70 border border-charcoal/8 hover:bg-ochre/10 hover:text-charcoal'
          }`}
          data-testid="stack-toggle-discoverable"
          aria-label={
            isDiscoverableOnly
              ? t('recipes.showingDiscovery', 'Showing recipes marked Discovery')
              : t('recipes.showingAll', 'Showing all recipes')
          }
        >
          <Sparkles className={`h-3.5 w-3.5 ${isDiscoverableOnly ? 'fill-ochre' : ''}`} />
          <span className="text-xs font-black tracking-wide">
            {isDiscoverableOnly
              ? t('navigation.discover', 'Discovery')
              : t('recipes.allRecipes', 'All Recipes')}
          </span>
        </button>

        {/* Individual card: add/remove from Discovery */}
        <button
          onClick={handleIndividualToggle}
          disabled={isUpdating}
          className={`flex min-h-12 items-center justify-between gap-4 rounded-[1.25rem] px-4 py-2.5 text-left transition-all duration-300 ${
            isIndividualDiscoverable
              ? 'bg-sage/10 text-charcoal border border-sage/25 shadow-sm shadow-sage/10'
              : 'bg-charcoal/5 text-charcoal/65 border border-charcoal/8 hover:bg-charcoal/8 hover:text-charcoal'
          } ${isUpdating ? 'opacity-50 cursor-wait' : ''}`}
          data-testid={`card-toggle-discovery-${recipeId}${isUpdating ? '-loading' : ''}`}
          aria-label={
            isIndividualDiscoverable
              ? t('recipes.turnOffDiscovery', 'Turn off Discovery for this recipe')
              : t('recipes.turnOnDiscovery', 'Turn on Discovery for this recipe')
          }
        >
          <span className="flex flex-col leading-tight">
            <span className="text-xs font-black tracking-wide text-charcoal">
              {t('navigation.discover', 'Discovery')}
            </span>
            <span className="text-[10px] font-bold text-charcoal/45">
              {t('discovery.showsInDiscovery', 'Shows in Discovery voting')}
            </span>
          </span>
          <span
            className={`relative h-7 w-12 rounded-full transition-colors duration-300 ${
              isIndividualDiscoverable ? 'bg-sage' : 'bg-charcoal/20'
            }`}
            aria-hidden="true"
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${
                isIndividualDiscoverable ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </span>
        </button>
      </motion.div>
    </div>
  );
};
