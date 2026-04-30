'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { DiscoveryCard } from '@/components/discovery/DiscoveryCard';
import { RefreshCcw, Loader2 } from 'lucide-react';
import { getCategories, getDiscoveryStack, submitVote, DiscoveryRecipe } from '@/lib/api/discovery';
import { API_BASE_URL } from '@/lib/constants/config';
import { useDiscoveryStore } from '@/store/discoveryStore';
import { useFamily } from '@/hooks/useFamily';
import { t, tWithVars } from '@/locales';

export default function DiscoveryPage() {
  const { setHasPendingCards } = useDiscoveryStore();
  const { selectedFamilyMemberId, _hasHydrated } = useFamily();
  const [recipes, setRecipes] = useState<DiscoveryRecipe[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isEureka, setIsEureka] = useState(false);
  const [matchCount, setMatchCount] = useState(0);

  const performFetch = useCallback(async () => {
    const cats = await getCategories();
    let stack: DiscoveryRecipe[] = [];
    if (cats.length > 0) {
      const rawStack = await getDiscoveryStack(cats[0]);
      console.log('rawStack from API first item:', JSON.stringify(rawStack[0]));
      stack = rawStack.map((r) => ({
        ...r,
        imageUrl: `${API_BASE_URL}/api/recipes/${r.id}/hero`,
      }));
      console.log('mapped stack first item:', JSON.stringify(stack[0]));
    }
    return { cats, stack };
  }, []);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await performFetch();
      setCategories(data.cats);
      setRecipes(data.stack);
      setCurrentCategoryIndex(0);
    } catch (error) {
      console.error('Failed to fetch discovery data', error);
    } finally {
      setIsLoading(false);
    }
  }, [performFetch]);

  useEffect(() => {
    if (!_hasHydrated || !selectedFamilyMemberId) return;

    let ignore = false;
    const initialize = async () => {
      try {
        const data = await performFetch();
        if (!ignore) {
          setCategories(data.cats);
          setRecipes(data.stack);
          setCurrentCategoryIndex(0);
        }
      } catch (error) {
        console.error('Initial discovery fetch failed', error);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };

    initialize();
    return () => {
      ignore = true;
    };
  }, [performFetch, _hasHydrated, selectedFamilyMemberId]);

  // Sync pending cards status to store
  useEffect(() => {
    setHasPendingCards(recipes.length > 0);
    return () => setHasPendingCards(false);
  }, [recipes.length, setHasPendingCards]);

  const loadNextCategory = useCallback(async () => {
    const nextIndex = currentCategoryIndex + 1;
    if (nextIndex < categories.length) {
      setIsLoading(true);
      try {
        const stack = await getDiscoveryStack(categories[nextIndex]);
        console.log('loadNextCategory rawStack first:', JSON.stringify(stack[0]));
        const mappedStack = stack.map((r) => ({
          ...r,
          imageUrl: `${API_BASE_URL}/api/recipes/${r.id}/hero`,
        }));
        console.log('loadNextCategory mappedStack first:', JSON.stringify(mappedStack[0]));
        setRecipes(mappedStack);
        setCurrentCategoryIndex(nextIndex);
      } catch (error) {
        console.error('Failed to fetch next category stack', error);
      } finally {
        setIsLoading(false);
      }
    }
  }, [categories, currentCategoryIndex]);

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
    // Optimistic Update
    const recipe = recipes.find((r) => r.id === recipeId);
    console.log('handleSwipeRight:', {
      recipeId,
      recipeKeys: recipe ? Object.keys(recipe) : 'no recipe',
      hasFamilyInterest: recipe?.hasFamilyInterest,
      recipe,
    });
    const updatedRecipes = recipes.filter((r) => r.id !== recipeId);
    setRecipes(updatedRecipes);

    if (recipe?.hasFamilyInterest) {
      console.log('Match found! Incrementing matchCount');
      setMatchCount((prev) => prev + 1);
    }

    // Background Vote
    submitVote(recipeId, 1).catch((error) => {
      console.error('Failed to submit like vote', error);
      // Optional: Re-insert or show toast
    });

    // Eureka Effect!
    setIsEureka(true);
    triggerEureka();
    setTimeout(() => setIsEureka(false), 2000);

    if (updatedRecipes.length === 0) {
      loadNextCategory();
    }
  };

  const handleSwipeLeft = (recipeId: string) => {
    // Optimistic Update
    const updatedRecipes = recipes.filter((r) => r.id !== recipeId);
    setRecipes(updatedRecipes);

    // Background Vote
    submitVote(recipeId, 2).catch((error) => {
      console.error('Failed to submit dislike vote', error);
    });

    if (updatedRecipes.length === 0) {
      loadNextCategory();
    }
  };

  // Only render the top 4 cards for performance and visual clarity
  const visibleRecipes = useMemo(() => {
    return recipes.slice(-4);
  }, [recipes]);

  if (isLoading && recipes.length === 0) {
    return (
      <div className="flex h-[calc(100dvh-6rem)] w-full items-center justify-center">
        <Loader2 className="animate-spin text-ochre" size={48} data-testid="discovery-loader" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-6 pt-2 pb-12 h-content min-h-[calc(100dvh-6rem)] relative overflow-hidden">
      {/* Centered Card Stack Container */}
      <div className="flex-1 flex flex-col items-center justify-center w-full">
        {/* Card Arena */}
        <div className="relative z-10 w-full max-w-sm aspect-[3/4] md:aspect-auto md:h-[60vh] min-h-[400px]">
          <AnimatePresence>
            {recipes.length > 0 ? (
              visibleRecipes.map((recipe, index) => {
                const globalIndex = recipes.findIndex((r) => r.id === recipe.id);
                const stackIndex = recipes.length - 1 - globalIndex;

                if (stackIndex > 3) return null;

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
                data-testid="discovery-empty-state"
                className="flex h-full w-full flex-col items-center justify-center rounded-[2.5rem] bg-white/50 border-2 border-dashed border-charcoal/10 glass-solar px-6 text-center"
              >
                <div className="mb-4 rounded-full bg-ochre/10 p-4 text-ochre">
                  <RefreshCcw size={32} />
                </div>
                <h3 className="text-xl font-bold font-heading text-charcoal mb-2">
                  {t('discovery.wrapUpTitle', "That's a wrap!")}
                </h3>
                <p className="px-6 text-sm font-medium text-charcoal/60 leading-relaxed mb-8">
                  {matchCount > 0
                    ? tWithVars(
                        'discovery.matchesFound',
                        `You found ${matchCount} matches with your family! Ready to get cooking?`,
                        { count: matchCount }
                      )
                    : t('discovery.noMoreRecipes', "You've seen everything for now. Why not add some fresh ideas?")}
                </p>

                <div className="flex flex-col w-full gap-3">
                  <button
                    onClick={() =>
                      (window.location.href = matchCount > 0 ? '/planner' : '/capture')
                    }
                    className="w-full rounded-full bg-ochre px-8 py-3.5 font-bold text-white shadow-lg shadow-ochre/20 active:scale-95 transition-all hover:bg-ochre-dark"
                  >
                    {matchCount > 0 ? t('discovery.goToPlanner', 'Go to Planner') : t('discovery.captureNew', 'Capture a New Recipe')}
                  </button>

                  <button
                    onClick={fetchCategories}
                    className="w-full rounded-full bg-white/50 px-8 py-3.5 font-bold text-charcoal/60 border border-charcoal/10 active:scale-95 transition-all hover:bg-white"
                  >
                    {t('discovery.refreshFeed', 'Refresh Feed')}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Control Buttons (Thumb Zone) */}
      <div className="mt-10 flex w-full max-w-sm shrink-0 items-center justify-between px-8 pb-4">
        <button
          disabled={recipes.length === 0}
          onClick={() => recipes.length > 0 && handleSwipeLeft(recipes[recipes.length - 1].id)}
          data-testid="dislike-button"
          className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-terracotta shadow-[0_10px_25px_rgba(205,93,69,0.15)] border border-terracotta/5 active:scale-90 transition-transform disabled:opacity-20"
        >
          <div className="text-2xl">✕</div>
        </button>

        <button
          onClick={fetchCategories}
          data-testid="refresh-button"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/50 text-charcoal/30 shadow-sm border border-charcoal/5 active:rotate-180 transition-transform duration-500"
        >
          <RefreshCcw size={18} />
        </button>

        <button
          disabled={recipes.length === 0}
          onClick={() => recipes.length > 0 && handleSwipeRight(recipes[recipes.length - 1].id)}
          data-testid="like-button"
          className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-sage shadow-[0_10px_25px_rgba(138,154,91,0.15)] border border-sage/5 active:scale-90 transition-transform disabled:opacity-20"
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
