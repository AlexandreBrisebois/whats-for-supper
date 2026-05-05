'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Utensils, Pizza, RefreshCw, Calendar, ArrowRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { t } from '@/locales';

interface SkipRecoveryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: 'order_in' | 'pick_else' | 'tomorrow' | 'next_week' | 'drop') => void;
}

export function SkipRecoveryDialog({ isOpen, onClose, onAction }: SkipRecoveryDialogProps) {
  const [step, setStep] = useState(1);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center px-6 pb-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-charcoal/40 backdrop-blur-md"
      />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full max-w-sm bg-white rounded-[3rem] overflow-hidden shadow-2xl p-8"
      >
        <div className="flex justify-between items-center mb-8">
          <h2
            className="font-heading text-[10px] font-black uppercase tracking-[0.3em] text-terracotta"
            data-testid="recovery-dialog-title"
          >
            {t('home.recoveryFlow', 'Recovery Flow')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-charcoal/5 text-charcoal/40 hover:bg-charcoal/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="relative overflow-hidden">
          <AnimatePresence initial={false}>
            {step === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col gap-6"
              >
                <div className="flex flex-col gap-2">
                  <h3 className="text-3xl font-heading font-black text-charcoal leading-none tracking-tighter">
                    {t('home.backupPlanTitle', "What's the backup plan?")}
                  </h3>
                  <p className="text-sm text-charcoal/40 font-medium">
                    {t(
                      'home.backupPlanSubtitle',
                      'Plans changed. We get it. What are we eating instead?'
                    )}
                  </p>
                </div>

                <div className="grid gap-3">
                  <button
                    onClick={() => {
                      onAction('order_in');
                      setStep(2);
                    }}
                    data-testid="recovery-action-order-in"
                    className="flex items-center gap-4 p-5 rounded-[2rem] border-2 border-charcoal/5 hover:border-terracotta/30 hover:bg-terracotta/5 transition-all text-left group"
                  >
                    <div className="h-14 w-14 rounded-2xl bg-terracotta/10 text-terracotta flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Pizza size={28} />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-heading text-xl font-black text-charcoal tracking-tight">
                        {t('home.orderingIn', 'Ordering In')}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-charcoal/30">
                        {t('home.takeoutOrDelivery', 'Takeout or Delivery')}
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onAction('pick_else');
                      setStep(2);
                    }}
                    data-testid="recovery-action-pick-else"
                    className="flex items-center gap-4 p-5 rounded-[2rem] border-2 border-charcoal/5 hover:border-sage/30 hover:bg-sage/5 transition-all text-left group"
                  >
                    <div className="h-14 w-14 rounded-2xl bg-sage/10 text-sage flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Utensils size={28} />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-heading text-xl font-black text-charcoal tracking-tight">
                        {t('home.pickSomethingElse', 'Pick Something Else')}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-charcoal/30">
                        {t('home.searchRecipes', 'Search the Library')}
                      </span>
                    </div>
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col gap-6"
              >
                <div className="flex flex-col gap-2">
                  <h3 className="text-3xl font-heading font-black text-charcoal leading-none tracking-tighter">
                    {t('home.tonightRecipeTitle', "What about tonight's recipe?")}
                  </h3>
                  <p className="text-sm text-charcoal/40 font-medium">
                    {t(
                      'home.tonightRecipeSubtitle',
                      'We have the ingredients. When should we cook it?'
                    )}
                  </p>
                </div>

                <div className="grid gap-3">
                  <button
                    onClick={() => onAction('tomorrow')}
                    data-testid="recovery-action-tomorrow"
                    className="flex items-center justify-between p-5 rounded-[2rem] border-2 border-charcoal/5 hover:border-terracotta/30 hover:bg-terracotta/5 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-terracotta/10 text-terracotta flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ArrowRight size={24} />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-heading text-lg font-black text-charcoal tracking-tight">
                          {t('home.moveTomorrow', 'Move to Tomorrow')}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-charcoal/30">
                          {t('home.dominoShift', 'Pushes your week forward')}
                        </span>
                      </div>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-charcoal/5 flex items-center justify-center text-charcoal/20 group-hover:bg-terracotta/10 group-hover:text-terracotta transition-colors">
                      <Calendar size={16} />
                    </div>
                  </button>

                  <button
                    onClick={() => onAction('next_week')}
                    className="flex items-center justify-between p-5 rounded-[2rem] border-2 border-charcoal/5 hover:border-sage/30 hover:bg-sage/5 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-sage/10 text-sage flex items-center justify-center group-hover:scale-110 transition-transform">
                        <RefreshCw size={24} />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-heading text-lg font-black text-charcoal tracking-tight">
                          {t('home.saveForNextWeek', 'Save for Next Week')}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-charcoal/30">
                          {t('home.moveFirstSlot', 'Moves to the first open slot')}
                        </span>
                      </div>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-charcoal/5 flex items-center justify-center text-charcoal/20 group-hover:bg-sage/10 group-hover:text-sage transition-colors">
                      <RefreshCw size={16} />
                    </div>
                  </button>

                  <button
                    onClick={() => onAction('drop')}
                    className="flex items-center gap-4 p-5 rounded-[2rem] border-2 border-charcoal/5 hover:border-charcoal/20 hover:bg-charcoal/5 transition-all group"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-charcoal/5 text-charcoal/40 flex items-center justify-center group-hover:text-charcoal/60 transition-colors">
                      <Trash2 size={24} />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-heading text-lg font-black text-charcoal tracking-tight">
                        {t('home.dropTonight', 'Just Drop Tonight')}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-charcoal/30">
                        {t('home.unplanCompletely', 'Remove it from the plan')}
                      </span>
                    </div>
                  </button>
                </div>

                <button
                  onClick={() => setStep(1)}
                  className="mt-4 text-xs font-black uppercase tracking-widest text-charcoal/30 hover:text-charcoal/60 transition-colors"
                >
                  {t('home.goBack', 'Go back')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
