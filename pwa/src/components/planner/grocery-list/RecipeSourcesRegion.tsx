import React from 'react';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { t, tWithVars } from '@/locales';

interface RecipeSourcesToggleButtonProps {
  itemLabel: string;
  renderKey: string;
  isOpen: boolean;
  onToggle: () => void;
}

export function RecipeSourcesToggleButton({
  itemLabel,
  renderKey,
  isOpen,
  onToggle,
}: RecipeSourcesToggleButtonProps) {
  return (
    <button
      type="button"
      data-testid="grocery-recipe-sources-toggle"
      className="inline-flex min-h-[48px] min-w-[48px] shrink-0 items-center justify-center rounded-full text-icon-affordance hover:text-ink-body hover:bg-charcoal/5 focus-visible:outline-2 focus-visible:outline-hearth-ink"
      aria-label={tWithVars('grocery.sourceRecipesFor', 'Source recipes for {{ingredient}}', {
        ingredient: itemLabel,
      })}
      aria-expanded={isOpen}
      aria-controls={`grocery-sources-${encodeURIComponent(renderKey)}`}
      onClick={onToggle}
    >
      <BookOpen size={18} aria-hidden="true" />
    </button>
  );
}

interface RecipeSourcesRegionProps {
  recipeIds: string[];
  renderKey: string;
  sourceReturnParams: string;
  sourceTitles: Record<string, string | null | undefined>;
}

export function RecipeSourcesRegion({
  recipeIds,
  renderKey,
  sourceReturnParams,
  sourceTitles,
}: RecipeSourcesRegionProps) {
  const encodedKey = encodeURIComponent(renderKey);
  const uniqueIds = [...new Set(recipeIds)];

  return (
    <>
      <div
        id={`grocery-sources-${encodedKey}`}
        data-testid="grocery-recipe-sources-region"
        role="region"
        aria-labelledby={`grocery-sources-heading-${encodedKey}`}
        className="order-last w-full min-w-0 rounded-xl bg-white px-[12px] py-2 text-sm"
      >
        <h4
          id={`grocery-sources-heading-${encodedKey}`}
          className="mb-1 font-semibold text-ink-body"
        >
          {t('grocery.usedIn', 'Used in')}
        </h4>
        <ul>
          {uniqueIds.map((id) => (
            <li key={id}>
              <Link
                prefetch={false}
                className="inline-block min-h-[48px] max-w-full break-words py-3 text-garden-ink underline underline-offset-4"
                href={`/recipes?open=${encodeURIComponent(id)}&reviewAmounts=true${sourceReturnParams}`}
                aria-describedby={`grocery-source-purpose-${encodedKey}`}
              >
                {sourceTitles[id] === undefined
                  ? t('grocery.sourceTitleLoading', 'Loading recipe title…')
                  : (sourceTitles[id] ??
                    t('grocery.sourceTitleUnavailable', 'Recipe title unavailable'))}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <span id={`grocery-source-purpose-${encodedKey}`} className="sr-only">
        {t('grocery.sourceOriginalReview', 'Open the recipe’s original quantities.')}
      </span>
    </>
  );
}
