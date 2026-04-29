'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Timer,
  Flame,
  UtensilsCrossed,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { getRecipe, Recipe } from '@/lib/api/recipes';
import { SolarLoader } from '@/components/ui/SolarLoader';
import { parseRecipeSteps, type CookingStep } from '@/lib/cooking/stepParser';
import { usePlannerStore } from '@/store/plannerStore';

interface CooksModeProps {
  recipe: {
    id: string;
    name: string | null;
    image: string;
    isVegetarian?: boolean;
    isCold?: boolean;
    isHealthyChoice?: boolean;
  };
  onClose: () => void;
}

const getFallbackSteps = (): CookingStep[] => [
  {
    index: 1,
    title: 'Check & Prep',
    instruction: 'Gather everything you need. Clear the counter and get ready to cook!',
  },
  {
    index: 2,
    title: 'Prep the Base',
    instruction: 'Prepare your base ingredients according to the recipe.',
  },
  {
    index: 3,
    title: 'Cook',
    instruction: 'Follow the recipe instructions carefully.',
  },
  {
    index: 4,
    title: 'Finish',
    instruction: 'Add final touches and plate your dish.',
  },
];

export function CooksMode({ recipe: initialRecipe, onClose }: CooksModeProps) {
  const router = useRouter();
  const [recipeDetails, setRecipeDetails] = useState<Recipe | null>(null);
  const [parsedSteps, setParsedSteps] = useState<CookingStep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { cookProgress, setCookProgress } = usePlannerStore();
  const currentStep = cookProgress[initialRecipe.id] ?? 0;

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const details = await getRecipe(initialRecipe.id);
        setRecipeDetails(details);
        const steps = parseRecipeSteps(details.recipeInstructions);
        if (steps.length > 0) {
          setParsedSteps(steps);
        } else {
          setParsedSteps(getFallbackSteps());
        }
      } catch (error) {
        console.error('Failed to fetch recipe details:', error);
        setParsedSteps(getFallbackSteps());
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetails();
  }, [initialRecipe.id]);

  const steps = parsedSteps.length > 0 ? parsedSteps : getFallbackSteps();

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCookProgress(initialRecipe.id, currentStep + 1);
    } else {
      onClose();
      router.push('/home');
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCookProgress(initialRecipe.id, currentStep - 1);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[110] bg-cream flex items-center justify-center">
        <SolarLoader label="Getting your kitchen ready..." />
      </div>
    );
  }

  const currentStepData = steps[currentStep];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      data-testid="cooks-mode-overlay"
      className="fixed inset-0 z-[100] bg-cream flex flex-col"
    >
      {/* Header */}
      <div className="p-8 flex items-center justify-between border-b border-charcoal/5 bg-white/50 backdrop-blur-md">
        <div className="flex items-center space-x-4">
          <div className="h-14 w-14 rounded-2xl overflow-hidden relative border-2 border-white shadow-md">
            <Image
              src={
                initialRecipe.image.startsWith('/api/')
                  ? `/backend${initialRecipe.image}`
                  : initialRecipe.image
              }
              alt={initialRecipe.name || 'Recipe'}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-terracotta/60">
              Cook&apos;s mode
            </p>
            <h2 className="text-xl font-heading font-black text-charcoal">
              {initialRecipe.name || 'Untitled Recipe'}
            </h2>
          </div>
        </div>
        <button
          data-testid="close-cooks-mode"
          onClick={onClose}
          className="p-4 rounded-full bg-charcoal/5 text-charcoal/40 active:scale-90 transition-all"
        >
          <X size={24} />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="flex w-full h-2 bg-charcoal/5">
        {steps.map((_, i) => (
          <motion.div
            key={i}
            animate={{
              backgroundColor: i <= currentStep ? 'rgba(205, 93, 69, 1)' : 'rgba(0, 0, 0, 0.05)',
            }}
            className="flex-1"
          />
        ))}
      </div>

      {/* Main Instruction Area */}
      <div className="flex-1 overflow-y-auto bg-cream/50">
        <div className="min-h-full flex flex-col items-center justify-start p-8 md:p-12 text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40 }}
              transition={{ type: 'spring', damping: 20, stiffness: 100 }}
              className="w-full max-w-2xl py-12"
            >
              <div
                data-testid="cooks-mode-step-indicator"
                className="mb-8 inline-flex items-center space-x-2 text-terracotta bg-terracotta/5 px-6 py-3 rounded-full"
              >
                <UtensilsCrossed size={20} />
                <span className="text-sm font-black uppercase tracking-widest">
                  Step {currentStep + 1} of {steps.length}
                </span>
              </div>

              <h3 className="text-4xl font-heading font-black text-charcoal mb-4 leading-tight">
                {currentStepData.title}
              </h3>

              {currentStep === 0 ? (
                <div className="mt-8 space-y-8">
                  <p className="text-xl font-medium text-charcoal/60 leading-relaxed max-w-lg mx-auto">
                    {currentStepData.instruction}
                  </p>

                  {/* Dietary High-Five */}
                  {(initialRecipe.isVegetarian || initialRecipe.isHealthyChoice) && (
                    <div className="flex items-center justify-center space-x-3 text-sage bg-sage/5 py-3 px-6 rounded-2xl border border-sage/10 w-fit mx-auto animate-bounce-subtle">
                      <Sparkles size={18} />
                      <span className="text-xs font-black uppercase tracking-widest">
                        {initialRecipe.isVegetarian ? 'Plant-Powered Choice!' : 'Healthy Pick!'}
                      </span>
                    </div>
                  )}

                  {/* Ingredients Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                    {recipeDetails?.ingredients && recipeDetails.ingredients.length > 0 ? (
                      recipeDetails.ingredients.map((ing, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 + idx * 0.05 }}
                          className="flex items-center p-4 rounded-3xl bg-white border border-charcoal/5 shadow-sm"
                        >
                          <div className="h-8 w-8 rounded-full bg-terracotta/10 text-terracotta flex items-center justify-center mr-4 flex-shrink-0">
                            <CheckCircle2 size={16} />
                          </div>
                          <span className="text-base font-bold text-charcoal/80">{ing}</span>
                        </motion.div>
                      ))
                    ) : (
                      <div className="col-span-full py-12 px-6 rounded-[2.5rem] bg-charcoal/5 border border-dashed border-charcoal/10">
                        <p className="text-charcoal/40 font-medium">
                          Extraction in progress... we&apos;re still identifying the exact
                          quantities.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-3xl font-medium text-charcoal/60 leading-relaxed">
                  {currentStepData.instruction}
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Controls */}
      <div className="p-8 grid grid-cols-2 gap-6 bg-white/50 backdrop-blur-md border-t border-charcoal/5">
        <Button
          variant="secondary"
          disabled={currentStep === 0}
          onClick={prevStep}
          data-testid="cooks-mode-step-prev"
          className="h-20 rounded-3xl border-charcoal/10 text-charcoal/40 text-xl font-bold flex items-center justify-center space-x-3 active:scale-95 transition-all"
        >
          <ChevronLeft size={28} />
          <span>Back</span>
        </Button>
        <Button
          onClick={nextStep}
          data-testid="cooks-mode-step-next"
          className="h-20 rounded-3xl bg-terracotta text-white text-xl font-bold flex items-center justify-center space-x-3 shadow-xl shadow-terracotta/20 active:scale-95 transition-all"
        >
          <span>{currentStep === steps.length - 1 ? 'Done' : 'Next'}</span>
          <ChevronRight size={28} />
        </Button>
      </div>

      {/* Footer Info */}
      <div className="px-8 py-6 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-charcoal/20">
        <div className="flex items-center space-x-2">
          <Timer size={14} />
          <span>{recipeDetails?.totalTime || '45 mins'} total</span>
        </div>
        <div className="flex items-center space-x-2 text-ochre">
          {initialRecipe.isCold ? (
            <>
              <Timer size={14} />
              <span>No-Cook / Fresh</span>
            </>
          ) : (
            <>
              <Flame size={14} className="animate-pulse" />
              <span>Medium Heat (Level 6)</span>
            </>
          )}
        </div>
        {initialRecipe.isVegetarian && (
          <div className="flex items-center space-x-2 text-sage font-black">
            <UtensilsCrossed size={14} />
            <span>Plant-Powered! 🌿</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
