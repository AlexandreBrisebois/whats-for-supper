'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Utensils, Pizza, RefreshCw, Calendar, ArrowRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
        className="relative w-full max-w-md bg-white rounded-[3rem] overflow-hidden shadow-2xl p-8"
      >
        <div className="flex justify-between items-center mb-8">
          <h2 className="font-heading text-[10px] font-black uppercase tracking-[0.3em] text-terracotta">
            Recovery Flow
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-charcoal/5 text-charcoal/40 hover:bg-charcoal/10"
          >
            <X size={20} />
          </button>
        </div>

        <AnimatePresence mode="wait">
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
                  What&apos;s the backup plan?
                </h3>
                <p className="text-sm text-charcoal/40 font-medium">
                  Plans changed. We get it. What are we eating instead?
                </p>
              </div>

              <div className="grid gap-3">
                <button
                  onClick={() => {
                    onAction('order_in');
                    setStep(2);
                  }}
                  className="flex items-center gap-4 p-5 rounded-[2rem] border-2 border-charcoal/5 hover:border-terracotta/30 hover:bg-terracotta/5 transition-all text-left group"
                >
                  <div className="h-14 w-14 rounded-2xl bg-terracotta/10 text-terracotta flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Pizza size={28} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-heading text-xl font-black text-charcoal tracking-tight">
                      Ordering In
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-charcoal/30">
                      Takeout or Delivery
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => onAction('pick_else')}
                  className="flex items-center gap-4 p-5 rounded-[2rem] border-2 border-charcoal/5 hover:border-ochre/30 hover:bg-ochre/5 transition-all text-left group"
                >
                  <div className="h-14 w-14 rounded-2xl bg-ochre/10 text-ochre flex items-center justify-center group-hover:scale-110 transition-transform">
                    <RefreshCw size={28} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-heading text-xl font-black text-charcoal tracking-tight">
                      Pick Something Else
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-charcoal/30">
                      Find a quick recipe
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
                  What about tonight&apos;s recipe?
                </h3>
                <p className="text-sm text-charcoal/40 font-medium">
                  We have the ingredients. When should we cook it?
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => onAction('tomorrow')}
                  className="flex items-center justify-between p-5 rounded-[2rem] bg-sage/10 border-2 border-transparent hover:border-sage/30 transition-all text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-sage text-white flex items-center justify-center shadow-lg shadow-sage/30">
                      <Calendar size={24} />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-heading text-lg font-black text-charcoal tracking-tight">
                        Tomorrow
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-sage-700/60">
                        Shifts the whole week
                      </span>
                    </div>
                  </div>
                  <ArrowRight size={20} className="text-sage" />
                </button>

                <button
                  onClick={() => onAction('next_week')}
                  className="flex items-center justify-between p-5 rounded-[2rem] border-2 border-charcoal/5 hover:border-charcoal/20 transition-all text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-charcoal/10 text-charcoal flex items-center justify-center">
                      <RefreshCw size={24} />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-heading text-lg font-black text-charcoal tracking-tight">
                        Next Week
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-charcoal/30">
                        Keep it for later
                      </span>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => onAction('drop')}
                  className="flex items-center justify-between p-5 rounded-[2rem] border-2 border-transparent hover:bg-terracotta/5 transition-all text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-white text-terracotta border-2 border-terracotta/20 flex items-center justify-center">
                      <Trash2 size={24} />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-heading text-lg font-black text-terracotta tracking-tight">
                        Drop It
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-terracotta/40">
                        Maybe another time
                      </span>
                    </div>
                  </div>
                </button>
              </div>

              <button
                onClick={() => setStep(1)}
                className="text-center text-[10px] font-black uppercase tracking-widest text-charcoal/40 hover:text-charcoal transition-colors mt-2"
              >
                Go back
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
