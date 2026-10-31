'use client';

import {
  Utensils,
  UtensilsCrossed,
  ArrowRightLeft,
  Sparkles,
  ChevronDown,
  Clock,
} from 'lucide-react';
import { useId, useState } from 'react';
import { cn } from '@/lib/utils';
import { TonightRecipeImage } from './TonightRecipeImage';
import { t, tWithVars } from '@/locales';
import { formatRecipeTime } from '@/lib/duration';

// ---------------------------------------------------------------------------
// TonightCardBase — shared Solar Earth card shell used by TonightMenuCard and
// TonightPivotCard. Content and controls stay in ordinary document flow.
// ---------------------------------------------------------------------------
interface TonightCardBaseProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function TonightCardBase({ children, className, ...rest }: TonightCardBaseProps) {
  return (
    <div
      className={cn(
        'rounded-[3rem] bg-white shadow-[0_24px_60px_-24px] shadow-charcoal/20 border border-white',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------

interface TonightMenuCardProps {
  recipeId: string;
  recipeName: string;
  description?: string;
  imageUrl?: string;
  totalTime?: string;
  ingredients?: string[];
  onCookMode?: (id: string) => void;
  onSkip?: (id: string) => void;
}

export function TonightMenuCard({
  recipeId,
  recipeName,
  description,
  imageUrl,
  totalTime = '30-45 mins',
  ingredients = [],
  onCookMode,
  onSkip,
}: TonightMenuCardProps) {
  const detailsId = useId();
  const [disclosure, setDisclosure] = useState({ recipeId, expanded: false });
  // Reset before rendering another identity, while retaining same-recipe hydration.
  if (disclosure.recipeId !== recipeId) {
    setDisclosure({ recipeId, expanded: false });
  }
  const expanded = disclosure.recipeId === recipeId && disclosure.expanded;

  return (
    <div className="w-full min-w-0 [overflow-wrap:anywhere]" data-testid="tonight-menu-card">
      <TonightCardBase className="flex flex-col p-6 [container-type:inline-size]">
        <div className="flex flex-wrap justify-between items-center gap-2 mb-3 px-1">
          <h2 className="font-heading text-base font-medium text-charcoal-600">
            {t('home.tonightsMenu', "Tonight's menu")}
          </h2>
          {totalTime && (
            <span className="inline-flex max-w-full items-center gap-2 text-sm font-semibold text-terracotta-700 bg-terracotta-50 px-3 py-2 rounded-full uppercase tracking-wide">
              <Clock size={14} aria-hidden="true" className="shrink-0" />
              {tWithVars('common.readyIn', 'READY IN {{time}}', {
                time: formatRecipeTime(totalTime),
              })}
            </span>
          )}
        </div>

        {/* Keep food visible under text growth; page flow absorbs further space pressure. */}
        <TonightRecipeImage
          key={`${recipeId}:${imageUrl}`}
          imageUrl={imageUrl}
          alt={recipeName}
          className="aspect-[5/4] mb-4"
          fallback={<Utensils size={28} />}
        />

        <div className="flex flex-col gap-2 px-1">
          <h3 className="font-heading text-[2rem] font-black text-charcoal leading-tight tracking-tight">
            {recipeName || (
              <span className="text-charcoal-600 italic text-xl">
                {t('home.preparingRecipe', 'Preparing recipe…')}
              </span>
            )}
          </h3>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => onCookMode?.(recipeId)}
            className="flex min-w-[min(100%,6.5em)] max-w-full flex-[1_1_6em] items-center justify-center gap-1.5 min-h-14 px-2 py-3 rounded-[1.5rem] bg-terracotta text-cream-100 hover:bg-terracotta-600 active:bg-terracotta-700 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-charcoal"
            data-testid="cook-mode-btn"
          >
            <UtensilsCrossed size={16} aria-hidden="true" className="shrink-0" />
            <span className="text-base font-semibold leading-normal [overflow-wrap:normal]">
              {t('home.cook', 'Cook')}
            </span>
          </button>
          <button
            onClick={() => onSkip?.(recipeId)}
            className="flex min-w-[min(100%,7.5em)] max-w-full flex-[1.4_1_7.5em] items-center justify-center gap-1.5 min-h-14 px-2 py-3 rounded-[1.5rem] border border-terracotta-200 bg-white text-terracotta-700 hover:bg-terracotta-50 active:bg-terracotta-100 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-charcoal"
            data-testid="skip-tonight-btn"
          >
            <ArrowRightLeft size={16} aria-hidden="true" className="shrink-0" />
            <span className="min-w-0 text-base font-semibold leading-normal [overflow-wrap:normal]">
              {t('home.changePlan', 'Change plan')}
            </span>
          </button>
        </div>
        <button
          type="button"
          data-testid="tonight-ingredients-toggle"
          aria-expanded={expanded}
          aria-controls={detailsId}
          onClick={() => setDisclosure({ recipeId, expanded: !expanded })}
          className="mt-1 flex min-h-12 min-w-12 items-center justify-start gap-2 self-start rounded-xl px-2 py-3 text-base font-medium leading-normal text-terracotta-700 hover:bg-terracotta-50 active:bg-terracotta-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-charcoal"
        >
          {expanded
            ? t('home.hideIngredients', 'Hide ingredients')
            : t('home.viewIngredients', 'View ingredients')}
          <ChevronDown
            size={18}
            aria-hidden="true"
            className={expanded ? 'shrink-0 rotate-180' : 'shrink-0'}
          />
        </button>
        <div id={detailsId} hidden={!expanded}>
          {expanded && (
            <section
              className="mt-6 border-t border-charcoal/20 pt-6"
              aria-labelledby={`${detailsId}-title`}
            >
              <div className="mb-6 flex items-center justify-between gap-3">
                <h4
                  id={`${detailsId}-title`}
                  className="text-base font-semibold text-charcoal"
                  data-testid="ingredients-info-title"
                >
                  {t('home.ingredientsAndInfo', 'Ingredients & info')}
                </h4>
                <Sparkles size={16} className="shrink-0 text-ochre-800" aria-hidden="true" />
              </div>
              {description && (
                <p className="text-sm text-charcoal-600 leading-relaxed mb-8 font-medium italic">
                  {description}
                </p>
              )}

              <div className="flex flex-wrap gap-2 mb-8">
                {ingredients.map((ing, i) => (
                  <span
                    key={i}
                    className="text-sm font-medium bg-charcoal/10 px-3 py-1.5 rounded-xl text-charcoal"
                  >
                    {ing}
                  </span>
                ))}
                {ingredients.length === 0 && (
                  <span className="text-sm text-charcoal-600 italic">
                    {t('home.noIngredients', 'No ingredients listed')}
                  </span>
                )}
              </div>
            </section>
          )}
        </div>
      </TonightCardBase>
    </div>
  );
}
