'use client';

import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { t } from '@/locales';

interface ErrorProps {
  error: unknown;
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-cream px-6 py-12 text-center">
      <h2 className="font-heading text-2xl font-bold text-ink-body">
        {t('errors.genericTitle', 'Something went wrong')}
      </h2>
      <p className="text-ink-muted">
        {t('errors.genericDescription', 'An unexpected error occurred. Please try again.')}
      </p>
      <Button
        variant="primary"
        size="md"
        onClick={() => {
          reset();
        }}
      >
        {t('errors.tryAgain', 'Try again')}
      </Button>
    </main>
  );
}
