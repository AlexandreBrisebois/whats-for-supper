'use client';

import React, { useEffect, useState, useMemo, useRef, memo } from 'react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  GripVertical,
  Users,
  Share2,
  Copy,
  X,
  Check,
  Calendar,
  ShoppingCart,
  Ban,
  Sparkles,
} from 'lucide-react';
import { usePlannerStore } from '@/store/plannerStore';
import { useWeekStore } from '@/store/weekStore';
import type { UILocalScheduleDay } from '@/store/weekStore';
import { lockSchedule, assignRecipeToDay, openVoting } from '@/lib/api/planner';
import { apiClient } from '@/lib/api/api-client';
import { DateOnly } from '@microsoft/kiota-abstractions';
import { Button } from '@/components/ui/button';
import { PlanningPivotSheet } from '@/components/planner/PlanningPivotSheet';
import { cn } from '@/lib/utils';
import { t, tWithVars } from '@/locales';
import { QuickFindModal } from '@/components/planner/QuickFindModal';
import { useRouter, useSearchParams } from 'next/navigation';
import { SolarLoader } from '@/components/ui/SolarLoader';
import { CooksMode } from '@/components/planner/CooksMode';
import { getImageUrl, getTodayString } from '@/lib/imageUtils';
import { GroceryList } from '@/components/planner/GroceryList';
// import { BalanceIndicator } from '@/components/planner/BalanceIndicator';
import { useDiscoveryStore } from '@/store/discoveryStore';
import { useTodayStore } from '@/store/todayStore';
import { SkipRecoveryDialog } from '@/components/home/SkipRecoveryDialog';
import { type AssignmentRecipe, resolveOccupiedSlot } from '@/lib/planner/slotAssignment';
import { getVotingLink } from '@/lib/auth';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export default function PlannerPage() {
  const router = useRouter();
  const { currentWeekOffset, activeTab, setWeekOffset, setActiveTab, setGroceryState } =
    usePlannerStore();
  // const balanceSummary = useWeekStore((s) => s.balanceSummary);
  const schedule = useWeekStore((s) => s.schedule);
  const isLoading = useWeekStore((s) => s.isLoading);
  const status = useWeekStore((s) => s.status);
  const groceryItems = useWeekStore((s) => s.groceryItems);
  const isVotingOpen = status === 1;
  const isLocked = status === 2;
  const [showPivot, setShowPivot] = useState<{ dayIndex: number } | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [showQuickFind, setShowQuickFind] = useState(false);
  const [pendingQuickFindDayIndex, setPendingQuickFindDayIndex] = useState<number | null>(null);
  const [successDay, setSuccessDay] = useState<number | null>(null);
  const [activeCookMode, setActiveCookMode] = useState<UILocalScheduleDay | null>(null);
  const [showNudgeDialog, setShowNudgeDialog] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [pendingRecovery, setPendingRecovery] = useState<{
    slot: {
      weekOffset: number;
      dayIndex: number;
      date: string;
      recipe: any;
    };
    recipe: AssignmentRecipe;
  } | null>(null);
  const { setHasPendingCards } = useDiscoveryStore();
  const searchParams = useSearchParams();
  const successParam = searchParams.get('success');
  const [prevOffset, setPrevOffset] = useState(currentWeekOffset);
  const preDragSnapshotRef = useRef<UILocalScheduleDay[] | null>(null);
  const draggedUiIdRef = useRef<string | null>(null);
  const [hasAnimatedIn, setHasAnimatedIn] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const isWide = useMediaQuery('(min-width: 1024px)');

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => setHasAnimatedIn(true), 1000);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setHasAnimatedIn(false), 0);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  useEffect(() => {
    setHasPendingCards(isVotingOpen);
  }, [isVotingOpen, setHasPendingCards]);

  useEffect(() => {
    if (!showNudgeDialog) return;

    let isActive = true;
    const baseUrl = window.location.origin;
    getVotingLink(baseUrl).then((votingLink) => {
      if (!isActive) return;
      setShareUrl(votingLink || `${baseUrl}/discovery`);
    });

    return () => {
      isActive = false;
    };
  }, [showNudgeDialog]);

  useEffect(() => {
    useWeekStore.getState().init(currentWeekOffset);
  }, [currentWeekOffset, successParam]);

  useEffect(() => {
    if (pendingQuickFindDayIndex === null || showPivot !== null) return;

    const timer = window.setTimeout(() => {
      setSelectedDayIndex(pendingQuickFindDayIndex);
      setShowQuickFind(true);
      setPendingQuickFindDayIndex(null);
    }, 240);

    return () => window.clearTimeout(timer);
  }, [pendingQuickFindDayIndex, showPivot]);

  // Update prevOffset during render for animation direction (not in effect to avoid lint warning)
  if (currentWeekOffset !== prevOffset) {
    setPrevOffset(currentWeekOffset);
  }

  useEffect(() => {
    const success = searchParams.get('success');
    const dayIndex = searchParams.get('dayIndex');
    if (success && dayIndex !== null) {
      const idx = parseInt(dayIndex);

      // Defer state update to avoid cascading render error
      const stateTimer = setTimeout(() => {
        setSuccessDay(idx);
      }, 0);

      // Auto-scroll logic
      const element = document.getElementById(`day-card-${idx}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      const clearTimer = setTimeout(() => setSuccessDay(null), 3000);
      return () => {
        clearTimeout(stateTimer);
        clearTimeout(clearTimer);
      };
    }
  }, [searchParams]);

  const handlePrevWeek = () => setWeekOffset(currentWeekOffset - 1);
  const handleNextWeek = () => setWeekOffset(currentWeekOffset + 1);

  const handleCloseVoting = async () => {
    try {
      await useWeekStore.getState().closeVoting();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error: any) {
      console.warn('Failed to close voting:', error?.message || error);
    }
  };

  const handleNudgeFamily = () => {
    setCopied(false);
    setShareUrl('');
    setShowNudgeDialog(true);
  };

  const handleCopyVotingLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const handleShareVotingLink = async () => {
    if (!navigator.share || !shareUrl) return;
    try {
      await navigator.share({
        title: "What's for Supper?",
        text: `Help us choose what's for supper! Vote here:`,
        url: shareUrl,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleQuickFindSelect = async (recipe: any) => {
    if (selectedDayIndex === null) return;
    const selectedDay = schedule[selectedDayIndex];
    const nextRecipe = {
      id: recipe.id,
      name: recipe.name ?? null,
      image: recipe.image ?? '',
    };

    if (selectedDay?.recipe?.id && selectedDay.date) {
      setPendingRecovery({
        slot: {
          weekOffset: currentWeekOffset,
          dayIndex: selectedDayIndex,
          date: selectedDay.date,
          recipe: selectedDay.recipe,
        },
        recipe: nextRecipe,
      });
      setShowQuickFind(false);
      return;
    }

    useWeekStore.getState().assignRecipe(selectedDayIndex, {
      id: nextRecipe.id,
      name: nextRecipe.name,
      image: nextRecipe.image,
    });

    // Propagate to todayStore if this is today's slot
    const assignedDate = schedule[selectedDayIndex]?.date;
    if (currentWeekOffset === 0 && assignedDate === getTodayString()) {
      useTodayStore.getState().assignRecipe(nextRecipe);
    }

    setShowQuickFind(false);
    setShowPivot(null);
    setSelectedDayIndex(null);
    setPendingQuickFindDayIndex(null);
  };

  const handleRecoveryAction = async (action: string) => {
    if (!pendingRecovery) return;
    if (action !== 'tomorrow' && action !== 'next_week' && action !== 'drop') return;

    const { slot, recipe } = pendingRecovery;
    await resolveOccupiedSlot(slot, action);
    useWeekStore.getState().assignRecipe(slot.dayIndex, recipe);

    if (slot.weekOffset === 0 && slot.date === getTodayString()) {
      useTodayStore.getState().assignRecipe(recipe);
    }

    setPendingRecovery(null);
    setShowPivot(null);
    setSelectedDayIndex(null);
    setPendingQuickFindDayIndex(null);
    await useWeekStore.getState().init(currentWeekOffset);
  };

  const handleSearchPath = () => {
    const dayIndex = showPivot?.dayIndex ?? selectedDayIndex;
    if (dayIndex === null) return;
    router.push(`/recipes?addToDay=${dayIndex}&weekOffset=${currentWeekOffset}`);
  };

  const handleAskFamily = async () => {
    try {
      await useWeekStore.getState().openVoting();
      setShowPivot(null);
    } catch (error: any) {
      console.warn('Failed to open voting:', error?.message || error);
    }
  };

  const handleRemoveRecipe = async () => {
    if (showPivot === null) return;
    const dayIndex = showPivot.dayIndex;
    const date = schedule[dayIndex].date;
    if (!date) return;
    setShowPivot(null);
    useWeekStore.getState().removeRecipe(dayIndex, date);
  };

  // Framer Motion calls onReorder on every pointer move during drag (fires on each midpoint
  // crossing). We apply each intermediate reorder directly to the store so that onDragEnd can
  // read getState().schedule for the authoritative final position — including the terminal slot
  // where no further midpoint crossing occurs and onReorder would otherwise stop firing.
  const handleReorder = (newSchedule: UILocalScheduleDay[]) => {
    const draggedUiId = draggedUiIdRef.current;
    if (!draggedUiId) return;

    const dragBaseSchedule = preDragSnapshotRef.current ?? useWeekStore.getState().schedule;
    const from = dragBaseSchedule.findIndex((d) => d._uiId === draggedUiId);
    const to = newSchedule.findIndex((d) => d._uiId === draggedUiId);

    if (from !== -1 && to !== -1) {
      useWeekStore.getState().reorderLocally(from, to, dragBaseSchedule);
    }
  };

  const plannedCount = schedule.filter((d) => d.recipe && d.recipe.id).length;
  const isFinalized = isLocked;
  const weekIsPast = useMemo(() => {
    if (schedule.length < 7) return false;
    return (schedule[6].date ?? '') < getTodayString();
  }, [schedule]);
  const canOpenVoting = !weekIsPast && (status === 0 || status === 2);
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <div className="flex flex-col min-h-screen pb-20 solar-earth-bg">
      {/* Animated Blobs */}
      <div className="blob blob-terracotta -top-20 -left-20 animate-[pulse_8s_infinite]" />
      <div className="blob blob-sage top-1/2 -right-40 animate-[pulse_10s_infinite] [animation-delay:1s]" />
      <div className="blob blob-ochre -bottom-20 left-1/4 animate-[pulse_12s_infinite] [animation-delay:2s]" />

      {/* Header Section */}
      <header className="sticky top-0 z-30 px-4 pt-2 pb-2 sm:px-6 sm:pt-3 sm:pb-2 glass-nav">
        <div
          className={cn(
            'mx-auto w-full transition-all duration-500',
            isWide ? 'max-w-[1400px]' : 'max-w-[27rem] sm:max-w-sm md:max-w-2xl'
          )}
        >
          {/* Tab Switcher */}
          {!isWide && (
            <div className="flex bg-charcoal/5 p-1.5 rounded-[1.5rem] relative">
              <button
                onClick={() => setActiveTab('planner')}
                data-testid="planner-tab"
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all z-10',
                  activeTab === 'planner' ? 'bg-white text-charcoal shadow-sm' : 'text-charcoal/40'
                )}
              >
                <Calendar size={14} /> {t('planner.planner', 'Planner')}
              </button>
              <button
                onClick={() => setActiveTab('grocery')}
                data-testid="grocery-tab"
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all z-10',
                  activeTab === 'grocery' ? 'bg-white text-charcoal shadow-sm' : 'text-charcoal/40'
                )}
              >
                <ShoppingCart size={14} /> {t('planner.groceryList', 'Grocery list')}
              </button>
            </div>
          )}

          {/* Week Navigator */}
          <div className="mt-3 flex items-start justify-between gap-3">
            <button
              data-testid="prev-week"
              onClick={handlePrevWeek}
              className="p-3 rounded-full hover:bg-charcoal/5 active:scale-90 transition-all"
              aria-label="Previous week"
              title="Previous week"
            >
              <ChevronLeft className="text-charcoal/60" />
            </button>

            <div className="min-w-0 flex-1 text-center">
              <span
                className="font-heading text-[10px] font-black uppercase tracking-[0.2em] text-charcoal/30 text-center flex-1"
                data-testid="week-range"
              >
                {currentWeekOffset === 0
                  ? t('planner.thisWeek', 'This week')
                  : currentWeekOffset === 1
                    ? t('planner.nextWeek', 'Next week')
                    : tWithVars('planner.weekX', `Week ${currentWeekOffset}`, {
                        count: currentWeekOffset,
                      })}
              </span>
              <h2 className="text-lg font-heading font-bold text-charcoal flex items-center justify-center">
                {isVotingOpen && (
                  <span className="relative flex h-2 w-2 mr-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ochre opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-ochre"></span>
                  </span>
                )}
                {schedule.length >= 7
                  ? (() => {
                      const start = new Date(schedule[0].date ?? '');
                      const end = new Date(schedule[6].date ?? '');
                      const monthNames = [
                        'Jan',
                        'Feb',
                        'Mar',
                        'Apr',
                        'May',
                        'Jun',
                        'Jul',
                        'Aug',
                        'Sep',
                        'Oct',
                        'Nov',
                        'Dec',
                      ];
                      const startMonth = monthNames[start.getUTCMonth()];
                      const endMonth = monthNames[end.getUTCMonth()];
                      const startDate = start.getUTCDate();
                      const endDate = end.getUTCDate();

                      if (startMonth === endMonth) {
                        return `${startMonth} ${startDate} — ${endDate}`;
                      }
                      return `${startMonth} ${startDate} — ${endMonth} ${endDate}`;
                    })()
                  : t('messages.loading', 'Loading...')}
              </h2>
              {currentWeekOffset !== 0 && (
                <button
                  type="button"
                  data-testid="planner-this-week-pill"
                  onClick={() => setWeekOffset(0)}
                  className="mx-auto mt-2 inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-terracotta/15 bg-white/75 px-3 text-[9px] font-black uppercase tracking-[0.18em] text-terracotta shadow-sm shadow-terracotta/5 transition-all hover:bg-terracotta/5 active:scale-95"
                  aria-label={t('planner.backToThisWeek', 'Back to this week')}
                  title={t('planner.backToThisWeek', 'Back to this week')}
                >
                  <ChevronLeft size={12} strokeWidth={3} aria-hidden="true" />
                  {t('planner.backToThisWeek', 'Back to this week')}
                </button>
              )}
            </div>

            <button
              data-testid="next-week"
              onClick={handleNextWeek}
              className="p-3 rounded-full hover:bg-charcoal/5 active:scale-90 transition-all"
              aria-label="Next week"
              title="Next week"
            >
              <ChevronRight className="text-charcoal/60" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        className={cn(
          'px-4 sm:px-6 py-2 sm:py-3 overflow-x-hidden w-full transition-all duration-500',
          isWide
            ? 'max-w-[1400px] mx-auto grid grid-cols-[1fr_420px] gap-8 items-start'
            : 'max-w-[27rem] sm:max-w-sm md:max-w-2xl mx-auto'
        )}
      >
        <AnimatePresence>
          {isLoading && schedule.length === 0 ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <SolarLoader label={t('planner.curatingWeek', 'Curating your week...')} />
            </motion.div>
          ) : activeTab === 'grocery' && !isWide ? (
            <motion.div
              key="grocery"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <GroceryList
                weekOffset={currentWeekOffset}
                items={groceryItems ?? []}
                onClose={() => setActiveTab('planner')}
              />
            </motion.div>
          ) : (
            <motion.div
              key={`planner-${currentWeekOffset}`}
              initial={{ opacity: 0, x: currentWeekOffset > prevOffset ? 50 : -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: currentWeekOffset > prevOffset ? -50 : 50 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <div
                data-testid="planner-action-row"
                className={cn(
                  'grid grid-cols-[1fr_auto_1fr] items-center gap-2',
                  isWide ? 'mb-2 pt-2.5' : 'mb-3'
                )}
              >
                {/* Left Slot: Secondary Actions */}
                <div className="flex justify-start">
                  {isVotingOpen && (
                    <button
                      onClick={handleNudgeFamily}
                      data-testid="nudge-family-cta"
                      className="flex h-9 items-center gap-1.5 rounded-full bg-sage px-3 text-[9px] font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-sage/15 transition-all active:scale-95"
                    >
                      <Share2 size={10} />
                      {t('planner.nudgeFamily', 'Nudge family')}
                    </button>
                  )}
                </div>

                {/* Center Slot: Status Anchor */}
                <div
                  data-testid="planned-count-badge"
                  className="flex h-9 items-center space-x-1 rounded-full border border-sage/10 bg-white/75 px-3 text-[9px] font-black uppercase tracking-[0.18em] text-sage shadow-sm shadow-sage/5"
                >
                  <span className="relative mr-1 flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sage opacity-75"></span>
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sage"></span>
                  </span>
                  {tWithVars('planner.plannedCount', `${plannedCount}/7`, {
                    current: plannedCount,
                  })}
                </div>

                {/* Right Slot: Primary Actions */}
                <div className="flex justify-end">
                  {canOpenVoting && (
                    <button
                      onClick={handleAskFamily}
                      data-testid="ask-family-cta"
                      className="flex h-9 items-center rounded-full bg-sage px-4 text-[9px] font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-sage/15 transition-all active:scale-95"
                    >
                      <Users size={12} className="mr-2" />
                      {t('planner.askFamily', 'Ask the Family')}
                    </button>
                  )}
                  {isVotingOpen && (
                    <button
                      onClick={handleCloseVoting}
                      data-testid="close-voting-btn"
                      className="flex h-9 items-center gap-1.5 rounded-full border border-terracotta/10 bg-white/80 px-3 text-[9px] font-black uppercase tracking-[0.18em] text-terracotta transition-all hover:bg-terracotta hover:text-white active:scale-95"
                    >
                      <Ban size={10} />
                      {t('planner.closeVoting', 'Close Voting')}
                    </button>
                  )}
                </div>
              </div>

              {/* <div className="mb-4 opacity-90">
  <BalanceIndicator summary={balanceSummary} className="mb-0" />
</div> */}

              <Reorder.Group
                axis="y"
                values={schedule}
                onReorder={handleReorder}
                className="w-full space-y-3.5"
                data-testid="reorder-group"
              >
                {schedule.map((day, index) => (
                  <PlannerDayCard
                    key={day._uiId}
                    day={day}
                    index={index}
                    successDay={successDay}
                    onPivot={() => {
                      setSelectedDayIndex(index);
                      setShowPivot({ dayIndex: index });
                    }}
                    onCookMode={() => {
                      setActiveCookMode(day);
                    }}
                    preDragSnapshotRef={preDragSnapshotRef}
                    draggedUiIdRef={draggedUiIdRef}
                    hasAnimatedIn={hasAnimatedIn}
                    isWide={isWide}
                  />
                ))}
              </Reorder.Group>
            </motion.div>
          )}
        </AnimatePresence>

        {isWide && (
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            className="sticky top-[72px] h-[calc(100vh-285px)] rounded-[2.5rem] overflow-hidden border border-white/20 shadow-2xl glass flex flex-col"
          >
            <GroceryList weekOffset={currentWeekOffset} items={groceryItems ?? []} isEmbedded />
          </motion.div>
        )}
      </main>

      {showSuccess && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-24 left-6 right-6 z-50 bg-sage text-white p-6 rounded-3xl shadow-2xl flex items-center gap-4"
        >
          <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
            <Check size={24} />
          </div>
          <div className="flex flex-col">
            <h4 className="font-heading text-lg font-black tracking-tight leading-none">
              {t('planner.weekFinalized', "Menu's in!")}
            </h4>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mt-1">
              {t(
                'planner.discoveryVotesPurged',
                "Votes have been recorded and reset, we're ready for the next family voting session."
              )}
            </p>
          </div>
        </motion.div>
      )}

      <PlanningPivotSheet
        isOpen={showPivot !== null}
        onClose={() => {
          setShowPivot(null);
          setSelectedDayIndex(null);
          setPendingQuickFindDayIndex(null);
        }}
        dayIndex={showPivot?.dayIndex ?? 0}
        onQuickFind={() => {
          if (showPivot === null) return;
          setPendingQuickFindDayIndex(showPivot.dayIndex);
          setShowPivot(null);
        }}
        onSearchLibrary={handleSearchPath}
        onRemoveRecipe={handleRemoveRecipe}
        hasRecipe={!!(showPivot !== null && schedule[showPivot.dayIndex]?.recipe?.id)}
      />

      <AnimatePresence>
        {showNudgeDialog && (
          <motion.div
            key="planner-nudge-dialog-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-charcoal/40 px-4 backdrop-blur-sm"
            onClick={() => setShowNudgeDialog(false)}
          >
            <motion.div
              data-testid="planner-nudge-dialog"
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="flex w-full max-w-sm flex-col gap-5 rounded-[2rem] bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-charcoal">Nudge the family</h2>
                  <p className="mt-0.5 text-xs text-charcoal/50">
                    Share this week&apos;s voting link
                  </p>
                </div>
                <button
                  onClick={() => setShowNudgeDialog(false)}
                  data-testid="planner-nudge-close"
                  className="rounded-full p-2 text-charcoal/40 transition-colors hover:bg-charcoal/5"
                  aria-label={t('common.close', 'Close')}
                  title={t('common.close', 'Close')}
                >
                  <X size={18} />
                </button>
              </div>

              <div
                data-testid="planner-nudge-link"
                className="select-all break-all rounded-xl border border-charcoal/10 bg-cream px-4 py-3 font-mono text-xs text-charcoal/60"
              >
                {shareUrl || 'Generating link...'}
              </div>

              {copied && (
                <p
                  data-testid="planner-nudge-copied-feedback"
                  className="-mt-2 text-center text-xs font-medium text-sage"
                >
                  Link copied!
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleCopyVotingLink}
                  disabled={!shareUrl}
                  data-testid="planner-nudge-copy"
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-charcoal/5 text-sm font-semibold text-charcoal transition-all hover:bg-charcoal/10 active:scale-95 disabled:opacity-40"
                >
                  <Copy size={16} />
                  Copy
                </button>
                {canShare && (
                  <button
                    onClick={handleShareVotingLink}
                    disabled={!shareUrl}
                    data-testid="planner-nudge-share"
                    className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-ochre text-sm font-semibold text-white shadow-lg shadow-ochre/30 transition-all hover:brightness-110 active:scale-95 disabled:opacity-40"
                  >
                    <Share2 size={16} />
                    Share
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showQuickFind && (
          <QuickFindModal
            onClose={() => {
              setShowQuickFind(false);
              setSelectedDayIndex(null);
              setPendingQuickFindDayIndex(null);
            }}
            onSelect={handleQuickFindSelect}
            weekOffset={currentWeekOffset}
            dayIndex={selectedDayIndex}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeCookMode && activeCookMode.recipe && activeCookMode.recipe.id && (
          <CooksMode
            recipe={{
              id: activeCookMode.recipe.id,
              name: activeCookMode.recipe.name || null,
              image: activeCookMode.recipe.image || '',
            }}
            onClose={() => setActiveCookMode(null)}
            onCooked={async () => {
              if (!activeCookMode.date) return;
              try {
                await apiClient.api.schedule.day
                  .byDate(DateOnly.parse(activeCookMode.date)!)
                  .validate.post({ status: 2 });
              } catch (err) {
                console.warn('Failed to mark cooked from planner:', err);
              }
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingRecovery && (
          <SkipRecoveryDialog
            isOpen={true}
            step={2}
            onClose={() => setPendingRecovery(null)}
            onBack={() => setPendingRecovery(null)}
            onAction={handleRecoveryAction}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

const PlannerDayCard = memo(function PlannerDayCard({
  day,
  index,
  successDay,
  onPivot,
  onCookMode,
  preDragSnapshotRef,
  draggedUiIdRef,
  hasAnimatedIn,
  isWide,
}: {
  day: UILocalScheduleDay;
  index: number;
  successDay: number | null;
  onPivot: () => void;
  onCookMode: () => void;
  preDragSnapshotRef: React.RefObject<UILocalScheduleDay[] | null>;
  draggedUiIdRef: React.RefObject<string | null>;
  hasAnimatedIn: boolean;
  isWide: boolean;
}) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={day}
      dragListener={false}
      dragControls={dragControls}
      onDragStart={() => {
        usePlannerStore.getState().setDeferredWeekSnapshot(null);
        usePlannerStore.getState().setIsDragActive(true);
        preDragSnapshotRef.current = useWeekStore.getState().schedule;
        draggedUiIdRef.current = day._uiId;
      }}
      onDragEnd={() => {
        const snapshot = preDragSnapshotRef.current;
        // Read the store directly: handleReorder calls reorderLocally on every midpoint
        // crossing (including terminal positions), so the store reflects the true final order.
        const finalOrder = useWeekStore.getState().schedule;
        const finalFrom = snapshot ? snapshot.findIndex((d) => d._uiId === day._uiId) : -1;
        const finalTo = finalOrder.findIndex((d) => d._uiId === day._uiId);
        if (finalFrom !== -1 && finalTo !== -1 && finalFrom !== finalTo && snapshot !== null) {
          useWeekStore.getState().commitMove(finalFrom, finalTo, snapshot);
        }
        const plannerStore = usePlannerStore.getState();
        plannerStore.setIsDragActive(false);
        const refreshedPlannerStore = usePlannerStore.getState();
        if (
          refreshedPlannerStore.deferredWeekSnapshot &&
          refreshedPlannerStore.localMoveSeq === refreshedPlannerStore.confirmedMoveSeq
        ) {
          const deferredSnapshot = refreshedPlannerStore.deferredWeekSnapshot;
          refreshedPlannerStore.setDeferredWeekSnapshot(null);
          useWeekStore.getState().applySnapshot(deferredSnapshot);
        }
        draggedUiIdRef.current = null;
        preDragSnapshotRef.current = null;
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        delay: hasAnimatedIn ? 0 : index * 0.05,
        type: 'spring',
        damping: 15,
        stiffness: 100,
      }}
      whileDrag={{
        scale: 1.02,
        opacity: 1,
        backgroundColor: '#ffffff',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        borderColor: '#8a9a5b',
        borderWidth: '2px',
        borderStyle: 'solid',
        zIndex: 999,
        cursor: 'grabbing',
      }}
      className={cn(
        'w-full rounded-2xl overflow-hidden glass shadow-sm relative group transition-colors duration-500',
        successDay === index
          ? 'ring-4 ring-sage ring-offset-4 ring-offset-transparent'
          : 'border border-white/20'
      )}
      data-testid={`day-card-${index}`}
      data-date={day.date}
      id={`day-card-${index}`}
    >
      <motion.div
        whileTap={{ scale: 0.98 }}
        className={cn(
          'flex items-stretch px-4 relative z-10',
          isWide ? 'py-2 min-h-[64px]' : 'py-2.5 min-h-[72px]'
        )}
      >
        <div className="flex flex-col items-center justify-center w-12 mr-4 shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal/40 leading-none mb-1">
            {day.day}
          </span>
          <span className="text-lg font-heading font-extrabold text-charcoal leading-none">
            {(() => {
              if (!day.date) return '';
              const d = new Date(day.date);
              return d.getUTCDate();
            })()}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-tighter text-charcoal/40 leading-none mt-1">
            {(() => {
              if (!day.date) return '';
              const d = new Date(day.date);
              return d.toLocaleDateString('en-US', { month: 'short' });
            })()}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          {day.status === 3 ? (
            <button
              onClick={onPivot}
              data-testid="ordered-in-indicator"
              className="flex items-center gap-3 w-full text-left hover:opacity-80 transition-opacity"
            >
              <div className="h-10 w-10 rounded-xl bg-charcoal/5 flex items-center justify-center flex-shrink-0">
                <span className="text-xl">🥡</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold text-charcoal/60">Ordered In</span>
                <span className="text-[10px] text-charcoal/30 font-medium">No cook tonight</span>
              </div>
            </button>
          ) : day.recipe?.id ? (
            <div className="flex items-stretch">
              {day.recipe.image && (
                <div
                  className={cn(
                    'relative rounded-xl overflow-hidden mr-2.5 bg-charcoal/5 flex-shrink-0 self-center',
                    isWide ? 'h-10 w-10' : 'h-12 w-12'
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getImageUrl(day.recipe.image)}
                    alt={day.recipe.name || 'Recipe'}
                    className="absolute inset-0 h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPivot();
                }}
                className="flex flex-1 min-w-0 items-center text-left rounded-2xl px-1 py-0.5 active:bg-ochre/5 transition-colors"
                data-testid="edit-recipe-button"
              >
                <div className="flex w-full flex-col justify-center gap-0.5">
                  <h4
                    className={cn(
                      'font-bold text-charcoal line-clamp-2',
                      isWide ? 'text-sm leading-tight' : 'text-base leading-tight'
                    )}
                    data-testid="recipe-name"
                  >
                    {day.recipe.name}
                  </h4>
                  {(() => {
                    const count = day._voteCount ?? day.recipe?.voteCount ?? null;
                    const isUnanimous = day._unanimousVote;
                    const hasVotes = count != null && count > 0;
                    return (
                      <span
                        data-testid="vote-count"
                        className={cn(
                          'text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap inline-block w-fit mt-0.5',
                          hasVotes ? 'visible' : 'visible',
                          hasVotes
                            ? isUnanimous
                              ? 'bg-sage/20 text-sage'
                              : 'bg-ochre/20 text-ochre'
                            : 'bg-charcoal/8 text-charcoal/55'
                        )}
                      >
                        {hasVotes ? `${count} voted` : 'Chosen'}
                      </span>
                    );
                  })()}
                </div>
              </button>
              <div className="ml-2 pl-2 border-l border-charcoal/8 flex items-center gap-1 self-stretch">
                {day.date === getTodayString() && day.recipe && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCookMode();
                    }}
                    className="h-9 w-9 rounded-xl bg-sage/8 text-lg active:scale-90 transition-transform"
                    data-testid="start-cook-mode"
                    title="Open cook mode"
                    aria-label="Open cook mode"
                  >
                    👨‍🍳
                  </motion.button>
                )}
                <div
                  onPointerDown={(e) => dragControls.start(e)}
                  className="h-full min-h-[44px] flex items-center px-2.5 cursor-grab active:cursor-grabbing touch-none select-none group/handle rounded-r-2xl"
                  aria-label="Drag to reorder"
                  title="Drag to reorder"
                >
                  <GripVertical
                    className="text-charcoal/20 group-hover/handle:text-sage transition-colors"
                    size={20}
                  />
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={onPivot}
              data-testid="plan-meal-button"
              className="flex items-center w-full min-h-[44px] text-left group rounded-2xl px-1 py-0.5 active:bg-terracotta/10 transition-colors"
            >
              <div className="h-10 w-10 rounded-xl border border-dashed border-terracotta/30 flex items-center justify-center mr-3 group-hover:bg-terracotta/10 group-hover:border-terracotta/50 transition-colors">
                <Plus
                  className="text-terracotta/50 group-hover:text-terracotta transition-colors"
                  size={18}
                />
              </div>
              <div className="flex flex-col justify-center">
                <span
                  className={cn(
                    'font-bold text-charcoal/45 group-hover:text-terracotta/70 transition-colors',
                    isWide ? 'text-xs' : 'text-sm'
                  )}
                >
                  Plan supper
                </span>
              </div>
            </button>
          )}
        </div>
      </motion.div>
    </Reorder.Item>
  );
});
