'use client';

import Link from 'next/link';

import { t } from '@/locales';

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-cream px-6 py-12 text-center">
      <h2 className="font-heading text-2xl font-bold text-ink-body">
        {t('errors.notFoundTitle', 'Page not found')}
      </h2>
      <p className="text-ink-muted">
        {t('errors.notFoundDescription', "The page you're looking for doesn't exist.")}
      </p>
      <Link
        href="/"
        className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-hearth-fill px-6 py-3 font-semibold text-cream-100 transition-colors hover:bg-hearth-fill-hover active:bg-hearth-fill-active focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body"
      >
        {t('errors.goHome', 'Go home')}
      </Link>
    </main>
  );
}
