'use client';

import { SuccessCard } from '@/components/ui/SuccessCard';
import { usePlannerStore } from '@/store/plannerStore';
import { FamilyNudgeDialog } from '@/components/discovery/FamilyNudgeDialog';
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { DiscoveryCard } from '@/components/discovery/DiscoveryCard';
import { PassThePhone } from '@/components/discovery/PassThePhone';
import { RefreshCcw, Loader2, Star } from 'lucide-react';
import { getCategories, getDiscoveryStack, submitVote, DiscoveryRecipe } from '@/lib/api/discovery';
import { useDiscoveryStore } from '@/store/discoveryStore';
import { useFamily } from '@/hooks/useFamily';
import { useRouter } from 'next/navigation';
import { t, tWithVars } from '@/locales';
import { getImageUrl } from '@/lib/imageUtils';
import {
  clearHandoffLock,
  isHandoffSettling,
  setHandoffLock,
  trackPendingVote,
  useHandoffLock,
  usePassThePhoneEnabled,
  waitForPendingVotes,
} from '@/lib/discovery/passThePhone';
import { useUiStore } from '@/store/uiStore';

const PINNED_DISCOVERY_CATEGORY = 'Supper';

export default function DiscoveryPage() {
  const router = useRouter();
  const { setHasPendingCards, setActiveCategory } = useDiscoveryStore();
  // Lift state to store — SSE can now update the stack without the page being mounted
  const recipes = useDiscoveryStore((s) => s.discoveryStack);
  const [showNudgeDialog, setShowNudgeDialog] = useState(false);
  const closeNudgeDialog = useCallback(() => setShowNudgeDialog(false), []);
  const ownsRound = useDiscoveryStore((s) => s.session?.phase === 'collecting');
  const session = useDiscoveryStore((s) => s.session);
  const converged = session?.phase === 'converged';
  const refreshSession = useDiscoveryStore((s) => s.refreshSession);
  const fillTheGapVersion = useDiscoveryStore((s) => s.fillTheGapVersion);
  const {
    selectedFamilyMemberId,
    _hasHydrated,
    familyMembers,
    selectedMember,
    selectFamilyMember,
  } = useFamily();
  const passThePhoneEnabled = usePassThePhoneEnabled();
  const handoffLock = useHandoffLock();
  const isCurtainPending = Boolean(handoffLock?.pendingTargetMemberId);
  const isLockedTurn = Boolean(handoffLock && !isCurtainPending);
  const pendingCurtainTarget = useMemo(
    () =>
      handoffLock?.pendingTargetMemberId
        ? { id: handoffLock.pendingTargetMemberId, name: handoffLock.participantName }
        : null,
    [handoffLock]
  );
  const [isLoading, setIsLoading] = useState(true);
  const [matchCount, setMatchCount] = useState(0);
  const [isReturningFromConverged, setIsReturningFromConverged] = useState(false);
  const [convergedReturnError, setConvergedReturnError] = useState(false);
  const prevMemberIdRef = useRef<string | null>(selectedFamilyMemberId);
  const memberTurnRef = useRef(0);
  const categoriesRef = useRef<string[]>([]);
  const categoryIndexRef = useRef(0);
  const fetchGenerationRef = useRef(0);
  // Tracks the last fillTheGapVersion we already handled (prevents double-refetch
  // when recipes.length dep re-fires the effect after the stack loads).
  const lastHandledFillTheGapVersionRef = useRef(0);
  const lastHandledAllSuggestionsVersionRef = useRef(
    useDiscoveryStore.getState().allSuggestionsVersion
  );
  // Tracks whether the initial stack has been committed to the store
  const stackIsLoadedRef = useRef(false);
  // Micro-badge: "Just planned ✓" shown when a card is removed from the visible top 4
  const [showJustPlannedBadge, setShowJustPlannedBadge] = useState(false);
  const justPlannedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCategories = useCallback(async () => {
    const generation = ++fetchGenerationRef.current;
    setIsLoading(true);
    try {
      const cats = await getCategories();
      if (generation !== fetchGenerationRef.current) return;
      const resolvedCategories = PINNED_DISCOVERY_CATEGORY ? [PINNED_DISCOVERY_CATEGORY] : cats;
      categoriesRef.current = resolvedCategories;
      categoryIndexRef.current = 0;

      let foundNonEmpty = false;
      for (let i = 0; i < resolvedCategories.length; i++) {
        const categoryToLoad = resolvedCategories[i];
        const stack = await getDiscoveryStack(categoryToLoad);
        if (generation !== fetchGenerationRef.current) return;
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
      if (generation === fetchGenerationRef.current) setIsLoading(false);
    }
  }, [setActiveCategory]);

  useEffect(() => {
    if (!_hasHydrated || !selectedFamilyMemberId) return;

    if (prevMemberIdRef.current !== selectedFamilyMemberId) {
      prevMemberIdRef.current = selectedFamilyMemberId;
      memberTurnRef.current += 1;
      setMatchCount(0);
      useDiscoveryStore.getState().setStack([]);
      setIsLoading(true);
    }

    let ignore = false;
    const generation = ++fetchGenerationRef.current;
    const initialize = async () => {
      try {
        const cats = await getCategories();
        if (ignore || generation !== fetchGenerationRef.current) return;
        const resolvedCategories = PINNED_DISCOVERY_CATEGORY ? [PINNED_DISCOVERY_CATEGORY] : cats;
        categoriesRef.current = resolvedCategories;

        // Nudge priority: read activeCategory from store at call-time (not from
        // the closure dep) so we don't re-trigger this effect when we set it below.
        if (resolvedCategories.length === 0) {
          if (!ignore) {
            setActiveCategory(null);
            categoryIndexRef.current = 0;
            useDiscoveryStore.getState().setStack([]);
            stackIsLoadedRef.current = true;
          }
        } else {
          const storedCategory = useDiscoveryStore.getState().activeCategory;
          const targetCategory = storedCategory ?? resolvedCategories[0];
          const index = resolvedCategories.indexOf(targetCategory);
          const resolvedIndex = index !== -1 ? index : 0;

          // Wrap-around scan: start from resolvedIndex, cycle through all
          // categories so earlier ones aren't skipped if a nudge pointed mid-list.
          let foundNonEmpty = false;
          for (let i = 0; i < resolvedCategories.length && !ignore; i++) {
            const tryIndex = (resolvedIndex + i) % resolvedCategories.length;
            const categoryToLoad = resolvedCategories[tryIndex];
            const stack = await getDiscoveryStack(categoryToLoad);
            if (ignore || generation !== fetchGenerationRef.current) return;
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
        if (!ignore && generation === fetchGenerationRef.current) setIsLoading(false);
      }
    };

    void refreshSession();
    initialize();
    return () => {
      ignore = true;
      fetchGenerationRef.current = generation + 1;
    };
    // activeCategory is intentionally NOT a dep — we read it from the store at call-time
    // inside initialize() to avoid re-triggering this effect when we call setActiveCategory.
    // A separate effect below handles nudge-driven category switches.
  }, [_hasHydrated, selectedFamilyMemberId, setActiveCategory, refreshSession]);

  // Sync pending cards status to store
  useEffect(() => {
    setHasPendingCards(!converged && recipes.length > 0);
    return () => setHasPendingCards(false);
  }, [recipes.length, setHasPendingCards, converged]);

  const loadNextCategory = useCallback(async () => {
    const generation = ++fetchGenerationRef.current;
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
        if (generation !== fetchGenerationRef.current) return;
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
      if (generation === fetchGenerationRef.current) setIsLoading(false);
    }
  }, [setActiveCategory]);

  /**
   * Silent refetch of the current category stack triggered by fill-the-gap
   * invalidation SSE events. Diffs IDs against the current discoveryStack and
   * reconciles recipes removed or restored by planning, history and rotation changes.
   * Does NOT flash a loading state — existing cards stay visible until the diff
   * is applied.
   *
   * Uses refs for categories/index so it never needs to be recreated and avoids
   * stale closure issues.
   */
  const voteRevisionRef = useRef(0);
  const pendingVotesRef = useRef(new Set<string>());

  const refetchCurrentCategory = useCallback(
    async function refreshCurrentCategory(plannedChange = false): Promise<void> {
      const voteRevision = voteRevisionRef.current;
      const generation = ++fetchGenerationRef.current;
      const cats = categoriesRef.current;
      const idx = categoryIndexRef.current;
      if (cats.length === 0) return;
      try {
        const currentCategory = cats[idx];
        const rawStack = await getDiscoveryStack(currentCategory);
        if (generation !== fetchGenerationRef.current) return;
        if (voteRevision !== voteRevisionRef.current) {
          void refreshCurrentCategory(plannedChange);
          return;
        }
        const freshStack = rawStack
          .filter((r) => !pendingVotesRef.current.has(r.id))
          .map((r) => ({
            ...r,
            imageUrl: getImageUrl(`/api/recipes/${r.id}/hero`),
          }));

        const freshIds = new Set(freshStack.map((r) => r.id));
        const currentStack = useDiscoveryStore.getState().discoveryStack;

        // Determine which IDs were removed and whether any were in the visible top 4
        const visibleTop4Ids = new Set(currentStack.slice(0, 4).map((r) => r.id));
        let removedFromVisible = false;

        for (const recipe of currentStack) {
          if (!freshIds.has(recipe.id)) {
            if (visibleTop4Ids.has(recipe.id)) {
              removedFromVisible = true;
            }
            useDiscoveryStore.getState().removeFromStack(recipe.id);
          }
        }

        // A successful reconciliation can also restore cards or change historical ties.
        useDiscoveryStore.getState().setStack(freshStack);

        // If SSE-driven removals emptied the category, advance to the next one
        if (useDiscoveryStore.getState().discoveryStack.length === 0) {
          loadNextCategory();
          return;
        }

        // Show micro-badge if any visible card was removed
        if (removedFromVisible && plannedChange) {
          setShowJustPlannedBadge(true);
          if (justPlannedTimerRef.current) clearTimeout(justPlannedTimerRef.current);
          justPlannedTimerRef.current = setTimeout(() => {
            setShowJustPlannedBadge(false);
          }, 2000);
        }
      } catch (error) {
        console.error('Silent refetch of discovery category failed', error);
      }
    },
    [loadNextCategory]
  ); // loadNextCategory is stable (ref-based)

  // Subscribe to fill-the-gap invalidation signal from SSE.
  // recipes.length is included so the effect re-fires once the stack loads,
  // handling SSE events that arrived before the initial fetch completed.
  // lastHandledFillTheGapVersionRef prevents double-processing the same version
  // when recipes.length changes for other reasons (e.g. a swipe).
  useEffect(() => {
    if (fillTheGapVersion === 0) return; // skip initial mount
    if (!stackIsLoadedRef.current) return; // stack not ready yet
    if (fillTheGapVersion <= lastHandledFillTheGapVersionRef.current) return; // already handled
    const globalVersion = useDiscoveryStore.getState().allSuggestionsVersion;
    const plannedChange = globalVersion === lastHandledAllSuggestionsVersionRef.current;
    lastHandledAllSuggestionsVersionRef.current = globalVersion;
    lastHandledFillTheGapVersionRef.current = fillTheGapVersion;
    refetchCurrentCategory(plannedChange);
  }, [fillTheGapVersion, refetchCurrentCategory, recipes.length]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (justPlannedTimerRef.current) clearTimeout(justPlannedTimerRef.current);
    };
  }, []);

  const handleSwipeRight = (recipeId: string) => {
    if (useDiscoveryStore.getState().session?.phase === 'converged') return;
    ++voteRevisionRef.current;
    pendingVotesRef.current.add(recipeId);
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
    const turnAtVote = memberTurnRef.current;
    const votePromise = submitVote(recipeId, 1)
      .then(() => {
        pendingVotesRef.current.delete(recipeId);
        ++voteRevisionRef.current;
        void refreshSession();
      })
      .catch((error) => {
        pendingVotesRef.current.delete(recipeId);
        console.error('Failed to submit like vote', error);
        void refreshSession();
        if (turnAtVote === memberTurnRef.current && !isHandoffSettling()) {
          refetchCurrentCategory();
        }
      });
    trackPendingVote(votePromise);

    if (updatedRecipes.length === 0) {
      loadNextCategory();
    }
  };

  const handleSwipeLeft = (recipeId: string) => {
    if (useDiscoveryStore.getState().session?.phase === 'converged') return;
    ++voteRevisionRef.current;
    pendingVotesRef.current.add(recipeId);
    // Optimistic Update
    const updatedRecipes = recipes.filter((r) => r.id !== recipeId);
    useDiscoveryStore.getState().setStack(updatedRecipes);

    // Background Vote
    const turnAtVote = memberTurnRef.current;
    const votePromise = submitVote(recipeId, 2)
      .then(() => {
        pendingVotesRef.current.delete(recipeId);
        ++voteRevisionRef.current;
        void refreshSession();
      })
      .catch((error) => {
        pendingVotesRef.current.delete(recipeId);
        console.error('Failed to submit dislike vote', error);
        void refreshSession();
        if (turnAtVote === memberTurnRef.current && !isHandoffSettling()) {
          refetchCurrentCategory();
        }
      });
    trackPendingVote(votePromise);

    if (updatedRecipes.length === 0) {
      loadNextCategory();
    }
  };

  const otherMembers = useMemo(() => {
    const activeId = (selectedMember?.id ?? selectedFamilyMemberId ?? '').toLowerCase();
    return (familyMembers ?? []).filter((m) => m.id.toLowerCase() !== activeId);
  }, [familyMembers, selectedMember, selectedFamilyMemberId]);

  const currentMember = useMemo(() => {
    if (selectedMember) return selectedMember;
    if (selectedFamilyMemberId) {
      return { id: selectedFamilyMemberId, name: '' };
    }
    return null;
  }, [selectedMember, selectedFamilyMemberId]);

  const handleSelectHandoffTarget = useCallback(
    (targetMember: { id: string; name: string }) => {
      const originId = selectedMember?.id ?? selectedFamilyMemberId;
      if (!originId) return;
      setHandoffLock({
        originMemberId: originId,
        participantName: targetMember.name,
        pendingTargetMemberId: targetMember.id,
      });
    },
    [selectedMember, selectedFamilyMemberId]
  );

  const handleCancelHandoffTarget = useCallback(() => {
    clearHandoffLock();
  }, []);

  const handleConfirmHandoff = useCallback(
    async (targetMember: { id: string; name: string }) => {
      const originId = handoffLock?.originMemberId ?? selectedMember?.id ?? selectedFamilyMemberId;
      if (!originId) return;
      await waitForPendingVotes();
      fetchGenerationRef.current += 1;
      await selectFamilyMember(targetMember.id);
      memberTurnRef.current += 1;
      useDiscoveryStore.getState().setStack([]);
      setMatchCount(0);
      setHandoffLock({ originMemberId: originId, participantName: targetMember.name });
    },
    [handoffLock, selectedMember, selectedFamilyMemberId, selectFamilyMember]
  );

  // Only render the top 4 cards for performance and visual clarity
  const visibleRecipes = useMemo(() => {
    return recipes.slice(0, 4);
  }, [recipes]);

  if (converged) {
    const originMember = handoffLock
      ? (familyMembers ?? []).find(
          (m) => m.id.toLowerCase() === handoffLock.originMemberId.toLowerCase()
        )
      : null;
    const originName = originMember?.name ?? '';
    const participantName = handoffLock?.participantName ?? currentMember?.name ?? '';

    const handleConvergedAction = async () => {
      if (handoffLock) {
        if (isReturningFromConverged) return;
        setIsReturningFromConverged(true);
        setConvergedReturnError(false);
        try {
          await waitForPendingVotes();
          await selectFamilyMember(handoffLock.originMemberId);
          clearHandoffLock();
          useUiStore.getState().addToast({
            type: 'success',
            message: tWithVars(
              'discovery.passThePhone.welcomeBackToast',
              "Welcome back, {{origin}} — {{participant}}'s votes are saved.",
              { origin: originName, participant: participantName }
            ),
          });
        } catch {
          setConvergedReturnError(true);
          setIsReturningFromConverged(false);
          return;
        }
        setIsReturningFromConverged(false);
      }
      const params = new URLSearchParams({
        weekOffset: '0',
        referenceWeekStartDate: session.weekStartDate!.toString(),
      });
      usePlannerStore.getState().setActiveTab('planner');
      router.push(`/planner?${params.toString()}`);
    };

    const actionLabel = handoffLock
      ? isReturningFromConverged
        ? tWithVars('discovery.passThePhone.returningBusy', 'Returning to {{name}}…', {
            name: originName,
          })
        : convergedReturnError
          ? t('discovery.passThePhone.tryAgain', 'Try again')
          : tWithVars(
              'discovery.passThePhone.convergedReturnAction',
              'Back to {{name}} & see matches',
              { name: originName }
            )
      : t('discovery.seeMatches', 'See your matches');

    return (
      <div
        role="status"
        aria-live="polite"
        data-testid="discovery-converged"
        className="flex flex-1 items-center justify-center px-6 py-8"
      >
        <div className="w-full max-w-sm">
          <SuccessCard
            testId="discovery-celebration-card"
            actionTestId="discovery-see-matches"
            headingAs="h1"
            smallTextTone="dark"
            title={t('discovery.menuIsIn', "Menu's in!")}
            description={t('discovery.familyMatches', '')}
            actionLabel={actionLabel}
            onAction={() => void handleConvergedAction()}
          />
          {convergedReturnError && handoffLock && (
            <div
              role="alert"
              data-testid="discovery-converged-error"
              className="mt-4 rounded-2xl border border-hearth-line bg-terracotta-50 px-4 py-3 text-sm text-hearth-ink"
            >
              <p className="font-bold">
                {tWithVars(
                  'discovery.passThePhone.switchError',
                  "Couldn't switch to {{name}} just now.",
                  { name: originName }
                )}
              </p>
              <p className="mt-0.5">
                {tWithVars('discovery.passThePhone.stillSelected', '{{name}} is still selected.', {
                  name: participantName,
                })}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isLoading && recipes.length === 0) {
    return (
      <div className="flex h-[calc(100dvh-6rem)] w-full items-center justify-center">
        <Loader2
          className="animate-spin text-hearth-ink"
          size={48}
          data-testid="discovery-loader"
        />
        {isCurtainPending && currentMember && (
          <PassThePhone
            currentMember={currentMember}
            otherMembers={otherMembers}
            pendingTarget={pendingCurtainTarget}
            onSelectTarget={handleSelectHandoffTarget}
            onCancelTarget={handleCancelHandoffTarget}
            onConfirmHandoff={handleConfirmHandoff}
            hideTrigger
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center px-4 sm:px-6 pt-2 pb-12 min-h-[calc(100dvh-6rem)] relative ${
        recipes.length > 0 ? 'h-content overflow-hidden' : 'overflow-y-auto'
      }`}
    >
      {/* Centered Card Stack Container */}
      <div className="flex-1 flex flex-col items-center justify-center w-full">
        {/* Card Arena */}
        <div
          className={
            recipes.length > 0
              ? 'relative z-10 w-full max-w-sm aspect-[3/4] md:aspect-auto md:h-[60vh] min-h-[400px]'
              : 'relative z-10 w-full max-w-sm py-4'
          }
        >
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
                className="absolute -top-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 rounded-full bg-sage-50 border border-garden-line px-3 py-1 text-xs font-semibold text-garden-ink whitespace-nowrap"
              >
                Just planned ✓
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {recipes.length > 0 ? (
              visibleRecipes.map((recipe, index) => {
                return (
                  <DiscoveryCard
                    key={recipe.id}
                    {...recipe}
                    isFront={index === 0}
                    stackIndex={index}
                    onSwipeRight={() => handleSwipeRight(recipe.id)}
                    onSwipeLeft={() => handleSwipeLeft(recipe.id)}
                  />
                );
              })
            ) : isLockedTurn ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                data-testid="discovery-kid-wrap-up"
                className="flex w-full min-w-0 flex-col items-center justify-center rounded-[2.5rem] border border-chrome-line bg-white px-4 py-8 text-center shadow-card sm:px-6 sm:py-12"
              >
                <div className="mb-5 flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-sunlight-line bg-ochre-100">
                  <Star size={36} fill="#E1AD01" stroke="#E1AD01" aria-hidden="true" />
                </div>
                <h1 className="max-w-full break-words font-heading text-2xl font-extrabold text-ink-body sm:text-3xl">
                  {tWithVars('discovery.passThePhone.kidWrapUpTitle', 'Nice picks, {{name}}!', {
                    name: handoffLock?.participantName ?? currentMember?.name ?? '',
                  })}
                </h1>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                data-testid="discovery-empty-state"
                className="flex w-full min-w-0 flex-col items-center justify-center rounded-[2.5rem] bg-white border-2 border-dashed border-chrome-line px-4 sm:px-6 py-8 text-center shadow-card"
              >
                <div className="mb-4 rounded-full bg-ochre-100 p-4 text-sunlight-ink">
                  <RefreshCcw size={32} aria-hidden="true" />
                </div>
                <h3 className="max-w-full break-words text-xl font-bold font-heading text-ink-body mb-2">
                  {t('discovery.wrapUpTitle', "That's a wrap!")}
                </h3>
                <p className="max-w-full break-words px-2 text-sm font-medium text-ink-muted leading-relaxed mb-8">
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

                <div className="flex flex-col w-full min-w-0 gap-3">
                  <button
                    type="button"
                    onClick={() => router.push(matchCount > 0 ? '/planner' : '/capture')}
                    className="min-h-12 w-full min-w-0 break-words rounded-full bg-hearth-fill px-4 sm:px-6 py-3.5 font-semibold text-cream-100 shadow-sm active:scale-95 transition-all hover:bg-hearth-fill-hover active:bg-hearth-fill-active focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body"
                  >
                    {matchCount > 0
                      ? t('discovery.goToPlanner', 'Go to Planner')
                      : t('discovery.captureNew', 'Capture a New Recipe')}
                  </button>

                  {matchCount > 0 && (
                    <button
                      type="button"
                      onClick={() => router.push('/capture')}
                      className="min-h-12 w-full min-w-0 break-words rounded-full bg-white px-4 sm:px-6 py-3.5 font-semibold text-hearth-ink border border-hearth-line hover:bg-terracotta-50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body"
                    >
                      {t('discovery.captureNew', 'Capture a New Recipe')}
                    </button>
                  )}
                  {(passThePhoneEnabled || isCurtainPending) &&
                    !converged &&
                    otherMembers.length > 0 &&
                    currentMember && (
                      <PassThePhone
                        currentMember={currentMember}
                        otherMembers={otherMembers}
                        pendingTarget={pendingCurtainTarget}
                        onSelectTarget={handleSelectHandoffTarget}
                        onCancelTarget={handleCancelHandoffTarget}
                        onConfirmHandoff={handleConfirmHandoff}
                      />
                    )}
                  {ownsRound && (
                    <button
                      type="button"
                      data-testid="discovery-nudge-family"
                      onClick={() => setShowNudgeDialog(true)}
                      className="min-h-12 w-full min-w-0 break-words rounded-full bg-white px-4 sm:px-6 py-3.5 font-semibold text-garden-ink border border-garden-line hover:bg-sage-50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body"
                    >
                      {t('planner.nudgeFamily', 'Nudge family')}
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <FamilyNudgeDialog open={showNudgeDialog} onClose={closeNudgeDialog} />

      {isCurtainPending && recipes.length > 0 && currentMember && (
        <PassThePhone
          currentMember={currentMember}
          otherMembers={otherMembers}
          pendingTarget={pendingCurtainTarget}
          onSelectTarget={handleSelectHandoffTarget}
          onCancelTarget={handleCancelHandoffTarget}
          onConfirmHandoff={handleConfirmHandoff}
          hideTrigger
        />
      )}

      {/* Control Buttons (Thumb Zone) */}
      {!(isLockedTurn && recipes.length === 0) && (
        <div className="mt-10 flex w-full max-w-sm shrink-0 items-center justify-between px-8 pb-4">
          <button
            type="button"
            disabled={recipes.length === 0}
            onClick={() => recipes.length > 0 && handleSwipeLeft(recipes[0].id)}
            data-testid="dislike-button"
            aria-label="Dislike recipe"
            className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-hearth-ink shadow-card border border-hearth-line active:scale-90 transition-transform disabled:opacity-20 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body"
          >
            <span className="text-2xl" aria-hidden="true">
              ✕
            </span>
          </button>

          {recipes.length === 0 ? (
            <button
              type="button"
              onClick={fetchCategories}
              data-testid="refresh-button"
              aria-label="Refresh recipe suggestions"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-ink-muted shadow-sm border border-chrome-line hover:bg-charcoal-50 active:rotate-180 transition-transform duration-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body"
            >
              <RefreshCcw size={18} aria-hidden="true" />
            </button>
          ) : (
            <div className="h-12 w-12" />
          )}

          <button
            type="button"
            disabled={recipes.length === 0}
            onClick={() => recipes.length > 0 && handleSwipeRight(recipes[0].id)}
            data-testid="like-button"
            aria-label="Like recipe"
            className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-garden-ink shadow-card border border-garden-line active:scale-90 transition-transform disabled:opacity-20 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body"
          >
            <span className="text-3xl" aria-hidden="true">
              ♥
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
