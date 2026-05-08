'use client';

import React from 'react';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';

/**
 * BrowseAllEmptyState
 *
 * Shown inside BrowseAllStack when pagination.total === 0.
 * Visually distinct from EndCard: no compass icon, different messaging,
 * appears before any browsing begins (not after).
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */
export const BrowseAllEmptyState: React.FC = () => {
  return (
    <div
      data-testid="browse-all-empty-state"
      className="flex h-full w-full flex-col items-center justify-center gap-8 rounded-[2.5rem] bg-cream px-10 py-16 text-center shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),_0_20px_40px_-1px_rgba(0,0,0,0.05)]"
    >
      {/* Icon */}
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-ochre-50">
        <BookOpen size={44} className="text-ochre-600" strokeWidth={1.5} />
      </div>

      {/* Copy */}
      <div className="flex flex-col gap-3">
        <h2 className="font-heading text-3xl font-bold tracking-tight text-charcoal">
          Your library is empty
        </h2>
        <p className="text-base font-medium leading-relaxed text-charcoal/60">
          Add your first recipe and start building your library
        </p>
      </div>

      {/* CTA */}
      <Link
        href="/capture"
        data-testid="browse-all-empty-capture-cta"
        className="inline-flex items-center gap-2 rounded-full bg-ochre px-8 py-4 text-sm font-black tracking-wide text-white shadow-md shadow-ochre/20 transition-opacity hover:opacity-90 active:opacity-80"
      >
        Capture a Recipe
      </Link>
    </div>
  );
};
