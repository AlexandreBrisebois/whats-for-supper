'use client';

import Link from 'next/link';

import { ROUTES } from '@/lib/constants/routes';
import { t } from '@/locales';

/**
 * Splash / landing page — shown to first-time visitors.
 * Authenticated users are redirected to /home by middleware before reaching here.
 */
export default function LandingPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-cream px-6 py-12">
      <div className="text-center">
        <h1 className="font-heading text-4xl font-bold text-charcoal">
          {t('landing.title', "What's for Supper?")}
        </h1>
        <p className="mt-3 text-lg text-charcoal-600">
          {t('landing.subtitle', 'Capture recipes, plan your week, discover what to cook next.')}
        </p>
      </div>

      <Link
        href={ROUTES.ONBOARDING}
        className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-terracotta px-8 py-4 text-lg font-semibold text-cream-100 shadow-sm transition-colors hover:bg-terracotta-600 active:bg-terracotta-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-charcoal"
      >
        {t('landing.getStarted', 'Get Started')}
      </Link>
    </main>
  );
}
