'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Plus, CheckCircle2, Search } from 'lucide-react';
import Link from 'next/link';
import { ROUTES } from '@/lib/constants/routes';

interface EndCardProps {
  isEmpty: boolean;
  onAddRecipe: () => void;
}

export const EndCard: React.FC<EndCardProps> = ({ isEmpty, onAddRecipe }) => {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="absolute inset-0 bottom-12 flex items-center justify-center p-6"
      data-testid={isEmpty ? 'stack-empty-state' : 'stack-end-card'}
    >
      <div className="w-full max-w-sm overflow-hidden rounded-[2.5rem] bg-white p-12 shadow-2xl flex flex-col items-center text-center">
        <div className={`mb-8 flex h-24 w-24 items-center justify-center rounded-full ${isEmpty ? 'bg-ochre-50' : 'bg-sage-50'}`}>
          {isEmpty ? (
            <Search className="h-10 w-10 text-ochre-600" />
          ) : (
            <CheckCircle2 className="h-10 w-10 text-sage-600" />
          )}
        </div>

        <h2 className="mb-4 text-3xl font-bold tracking-tight font-heading text-charcoal">
          {isEmpty ? "Your Library is Empty" : "That's Everything!"}
        </h2>
        
        <p className="mb-10 text-charcoal/60 leading-relaxed">
          {isEmpty 
            ? "Start your collection by adding a favorite family recipe or capturing one from the web."
            : "You've reached the end of your collection. Ready to plan your next masterpiece?"}
        </p>

        <button
          onClick={onAddRecipe}
          className="group flex items-center gap-3 rounded-full bg-charcoal px-8 py-4 text-white shadow-lg transition-all hover:scale-105 active:scale-95"
          data-testid="stack-add-recipe-button"
        >
          <Plus className="h-5 w-5" />
          <span className="font-bold tracking-wide">Add New Recipe</span>
        </button>
        
        {!isEmpty && (
          <Link
            href={ROUTES.HOME}
            className="mt-6 text-sm font-bold text-ochre-600 hover:text-ochre-700 transition-colors"
          >
            Back to Planner
          </Link>
        )}
      </div>
    </motion.div>
  );
};
