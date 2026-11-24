'use client';

import { t } from '@/locales';
import type { CaptureRating } from '@/hooks/useCapture';

const RATING_OPTIONS = [
  { value: 1 as const, emoji: '👎', key: 'recipes.ratingDislike', label: 'Dislike' },
  { value: 2 as const, emoji: '👍', key: 'recipes.ratingLike', label: 'Like' },
  { value: 3 as const, emoji: '❤️', key: 'recipes.ratingLove', label: 'Love' },
] as const;

export interface RecipeRatingControlProps {
  value: number;
  onChange: (next: CaptureRating) => void;
  disabled?: boolean;
  testIdPrefix?: string;
  selectorTestId?: string;
  allowClear?: boolean;
}

export function RecipeRatingControl({
  value,
  onChange,
  disabled = false,
  testIdPrefix = 'recipe-rating',
  selectorTestId,
  allowClear = true,
}: RecipeRatingControlProps) {
  return (
    <div data-testid={selectorTestId} className="flex flex-wrap items-start justify-around gap-2">
      {RATING_OPTIONS.map((opt) => {
        const isSelected = value === opt.value;
        const ratingInk =
          opt.value === 1
            ? 'text-hearth-ink'
            : opt.value === 2
              ? 'text-garden-ink'
              : 'text-ink-body';
        const localizedLabel = t(opt.key, opt.label);

        return (
          <button
            key={opt.value}
            type="button"
            data-testid={`${testIdPrefix}-${opt.value}`}
            aria-label={localizedLabel}
            aria-pressed={isSelected}
            disabled={disabled}
            onClick={() => onChange(allowClear && isSelected ? 0 : opt.value)}
            className={[
              'flex min-h-12 min-w-[84px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-3 py-3 text-sm font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body disabled:cursor-not-allowed disabled:opacity-50',
              isSelected
                ? `rating-option-selected bg-white shadow-md ${ratingInk}`
                : 'bg-transparent text-ink-muted hover:bg-white/60 hover:text-ink-body',
            ].join(' ')}
          >
            <span aria-hidden="true" className="text-2xl leading-none">
              {opt.emoji}
            </span>
            <span className="text-xs font-semibold leading-tight">{localizedLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
