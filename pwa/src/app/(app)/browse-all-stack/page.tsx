'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search } from 'lucide-react';
import { useBrowseStackStore } from '@/store/browseStackStore';
import { RecipeStackCard } from '@/components/recipes/RecipeStackCard';
import { StackActionBar } from '@/components/recipes/StackActionBar';
import { EndCard } from '@/components/recipes/EndCard';
import { RecipeDetailSheet } from '@/components/recipes/RecipeDetailSheet';
import { ApiClient } from '@/lib/api/generated/apiClient';
import { FetchRequestAdapter } from '@microsoft/kiota-abstractions';
import { RecipeDto } from '@/lib/api/generated/models';

export default function BrowseAllStackPage() {
  const router = useRouter();
  const {
    recipes,
    currentIndex,
    totalCount,
    isLoading,
    setRecipes,
    appendRecipes,
    setCurrentIndex,
    setTotalCount,
    nextCard,
    previousCard,
    reset,
  } = useBrowseStackStore();

  const [isDiscoverableOnly, setIsDiscoverableOnly] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // ── Data Fetching ──────────────────────────────────────────────────────────

  const fetchPage = useCallback(async (page: number, discoverable: boolean) => {
    try {
      // Manual fetch because Kiota client setup might be complex in this context
      // but following the project's lead if possible.
      const response = await fetch(
        `/api/recipes?page=${page}&limit=20&order=explore${
          discoverable ? '&discoverableOnly=true' : ''
        }`
      );
      if (!response.ok) throw new Error('Failed to fetch recipes');
      
      const data = await response.json();
      return {
        recipes: data.recipes as RecipeDto[],
        total: data.pagination.total as number,
      };
    } catch (error) {
      console.error('Fetch error:', error);
      return { recipes: [], total: 0 };
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      const response = await fetch('/api/recipes/library-summary');
      if (response.ok) {
        const { data } = await response.json();
        setTotalCount(data.total);
      }
    } catch (error) {
      console.error('Summary fetch error:', error);
    }
  }, [setTotalCount]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      reset();
      const { recipes: initialRecipes, total } = await fetchPage(1, isDiscoverableOnly);
      setRecipes(initialRecipes);
      setTotalCount(total);
    };
    init();
    fetchSummary();
  }, [isDiscoverableOnly, fetchPage, fetchSummary, setRecipes, setTotalCount, reset]);

  // Paged loading: fetch next when reaching last 5 cards
  useEffect(() => {
    if (recipes.length > 0 && recipes.length - currentIndex < 5 && !isLoading) {
      const loadMore = async () => {
        const nextPage = Math.floor(recipes.length / 20) + 1;
        const { recipes: newRecipes } = await fetchPage(nextPage, isDiscoverableOnly);
        if (newRecipes.length > 0) {
          appendRecipes(newRecipes);
        }
      };
      loadMore();
    }
  }, [currentIndex, recipes.length, isLoading, isDiscoverableOnly, fetchPage, appendRecipes]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleClose = () => {
    router.back();
  };

  const handleToggleDiscoverable = () => {
    setIsDiscoverableOnly(!isDiscoverableOnly);
  };

  const handleOpenDetail = (id: string) => {
    setSelectedRecipeId(id);
    setIsSheetOpen(true);
  };

  const handleAddRecipe = () => {
    router.push('/recipes/new');
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const visibleCards = recipes.slice(currentIndex, currentIndex + 3);
  const isEnd = currentIndex >= recipes.length && recipes.length > 0;
  const isEmpty = recipes.length === 0 && !isLoading;

  return (
    <div 
      className="fixed inset-0 z-[100] bg-charcoal flex flex-col overflow-hidden"
      data-testid="browse-all-stack-overlay"
    >
      {/* Header */}
      <div className="relative z-50 flex items-center justify-between p-6">
        <button
          onClick={handleClose}
          className="rounded-full bg-white/10 p-3 text-white backdrop-blur-md transition-all hover:bg-white/20 active:scale-95"
          data-testid="stack-back-button"
        >
          <X className="h-6 w-6" />
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-sm font-black uppercase tracking-[0.2em] text-white/40">
            Library
          </h1>
          <div className="h-1 w-8 rounded-full bg-ochre mt-1" />
        </div>
        <button
          onClick={() => router.push('/recipes?focus=search')}
          className="rounded-full bg-white/10 p-3 text-white backdrop-blur-md transition-all hover:bg-white/20 active:scale-95"
          data-testid="browse-all-search-trigger"
          aria-label="Search recipes"
        >
          <Search className="h-6 w-6" />
        </button>
      </div>

      {/* Stack Container */}
      <div className="relative flex-1 px-4 pt-4 pb-20 overflow-hidden">
        <AnimatePresence mode="popLayout">
          {isEmpty ? (
            <EndCard key="empty" isEmpty={true} onAddRecipe={handleAddRecipe} />
          ) : isEnd ? (
            <EndCard key="end" isEmpty={false} onAddRecipe={handleAddRecipe} />
          ) : (
            visibleCards.map((recipe, i) => (
              <RecipeStackCard
                key={recipe.id}
                id={recipe.id!}
                name={recipe.name!}
                description={recipe.description || ''}
                imageUrl={recipe.imageUrl!}
                totalTime={recipe.totalTime || ''}
                difficulty={recipe.difficulty || 'Medium'}
                category={recipe.category || ''}
                isFront={i === 0}
                stackIndex={i}
                onSwipeRight={nextCard}
                onSwipeLeft={previousCard}
                onTap={() => handleOpenDetail(recipe.id!)}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Action Bar */}
      {!isEmpty && !isEnd && (
        <StackActionBar
          currentIndex={currentIndex}
          totalCount={totalCount}
          isDiscoverableOnly={isDiscoverableOnly}
          onToggleDiscoverable={handleToggleDiscoverable}
        />
      )}

      {/* Recipe Detail Sheet */}
      {isSheetOpen && selectedRecipeId && (
        <RecipeDetailSheet
          recipeId={selectedRecipeId}
          plannerDayLabel={null}
          onClose={() => setIsSheetOpen(false)}
          onUseForDay={async (recipe) => {
            // In browse mode, use for tonight
            console.log('Use for tonight:', recipe.name);
            setIsSheetOpen(false);
          }}
          onFindSimilar={(id) => {
            console.log('Find similar to:', id);
            setIsSheetOpen(false);
          }}
        />
      )}
    </div>
  );
}
