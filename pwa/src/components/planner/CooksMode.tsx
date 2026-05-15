'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronRight,
  ChevronLeft,
  UtensilsCrossed,
  CheckCircle2,
  Circle,
  Sparkles,
  Pencil,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { getRecipe, updateRecipe, Recipe } from '@/lib/api/recipes';
import { SolarLoader } from '@/components/ui/SolarLoader';
import { RecipeDetailSheet } from '@/components/recipes/RecipeDetailSheet';
import { t } from '@/locales';
import { parseRecipeSteps, type CookingStep } from '@/lib/cooking/stepParser';
import { getImageUrl } from '@/lib/imageUtils';
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
  /** Called when the user taps "Done" on the last step — marks the meal as cooked. */
  onCooked?: () => void;
}

const getFallbackSteps = (): CookingStep[] => [
  {
    index: 1,
    title: "Let's get everything together",
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

export function CooksMode({ recipe: initialRecipe, onClose, onCooked }: CooksModeProps) {
  const router = useRouter();
  const [recipeDetails, setRecipeDetails] = useState<Recipe | null>(null);
  const [parsedSteps, setParsedSteps] = useState<CookingStep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [gathered, setGathered] = useState<Record<string, boolean>>({});
  const [showCelebration, setShowCelebration] = useState(false);
  const [showDetailId, setShowDetailId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingValue, setEditingValue] = useState('');
  const { cookProgress, setCookProgress } = usePlannerStore();
  const currentStep = cookProgress[initialRecipe.id] ?? 0;

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

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
        console.error('[CooksMode] Failed to fetch recipe details:', error);
        setParsedSteps(getFallbackSteps());
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetails();
  }, [initialRecipe.id]);

  const steps = parsedSteps.length > 0 ? parsedSteps : getFallbackSteps();
  const isPrepStep = currentStep === 0;
  const activeRecipeStepIndex = Math.max(currentStep - 1, 0);

  const nextStep = () => {
    if (isPrepStep) {
      setCookProgress(initialRecipe.id, 1);
    } else if (currentStep < steps.length) {
      setCookProgress(initialRecipe.id, currentStep + 1);
    } else {
      setShowCelebration(true);
      setTimeout(() => {
        onCooked?.();
        onClose();
        router.push('/home');
      }, 600);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCookProgress(initialRecipe.id, currentStep - 1);
    }
  };

  const handleSaveEdit = async () => {
    if (!recipeDetails || editingValue === currentStepData.instruction) {
      setIsEditing(false);
      return;
    }

    try {
      const originalInstructions = [...(recipeDetails.recipeInstructions || [])];

      // Simple mapping for flat arrays (string[] or HowToStep[])
      const updatedInstructions = originalInstructions.map((step, idx) => {
        if (idx === activeRecipeStepIndex) {
          if (typeof step === 'string') {
            return editingValue;
          } else if (typeof step === 'object' && step !== null) {
            const stepObj = step as any;
            if ('text' in stepObj) {
              return { ...stepObj, text: editingValue };
            } else {
              return { ...stepObj, name: editingValue };
            }
          }
        }
        return step;
      });

      await updateRecipe(initialRecipe.id, {
        recipeInstructions: updatedInstructions,
      });

      // Update local state for immediate feedback
      const updatedDetails = {
        ...recipeDetails,
        recipeInstructions: updatedInstructions,
      };
      setRecipeDetails(updatedDetails);
      const newSteps = parseRecipeSteps(updatedInstructions);
      if (newSteps.length > 0) {
        setParsedSteps(newSteps);
      }
      setIsEditing(false);
    } catch (error) {
      console.error('[CooksMode] Failed to save instruction edit:', error);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingValue(currentStepData.instruction);
  };

  if (isLoading) {
    return (
      <div
        data-testid="cooks-mode-loading"
        className="fixed inset-0 z-[110] bg-cream flex items-center justify-center"
      >
        <SolarLoader label={t('cook.gettingReady', 'Getting your kitchen ready...')} />
      </div>
    );
  }

  const currentStepData = steps[activeRecipeStepIndex];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      data-testid="cooks-mode-overlay"
      className="fixed inset-0 z-[100] bg-cream flex flex-col md:flex-row overflow-hidden"
    >
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-cream z-10"
          >
            <Sparkles size={48} className="text-ochre mb-4" />
            <p className="font-heading text-3xl font-black text-charcoal">Supper&apos;s done!</p>
            <p className="text-charcoal/60 mt-2 font-medium">Nice work.</p>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Large Hero Header */}
      <div
        className="relative h-48 md:h-full w-full md:w-[40%] shrink-0 overflow-hidden cursor-pointer group border-b md:border-b-0 md:border-r border-charcoal/5"
        onClick={() => setShowDetailId(initialRecipe.id)}
      >
        {initialRecipe.image ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={getImageUrl(initialRecipe.image)}
            alt={initialRecipe.name || 'Recipe'}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-charcoal/5 flex items-center justify-center">
            <UtensilsCrossed size={48} className="text-charcoal/10" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/50 to-transparent" />

        <div className="absolute bottom-6 left-8 right-8">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/80 mb-2">
            {t('cook.cooksMode', "Cook's mode")}
          </p>
          <h2 className="text-xl md:text-3xl font-heading font-black text-white leading-tight mb-4 drop-shadow-md">
            {initialRecipe.name || t('cook.untitledRecipe', 'Untitled Recipe')}
          </h2>

          <div className="flex flex-wrap gap-2">
            {/* Status Pills: Glassmorphic Overlay */}
            <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-md border border-white/30 px-4 py-2 rounded-full text-white shadow-xl">
              <span className="text-[10px] font-black uppercase tracking-widest">
                {isPrepStep
                  ? t('cook.checkAndPrep', 'Check & Prep')
                  : `${currentStep} / ${steps.length}`}
              </span>
            </div>
            {!isPrepStep && initialRecipe.isHealthyChoice && (
              <div className="inline-flex items-center bg-sage/20 backdrop-blur-md border border-sage/30 px-3 py-2 rounded-full text-sage shadow-xl">
                <Sparkles size={12} className="mr-1.5" />
                <span className="text-[10px] font-black uppercase tracking-widest">HEALTHY</span>
              </div>
            )}
            {!isPrepStep && initialRecipe.isVegetarian && (
              <div className="inline-flex items-center bg-sage/20 backdrop-blur-md border border-sage/30 px-3 py-2 rounded-full text-sage shadow-xl">
                <span className="text-[10px] font-black uppercase tracking-widest">VEGGIE</span>
              </div>
            )}
          </div>
        </div>

      </div>

      <button
        data-testid="close-cooks-mode"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-6 right-6 z-[110] p-3 rounded-full bg-white/80 backdrop-blur-md text-charcoal/40 border border-charcoal/10 hover:bg-white active:scale-90 transition-all shadow-md"
      >
        <X size={20} />
      </button>

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Progress Bar */}
        <div className="flex w-full h-1.5 bg-charcoal/5 shrink-0">
          {steps.map((_, i) => (
            <motion.div
              key={i}
              animate={{
                backgroundColor: i < currentStep ? 'rgba(205, 93, 69, 1)' : 'rgba(0, 0, 0, 0.05)',
              }}
              className="flex-1"
            />
          ))}
        </div>

        {/* Main Instruction Area */}
        <div className="flex-1 overflow-y-auto bg-cream/30">
          <div className="min-h-full flex flex-col items-start justify-start px-8 pt-12 pb-24 md:px-16 md:pt-16 lg:px-24 lg:pt-16 text-left">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-4xl"
              >
                {!isPrepStep && (
                  <div className="flex items-center justify-between mb-8 gap-4 border-b border-charcoal/5 pb-6">
                    <h3 className="text-2xl md:text-4xl lg:text-5xl font-heading font-black text-charcoal leading-tight">
                      {currentStepData.title}
                    </h3>
                    {!isEditing && (
                      <button
                        type="button"
                        data-testid="cooks-mode-edit-step"
                        onClick={() => {
                          setIsEditing(true);
                          setEditingValue(currentStepData.instruction);
                        }}
                        className="p-4 rounded-full bg-charcoal/5 text-charcoal/40 hover:bg-charcoal/10 active:scale-90 transition-all"
                        aria-label={t('common.edit', 'Edit')}
                      >
                        <Pencil size={24} />
                      </button>
                    )}
                  </div>
                )}

                {isPrepStep ? (
                  <div className="space-y-10">
                    <div className="flex flex-col gap-2">
                      <h3 className="text-3xl md:text-4xl lg:text-5xl font-heading font-black text-charcoal leading-tight">
                        {t('cook.checkAndPrep', 'Check & Prep')}
                      </h3>
                      <p className="text-xl md:text-2xl font-medium text-charcoal/50 leading-relaxed max-w-lg">
                        {t(
                          'cook.ingredientsReady',
                          'Check off your ingredients before you start cooking.'
                        )}
                      </p>
                    </div>

                    {/* Ingredients Grid */}
                    {recipeDetails?.ingredients && recipeDetails.ingredients.length > 0 ? (
                      <div className="space-y-6">
                        {/* Progress counter */}
                        <div className="flex items-center gap-2 text-sage">
                          <CheckCircle2 size={16} />
                          <span className="text-sm font-black uppercase tracking-wider">
                            {Object.values(gathered).filter(Boolean).length} of{' '}
                            {recipeDetails.ingredients.length} ready
                          </span>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 text-left">
                          {recipeDetails.ingredients.map((ing, idx) => {
                            const isChecked = !!gathered[ing];
                            return (
                              <motion.button
                                key={idx}
                                data-testid="ingredient-toggle"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.03 }}
                                onClick={() =>
                                  setGathered((prev) => ({ ...prev, [ing]: !prev[ing] }))
                                }
                                className={`group flex items-center p-4 md:p-5 rounded-[1.5rem] w-full text-left border transition-all ${
                                  isChecked
                                    ? 'bg-sage/10 border-sage/20'
                                    : 'bg-white border-charcoal/5 shadow-sm hover:border-charcoal/10'
                                }`}
                              >
                                <div
                                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 mr-4 transition-all ${
                                    isChecked
                                      ? 'bg-sage border-sage text-white'
                                      : 'border-charcoal/10 group-hover:border-charcoal/20'
                                  }`}
                                >
                                  {isChecked && <Check size={14} strokeWidth={4} />}
                                </div>
                                <span
                                  className={`text-lg font-bold transition-all ${
                                    isChecked ? 'text-charcoal/40 line-through' : 'text-charcoal/80'
                                  }`}
                                >
                                  {ing}
                                </span>
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="py-16 px-8 rounded-[2.5rem] bg-charcoal/5 border border-dashed border-charcoal/10 flex flex-col items-center text-center">
                        <UtensilsCrossed size={32} className="text-charcoal/20 mb-4" />
                        <p className="text-charcoal/40 font-bold max-w-xs">
                          {t(
                            'cook.extractionInProgress',
                            "Extraction in progress... we're still identifying the exact quantities."
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                ) : isEditing ? (
                  <div className="space-y-6 w-full">
                    <textarea
                      autoFocus
                      className="w-full rounded-[2rem] border-2 border-charcoal/5 bg-white/90 px-8 py-8 text-2xl md:text-3xl font-bold text-charcoal/80 leading-relaxed shadow-inner outline-none transition focus:border-terracotta/20"
                      rows={8}
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                    />
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        data-testid="cooks-mode-save-edit"
                        onClick={handleSaveEdit}
                        className="inline-flex h-14 items-center justify-center gap-3 rounded-full bg-terracotta px-10 text-base font-black text-white shadow-xl shadow-terracotta/20 transition hover:bg-terracotta/90 active:scale-95"
                      >
                        <Check size={20} strokeWidth={3} />
                        <span>{t('common.save', 'Save')}</span>
                      </button>
                      <button
                        type="button"
                        data-testid="cooks-mode-cancel-edit"
                        onClick={handleCancelEdit}
                        className="inline-flex h-14 items-center justify-center gap-3 rounded-full border-2 border-charcoal/10 bg-white px-8 text-base font-black text-charcoal shadow-sm transition hover:bg-charcoal/5 active:scale-95"
                      >
                        <X size={20} />
                        <span>{t('common.cancel', 'Cancel')}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-charcoal/80 leading-[1.4] md:leading-[1.5]">
                    {currentStepData.instruction}
                  </p>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Controls */}
        <div className="p-6 md:p-8 grid grid-cols-[1fr_1.5fr] gap-4 bg-white/80 backdrop-blur-xl border-t border-charcoal/5 shrink-0">
          <Button
            variant="secondary"
            disabled={currentStep === 0}
            onClick={prevStep}
            data-testid="cooks-mode-step-prev"
            className="h-16 md:h-20 rounded-[1.5rem] md:rounded-[2rem] border-charcoal/10 text-charcoal/40 text-base md:text-lg font-black flex items-center justify-center space-x-2 md:space-x-3 active:scale-95 transition-all bg-white"
          >
            <ChevronLeft size={24} />
            <span>{t('cook.back', 'Back')}</span>
          </Button>
          <Button
            onClick={nextStep}
            data-testid="cooks-mode-step-next"
            className="h-16 md:h-20 rounded-[1.5rem] md:rounded-[2rem] bg-terracotta text-white text-xl md:text-2xl font-black flex items-center justify-center space-x-2 md:space-x-3 shadow-xl shadow-terracotta/20 active:scale-95 transition-all"
          >
            <span>
              {currentStep === steps.length
                ? t('cook.done', 'Done')
                : isPrepStep
                  ? t('cook.letsCook', "Let's Cook")
                  : t('cook.next', 'Next')}
            </span>
            <ChevronRight size={24} />
          </Button>
        </div>
      </div>

      {showDetailId && (
        <RecipeDetailSheet
          recipeId={showDetailId}
          plannerDayLabel={null}
          onClose={() => setShowDetailId(null)}
          onUseForDay={async () => {}}
          onFindSimilar={(id) => {
            setShowDetailId(null);
            onClose();
            router.push(`/recipes?similarTo=${id}`);
          }}
        />
      )}
    </motion.div>
  );
}
