'use client';

import Link from 'next/link';

import { t } from '@/locales';

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 py-12 text-center">
      <h2 className="text-2xl font-bold text-charcoal">
        {t('errors.notFoundTitle', 'Page not found')}
      </h2>
      <p className="text-charcoal-400">
        {t('errors.notFoundDescription', "The page you're looking for doesn't exist.")}
      </p>
      <Link
        href="/"
        className="rounded-xl bg-indigo px-6 py-3 font-semibold text-lavender transition-opacity hover:opacity-90"
      >
        {t('errors.goHome', 'Go home')}
      </Link>
    </main>
  );
}
