'use client';

import { Utensils, UtensilsCrossed, ArrowRightLeft, Sparkles, ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';
import { cn } from '@/lib/utils';
import { getImageUrl } from '@/lib/imageUtils';
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
      className={cn('rounded-[3rem] bg-white shadow-lg border-2 border-white/20', className)}
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
      <TonightCardBase className="flex flex-col p-6">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-5 px-1">
          <h2 className="font-heading text-base font-semibold text-charcoal">
            {t('home.tonightsMenu', "Tonight's menu")}
          </h2>
          {totalTime && (
            <span className="text-sm font-semibold text-charcoal bg-ochre/10 px-3 py-1 rounded-full uppercase tracking-widest">
              {tWithVars('common.readyIn', 'READY IN {{time}}', {
                time: formatRecipeTime(totalTime),
              })}
            </span>
          )}
        </div>

        <div className="relative aspect-[4/3] max-h-64 w-full shrink-0 rounded-[2.5rem] overflow-hidden mb-6">
          {imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={getImageUrl(imageUrl)}
              alt={recipeName}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-charcoal/5 flex items-center justify-center">
              <Utensils size={48} className="text-charcoal-600" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/60 via-transparent to-transparent opacity-60" />
        </div>

        <div className="flex flex-col gap-2 px-1">
          <h3 className="font-heading text-3xl font-black text-charcoal leading-snug tracking-tight">
            {recipeName || (
              <span className="text-charcoal-600 italic text-xl">
                {t('home.preparingRecipe', 'Preparing recipe…')}
              </span>
            )}
          </h3>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-3">
          <button
            onClick={() => onCookMode?.(recipeId)}
            className="flex items-center justify-center gap-2 min-h-14 px-4 py-3 rounded-[1.5rem] border border-ochre-800 bg-ochre text-charcoal transition-all focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-charcoal active:scale-95 hover:brightness-95"
            data-testid="cook-mode-btn"
          >
            <UtensilsCrossed size={18} className="shrink-0" />
            <span className="text-base font-semibold leading-normal">{t('home.cook', 'Cook')}</span>
          </button>
          <button
            onClick={() => onSkip?.(recipeId)}
            className="flex items-center justify-center gap-2 min-h-14 px-4 py-3 rounded-[1.5rem] border border-charcoal text-charcoal transition-all focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-charcoal active:scale-95 hover:brightness-95"
            data-testid="skip-tonight-btn"
          >
            <ArrowRightLeft size={18} className="shrink-0" />
            <span className="text-base font-semibold leading-normal">
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
          className="mt-3 flex min-h-14 items-center justify-center gap-2 rounded-[1.5rem] border border-charcoal px-4 py-3 text-base font-semibold leading-normal text-charcoal hover:bg-charcoal/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-charcoal"
        >
          {expanded
            ? t('home.hideIngredients', 'Hide ingredients')
            : t('home.viewIngredients', 'View ingredients')}
          <ChevronDown size={18} aria-hidden="true" className="shrink-0" />
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
