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
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <p className="text-xl font-bold text-charcoal">Did the family like this recipe?</p>
      </div>
      <div className="flex justify-around">
        {RATING_OPTIONS.map(({ value, emoji, className, label }) => {
          const isSelected = selectedRating === value;
          return (
            <button
              key={value}
              type="button"
              aria-label={label}
              aria-pressed={isSelected}
              onClick={() => onSelect(value)}
              className={[
                className,
                'flex flex-col items-center gap-1 rounded-2xl px-4 py-3 text-4xl transition-all active:scale-95',
                isSelected
                  ? 'bg-indigo/15 ring-2 ring-indigo scale-110'
                  : 'opacity-60 hover:opacity-90',
              ].join(' ')}
            >
              <span aria-hidden>{emoji}</span>
              {isSelected && (
                <span className="text-xs font-medium text-indigo">{label}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
