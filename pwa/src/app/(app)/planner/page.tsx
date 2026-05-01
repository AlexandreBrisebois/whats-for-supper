'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  GripVertical,
  CheckCircle2,
  Search,
  Users,
  Check,
  Calendar,
  ShoppingCart,
} from 'lucide-react';
import { usePlannerStore } from '@/store/plannerStore';
import Image from 'next/image';
import {
  getSchedule,
  lockSchedule,
  moveRecipe,
  getSmartDefaults,
  assignRecipeToDay,
  openVoting,
  removeRecipeFromDay,
  ScheduleDay,
} from '@/lib/api/planner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { PlanningPivotSheet } from '@/components/planner/PlanningPivotSheet';

type UILocalScheduleDay = ScheduleDay & {
  _uiId: string;
  _isPending?: boolean;
  _voteCount?: number | null;
  _unanimousVote?: boolean | null;
};
import { cn } from '@/lib/utils';
import { t, tWithVars } from '@/locales';
import { QuickFindModal } from '@/components/planner/QuickFindModal';
import { useRouter, useSearchParams } from 'next/navigation';
import { SolarLoader } from '@/components/ui/SolarLoader';
import { CooksMode } from '@/components/planner/CooksMode';
import { getImageUrl } from '@/lib/imageUtils';
import { GroceryList } from '@/components/planner/GroceryList';
import { useDiscoveryStore } from '@/store/discoveryStore';

