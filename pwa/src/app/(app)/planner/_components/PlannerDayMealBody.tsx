'use client';

import { motion } from 'framer-motion';
import { ArrowRightLeft, Plus } from 'lucide-react';
import { NonCookingIcon } from '@/components/planner/NonCookingIcon';
import { PlannerDragHandle } from '@/components/planner/PlannerDragHandle';
import { PreparationStatus } from '@/components/planner/PreparationStatus';
import { getImageUrl } from '@/lib/imageUtils';
import { nonCookingLabel, nonCookingNote } from '@/lib/planner/nonCooking';
import { cn } from '@/lib/utils';
import { t, tWithVars } from '@/locales';
import type { UILocalScheduleDay } from '@/store/weekStore';

interface PlannerDayMealBodyProps {
  day: UILocalScheduleDay;
  isWide: boolean;
  isPast: boolean;
  isDragSource: boolean;
  onPivot: () => void;
  onViewRecipe: (recipeId: string) => void;
  startRecipeDrag: (event: PointerEvent) => void;
  moveBySlot: (direction: -1 | 1) => void;
}

export function PlannerDayMealBody({
  day,
  isWide,
  isPast,
  isDragSource,
  onPivot,
  onViewRecipe,
  startRecipeDrag,
  moveBySlot,
}: PlannerDayMealBodyProps) {
  return (
    <>
      <div className="flex-1 min-w-0">
        {day.status === 3 ? (
          <button
            onClick={onPivot}
            data-testid="ordered-in-indicator"
            className={cn(
              'flex items-center gap-3 w-full text-left',
              isPast ? 'hover:bg-sage/10 transition-colors' : 'hover:opacity-80 transition-opacity'
            )}
          >
            <div className="h-10 w-10 rounded-xl bg-sage/10 text-garden-ink flex items-center justify-center flex-shrink-0">
              <NonCookingIcon kind={day.nonCooking?.kind} />
            </div>
            <div className="min-w-0 flex flex-col gap-0.5">
              <span
                data-testid="non-cooking-indicator"
                title={nonCookingLabel(day.nonCooking)}
                className={cn(
                  'line-clamp-2 text-sm font-bold',
                  isPast ? 'text-ink-muted' : 'text-ink-muted'
                )}
              >
                {nonCookingLabel(day.nonCooking)}
              </span>
              {day.nonCooking?.kind === 'mystery' ? (
                <span className="text-xs font-medium text-ink-muted">
                  {t('planner.mysteryNightHint', 'We’ll figure out supper that day.')}
                </span>
              ) : nonCookingNote(day.nonCooking) ? (
                <span
                  data-testid="non-cooking-note"
                  title={nonCookingNote(day.nonCooking) ?? undefined}
                  className="line-clamp-2 break-words text-xs text-ink-muted font-medium"
                >
                  {nonCookingNote(day.nonCooking)}
                </span>
              ) : null}
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
                if (day.recipe?.id) {
                  onViewRecipe(day.recipe.id);
                }
              }}
              className="flex flex-1 min-w-0 items-center text-left rounded-2xl px-1 py-0.5 active:bg-ochre/5 transition-colors"
              data-testid="edit-recipe-button"
            >
              <div className="flex w-full flex-col justify-center gap-0.5">
                <h4
                  className={cn(
                    'font-bold text-ink-body line-clamp-2',
                    isWide ? 'text-sm leading-tight' : 'text-base leading-tight'
                  )}
                  data-testid="recipe-name"
                >
                  {day.recipe.name}
                </h4>
                {day.preparation && !isPast ? (
                  <div className="mt-0.5">
                    <PreparationStatus preparation={day.preparation} variant="compact" />
                  </div>
                ) : (
                  (() => {
                    const count = day._voteCount ?? day.recipe?.voteCount ?? null;
                    const isUnanimous = day._unanimousVote;
                    const hasVotes = count != null && count > 0;
                    return (
                      <span
                        data-testid="vote-count"
                        className={cn(
                          'text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap inline-block w-fit mt-0.5',
                          hasVotes
                            ? isUnanimous
                              ? 'bg-sage-50 text-garden-ink'
                              : 'bg-ochre-50 text-sunlight-ink'
                            : 'bg-charcoal-100 text-ink-muted'
                        )}
                      >
                        {hasVotes
                          ? tWithVars(
                              count === 1 ? 'planner.votedOne' : 'planner.votedOther',
                              '{{count}} voted',
                              { count }
                            )
                          : t('planner.chosen', 'Chosen')}
                      </span>
                    );
                  })()
                )}
              </div>
            </button>
          </div>
        ) : (
          <div className="flex items-stretch w-full">
            <button
              onClick={onPivot}
              data-testid="plan-meal-button"
              className="flex items-center flex-1 min-h-[44px] text-left group rounded-2xl px-1 py-0.5 active:bg-terracotta/10 transition-colors"
            >
              <div className="h-10 w-10 rounded-xl border border-dashed border-hearth-line flex items-center justify-center mr-3 group-hover:bg-terracotta/10 group-hover:border-hearth-line transition-colors">
                <Plus
                  className="text-hearth-ink group-hover:text-hearth-ink transition-colors"
                  size={18}
                />
              </div>
              <div className="flex flex-col justify-center">
                <span
                  className={cn(
                    'font-bold text-hearth-ink group-hover:text-hearth-ink transition-colors',
                    isWide ? 'text-xs' : 'text-sm'
                  )}
                >
                  {t('planner.planSupper', 'Plan supper')}
                </span>
              </div>
            </button>
          </div>
        )}
      </div>
      {((day.status !== 3 && day.recipe?.id) || isDragSource) && (
        <div className="ml-2 pl-2 border-l border-charcoal/8 flex items-center gap-2 self-stretch max-[360px]:self-end max-[360px]:border-l-0">
          {day.recipe?.id && !day._isPending && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                onPivot();
              }}
              className="h-9 w-9 rounded-xl bg-ochre-50 text-sunlight-ink flex items-center justify-center active:scale-90 transition-transform"
              data-testid="change-recipe-button"
              title={t('planner.choosePathTitle', 'Change this recipe')}
              aria-label={t('planner.choosePathTitle', 'Change this recipe')}
            >
              <ArrowRightLeft size={18} />
            </motion.button>
          )}
          <PlannerDragHandle start={startRecipeDrag} moveBySlot={moveBySlot} />
        </div>
      )}
    </>
  );
}
