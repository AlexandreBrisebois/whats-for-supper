'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { DiscoveryCard } from '@/components/discovery/DiscoveryCard';
import { RefreshCcw, Loader2 } from 'lucide-react';
import { getCategories, getDiscoveryStack, submitVote, DiscoveryRecipe } from '@/lib/api/discovery';
import { useDiscoveryStore } from '@/store/discoveryStore';
import { useFamily } from '@/hooks/useFamily';
import { useRouter } from 'next/navigation';
import { t, tWithVars } from '@/locales';
import { getImageUrl } from '@/lib/imageUtils';

export default function DiscoveryPage() {
  const router = useRouter();
  const { setHasPendingCards, setActiveCategory } = useDiscoveryStore();
  // Lift state to store — SSE can now update the stack without the page being mounted
  const recipes = useDiscoveryStore((s) => s.discoveryStack);
  const fillTheGapVersion = useDiscoveryStore((s) => s.fillTheGapVersion);
  const { selectedFamilyMemberId, _hasHydrated } = useFamily();
  const [isLoading, setIsLoading] = useState(true);
  const [matchCount, setMatchCount] = useState(0);
  const categoriesRef = useRef<string[]>([]);
  const categoryIndexRef = useRef(0);
  // Tracks the last fillTheGapVersion we already handled (prevents double-refetch
  // when recipes.length dep re-fires the effect after the stack loads).
  const lastHandledFillTheGapVersionRef = useRef(0);
  // Tracks whether the initial stack has been committed to the store
  const stackIsLoadedRef = useRef(false);
  // Micro-badge: "Just planned ✓" shown when a card is removed from the visible top 4
  const [showJustPlannedBadge, setShowJustPlannedBadge] = useState(false);
  const justPlannedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const cats = await getCategories();
      categoriesRef.current = cats;
      categoryIndexRef.current = 0;

      let foundNonEmpty = false;
      for (let i = 0; i < cats.length; i++) {
        const categoryToLoad = cats[i];
        const stack = await getDiscoveryStack(categoryToLoad);
        if (stack.length > 0) {
          setActiveCategory(categoryToLoad);
          categoryIndexRef.current = i;
          useDiscoveryStore
            .getState()
            .setStack(
              stack.map((r) => ({ ...r, imageUrl: getImageUrl(`/api/recipes/${r.id}/hero`) }))
            );
          stackIsLoadedRef.current = true;
          foundNonEmpty = true;
          break;
        }
      }
      if (!foundNonEmpty) {
        setActiveCategory(null);
        categoryIndexRef.current = 0;
        useDiscoveryStore.getState().setStack([]);
        stackIsLoadedRef.current = true;
      }
    } catch (error) {
      console.error('Failed to fetch discovery data', error);
    } finally {
      setIsLoading(false);
    }
  }, [setActiveCategory]);

  useEffect(() => {
    if (!_hasHydrated || !selectedFamilyMemberId) return;

    let ignore = false;
    const initialize = async () => {
      try {
        const cats = await getCategories();
        if (ignore) return;
        categoriesRef.current = cats;

        // Nudge priority: read activeCategory from store at call-time (not from
        // the closure dep) so we don't re-trigger this effect when we set it below.
        if (cats.length === 0) {
          if (!ignore) {
            setActiveCategory(null);
            categoryIndexRef.current = 0;
            useDiscoveryStore.getState().setStack([]);
            stackIsLoadedRef.current = true;
          }
        } else {
          const storedCategory = useDiscoveryStore.getState().activeCategory;
          const targetCategory = storedCategory ?? cats[0];
          const index = cats.indexOf(targetCategory);
          const resolvedIndex = index !== -1 ? index : 0;

          // Wrap-around scan: start from resolvedIndex, cycle through all
          // categories so earlier ones aren't skipped if a nudge pointed mid-list.
          let foundNonEmpty = false;
          for (let i = 0; i < cats.length && !ignore; i++) {
            const tryIndex = (resolvedIndex + i) % cats.length;
            const categoryToLoad = cats[tryIndex];
            const stack = await getDiscoveryStack(categoryToLoad);
            if (ignore) break;
            if (stack.length > 0) {
              categoryIndexRef.current = tryIndex;
              setActiveCategory(categoryToLoad);
              useDiscoveryStore
                .getState()
                .setStack(
                  stack.map((r) => ({ ...r, imageUrl: getImageUrl(`/api/recipes/${r.id}/hero`) }))
                );
              stackIsLoadedRef.current = true;
              foundNonEmpty = true;
              break;
            }
          }
          if (!foundNonEmpty && !ignore) {
            setActiveCategory(null);
            categoryIndexRef.current = 0;
            useDiscoveryStore.getState().setStack([]);
            stackIsLoadedRef.current = true;
          }
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
    // activeCategory is intentionally NOT a dep — we read it from the store at call-time
    // inside initialize() to avoid re-triggering this effect when we call setActiveCategory.
    // A separate effect below handles nudge-driven category switches.
  }, [_hasHydrated, selectedFamilyMemberId, setActiveCategory]);

  // Sync pending cards status to store
  useEffect(() => {
    setHasPendingCards(recipes.length > 0);
    return () => setHasPendingCards(false);
  }, [recipes.length, setHasPendingCards]);

  const loadNextCategory = useCallback(async () => {
    const cats = categoriesRef.current;
    const startIndex = categoryIndexRef.current;

    setIsLoading(true);
    try {
      // Wrap-around scan: try every other category before declaring exhaustion.
      // cats.length - 1 iterations skips the current index (already exhausted).
      for (let i = 1; i < cats.length; i++) {
        const nextIndex = (startIndex + i) % cats.length;
        const nextCategory = cats[nextIndex];
        const stack = await getDiscoveryStack(nextCategory);
        if (stack.length > 0) {
          const mappedStack = stack.map((r) => ({
            ...r,
            imageUrl: getImageUrl(`/api/recipes/${r.id}/hero`),
          }));
          useDiscoveryStore.getState().setStack(mappedStack);
          categoryIndexRef.current = nextIndex;
          setActiveCategory(nextCategory);
          return;
        }
      }
      // All categories exhausted → show empty state
      setActiveCategory(null);
      categoryIndexRef.current = 0;
      useDiscoveryStore.getState().setStack([]);
    } catch (error) {
      console.error('Failed to fetch next category stack', error);
    } finally {
      setIsLoading(false);
    }
  }, [setActiveCategory]);

  /**
   * Silent refetch of the current category stack triggered by fill-the-gap
   * invalidation SSE events. Diffs IDs against the current discoveryStack and
   * removes any recipes that are no longer in the response (they were planned).
   * Does NOT flash a loading state — existing cards stay visible until the diff
   * is applied.
   *
   * Uses refs for categories/index so it never needs to be recreated and avoids
   * stale closure issues.
   */
  const refetchCurrentCategory = useCallback(async () => {
    const cats = categoriesRef.current;
    const idx = categoryIndexRef.current;
    if (cats.length === 0) return;
    try {
      const currentCategory = cats[idx];
      const rawStack = await getDiscoveryStack(currentCategory);
      const freshStack = rawStack.map((r) => ({
        ...r,
        imageUrl: getImageUrl(`/api/recipes/${r.id}/hero`),
      }));

      const freshIds = new Set(freshStack.map((r) => r.id));
      const currentStack = useDiscoveryStore.getState().discoveryStack;

      // Determine which IDs were removed and whether any were in the visible top 4
      const visibleTop4Ids = new Set(currentStack.slice(-4).map((r) => r.id));
      let removedFromVisible = false;

      for (const recipe of currentStack) {
        if (!freshIds.has(recipe.id)) {
          if (visibleTop4Ids.has(recipe.id)) {
            removedFromVisible = true;
          }
          useDiscoveryStore.getState().removeFromStack(recipe.id);
        }
      }

      // If SSE-driven removals emptied the category, advance to the next one
      if (useDiscoveryStore.getState().discoveryStack.length === 0) {
        loadNextCategory();
        return;
      }

      // Show micro-badge if any visible card was removed
      if (removedFromVisible) {
        setShowJustPlannedBadge(true);
        if (justPlannedTimerRef.current) clearTimeout(justPlannedTimerRef.current);
        justPlannedTimerRef.current = setTimeout(() => {
          setShowJustPlannedBadge(false);
        }, 2000);
      }
    } catch (error) {
      console.error('Silent refetch of discovery category failed', error);
    }
  }, [loadNextCategory]); // loadNextCategory is stable (ref-based)

  // Subscribe to fill-the-gap invalidation signal from SSE.
  // recipes.length is included so the effect re-fires once the stack loads,
  // handling SSE events that arrived before the initial fetch completed.
  // lastHandledFillTheGapVersionRef prevents double-processing the same version
  // when recipes.length changes for other reasons (e.g. a swipe).
  useEffect(() => {
    if (fillTheGapVersion === 0) return; // skip initial mount
    if (!stackIsLoadedRef.current || recipes.length === 0) return; // stack not ready yet
    if (fillTheGapVersion <= lastHandledFillTheGapVersionRef.current) return; // already handled
    lastHandledFillTheGapVersionRef.current = fillTheGapVersion;
    refetchCurrentCategory();
  }, [fillTheGapVersion, refetchCurrentCategory, recipes.length]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (justPlannedTimerRef.current) clearTimeout(justPlannedTimerRef.current);
    };
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
    useDiscoveryStore.getState().setStack(updatedRecipes);

    if (recipe?.hasFamilyInterest) {
      console.log('Match found! Incrementing matchCount');
      setMatchCount((prev) => prev + 1);
    }

    // Background Vote
    submitVote(recipeId, 1).catch((error) => {
      console.error('Failed to submit like vote', error);
      // Optional: Re-insert or show toast
    });

    if (updatedRecipes.length === 0) {
      loadNextCategory();
    }
  };

  const handleSwipeLeft = (recipeId: string) => {
    // Optimistic Update
    const updatedRecipes = recipes.filter((r) => r.id !== recipeId);
    useDiscoveryStore.getState().setStack(updatedRecipes);

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
          {/* Micro-badge: "Just planned ✓" — shown inline at top of card stack, 2s auto-fade */}
          <AnimatePresence>
            {showJustPlannedBadge && (
              <motion.div
                key="just-planned-badge"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                data-testid="just-planned-badge"
                className="absolute -top-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 rounded-full bg-sage/15 border border-sage/30 px-3 py-1 text-xs font-semibold text-sage whitespace-nowrap"
              >
                Just planned ✓
              </motion.div>
            )}
          </AnimatePresence>

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
                    : t(
                        'discovery.noMoreRecipes',
                        "You've seen everything for now. Why not add some fresh ideas?"
                      )}
                </p>

                <div className="flex flex-col w-full gap-3">
                  <button
                    onClick={() => router.push(matchCount > 0 ? '/planner' : '/capture')}
                    className="w-full rounded-full bg-ochre px-8 py-3.5 font-bold text-white shadow-lg shadow-ochre/20 active:scale-95 transition-all hover:bg-ochre-dark"
                  >
                    {matchCount > 0
                      ? t('discovery.goToPlanner', 'Go to Planner')
                      : t('discovery.captureNew', 'Capture a New Recipe')}
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
          type="button"
          disabled={recipes.length === 0}
          onClick={() => recipes.length > 0 && handleSwipeLeft(recipes[recipes.length - 1].id)}
          data-testid="dislike-button"
          aria-label="Dislike recipe"
          className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-terracotta shadow-[0_10px_25px_rgba(205,93,69,0.15)] border border-terracotta/5 active:scale-90 transition-transform disabled:opacity-20"
        >
          <div className="text-2xl">✕</div>
        </button>

        {recipes.length === 0 ? (
          <button
            type="button"
            onClick={fetchCategories}
            data-testid="refresh-button"
            aria-label="Refresh recipe suggestions"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/50 text-charcoal/30 shadow-sm border border-charcoal/5 active:rotate-180 transition-transform duration-500"
          >
            <RefreshCcw size={18} />
          </button>
        ) : (
          <div className="h-12 w-12" />
        )}

        <button
          type="button"
          disabled={recipes.length === 0}
          onClick={() => recipes.length > 0 && handleSwipeRight(recipes[recipes.length - 1].id)}
          data-testid="like-button"
          aria-label="Like recipe"
          className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-sage shadow-[0_10px_25px_rgba(138,154,91,0.15)] border border-sage/5 active:scale-90 transition-transform disabled:opacity-20"
        >
          <div className="text-3xl">♥</div>
        </button>
      </div>
    </div>
  );
}
