'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { DiscoveryCard } from '@/components/discovery/DiscoveryCard';
import { RefreshCcw, Sparkles } from 'lucide-react';
import { DISCOVERY_RECIPES } from '@/lib/mock/discoveryData';

export default function DiscoveryPage() {
  const [recipes, setRecipes] = useState(DISCOVERY_RECIPES);
  const [history, setHistory] = useState<string[]>([]);
  const [matches, setMatches] = useState<string[]>([]);
  const [isEureka, setIsEureka] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const triggerEureka = useCallback(() => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      // Solar Earth palette: Terracotta (#CD5D45) and Golden Ochre (#E1AD01)
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#CD5D45', '#E1AD01'],
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#CD5D45', '#E1AD01'],
      });
    }, 250);
  }, []);

  const handleSwipeRight = (recipeId: string) => {
    setHasInteracted(true);
    setMatches((prev) => [...prev, recipeId]);
    setRecipes((prev) => prev.filter((r) => r.id !== recipeId));

    // Eureka Effect!
    setIsEureka(true);
    triggerEureka();
    setTimeout(() => setIsEureka(false), 2000);
  };

  const handleSwipeLeft = (recipeId: string) => {
    setHasInteracted(true);
    setHistory((prev) => [...prev, recipeId]);
    setRecipes((prev) => prev.filter((r) => r.id !== recipeId));
  };

  const reset = () => {
    setRecipes(DISCOVERY_RECIPES);
    setHistory([]);
    setMatches([]);
  };

  // Only render the top 4 cards for performance and visual clarity
  const visibleRecipes = useMemo(() => {
    return recipes.slice(-4);
  }, [recipes]);

  return (
    <div className="flex flex-col items-center px-6 pt-2 pb-12 h-content min-h-[calc(100dvh-6rem)] relative overflow-hidden">
      {/* Centered Card Stack Container */}
      <div className="flex-1 flex flex-col items-center justify-center w-full">
        {/* Card Arena */}
        <div className="relative z-10 w-full max-w-sm aspect-[3/4] md:aspect-auto md:h-[60vh] min-h-[400px]">
          <AnimatePresence mode="popLayout">
            {recipes.length > 0 ? (
              visibleRecipes.map((recipe, index) => {
                const globalIndex = recipes.findIndex((r) => r.id === recipe.id);
                const stackIndex = recipes.length - 1 - globalIndex;

                if (stackIndex > 3) return null; // Defensive check

                return (
                  <DiscoveryCard
                    key={recipe.id}
                    {...recipe}
                    isFront={stackIndex === 0}
                    stackIndex={stackIndex}
                    onSwipeRight={() => handleSwipeRight(recipe.id)}
                    onSwipeLeft={() => handleSwipeLeft(recipe.id)}
                  />
                );
              })
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex h-full w-full flex-col items-center justify-center rounded-[2.5rem] bg-white/50 border-2 border-dashed border-charcoal/10 glass-solar"
              >
                <div className="mb-4 rounded-full bg-ochre/10 p-4 text-ochre">
                  <RefreshCcw size={32} />
                </div>
                <p className="px-10 text-center font-medium text-charcoal/60">
                  You&apos;ve seen all the inspirations for today!
                </p>
                <button
                  onClick={reset}
                  className="mt-6 rounded-full bg-ochre px-8 py-3 font-bold text-white shadow-lg shadow-ochre/20 active:scale-95 transition-transform"
                >
                  Refresh Stack
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Control Buttons (Thumb Zone) */}
      <div className="mt-8 flex w-full max-w-sm shrink-0 items-center justify-between px-8 pb-4">
        <button
          onClick={() => recipes.length > 0 && handleSwipeLeft(recipes[recipes.length - 1].id)}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-terracotta shadow-[0_10px_25px_rgba(205,93,69,0.15)] border border-terracotta/5 active:scale-90 transition-transform"
        >
          <div className="text-2xl">✕</div>
        </button>

        <button
          onClick={reset}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/50 text-charcoal/30 shadow-sm border border-charcoal/5 active:rotate-180 transition-transform duration-500"
        >
          <RefreshCcw size={18} />
        </button>

        <button
          onClick={() => recipes.length > 0 && handleSwipeRight(recipes[recipes.length - 1].id)}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-sage shadow-[0_10px_25px_rgba(138,154,91,0.15)] border border-sage/5 active:scale-90 transition-transform"
        >
          <div className="text-3xl">♥</div>
        </button>
      </div>

      {/* Eureka Pulse Overlay */}
      <AnimatePresence>
        {isEureka && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-0 pointer-events-none bg-ochre/5"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
