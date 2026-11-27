'use client';

import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Ban, Check, Share2, Users } from 'lucide-react';
import { GroceryList } from '@/components/planner/GroceryList';
import type { usePlannerDrag } from '@/components/planner/usePlannerDrag';
import { SolarLoader } from '@/components/ui/SolarLoader';
import type { GroceryExtraDto, GroceryLineItemDto } from '@/lib/api/generated/models';
import { civilDate } from '@/lib/deployment-calendar';
import type { DetailSource } from '@/lib/planner/plannerOverlay';
import { cn } from '@/lib/utils';
import { t } from '@/locales';
import { useWeekStore, type UILocalScheduleDay } from '@/store/weekStore';
import { PlannerDayCard } from './PlannerDayCard';

interface PlannerWeekPanelProps {
  isWide: boolean;
  isLoading: boolean;
  activeTab: 'planner' | 'grocery';
  setActiveTab: (tab: 'planner' | 'grocery') => void;
  currentWeekOffset: number;
  prevOffset: number;
  schedule: UILocalScheduleDay[];
  groceryItems: GroceryLineItemDto[] | undefined;
  groceryExtras: GroceryExtraDto[] | undefined;
  portionsEditing: boolean;
  portionsStrip: ReactNode;
  portionsRows: ReactNode;
  isVotingOpen: boolean;
  canOpenVoting: boolean;
  isConvergedWeek: boolean;
  hasPendingSuggestions: boolean;
  onAskFamily: () => void;
  onNudgeFamily: () => void;
  onCloseVoting: () => void;
  hasPendingResult: boolean;
  successDay: number | null;
  successFading: boolean;
  reviewDay: number | null;
  reviewFading: boolean;
  onOpenPivot: (index: number) => void;
  onOpenDetail: (recipeId: string, source: DetailSource | null) => void;
  dragPreview: ReturnType<typeof usePlannerDrag>['preview'];
  startDrag: ReturnType<typeof usePlannerDrag>['start'];
  authoritativeToday: string | null;
  showSuccess: boolean;
}

