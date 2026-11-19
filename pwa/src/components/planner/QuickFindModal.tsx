'use client';

import { useState, useEffect, useRef, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Utensils, ChevronDown, Clock } from 'lucide-react';
import Link from 'next/link';
import { getFillTheGap } from '@/lib/api/planner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SolarLoader } from '@/components/ui/SolarLoader';
import { getImageUrl } from '@/lib/imageUtils';
import { useDiscoveryStore } from '@/store/discoveryStore';
import { t, tWithVars } from '@/locales';
import { formatRecipeTime } from '@/lib/duration';

interface QuickFindModalProps {
  onClose: () => void;
  onSelect: (recipe: any) => void;
  weekOffset?: number;
  dayIndex?: number | null;
  referenceWeekStartDate?: string;
}

export function QuickFindModal({
  onClose,
  onSelect,
  weekOffset = 0,
  dayIndex = null,
  referenceWeekStartDate,
}: QuickFindModalProps) {
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const detailsId = useId();
  const [recipes, setRecipes] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // BS-7: watch for fill-the-gap invalidation signals from SSE.
  // When another client assigns a recipe, the version increments and we silently
  // refetch so already-planned recipes disappear from the list.
  const fillTheGapVersion = useDiscoveryStore(
    (s) => (s.fillTheGapVersions[weekOffset] ?? 0) + (s.allSuggestionsVersion ?? 0)
  );

  // Track whether the initial fetch has completed so the invalidation effect
  // does not fire a redundant second fetch on mount (version 0 is the initial value).
  const initialFetchDone = useRef(false);
  const lastHandledFillTheGapVersion = useRef(0);
  const latestFetchId = useRef(0);

  const fetchSuggestions = async () => {
    const fetchId = ++latestFetchId.current;
    try {
      const data = await getFillTheGap(weekOffset, referenceWeekStartDate);
      if (fetchId !== latestFetchId.current) return false;

      const nextRecipes = data || [];
      setRecipes(nextRecipes);
      setCurrentIndex((index) => Math.min(index, nextRecipes.length));
      return true;
    } catch (error) {
      console.error('Failed to fetch fill-the-gap recipes:', error);
      return fetchId === latestFetchId.current;
    } finally {
      if (fetchId === latestFetchId.current) {
        setIsLoading(false);
      }
    }
  };

  // Initial fetch on mount.
  useEffect(() => {
    initialFetchDone.current = false;
    lastHandledFillTheGapVersion.current = 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSuggestions().then((didCommit) => {
      if (didCommit) {
        initialFetchDone.current = true;
      }
    });
    return () => {
      latestFetchId.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset]);

  // Refetch when another client assigns or removes a recipe (BS-7).
  // Guard: only fire after the initial fetch has completed (modal is open and ready).
  useEffect(() => {
    if (!initialFetchDone.current || fillTheGapVersion === 0) return;
    if (fillTheGapVersion <= lastHandledFillTheGapVersion.current) return;
    lastHandledFillTheGapVersion.current = fillTheGapVersion;
    fetchSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fillTheGapVersion, recipes.length]);

  const handleNext = () => {
    setDetailsExpanded(false);
    if (safeCurrentIndex < totalCards - 1) {
      setCurrentIndex(safeCurrentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const totalCards = recipes.length + 1;
  const safeCurrentIndex = Math.min(currentIndex, recipes.length);
  const isNudgeCard = recipes.length > 0 && safeCurrentIndex === recipes.length;
  const currentRecipe = recipes[safeCurrentIndex];
  const hasNextCard = recipes.length > 0;
  const formattedTime = currentRecipe ? formatRecipeTime(currentRecipe.totalTime) : '';

  const searchUrl =
    dayIndex !== null
      ? `/recipes?focus=search&addToDay=${dayIndex}&weekOffset=${weekOffset}${referenceWeekStartDate ? `&referenceWeekStartDate=${referenceWeekStartDate}` : ''}`
      : '/recipes?focus=search';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-charcoal/45 backdrop-blur-sm"
      />

      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 16 }}
        role="dialog"
        aria-modal="true"
        aria-label={t('planner.quickFindAction', 'Suggestions')}
        data-testid="quick-find-modal"
        className="relative w-full max-w-sm max-h-[90dvh] overflow-y-auto rounded-[2.5rem] border border-charcoal-200 bg-cream shadow-2xl"
      >
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2 text-ochre-800">
              <Sparkles size={18} aria-hidden="true" className="text-ochre-600" />
              <span className="text-xs font-semibold">
                {t('planner.quickFindAction', 'Suggestions')}
              </span>
            </div>
            <button
              type="button"
              data-testid="quick-find-close"
              onClick={onClose}
              aria-label="Close"
              title="Close"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white border border-charcoal-200 hover:bg-charcoal-100 text-charcoal-600 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-charcoal"
            >
              <X size={20} />
            </button>
          </div>

          {isLoading ? (
            <div className="py-24 flex flex-col items-center">
              <SolarLoader size="sm" label="Curating your stack..." />
            </div>
          ) : recipes.length > 0 ? (
            <div className="mb-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={safeCurrentIndex}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                  className="w-full"
                >
                  {isNudgeCard ? (
                    /* Search Nudge Card */
                    <div className="min-h-[20rem] rounded-[2rem] bg-white p-8 flex flex-col items-center justify-center text-center shadow-card border border-charcoal-200">
                      <div className="h-16 w-16 rounded-2xl bg-ochre-100 text-ochre-800 flex items-center justify-center mb-6">
                        <Utensils size={32} aria-hidden="true" />
                      </div>
                      <h4 className="text-2xl font-heading font-bold text-charcoal mb-3 leading-tight">
                        Didn&apos;t find a match?
                      </h4>
                      <p className="text-sm text-charcoal-600 font-medium leading-relaxed mb-8">
                        Our library has thousands of recipes. Try searching for exactly what
                        you&apos;re craving.
                      </p>
                      <Link
                        href={searchUrl}
                        data-testid="quick-find-search-library"
                        className="inline-flex items-center justify-center w-full min-h-14 rounded-2xl bg-terracotta hover:bg-terracotta-600 active:bg-terracotta-700 text-cream-100 font-semibold text-sm shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-charcoal"
                      >
                        Search Library
                      </Link>
                    </div>
                  ) : (
                    /* Regular Recipe Card */
                    <div className="rounded-[2rem] bg-white border border-charcoal-200 overflow-hidden shadow-card">
                      {currentRecipe.image && (
                        <div className="relative aspect-[16/10] w-full overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getImageUrl(currentRecipe.image)}
                            alt={currentRecipe.name}
                            className="h-full w-full object-cover"
                          />
                          {formattedTime && (
                            <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-charcoal-200/60 bg-cream px-3 py-1.5 text-xs font-semibold text-charcoal shadow-sm">
                              <Clock size={14} aria-hidden="true" className="shrink-0" />
                              {tWithVars('common.readyIn', 'READY IN {{time}}', {
                                time: formattedTime,
                              })}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="p-6 flex flex-col gap-3">
                        {!currentRecipe.image && formattedTime && (
                          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-terracotta-50 px-3 py-1.5 text-xs font-semibold text-terracotta-700">
                            <Clock size={14} aria-hidden="true" className="shrink-0" />
                            {tWithVars('common.readyIn', 'READY IN {{time}}', {
                              time: formattedTime,
                            })}
                          </span>
                        )}

                        <h4 className="text-2xl font-heading font-bold text-charcoal leading-tight">
                          {currentRecipe.name}
                        </h4>

                        <button
                          type="button"
                          data-testid="quick-find-details-toggle"
                          aria-expanded={detailsExpanded}
                          aria-controls={detailsId}
                          onClick={() => setDetailsExpanded((prev) => !prev)}
                          className="inline-flex min-h-12 w-fit items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-terracotta-700 hover:bg-terracotta-50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-charcoal"
                        >
                          {detailsExpanded
                            ? t('planner.hideDetails', 'Hide details')
                            : t('planner.viewDetails', 'View details')}
                          <ChevronDown
                            size={18}
                            aria-hidden="true"
                            className={
                              detailsExpanded
                                ? 'rotate-180 transition-transform'
                                : 'transition-transform'
                            }
                          />
                        </button>

                        <div
                          id={detailsId}
                          hidden={!detailsExpanded}
                          className="border-t border-charcoal-200 pt-3 flex flex-col gap-3"
                        >
                          <p className="text-sm text-charcoal-600 leading-relaxed">
                            {currentRecipe.description ||
                              'A delicious home-cooked meal waiting for you.'}
                          </p>
                          {(currentRecipe.ingredients || []).length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {(currentRecipe.ingredients || []).map((ing: string) => (
                                <span
                                  key={ing}
                                  className="text-xs font-medium bg-charcoal-100 px-3 py-1.5 rounded-xl text-charcoal"
                                >
                                  {ing}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          ) : (
            <div className="py-10 text-center">
              <p className="mb-5 text-sm text-charcoal-600 font-medium">No recipes found.</p>
              <Link
                href={searchUrl}
                data-testid="quick-find-search-library"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-terracotta hover:bg-terracotta-600 px-6 font-semibold text-sm text-cream-100 shadow-sm transition-colors"
              >
                Search Library
              </Link>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="secondary"
              className="min-h-14 rounded-2xl bg-white border border-charcoal-200 text-charcoal font-semibold hover:bg-charcoal-100 active:scale-95 transition-all text-sm"
              onClick={handleNext}
              disabled={isLoading || !hasNextCard}
              data-testid="quick-find-next"
            >
              {!hasNextCard ? 'No more picks' : isNudgeCard ? 'Start Over' : 'Skip'}
            </Button>
            <Button
              className={cn(
                'min-h-14 rounded-2xl font-semibold active:scale-95 transition-all text-sm',
                isNudgeCard
                  ? 'bg-charcoal-100 text-charcoal-500 cursor-not-allowed shadow-none'
                  : 'bg-terracotta hover:bg-terracotta-600 active:bg-terracotta-700 text-cream-100 shadow-sm'
              )}
              onClick={() => !isNudgeCard && currentRecipe && onSelect(currentRecipe)}
              disabled={isLoading || isNudgeCard || !currentRecipe}
              data-testid="quick-find-select"
            >
              Select
            </Button>
          </div>

          <div className="mt-6 flex justify-center space-x-2">
            {Array.from({ length: totalCards }, (_, i) => (
              <motion.div
                key={i}
                data-testid="quick-find-progress-indicator"
                animate={{
                  width: i === safeCurrentIndex ? 32 : 8,
                  backgroundColor: i === safeCurrentIndex ? '#C26B46' : '#DDD6D1',
                }}
                className="h-2 rounded-full"
              />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
