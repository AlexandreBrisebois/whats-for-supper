'use client';

import React from 'react';
import { Heart } from 'lucide-react';
import type { RecipeDto } from '@/lib/api/generated/models/index';

interface StackActionBarProps {
  currentRecipe: RecipeDto;
  position: number;
  total: number;
  onToggleDiscoverable: (recipeId: string, newValue: boolean) => Promise<void>;
}

export const StackActionBar: React.FC<StackActionBarProps> = ({
  currentRecipe,
  position,
  total,
  onToggleDiscoverable,
}) => {
  const recipeId = currentRecipe.id ?? '';

  // `pendingValue` holds the optimistic override while a PATCH is in flight.
  // When null the component falls back to the prop value, which automatically
  // reflects the correct state after a card change without needing an effect.
  const [pendingValue, setPendingValue] = React.useState<boolean | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);
  const [loadingForId, setLoadingForId] = React.useState<string | null>(null);

  // Derive the displayed value: use the optimistic override only while the
  // in-flight request belongs to the current card.
  const isDiscoverable =
    isLoading && loadingForId === recipeId && pendingValue !== null
      ? pendingValue
      : (currentRecipe.isDiscoverable ?? false);

  const handleToggle = async () => {
    if (isLoading) return;

    const newValue = !isDiscoverable;

    // Optimistic update
    setPendingValue(newValue);
    setLoadingForId(recipeId);
    setIsLoading(true);
    setHasError(false);

    try {
      await onToggleDiscoverable(recipeId, newValue);
    } catch {
      setHasError(true);
      setTimeout(() => setHasError(false), 2000);
    } finally {
      setPendingValue(null);
      setLoadingForId(null);
      setIsLoading(false);
    }
  };

  return (
    <div data-testid="stack-action-bar" className="flex items-center justify-between px-6 py-4">
      {/* Discoverable toggle */}
      <div className="relative">
        {isLoading && (
          <span
            data-testid={`card-toggle-discovery-${recipeId}-loading`}
            className="absolute inset-0 flex items-center justify-center"
            aria-hidden="true"
          >
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-ochre border-t-transparent" />
          </span>
        )}
        <button
          type="button"
          data-testid={`card-toggle-discovery-${recipeId}`}
          aria-label={isDiscoverable ? 'Remove from discovery' : 'Add to discovery'}
          disabled={isLoading}
          onClick={() => void handleToggle()}
          className={[
            'inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-black transition-all',
            'border shadow-sm',
            isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
            hasError
              ? 'border-red-300 bg-red-50 text-red-600'
              : isDiscoverable
                ? 'border-ochre bg-ochre text-white shadow-ochre/20'
                : 'border-charcoal/10 bg-white text-charcoal/70 hover:bg-ochre-50/80 hover:text-ochre-700',
          ].join(' ')}
        >
          <Heart size={16} className={isDiscoverable ? 'fill-white' : ''} />
          <span>{isDiscoverable ? 'In discovery' : 'Add to discovery'}</span>
        </button>
      </div>

      {/* Depth indicator */}
      <span
        data-testid="stack-depth-indicator"
        aria-live="polite"
        className="text-sm font-black tabular-nums text-charcoal/50 tracking-tight"
      >
        {position} / {total}
      </span>
    </div>
  );
};
