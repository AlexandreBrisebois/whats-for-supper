import { useLayoutEffect, useRef, useState } from 'react';
import type { RefObject, UIEvent } from 'react';
import { useFamilyStore } from '@/store/familyStore';
import { usePlannerStore } from '@/store/plannerStore';
import type { CookingStep } from '@/lib/cooking/stepParser';
import type { CookingViewMode, CookingViewSaveState } from './types';

export interface UseCooksModeNavigationOptions {
  progressKey: string;
  steps: CookingStep[];
  currentStep: number;
  isLoading: boolean;
  isEditing: boolean;
  isCompleting: boolean;
  showOriginals: boolean;
}

export function useCooksModeNavigation(
  instructionScrollRef: RefObject<HTMLDivElement | null>,
  {
    progressKey,
    steps,
    currentStep,
    isLoading,
    isEditing,
    isCompleting,
    showOriginals,
  }: UseCooksModeNavigationOptions
) {
  const { setCookProgress } = usePlannerStore();
  const [showIngredients, setShowIngredients] = useState(false);

  const selectedFamilyMemberId = useFamilyStore((state) => state.selectedFamilyMemberId);
  const selectedFamilyMember = useFamilyStore((state) =>
    state.familyMembers.find((member) => member.id === state.selectedFamilyMemberId)
  );
  const updateMemberPreferences = useFamilyStore((state) => state.updateMemberPreferences);

  const [viewOverride, setViewOverride] = useState<{
    memberId: string | null;
    mode: CookingViewMode;
  } | null>(null);
  const [viewSaveState, setViewSaveState] = useState<CookingViewSaveState>('idle');
  const [viewSaveMemberId, setViewSaveMemberId] = useState<string | null>(null);
  const failedViewModeRef = useRef<CookingViewMode | null>(null);
  const viewSaveGenerationRef = useRef(0);
  const viewSelectionRef = useRef({ memberId: selectedFamilyMemberId, generation: 0 });
  const allStepsScrollRef = useRef<{ step: number; top: number } | null>(null);
  const resumeScrollTopRef = useRef<number | null>(null);

  const cookingViewMode: CookingViewMode =
    viewOverride?.memberId === selectedFamilyMemberId
      ? viewOverride.mode
      : (selectedFamilyMember?.cookingViewMode ?? 'all-steps');
  const currentViewSaveState: CookingViewSaveState =
    viewSaveMemberId === selectedFamilyMemberId ? viewSaveState : 'idle';
  const singlePageEnabled = cookingViewMode === 'all-steps';

  const hasInstructions = steps.length > 0;
  const isPrepStep = currentStep === 0 || (singlePageEnabled && showIngredients);
  const isResumingSteps = singlePageEnabled && showIngredients && currentStep > 0;
  const activeRecipeStepIndex = Math.max(currentStep - 1, 0);
  const singlePageCooking = hasInstructions && singlePageEnabled && !isPrepStep;
  const isCompletionAction =
    !hasInstructions || (!isPrepStep && (singlePageEnabled || currentStep === steps.length));

  useLayoutEffect(() => {
    if (viewSelectionRef.current.memberId !== selectedFamilyMemberId) {
      viewSelectionRef.current = {
        memberId: selectedFamilyMemberId,
        generation: viewSelectionRef.current.generation + 1,
      };
    }
  }, [selectedFamilyMemberId]);

  const saveCookingView = async (mode: CookingViewMode) => {
    if (!selectedFamilyMemberId) return;
    const memberId = selectedFamilyMemberId;
    const generation = ++viewSaveGenerationRef.current;
    const selectionGeneration = viewSelectionRef.current.generation;
    setViewSaveMemberId(selectedFamilyMemberId);
    setViewSaveState('saving');
    const saved = await updateMemberPreferences(selectedFamilyMemberId, {
      cookingViewMode: mode,
    });
    if (
      generation !== viewSaveGenerationRef.current ||
      memberId !== useFamilyStore.getState().selectedFamilyMemberId ||
      selectionGeneration !== viewSelectionRef.current.generation
    )
      return;
    if (saved) {
      failedViewModeRef.current = null;
      setViewSaveState('saved');
    } else {
      failedViewModeRef.current = mode;
      setViewSaveState('failed');
    }
  };

  const chooseCookingView = (mode: CookingViewMode) => {
    if (mode === cookingViewMode || isEditing || isCompleting) return;
    const surface = instructionScrollRef.current;
    if (singlePageEnabled && surface) {
      allStepsScrollRef.current = { step: currentStep, top: surface.scrollTop };
    }
    setViewOverride({ memberId: selectedFamilyMemberId, mode });
    if (mode === 'all-steps' && allStepsScrollRef.current?.step === currentStep) {
      resumeScrollTopRef.current = allStepsScrollRef.current.top;
    }
    void saveCookingView(mode);
  };

  const retrySaveCookingView = () => {
    const failedMode = failedViewModeRef.current;
    if (failedMode) void saveCookingView(failedMode);
  };

  // Restore only when entering the list. Reading-position updates must not remount
  // the list, scroll it again, or replace an in-progress editor.
  useLayoutEffect(() => {
    if (isResumingSteps && instructionScrollRef.current) {
      instructionScrollRef.current.scrollTop = 0;
      return;
    }
    if (isLoading || !singlePageCooking) return;
    const surface = instructionScrollRef.current;
    if (surface && resumeScrollTopRef.current !== null) {
      surface.scrollTop = resumeScrollTopRef.current;
      resumeScrollTopRef.current = null;
      return;
    }
    const savedStep = usePlannerStore.getState().cookProgress[progressKey] ?? 1;
    const row = surface?.querySelector<HTMLElement>(`[data-cooking-step="${savedStep}"]`);
    if (surface && row && savedStep > 1) {
      surface.scrollTop +=
        row.getBoundingClientRect().top - surface.getBoundingClientRect().top - 16;
    } else if (surface) {
      surface.scrollTop = 0;
    }
  }, [isLoading, singlePageCooking, isResumingSteps, progressKey, instructionScrollRef]);

  const trackReadingPosition = (event: UIEvent<HTMLDivElement>) => {
    if (!singlePageCooking || showOriginals) return;
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
    if (readingStep !== currentStep) setCookProgress(progressKey, readingStep);
  };

  const nextStep = (finishCooking: () => void) => {
    if (isPrepStep) {
      if (!isResumingSteps) setCookProgress(progressKey, 1);
      setShowIngredients(false);
    } else if (currentStep < steps.length) {
      setCookProgress(progressKey, currentStep + 1);
    } else {
      finishCooking();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCookProgress(progressKey, currentStep - 1);
    }
  };

  const openIngredients = () => {
    resumeScrollTopRef.current = instructionScrollRef.current?.scrollTop ?? 0;
    setShowIngredients(true);
  };

  return {
    selectedFamilyMember,
    cookingViewMode,
    currentViewSaveState,
    singlePageEnabled,
    hasInstructions,
    isPrepStep,
    isResumingSteps,
    activeRecipeStepIndex,
    singlePageCooking,
    isCompletionAction,
    chooseCookingView,
    retrySaveCookingView,
    trackReadingPosition,
    nextStep,
    prevStep,
    openIngredients,
  };
}
