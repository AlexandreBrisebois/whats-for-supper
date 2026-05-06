'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, AlertCircle } from 'lucide-react';
import { WeeklyBalanceSummaryDto } from '@/lib/api/generated/models';
import { cn } from '@/lib/utils';
import { t } from '@/locales';

interface BalanceIndicatorProps {
  summary: WeeklyBalanceSummaryDto | null;
  className?: string;
}

export function BalanceIndicator({ summary, className }: BalanceIndicatorProps) {
  if (!summary) return null;

  const { isBalanced, recommendations } = summary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'p-4 rounded-3xl border transition-all duration-500',
        isBalanced
          ? 'bg-sage/10 border-sage/20 text-sage'
          : 'bg-ochre/10 border-ochre/20 text-ochre',
        className
      )}
      data-testid="balance-indicator"
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'h-10 w-10 rounded-2xl flex items-center justify-center shrink-0',
            isBalanced ? 'bg-sage/20' : 'bg-ochre/20'
          )}
        >
          {isBalanced ? (
            <Sparkles size={20} className="text-sage animate-pulse" />
          ) : (
            <AlertCircle size={20} className="text-ochre" />
          )}
        </div>

        <div className="flex flex-col">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-60">
            {isBalanced
              ? t('planner.balancedWeek', 'Balanced Week')
              : t('planner.diversify', 'Diversify')}
          </p>
          <h4 className="text-sm font-bold leading-tight">
            {isBalanced
              ? t('planner.cfgBalanced', "Your menu hits Canada's Food Guide targets!")
              : recommendations && recommendations.length > 0
                ? recommendations[0]
                : t('planner.addVariety', 'Add more variety to balance your week.')}
          </h4>
        </div>
      </div>
    </motion.div>
  );
}
