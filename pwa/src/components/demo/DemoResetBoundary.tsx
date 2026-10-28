'use client';

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { demoSession, type DemoRequestSession } from '@/lib/api/demo-session';
import { usePdfCaptureStore } from '@/store/pdfCaptureStore';
import { discardSharedPdf } from '@/lib/pdfShare';
import { useLocale } from '@/components/common/LocaleProvider';
import { t } from '@/locales';

export function DemoResetBoundary({
  children,
  session = demoSession,
}: {
  children: ReactNode;
  session?: DemoRequestSession;
}) {
  const reset = useSyncExternalStore(session.subscribe, session.getSnapshot, () => false);
  const { locale } = useLocale();
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!reset) return;
    const token = usePdfCaptureStore.getState().selection?.shareToken;
    const url = new URL(window.location.href);
    for (const owned of new Set([token, url.searchParams.get('share')]))
      if (owned) void discardSharedPdf(owned);
    usePdfCaptureStore.getState().reset();
    url.searchParams.delete('share');
    window.history.replaceState(null, '', url.pathname + url.search);
    button.current?.focus();
  }, [reset]);
  if (!reset) return children;
  return (
    <main className="min-h-dvh bg-cream text-charcoal flex items-center justify-center p-6">
      <section
        role="alert"
        aria-labelledby="demo-reset-title"
        data-testid="demo-reset-notice"
        className="max-w-md rounded-3xl bg-white p-6 shadow-sm space-y-4"
      >
        <h1 id="demo-reset-title" className="text-2xl font-semibold">
          {t('demoReset.title', 'The shared demo has reset', locale)}
        </h1>
        <p>{t('demoReset.body', 'Continue to load the current demo.', locale)}</p>
        <button
          ref={button}
          data-testid="demo-reset-continue"
          className="min-h-12 w-full rounded-full bg-terracotta hover:bg-terracotta-600 active:bg-terracotta-700 text-white px-5 py-3 font-semibold"
          onClick={() => window.location.replace(window.location.pathname + window.location.search)}
        >
          {t('demoReset.continue', 'Continue with the reset demo', locale)}
        </button>
      </section>
    </main>
  );
}
