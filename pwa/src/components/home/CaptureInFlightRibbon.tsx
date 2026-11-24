'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useCaptureStore } from '@/store/captureStore';
import { useLocale } from '@/components/common/LocaleProvider';
import { t, tWithVars } from '@/locales';
import { ROUTES } from '@/lib/constants/routes';

export function CaptureInFlightRibbon() {
  const { locale } = useLocale();
  const pendingCount = useCaptureStore((s) => s.pendingRecipes.length);

  if (pendingCount === 0) return null;

  const heading =
    pendingCount === 1
      ? t('home.captureInFlightOne', 'Preparing 1 recipe in the background', locale)
      : tWithVars(
          'home.captureInFlightMany',
          'Preparing {{count}} recipes in the background',
          { count: pendingCount },
          locale
        );

  return (
    <section
      data-testid="capture-in-flight-ribbon"
      aria-live="polite"
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-chrome-line bg-white px-4 py-3 shadow-sm"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="relative flex h-3 w-3 shrink-0" aria-hidden="true">
          <span
            data-testid="capture-in-flight-pulse"
            className="absolute inline-flex h-full w-full animate-ping motion-reduce:animate-none rounded-full bg-hearth-fill opacity-75"
          />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-hearth-fill" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink-body leading-snug">{heading}</p>
          <p className="text-xs text-ink-muted">
            {t('home.captureInFlightHint', 'We’ll let you know as soon as it’s ready.', locale)}
          </p>
        </div>
      </div>

      <Link
        href={ROUTES.CAPTURE}
        data-testid="capture-in-flight-add-another"
        className="inline-flex min-h-12 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-chrome-line bg-cream px-3.5 text-xs font-semibold text-ink-body transition-colors hover:bg-charcoal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
      >
        <Plus size={14} aria-hidden="true" />
        <span>{t('home.addAnotherCapture', 'Add another', locale)}</span>
      </Link>
    </section>
  );
}
