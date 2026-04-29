'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Check, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { getFillTheGap } from '@/lib/api/planner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SolarLoader } from '@/components/ui/SolarLoader';

interface QuickFindModalProps {
  onClose: () => void;
  onSelect: (recipe: any) => void;
}

export function QuickFindModal({ onClose, onSelect }: QuickFindModalProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        const data = await getFillTheGap();
        setRecipes(data || []);
      } catch (error) {
        console.error('Failed to fetch fill-the-gap recipes:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRecipes();
  }, []);

  const handleNext = () => {
    setIsFlipped(false);
    if (currentIndex < recipes.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const currentRecipe = recipes[currentIndex];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-charcoal/40 backdrop-blur-xl"
      />

      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        data-testid="quick-find-modal"
        className="relative w-full max-w-sm glass-ochre rounded-[3.5rem] overflow-hidden shadow-[0_32px_64px_-12px_rgba(225,173,1,0.3)] border-white/40 border-2"
      >
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-2 text-white">
              <Sparkles size={20} className="text-white animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Quick find</span>
            </div>
            <button
              onClick={onClose}
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-sm"
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
              <motion.div
                key={currentIndex}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                className="relative w-full h-full preserve-3d cursor-pointer"
                onClick={() => setIsFlipped(!isFlipped)}
              >
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
                        src={`/backend${currentRecipe.image}`}
                        alt={currentRecipe.name}
                        fill
                        className="object-cover"
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
              </motion.div>
            </div>
          ) : (
            <p className="text-center py-10 text-white/40">No recipes found.</p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="secondary"
              className="h-16 rounded-3xl bg-white/10 border-white/20 text-white font-black hover:bg-white/20 active:scale-95 transition-all uppercase tracking-widest text-[11px]"
              onClick={handleNext}
              disabled={isLoading}
              data-testid="quick-find-next"
            >
              Skip
            </Button>
            <Button
              className="h-16 rounded-3xl bg-white text-ochre font-black shadow-xl shadow-ochre/40 active:scale-95 transition-all uppercase tracking-widest text-[11px]"
              onClick={() => onSelect(currentRecipe)}
              disabled={isLoading}
              data-testid="quick-find-select"
            >
              Select
            </Button>
          </div>

          <div className="mt-8 flex justify-center space-x-2">
            {recipes.map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  width: i === currentIndex ? 32 : 8,
                  backgroundColor: i === currentIndex ? '#ffffff' : 'rgba(255, 255, 255, 0.2)',
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
