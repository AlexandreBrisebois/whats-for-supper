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
  { value: 3, emoji: '😊', className: 'happy-emoji', label: 'Delicious' },
  { value: 2, emoji: '🙂', className: 'good-emoji', label: 'Good' },
  { value: 1, emoji: '😐', className: 'neutral-emoji', label: 'Okay' },
  { value: 0, emoji: '😞', className: 'sad-emoji', label: 'Not great' },
];

export function RatingSelector({ selectedRating, onSelect }: RatingSelectorProps) {
  return (
    <div data-hint="recipe-rating" className="flex flex-col gap-4">
      <p className="text-sm font-medium text-charcoal">How was it?</p>
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
                  ? 'bg-sage-green/15 ring-2 ring-sage-green scale-110'
                  : 'opacity-60 hover:opacity-90',
              ].join(' ')}
            >
              <span aria-hidden>{emoji}</span>
              {isSelected && (
                <span className="text-xs font-medium text-sage-green">{label}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
