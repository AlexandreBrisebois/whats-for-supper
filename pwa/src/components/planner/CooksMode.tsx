'use client';
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
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
  Flag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import {
  getRecipe,
  resolveRecipeImportIssue,
  saveRecipeImportIssue,
  updateRecipe,
} from '@/lib/api/recipes';
import type { Recipe, RecipeImportIssueDraft, RecipeImportIssueReason } from '@/lib/api/recipes';
import { SolarLoader } from '@/components/ui/SolarLoader';
import { RecipeDetailSheet } from '@/components/recipes/RecipeDetailSheet';
import { RecipeImportIssueSheet } from '@/components/recipes/RecipeImportIssueSheet';
import { t } from '@/locales';
import { parseRecipeSteps, type CookingStep } from '@/lib/cooking/stepParser';
import { getImageUrl } from '@/lib/imageUtils';
import { usePlannerStore } from '@/store/plannerStore';
import { useFeatureFlag } from '@/store/featureFlagStore';

interface CooksModeProps {
  recipe: {
    id: string;
    name: string | null;
    image: string;
    isVegetarian?: boolean;
    isCold?: boolean;
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

function updateInstructionValue(value: unknown, instruction: string): unknown {
  if (typeof value === 'string') return instruction;
  if (typeof value !== 'object' || value === null) return value;
  const step = value as Record<string, unknown>;
  if ('text' in step) return { ...step, text: instruction };
  return { ...step, name: instruction };
}

export function CooksMode({ recipe: initialRecipe, onClose, onCooked }: CooksModeProps) {
  const router = useRouter();
  const [recipeDetails, setRecipeDetails] = useState<Recipe | null>(null);
  const [parsedSteps, setParsedSteps] = useState<CookingStep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [gathered, setGathered] = useState<Record<string, boolean>>({});
  const [showCelebration, setShowCelebration] = useState(false);
  const [showDetailId, setShowDetailId] = useState<string | null>(null);
  const [reportContext, setReportContext] = useState<RecipeImportIssueReason | null>(null);
  const [reimportAcknowledgement, setReimportAcknowledgement] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingValue, setEditingValue] = useState('');
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [editPending, setEditPending] = useState(false);
  const [editError, setEditError] = useState(false);
  const [editAnnouncement, setEditAnnouncement] = useState('');
  const singlePageEnabled = useFeatureFlag('single-page-recipe-steps');
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
  const singlePageCooking = singlePageEnabled && !isPrepStep;
  const isCompletionAction = !isPrepStep && (singlePageEnabled || currentStep === steps.length);
  const instructionScrollRef = useRef<HTMLDivElement>(null);

  // Restore only when entering the list. Reading-position updates must not remount
  // the list, scroll it again, or replace an in-progress editor.
  useLayoutEffect(() => {
    if (isLoading || !singlePageCooking) return;
    const surface = instructionScrollRef.current;
    const savedStep = usePlannerStore.getState().cookProgress[initialRecipe.id] ?? 1;
    const row = surface?.querySelector<HTMLElement>(`[data-cooking-step="${savedStep}"]`);
    if (surface && row && savedStep > 1) {
      surface.scrollTop +=
        row.getBoundingClientRect().top - surface.getBoundingClientRect().top - 16;
    } else if (surface) {
      surface.scrollTop = 0;
    }
  }, [isLoading, singlePageCooking, initialRecipe.id]);

  const trackReadingPosition = (event: React.UIEvent<HTMLDivElement>) => {
    if (!singlePageCooking) return;
    const surface = event.currentTarget;
    const readingEdge = surface.getBoundingClientRect().top + 32;
    let readingStep = 1;
    surface.querySelectorAll<HTMLElement>('[data-cooking-step]').forEach((row) => {
      if (row.getBoundingClientRect().top <= readingEdge) {
        readingStep = Number(row.dataset.cookingStep);
      }
    });
    // The last short instruction may never reach the top of the viewport.
    if (
      surface.scrollTop > 0 &&
      surface.scrollTop + surface.clientHeight >= surface.scrollHeight - 2
    ) {
      readingStep = steps.length;
    }
    if (readingStep !== currentStep) setCookProgress(initialRecipe.id, readingStep);
  };

  const editingStep = editingStepIndex === null ? null : steps[editingStepIndex];

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
      }, 600);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCookProgress(initialRecipe.id, currentStep - 1);
    }
  };

  const handleSaveEdit = async () => {
    if (!recipeDetails || !editingStep || editingValue === editingStep.editableInstruction) {
      setIsEditing(false);
      setEditingStepIndex(null);
      return;
    }

    setEditPending(true);
    setEditError(false);
    try {
      const originalInstructions = [...(recipeDetails.recipeInstructions || [])];
      const [outerIndex, innerIndex] = editingStep.sourcePath ?? [editingStepIndex ?? 0];
      const updatedInstructions = originalInstructions.map((entry, index) => {
        if (index !== outerIndex) return entry;
        if (innerIndex !== undefined && typeof entry === 'object' && entry !== null) {
          const section = entry as { itemListElement?: unknown[] };
          return {
            ...section,
            itemListElement: (section.itemListElement ?? []).map((step, stepIndex) =>
              stepIndex === innerIndex ? updateInstructionValue(step, editingValue) : step
            ),
          };
        }
        return updateInstructionValue(entry, editingValue);
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
      setEditingStepIndex(null);
      setEditAnnouncement('Step saved');
    } catch (error) {
      console.error('[CooksMode] Failed to save instruction edit:', error);
      setEditError(true);
    } finally {
      setEditPending(false);
    }
  };

  const handleCancelEdit = () => {
    const stepIndex = editingStep?.index;
    setIsEditing(false);
    setEditingStepIndex(null);
    setEditError(false);
    if (stepIndex !== undefined) {
      requestAnimationFrame(() => {
        document
          .querySelector<HTMLButtonElement>(`[data-testid="single-page-edit-step-${stepIndex}"]`)
          ?.focus();
      });
    }
  };

  const handleSaveImportIssue = async (draft: RecipeImportIssueDraft) => {
    if (!recipeDetails) return;
    const submission = await saveRecipeImportIssue(recipeDetails.id, draft);
    setRecipeDetails(submission.recipe);
    if (submission.reimportLaunchFailed) throw new Error('Re-import launch failed');
    setReportContext(null);
    setReimportAcknowledgement(submission.reimportStarted);
  };

  const handleResolveImportIssue = async () => {
    if (!recipeDetails) return;
    const updated = await resolveRecipeImportIssue(recipeDetails.id);
    setRecipeDetails(updated);
    setReportContext(null);
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
            data-testid="cooks-mode-celebration"
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
        data-testid="cooks-mode-hero"
        className={`relative ${singlePageCooking ? 'h-36' : 'h-48'} md:h-full w-full md:w-[40%] shrink-0 overflow-hidden cursor-pointer group border-b md:border-b-0 md:border-r border-charcoal/5`}
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

        <div
          className={`absolute ${singlePageCooking ? 'bottom-3 left-5 right-5 md:bottom-6 md:left-8 md:right-8' : 'bottom-6 left-8 right-8'}`}
        >
          <p
            className={`${singlePageCooking ? 'hidden md:block' : ''} text-[10px] font-black uppercase tracking-[0.24em] text-white/80 mb-2`}
          >
            {t('cook.cooksMode', "Cook's mode")}
          </p>
          <h2
            data-testid="cooks-mode-recipe-name"
            className={`${singlePageCooking ? 'line-clamp-2 md:line-clamp-none mb-2 md:mb-4' : 'mb-4'} pr-12 text-xl md:text-3xl font-heading font-black text-white leading-tight drop-shadow-md`}
          >
            {initialRecipe.name || t('cook.untitledRecipe', 'Untitled Recipe')}
          </h2>

          <div className="flex items-end justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {/* Status Pills: Glassmorphic Overlay */}
              <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-md border border-white/30 px-4 py-2 rounded-full text-white shadow-xl">
                <span
                  data-testid="cooks-mode-step-indicator"
                  className="text-[10px] font-black uppercase tracking-widest"
                >
                  {isPrepStep
                    ? t('cook.checkAndPrep', 'Check & Prep')
                    : `${currentStep} / ${steps.length}`}
                </span>
              </div>
              {!isPrepStep && initialRecipe.isVegetarian && (
                <div className="inline-flex items-center bg-sage/20 backdrop-blur-md border border-sage/30 px-3 py-2 rounded-full text-sage shadow-xl">
                  <span className="text-[10px] font-black uppercase tracking-widest">VEGGIE</span>
                </div>
              )}
            </div>

            {!isEditing && (!isPrepStep || recipeDetails?.canReimport) && (
              <div className="flex shrink-0 items-center gap-2">
                {recipeDetails?.canReimport && (
                  <button
                    type="button"
                    data-testid={
                      isPrepStep ? 'cooks-mode-report-ingredients' : 'cooks-mode-report-steps'
                    }
                    aria-label={
                      isPrepStep ? 'Report issue with ingredients' : 'Report issue with steps'
                    }
                    onClick={(event) => {
                      event.stopPropagation();
                      setReportContext(isPrepStep ? 'ingredients' : 'steps');
                    }}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/40 bg-white/80 text-terracotta/70 shadow-md backdrop-blur-md transition hover:bg-white active:scale-90"
                  >
                    <Flag size={20} aria-hidden="true" />
                  </button>
                )}
                {!isPrepStep && !singlePageEnabled && (
                  <button
                    type="button"
                    data-testid="cooks-mode-edit-step"
                    onClick={(event) => {
                      event.stopPropagation();
                      setIsEditing(true);
                      setEditingStepIndex(activeRecipeStepIndex);
                      setEditingValue(
                        currentStepData.editableInstruction ?? currentStepData.instruction
                      );
                    }}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/40 bg-white/80 text-charcoal/60 shadow-md backdrop-blur-md transition hover:bg-white active:scale-90"
                    aria-label="Edit step"
                  >
                    <Pencil size={20} aria-hidden="true" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {!showDetailId && (
        <button
          data-testid="close-cooks-mode"
          aria-label="Close cook's mode"
          title="Close cook's mode"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute top-4 right-4 z-[110] p-3 rounded-full bg-white/80 backdrop-blur-md text-charcoal/60 border border-charcoal/10 hover:bg-white active:scale-90 transition-all shadow-md"
        >
          <X size={20} />
        </button>
      )}

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Progress Bar */}
        <div
          role="progressbar"
          aria-label={singlePageCooking ? 'Reading position' : 'Cooking progress'}
          aria-valuemin={0}
          aria-valuemax={steps.length}
          aria-valuenow={currentStep}
          className="flex w-full h-1.5 bg-charcoal/5 shrink-0"
        >
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
        <div
          ref={instructionScrollRef}
          onScroll={trackReadingPosition}
          data-testid="cooks-mode-instructions"
          className="flex-1 overflow-y-auto bg-cream/30"
        >
          <div
            className={`min-h-full flex flex-col items-start justify-start ${singlePageCooking ? 'px-4 pt-5 pb-8 md:px-10 md:pt-8 lg:px-16' : 'px-8 pt-12 pb-24 md:px-16 md:pt-16 lg:px-24 lg:pt-16'} text-left`}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={singlePageEnabled ? 'single-page' : currentStep}
                initial={singlePageEnabled ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-4xl"
              >
                {!isPrepStep && !singlePageEnabled && (
                  <div className="mb-8 border-b border-charcoal/5 pb-6">
                    <h3 className="text-2xl md:text-4xl lg:text-5xl font-heading font-black text-charcoal leading-tight">
                      {currentStepData.title}
                    </h3>
                  </div>
                )}

                {isPrepStep ? (
                  <div className="space-y-10">
                    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
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
                                aria-checked={isChecked}
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
                ) : singlePageEnabled ? (
                  <div data-testid="single-page-recipe-steps">
                    <ol aria-label="Cooking steps" className="space-y-4">
                      {steps.map((step, index) => {
                        const rowEditing = editingStepIndex === index;
                        const showTitle =
                          !/^step\s+\d+$/i.test(step.title.trim()) &&
                          step.title.trim() !== step.instruction.trim();
                        return (
                          <li
                            key={step.index}
                            data-cooking-step={step.index}
                            data-testid={`single-page-step-${step.index}`}
                            className="rounded-[2rem] border border-charcoal/5 bg-white/70 p-4 shadow-sm md:p-6"
                          >
                            <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-start gap-x-4 gap-y-3">
                              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-terracotta text-lg font-black text-white">
                                {step.index}
                              </span>
                              <div className="contents">
                                <div className="flex min-h-11 items-center justify-end gap-3">
                                  {showTitle && (
                                    <h4 className="mr-auto min-w-0 break-words font-heading text-xl font-black text-charcoal md:text-2xl">
                                      {step.title}
                                    </h4>
                                  )}
                                  {!rowEditing && (
                                    <button
                                      type="button"
                                      disabled={isEditing}
                                      data-testid={`single-page-edit-step-${step.index}`}
                                      aria-label={`Edit step ${step.index}`}
                                      onClick={() => {
                                        setIsEditing(true);
                                        setEditingStepIndex(index);
                                        setEditingValue(
                                          step.editableInstruction ?? step.instruction
                                        );
                                        setEditError(false);
                                      }}
                                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-charcoal/10 bg-white text-charcoal/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta disabled:opacity-40"
                                    >
                                      <Pencil size={18} aria-hidden="true" />
                                    </button>
                                  )}
                                </div>
                                {rowEditing ? (
                                  <div className="col-span-2 space-y-3">
                                    <textarea
                                      autoFocus
                                      aria-label={`Edit step ${step.index} instructions`}
                                      value={editingValue}
                                      onChange={(event) => setEditingValue(event.target.value)}
                                      className="min-h-40 w-full rounded-2xl border-2 border-charcoal/10 bg-white p-4 text-lg text-charcoal outline-none focus:border-terracotta"
                                    />
                                    <div className="flex flex-wrap gap-3">
                                      <button
                                        type="button"
                                        disabled={editPending}
                                        onClick={() => void handleSaveEdit()}
                                        className="min-h-11 rounded-full bg-terracotta px-6 font-bold text-white disabled:opacity-50"
                                      >
                                        {editPending ? 'Saving…' : 'Save'}
                                      </button>
                                      <button
                                        type="button"
                                        disabled={editPending}
                                        onClick={handleCancelEdit}
                                        className="min-h-11 rounded-full border border-charcoal/15 bg-white px-6 font-bold text-charcoal"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                    {editError && (
                                      <p role="alert" className="font-semibold text-terracotta">
                                        Couldn&apos;t save this step.{' '}
                                        <button
                                          type="button"
                                          onClick={() => void handleSaveEdit()}
                                          className="min-h-11 underline"
                                        >
                                          Try again
                                        </button>
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <p className="col-span-2 break-words text-xl font-semibold leading-relaxed text-charcoal/80">
                                    {step.instruction}
                                  </p>
                                )}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                ) : isEditing ? (
                  <div className="space-y-6 w-full">
                    <textarea
                      autoFocus
                      aria-label="Edit step instructions"
                      title="Edit step instructions"
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
                  <p
                    data-testid="cooks-mode-step-text"
                    className="text-2xl md:text-3xl lg:text-4xl font-bold text-charcoal/80 leading-[1.4] md:leading-[1.5]"
                  >
                    {currentStepData.instruction}
                  </p>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Controls */}
        <div
          data-testid="cooks-mode-controls"
          className={`p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:p-8 md:pb-[calc(2rem+env(safe-area-inset-bottom))] grid ${singlePageCooking ? 'grid-cols-1' : 'grid-cols-[1fr_1.5fr]'} gap-4 bg-white/80 backdrop-blur-xl border-t border-charcoal/5 shrink-0`}
        >
          <Button
            variant="secondary"
            style={!isPrepStep && singlePageEnabled ? { display: 'none' } : undefined}
            disabled={currentStep === 0}
            onClick={prevStep}
            data-testid="cooks-mode-step-prev"
            className="h-16 md:h-20 rounded-[1.5rem] md:rounded-[2rem] border-charcoal/10 text-charcoal/40 text-base md:text-lg font-black flex items-center justify-center space-x-2 md:space-x-3 active:scale-95 transition-all bg-white"
          >
            <ChevronLeft size={24} />
            <span>{t('cook.back', 'Back')}</span>
          </Button>
          <Button
            onClick={
              !isPrepStep && singlePageEnabled
                ? () => {
                    setShowCelebration(true);
                    setTimeout(() => {
                      onCooked?.();
                      onClose();
                    }, 600);
                  }
                : nextStep
            }
            data-testid="cooks-mode-step-next"
            aria-label={
              isCompletionAction ? t('cook.markCooked', 'Mark recipe as cooked') : undefined
            }
            className={`h-16 md:h-20 ${singlePageCooking ? 'w-full md:w-auto md:min-w-64 md:justify-self-end' : ''} rounded-[1.5rem] md:rounded-[2rem] bg-terracotta text-white text-xl md:text-2xl font-black flex items-center justify-center space-x-2 md:space-x-3 shadow-xl shadow-terracotta/20 active:scale-95 transition-all`}
          >
            <span>
              {isCompletionAction
                ? t('cook.cooked', 'Cooked')
                : isPrepStep
                  ? t('cook.letsCook', "Let's Cook")
                  : t('cook.next', 'Next')}
            </span>
            {!isCompletionAction && <ChevronRight size={24} />}
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
      <p className="sr-only" aria-live="polite">
        {editAnnouncement}
      </p>
      {reportContext && recipeDetails && (
        <RecipeImportIssueSheet
          issue={recipeDetails.importIssue ?? null}
          recipeId={recipeDetails.id}
          contextualReason={reportContext}
          canReportContentIssues={recipeDetails.canReimport}
          isReimporting={recipeDetails.importIssue?.isReimporting}
          reimportFailureMessage={recipeDetails.importIssue?.reimportFailureMessage}
          reimportFailureImportId={recipeDetails.importIssue?.reimportFailureImportId}
          onClose={() => setReportContext(null)}
          onSave={handleSaveImportIssue}
          onResolve={handleResolveImportIssue}
        />
      )}
      {reimportAcknowledgement && (
        <p
          role="status"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-charcoal px-4 py-2 text-sm font-bold text-white shadow-lg"
        >
          Reimporting in background
        </p>
      )}
    </motion.div>
  );
}
