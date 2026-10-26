'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { t } from '@/locales';
import { useDemoMode } from './DemoModeProvider';

export function DemoAiActionGate({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const { mode, loading, error, retry } = useDemoMode();
  if (mode === false) return <>{children}</>;
  return (
    <section
      className={`rounded-2xl border border-charcoal/15 bg-cream p-4 text-charcoal ${className}`}
      data-testid="demo-ai-unavailable"
      aria-busy={loading}
    >
      <p role="status" className="text-sm leading-relaxed">
        {mode === true
          ? t(
              'demoContext.aiUnavailable',
              'AI capture and generation are turned off in this demo. Explore the recipes we’ve prepared for you instead.'
            )
          : error
            ? t(
                'demoContext.statusFailed',
                'We could not check whether AI capture is available. Retry or explore the prepared recipes.'
              )
            : t('demoContext.checking', 'Checking whether AI capture is available…')}
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        {error && (
          <button
            type="button"
            onClick={retry}
            className="min-h-11 rounded-xl border border-charcoal/30 px-4 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {t('common.retry', 'Retry')}
          </button>
        )}
        <Link
          href="/recipes"
          className="inline-flex min-h-11 items-center rounded-xl px-2 font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {t('demoContext.browse', 'Explore prepared recipes')}
        </Link>
      </div>
    </section>
  );
}
