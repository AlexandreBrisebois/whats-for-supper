import type { ButtonHTMLAttributes } from 'react';
import type { ButtonVariant } from '@/types/ui';

export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-hearth-fill text-cream-100 hover:bg-hearth-fill-hover active:bg-hearth-fill-active active:scale-[0.98] transition-all shadow-sm',
  secondary:
    'bg-white text-hearth-ink border border-hearth-line hover:bg-terracotta-50 active:bg-terracotta-50 transition-colors',
  ghost: 'text-hearth-ink hover:bg-terracotta-50 active:bg-terracotta-50 transition-colors',
  danger:
    'bg-terracotta-50 text-hearth-ink border border-hearth-line hover:bg-hearth-fill hover:text-cream-100 hover:border-hearth-fill active:bg-hearth-fill-active transition-colors',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-xl min-h-11',
  md: 'px-6 py-3 text-base rounded-2xl min-h-12',
  lg: 'px-8 py-4 text-lg rounded-2xl min-h-14',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loadingText,
  fullWidth = false,
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={[
        'inline-flex items-center justify-center font-semibold transition-opacity',
        'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {isLoading ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {loadingText ? <span>{loadingText}</span> : null}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
