'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Search, Trash2, ChevronRight, X, RefreshCw, CalendarCheck } from 'lucide-react';
import { t } from '@/locales';
import { formatSupperPlanDate } from '@/lib/planner/nonCooking';

interface PlanningPivotSheetProps {
  isOpen: boolean;
  onClose: () => void;
  dayIndex: number;
  date?: string;
  onQuickFind: () => void;
  onSearchLibrary: () => void;
  onRemoveRecipe?: () => void;
  onPlanLater?: () => void;
  hasRecipe: boolean;
  onNoCooking?: () => void;
  isNonCooking?: boolean;
}

export const PlanningPivotSheet: React.FC<PlanningPivotSheetProps> = ({
  isOpen,
  onClose,
  date,
  onQuickFind,
  onSearchLibrary,
  onRemoveRecipe,
  onPlanLater,
  hasRecipe,
  onNoCooking,
  isNonCooking = false,
}) => {
  const removeAction = hasRecipe && (
    <button
      onClick={onRemoveRecipe}
      data-testid="pivot-remove-recipe"
      className="flex items-center gap-4 p-5 rounded-[2rem] border border-charcoal-200 bg-white hover:bg-charcoal-100 transition-all text-left mt-2 group"
    >
      <div className="h-12 w-12 rounded-2xl bg-charcoal-100 text-charcoal-600 flex items-center justify-center group-hover:text-charcoal transition-colors">
        <Trash2 size={24} />
      </div>
      <div className="flex-1">
        <h4 className="font-heading text-lg font-black text-charcoal tracking-tight">
          {isNonCooking
            ? t('planner.clearDay', 'Remove supper plan')
            : t('planner.removeRecipeAction', 'Remove recipe')}
        </h4>
        <p className="text-xs text-charcoal-600 font-medium">
          {isNonCooking
            ? t('planner.leaveDayUnplanned', 'Leave this day unplanned')
            : 'Clear this slot'}
        </p>
      </div>
    </button>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center px-6 pb-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            data-testid="pivot-sheet-backdrop"
            className="absolute inset-0 bg-charcoal/45 backdrop-blur-sm"
          />
          <motion.div
            data-testid="pivot-sheet"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 32 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-sm max-h-[calc(100dvh-3rem)] rounded-[2.5rem] overflow-y-auto border border-charcoal-200 bg-cream p-8 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex flex-col gap-1">
                <h2 className="font-heading text-xs font-semibold text-terracotta-700">
                  {t('planner.choosePathLabel', 'Planner options')}
                </h2>
                <h3 className="text-3xl font-heading font-black text-charcoal leading-none tracking-tighter">
                  {isNonCooking
                    ? t('planner.changeSupperPlans', 'Change supper plans')
                    : hasRecipe
                      ? t('planner.choosePathTitle', 'Change this recipe')
                      : t('planner.planSupper', 'Plan supper')}
                </h3>
                <p className="text-xs text-charcoal-600 font-medium mt-1">
                  {!hasRecipe || isNonCooking
                    ? t('planner.supperOptionsSubtitle', 'Choose what works for this day')
                    : t(
                        'planner.choosePathSubtitle',
                        'Choose how to replace or remove this recipe'
                      )}
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label={t('common.close', 'Close')}
                title={t('common.close', 'Close')}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white border border-charcoal-200 text-charcoal-600 hover:bg-charcoal-100 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-charcoal"
              >
                <X size={20} />
              </button>
            </div>

            {date && (
              <div className="inline-flex items-center rounded-full bg-terracotta-50 text-terracotta-700 font-bold text-xs px-3 py-1.5 mb-6">
                <time dateTime={date}>{formatSupperPlanDate(date)}</time>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              {hasRecipe && onPlanLater && (
                <button
                  onClick={onPlanLater}
                  data-testid="pivot-plan-later"
                  className="flex items-center gap-4 p-5 rounded-[2rem] border border-charcoal-200 bg-white hover:border-sage-300 hover:bg-sage-50 transition-all text-left group"
                >
                  <div className="h-12 w-12 rounded-2xl bg-sage-50 text-sage-700 flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                    <RefreshCw size={24} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-heading text-lg font-black text-charcoal tracking-tight">
                      {t('home.saveForNextWeek', 'Save for Next Week')}
                    </h4>
                    <p className="text-xs text-charcoal-600 font-medium">
                      {t('home.moveFirstSlot', 'Moves to the first open slot')}
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-charcoal-400 flex-shrink-0" />
                </button>
              )}

              <button
                onClick={onQuickFind}
                data-testid="pivot-quick-find"
                className="flex items-center gap-4 p-5 rounded-[2rem] border border-charcoal-200 bg-white hover:border-ochre-300 hover:bg-ochre-50 transition-all text-left group"
              >
                <div className="h-14 w-14 rounded-2xl bg-ochre-100 text-ochre-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Sparkles size={24} />
                </div>
                <div className="flex-1">
                  <h4 className="font-heading text-xl font-black text-charcoal tracking-tight">
                    {t('planner.quickFindAction', 'Suggestions')}
                  </h4>
                  <p className="text-xs text-charcoal-600 font-medium">
                    {t('planner.quickFindDescription', 'Browse up to 5 recipe suggestions')}
                  </p>
                </div>
                <ChevronRight size={18} className="text-charcoal-400" />
              </button>

              <button
                onClick={onSearchLibrary}
                data-testid="pivot-search-library"
                className="flex items-center gap-4 p-5 rounded-[2rem] border border-charcoal-200 bg-white hover:border-terracotta-300 hover:bg-terracotta-50 transition-all text-left group"
              >
                <div className="h-14 w-14 rounded-2xl bg-terracotta-50 text-terracotta-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Search size={24} />
                </div>
                <div className="flex-1">
                  <h4 className="font-heading text-xl font-black text-charcoal tracking-tight">
                    {t('planner.searchLibraryAction', 'Search library')}
                  </h4>
                  <p className="text-xs text-charcoal-600 font-medium">Browse your collection</p>
                </div>
                <ChevronRight size={18} className="text-charcoal-400" />
              </button>

              {!isNonCooking && removeAction}
              {onNoCooking && (
                <button
                  onClick={onNoCooking}
                  data-testid="pivot-no-cooking"
                  className="flex items-center gap-4 rounded-[2rem] border border-charcoal-200 bg-white p-5 text-left hover:border-sage-300 hover:bg-sage-50 transition-colors group"
                >
                  <div className="h-12 w-12 rounded-2xl bg-sage-50 text-sage-700 flex items-center justify-center shrink-0">
                    <CalendarCheck size={24} aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-heading text-lg font-black text-charcoal tracking-tight">
                      {isNonCooking
                        ? t('planner.editSupperPlan', 'Edit supper plan')
                        : t('planner.noCooking', 'Other plans')}
                    </h4>
                    <p className="text-xs text-charcoal-600 font-medium">
                      {t('planner.otherPlansSubtitle', 'Take out, eat out, or add your own')}
                    </p>
                  </div>
                  <ChevronRight
                    size={18}
                    aria-hidden="true"
                    className="text-charcoal-400 shrink-0"
                  />
                </button>
              )}
              {isNonCooking && removeAction}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
