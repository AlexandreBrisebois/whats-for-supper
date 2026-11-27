'use client';

import { memo, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLocale, t } from '@/locales';
import { usePlannerStore } from '@/store/plannerStore';
import { useWeekStore, type UILocalScheduleDay } from '@/store/weekStore';
import { PlannerDayMealBody } from './PlannerDayMealBody';

interface PlannerDayCardProps {
  day: UILocalScheduleDay;
  index: number;
  successDay: number | null;
  successFading: boolean;
  reviewDay: number | null;
  reviewFading: boolean;
  onPivot: () => void;
  onViewRecipe: (recipeId: string) => void;
  startDrag: (from: number, event: PointerEvent) => void;
  isDragSource: boolean;
  isDropTarget: boolean;
  isWide: boolean;
  isToday: boolean;
  isPast: boolean;
}

export const PlannerDayCard = memo(function PlannerDayCard({
  day,
  index,
  successDay,
  successFading,
  reviewDay,
  reviewFading,
  onPivot,
  onViewRecipe,
  startDrag,
  isDragSource,
  isDropTarget,
  isWide,
  isToday,
  isPast,
}: PlannerDayCardProps) {
  const focusFrame = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
    },
    []
  );
  const startRecipeDrag = useCallback(
    (event: PointerEvent) => startDrag(index, event),
    [startDrag, index]
  );
  const moveBySlot = useCallback(
    (direction: -1 | 1) => {
      if (usePlannerStore.getState().isDragActive) return;
      const snapshot = useWeekStore.getState().schedule;
      const from = snapshot.findIndex((item) => item._uiId === day._uiId);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= snapshot.length || !snapshot[from].recipe?.id) return;
      const focusOwner = document.activeElement;
      useWeekStore.getState().reorderLocally(from, to, snapshot);
      useWeekStore.getState().commitMove(from, to, snapshot);
      if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
      focusFrame.current = requestAnimationFrame(() => {
        focusFrame.current = null;
        // A removed source handle leaves focus on body. Otherwise a newer focus
        // choice belongs to the user and must not be overridden by this move.
        if (
          document.activeElement !== focusOwner &&
          (focusOwner?.isConnected || document.activeElement !== document.body)
        )
          return;
        document
          .querySelector<HTMLElement>(
            `[data-testid="day-card-${to}"] [data-testid="planner-drag-handle"]`
          )
          ?.focus();
      });
    },
    [day._uiId]
  );

  return (
    <div
      className="w-full"
      data-temporal={isToday ? 'today' : isPast ? 'past' : 'neutral'}
      data-testid={`day-card-${index}`}
      data-date={day.date}
      data-drag-source={isDragSource}
      data-drop-target={isDropTarget}
      data-review-highlight={reviewDay === index && successDay !== index ? 'true' : undefined}
      id={`day-card-${index}`}
      tabIndex={-1}
    >
      {isToday && (
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <p
            data-testid="planner-today-label"
            className="min-w-0 max-w-full text-sm leading-5 font-semibold text-hearth-ink break-words"
          >
            {t('planner.today', 'Today')}
          </p>
          <span
            data-testid="planner-today-separator"
            aria-hidden="true"
            className="h-px min-w-4 flex-1 bg-terracotta/15"
          />
        </div>
      )}
      <div className="flex items-stretch gap-2 w-full">
        <div
          data-testid="planner-date"
          aria-current={isToday ? 'date' : undefined}
          data-drop-target={isDropTarget}
          className={cn(
            'relative flex flex-col items-center justify-center w-10 shrink-0 rounded-xl',
            isDropTarget && 'bg-sage/20 outline outline-2 outline-sage-700'
          )}
        >
          {isDropTarget && (
            <ChevronRight
              data-testid="planner-drop-arrow"
              aria-hidden="true"
              size={8}
              strokeWidth={3}
              className="absolute -right-2 top-1/2 -translate-y-1/2 text-garden-ink"
            />
          )}
          <div
            data-testid="planner-date-marker"
            className="w-full flex flex-col items-center justify-center rounded-xl py-2"
          >
            <span className="max-w-full break-all text-center text-xs font-semibold tracking-normal text-ink-muted leading-none mb-1">
              {day.date
                ? new Intl.DateTimeFormat(getLocale() === 'fr' ? 'fr-CA' : 'en-CA', {
                    weekday: 'short',
                    timeZone: 'UTC',
                  }).format(new Date(day.date))
                : day.day}
            </span>
            <span className="max-w-full break-all text-center text-lg font-heading font-extrabold text-ink-body leading-none">
              {(() => {
                if (!day.date) return '';
                const d = new Date(day.date);
                return d.getUTCDate();
              })()}
            </span>
            <span className="max-w-full break-all text-center text-xs font-semibold tracking-normal text-ink-muted leading-none mt-1">
              {(() => {
                if (!day.date) return '';
                const d = new Date(day.date);
                return d.toLocaleDateString(getLocale() === 'fr' ? 'fr-CA' : 'en-CA', {
                  month: 'short',
                  timeZone: 'UTC',
                });
              })()}
            </span>
          </div>
        </div>
        <div
          className={cn(
            'flex-1 min-w-0 rounded-2xl relative group border',
            isPast ? 'bg-cream shadow-none' : 'glass shadow-sm',
            isDragSource
              ? 'outline outline-1 outline-dashed outline-ink-body/70'
              : 'border-white/20',
            isDropTarget && 'outline outline-2 outline-sage-700',
            successDay === index &&
              cn(
                'ring-4 ring-offset-4 transition-shadow duration-500 motion-reduce:transition-none',
                successFading ? 'ring-transparent ring-offset-transparent' : 'ring-sage'
              ),
            reviewDay === index &&
              successDay !== index &&
              cn(
                'ring-4 ring-offset-4 transition-shadow duration-500 motion-reduce:transition-none',
                reviewFading ? 'ring-transparent ring-offset-transparent' : 'ring-hearth-line'
              )
          )}
          data-testid="planner-meal"
        >
          {isDragSource && (
            <span className="absolute -top-2.5 left-2 z-20 rounded-full bg-cream px-2 text-xs font-bold text-ink-body">
              {t('planner.moveSource', 'Moving from this day')}
            </span>
          )}
          <motion.div
            whileTap={{ scale: 0.98 }}
            className={cn(
              'flex items-stretch px-4 relative z-10 max-[360px]:flex-col max-[360px]:gap-2',
              isWide ? 'py-2 min-h-[64px]' : 'py-2.5 min-h-[72px]'
            )}
          >
            <PlannerDayMealBody
              day={day}
              isWide={isWide}
              isPast={isPast}
              isDragSource={isDragSource}
              onPivot={onPivot}
              onViewRecipe={onViewRecipe}
              startRecipeDrag={startRecipeDrag}
              moveBySlot={moveBySlot}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
});
