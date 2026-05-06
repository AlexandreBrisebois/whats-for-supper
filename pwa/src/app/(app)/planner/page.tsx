'use client';

import React, { useEffect, useState, useMemo, useRef, memo } from 'react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  GripVertical,
  Users,
  Check,
  Calendar,
  ShoppingCart,
  Ban,
  Sparkles,
} from 'lucide-react';
import { usePlannerStore } from '@/store/plannerStore';
import { useWeekStore } from '@/store/weekStore';
import type { UILocalScheduleDay } from '@/store/weekStore';
import Image from 'next/image';
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
import { BalanceIndicator } from '@/components/planner/BalanceIndicator';
import { useDiscoveryStore } from '@/store/discoveryStore';
import { useTodayStore } from '@/store/todayStore';

export default function PlannerPage() {
  const router = useRouter();
  const { currentWeekOffset, activeTab, setWeekOffset, setActiveTab, setGroceryState } =
    usePlannerStore();
  const balanceSummary = useWeekStore((s) => s.balanceSummary);
  const schedule = useWeekStore((s) => s.schedule);
  const isLoading = useWeekStore((s) => s.isLoading);
  const status = useWeekStore((s) => s.status);
  const groceryItems = useWeekStore((s) => s.groceryItems);
  const isVotingOpen = status === 1;
  const isLocked = status === 2;
  const [showPivot, setShowPivot] = useState<{ dayIndex: number } | null>(null);
  const [showQuickFind, setShowQuickFind] = useState(false);
  const [successDay, setSuccessDay] = useState<number | null>(null);
  const [activeCookMode, setActiveCookMode] = useState<UILocalScheduleDay | null>(null);
  const { setHasPendingCards } = useDiscoveryStore();
  const searchParams = useSearchParams();
  const successParam = searchParams.get('success');
  const [prevOffset, setPrevOffset] = useState(currentWeekOffset);
  const preDragSnapshotRef = useRef<UILocalScheduleDay[] | null>(null);
  const draggedUiIdRef = useRef<string | null>(null);
  const [hasAnimatedIn, setHasAnimatedIn] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

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
    useWeekStore.getState().init(currentWeekOffset);
  }, [currentWeekOffset, successParam]);

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
    await useWeekStore.getState().lockWeek();
  };

  const handleFinalize = async () => {
    try {
      const pendingSlots = schedule
        .map((day, index) => ({ day, index }))
        .filter(({ day }) => day._isPending && day.recipe);

      for (const { day, index } of pendingSlots) {
        if (day.recipe && day.recipe.id && day.recipe.image) {
          await assignRecipeToDay(currentWeekOffset, index, {
            id: day.recipe.id,
            name: day.recipe.name || null,
            image: day.recipe.image || '',
          });
        }
      }

      await lockSchedule(currentWeekOffset);

      // Open voting for next week immediately
      try {
        await openVoting(currentWeekOffset + 1);
      } catch {
        // non-fatal — next week voting can be opened manually
      }

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        // Navigate to next week with clean state
        setWeekOffset(currentWeekOffset + 1);
      }, 2000);
    } catch (error: any) {
      console.warn('Failed to finalize:', error?.message || error);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setWeekOffset(currentWeekOffset + 1);
      }, 2000);
    }
  };

  const handleQuickFindSelect = async (recipe: any) => {
    if (showPivot === null) return;
    useWeekStore.getState().assignRecipe(showPivot.dayIndex, {
      id: recipe.id,
      name: recipe.name ?? null,
      image: recipe.image ?? '',
    });

    // Propagate to todayStore if this is today's slot
    const assignedDate = schedule[showPivot.dayIndex]?.date;
    if (currentWeekOffset === 0 && assignedDate === getTodayString()) {
      useTodayStore.getState().assignRecipe({
        id: recipe.id,
        name: recipe.name ?? null,
        image: recipe.image ?? '',
      });
    }

    setShowQuickFind(false);
    setShowPivot(null);
  };

  const handleSearchPath = () => {
    if (showPivot === null) return;
    router.push(`/recipes?addToDay=${showPivot.dayIndex}&weekOffset=${currentWeekOffset}`);
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
    useWeekStore.getState().removeRecipe(dayIndex, date);
    setSuccessDay(dayIndex);
    setTimeout(() => setSuccessDay(null), 2000);
    setShowPivot(null);
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

  return (
    <div className="flex flex-col min-h-screen pb-20 solar-earth-bg">
      {/* Animated Blobs */}
      <div
        className="blob blob-terracotta -top-20 -left-20 animate-pulse"
        style={{ animationDuration: '8s' }}
      />
      <div
        className="blob blob-sage top-1/2 -right-40 animate-pulse"
        style={{ animationDuration: '10s', animationDelay: '1s' }}
      />
      <div
        className="blob blob-ochre -bottom-20 left-1/4 animate-pulse"
        style={{ animationDuration: '12s', animationDelay: '2s' }}
      />

      {/* Header Section */}
      <header className="sticky top-0 z-30 px-6 pt-6 pb-6 glass-nav">
        <div className="max-w-sm mx-auto w-full">
          {/* Tab Switcher */}
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

          {/* Week Navigator */}
          <div className="flex items-center justify-between">
            <button
              data-testid="prev-week"
              onClick={handlePrevWeek}
              className="p-2 rounded-full hover:bg-charcoal/5 active:scale-90 transition-all"
            >
              <ChevronLeft className="text-charcoal/60" />
            </button>

            <div className="text-center">
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
              <div className="flex items-center justify-center mt-2">
                <div
                  data-testid="planned-count-badge"
                  className="flex items-center space-x-1 text-sage font-bold text-[9px] bg-sage/5 px-2 py-1 rounded-full border border-sage/10 uppercase tracking-widest"
                >
                  <span className="relative flex h-1.5 w-1.5 mr-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sage opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-sage"></span>
                  </span>
                  {tWithVars('planner.plannedCount', `${plannedCount}/7 Planned`, {
                    current: plannedCount,
                  })}
                </div>
                {isVotingOpen && (
                  <div className="flex items-center gap-2 ml-2">
                    <div
                      data-testid="voting-status-badge"
                      className="flex items-center space-x-1 text-ochre font-bold text-[9px] bg-ochre/5 px-2 py-1 rounded-full border border-ochre/10 uppercase tracking-widest"
                    >
                      <span className="relative flex h-1.5 w-1.5 mr-1">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ochre opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-ochre"></span>
                      </span>
                      {t('planner.votingLive', 'Voting live')}
                    </div>
                    <button
                      onClick={handleCloseVoting}
                      data-testid="close-voting-btn"
                      className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-terracotta bg-white shadow-sm px-4 py-1.5 rounded-full border border-terracotta/10 hover:bg-terracotta hover:text-white transition-all active:scale-95 shadow-lg shadow-terracotta/5"
                    >
                      <Ban size={10} />
                      {t('planner.closeVoting', 'Close Voting')}
                    </button>
                  </div>
                )}
              </div>

              {status === 0 && !weekIsPast && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-center mt-4"
                >
                  <Button
                    onClick={handleAskFamily}
                    data-testid="ask-family-cta"
                    className="bg-sage text-white text-[10px] font-bold uppercase tracking-widest h-8 px-6 rounded-full shadow-lg shadow-sage/20 active:scale-95 transition-all"
                  >
                    <Users size={12} className="mr-2" />
                    {t('planner.askFamily', 'Ask the Family')}
                  </Button>
                </motion.div>
              )}
            </div>

            <button
              data-testid="next-week"
              onClick={handleNextWeek}
              className="p-2 rounded-full hover:bg-charcoal/5 active:scale-90 transition-all"
            >
              <ChevronRight className="text-charcoal/60" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 py-8 overflow-x-hidden max-w-sm mx-auto w-full">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <SolarLoader label={t('planner.curatingWeek', 'Curating your week...')} />
            </motion.div>
          ) : activeTab === 'grocery' ? (
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
              <BalanceIndicator summary={balanceSummary} className="mb-6" />

              <Reorder.Group
                axis="y"
                values={schedule}
                onReorder={handleReorder}
                className="w-full space-y-4"
                data-testid="reorder-group"
              >
                {schedule.map((day, index) => (
                  <PlannerDayCard
                    key={day._uiId}
                    day={day}
                    index={index}
                    successDay={successDay}
                    onPivot={() => setShowPivot({ dayIndex: index })}
                    onCookMode={() => {
                      setActiveCookMode(day);
                    }}
                    preDragSnapshotRef={preDragSnapshotRef}
                    draggedUiIdRef={draggedUiIdRef}
                    hasAnimatedIn={hasAnimatedIn}
                  />
                ))}
              </Reorder.Group>

              {/* Relocated from fixed bottom to prevent overlap while remaining thumb-friendly at end of list */}
              {!isFinalized && plannedCount >= 4 && (
                <div className="mt-8 mb-4">
                  <Button
                    variant="primary"
                    fullWidth
                    size="lg"
                    onClick={handleFinalize}
                    data-testid="finalize-button"
                    className="rounded-[2.5rem] h-20 text-xl font-black shadow-2xl shadow-terracotta/30 bg-gradient-to-br from-terracotta to-[#CD5D45] text-white border-none group relative overflow-hidden transition-all active:scale-[0.98]"
                  >
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center justify-center gap-3">
                      <Sparkles size={24} className="animate-pulse" />
                      {t('planner.planNextWeek', 'Plan next week')}
                    </div>
                  </Button>
                </div>
              )}

              {isFinalized && (
                <div className="mt-8 mb-4">
                  <div
                    data-testid="finalized-status"
                    className="w-full h-16 rounded-[2rem] bg-sage text-white font-black text-lg flex items-center justify-center shadow-xl shadow-sage/20 border-2 border-white/20"
                  >
                    {t('planner.menusIn', "Menu's In!")}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
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
              {t('planner.weekFinalized', 'Week finalized')}
            </h4>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mt-1">
              {t('planner.discoveryVotesPurged', 'Discovery votes purged and dates updated.')}
            </p>
          </div>
        </motion.div>
      )}

      <PlanningPivotSheet
        isOpen={showPivot !== null}
        onClose={() => setShowPivot(null)}
        dayIndex={showPivot?.dayIndex ?? 0}
        onQuickFind={() => setShowQuickFind(true)}
        onSearchLibrary={handleSearchPath}
        onAskFamily={handleAskFamily}
        onRemoveRecipe={handleRemoveRecipe}
        isVotingOpen={isVotingOpen}
        hasRecipe={!!(showPivot !== null && schedule[showPivot.dayIndex]?.recipe?.id)}
      />

      <AnimatePresence>
        {showQuickFind && (
          <QuickFindModal
            onClose={() => setShowQuickFind(false)}
            onSelect={handleQuickFindSelect}
            weekOffset={currentWeekOffset}
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
}: {
  day: UILocalScheduleDay;
  index: number;
  successDay: number | null;
  onPivot: () => void;
  onCookMode: () => void;
  preDragSnapshotRef: React.RefObject<UILocalScheduleDay[] | null>;
  draggedUiIdRef: React.RefObject<string | null>;
  hasAnimatedIn: boolean;
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
      <AnimatePresence>
        {successDay === index && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.1, scale: 1.5 }}
            exit={{ opacity: 0 }}
            data-testid="success-ring"
            className="absolute inset-0 bg-sage rounded-full pointer-events-none"
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </AnimatePresence>

      <motion.div
        whileTap={{ scale: 0.98 }}
        className="flex items-center p-4 relative z-10 h-[72px]"
      >
        <div className="flex flex-col items-center justify-center w-12 mr-4">
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
          {day.recipe?.id ? (
            <div className="flex items-center">
              {day.recipe.image && (
                <div className="relative h-12 w-12 rounded-xl overflow-hidden mr-3 bg-charcoal/5 flex-shrink-0">
                  <Image
                    src={getImageUrl(day.recipe.image)}
                    alt={day.recipe.name || 'Recipe'}
                    fill
                    className="object-cover"
                    unoptimized
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
                className="flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
                data-testid="edit-recipe-button"
              >
                <div className="flex flex-col gap-1.5">
                  <h4
                    className="text-sm font-bold text-charcoal line-clamp-1"
                    data-testid="recipe-name"
                  >
                    {day.recipe.name}
                  </h4>
                  {(() => {
                    const count = day._voteCount ?? day.recipe?.voteCount ?? null;
                    const isUnanimous = day._unanimousVote;
                    return (
                      <span
                        data-testid="vote-count"
                        style={{ visibility: count != null ? 'visible' : 'hidden' }}
                        className={cn(
                          'text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap inline-block mt-1',
                          isUnanimous ? 'bg-sage/20 text-sage' : 'bg-ochre/20 text-ochre'
                        )}
                      >
                        {count ?? 0} voted
                      </span>
                    );
                  })()}
                </div>
                <p className="text-[10px] text-charcoal/40 font-medium">Supper planned</p>
              </button>
              {day.date === getTodayString() && day.recipe && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCookMode();
                  }}
                  className="mr-2 text-2xl active:scale-90 transition-transform"
                  data-testid="start-cook-mode"
                >
                  👨‍🍳
                </motion.button>
              )}
              {/* Custom Drag Handle */}
              <div
                onPointerDown={(e) => dragControls.start(e)}
                className="p-3 -mr-3 cursor-grab active:cursor-grabbing touch-none select-none group/handle"
                aria-label="Drag to reorder"
              >
                <GripVertical
                  className="text-charcoal/20 group-hover/handle:text-sage transition-colors"
                  size={20}
                />
              </div>
            </div>
          ) : day.status === 3 ? (
            <div data-testid="ordered-in-indicator" className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-charcoal/5 flex items-center justify-center flex-shrink-0">
                <span className="text-xl">🥡</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold text-charcoal/60">Ordered In</span>
                <span className="text-[10px] text-charcoal/30 font-medium">No cook tonight</span>
              </div>
            </div>
          ) : (
            <button
              onClick={onPivot}
              data-testid="plan-meal-button"
              className="flex items-center w-full text-left group"
            >
              <div className="h-10 w-10 rounded-xl border border-dashed border-terracotta/30 flex items-center justify-center mr-3 group-hover:bg-terracotta/10 group-hover:border-terracotta/50 transition-colors">
                <Plus
                  className="text-terracotta/50 group-hover:text-terracotta transition-colors"
                  size={18}
                />
              </div>
              <span className="text-sm font-bold text-charcoal/30 group-hover:text-terracotta/60 transition-colors">
                Plan a meal
              </span>
            </button>
          )}
        </div>
      </motion.div>
    </Reorder.Item>
  );
});
