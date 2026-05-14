'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Share2 } from 'lucide-react';
import { t } from '@/locales';
import { downloadRecipeBundleFile, getRecipeShareBundle } from '@/lib/api/recipes';
import type { RecipeDto } from '@/lib/api/generated/models/index';

import { DiscoveryToggleCard } from './DiscoveryToggleCard';

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
  const [isSharing, setIsSharing] = React.useState(false);
  const [shareError, setShareError] = React.useState<string | null>(null);

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

  const handleShareRecipe = async () => {
    if (!recipeId || isSharing) return;

    setIsSharing(true);
    setShareError(null);

    try {
      const bundle = await getRecipeShareBundle(recipeId);
      await downloadRecipeBundleFile(currentRecipe.name ?? 'recipe', bundle);
    } catch (error) {
      const isAbortError = error instanceof DOMException && error.name === 'AbortError';
      if (!isAbortError) {
        console.error('Failed to share recipe', error);
        setShareError(t('recipes.shareFailed', 'Could not share this recipe right now.'));
      }
    } finally {
      setIsSharing(false);
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
        className="flex w-full max-w-md flex-col gap-2 rounded-[1.75rem] border border-charcoal/8 bg-white/85 p-2 shadow-glass backdrop-blur-2xl"
        data-testid="stack-action-bar"
      >
        <div className="flex items-center justify-end">
          <button
            type="button"
            data-testid="recipe-share-btn"
            aria-label={t('recipes.shareRecipe', 'Share recipe')}
            title={t('recipes.shareRecipe', 'Share recipe')}
            onClick={() => void handleShareRecipe()}
            disabled={isSharing}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-charcoal shadow-sm transition hover:bg-charcoal/5 disabled:opacity-60"
          >
            <Share2 size={14} />
          </button>
        </div>
        <DiscoveryToggleCard
          isDiscoverable={isIndividualDiscoverable}
          onToggle={handleIndividualToggle}
          isLoading={isUpdating}
          testId={`card-toggle-discovery-${recipeId}${isUpdating ? '-loading' : ''}`}
        />
        {shareError && (
          <p
            data-testid="recipe-share-error"
            className="px-2 pb-1 text-sm font-medium text-terracotta"
          >
            {shareError}
          </p>
        )}
      </motion.div>
    </div>
  );
};
