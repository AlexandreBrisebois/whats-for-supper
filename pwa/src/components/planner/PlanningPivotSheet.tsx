import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Search, Users, Share2, Trash2, ChevronRight, X, Copy } from 'lucide-react';
import { getVotingLink } from '@/lib/auth';
import { t } from '@/locales';

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
  const [shareUrl, setShareUrl] = useState('');
  const [showNudgeDialog, setShowNudgeDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;

  useEffect(() => {
    if (!showNudgeDialog) return;

    const baseUrl = window.location.origin;
    getVotingLink(baseUrl).then((votingLink) => {
      setShareUrl(votingLink || baseUrl + '/discovery');
    });
  }, [showNudgeDialog]);

  const handleNudge = async () => {
    setCopied(false);
    setShowNudgeDialog(true);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const handleShare = async () => {
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
                  {t('planner.choosePathTitle', 'Choose your path')}
                </h3>
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
                    Quick find
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
                    Search library
                  </h4>
                  <p className="text-[11px] text-charcoal/40 font-medium">Browse your collection</p>
                </div>
                <ChevronRight size={18} className="text-charcoal/20" />
              </button>

              {!isVotingOpen && (
                <button
                  onClick={onAskFamily}
                  data-testid="pivot-ask-family"
                  className="flex items-center gap-4 p-5 rounded-[2rem] border-2 border-charcoal/5 hover:border-sage/30 hover:bg-sage/5 transition-all text-left group"
                >
                  <div className="h-14 w-14 rounded-2xl bg-sage/10 text-sage flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Users size={24} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-heading text-xl font-black text-charcoal tracking-tight">
                      Ask the family
                    </h4>
                    <p className="text-[11px] text-charcoal/40 font-medium">Open for voting</p>
                  </div>
                  <ChevronRight size={18} className="text-charcoal/20" />
                </button>
              )}

              {isVotingOpen && (
                <button
                  onClick={handleNudge}
                  data-testid="pivot-nudge-family"
                  className="flex items-center gap-4 p-5 rounded-[2rem] bg-sage text-white shadow-lg shadow-sage/20 active:scale-95 transition-all text-left"
                >
                  <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center">
                    <Share2 size={24} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-heading text-xl font-black tracking-tight">Nudge family</h4>
                    <p className="text-[11px] opacity-80 font-medium">Remind everyone to vote</p>
                  </div>
                  <ChevronRight size={18} className="opacity-40" />
                </button>
              )}

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
                      Remove recipe
                    </h4>
                    <p className="text-[11px] text-charcoal/40 font-medium">Clear this slot</p>
                  </div>
                </button>
              )}
            </div>
          </motion.div>

          <AnimatePresence>
            {showNudgeDialog && (
              <motion.div
                key="nudge-dialog-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 flex items-center justify-center bg-charcoal/40 backdrop-blur-sm px-4"
                onClick={() => setShowNudgeDialog(false)}
              >
                <motion.div
                  data-testid="pivot-nudge-dialog"
                  initial={{ opacity: 0, scale: 0.95, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 16 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="w-full max-w-sm rounded-[2rem] bg-white p-6 shadow-2xl flex flex-col gap-5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-charcoal">Nudge the family</h2>
                      <p className="text-xs text-charcoal/50 mt-0.5">
                        Share this week&apos;s voting link
                      </p>
                    </div>
                    <button
                      onClick={() => setShowNudgeDialog(false)}
                      className="p-2 rounded-full hover:bg-charcoal/5 text-charcoal/40 transition-colors"
                      aria-label={t('common.close', 'Close')}
                      title={t('common.close', 'Close')}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="rounded-xl bg-cream border border-charcoal/10 px-4 py-3 text-xs font-mono text-charcoal/60 break-all select-all">
                    {shareUrl || 'Generating link…'}
                  </div>

                  {copied && (
                    <p className="text-xs text-sage font-medium text-center -mt-2">Link copied!</p>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={handleCopy}
                      disabled={!shareUrl}
                      className="flex-1 flex items-center justify-center gap-2 h-12 rounded-2xl bg-charcoal/5 text-charcoal text-sm font-semibold transition-all active:scale-95 hover:bg-charcoal/10 disabled:opacity-40"
                    >
                      <Copy size={16} />
                      Copy
                    </button>
                    {canShare && (
                      <button
                        onClick={handleShare}
                        disabled={!shareUrl}
                        className="flex-1 flex items-center justify-center gap-2 h-12 rounded-2xl bg-ochre text-white text-sm font-semibold shadow-lg shadow-ochre/30 transition-all active:scale-95 hover:brightness-110 disabled:opacity-40"
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
        </div>
      )}
    </AnimatePresence>
  );
};