export function PlannerWeekPanel({
  isWide,
  isLoading,
  activeTab,
  setActiveTab,
  currentWeekOffset,
  prevOffset,
  schedule,
  groceryItems,
  groceryExtras,
  portionsEditing,
  portionsStrip,
  portionsRows,
  isVotingOpen,
  canOpenVoting,
  isConvergedWeek,
  hasPendingSuggestions,
  onAskFamily,
  onNudgeFamily,
  onCloseVoting,
  hasPendingResult,
  successDay,
  successFading,
  reviewDay,
  reviewFading,
  onOpenPivot,
  onOpenDetail,
  dragPreview,
  startDrag,
  authoritativeToday,
  showSuccess,
}: PlannerWeekPanelProps) {
  return (
    <>
      <main
        className={cn(
          'px-4 sm:px-6 py-2 sm:py-3 overflow-x-hidden w-full transition-all duration-500',
          isWide
            ? 'max-w-[1400px] mx-auto grid grid-cols-[1fr_420px] gap-8 items-start'
            : 'max-w-[27rem] sm:max-w-sm md:max-w-2xl mx-auto'
        )}
      >
        {isLoading && schedule.length === 0 ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <SolarLoader label={t('planner.curatingWeek', 'Curating your week...')} />
          </motion.div>
        ) : activeTab === 'grocery' && !isWide ? (
          <motion.div
            key={`grocery-${currentWeekOffset}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <GroceryList
              weekOffset={currentWeekOffset}
              items={groceryItems ?? []}
              extras={groceryExtras ?? []}
              onClose={() => setActiveTab('planner')}
            />
          </motion.div>
        ) : (
          <motion.div
            key="planner"
            initial={{ opacity: 0, x: currentWeekOffset > prevOffset ? 50 : -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            <div className="flex flex-wrap items-start gap-x-1">
              {portionsStrip}
              {(isVotingOpen || canOpenVoting) && (
                <div
                  data-testid="planner-action-row"
                  className="mb-4 flex grow basis-auto flex-wrap items-center justify-end gap-1.5"
                >
                  {/* Left Slot: Secondary Actions */}
                  <div className="flex max-w-full justify-start" />

                  {/* Right Slot: Primary Actions */}
                  <div className="flex max-w-full flex-wrap items-center justify-end gap-1.5">
                    {canOpenVoting && (
                      <button
                        onClick={onAskFamily}
                        data-testid="ask-family-cta"
                        className="flex min-h-12 min-w-12 max-w-full items-center gap-2 rounded-full bg-garden-fill hover:bg-garden-fill-deep px-4 text-xs font-semibold text-white shadow-sm transition-all active:scale-95"
                      >
                        <Users size={14} />
                        {t('planner.askFamily', 'Ask the Family')}
                      </button>
                    )}
                    {isVotingOpen && !isConvergedWeek && (
                      <button
                        onClick={onNudgeFamily}
                        data-testid="nudge-family-cta"
                        className="flex min-h-12 min-w-12 max-w-full items-center gap-1.5 whitespace-nowrap rounded-full bg-garden-fill hover:bg-garden-fill-deep px-3 text-xs font-semibold text-white shadow-sm transition-all active:scale-95"
                      >
                        <Share2 size={14} />
                        {t('planner.nudge', 'Nudge')}
                      </button>
                    )}
                    {isVotingOpen && (
                      <button
                        onClick={onCloseVoting}
                        data-testid="close-voting-btn"
                        className={cn(
                          'flex min-h-12 min-w-12 max-w-full items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-all active:scale-95',
                          !isConvergedWeek && 'whitespace-nowrap',
                          isConvergedWeek
                            ? 'bg-garden-fill hover:bg-garden-fill-deep text-white py-2 text-center leading-tight'
                            : 'border border-hearth-line bg-white text-hearth-ink hover:bg-hearth-fill-hover active:bg-hearth-fill-active hover:text-white active:text-white'
                        )}
                      >
                        {isConvergedWeek ? <Check size={14} /> : <Ban size={14} />}
                        {isConvergedWeek && hasPendingSuggestions
                          ? t('planner.saveMenuAndCloseVoting', 'Save menu & close voting')
                          : t('planner.closeVoting', 'Close Voting')}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {portionsEditing ? (
              portionsRows
            ) : (
              <div className="w-full space-y-3.5" data-testid="reorder-group">
                {schedule.map((day, index) => (
                  <PlannerDayCard
                    key={day.date ?? index}
                    day={day}
                    index={index}
                    successDay={hasPendingResult ? null : successDay}
                    successFading={successFading}
                    reviewDay={hasPendingResult ? null : reviewDay}
                    reviewFading={reviewFading}
                    onPivot={() => onOpenPivot(index)}
                    onViewRecipe={(recipeId) => {
                      const reference = useWeekStore.getState().calendar?.referenceWeekStartDate;
                      onOpenDetail(
                        recipeId,
                        day.date && reference
                          ? {
                              date: day.date,
                              dayIndex: index,
                              occurrenceId: !day._isPending
                                ? (day.occurrenceId as string)
                                : undefined,
                              context: day._isPending ? 'proposed' : 'assigned',
                              reference,
                              weekOffset: currentWeekOffset,
                            }
                          : null
                      );
                    }}
                    startDrag={startDrag}
                    isDragSource={dragPreview?.from === index}
                    isDropTarget={dragPreview?.target === index && dragPreview.from !== index}
                    isWide={isWide}
                    isToday={civilDate(day.date) !== null && day.date === authoritativeToday}
                    isPast={
                      !!authoritativeToday &&
                      civilDate(day.date) !== null &&
                      day.date! < authoritativeToday
                    }
                  />
                ))}
              </div>
            )}
            {dragPreview &&
              createPortal(
                <div
                  data-testid="planner-drag-preview"
                  aria-hidden="true"
                  className="fixed z-[999] pointer-events-none rounded-2xl border-2 border-sage-700 bg-white p-4 shadow-xl text-ink-body font-bold"
                  style={{ left: dragPreview.x, top: dragPreview.y, width: dragPreview.width }}
                >
                  {dragPreview.snapshot[dragPreview.from].recipe?.name}
                  {dragPreview.target !== null && dragPreview.target !== dragPreview.from && (
                    <span
                      data-testid="planner-drop-feedback"
                      className="block mt-2 text-xs font-bold text-garden-ink"
                    >
                      {dragPreview.snapshot[dragPreview.target].recipe?.id ||
                      dragPreview.snapshot[dragPreview.target].status === 3
                        ? t('planner.swapMeals', 'Swap meals')
                        : t('planner.moveHere', 'Move here')}
                    </span>
                  )}
                </div>,
                document.body
              )}
          </motion.div>
        )}

        {isWide && (
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            className="sticky top-[72px] h-[calc(100vh-285px)] rounded-[2.5rem] overflow-hidden border border-white/20 shadow-2xl glass flex flex-col"
          >
            <GroceryList
              weekOffset={currentWeekOffset}
              items={groceryItems ?? []}
              extras={groceryExtras ?? []}
              isEmbedded
            />
          </motion.div>
        )}
      </main>

      {showSuccess && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-24 left-6 right-6 z-50 bg-garden-fill text-white p-6 rounded-3xl shadow-2xl flex items-center gap-4"
        >
          <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
            <Check size={24} />
          </div>
          <div className="flex flex-col">
            <h4
              data-testid="planner-week-finalized"
              className="font-heading text-lg font-black tracking-tight leading-none"
            >
              {t('planner.weekFinalized', 'Menu saved!')}
            </h4>
            <p className="text-xs font-medium text-cream-100 mt-1">
              {t(
                'planner.discoveryVotesPurged',
                "Votes have been recorded and reset, we're ready for the next family voting session."
              )}
            </p>
          </div>
        </motion.div>
      )}
    </>
  );
}
