'use client';

import { Utensils, Ban, Sparkles, ChevronRight, Clock } from 'lucide-react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { getImageUrl } from '@/lib/imageUtils';
import { t } from '@/locales';

// ---------------------------------------------------------------------------
// TonightCardBase — shared Solar Earth card shell used by TonightMenuCard and
// TonightPivotCard. Does NOT include perspective/preserve-3d — those belong on
// the flip wrapper that TonightMenuCard controls.
// ---------------------------------------------------------------------------
interface TonightCardBaseProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function TonightCardBase({ children, className, ...rest }: TonightCardBaseProps) {
  return (
    <div
      className={cn('rounded-[3rem] bg-white shadow-2xl border-2 border-white/20', className)}
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
  prepTime?: string;
  ingredients?: string[];
  onCookMode?: (id: string) => void;
  onSkip?: (id: string) => void;
}

export function TonightMenuCard({
  recipeId,
  recipeName,
  description,
  imageUrl,
  prepTime = '30-45 mins',
  ingredients = [],
  onCookMode,
  onSkip,
}: TonightMenuCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div
      className="relative aspect-[4/5] w-full perspective-1000 group"
      data-testid="tonight-menu-card"
    >
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        className="relative w-full h-full preserve-3d cursor-pointer"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        {/* Front of Card */}
        <TonightCardBase
          className={cn(
            'absolute inset-0 flex flex-col p-6 backface-hidden',
            isFlipped ? 'pointer-events-none' : ''
          )}
        >
          <div className="flex justify-between items-center mb-5 px-1">
            <h2 className="font-heading text-[10px] font-black uppercase tracking-[0.2em] text-charcoal/40">
              {t('home.tonightsMenu', "Tonight's Menu")}
            </h2>
            {prepTime && (
              <span className="text-[10px] font-black text-terracotta bg-terracotta/10 px-3 py-1 rounded-full uppercase tracking-widest">
                {prepTime}
              </span>
            )}
          </div>

          <div className="relative flex-1 rounded-[2.5rem] overflow-hidden shadow-2xl mb-6">
            {imageUrl ? (
              <Image
                src={getImageUrl(imageUrl)}
                alt={recipeName}
                fill
                className="object-cover"
                priority
                unoptimized
              />
            ) : (
              <div className="w-full h-full bg-charcoal/5 flex items-center justify-center">
                <Utensils size={48} className="text-charcoal/10" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal/60 via-transparent to-transparent opacity-60" />
          </div>

          <div className="flex flex-col gap-2 px-1">
            <h3 className="font-heading text-3xl font-black text-charcoal leading-none tracking-tighter">
              {recipeName || (
                <span className="text-charcoal/30 italic text-xl">
                  {t('home.preparingRecipe', 'Preparing recipe…')}
                </span>
              )}
            </h3>
            <p className="text-charcoal/40 text-[10px] font-black uppercase tracking-widest mt-1 flex items-center gap-1">
              {t('home.tapForIngredients', 'Tap for ingredients')} <ChevronRight size={12} />
            </p>
          </div>
        </TonightCardBase>

        {/* Back of Card (Glassmorphism) */}
        <div
          className={cn(
            'absolute inset-0 rounded-[3rem] rotate-y-180 backface-hidden border-2 border-white/40 overflow-hidden flex flex-col shadow-2xl',
            !isFlipped ? 'pointer-events-none' : ''
          )}
          style={{
            background: 'rgba(255, 255, 255, 0.4)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
          }}
        >
          <div className="flex-1 overflow-y-auto scrollbar-none p-8 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h4
                className="text-[10px] font-black uppercase tracking-[0.3em] text-ochre"
                data-testid="ingredients-info-title"
              >
                {t('home.ingredientsAndInfo', 'Ingredients & Info')}
              </h4>
              <Sparkles size={16} className="text-ochre" />
            </div>

            <h3 className="text-2xl font-heading font-black text-charcoal mb-4 tracking-tighter leading-tight">
              {recipeName}
            </h3>

            {description && (
              <p className="text-sm text-charcoal/70 leading-tight mb-8 font-medium italic">
                &ldquo;{description}&rdquo;
              </p>
            )}

            <div className="flex flex-wrap gap-2 mb-8">
              {ingredients.map((ing, i) => (
                <span
                  key={i}
                  className="text-[10px] font-black uppercase tracking-widest bg-charcoal/10 px-3 py-1.5 rounded-xl text-charcoal/60"
                >
                  {ing}
                </span>
              ))}
              {ingredients.length === 0 && (
                <span className="text-[10px] text-charcoal/30 italic">
                  {t('home.noIngredients', 'No ingredients listed')}
                </span>
              )}
            </div>

            <div className="mt-auto flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSkip?.(recipeId);
                  }}
                  className="flex items-center justify-center gap-2 h-14 rounded-[1.5rem] bg-[#CD5D45] text-white shadow-lg shadow-terracotta/20 transition-all active:scale-95 hover:brightness-110"
                  data-testid="skip-tonight-btn"
                >
                  <Ban size={18} />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {t('home.skip', 'Skip')}
                  </span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCookMode?.(recipeId);
                  }}
                  className="flex items-center justify-center gap-2 h-14 rounded-[1.5rem] bg-ochre text-white shadow-lg shadow-ochre/30 transition-all active:scale-95 hover:brightness-110"
                  data-testid="cook-mode-btn"
                >
                  <Utensils size={18} />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {t('home.cook', 'Cook')}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
