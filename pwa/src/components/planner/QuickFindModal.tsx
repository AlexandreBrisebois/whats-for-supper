'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Check, ChevronRight } from 'lucide-react';
import { getFillTheGap } from '@/lib/api/planner';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SolarLoader } from '@/components/ui/SolarLoader';

interface QuickFindModalProps {
  onClose: () => void;
  onSelect: (recipe: any) => void;
}

export function QuickFindModal({ onClose, onSelect }: QuickFindModalProps) {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        const data = await getFillTheGap();
        setRecipes(data);
      } catch (error) {
        console.error('Failed to fetch fill-the-gap recipes:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRecipes();
  }, []);

  const handleNext = () => {
    if (currentIndex < recipes.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-charcoal/60 backdrop-blur-md"
      />

      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-sm glass rounded-[3rem] overflow-hidden shadow-2xl border-white/20"
      >
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-2 text-ochre">
              <Sparkles size={20} />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Quick find</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-charcoal/5 hover:bg-charcoal/10 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {isLoading ? (
            <div className="py-20 flex flex-col items-center">
              <SolarLoader size="sm" label="Curating your stack..." />
            </div>
          ) : recipes.length > 0 ? (
            <div className="relative aspect-[4/5] mb-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={recipes[currentIndex].id}
                  initial={{ x: 100, opacity: 0, rotate: 5, scale: 0.9 }}
                  animate={{ x: 0, opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ x: -100, opacity: 0, rotate: -5, scale: 0.9 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 150 }}
                  className="absolute inset-0 rounded-[2.5rem] overflow-hidden shadow-xl border border-white/20"
                >
                  {recipes[currentIndex].image && (
                    <>
                      <Image
                        src={recipes[currentIndex].image}
                        alt={recipes[currentIndex].name}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    </>
                  )}
                  {!recipes[currentIndex].image && (
                    <div className="absolute inset-0 bg-gradient-to-br from-charcoal to-charcoal/50 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-4xl mb-2">🍽️</div>
                        <p className="text-white/40 text-sm">No image available</p>
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-8">
                    <h4 className="text-2xl font-heading font-extrabold text-white mb-2 leading-tight tracking-tight">
                      {recipes[currentIndex].name}
                    </h4>
                    <div className="flex items-center space-x-2">
                      <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest bg-white/10 px-2 py-1 rounded-md backdrop-blur-sm">
                        Ready in 25 mins
                      </span>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          ) : (
            <p className="text-center py-10 text-charcoal/40">No recipes found.</p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="secondary"
              className="h-14 rounded-2xl border-charcoal/10 text-charcoal/60 font-bold active:scale-95 transition-all"
              onClick={handleNext}
              disabled={isLoading}
            >
              Skip
            </Button>
            <Button
              className="h-14 rounded-2xl bg-ochre text-white font-bold shadow-lg shadow-ochre/20 active:scale-95 transition-all"
              onClick={() => onSelect(recipes[currentIndex])}
              disabled={isLoading}
            >
              Select
            </Button>
          </div>

          <div className="mt-8 flex justify-center space-x-1.5">
            {recipes.map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  width: i === currentIndex ? 24 : 6,
                  backgroundColor:
                    i === currentIndex ? 'rgba(225, 173, 1, 1)' : 'rgba(0, 0, 0, 0.1)',
                }}
                className="h-1.5 rounded-full"
              />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
