'use client';

import type { CaptureRating } from '@/hooks/useCapture';

interface RatingSelectorProps {
  selectedRating: CaptureRating | null;
  onSelect: (rating: CaptureRating) => void;
}

interface RatingOption {
  value: CaptureRating;
  emoji: string;
  className: string;
  label: string;
}

const RATING_OPTIONS: RatingOption[] = [
  { value: 0, emoji: '❓', className: 'unknown-emoji', label: 'Unknown' },
  { value: 1, emoji: '👎', className: 'dislike-emoji', label: 'Dislike' },
  { value: 2, emoji: '👍', className: 'like-emoji', label: 'Like' },
  { value: 3, emoji: '❤️', className: 'love-emoji', label: 'Love' },
];

export function RatingSelector({ selectedRating, onSelect }: RatingSelectorProps) {
  return (
    <div className="flex flex-col gap-8 rounded-[2rem] bg-indigo/[0.03] p-6 border border-white/50 shadow-sm">
      <div className="text-center space-y-1">
        <p className="text-lg font-bold text-charcoal tracking-tight">Family Verdict</p>
        <p className="text-xs text-charcoal-300 font-medium">Did everyone enjoy this meal?</p>
      </div>
      
      <div className="flex justify-between items-center px-2">
        {RATING_OPTIONS.map(({ value, emoji, label }) => {
          const isSelected = selectedRating === value;
          return (
            <button
              key={value}
              type="button"
              aria-label={label}
              aria-pressed={isSelected}
              onClick={() => onSelect(value)}
              className={[
                'relative flex flex-col items-center gap-2 rounded-[1.5rem] px-3 py-4 transition-all duration-300',
                isSelected
                  ? 'bg-white shadow-card ring-1 ring-indigo/5 scale-110 z-10'
                  : 'hover:bg-white/40 opacity-40 hover:opacity-100',
              ].join(' ')}
            >
              <span className="text-4xl filter saturate-[0.8]" aria-hidden>{emoji}</span>
              <span className={[
                'text-[10px] font-bold uppercase tracking-wider transition-all',
                isSelected ? 'text-indigo opacity-100' : 'text-charcoal-400 opacity-60'
              ].join(' ')}>
                {label}
              </span>
              
              {isSelected && (
                <div className="absolute -bottom-1 left-1/2 h-1 w-4 -translate-x-1/2 rounded-full bg-indigo animate-in fade-in zoom-in" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
