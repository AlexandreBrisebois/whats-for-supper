import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Search, Trash2, ChevronRight, X } from 'lucide-react';
import { t } from '@/locales';

interface PlanningPivotSheetProps {
  isOpen: boolean;
  onClose: () => void;
  dayIndex: number;
  onQuickFind: () => void;
  onSearchLibrary: () => void;
  onRemoveRecipe?: () => void;
  hasRecipe: boolean;
}

export const PlanningPivotSheet: React.FC<PlanningPivotSheetProps> = ({
  isOpen,
  onClose,
  dayIndex,
  onQuickFind,
  onSearchLibrary,
  onRemoveRecipe,
  hasRecipe,
}) => {
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
            className="absolute inset-0 bg-cream/55 backdrop-blur-xl"
          />
          <motion.div
            data-testid="pivot-sheet"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 32 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-sm rounded-[3rem] overflow-hidden border border-white/60 bg-[rgba(253,252,240,0.78)] p-8 shadow-[0_24px_60px_-16px_rgba(74,55,40,0.18)] backdrop-blur-xl"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex flex-col gap-1">
                <h2 className="font-heading text-[10px] font-black uppercase tracking-[0.3em] text-terracotta">
                  {t('planner.choosePathLabel', 'Planner options')}
                </h2>
                <h3 className="text-3xl font-heading font-black text-charcoal leading-none tracking-tighter">
                  {t('planner.choosePathTitle', 'Change this recipe')}
                </h3>
                <p className="text-[11px] text-charcoal/45 font-medium mt-1">
                  {t('planner.choosePathSubtitle', 'Choose how to replace or remove this recipe')}
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label={t('common.close', 'Close')}
                title={t('common.close', 'Close')}
                className="p-2 rounded-full bg-charcoal/5 text-charcoal/40 hover:bg-charcoal/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="inline-flex items-center rounded-full bg-terracotta/5 text-terracotta font-bold text-[10px] uppercase tracking-wider px-3 py-1.5 mb-6">
              Day {dayIndex + 1}
            </div>

            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={onQuickFind}
                data-testid="pivot-quick-find"
                className="flex items-center gap-4 p-5 rounded-[2rem] border-2 border-charcoal/5 hover:border-ochre/30 hover:bg-ochre/5 transition-all text-left group"
              >
                <div className="h-14 w-14 rounded-2xl bg-ochre/10 text-ochre flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Sparkles size={24} />
                </div>
                <div className="flex-1">
                  <h4 className="font-heading text-xl font-black text-charcoal tracking-tight">
                    {t('planner.quickFindAction', 'Quick replace')}
                  </h4>
                  <p className="text-[11px] text-charcoal/40 font-medium">
                    Swipe through 5 tailored picks
                  </p>
                </div>
                <ChevronRight size={18} className="text-charcoal/20" />
              </button>

              <button
                onClick={onSearchLibrary}
                data-testid="pivot-search-library"
                className="flex items-center gap-4 p-5 rounded-[2rem] border-2 border-charcoal/5 hover:border-terracotta/30 hover:bg-terracotta/5 transition-all text-left group"
              >
                <div className="h-14 w-14 rounded-2xl bg-terracotta/10 text-terracotta flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Search size={24} />
                </div>
                <div className="flex-1">
                  <h4 className="font-heading text-xl font-black text-charcoal tracking-tight">
                    {t('planner.searchLibraryAction', 'Search library')}
                  </h4>
                  <p className="text-[11px] text-charcoal/40 font-medium">Browse your collection</p>
                </div>
                <ChevronRight size={18} className="text-charcoal/20" />
              </button>

              {hasRecipe && (
                <button
                  onClick={onRemoveRecipe}
                  data-testid="pivot-remove-recipe"
                  className="flex items-center gap-4 p-5 rounded-[2rem] border-2 border-charcoal/5 hover:border-charcoal/20 hover:bg-charcoal/5 transition-all text-left mt-2 group"
                >
                  <div className="h-12 w-12 rounded-2xl bg-charcoal/5 text-charcoal/40 flex items-center justify-center group-hover:text-charcoal/60 transition-colors">
                    <Trash2 size={24} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-heading text-lg font-black text-charcoal tracking-tight">
                      {t('planner.removeRecipeAction', 'Remove recipe')}
                    </h4>
                    <p className="text-[11px] text-charcoal/40 font-medium">Clear this slot</p>
                  </div>
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
