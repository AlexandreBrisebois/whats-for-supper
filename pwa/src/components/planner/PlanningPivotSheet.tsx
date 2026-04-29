import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Search, Users, Share2, Trash2, ChevronRight } from 'lucide-react';

interface PlanningPivotSheetProps {
  isOpen: boolean;
  onClose: () => void;
  dayIndex: number;
  onQuickFind: () => void;
  onSearchLibrary: () => void;
  onAskFamily: () => void;
  onRemoveRecipe?: () => void;
  isVotingOpen: boolean;
  hasRecipe: boolean;
}

export const PlanningPivotSheet: React.FC<PlanningPivotSheetProps> = ({
  isOpen,
  onClose,
  dayIndex,
  onQuickFind,
  onSearchLibrary,
  onAskFamily,
  onRemoveRecipe,
  isVotingOpen,
  hasRecipe,
}) => {
  const handleNudge = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "What's for Supper?",
          text: `Help us choose what's for supper! Vote here:`,
          url: window.location.origin + '/discovery',
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard or just alert
      try {
        await navigator.clipboard.writeText(window.location.origin + '/discovery');
        alert('Link copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy: ', err);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
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
                Day {dayIndex + 1}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={onQuickFind}
                data-testid="pivot-quick-find"
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
                onClick={onSearchLibrary}
                data-testid="pivot-search-library"
                className="flex items-center p-5 rounded-3xl bg-white border border-charcoal/5 shadow-sm active:scale-95 transition-all text-left"
              >
                <div className="h-12 w-12 rounded-2xl bg-terracotta/10 text-terracotta flex items-center justify-center mr-4">
                  <Search size={24} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-charcoal">Search library</h4>
                  <p className="text-[11px] text-charcoal/40 font-medium">Browse your collection</p>
                </div>
                <ChevronRight size={18} className="text-charcoal/20" />
              </button>

              <button
                onClick={onAskFamily}
                data-testid="pivot-ask-family"
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

              {isVotingOpen && (
                <button
                  onClick={handleNudge}
                  data-testid="pivot-nudge-family"
                  className="flex items-center p-5 rounded-3xl bg-sage text-white shadow-lg shadow-sage/20 active:scale-95 transition-all text-left"
                >
                  <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center mr-4">
                    <Share2 size={24} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold">Nudge family</h4>
                    <p className="text-[11px] opacity-80 font-medium">Share voting link</p>
                  </div>
                  <ChevronRight size={18} className="opacity-40" />
                </button>
              )}

              {hasRecipe && (
                <button
                  onClick={onRemoveRecipe}
                  data-testid="pivot-remove-recipe"
                  className="flex items-center p-5 rounded-3xl bg-white border border-terracotta/20 text-terracotta shadow-sm active:scale-95 transition-all text-left mt-4"
                >
                  <div className="h-12 w-12 rounded-2xl bg-terracotta/10 flex items-center justify-center mr-4">
                    <Trash2 size={24} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold">Remove recipe</h4>
                    <p className="text-[11px] opacity-60 font-medium">Clear this slot</p>
                  </div>
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
