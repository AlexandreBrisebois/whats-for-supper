'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Utensils } from 'lucide-react';
import Image from 'next/image';
import { getFillTheGap } from '@/lib/api/planner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SolarLoader } from '@/components/ui/SolarLoader';
import { getImageUrl } from '@/lib/imageUtils';
import { useDiscoveryStore } from '@/store/discoveryStore';

interface QuickFindModalProps {
  onClose: () => void;
  onSelect: (recipe: any) => void;
  weekOffset?: number;
}

export function QuickFindModal({ onClose, onSelect, weekOffset = 0 }: QuickFindModalProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // BS-7: watch for fill-the-gap invalidation signals from SSE.
  // When another client assigns a recipe, the version increments and we silently
  // refetch so already-planned recipes disappear from the list.
  const fillTheGapVersion = useDiscoveryStore((s) => s.fillTheGapVersion);

  // Track whether the initial fetch has completed so the invalidation effect
  // does not fire a redundant second fetch on mount (version 0 is the initial value).
  const initialFetchDone = useRef(false);

  const fetchSuggestions = async () => {
    try {
      const data = await getFillTheGap(weekOffset);
      setRecipes(data || []);
    } catch (error) {
      console.error('Failed to fetch fill-the-gap recipes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch on mount.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSuggestions().then(() => {
      initialFetchDone.current = true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset]);

  // Refetch when another client assigns or removes a recipe (BS-7).
  // Guard: only fire after the initial fetch has completed (modal is open and ready).
  useEffect(() => {
    if (!initialFetchDone.current) return;
    fetchSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fillTheGapVersion]);

  const handleNext = () => {
    setIsFlipped(false);
    if (currentIndex < recipes.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const isNudgeCard = recipes.length > 0 && currentIndex === 4;
  const currentRecipe = recipes[currentIndex];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-cream/55 backdrop-blur-xl"
      />

      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        data-testid="quick-find-modal"
        className="relative w-full max-w-sm rounded-[3.5rem] overflow-hidden border border-white/60 bg-[rgba(253,252,240,0.78)] shadow-[0_24px_60px_-16px_rgba(74,55,40,0.18)] backdrop-blur-xl"
      >
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-2 text-ochre">
              <Sparkles size={20} className="text-ochre animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Quick find</span>
            </div>
            <button
              data-testid="quick-find-close"
              onClick={onClose}
              aria-label="Close"
              title="Close"
              className="p-3 rounded-full bg-charcoal/5 hover:bg-charcoal/10 text-charcoal/45 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {isLoading ? (
            <div className="py-24 flex flex-col items-center">
              <SolarLoader size="sm" label="Curating your stack..." />
            </div>
          ) : recipes.length > 0 ? (
            <div className="relative aspect-[4/5] mb-8 perspective-1000">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIndex}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1, rotateY: isFlipped ? 180 : 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                  className="relative w-full h-full preserve-3d cursor-pointer"
                  onClick={() => !isNudgeCard && setIsFlipped(!isFlipped)}
                >
                  {isNudgeCard ? (
                    /* Search Nudge Card */
                    <div className="absolute inset-0 rounded-[3rem] bg-white p-10 flex flex-col items-center justify-center text-center shadow-2xl border-2 border-white/20">
                      <div className="h-20 w-20 rounded-3xl bg-ochre/10 text-ochre flex items-center justify-center mb-8">
                        <Utensils size={40} />
                      </div>
                      <h4 className="text-2xl font-heading font-black text-charcoal mb-4 leading-tight tracking-tight">
                        Didn&apos;t find a match?
                      </h4>
                      <p className="text-sm text-charcoal/40 font-medium leading-relaxed mb-10">
                        Our library has thousands of recipes. Try searching for exactly what
                        you&apos;re craving.
                      </p>
                      <a
                        href="/recipes"
                        className="inline-flex items-center justify-center w-full h-16 rounded-2xl bg-ochre text-white font-black uppercase tracking-widest text-[11px] shadow-lg shadow-ochre/20"
                      >
                        Search Library
                      </a>
                    </div>
                  ) : (
                    /* Regular Recipe Card */
                    <>
                      {/* Front of Card */}
                      <div
                        className={cn(
                          'absolute inset-0 rounded-[3rem] overflow-hidden shadow-2xl backface-hidden border-2 border-white/20',
                          isFlipped ? 'pointer-events-none' : ''
                        )}
                      >
                        {currentRecipe.image && (
                          <>
                            <Image
                              src={getImageUrl(currentRecipe.image)}
                              alt={currentRecipe.name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                          </>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 p-8">
                          <h4 className="text-2xl font-heading font-black text-white mb-3 leading-tight tracking-tight">
                            {currentRecipe.name}
                          </h4>
                          <div className="flex items-center space-x-2">
                            <span className="text-white text-[10px] font-black uppercase tracking-widest bg-ochre px-3 py-1.5 rounded-full shadow-lg">
                              Ready in 25 mins
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Back of Card */}
                      <div
                        className={cn(
                          'absolute inset-0 rounded-[3rem] bg-white shadow-2xl rotate-y-180 backface-hidden border-2 border-ochre/20 overflow-hidden',
                          !isFlipped ? 'pointer-events-none' : ''
                        )}
                      >
                        <div className="h-full overflow-y-auto scrollbar-none">
                          <div className="min-h-full p-10 flex flex-col items-center justify-center text-center">
                            <Sparkles size={32} className="text-ochre/40 mb-6 flex-shrink-0" />
                            <h4 className="text-xl font-heading font-black text-charcoal mb-4 flex-shrink-0">
                              Why we love it
                            </h4>
                            <p className="text-sm text-charcoal/60 leading-relaxed mb-6">
                              {currentRecipe.description ||
                                'A delicious home-cooked meal waiting for you.'}
                            </p>
                            <div className="flex flex-wrap justify-center gap-2">
                              {(currentRecipe.ingredients || []).map((ing: string) => (
                                <span
                                  key={ing}
                                  className="text-[10px] font-bold uppercase tracking-widest bg-charcoal/5 px-3 py-1.5 rounded-lg text-charcoal/40"
                                >
                                  {ing}
                                </span>
                              ))}
                            </div>
                            <p className="mt-8 text-[10px] font-black text-ochre uppercase tracking-widest flex-shrink-0">
                              Tap to flip back
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          ) : (
            <p className="text-center py-10 text-charcoal/40">No recipes found.</p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="secondary"
              className="h-16 rounded-3xl bg-charcoal/5 border-charcoal/10 text-charcoal font-black hover:bg-charcoal/10 active:scale-95 transition-all uppercase tracking-widest text-[11px]"
              onClick={handleNext}
              disabled={isLoading}
              data-testid="quick-find-next"
            >
              {isNudgeCard ? 'Start Over' : 'Skip'}
            </Button>
            <Button
              className={cn(
                'h-16 rounded-3xl font-black shadow-xl active:scale-95 transition-all uppercase tracking-widest text-[11px]',
                isNudgeCard
                  ? 'bg-charcoal/10 text-charcoal/30 cursor-not-allowed shadow-none'
                  : 'bg-ochre text-white shadow-ochre/30'
              )}
              onClick={() => !isNudgeCard && currentRecipe && onSelect(currentRecipe)}
              disabled={isLoading || isNudgeCard || !currentRecipe}
              data-testid="quick-find-select"
            >
              Select
            </Button>
          </div>

          <div className="mt-8 flex justify-center space-x-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                animate={{
                  width: i === currentIndex ? 32 : 8,
                  backgroundColor: i === currentIndex ? '#E1AD01' : 'rgba(32, 24, 21, 0.12)',
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
