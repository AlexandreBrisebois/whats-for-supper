'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  GripVertical,
  CheckCircle2,
  Search,
  Sparkles,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import { usePlannerStore } from '@/store/plannerStore';
import { getSchedule, lockSchedule, moveRecipe, ScheduleDay } from '@/lib/api/planner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { QuickFindModal } from '@/components/planner/QuickFindModal';
import { useRouter, useSearchParams } from 'next/navigation';
import { SolarLoader } from '@/components/ui/SolarLoader';
import { CooksMode } from '@/components/planner/CooksMode';

export default function PlannerPage() {
  const router = useRouter();
  const { currentWeekOffset, activeTab, setWeekOffset, setActiveTab } = usePlannerStore();
  const [schedule, setSchedule] = useState<ScheduleDay[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showPivot, setShowPivot] = useState<{ dayIndex: number } | null>(null);
  const [showQuickFind, setShowQuickFind] = useState(false);
  const [successDay, setSuccessDay] = useState<number | null>(null);
  const [activeCookMode, setActiveCookMode] = useState<ScheduleDay | null>(null);
  const searchParams = useSearchParams();
  const [prevOffset, setPrevOffset] = useState(currentWeekOffset);

  if (currentWeekOffset !== prevOffset) {
    setPrevOffset(currentWeekOffset);
    setIsLoading(true);
  }

  useEffect(() => {
    let ignore = false;

    const loadData = async () => {
      try {
        const data = await getSchedule(currentWeekOffset);
        if (!ignore) {
          setSchedule(data.days);
          setIsLocked(data.locked);
          setIsLoading(false);
        }
      } catch (error) {
        if (!ignore) console.error('Failed to fetch schedule:', error);
      }
    };

    loadData();
    return () => {
      ignore = true;
    };
  }, [currentWeekOffset]);

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
      await lockSchedule(currentWeekOffset);
      setIsLocked(true);
    } catch (error) {
      console.error('Failed to finalize:', error);
    }
  };

  const handleQuickFindSelect = (recipe: any) => {
    if (showPivot === null) return;
    const newSchedule = [...schedule];
    newSchedule[showPivot.dayIndex].recipe = {
      id: recipe.id,
      name: recipe.name,
      image: recipe.image,
    };
    setSchedule(newSchedule);
    setShowQuickFind(false);
    setShowPivot(null);
  };

  const handleSearchPath = () => {
    if (showPivot === null) return;
    router.push(`/recipes?addToDay=${showPivot.dayIndex}&weekOffset=${currentWeekOffset}`);
  };

  const handleAskFamily = () => {
    alert('Week opened for family voting!');
    setShowPivot(null);
  };

  const handleReorder = async (newSchedule: ScheduleDay[]) => {
    // Find the change
    const oldRecipes = schedule.map((d) => d.recipe?.id);
    const newRecipes = newSchedule.map((d) => d.recipe?.id);

    let fromIndex = -1;
    let toIndex = -1;

    for (let i = 0; i < oldRecipes.length; i++) {
      if (oldRecipes[i] !== newRecipes[i]) {
        fromIndex = i;
        toIndex = newRecipes.indexOf(oldRecipes[i]);
        break;
      }
    }

    if (fromIndex !== -1 && toIndex !== -1) {
      try {
        await moveRecipe(currentWeekOffset, fromIndex, toIndex);
      } catch (error) {
        console.error('Failed to sync move:', error);
      }
    }

    // Ensure days and dates remain fixed at their indices
    const updatedSchedule = newSchedule.map((item, index) => ({
      ...item,
      day: schedule[index].day,
      date: schedule[index].date,
    }));

    setSchedule(updatedSchedule);
  };

  const plannedCount = schedule.filter((d) => d.recipe).length;

  return (
    <div className="flex flex-col min-h-screen pb-32 solar-earth-bg">
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
        <div className="flex p-1 mb-8 bg-charcoal/5 rounded-2xl border border-charcoal/5">
          <button
            role="tab"
            aria-selected={activeTab === 'planner'}
            onClick={() => setActiveTab('planner')}
            className={cn(
              'flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300',
              activeTab === 'planner'
                ? 'bg-white text-charcoal shadow-sm ring-1 ring-charcoal/5'
                : 'text-charcoal/40 hover:text-charcoal/60'
            )}
          >
            Planner
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'grocery'}
            onClick={() => setActiveTab('grocery')}
            className={cn(
              'flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300',
              activeTab === 'grocery'
                ? 'bg-white text-charcoal shadow-sm ring-1 ring-charcoal/5'
                : 'text-charcoal/40 hover:text-charcoal/60'
            )}
          >
            Grocery list
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

          <div className="text-center" data-testid="week-range">
            <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-charcoal/40 mb-1">
              {currentWeekOffset === 0
                ? 'This week'
                : currentWeekOffset === 1
                  ? 'Next week'
                  : `Week ${currentWeekOffset}`}
            </span>
            <h2 className="text-lg font-heading font-bold text-charcoal">
              {schedule.length > 0 ? `${schedule[0].date} — ${schedule[6].date}` : 'Loading...'}
            </h2>
            <div className="flex items-center justify-center mt-2">
              <div className="flex items-center space-x-1 text-sage font-bold text-[9px] bg-sage/5 px-2 py-1 rounded-full border border-sage/10 uppercase tracking-widest">
                <span className="relative flex h-1.5 w-1.5 mr-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sage opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-sage"></span>
                </span>
                {plannedCount}/7 Planned
              </div>
            </div>
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
              <SolarLoader label="Curating your week..." />
            </motion.div>
          ) : activeTab === 'grocery' ? (
            <motion.div
              key="grocery"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="mb-6 p-8 rounded-[2.5rem] bg-ochre/5 border border-ochre/10 text-ochre">
                <Sparkles size={48} className="opacity-80" />
              </div>
              <h3 className="text-xl font-heading font-bold text-charcoal mb-2">
                Grocery Intelligence
              </h3>
              <p className="max-w-xs text-sm text-charcoal/40 leading-relaxed">
                Coming soon. We&apos;ll automatically organize your list by aisle and availability.
              </p>
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
              >
                {schedule.map((day, index) => (
                  <Reorder.Item
                    key={day.date}
                    value={day}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: index * 0.05,
                      type: 'spring',
                      damping: 15,
                      stiffness: 100,
                    }}
                    data-testid={`day-card-${index}`}
                    id={`day-card-${index}`}
                  >
                    <Card
                      className={cn(
                        'overflow-hidden glass border-white/20 shadow-sm relative group transition-all duration-500',
                        day.recipe ? 'cursor-grab active:cursor-grabbing' : '',
                        successDay === index
                          ? 'ring-4 ring-sage ring-offset-4 ring-offset-transparent'
                          : ''
                      )}
                    >
                      {/* Success Pulse Background */}
                      <AnimatePresence>
                        {successDay === index && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 0.1, scale: 1.5 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-sage rounded-full pointer-events-none"
                            transition={{ duration: 1, repeat: Infinity }}
                          />
                        )}
                      </AnimatePresence>

                      <motion.div
                        whileTap={{ scale: 0.98 }}
                        whileDrag={{ scale: 1.05, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                        className="flex items-center p-4 relative z-10"
                      >
                        <div className="flex flex-col items-center justify-center w-12 mr-4">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal/40 leading-none mb-1">
                            {day.day}
                          </span>
                          <span className="text-lg font-heading font-extrabold text-charcoal leading-none">
                            {day.date.split('-').pop()}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          {day.recipe ? (
                            <div className="flex items-center">
                              <div className="relative h-12 w-12 rounded-xl overflow-hidden mr-3 bg-charcoal/5">
                                <Image
                                  src={day.recipe.image}
                                  alt={day.recipe.name}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold text-charcoal truncate">
                                  {day.recipe.name}
                                </h4>
                                <p className="text-[10px] text-charcoal/40 font-medium">
                                  Supper planned
                                </p>
                              </div>
                              {currentWeekOffset === 0 && index === 3 && (
                                <motion.button
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveCookMode(day);
                                  }}
                                  className="mr-2 bg-sage text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-sage/20 flex items-center space-x-2"
                                >
                                  <UtensilsCrossed size={12} />
                                  <span>Start cooking</span>
                                </motion.button>
                              )}
                              <GripVertical className="text-charcoal/20 ml-2" size={18} />
                            </div>
                          ) : (
                            <button
                              onClick={() => setShowPivot({ dayIndex: index })}
                              className="flex items-center w-full text-left group"
                            >
                              <motion.div
                                animate={{
                                  borderColor: [
                                    'rgba(205, 93, 69, 0.2)',
                                    'rgba(205, 93, 69, 0.5)',
                                    'rgba(205, 93, 69, 0.2)',
                                  ],
                                  backgroundColor: [
                                    'rgba(205, 93, 69, 0.05)',
                                    'rgba(205, 93, 69, 0.1)',
                                    'rgba(205, 93, 69, 0.05)',
                                  ],
                                }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="h-10 w-10 rounded-xl border border-dashed flex items-center justify-center mr-3 group-hover:bg-terracotta/10 transition-colors"
                              >
                                <Plus className="text-terracotta" size={18} />
                              </motion.div>
                              <span className="text-sm font-bold text-terracotta/60">
                                Plan a meal
                              </span>
                            </button>
                          )}
                        </div>
                      </motion.div>
                    </Card>
                  </Reorder.Item>
                ))}
              </Reorder.Group>

              {/* Finalize Button */}
              <div className="mt-12 mb-8">
                {isLocked ? (
                  <div className="flex flex-col items-center py-6 bg-sage/5 rounded-3xl border border-sage/10 text-center">
                    <CheckCircle2 size={32} className="text-sage mb-3" />
                    <h3 className="text-lg font-heading font-bold text-charcoal">Week finalized</h3>
                    <p className="text-xs text-charcoal/40 font-medium mb-6">
                      Discovery votes purged and dates updated.
                    </p>
                    <Button
                      className="border-sage/20 text-sage hover:bg-sage/5"
                      onClick={() => setWeekOffset(currentWeekOffset + 1)}
                    >
                      Plan next week
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="w-full h-16 rounded-3xl bg-charcoal text-white font-bold text-lg shadow-xl shadow-charcoal/20 active:scale-[0.98] transition-all"
                    onClick={handleFinalize}
                  >
                    Declare complete
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Planning Pivot Sheet */}
      <AnimatePresence>
        {showPivot !== null && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPivot(null)}
              className="fixed inset-0 bg-charcoal/20 backdrop-blur-sm z-40"
            />
            <motion.div
              data-testid="pivot-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-50 glass rounded-t-[2.5rem] border-t border-white/40 px-6 pt-8 pb-12 shadow-2xl"
            >
              <div className="w-12 h-1.5 bg-charcoal/10 rounded-full mx-auto mb-8" />

              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-heading font-extrabold text-charcoal">
                  Choose your path
                </h3>
                <div className="p-2 rounded-full bg-terracotta/5 text-terracotta font-bold text-[10px] uppercase tracking-wider">
                  Day {showPivot.dayIndex + 1}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <button
                  onClick={() => setShowQuickFind(true)}
                  className="flex items-center p-5 rounded-3xl bg-white border border-charcoal/5 shadow-sm active:scale-95 transition-all text-left"
                >
                  <div className="h-12 w-12 rounded-2xl bg-ochre/10 text-ochre flex items-center justify-center mr-4">
                    <Sparkles size={24} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-charcoal">Quick find</h4>
                    <p className="text-[11px] text-charcoal/40 font-medium">
                      Swipe through 5 tailored picks
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-charcoal/20" />
                </button>

                <button
                  onClick={handleSearchPath}
                  className="flex items-center p-5 rounded-3xl bg-white border border-charcoal/5 shadow-sm active:scale-95 transition-all text-left"
                >
                  <div className="h-12 w-12 rounded-2xl bg-terracotta/10 text-terracotta flex items-center justify-center mr-4">
                    <Search size={24} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-charcoal">Search library</h4>
                    <p className="text-[11px] text-charcoal/40 font-medium">
                      Browse your collection
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-charcoal/20" />
                </button>

                <button
                  onClick={handleAskFamily}
                  className="flex items-center p-5 rounded-3xl bg-white border border-charcoal/5 shadow-sm active:scale-95 transition-all text-left"
                >
                  <div className="h-12 w-12 rounded-2xl bg-sage/10 text-sage flex items-center justify-center mr-4">
                    <Users size={24} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-charcoal">Ask the family</h4>
                    <p className="text-[11px] text-charcoal/40 font-medium">Open for voting</p>
                  </div>
                  <ChevronRight size={18} className="text-charcoal/20" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showQuickFind && (
          <QuickFindModal
            onClose={() => setShowQuickFind(false)}
            onSelect={handleQuickFindSelect}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeCookMode && activeCookMode.recipe && (
          <CooksMode recipe={activeCookMode.recipe} onClose={() => setActiveCookMode(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
