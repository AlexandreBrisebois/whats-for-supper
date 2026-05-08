'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Library } from 'lucide-react';

interface StackActionBarProps {
  currentIndex: number;
  totalCount: number;
  isDiscoverableOnly: boolean;
  onToggleDiscoverable: () => void;
}

export const StackActionBar: React.FC<StackActionBarProps> = ({
  currentIndex,
  totalCount,
  isDiscoverableOnly,
  onToggleDiscoverable,
}) => {
  return (
    <div className="fixed bottom-10 left-0 right-0 z-50 flex justify-center px-6 pointer-events-none">
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center gap-2 rounded-full bg-charcoal/90 px-2 py-2 text-white shadow-2xl backdrop-blur-xl border border-white/10 pointer-events-auto"
        data-testid="stack-action-bar"
      >
        {/* Discoverable Toggle */}
        <button
          onClick={onToggleDiscoverable}
          className={`flex items-center gap-2 rounded-full px-5 py-2.5 transition-all duration-300 ${
            isDiscoverableOnly
              ? 'bg-ochre text-charcoal shadow-[0_0_20px_rgba(224,159,31,0.4)]'
              : 'bg-white/5 hover:bg-white/10 text-white/70'
          }`}
          data-testid="stack-toggle-discoverable"
        >
          <Sparkles className={`h-4 w-4 ${isDiscoverableOnly ? 'fill-charcoal' : ''}`} />
          <span className="text-xs font-bold uppercase tracking-wider">
            {isDiscoverableOnly ? 'Discoverable' : 'All Recipes'}
          </span>
        </button>

        <div className="h-4 w-px bg-white/10 mx-1" />

        {/* Counter */}
        <div 
          className="flex items-center gap-2.5 px-5 py-2.5"
          data-testid="stack-counter"
        >
          <Library className="h-4 w-4 text-ochre/80" />
          <span className="text-xs font-medium tabular-nums text-white/90">
            <span className="text-ochre font-bold">{currentIndex + 1}</span>
            <span className="text-white/40 mx-1.5">/</span>
            <span className="text-white/60">{totalCount}</span>
          </span>
        </div>
      </motion.div>
    </div>
  );
};