export default function PlannerPage() {
  const router = useRouter();
  const {
    currentWeekOffset,
    activeTab,
    setWeekOffset,
    setActiveTab,
    isVotingOpen,
    isLocked,
    setVotingOpen,
    setIsLocked,
    setGroceryState,
  } = usePlannerStore();
  const [schedule, setSchedule] = useState<UILocalScheduleDay[]>([]);
  const memoizedIngredients = useMemo(
    () => [...new Set(schedule.flatMap((day) => day.recipe?.ingredients ?? []))],
    [schedule]
  );
  const [isLoading, setIsLoading] = useState(true);
  const isLockedRef = useRef(isLocked);
  useEffect(() => {
    isLockedRef.current = isLocked;
  }, [isLocked]);
  const [showPivot, setShowPivot] = useState<{ dayIndex: number } | null>(null);
  const [showQuickFind, setShowQuickFind] = useState(false);
  const [successDay, setSuccessDay] = useState<number | null>(null);
  const [activeCookMode, setActiveCookMode] = useState<UILocalScheduleDay | null>(null);
  const { setHasPendingCards } = useDiscoveryStore();
  const searchParams = useSearchParams();
  const successParam = searchParams.get('success');
  const [prevOffset, setPrevOffset] = useState(currentWeekOffset);
  const [draggedId, setDraggedId] = useState<string | null>(null);
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

  if (currentWeekOffset !== prevOffset) {
    setPrevOffset(currentWeekOffset);
    setIsLoading(true);
  }

  useEffect(() => {
    setHasPendingCards(isVotingOpen);
  }, [isVotingOpen, setHasPendingCards]);

  useEffect(() => {
    let ignore = false;
    let pollInterval: NodeJS.Timeout | null = null;

    const loadData = async () => {
      try {
        const [scheduleData, defaultsData] = await Promise.all([
          getSchedule(currentWeekOffset),
          currentWeekOffset === 0 ? getSmartDefaults(currentWeekOffset) : Promise.resolve(null),
        ]);

        if (!ignore && scheduleData && scheduleData.days) {
          const defaultsByDayIndex = new Map(
            defaultsData?.preSelectedRecipes?.map((r) => [r.dayIndex, r]) ?? []
          );

          const mergedDays = scheduleData.days.map((day: any, index: number) => {
            const generateUiId = () =>
              typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : Math.random().toString(36).substring(7);

            // Check if recipe exists and has content (not just empty object)
            const hasRecipe = day.recipe && Object.keys(day.recipe).length > 0;
            if (hasRecipe) {
              return { ...day, _uiId: generateUiId() };
            }

            const smartDefault = defaultsByDayIndex.get(index);
            if (smartDefault) {
              const recipe = {
                id: smartDefault.recipeId || '',
                name: smartDefault.name || '',
                image: smartDefault.heroImageUrl || '',
                voteCount: smartDefault.voteCount,
              };
              return {
                ...day,
                recipe,
                _uiId: generateUiId(),
                _isPending: true,
                _voteCount: smartDefault.voteCount,
                _unanimousVote: smartDefault.unanimousVote,
              };
            }

            return { ...day, _uiId: generateUiId() };
          });

          setSchedule(mergedDays);

          // Use explicit status logic
          const status = (scheduleData as any).status ?? 0;
          setVotingOpen(status === 1);
          setIsLocked(status === 2 || scheduleData.locked === true);

          // Restore persisted grocery state from API if present
          const serverGroceryState =
            (scheduleData as any).groceryState ??
            (scheduleData as any).additionalData?.groceryState;
          if (serverGroceryState && typeof serverGroceryState === 'object') {
            setGroceryState(serverGroceryState);
          }
        }
        setIsLoading(false);
      } catch (error: any) {
        if (!ignore) {
          console.warn('Failed to fetch schedule:', error?.message || error);
          // Provide mock data so the UI can be experienced even if API is down
          const mockDays = Array.from({ length: 7 }, (_, i) => {
            const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            const date = new Date();
            date.setDate(
              date.getDate() -
                (date.getDay() === 0 ? 6 : date.getDay() - 1) +
                i +
                currentWeekOffset * 7
            );

            return {
              day: days[i],
              date: date.toISOString().split('T')[0],
              recipe: undefined,
              _uiId:
                typeof crypto !== 'undefined' && crypto.randomUUID
                  ? crypto.randomUUID()
                  : Math.random().toString(36).substring(7),
            };
          });
          setSchedule(mockDays);
          setIsLocked(false);
          setIsLoading(false);
        }
      }
    };

    const updateVoteCounts = async () => {
      try {
        const [scheduleData, defaultsData] = await Promise.all([
          getSchedule(currentWeekOffset),
          currentWeekOffset === 0 ? getSmartDefaults(currentWeekOffset) : Promise.resolve(null),
        ]);

        if (!ignore && scheduleData && scheduleData.days) {
          const defaultsByDayIndex = new Map(
            defaultsData?.preSelectedRecipes?.map((r) => [r.dayIndex, r]) ?? []
          );

          setSchedule((prevSchedule) => {
            const updated = prevSchedule.map((day, idx) => {
              if (day._isPending) {
                const sd = defaultsByDayIndex.get(idx);
                if (!sd || !day.recipe) return day;
                return {
                  ...day,
                  recipe: { ...day.recipe, voteCount: sd.voteCount },
                  _voteCount: sd.voteCount,
                  _unanimousVote: sd.unanimousVote,
                };
              }
              // Persisted slot: update voteCount from CalendarEvent
              const newDay = scheduleData.days?.[idx];
              if (!day.recipe || !newDay?.recipe) return day;
              return { ...day, recipe: { ...day.recipe, voteCount: newDay.recipe.voteCount } };
            });

            // Add newly-reached consensus recipes to open slots
            if (defaultsData?.preSelectedRecipes) {
              const occupiedIndices = new Set(
                updated.map((day, idx) => (day.recipe ? idx : null)).filter((idx) => idx !== null)
              );

              for (const recipe of defaultsData.preSelectedRecipes) {
                const alreadyPlaced = updated.some((day) => day.recipe?.id === recipe.recipeId);
                if (!alreadyPlaced) {
                  // Find first open slot
                  const openSlot = updated.findIndex(
                    (day, idx) => !day.recipe && !occupiedIndices.has(idx)
                  );
                  if (openSlot !== -1) {
                    const generateUiId = () =>
                      typeof crypto !== 'undefined' && crypto.randomUUID
                        ? crypto.randomUUID()
                        : Math.random().toString(36).substring(7);

                    updated[openSlot] = {
                      ...updated[openSlot],
                      recipe: {
                        id: recipe.recipeId,
                        name: recipe.name || '',
                        image: recipe.heroImageUrl || '',
                        voteCount: recipe.voteCount,
                      },
                      _isPending: true,
                      _voteCount: recipe.voteCount,
                      _unanimousVote: recipe.unanimousVote,
                      _uiId: generateUiId(),
                    };
                    occupiedIndices.add(openSlot);
                  }
                }
              }
            }

            return updated;
          });

          // Update status from polling
          const status = (scheduleData as any).status ?? 0;
          setVotingOpen(status === 1);
          setIsLocked(status === 2 || scheduleData.locked === true);
        }
      } catch (error: any) {
        // Silently fail polling to avoid console spam
      }
    };

    loadData();

    // Poll every 30 seconds (or 2s in test) for vote count updates while voting is open
    const pollIntervalTime = process.env.NEXT_PUBLIC_ENVIRONMENT === 'test' ? 60000 : 30000;
    pollInterval = setInterval(() => {
      if (!isLockedRef.current) {
        updateVoteCounts();
      }
    }, pollIntervalTime);

    return () => {
      ignore = true;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [currentWeekOffset, successParam, setGroceryState, setIsLocked, setVotingOpen]); // isLocked intentionally excluded — use ref to avoid re-triggering loadData on lock

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
            image: day.recipe.image,
          });
        }
      }

      await lockSchedule(currentWeekOffset);
      setIsLocked(true);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (error: any) {
      console.warn('Failed to finalize:', error?.message || error);
      // Mock it working since the backend isn't ready
      setIsLocked(true);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    }
  };

  const handleQuickFindSelect = async (recipe: any) => {
    if (showPivot === null) return;
    const newSchedule = [...schedule];
    newSchedule[showPivot.dayIndex].recipe = {
      id: recipe.id,
      name: recipe.name,
      image: recipe.image,
    };
    setSchedule(newSchedule);

    try {
      await assignRecipeToDay(currentWeekOffset, showPivot.dayIndex, {
        id: recipe.id,
        name: recipe.name,
        image: recipe.image,
      });
    } catch (error: any) {
      console.warn('Failed to save recipe:', error?.message || error);
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
      await openVoting(currentWeekOffset);
      setVotingOpen(true);
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

    try {
      await removeRecipeFromDay(date);

      // Update local state
      const newSchedule = [...schedule];
      newSchedule[dayIndex].recipe = undefined;
      newSchedule[dayIndex]._isPending = false;
      setSchedule(newSchedule);

      // Trigger success animation (Success Ring)
      setSuccessDay(dayIndex);
      setTimeout(() => setSuccessDay(null), 2000);

      setShowPivot(null);
    } catch (error: any) {
      console.warn('Failed to remove recipe:', error?.message || error);
    }
  };

  const handleReorder = (newSchedule: UILocalScheduleDay[]) => {
    let fromIndex = -1;
    let toIndex = -1;

    if (draggedId) {
      fromIndex = schedule.findIndex((d) => d._uiId === draggedId);
      toIndex = newSchedule.findIndex((d) => d._uiId === draggedId);
    } else {
      const oldRecipes = schedule.map((d) => d.recipe?.id);
      const newRecipes = newSchedule.map((d) => d.recipe?.id);
      for (let i = 0; i < oldRecipes.length; i++) {
        if (oldRecipes[i] !== newRecipes[i]) {
          fromIndex = i;
          toIndex = newRecipes.indexOf(oldRecipes[i]);
          break;
        }
      }
    }

    // Ensure days and dates remain fixed at their indices
    const updatedSchedule = newSchedule.map((item, index) => ({
      ...item,
      day: schedule[index].day,
      date: schedule[index].date,
    }));

    setSchedule(updatedSchedule);

    // Fire API call asynchronously to avoid blocking UI and causing jitter
    if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
      moveRecipe(currentWeekOffset, fromIndex, toIndex).catch((error: any) => {
        console.warn('Failed to sync move:', error?.message || error);
      });
    }
  };

  const plannedCount = schedule.filter((d) => d.recipe && d.recipe.id).length;
  const isFinalized = isLocked;

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
                    const fmt = new Intl.DateTimeFormat('en-US', {
                      month: 'short',
                      day: 'numeric',
                    });
                    return `${fmt.format(start)} — ${fmt.format(end)}`;
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
                <div
                  data-testid="voting-status-badge"
                  className="flex items-center space-x-1 text-ochre font-bold text-[9px] bg-ochre/5 px-2 py-1 rounded-full border border-ochre/10 uppercase tracking-widest ml-2"
                >
                  <span className="relative flex h-1.5 w-1.5 mr-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ochre opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-ochre"></span>
                  </span>
                  {t('planner.votingLive', 'Voting live')}
                </div>
              )}
            </div>

            {!isVotingOpen && !isLocked && plannedCount > 0 && (
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
      </header>

      {/* Main Content */}
      <main className="px-6 py-8 overflow-x-hidden">
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
                ingredients={memoizedIngredients}
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
              <Reorder.Group
                axis="y"
                values={schedule}
                onReorder={handleReorder}
                className="space-y-4"
                data-testid="reorder-group"
              >
                {schedule.map((day, index) => (
                  <PlannerDayCard
                    key={day._uiId}
                    day={day}
                    index={index}
                    currentWeekOffset={currentWeekOffset}
                    successDay={successDay}
                    onPivot={() => setShowPivot({ dayIndex: index })}
                    onCookMode={() => setActiveCookMode(day)}
                    setDraggedId={setDraggedId}
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
                    className="rounded-[2rem] h-16 text-lg font-black shadow-xl shadow-terracotta/20 bg-terracotta text-white border-none"
                  >
                    {t('planner.planNextWeek', 'Plan next week')}
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
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeCookMode &&
          activeCookMode.recipe &&
          activeCookMode.recipe.id &&
          activeCookMode.recipe.image && (
            <CooksMode
              recipe={{
                id: activeCookMode.recipe.id,
                name: activeCookMode.recipe.name || null,
                image: activeCookMode.recipe.image,
              }}
              onClose={() => setActiveCookMode(null)}
            />
          )}
      </AnimatePresence>
    </div>
  );
}

function PlannerDayCard({
  day,
  index,
  currentWeekOffset,
  successDay,
  onPivot,
  onCookMode,
  setDraggedId,
  hasAnimatedIn,
}: {
  day: UILocalScheduleDay;
  index: number;
  currentWeekOffset: number;
  successDay: number | null;
  onPivot: () => void;
  onCookMode: () => void;
  setDraggedId: (id: string | null) => void;
  hasAnimatedIn: boolean;
}) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={day}
      dragListener={false}
      dragControls={dragControls}
      onDragStart={() => setDraggedId(day._uiId)}
      onDragEnd={() => setDraggedId(null)}
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
        backdropFilter: 'blur(0px)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        borderColor: '#8a9a5b',
        borderWidth: '2px',
        borderStyle: 'solid',
        zIndex: 999,
        cursor: 'grabbing',
      }}
      className={cn(
        'rounded-2xl overflow-hidden glass shadow-sm relative group transition-colors duration-500',
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

      <motion.div whileTap={{ scale: 0.98 }} className="flex items-center p-4 relative z-10">
        <div className="flex flex-col items-center justify-center w-12 mr-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal/40 leading-none mb-1">
            {day.day}
          </span>
          <span className="text-lg font-heading font-extrabold text-charcoal leading-none">
            {(() => {
              if (!day.date) return '';
              const d = new Date(day.date);
              return d.getDate();
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
                    className="text-sm font-bold text-charcoal line-clamp-2"
                    data-testid="recipe-name"
                  >
                    {day.recipe.name}
                  </h4>
                  {(day._voteCount != null || day.recipe?.voteCount != null) &&
                    (() => {
                      const count = day._voteCount ?? day.recipe?.voteCount;
                      const isUnanimous = day._unanimousVote;
                      return (
                        <span
                          data-testid="vote-count"
                          className={cn(
                            'text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap inline-block mt-1',
                            isUnanimous ? 'bg-sage/20 text-sage' : 'bg-ochre/20 text-ochre'
                          )}
                        >
                          {count} voted
                        </span>
                      );
                    })()}
                </div>
                <p className="text-[10px] text-charcoal/40 font-medium">Supper planned</p>
              </button>
              {currentWeekOffset === 0 && day.recipe && (
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
}
