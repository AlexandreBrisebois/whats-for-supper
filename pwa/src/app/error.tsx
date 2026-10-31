'use client';

import { useEffect } from 'react';

import { OpeningFallback } from '@/components/telemetry/OpeningFallback';

import { t } from '@/locales';
import { useBoundaryError } from '@/components/telemetry/useBoundaryError';

interface ErrorProps {
  error: unknown;
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  const retire = useBoundaryError(error);
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 py-12 text-center">
      <OpeningFallback screen="error" />
      <h2 className="text-2xl font-bold text-charcoal">
        {t('errors.genericTitle', 'Something went wrong')}
      </h2>
      <p className="text-charcoal-400">
        {t('errors.genericDescription', 'An unexpected error occurred. Please try again.')}
      </p>
      <button
        onClick={() => {
          retire();
          reset();
        }}
        className="rounded-xl bg-indigo px-6 py-3 font-semibold text-lavender transition-opacity hover:opacity-90"
      >
        {t('errors.tryAgain', 'Try again')}
      </button>
    </main>
  );
}
