'use client';

import { X } from 'lucide-react';
import { t } from '@/locales';
import { useLocale } from '@/components/common/LocaleProvider';

export interface CaptureHeaderProps {
  title: string;
  subtitle?: string;
  headingTestId?: string;
  onCancel: () => void;
  cancelDisabled?: boolean;
}

export function CaptureHeader({
  title,
  subtitle,
  headingTestId,
  onCancel,
  cancelDisabled = false,
}: CaptureHeaderProps) {
  const { locale } = useLocale();

  return (
    <header className="flex items-start justify-between gap-4 pt-2">
      <div className="min-w-0 flex-1">
        <h1
          data-testid={headingTestId}
          className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-ink-body"
        >
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
      </div>
      <button
        type="button"
        data-testid="capture-cancel-btn"
        aria-label={t('capture.cancelCapture', 'Cancel capture', locale)}
        disabled={cancelDisabled}
        onClick={onCancel}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-chrome-line bg-white text-ink-muted transition-colors hover:bg-terracotta-50 hover:text-hearth-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body disabled:cursor-not-allowed disabled:opacity-50"
      >
        <X size={20} aria-hidden="true" />
      </button>
    </header>
  );
}
