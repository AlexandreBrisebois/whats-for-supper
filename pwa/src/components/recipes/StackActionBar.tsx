'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Eye, EyeOff } from 'lucide-react';
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
        className="flex items-center gap-1 rounded-full bg-charcoal/90 p-1.5 text-white shadow-2xl backdrop-blur-xl border border-white/10"
        data-testid="stack-action-bar"
      >
        {/* Global Toggle: Library (all) vs Discovery (voteable only) */}
        <button
          onClick={onToggleGlobalFilter}
          className={`flex items-center gap-2 rounded-full px-4 py-2 transition-all duration-300 ${
            isDiscoverableOnly
              ? 'bg-ochre text-charcoal shadow-[0_0_15px_rgba(224,159,31,0.3)]'
              : 'bg-white/5 hover:bg-white/10 text-white/70'
          }`}
          data-testid="stack-toggle-discoverable"
          aria-label={
            isDiscoverableOnly ? 'Filter: showing Discovery only' : 'Filter: showing full Library'
          }
        >
          <Sparkles className={`h-3.5 w-3.5 ${isDiscoverableOnly ? 'fill-charcoal' : ''}`} />
          <span className="text-[10px] font-black uppercase tracking-wider">
            {isDiscoverableOnly ? 'Filter: Discovery' : 'Filter: Library'}
          </span>
        </button>

        <div className="h-4 w-px bg-white/10 mx-1" />

        {/* Individual card: add/remove from Discovery */}
        <button
          onClick={handleIndividualToggle}
          disabled={isUpdating}
          className={`flex items-center gap-2 rounded-full px-4 py-2 transition-all duration-300 ${
            isIndividualDiscoverable
              ? 'bg-sage text-charcoal shadow-[0_0_15px_rgba(125,142,125,0.3)]'
              : 'bg-white/5 hover:bg-white/10 text-white/70'
          } ${isUpdating ? 'opacity-50 cursor-wait' : ''}`}
          data-testid={`card-toggle-discovery-${recipeId}${isUpdating ? '-loading' : ''}`}
          aria-label={isIndividualDiscoverable ? 'Hide from proposals' : 'Propose to family'}
        >
          {isIndividualDiscoverable ? (
            <Eye className="h-3.5 w-3.5 text-charcoal fill-charcoal" />
          ) : (
            <EyeOff className="h-3.5 w-3.5 text-white/70" />
          )}
          <span className="text-[10px] font-black uppercase tracking-wider">
            {isIndividualDiscoverable ? 'Propose' : 'Hidden'}
          </span>
        </button>
      </motion.div>
    </div>
  );
};
